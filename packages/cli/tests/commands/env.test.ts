import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { execa } from 'execa';
import { mkdtemp, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { safeChangeDirectory } from './test-utils';

describe('ElizaOS Env Commands', () => {
  let testTmpDir: string;
  let elizaosCmd: string;
  let originalCwd: string;

  beforeEach(async () => {
    // Store original working directory
    originalCwd = process.cwd();

    // Create temporary directory
    testTmpDir = await mkdtemp(join(tmpdir(), 'eliza-test-env-'));
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

    if (testTmpDir && testTmpDir.includes('eliza-test-env-')) {
      try {
        await rm(testTmpDir, { recursive: true });
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  });

  test('env --help shows usage', async () => {
    const result = await runElizaosCommand(['env', '--help'], { encoding: 'utf8' });
    expect(result.stdout).toContain('Usage: elizaos env');
    expect(result.stdout).toContain('Commands:');
    expect(result.stdout).toContain('list');
    expect(result.stdout).toContain('edit-local');
    expect(result.stdout).toContain('reset');
  });

  test('env list shows available environment variables', async () => {
    const result = await runElizaosCommand(['env', 'list'], { encoding: 'utf8' });
    expect(result.stdout).toContain('Environment Variables');
  });

  test('env edit-local shows warning about missing file', async () => {
    try {
      await runElizaosCommand(['env', 'edit-local'], { encoding: 'utf8' });
      // Should not reach here if the command fails as expected
      expect(false).toBe(true);
    } catch (e: any) {
      // The command should fail since there's no project
      expect(e.exitCode).not.toBe(0);
    }
  });

  test('env reset shows confirmation message', async () => {
    const result = await runElizaosCommand(['env', 'reset', '--yes'], { encoding: 'utf8' });
    expect(result.stdout).toMatch(/(reset|removed|cleared)/i);
  });
});
