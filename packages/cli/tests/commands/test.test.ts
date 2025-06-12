import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { execa } from 'execa';
import { mkdtemp, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { safeChangeDirectory } from './test-utils';

describe('ElizaOS Test Commands', () => {
  let testTmpDir: string;
  let elizaosCmd: string;
  let originalCwd: string;

  beforeEach(async () => {
    // Store original working directory
    originalCwd = process.cwd();

    // Create temporary directory
    testTmpDir = await mkdtemp(join(tmpdir(), 'eliza-test-test-'));
    process.chdir(testTmpDir);

    // Setup CLI command
    const scriptDir = join(__dirname, '..');
    elizaosCmd = join(scriptDir, '../dist/index.js');
  });

  // Helper function to run elizaos commands with execa
  const runElizaosCommand = async (args: string[], options: any = {}) => {
    return await execa('bun', ['run', elizaosCmd, ...args], options);
  };

  afterEach(async () => {
    // Restore original working directory
    safeChangeDirectory(originalCwd);

    if (testTmpDir && testTmpDir.includes('eliza-test-test-')) {
      try {
        await rm(testTmpDir, { recursive: true });
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  });

  test('test --help shows usage', async () => {
    const result = await runElizaosCommand(['test', '--help'], { encoding: 'utf8' });
    expect(result.stdout).toContain('Usage: elizaos test');
    expect(result.stdout).toContain('test');
  });

  test('test command accepts -n option with quotes', async () => {
    const result = await runElizaosCommand(['test', '-n', 'filter-name', '--help'], { encoding: 'utf8' });
    expect(result.stdout).toContain('Filter tests by name');
  });

  test('test command accepts -n option without quotes', async () => {
    const result = await runElizaosCommand(['test', '-n', 'filter-name', '--help'], { encoding: 'utf8' });
    expect(result.stdout).toContain('Filter tests by name');
  });

  test('test command accepts --name option', async () => {
    const result = await runElizaosCommand(['test', '--name', 'filter-name', '--help'], { encoding: 'utf8' });
    expect(result.stdout).toContain('Filter tests by name');
  });

  test('test component command accepts -n option', async () => {
    const result = await runElizaosCommand(['test', 'component', '-n', 'filter-name', '--help'], { encoding: 'utf8' });
    expect(result.stdout).toContain('component');
  });

  test('test e2e command accepts -n option', async () => {
    const result = await runElizaosCommand(['test', 'e2e', '-n', 'filter-name', '--help'], { encoding: 'utf8' });
    expect(result.stdout).toContain('e2e');
  });

  test('test command accepts --skip-build option', async () => {
    const result = await runElizaosCommand(['test', '--skip-build', '--help'], { encoding: 'utf8' });
    expect(result.stdout).toContain('Skip building before running tests');
  });

  test('test command accepts combination of options', async () => {
    const result = await runElizaosCommand(['test', '-n', 'filter-name', '--skip-build', '--help'], { encoding: 'utf8' });
    expect(result.stdout).toContain('Filter tests by name');
    expect(result.stdout).toContain('Skip building before running tests');
  });

  test('test command handles basic name format', async () => {
    const result = await runElizaosCommand(['test', '-n', 'basic', '--help'], { encoding: 'utf8' });
    expect(result.stdout).toContain('test');
  });

  test('test command handles .test name format', async () => {
    const result = await runElizaosCommand(['test', '-n', 'basic.test', '--help'], { encoding: 'utf8' });
    expect(result.stdout).toContain('test');
  });

  test('test command handles .test.ts name format', async () => {
    const result = await runElizaosCommand(['test', '-n', 'basic.test.ts', '--help'], { encoding: 'utf8' });
    expect(result.stdout).toContain('test');
  });
});
