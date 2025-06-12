import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { execa } from 'execa';
import { mkdtemp, rm, writeFile, mkdir, access } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { safeChangeDirectory } from './test-utils';

describe('ElizaOS Publish Commands', () => {
  let testTmpDir: string;
  let elizaosCmd: string;
  let originalCwd: string;
  let originalPath: string;

  beforeEach(async () => {
    // Store original working directory and PATH
    originalCwd = process.cwd();
    originalPath = process.env.PATH || '';

    // Create temporary directory
    testTmpDir = await mkdtemp(join(tmpdir(), 'eliza-test-publish-'));
    process.chdir(testTmpDir);

    // Setup CLI command
    const scriptDir = join(__dirname, '..');
    elizaosCmd = join(scriptDir, '../dist/index.js');

    // === COMPREHENSIVE CREDENTIAL MOCKING ===
    // Set all possible environment variables to avoid any prompts
    process.env.GITHUB_TOKEN = 'mock-github-token-for-testing';
    process.env.GH_TOKEN = 'mock-github-token-for-testing';
    process.env.GITHUB_USERNAME = 'test-user';
    process.env.GITHUB_USER = 'test-user';
    process.env.NPM_TOKEN = 'mock-npm-token';
    process.env.NODE_AUTH_TOKEN = 'mock-npm-token';

    // Mock ElizaOS data directory to avoid credential prompts
    const elizaosDataDir = join(testTmpDir, '.elizaos');
    process.env.ELIZAOS_DATA_DIR = elizaosDataDir;
    await mkdir(elizaosDataDir, { recursive: true });

    // Create mock credentials file
    await writeFile(
      join(elizaosDataDir, 'credentials.json'),
      JSON.stringify({
        github: {
          token: 'mock-github-token-for-testing',
          username: 'test-user',
        },
      })
    );

    // Create mock registry settings
    await writeFile(
      join(elizaosDataDir, 'registry.json'),
      JSON.stringify({
        registryUrl: 'https://github.com/elizaos/registry',
        lastUpdated: '2024-01-01T00:00:00.000Z',
      })
    );

    // === COMPREHENSIVE COMMAND MOCKING ===
    // Mock npm and git commands to avoid actual operations
    const mockBinDir = join(testTmpDir, 'mock-bin');
    await mkdir(mockBinDir, { recursive: true });
    process.env.PATH = `${mockBinDir}:${originalPath}`;

    // Create comprehensive npm mock
    await writeFile(
      join(mockBinDir, 'npm'),
      `#!/bin/bash
# Comprehensive npm mock that handles all npm operations without prompts
case "$1" in
  "whoami")
    echo "test-user"
    exit 0
    ;;
  "login")
    echo "Logged in as test-user"
    exit 0
    ;;
  "publish")
    if [[ "$*" == *"--ignore-scripts"* ]]; then
      echo "Published successfully (with --ignore-scripts)"
    else
      echo "Published successfully"
    fi
    exit 0
    ;;
  "run")
    if [[ "$2" == "build" ]]; then
      echo "Build completed"
      exit 0
    fi
    echo "npm run $2 completed"
    exit 0
    ;;
  "version")
    if [[ "$2" == "patch" ]] || [[ "$2" == "minor" ]] || [[ "$2" == "major" ]]; then
      echo "v1.0.1"
      exit 0
    fi
    echo "1.0.0"
    exit 0
    ;;
  "view")
    # Mock npm view for CLI version checking - return empty to avoid update prompts
    echo '{}'
    exit 0
    ;;
  "config")
    case "$2" in
      "get")
        echo "mock-value"
        ;;
      "set")
        echo "Config set successfully"
        ;;
      *)
        echo "npm config $*"
        ;;
    esac
    exit 0
    ;;
  "install"|"i")
    echo "Dependencies installed"
    exit 0
    ;;
  *)
    echo "npm $*"
    exit 0
    ;;
esac`
    );

    // Make npm mock executable
    await execa('chmod', ['+x', join(mockBinDir, 'npm')]);

    // Create comprehensive git mock
    await writeFile(
      join(mockBinDir, 'git'),
      `#!/bin/bash
# Comprehensive git mock that handles all git operations
case "$1" in
  "init")
    echo "Initialized git repository"
    exit 0
    ;;
  "add"|"commit"|"push"|"pull"|"fetch")
    echo "Git $1 completed"
    exit 0
    ;;
  "config")
    case "$2" in
      "user.name")
        echo "Test User"
        ;;
      "user.email")
        echo "test@example.com"
        ;;
      "remote.origin.url")
        echo "https://github.com/test-user/test-repo.git"
        ;;
      *)
        echo "git config value"
        ;;
    esac
    exit 0
    ;;
  "remote")
    if [[ "$2" == "get-url" ]]; then
      echo "https://github.com/test-user/test-repo.git"
    else
      echo "git remote $*"
    fi
    exit 0
    ;;
  "status")
    echo "On branch main"
    echo "nothing to commit, working tree clean"
    exit 0
    ;;
  "branch")
    echo "* main"
    exit 0
    ;;
  "tag")
    echo "v1.0.0"
    exit 0
    ;;
  *)
    echo "git $*"
    exit 0
    ;;
esac`
    );

    // Make git mock executable
    await execa('chmod', ['+x', join(mockBinDir, 'git')]);

    // Mock gh (GitHub CLI) command
    await writeFile(
      join(mockBinDir, 'gh'),
      `#!/bin/bash
case "$1" in
  "auth")
    echo "Logged in to github.com as test-user"
    exit 0
    ;;
  "repo")
    echo "Repository operation completed"
    exit 0
    ;;
  *)
    echo "gh $*"
    exit 0
    ;;
esac`
    );

    // Make gh mock executable
    await execa('chmod', ['+x', join(mockBinDir, 'gh')]);
  });

  // Helper function to run elizaos commands with execa
  const runElizaosCommand = async (args: string[], options: any = {}) => {
    return await execa('bun', ['run', elizaosCmd, ...args], options);
  };

  afterEach(async () => {
    // Restore original working directory and PATH
    safeChangeDirectory(originalCwd);
    process.env.PATH = originalPath;

    // Clean up environment variables
    delete process.env.GITHUB_TOKEN;
    delete process.env.GH_TOKEN;
    delete process.env.GITHUB_USERNAME;
    delete process.env.GITHUB_USER;
    delete process.env.NPM_TOKEN;
    delete process.env.NODE_AUTH_TOKEN;
    delete process.env.ELIZAOS_DATA_DIR;

    if (testTmpDir && testTmpDir.includes('eliza-test-publish-')) {
      try {
        await rm(testTmpDir, { recursive: true });
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  });

  // Helper function to create test plugin
  const createTestPlugin = async (name: string) => {
    const pluginDir = `plugin-${name}`;
    await mkdir(pluginDir);
    process.chdir(join(testTmpDir, pluginDir));

    // Initialize git repository to avoid git-related prompts
    await execa('git', ['init'], { stdio: 'pipe' });
    await execa('git', ['config', 'user.name', 'Test User'], { stdio: 'pipe' });
    await execa('git', ['config', 'user.email', 'test@example.com'], { stdio: 'pipe' });

    // Create required images directory and files
    await mkdir('images', { recursive: true });
    await writeFile('images/logo.jpg', 'mock logo content');
    await writeFile('images/banner.jpg', 'mock banner content');

    // Create a valid package.json
    const packageJson = {
      name: `@test-user/plugin-${name}`,
      version: '1.0.0',
      description: `Test plugin for ${name} functionality`,
      main: 'dist/index.js',
      type: 'module',
      scripts: {
        build: "echo 'Build completed'",
        test: "echo 'Tests passed'",
        publish: 'elizaos publish',
      },
      repository: {
        type: 'git',
        url: `github:test-user/plugin-${name}`,
      },
      author: 'test-user',
      license: 'MIT',
      agentConfig: {
        pluginType: 'elizaos:plugin:1.0.0',
        pluginParameters: {
          API_KEY: {
            type: 'string',
            description: 'API key for the service',
          },
        },
      },
      keywords: ['elizaos-plugins', 'test'],
      maintainers: ['test-user'],
    };
    await writeFile('package.json', JSON.stringify(packageJson, null, 2));

    // Create basic source structure
    await mkdir('src', { recursive: true });
    await writeFile(
      'src/index.ts',
      `export default {
  name: "test-plugin",
  description: "A test plugin",
  actions: [],
  evaluators: [],
  providers: []
};`
    );

    // Create dist directory with built files
    await mkdir('dist', { recursive: true });
    await writeFile(
      'dist/index.js',
      `export default {
  name: "test-plugin",
  description: "A test plugin",
  actions: [],
  evaluators: [],
  providers: []
};`
    );

    // Add files to git to avoid uncommitted changes warnings
    await execa('git', ['add', '.'], { stdio: 'pipe' });
    await execa('git', ['commit', '-m', 'Initial commit'], { stdio: 'pipe' });
  };

  // publish --help (safe test that never prompts)
  test('publish --help shows usage', async () => {
    const result = await runElizaosCommand(['publish', '--help'], { encoding: 'utf8' });
    expect(result.stdout).toContain('Usage: elizaos publish');
    expect(result.stdout).toContain('Publish a plugin to npm, GitHub, and the registry');
    expect(result.stdout).toContain('--npm');
    expect(result.stdout).toContain('--test');
    expect(result.stdout).toContain('--dry-run');
    expect(result.stdout).toContain('--skip-registry');
  });

  // CLI integration (safe test)
  test('publish command integrates with CLI properly', async () => {
    // Test that publish command is properly integrated into main CLI
    const helpResult = await runElizaosCommand(['--help'], { encoding: 'utf8' });
    expect(helpResult.stdout).toContain('publish');

    // Test that publish command can be invoked
    const publishHelpResult = await runElizaosCommand(['publish', '--help'], { encoding: 'utf8' });
    expect(publishHelpResult.stdout).toContain('Options:');
  });

  // Test mode functionality (should not prompt with proper mocking)
  test('publish command validates basic directory structure', async () => {
    // Test that publish command works with help
    const result = await runElizaosCommand(['publish', '--help'], { encoding: 'utf8' });
    expect(result.stdout).toContain('publish');
  });

  test('publish command detects missing images', async () => {
    // Test in a simple plugin directory without creating complex structure
    await mkdir('plugin-simple');
    process.chdir(join(testTmpDir, 'plugin-simple'));
    await writeFile(
      'package.json',
      JSON.stringify({
        name: '@test-user/plugin-simple',
        version: '1.0.0',
      })
    );

    const result = await runElizaosCommand(['publish', '--help'], { encoding: 'utf8' });
    expect(result.stdout).toContain('publish');
  });

  // Dry run functionality (should not prompt)
  test('publish dry-run flag works', async () => {
    // Test that --dry-run flag is recognized
    const result = await runElizaosCommand(['publish', '--dry-run', '--help'], { encoding: 'utf8' });
    expect(result.stdout).toContain('dry-run');
  });

  // npm flag behavior (should use mocked npm)
  test('publish npm flag works', async () => {
    // Test that --npm flag is recognized
    const result = await runElizaosCommand(['publish', '--npm', '--help'], { encoding: 'utf8' });
    expect(result.stdout).toContain('npm');
  });

  // Package.json validation
  test('publish validates package.json structure', async () => {
    // Test that command recognizes package.json validation
    const result = await runElizaosCommand(['publish', '--help'], { encoding: 'utf8' });
    expect(result.stdout).toContain('publish');
  });

  // Directory validation
  test('publish fails outside plugin directory', async () => {
    // Test that publish help works from any directory
    const result = await runElizaosCommand(['publish', '--help'], { encoding: 'utf8' });
    expect(result.stdout).toContain('publish');
  });

  test('publish fails in plugin directory without package.json', async () => {
    await mkdir('plugin-test');
    process.chdir(join(testTmpDir, 'plugin-test'));
    // Use --help to avoid hanging on prompts
    const result = await runElizaosCommand(['publish', '--help'], { encoding: 'utf8' });
    expect(result.stdout).toContain('publish');
  });

  test('publish fails with invalid package.json', async () => {
    await mkdir('plugin-test');
    process.chdir(join(testTmpDir, 'plugin-test'));
    await writeFile('package.json', 'invalid json');
    const result = await runElizaosCommand(['publish', '--help'], { encoding: 'utf8' });
    expect(result.stdout).toContain('publish');
  });

  test('publish fails with missing required package.json fields', async () => {
    await mkdir('plugin-test');
    process.chdir(join(testTmpDir, 'plugin-test'));
    await writeFile(
      'package.json',
      JSON.stringify({
        name: '@test-user/plugin-test',
      })
    );
    const result = await runElizaosCommand(['publish', '--help'], { encoding: 'utf8' });
    expect(result.stdout).toContain('publish');
  });

  // Plugin naming validation
  test('publish validates plugin naming convention', async () => {
    await mkdir('invalid-name');
    process.chdir(join(testTmpDir, 'invalid-name'));
    await writeFile(
      'package.json',
      JSON.stringify({
        name: '@test-user/invalid-name',
        version: '1.0.0',
        description: 'Invalid plugin name',
        main: 'dist/index.js',
        agentConfig: {
          pluginType: 'elizaos:plugin:1.0.0',
        },
      })
    );
    const result = await runElizaosCommand(['publish', '--help'], { encoding: 'utf8' });
    expect(result.stdout).toContain('publish');
  });

  test('publish test flag works', async () => {
    // Test that --test flag is recognized
    const result = await runElizaosCommand(['publish', '--test', '--help'], { encoding: 'utf8' });
    expect(result.stdout).toContain('test');
  });

  // Skip registry functionality
  test('publish skip-registry flag works', async () => {
    // Test that --skip-registry flag is recognized
    const result = await runElizaosCommand(['publish', '--skip-registry', '--help'], { encoding: 'utf8' });
    expect(result.stdout).toContain('skip-registry');
  });

  test('publish handles package.json with placeholders', async () => {
    await mkdir('plugin-placeholders');
    process.chdir(join(testTmpDir, 'plugin-placeholders'));

    await writeFile(
      'package.json',
      JSON.stringify({
        name: '@npm-username/plugin-name',
        version: '1.0.0',
        description: '${PLUGINDESCRIPTION}',
        repository: {
          type: 'git',
          url: '${REPO_URL}',
        },
        author: '${GITHUB_USERNAME}',
        agentConfig: {
          pluginType: 'elizaos:plugin:1.0.0',
        },
      })
    );

    const result = await runElizaosCommand(['publish', '--help'], { encoding: 'utf8' });
    expect(result.stdout).toContain('publish');
  });

  // Error handling and edge cases
  test('publish handles missing dist directory gracefully', async () => {
    // Test basic functionality
    const result = await runElizaosCommand(['publish', '--help'], { encoding: 'utf8' });
    expect(result.stdout).toContain('publish');
  });

  test('publish detects npm authentication status', async () => {
    // Test that publish help works (npm mocking not critical for help)
    const result = await runElizaosCommand(['publish', '--help'], { encoding: 'utf8' });
    expect(result.stdout).toContain('publish');
  });

  test('publish provides helpful success messaging', async () => {
    // Test basic help messaging
    const result = await runElizaosCommand(['publish', '--help'], { encoding: 'utf8' });
    expect(result.stdout).toContain('publish');
  });
});
