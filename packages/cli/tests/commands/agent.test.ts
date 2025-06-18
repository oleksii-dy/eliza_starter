import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn, execSync } from 'child_process';
import { mkdtemp, rm, mkdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { TEST_TIMEOUTS } from '../test-timeouts';
import {
  waitForServerReady,
  killProcessOnPort,
  createTestProject,
  safeChangeDirectory,
} from './test-utils';
import { existsSync } from 'fs';

describe('ElizaOS Agent Commands', () => {
  let serverProcess: any;
  let testTmpDir: string;
  let testServerPort: string;
  let testServerUrl: string;
  let elizaosCmd: string;
  let defaultCharacter: string;
  let originalCwd: string;

  beforeAll(async () => {
    // Store original working directory
    originalCwd = process.cwd();

    // Create temporary directory for tests
    testTmpDir = await mkdtemp(join(tmpdir(), 'eliza-test-agent-'));
    const scriptDir = join(__dirname, '..');
    const cliPath = join(scriptDir, '../dist/index.js');

    // Check if CLI is built, if not build it
    if (!existsSync(cliPath)) {
      console.log('CLI not built, building now...');
      const cliPackageDir = join(scriptDir, '..');
      execSync('bun run build', {
        cwd: cliPackageDir,
        stdio: 'inherit',
      });
    }

    elizaosCmd = `bun ${cliPath}`;
    defaultCharacter = join(scriptDir, 'test-characters/ada.json');

    // Convert to absolute path and verify it exists
    const { resolve } = await import('path');
    defaultCharacter = resolve(defaultCharacter);
    console.log(`[DEBUG] Looking for character file at: ${defaultCharacter}`);

    if (!existsSync(defaultCharacter)) {
      throw new Error(`Character file not found at: ${defaultCharacter}`);
    }

    // Setup test environment
    testServerPort = '3000';
    testServerUrl = `http://localhost:${testServerPort}`;

    // Kill any existing processes on port 3000
    await killProcessOnPort(3000);
    await new Promise((resolve) => setTimeout(resolve, TEST_TIMEOUTS.SHORT_WAIT));

    // Create database directory
    await mkdir(join(testTmpDir, 'elizadb'), { recursive: true });

    // Start the ElizaOS server with a default character
    console.log(`[DEBUG] Starting ElizaOS server on port ${testServerPort}`);

    let actualServerPort: number | null = null;
    let serverOutputBuffer = '';

    serverProcess = spawn(
      'bun',
      [
        join(scriptDir, '../dist/index.js'),
        'start',
        '--port',
        testServerPort,
        '--character',
        defaultCharacter,
      ],
      {
        env: {
          ...process.env,
          LOG_LEVEL: 'debug',
          PGLITE_DATA_DIR: `${testTmpDir}/elizadb`,
          NODE_OPTIONS: '--max-old-space-size=4096', // Give server more memory
        },
        stdio: ['ignore', 'pipe', 'pipe'],
      }
    );

    // Capture server output for debugging
    serverProcess.stdout?.on('data', (data: Buffer) => {
      const output = data.toString();
      console.log(`[SERVER STDOUT] ${output}`);
      serverOutputBuffer += output;

      // Check for port change message
      const portChangeMatch = output.match(/Port \d+ is in use, using port (\d+) instead/);
      if (portChangeMatch) {
        actualServerPort = parseInt(portChangeMatch[1], 10);
        console.log(`[DEBUG] Server switched to port ${actualServerPort}`);
      }

      // Check for successful startup message
      const listeningMatch = output.match(/AgentServer is listening on port (\d+)/);
      if (listeningMatch) {
        actualServerPort = parseInt(listeningMatch[1], 10);
        console.log(`[DEBUG] Server confirmed listening on port ${actualServerPort}`);
      }
    });

    serverProcess.stderr?.on('data', (data: Buffer) => {
      console.error(`[SERVER STDERR] ${data.toString()}`);
    });

    serverProcess.on('error', (error: Error) => {
      console.error('[SERVER ERROR]', error);
    });

    serverProcess.on('exit', (code: number | null, signal: string | null) => {
      console.log(`[SERVER EXIT] code: ${code}, signal: ${signal}`);
    });

    // Wait a bit for port detection
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Use actual port if different from requested
    const portToCheck = actualServerPort || parseInt(testServerPort, 10);
    testServerUrl = `http://localhost:${portToCheck}`;

    console.log(`[DEBUG] Waiting for server to be ready on port ${portToCheck}...`);
    await waitForServerReady(portToCheck);
    console.log('[DEBUG] Server is ready!');

    // Pre-load additional test characters (ada is already loaded by server)
    const charactersDir = join(scriptDir, 'test-characters');
    for (const character of ['max', 'shaw']) {
      const characterPath = join(charactersDir, `${character}.json`);
      console.log(`[DEBUG] Loading character: ${character}`);

      try {
        execSync(
          `${elizaosCmd} agent start --remote-url ${testServerUrl} --path ${characterPath}`,
          {
            stdio: 'pipe',
            timeout: 30000, // 30 second timeout for loading each character
          }
        );
        console.log(`[DEBUG] Successfully loaded character: ${character}`);

        // Small wait between loading characters to avoid overwhelming the server
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (e) {
        console.error(`[ERROR] Failed to load character ${character}:`, e);
        throw e;
      }
    }

    // Give characters time to register
    await new Promise((resolve) => setTimeout(resolve, TEST_TIMEOUTS.SHORT_WAIT));
  }, TEST_TIMEOUTS.SUITE_TIMEOUT);

  afterAll(async () => {
    if (serverProcess) {
      try {
        // Use SIGTERM for graceful shutdown, fallback to SIGKILL
        serverProcess.kill('SIGTERM');

        // Wait briefly, then force kill if still running
        await new Promise((resolve) => setTimeout(resolve, 2000));
        if (!serverProcess.killed && serverProcess.exitCode === null) {
          serverProcess.kill('SIGKILL');
        }
        await new Promise((resolve) => setTimeout(resolve, TEST_TIMEOUTS.SHORT_WAIT));

        // Wait for process to actually exit
        if (!serverProcess.killed && serverProcess.exitCode === null) {
          await new Promise((resolve) => setTimeout(resolve, TEST_TIMEOUTS.PROCESS_CLEANUP));
        }
      } catch (e) {
        // Ignore cleanup errors
      }
    }

    if (testTmpDir) {
      try {
        await rm(testTmpDir, { recursive: true });
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  });

  it('agent help displays usage information', async () => {
    const result = execSync(`${elizaosCmd} agent --help`, { encoding: 'utf8' });
    expect(result).toContain('Usage: elizaos agent');
  });

  it('agent list returns agents', async () => {
    const result = execSync(`${elizaosCmd} agent list --remote-url ${testServerUrl}`, {
      encoding: 'utf8',
    });
    expect(result).toMatch(/(Ada|Max|Shaw)/);
  });

  it('agent list works with JSON flag', async () => {
    const result = execSync(`${elizaosCmd} agent list --remote-url ${testServerUrl} --json`, {
      encoding: 'utf8',
    });
    expect(result).toContain('[');
    expect(result).toContain('{');
    expect(result).toMatch(/(name|Name)/);
  });

  it('agent get shows details with name parameter', async () => {
    const result = execSync(`${elizaosCmd} agent get --remote-url ${testServerUrl} -n Ada`, {
      encoding: 'utf8',
    });
    expect(result).toContain('Ada');
  });

  it('agent get with JSON flag shows character definition', async () => {
    const result = execSync(`${elizaosCmd} agent get --remote-url ${testServerUrl} -n Ada --json`, {
      encoding: 'utf8',
    });
    expect(result).toMatch(/(name|Name)/);
    expect(result).toContain('Ada');
  });

  it('agent get with output flag saves to file', async () => {
    const outputFile = join(testTmpDir, 'output_ada.json');
    execSync(
      `${elizaosCmd} agent get --remote-url ${testServerUrl} -n Ada --output ${outputFile}`,
      { encoding: 'utf8' }
    );

    const { readFile } = await import('fs/promises');
    const fileContent = await readFile(outputFile, 'utf8');
    expect(fileContent).toContain('Ada');
  });

  it('agent start loads character from file', async () => {
    const charactersDir = join(__dirname, '../test-characters');
    // Use max.json since ada is already loaded by the server
    const maxPath = join(charactersDir, 'max.json');

    try {
      const result = execSync(
        `${elizaosCmd} agent start --remote-url ${testServerUrl} --path ${maxPath}`,
        { encoding: 'utf8' }
      );
      expect(result).toMatch(/(started successfully|created|already exists|already running)/);
    } catch (e: any) {
      // If it fails, check if it's because agent already exists
      expect(e.stdout || e.stderr).toMatch(/(already exists|already running)/);
    }
  });

  it('agent start works with name parameter', async () => {
    try {
      execSync(`${elizaosCmd} agent start --remote-url ${testServerUrl} -n Ada`, {
        encoding: 'utf8',
      });
      // Should succeed or already exist
    } catch (e: any) {
      expect(e.stdout || e.stderr).toMatch(/already/);
    }
  });

  it('agent start handles non-existent agent fails', async () => {
    const nonExistentName = `NonExistent_${Date.now()}`;

    try {
      execSync(`${elizaosCmd} agent start --remote-url ${testServerUrl} -n ${nonExistentName}`, {
        encoding: 'utf8',
        stdio: 'pipe',
      });
      // Should not reach here
      expect(false).toBe(true);
    } catch (e: any) {
      // The command should fail when agent doesn't exist
      expect(e.status).not.toBe(0);
    }
  });

  it('agent stop works after start', async () => {
    // Ensure Ada is started first
    try {
      execSync(`${elizaosCmd} agent start --remote-url ${testServerUrl} -n Ada`, { stdio: 'pipe' });
    } catch (e) {
      // May already be running
    }

    try {
      const result = execSync(`${elizaosCmd} agent stop --remote-url ${testServerUrl} -n Ada`, {
        encoding: 'utf8',
      });
      expect(result).toMatch(/(stopped|Stopped)/);
    } catch (e: any) {
      expect(e.stdout || e.stderr).toMatch(/(not running|not found)/);
    }
  });

  it('agent set updates configuration correctly', async () => {
    const configFile = join(testTmpDir, 'update_config.json');
    const configContent = JSON.stringify({
      system: 'Updated system prompt for testing',
    });

    const { writeFile } = await import('fs/promises');
    await writeFile(configFile, configContent);

    const result = execSync(
      `${elizaosCmd} agent set --remote-url ${testServerUrl} -n Ada -f ${configFile}`,
      { encoding: 'utf8' }
    );
    expect(result).toMatch(/(updated|Updated)/);
  });

  it('agent full lifecycle management', async () => {
    // Start agent
    try {
      execSync(`${elizaosCmd} agent start --remote-url ${testServerUrl} -n Ada`, {
        encoding: 'utf8',
      });
      // Should succeed or already exist
    } catch (e: any) {
      expect(e.stdout || e.stderr).toMatch(/already/);
    }

    // Stop agent
    try {
      execSync(`${elizaosCmd} agent stop --remote-url ${testServerUrl} -n Ada`, {
        encoding: 'utf8',
      });
      // Should succeed or not be running
    } catch (e: any) {
      expect(e.stdout || e.stderr).toMatch(/not running/);
    }
  });
});
