import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { spawn } from 'child_process';
import { execa } from 'execa';
import { mkdtemp, rm, mkdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

describe('ElizaOS Agent Commands', () => {
  let serverProcess: any;
  let testTmpDir: string;
  let testServerPort: string;
  let testServerUrl: string;
  let elizaosCmd: string;

  beforeAll(async () => {
    // Setup test environment
    testServerPort = '3000';
    testServerUrl = `http://localhost:${testServerPort}`;
    testTmpDir = await mkdtemp(join(tmpdir(), 'eliza-test-agent-'));

    // Setup CLI command
    const scriptDir = join(__dirname, '..');
    elizaosCmd = join(scriptDir, '../dist/index.js');

    // Kill any existing processes on port 3000
    try {
      await execa('sh', ['-c', 'lsof -t -i :3000 | xargs kill -9'], { stdio: 'ignore' });
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (e) {
      // Ignore if no processes found
    }

    // Create database directory
    await mkdir(join(testTmpDir, 'elizadb'), { recursive: true });

    // Start the ElizaOS server
    console.log(`[DEBUG] Starting ElizaOS server on port ${testServerPort}`);

    serverProcess = spawn(
      'bun',
      ['run', join(scriptDir, '../dist/index.js'), 'start', '--port', testServerPort],
      {
        env: {
          ...process.env,
          LOG_LEVEL: 'debug',
          PGLITE_DATA_DIR: `${testTmpDir}/elizadb`,
        },
        stdio: ['ignore', 'pipe', 'pipe'],
      }
    );

    // Wait for server to be ready
    let attempts = 0;
    const maxAttempts = 30;

    while (attempts < maxAttempts) {
      try {
        const response = await fetch(`${testServerUrl}/api/agents`);
        if (response.ok) {
          console.log('[DEBUG] Server is ready!');
          break;
        }
      } catch (e) {
        // Server not ready yet
      }

      if (attempts === maxAttempts - 1) {
        throw new Error('Server did not start within timeout');
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
      attempts++;
    }

    // Pre-load test characters
    const charactersDir = join(scriptDir, 'test-characters');
    for (const character of ['ada', 'max', 'shaw']) {
      const characterPath = join(charactersDir, `${character}.json`);
      console.log(`[DEBUG] Loading character: ${character}`);

      try {
        await execa('bun', ['run', elizaosCmd, 'agent', 'start', '--remote-url', testServerUrl, '--path', characterPath], {
          stdio: 'pipe',
        });
        console.log(`[DEBUG] Successfully loaded character: ${character}`);
      } catch (e) {
        console.error(`[ERROR] Failed to load character ${character}:`, e);
        throw e;
      }
    }

    // Give characters time to register
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }, 60000); // 60 second timeout for setup

  // Helper function to run elizaos commands with execa
  const runElizaosCommand = async (args: string[], options: any = {}) => {
    return await execa('bun', ['run', elizaosCmd, ...args], options);
  };

  afterAll(async () => {
    if (serverProcess) {
      serverProcess.kill();
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    if (testTmpDir) {
      try {
        await rm(testTmpDir, { recursive: true });
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  });

  test('agent help displays usage information', async () => {
    const result = await runElizaosCommand(['agent', '--help'], { encoding: 'utf8' });
    expect(result.stdout).toContain('Usage: elizaos agent');
  });

  test('agent list returns agents', async () => {
    const result = await runElizaosCommand(['agent', 'list', '--remote-url', testServerUrl], {
      encoding: 'utf8',
    });
    expect(result.stdout).toMatch(/(Ada|Max|Shaw)/);
  });

  test('agent list works with JSON flag', async () => {
    const result = await runElizaosCommand(['agent', 'list', '--remote-url', testServerUrl, '--json'], {
      encoding: 'utf8',
    });
    expect(result.stdout).toContain('[');
    expect(result.stdout).toContain('{');
    expect(result.stdout).toMatch(/(name|Name)/);
  });

  test('agent get shows details with name parameter', async () => {
    const result = await runElizaosCommand(['agent', 'get', '--remote-url', testServerUrl, '-n', 'Ada'], {
      encoding: 'utf8',
    });
    expect(result.stdout).toContain('Ada');
  });

  test('agent get with JSON flag shows character definition', async () => {
    const result = await runElizaosCommand(['agent', 'get', '--remote-url', testServerUrl, '-n', 'Ada', '--json'], {
      encoding: 'utf8',
    });
    expect(result.stdout).toMatch(/(name|Name)/);
    expect(result.stdout).toContain('Ada');
  });

  test('agent get with output flag saves to file', async () => {
    const outputFile = join(testTmpDir, 'output_ada.json');
    await runElizaosCommand(['agent', 'get', '--remote-url', testServerUrl, '-n', 'Ada', '--output', outputFile], { encoding: 'utf8' });

    const { readFile } = await import('fs/promises');
    const fileContent = await readFile(outputFile, 'utf8');
    expect(fileContent).toContain('Ada');
  });

  test('agent start loads character from file', async () => {
    const charactersDir = join(__dirname, '../test-characters');
    const adaPath = join(charactersDir, 'ada.json');

    try {
      const result = await runElizaosCommand(['agent', 'start', '--remote-url', testServerUrl, '--path', adaPath], { encoding: 'utf8' });
      expect(result.stdout + result.stderr).toMatch(/(started successfully|created|already exists|already running)/);
    } catch (e: any) {
      // If it fails, check if it's because agent already exists
      expect(e.stdout || e.stderr).toMatch(/(already exists|already running)/);
    }
  });

  test('agent start works with name parameter', async () => {
    try {
      await runElizaosCommand(['agent', 'start', '--remote-url', testServerUrl, '-n', 'Ada'], {
        encoding: 'utf8',
      });
      // Should succeed or already exist
    } catch (e: any) {
      expect(e.stdout || e.stderr).toMatch(/already/);
    }
  });

  test('agent start handles non-existent agent fails', async () => {
    const nonExistentName = `NonExistent_${Date.now()}`;

    try {
      await runElizaosCommand(['agent', 'start', '--remote-url', testServerUrl, '-n', nonExistentName], {
        encoding: 'utf8',
        stdio: 'pipe',
      });
      // Should not reach here
      expect(false).toBe(true);
    } catch (e: any) {
      // The command should fail when agent doesn't exist
      expect(e.exitCode).not.toBe(0);
    }
  });

  test('agent stop works after start', async () => {
    // Ensure Ada is started first
    try {
      await runElizaosCommand(['agent', 'start', '--remote-url', testServerUrl, '-n', 'Ada'], { stdio: 'pipe' });
    } catch (e) {
      // May already be running
    }

    try {
      const result = await runElizaosCommand(['agent', 'stop', '--remote-url', testServerUrl, '-n', 'Ada'], {
        encoding: 'utf8',
      });
      expect(result.stdout + result.stderr).toMatch(/(stopped|Stopped)/);
    } catch (e: any) {
      expect(e.stdout || e.stderr).toMatch(/(not running|not found)/);
    }
  });

  test('agent set updates configuration correctly', async () => {
    const configFile = join(testTmpDir, 'update_config.json');
    const configContent = JSON.stringify({
      system: 'Updated system prompt for testing',
    });

    const { writeFile } = await import('fs/promises');
    await writeFile(configFile, configContent);

    const result = await runElizaosCommand(['agent', 'set', '--remote-url', testServerUrl, '-n', 'Ada', '-f', configFile], { encoding: 'utf8' });
    expect(result.stdout + result.stderr).toMatch(/(updated|Updated)/);
  });

  test('agent full lifecycle management', async () => {
    // Start agent
    try {
      await runElizaosCommand(['agent', 'start', '--remote-url', testServerUrl, '-n', 'Ada'], {
        encoding: 'utf8',
      });
      // Should succeed or already exist
    } catch (e: any) {
      expect(e.stdout || e.stderr).toMatch(/already/);
    }

    // Stop agent
    try {
      await runElizaosCommand(['agent', 'stop', '--remote-url', testServerUrl, '-n', 'Ada'], {
        encoding: 'utf8',
      });
      // Should succeed or not be running
    } catch (e: any) {
      expect(e.stdout || e.stderr).toMatch(/not running/);
    }
  });
});
