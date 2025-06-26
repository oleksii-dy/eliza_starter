import { Octokit } from '@octokit/rest'

interface CreateRepositoryRequest {
  name: string
  description: string
  private: boolean
  files: Record<string, string>
  packageJson: any
}

interface CreateRepositoryResult {
  id: number
  name: string
  full_name: string
  html_url: string
  clone_url: string
  default_branch: string
}

interface PushFilesRequest {
  owner: string
  repo: string
  files: Record<string, string>
  commitMessage: string
  branch?: string
}

interface GitHubUser {
  id: number
  login: string
  name: string
  email: string
  avatar_url: string
}

export class GitHubService {
  private octokit: Octokit
  private defaultBranch = 'main'

  constructor(accessToken?: string) {
    this.octokit = new Octokit({
      auth: accessToken || process.env.GITHUB_TOKEN || process.env.GITHUB_ACCESS_TOKEN
    })
  }

  async createRepository(request: CreateRepositoryRequest): Promise<CreateRepositoryResult> {
    try {
      // Create the repository
      const createResponse = await (this.octokit.rest.repos as any).create({
        name: request.name,
        description: request.description,
        private: request.private,
        auto_init: false, // We'll initialize with our own files
        has_issues: true,
        has_projects: true,
        has_wiki: true
      })

      const repo = createResponse.data

      // Wait a moment for the repository to be fully created
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Create initial files
      await this.pushFiles({
        owner: repo.owner.login,
        repo: repo.name,
        files: {
          ...request.files,
          'package.json': JSON.stringify(request.packageJson, null, 2),
          'README.md': this.generateReadme(request.name, request.description, request.packageJson),
          '.gitignore': this.generateGitignore(),
          'LICENSE': this.generateMITLicense(repo.owner.login)
        },
        commitMessage: 'Initial commit: Add generated plugin files',
        branch: this.defaultBranch
      })

      console.log(`Created GitHub repository: ${repo.full_name}`)

      return {
        id: repo.id,
        name: repo.name,
        full_name: repo.full_name,
        html_url: repo.html_url,
        clone_url: repo.clone_url,
        default_branch: this.defaultBranch
      }

    } catch (error) {
      console.error('Failed to create GitHub repository:', error)
      throw new Error(`GitHub repository creation failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  async pushFiles(request: PushFilesRequest): Promise<void> {
    try {
      const { owner, repo, files, commitMessage, branch = this.defaultBranch } = request

      // Get the current reference to the branch
      let ref
      try {
        const refResponse = await this.octokit.rest.git.getRef({
          owner,
          repo,
          ref: `heads/${branch}`
        })
        ref = refResponse.data
      } catch (error) {
        // Branch doesn't exist, create it
        const masterRef = await this.octokit.rest.git.getRef({
          owner,
          repo,
          ref: 'heads/main'
        }).catch(async () => {
          // No main branch either, create initial empty commit
          const emptyTree = await this.octokit.rest.git.createTree({
            owner,
            repo,
            tree: []
          })

          const emptyCommit = await this.octokit.rest.git.createCommit({
            owner,
            repo,
            message: 'Initial empty commit',
            tree: emptyTree.data.sha
          })

          return this.octokit.rest.git.createRef({
            owner,
            repo,
            ref: `refs/heads/${branch}`,
            sha: emptyCommit.data.sha
          })
        })

        if (masterRef) {
          ref = await this.octokit.rest.git.createRef({
            owner,
            repo,
            ref: `refs/heads/${branch}`,
            sha: masterRef.data.object.sha
          }).then(r => r.data)
        }
      }

      // Get the current commit
      if (!ref) {
        throw new Error('Could not get branch reference');
      }
      const currentCommit = await this.octokit.rest.git.getCommit({
        owner,
        repo,
        commit_sha: ref.object.sha
      })

      // Create blobs for all files
      const fileBlobs = await Promise.all(
        Object.entries(files).map(async ([path, content]) => {
          const blob = await this.octokit.rest.git.createBlob({
            owner,
            repo,
            content: Buffer.from(content, 'utf8').toString('base64'),
            encoding: 'base64'
          })

          return {
            path,
            mode: '100644' as const,
            type: 'blob' as const,
            sha: blob.data.sha
          }
        })
      )

      // Create a new tree
      const newTree = await this.octokit.rest.git.createTree({
        owner,
        repo,
        base_tree: currentCommit.data.tree.sha,
        tree: fileBlobs
      })

      // Create a new commit
      const newCommit = await this.octokit.rest.git.createCommit({
        owner,
        repo,
        message: commitMessage,
        tree: newTree.data.sha,
        parents: [currentCommit.data.sha]
      })

      // Update the reference
      await this.octokit.rest.git.updateRef({
        owner,
        repo,
        ref: `heads/${branch}`,
        sha: newCommit.data.sha
      })

      console.log(`Pushed ${Object.keys(files).length} files to ${owner}/${repo}`)

    } catch (error) {
      console.error('Failed to push files to GitHub:', error)
      throw new Error(`Failed to push files to GitHub: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  async getUserRepositories(username?: string): Promise<any[]> {
    try {
      const response = username 
        ? await this.octokit.rest.repos.listForUser({ username, per_page: 100 })
        : await this.octokit.rest.repos.listForAuthenticatedUser({ per_page: 100 })

      return response.data.map(repo => ({
        id: repo.id,
        name: repo.name,
        full_name: repo.full_name,
        description: repo.description,
        private: repo.private,
        html_url: repo.html_url,
        clone_url: repo.clone_url,
        default_branch: repo.default_branch,
        updated_at: repo.updated_at
      }))

    } catch (error) {
      console.error('Failed to get GitHub repositories:', error)
      throw new Error(`Failed to get GitHub repositories: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  async getAuthenticatedUser(): Promise<GitHubUser> {
    try {
      const response = await this.octokit.rest.users.getAuthenticated()
      return {
        id: response.data.id,
        login: response.data.login,
        name: response.data.name || response.data.login,
        email: response.data.email || '',
        avatar_url: response.data.avatar_url
      }
    } catch (error) {
      console.error('Failed to get authenticated GitHub user:', error)
      throw new Error(`Failed to get GitHub user: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  async validateRepository(owner: string, repo: string): Promise<boolean> {
    try {
      await this.octokit.rest.repos.get({ owner, repo })
      return true
    } catch (error) {
      return false
    }
  }

  private generateReadme(name: string, description: string, packageJson: any): string {
    return `# ${name}

${description}

## Installation

\`\`\`bash
npm install ${packageJson.name}
\`\`\`

## Usage

\`\`\`typescript
import { ${name.replace(/[^a-zA-Z0-9]/g, '')}Plugin } from '${packageJson.name}'

// Add to your ElizaOS agent
const agent = new Agent({
  plugins: [${name.replace(/[^a-zA-Z0-9]/g, '')}Plugin]
})
\`\`\`

## Features

${packageJson.description ? `- ${packageJson.description}` : '- Core functionality'}

## Development

\`\`\`bash
# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test
\`\`\`

## Contributing

1. Fork the repository
2. Create your feature branch (\`git checkout -b feature/amazing-feature\`)
3. Commit your changes (\`git commit -m 'Add some amazing feature'\`)
4. Push to the branch (\`git push origin feature/amazing-feature\`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

Generated with [ElizaOS Autocoder](https://elizaos.ai/autocoder)
`
  }

  private generateGitignore(): string {
    return `# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Build outputs
dist/
build/
*.tsbuildinfo

# Environment files
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Logs
logs
*.log

# Coverage directory used by tools like istanbul
coverage/
*.lcov

# nyc test coverage
.nyc_output

# ESLint cache
.eslintcache

# Optional npm cache directory
.npm

# Optional REPL history
.node_repl_history

# Output of 'npm pack'
*.tgz

# Yarn Integrity file
.yarn-integrity

# parcel-bundler cache (https://parceljs.org/)
.cache
.parcel-cache

# next.js build output
.next

# nuxt.js build output
.nuxt

# vuepress build output
.vuepress/dist

# Serverless directories
.serverless

# FuseBox cache
.fusebox/

# DynamoDB Local files
.dynamodb/

# TernJS port file
.tern-port
`
  }

  private generateMITLicense(owner: string): string {
    const year = new Date().getFullYear()
    return `MIT License

Copyright (c) ${year} ${owner}

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
`
  }
}

// Utility function to create GitHub service with user's token
export function createGitHubService(userToken?: string): GitHubService {
  return new GitHubService(userToken)
}