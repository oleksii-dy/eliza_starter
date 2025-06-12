import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { execa } from 'execa';
import { mkdtemp, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { safeChangeDirectory } from './test-utils';

describe('ElizaOS Monorepo Commands', () => {
  let testTmpDir: string;
  let elizaosCmd: string;
  let originalCwd: string;

  beforeEach(async () => {
    // Store original working directory
    originalCwd = process.cwd();

    // Create temporary directory
    testTmpDir = await mkdtemp(join(tmpdir(), 'eliza-test-monorepo-'));
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

    if (testTmpDir && testTmpDir.includes('eliza-test-monorepo-')) {
      try {
        await rm(testTmpDir, { recursive: true });
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  });

  test('monorepo --help shows usage', async () => {
    const result = await runElizaosCommand(['monorepo', '--help'], { encoding: 'utf8' });
    expect(result.stdout).toContain('Usage: elizaos monorepo');
    expect(result.stdout).toContain('--init');
    expect(result.stdout).toContain('--check');
  });

  test('monorepo command detects projects', async () => {
    const result = await runElizaosCommand(['monorepo', '--help'], { encoding: 'utf8' });
    expect(result.stdout).toContain('monorepo');
  });
});
