import { exec } from 'child_process'
import { promisify } from 'util'
import * as fs from 'fs/promises'
import * as path from 'path'
import * as os from 'os'

const execAsync = promisify(exec)

interface PublishPackageRequest {
  name: string
  version: string
  files: Record<string, string>
  packageJson: any
  registry?: string
  tag?: string
}

interface PublishPackageResult {
  success: boolean
  packageUrl: string
  version: string
  tarballUrl: string
}

interface PackageInfo {
  name: string
  version: string
  description: string
  author: string
  license: string
  homepage?: string
  repository?: any
  keywords: string[]
  dependencies: Record<string, string>
  devDependencies: Record<string, string>
}

export class NPMService {
  private npmToken: string
  private registry: string
  private tempDir: string

  constructor(npmToken?: string, registry = 'https://registry.npmjs.org') {
    this.npmToken = npmToken || process.env.NPM_TOKEN || ''
    this.registry = registry
    this.tempDir = path.join(os.tmpdir(), 'autocoder-npm')
  }

  async publishPackage(request: PublishPackageRequest): Promise<PublishPackageResult> {
    if (!this.npmToken) {
      throw new Error('NPM token not configured')
    }

    const tempPackageDir = path.join(this.tempDir, `${request.name}-${Date.now()}`)

    try {
      // Create temporary directory
      await fs.mkdir(tempPackageDir, { recursive: true })

      // Write all files to temp directory
      await this.writeFilesToDirectory(tempPackageDir, request.files)

      // Write package.json
      const enhancedPackageJson = {
        ...request.packageJson,
        name: request.name,
        version: request.version,
        main: request.packageJson.main || 'dist/index.js',
        types: request.packageJson.types || 'dist/index.d.ts',
        files: request.packageJson.files || ['dist/**/*', 'README.md', 'LICENSE'],
        keywords: [
          ...(request.packageJson.keywords || []),
          'elizaos',
          'plugin',
          'ai',
          'autocoder'
        ],
        repository: request.packageJson.repository || {
          type: 'git',
          url: `https://github.com/elizaos/${request.name}.git`
        },
        bugs: request.packageJson.bugs || {
          url: `https://github.com/elizaos/${request.name}/issues`
        },
        homepage: request.packageJson.homepage || `https://github.com/elizaos/${request.name}#readme`,
        license: request.packageJson.license || 'MIT',
        engines: {
          node: '>=18.0.0',
          ...request.packageJson.engines
        }
      }

      await fs.writeFile(
        path.join(tempPackageDir, 'package.json'),
        JSON.stringify(enhancedPackageJson, null, 2)
      )

      // Configure npm with auth token
      await this.configureNpmAuth(tempPackageDir)

      // Install dependencies if needed
      if (Object.keys(enhancedPackageJson.dependencies || {}).length > 0) {
        await execAsync('npm install --production', { cwd: tempPackageDir })
      }

      // Build the package if build script exists
      if (enhancedPackageJson.scripts?.build) {
        await execAsync('npm run build', { cwd: tempPackageDir })
      }

      // Run tests if test script exists
      if (enhancedPackageJson.scripts?.test) {
        try {
          await execAsync('npm test', { cwd: tempPackageDir })
        } catch (testError) {
          console.warn('Tests failed but continuing with publish:', testError instanceof Error ? testError.message : String(testError))
        }
      }

      // Publish to npm
      const publishCommand = [
        'npm publish',
        `--registry=${request.registry || this.registry}`,
        request.tag ? `--tag=${request.tag}` : '',
        '--access=public'
      ].filter(Boolean).join(' ')

      const publishResult = await execAsync(publishCommand, { cwd: tempPackageDir })
      
      console.log('NPM publish result:', publishResult.stdout)

      // Construct package URLs
      const packageUrl = `https://www.npmjs.com/package/${request.name}`
      const tarballUrl = `${this.registry}/${request.name}/-/${request.name}-${request.version}.tgz`

      return {
        success: true,
        packageUrl,
        version: request.version,
        tarballUrl
      }

    } catch (error) {
      console.error('NPM publish failed:', error)
      throw new Error(`NPM publish failed: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      // Clean up temporary directory
      try {
        await fs.rm(tempPackageDir, { recursive: true, force: true })
      } catch (cleanupError) {
        console.warn('Failed to clean up temp directory:', cleanupError)
      }
    }
  }

  async getPackageInfo(packageName: string): Promise<PackageInfo | null> {
    try {
      const command = `npm view ${packageName} --json --registry=${this.registry}`
      const result = await execAsync(command)
      
      const packageData = JSON.parse(result.stdout)
      
      return {
        name: packageData.name,
        version: packageData.version,
        description: packageData.description || '',
        author: packageData.author?.name || packageData.author || '',
        license: packageData.license || '',
        homepage: packageData.homepage,
        repository: packageData.repository,
        keywords: packageData.keywords || [],
        dependencies: packageData.dependencies || {},
        devDependencies: packageData.devDependencies || {}
      }
    } catch (error) {
      console.error('Failed to get package info:', error)
      return null
    }
  }

  async checkPackageExists(packageName: string): Promise<boolean> {
    try {
      await execAsync(`npm view ${packageName} name --registry=${this.registry}`)
      return true
    } catch (error) {
      return false
    }
  }

  async validatePackageName(name: string): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = []

    // Check length
    if (name.length === 0) {
      errors.push('Package name cannot be empty')
    }
    if (name.length > 214) {
      errors.push('Package name cannot be longer than 214 characters')
    }

    // Check characters
    if (!/^[a-z0-9\-_.]+$/.test(name)) {
      errors.push('Package name can only contain lowercase letters, numbers, hyphens, underscores, and dots')
    }

    // Check start/end
    if (name.startsWith('.') || name.startsWith('_') || name.startsWith('-')) {
      errors.push('Package name cannot start with a dot, underscore, or hyphen')
    }

    // Check for npm reserved names
    const reservedNames = ['node_modules', 'favicon.ico', '.git', '.npm']
    if (reservedNames.includes(name)) {
      errors.push('Package name is reserved')
    }

    // Check if already exists
    if (await this.checkPackageExists(name)) {
      errors.push('Package name already exists on npm')
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  async unpublishPackage(packageName: string, version?: string): Promise<void> {
    if (!this.npmToken) {
      throw new Error('NPM token not configured')
    }

    try {
      const command = version 
        ? `npm unpublish ${packageName}@${version} --registry=${this.registry}`
        : `npm unpublish ${packageName} --force --registry=${this.registry}`
      
      await execAsync(command)
      console.log(`Successfully unpublished ${packageName}${version ? `@${version}` : ''}`)
    } catch (error) {
      console.error('Failed to unpublish package:', error)
      throw new Error(`Failed to unpublish package: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  private async writeFilesToDirectory(dir: string, files: Record<string, string>): Promise<void> {
    for (const [filePath, content] of Object.entries(files)) {
      const fullPath = path.join(dir, filePath)
      const fileDir = path.dirname(fullPath)
      
      // Create directory if it doesn't exist
      await fs.mkdir(fileDir, { recursive: true })
      
      // Write file
      await fs.writeFile(fullPath, content, 'utf8')
    }
  }

  private async configureNpmAuth(workingDir: string): Promise<void> {
    const npmrcPath = path.join(workingDir, '.npmrc')
    const npmrcContent = [
      `registry=${this.registry}`,
      `//registry.npmjs.org/:_authToken=${this.npmToken}`,
      'always-auth=true'
    ].join('\n')

    await fs.writeFile(npmrcPath, npmrcContent)
  }

  async getDownloadStats(packageName: string, period = 'last-month'): Promise<any> {
    try {
      const response = await fetch(
        `https://api.npmjs.org/downloads/point/${period}/${packageName}`
      )
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      return await response.json()
    } catch (error) {
      console.error('Failed to get download stats:', error)
      return { downloads: 0 }
    }
  }

  async searchPackages(query: string, limit = 20): Promise<any[]> {
    try {
      const response = await fetch(
        `https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(query)}&size=${limit}`
      )
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      return data.objects || []
    } catch (error) {
      console.error('Failed to search packages:', error)
      return []
    }
  }
}

// Utility function to create NPM service with user's token
export function createNPMService(userToken?: string, registry?: string): NPMService {
  return new NPMService(userToken, registry)
}