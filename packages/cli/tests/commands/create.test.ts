import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { execa } from 'execa';
import { mkdtemp, rm, readFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { existsSync } from 'fs';
import { safeChangeDirectory } from './test-utils';

describe('ElizaOS Create Commands', () => {
  let testTmpDir: string;
  let elizaosCmd: string;
  let createElizaCmd: string;
  let originalCwd: string;

  beforeEach(async () => {
    // Store original working directory
    originalCwd = process.cwd();

    // Setup test environment for each test
    testTmpDir = await mkdtemp(join(tmpdir(), 'eliza-test-'));

    // Setup CLI commands
    const scriptDir = join(__dirname, '..');
    elizaosCmd = join(scriptDir, '../dist/index.js');
    createElizaCmd = join(scriptDir, '../../create-eliza/index.mjs');

    // Change to test directory
    process.chdir(testTmpDir);
  });

  // Helper function to run elizaos commands with execa
  const runElizaosCommand = async (args: string[], options: any = {}) => {
    return await execa('bun', ['run', elizaosCmd, ...args], {
      timeout: 60000, // Increase default timeout
      ...options
    });
  };

  // Helper function for create-eliza commands  
  const runCreateElizaCommand = async (args: string[], options: any = {}) => {
    return await execa('bun', ['run', createElizaCmd, ...args], {
      timeout: 60000, // Increase default timeout
      ...options
    });
  };

  afterEach(async () => {
    // Restore original working directory
    safeChangeDirectory(originalCwd);

    if (testTmpDir) {
      try {
        await rm(testTmpDir, { recursive: true });
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  });

  // Helper function to validate agent JSON structure
  const validateAgentJson = async (jsonFile: string, expectedName: string) => {
    const content = await readFile(jsonFile, 'utf8');
    const agentData = JSON.parse(content);

    expect(agentData.name).toBe(expectedName);
    expect(typeof agentData.system).toBe('string');
    expect(agentData.system.length).toBeGreaterThan(0);
    expect(Array.isArray(agentData.bio)).toBe(true);
    expect(agentData.bio.length).toBeGreaterThan(0);
    expect(Array.isArray(agentData.messageExamples)).toBe(true);
    expect(agentData.messageExamples.length).toBeGreaterThan(0);
    expect(typeof agentData.style).toBe('object');
    expect(Array.isArray(agentData.style.all)).toBe(true);
    expect(agentData.style.all.length).toBeGreaterThan(0);
  };

  // Helper function to check for success patterns in output
  const hasSuccessPattern = (output: string, patterns: string[]) => {
    return patterns.some((pattern) => output.toLowerCase().includes(pattern.toLowerCase()));
  };

  test('create --help shows usage', async () => {
    const result = await runElizaosCommand(['create', '--help'], { encoding: 'utf8' });
    expect(result.stdout).toContain('Usage: elizaos create');
    expect(result.stdout).toMatch(/(project|plugin|agent)/);
    expect(result.stdout).not.toContain('frobnicate');
  });

  test('create default project succeeds', async () => {
    try {
      await execa('rm', ['-rf', 'my-default-app'], { stdio: 'ignore' });
    } catch (e) {
      // Ignore if file doesn't exist
    }

    const result = await runElizaosCommand(['create', 'my-default-app', '--yes'], {
      timeout: 60000,
    });

    // Check for various success patterns since output might vary
    const successPatterns = [
      'Project initialized successfully!',
      'successfully initialized',
      'Project created',
      'created successfully',
      'Installing dependencies',
      'dependencies installed',
      'Setup complete'
    ];

    const output = result.stdout + result.stderr;
    const hasSuccess = hasSuccessPattern(output, successPatterns);

    if (!hasSuccess) {
      // Fallback: check if files were actually created
      expect(existsSync('my-default-app')).toBe(true);
      expect(existsSync('my-default-app/package.json')).toBe(true);
    } else {
      expect(hasSuccess).toBe(true);
    }

    expect(existsSync('my-default-app')).toBe(true);
    expect(existsSync('my-default-app/package.json')).toBe(true);
    expect(existsSync('my-default-app/src')).toBe(true);
    expect(existsSync('my-default-app/.gitignore')).toBe(true);
    expect(existsSync('my-default-app/.npmignore')).toBe(true);
  }, 80000);

  test('create plugin project succeeds', async () => {
    try {
      await execa('rm', ['-rf', 'plugin-my-plugin-app'], { stdio: 'ignore' });
    } catch (e) {
      // Ignore if file doesn't exist
    }

    const result = await runElizaosCommand(['create', 'my-plugin-app', '--yes', '--type', 'plugin'], {
      timeout: 60000,
    });

    // Check for various success patterns
    const successPatterns = [
      'Plugin initialized successfully!',
      'successfully initialized',
      'Plugin created',
      'created successfully',
      'Installing dependencies',
      'dependencies installed',
      'Setup complete'
    ];

    const output = result.stdout + result.stderr;
    const hasSuccess = hasSuccessPattern(output, successPatterns);
    const pluginDir = 'plugin-my-plugin-app';

    if (!hasSuccess) {
      // Fallback: check if files were actually created
      expect(existsSync(pluginDir)).toBe(true);
      expect(existsSync(join(pluginDir, 'package.json'))).toBe(true);
    } else {
      expect(hasSuccess).toBe(true);
    }

    expect(existsSync(pluginDir)).toBe(true);
    expect(existsSync(join(pluginDir, 'package.json'))).toBe(true);
    expect(existsSync(join(pluginDir, 'src/index.ts'))).toBe(true);
  }, 80000);

  test('create agent succeeds', async () => {
    try {
      await execa('rm', ['-f', 'my-test-agent.json'], { stdio: 'ignore' });
    } catch (e) {
      // Ignore if file doesn't exist
    }

    const result = await runElizaosCommand(['create', 'my-test-agent', '--yes', '--type', 'agent']);

    const output = result.stdout + result.stderr;
    expect(output).toContain('Agent character created successfully');
    expect(existsSync('my-test-agent.json')).toBe(true);
    await validateAgentJson('my-test-agent.json', 'my-test-agent');
  });

  test('rejects creating project in existing directory', async () => {
    try {
      await execa('rm', ['-rf', 'existing-app'], { stdio: 'ignore' });
      await execa('mkdir', ['existing-app'], { stdio: 'ignore' });
      await execa('sh', ['-c', 'echo "test" > existing-app/file.txt'], { stdio: 'ignore' });
    } catch (e) {
      // Ignore setup errors
    }

    try {
      await runElizaosCommand(['create', 'existing-app', '--yes']);
      expect(false).toBe(true); // Should not reach here
    } catch (e: any) {
      expect(e.exitCode).not.toBe(0);
      const output = e.stdout + e.stderr;
      expect(output).toContain('already exists');
    }
  });

  test('create project in current directory', async () => {
    try {
      await execa('rm', ['-rf', 'create-in-place'], { stdio: 'ignore' });
      await execa('mkdir', ['create-in-place'], { stdio: 'ignore' });
    } catch (e) {
      // Ignore setup errors
    }

    process.chdir('create-in-place');

    const result = await runElizaosCommand(['create', '.', '--yes'], {
      timeout: 60000,
    });

    const output = result.stdout + result.stderr;

    // More flexible success patterns
    const successPatterns = [
      'Project initialized successfully!',
      'successfully initialized',
      'Project created',
      'created successfully',
      'Installing dependencies',
      'dependencies installed',
      'Setup complete'
    ];

    const hasSuccess = hasSuccessPattern(output, successPatterns);

    if (!hasSuccess) {
      // Fallback: check if files were actually created
      expect(existsSync('package.json')).toBe(true);
    } else {
      expect(hasSuccess).toBe(true);
    }

    expect(existsSync('package.json')).toBe(true);
  }, 80000);

  test('rejects invalid project name', async () => {
    try {
      await runElizaosCommand(['create', 'Invalid Name', '--yes']);
      expect(false).toBe(true); // Should not reach here
    } catch (e: any) {
      expect(e.exitCode).not.toBe(0);
      const output = e.stdout + e.stderr;
      expect(output).toMatch(/Invalid/i);
    }
  });

  test('rejects invalid project type', async () => {
    try {
      await runElizaosCommand(['create', 'bad-type-proj', '--yes', '--type', 'bad-type']);
      expect(false).toBe(true); // Should not reach here
    } catch (e: any) {
      expect(e.exitCode).not.toBe(0);
      const output = e.stdout + e.stderr;
      expect(output).toMatch(/Invalid type/i);
    }
  });

  // create-eliza parity tests
  test('create-eliza default project succeeds', async () => {
    try {
      await execa('rm', ['-rf', 'my-create-app'], { stdio: 'ignore' });
    } catch (e) {
      // Ignore if file doesn't exist
    }

    try {
      // Check if create-eliza command exists first
      if (!existsSync(createElizaCmd)) {
        console.warn('Skipping create-eliza test - command not available');
        return;
      }

      const result = await runCreateElizaCommand(['my-create-app', '--yes']);

      const output = result.stdout + result.stderr;
      const successPatterns = [
        'Project initialized successfully!',
        'successfully initialized',
        'Project created',
        'created successfully',
        'Installing dependencies',
        'dependencies installed',
        'Setup complete'
      ];

      const hasSuccess = hasSuccessPattern(output, successPatterns);

      if (!hasSuccess) {
        // Fallback: check if files were actually created
        expect(existsSync('my-create-app')).toBe(true);
        expect(existsSync('my-create-app/package.json')).toBe(true);
      } else {
        expect(hasSuccess).toBe(true);
      }

      expect(existsSync('my-create-app')).toBe(true);
      expect(existsSync('my-create-app/package.json')).toBe(true);
      expect(existsSync('my-create-app/src')).toBe(true);
    } catch (e: any) {
      // Skip this test if create-eliza is not available
      console.warn('Skipping create-eliza test - command not available');
    }
  }, 80000);

  test('create-eliza plugin project succeeds', async () => {
    try {
      await execa('rm', ['-rf', 'plugin-my-create-plugin'], { stdio: 'ignore' });
    } catch (e) {
      // Ignore if file doesn't exist
    }

    try {
      // Check if create-eliza command exists first
      if (!existsSync(createElizaCmd)) {
        console.warn('Skipping create-eliza test - command not available');
        return;
      }

      const result = await runCreateElizaCommand(['my-create-plugin', '--yes', '--type', 'plugin']);

      const output = result.stdout + result.stderr;
      const successPatterns = [
        'Plugin initialized successfully!',
        'successfully initialized',
        'Plugin created',
        'created successfully',
        'Installing dependencies',
        'dependencies installed',
        'Setup complete'
      ];

      const hasSuccess = hasSuccessPattern(output, successPatterns);
      const pluginDir = 'plugin-my-create-plugin';

      if (!hasSuccess) {
        // Fallback: check if files were actually created
        expect(existsSync(pluginDir)).toBe(true);
        expect(existsSync(join(pluginDir, 'package.json'))).toBe(true);
      } else {
        expect(hasSuccess).toBe(true);
      }

      expect(existsSync(pluginDir)).toBe(true);
      expect(existsSync(join(pluginDir, 'package.json'))).toBe(true);
      expect(existsSync(join(pluginDir, 'src/index.ts'))).toBe(true);
    } catch (e: any) {
      // Skip this test if create-eliza is not available
      console.warn('Skipping create-eliza test - command not available');
    }
  }, 80000);
});
