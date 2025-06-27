import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

describe('ElizaOS Dev Commands', () => {
  let testTmpDir: string;
  let projectDir: string;
  let elizaosCmd: string;
  let cliPath: string;
  let originalCwd: string;

  beforeAll(async () => {
    originalCwd = process.cwd();
    testTmpDir = await mkdtemp(join(tmpdir(), 'eliza-test-dev-'));

    const scriptDir = join(__dirname, '..');
    cliPath = join(scriptDir, '../dist/index.js');

    if (!existsSync(cliPath)) {
      console.log('CLI not built, building now...');
      const cliPackageDir = join(scriptDir, '..');
      execSync('bun run build', {
        cwd: cliPackageDir,
        stdio: 'inherit',
      });
    }

    elizaosCmd = `bun "${cliPath}"`;
    projectDir = join(testTmpDir, 'test-project');
    process.chdir(testTmpDir);

    await mkdir(projectDir, { recursive: true });
    await writeFile(
      join(projectDir, 'package.json'),
      JSON.stringify(
        {
          name: 'test-elizaos-project',
          version: '1.0.0',
          type: 'module',
          dependencies: {
            '@elizaos/core': '^1.0.0',
          },
        },
        null,
        2
      )
    );
    await mkdir(join(projectDir, 'src'), { recursive: true });
    await writeFile(join(projectDir, 'src/index.ts'), 'export const test = "hello";');
  });

  afterAll(async () => {
    process.chdir(originalCwd);
    if (testTmpDir && testTmpDir.includes('eliza-test-dev-')) {
      try {
        await rm(testTmpDir, { recursive: true });
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  });

  it('dev --help shows usage', () => {
    const result = execSync(`${elizaosCmd} dev --help`, { encoding: 'utf8' });
    expect(result).toContain('Usage: elizaos dev');
  });

  it('dev command validates port parameter', () => {
    try {
      execSync(`${elizaosCmd} dev --port abc`, {
        encoding: 'utf8',
        stdio: 'pipe',
        timeout: 5000,
        cwd: projectDir,
      });
      expect(false).toBe(true);
    } catch (error: any) {
      expect(error.status).toBeDefined();
      expect(error.status).not.toBe(0);
    }
  });
});
