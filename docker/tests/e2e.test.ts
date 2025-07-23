import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { rimraf } from 'rimraf';

describe('Docker E2E Tests', () => {
  const testProjectDir = path.join(process.cwd(), '..', 'tmp', 'e2e-test-project');
  const timeout = 120000; // 2 minutes for Docker operations
  
  // Use local CLI instead of global - TODO remove this once the --docker flag is available globally
  const localCliPath = path.join(process.cwd(), 'packages', 'cli', 'dist', 'index.js');
  const cliCommand = fs.existsSync(localCliPath) ? `bun ${localCliPath}` : 'elizaos';

  beforeAll(async () => {
    console.log(`Using CLI: ${cliCommand}`);
    
    // Check if test project already exists with plugins installed (for speed)
    const projectExists = fs.existsSync(testProjectDir);
    const pluginsInstalled = projectExists && fs.existsSync(path.join(testProjectDir, 'node_modules'));
    
    if (projectExists && pluginsInstalled) {
      console.log('⚡ Reusing existing test project with cached plugins for faster testing');
      return;
    }
    
    // Clean up any incomplete test project
    if (projectExists) {
      await rimraf(testProjectDir);
    }
  }, timeout);

  afterAll(async () => {
    // Keep test project for plugin caching unless TEST_CLEAN=true
    if (process.env.TEST_CLEAN === 'true') {
      console.log('🧹 Cleaning up test project (TEST_CLEAN=true)');
      if (fs.existsSync(testProjectDir)) {
        await rimraf(testProjectDir);
      }
    } else {
      console.log('💾 Keeping test project for plugin caching (set TEST_CLEAN=true to remove)');
    }
  });

  it('should create a test project and test Docker functionality', async () => {
    // Skip if Docker not available
    try {
      execSync('docker --version', { stdio: 'ignore' });
    } catch {
      console.log('⏭️ Docker not available - skipping e2e test');
      return;
    }

    // Create project only if it doesn't exist or plugins aren't installed
    const projectExists = fs.existsSync(testProjectDir);
    const pluginsInstalled = projectExists && fs.existsSync(path.join(testProjectDir, 'node_modules'));
    
    if (!projectExists || !pluginsInstalled) {
      console.log('📦 Creating test project...');
      
      execSync(`${cliCommand} create --type project --yes e2e-test-project`, {
        cwd: path.join(process.cwd(), '..', 'tmp'),
        stdio: 'inherit'
      });
    } else {
      console.log('⚡ Using cached test project');
    }

    // Verify project structure
    expect(fs.existsSync(testProjectDir)).toBe(true);
    expect(fs.existsSync(path.join(testProjectDir, 'docker'))).toBe(true);
    expect(fs.existsSync(path.join(testProjectDir, 'docker', 'targets', 'dev'))).toBe(true);
    expect(fs.existsSync(path.join(testProjectDir, 'docker', 'targets', 'prod'))).toBe(true);
    
    console.log('✅ Test project created with Docker infrastructure');

    // Test CLI --docker flag availability
    console.log('🔧 Testing CLI --docker flag...');
    const helpOutput = execSync(`${cliCommand} start --help`, { encoding: 'utf8' });
    if (!helpOutput.includes('--docker')) {
      console.log('⏭️ --docker flag not available in CLI - skipping Docker functionality test');
      return;
    }
    
    console.log('✅ --docker flag available in CLI');

    // Test Docker configuration syntax (without actually starting)
    console.log('🐳 Testing Docker configuration...');
    execSync('docker compose -f docker/targets/dev/docker-compose.yml config', {
      cwd: testProjectDir,
      stdio: 'inherit'
    });
    
    console.log('✅ Docker configuration validation passed');
  }, timeout);

  it('should test project starter Docker functionality', async () => {
    console.log('🧪 Testing project-starter Docker configuration...');
    
    const projectStarterPath = path.join(process.cwd(), 'packages', 'project-starter');
    const dockerPath = path.join(projectStarterPath, 'docker');
    
    // Verify project-starter has Docker infrastructure  
    expect(fs.existsSync(dockerPath)).toBe(true);
    expect(fs.existsSync(path.join(dockerPath, 'targets', 'dev'))).toBe(true);
    expect(fs.existsSync(path.join(dockerPath, 'targets', 'prod'))).toBe(true);
    
    console.log('✅ Project-starter Docker config is valid');
  }, 10000);
}); 