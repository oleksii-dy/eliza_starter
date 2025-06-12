import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { execa } from 'execa';
import { access, mkdtemp, readFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { safeChangeDirectory } from './test-utils';

describe('ElizaOS Plugin Commands', () => {
  let testTmpDir: string;
  let elizaosCmd: string;
  let originalCwd: string;
  let testProjectDir: string;

  beforeAll(async () => {
    // Store original working directory
    originalCwd = process.cwd();

    // Create temporary directory
    testTmpDir = await mkdtemp(join(tmpdir(), 'eliza-test-plugins-'));
    process.chdir(testTmpDir);

    // Setup CLI command
    const scriptDir = join(__dirname, '..');
    elizaosCmd = join(scriptDir, '../dist/index.js');

    // Create one test project for the entire suite
    await createTestProject('test-plugins-project');
    testProjectDir = join(testTmpDir, 'test-plugins-project');
  });

  afterAll(async () => {
    // Restore original working directory
    safeChangeDirectory(originalCwd);

    if (testTmpDir && testTmpDir.includes('eliza-test-plugins-')) {
      try {
        await rm(testTmpDir, { recursive: true });
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  });

  // Helper function to run elizaos commands with execa
  const runElizaosCommand = async (args: string[], options: any = {}) => {
    return await execa('bun', ['run', elizaosCmd, ...args], options);
  };


  // Helper function to create test project
  const createTestProject = async (name: string) => {
    const originalDir = process.cwd();
    try {
      await runElizaosCommand(['create', name, '--yes'], {
        stdio: 'pipe',
        timeout: 60000, // 60 second timeout
      });

      // Verify the project was created
      const projectPath = join(testTmpDir, name);
      await access(projectPath);
      process.chdir(projectPath);
    } catch (e) {
      // Restore directory on failure
      process.chdir(originalDir);
      console.error(`Failed to create test project ${name}:`, e);
      throw e;
    }
  };

  // Core help / list tests
  test('plugins command shows help with no subcommand', async () => {
    const result = await runElizaosCommand(['plugins'], { encoding: 'utf8' });
    expect(result.stdout).toContain('Manage ElizaOS plugins');
    expect(result.stdout).toContain('Commands:');
    expect(result.stdout).toContain('list');
    expect(result.stdout).toContain('add');
    expect(result.stdout).toContain('installed-plugins');
    expect(result.stdout).toContain('remove');
  });

  test('plugins --help shows usage information', async () => {
    const result = await runElizaosCommand(['plugins', '--help'], { encoding: 'utf8' });
    expect(result.stdout).toContain('Manage ElizaOS plugins');
  });

  test('plugins list shows available plugins', async () => {
    const result = await runElizaosCommand(['plugins', 'list'], { encoding: 'utf8' });
    expect(result.stdout).toContain('Available v1.x plugins');
    expect(result.stdout).toMatch(/plugin-openai/);
    expect(result.stdout).toMatch(/plugin-ollama/);
  });

  test('plugins list aliases (l, ls) work correctly', async () => {
    const aliases = ['l', 'ls'];

    for (const alias of aliases) {
      const result = await runElizaosCommand(['plugins', alias], { encoding: 'utf8' });
      expect(result.stdout).toContain('Available v1.x plugins');
      expect(result.stdout).toContain('plugins');
    }
  });

  // add / install tests
  test('plugins add installs a plugin', async () => {
    process.chdir(testProjectDir);

    await runElizaosCommand(['plugins', 'add', '@elizaos/plugin-sql', '--skip-env-prompt'], {
      stdio: 'pipe',
      timeout: 30000,
    });

    const packageJson = await readFile('package.json', 'utf8');
    expect(packageJson).toContain('@elizaos/plugin-sql');
  }, 30000);

  test('plugins install alias works', async () => {
    process.chdir(testProjectDir);

    await runElizaosCommand(['plugins', 'install', '@elizaos/plugin-openai', '--skip-env-prompt'], {
      stdio: 'pipe',
      timeout: 30000,
    });

    const packageJson = await readFile('package.json', 'utf8');
    expect(packageJson).toContain('@elizaos/plugin-openai');
  }, 30000);

  test('plugins add supports third-party plugins', async () => {
    process.chdir(testProjectDir);

    await runElizaosCommand(['plugins', 'add', '@fleek-platform/eliza-plugin-mcp', '--skip-env-prompt'], {
      stdio: 'pipe',
      timeout: 30000,
    });

    const packageJson = await readFile('package.json', 'utf8');
    expect(packageJson).toContain('@fleek-platform/eliza-plugin-mcp');
  }, 30000);

  test('plugins add supports GitHub URL installation', async () => {
    process.chdir(testProjectDir);

    await runElizaosCommand(['plugins', 'add', 'github:elizaos-plugins/plugin-openrouter#1.x', '--skip-env-prompt'], {
      stdio: 'pipe',
      timeout: 30000,
    });

    const packageJson = await readFile('package.json', 'utf8');
    expect(packageJson).toContain('github:elizaos-plugins/plugin-openrouter#1.x');
  }, 30000);

  test('plugins add supports GitHub shorthand URL', async () => {
    process.chdir(testProjectDir);

    await runElizaosCommand(['plugins', 'add', 'github:elizaos-plugins/plugin-openrouter#1.x', '--skip-env-prompt'], {
      stdio: 'pipe',
      timeout: 30000,
    });

    const packageJson = await readFile('package.json', 'utf8');
    expect(packageJson).toContain('github:elizaos-plugins/plugin-openrouter#1.x');
  }, 30000);

  // installed-plugins list tests
  test('plugins installed-plugins shows installed plugins', async () => {
    process.chdir(testProjectDir);

    // Install a plugin first to test the list functionality
    await runElizaosCommand(['plugins', 'add', '@elizaos/plugin-sql', '--skip-env-prompt'], {
      stdio: 'pipe',
      timeout: 30000,
    });

    const result = await runElizaosCommand(['plugins', 'installed-plugins'], { encoding: 'utf8' });
    expect(result.stdout).toContain('@elizaos/plugin-sql');
  }, 30000);

  // remove / aliases tests
  test('plugins remove uninstalls a plugin', async () => {
    process.chdir(testProjectDir);

    // First ensure the plugin is installed
    await runElizaosCommand(['plugins', 'add', '@elizaos/plugin-anthropic', '--skip-env-prompt'], {
      stdio: 'pipe',
      timeout: 30000,
    });

    let packageJson = await readFile('package.json', 'utf8');
    expect(packageJson).toContain('@elizaos/plugin-anthropic');

    await runElizaosCommand(['plugins', 'remove', '@elizaos/plugin-anthropic'], {
      stdio: 'pipe',
      timeout: 30000,
    });

    packageJson = await readFile('package.json', 'utf8');
    expect(packageJson).not.toContain('@elizaos/plugin-anthropic');
  }, 60000);

  test('plugins remove aliases (delete, del, rm) work', async () => {
    process.chdir(testProjectDir);

    const plugins = ['@elizaos/plugin-anthropic', '@elizaos/plugin-openai', '@elizaos/plugin-openrouter'];

    // Add all plugins first
    for (const plugin of plugins) {
      await runElizaosCommand(['plugins', 'add', plugin, '--skip-env-prompt'], {
        stdio: 'pipe',
        timeout: 30000,
      });
    }

    // Test different remove aliases
    const removeCommands = [
      ['delete', '@elizaos/plugin-anthropic'],
      ['del', '@elizaos/plugin-openai'],
      ['rm', '@elizaos/plugin-openrouter'],
    ];

    for (const [command, plugin] of removeCommands) {
      await runElizaosCommand(['plugins', command, plugin], {
        stdio: 'pipe',
        timeout: 30000,
      });
    }
  }, 60000);

  // Negative case tests
  test('plugins add fails for missing plugin', async () => {
    process.chdir(testProjectDir);

    try {
      await runElizaosCommand(['plugins', 'add', 'missing', '--skip-env-prompt'], {
        stdio: 'pipe',
        timeout: 30000,
      });
      expect(false).toBe(true); // Should not reach here
    } catch (e: any) {
      expect(e.exitCode).not.toBe(0);
      const output = e.stdout?.toString() || e.stderr?.toString() || '';
      expect(output).toMatch(/not found in registry/);
    }
  }, 30000);



  test('plugins add via GitHub shorthand URL', async () => {
    process.chdir(testProjectDir);

    await runElizaosCommand(['plugins', 'add', 'github:elizaos-plugins/plugin-openrouter#1.x', '--skip-env-prompt'], {
      stdio: 'pipe',
      timeout: 30000,
    });

    const packageJson = await readFile('package.json', 'utf8');
    expect(packageJson).toContain('github:elizaos-plugins/plugin-openrouter#1.x');
  }, 30000);
});
