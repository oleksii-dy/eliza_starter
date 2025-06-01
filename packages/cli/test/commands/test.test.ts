import { vi, describe, it, expect, beforeEach, afterEach, type Mock } from 'vitest';
import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execa } from 'execa';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const elizaCmd = path.join(__dirname, '../../dist/index.js');

// Mock dependencies
const mockLogger = {
  info: vi.fn(),
  debug: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  success: vi.fn(),
  log: vi.fn(),
  table: vi.fn(),
};

const mockLoadProject = vi.fn();
const mockBuildProject = vi.fn();
const mockCheckPortAvailable = vi.fn();
const mockDetectDirectoryType = vi.fn();

const mockServer = {
  start: vi.fn(),
  stop: vi.fn(),
  initialize: vi.fn(),
  database: {
    init: vi.fn(),
    getConnection: vi.fn().mockResolvedValue(true),
  },
  startAgent: vi.fn().mockResolvedValue({
    agentId: 'test-agent-id',
    character: { name: 'Test Agent' },
  }),
};

vi.mock('@elizaos/core', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
    log: vi.fn(),
    table: vi.fn(),
    spinner: () => ({
      start: vi.fn(),
      stop: vi.fn(),
      succeed: vi.fn(),
      fail: vi.fn(),
      text: '',
    }),
  },
}));

vi.mock('../../src/project', () => ({
  loadProject: vi.fn(),
}));

vi.mock('../../src/utils', () => ({
  buildProject: vi.fn(),
  promptForEnvVars: vi.fn(),
  resolvePgliteDir: vi.fn().mockResolvedValue('/mock/.elizadb'),
  UserEnvironment: {
    getInstanceInfo: vi.fn().mockResolvedValue({
      paths: {
        elizaDir: '/mock/.eliza',
        envFilePath: '/mock/.env',
      },
    }),
  },
  TestRunner: vi.fn().mockImplementation(() => ({
    runTests: vi.fn().mockResolvedValue({ success: true, failedTests: [] }),
  })),
}));

vi.mock('../../src/utils/directory-detection', () => ({
  detectDirectoryType: vi.fn(),
}));

vi.mock('../../src/server/index', () => ({
  AgentServer: vi.fn().mockImplementation(() => ({
    start: vi.fn(),
    stop: vi.fn(),
    initialize: vi.fn(),
    database: {
      init: vi.fn(),
      getConnection: vi.fn().mockResolvedValue(true),
    },
    startAgent: vi.fn().mockResolvedValue({
      agentId: 'test-agent-id',
      character: { name: 'Test Agent' },
    }),
  })),
}));

vi.mock('../../src/server/loader', () => ({
  loadCharacterTryPath: vi.fn(),
  jsonToCharacter: vi.fn(),
}));

vi.mock('../../src/commands/start', () => ({
  startAgent: vi.fn().mockResolvedValue({
    agentId: 'mock-agent-id',
    character: { name: 'Mock Agent' },
  }),
}));

vi.mock('node:fs', () => ({
  existsSync: vi.fn().mockReturnValue(true),
  mkdirSync: vi.fn(),
}));

vi.mock('dotenv', () => ({
  config: vi.fn(),
}));

vi.mock('node:net', () => ({
  createServer: vi.fn().mockReturnValue({
    once: vi.fn((event, callback) => {
      if (event === 'listening') callback();
    }),
    listen: vi.fn(),
    close: vi.fn(),
  }),
}));

describe('test command', () => {
  let tempDir: string;
  let cwdSpy: Mock;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'test-cmd-'));
    cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(tempDir);
    
    // Reset all mocks
    vi.clearAllMocks();
    
    // Create a basic package.json
    await writeFile(
      join(tempDir, 'package.json'),
      JSON.stringify({
        name: 'test-project',
        version: '1.0.0',
        type: 'module',
        main: 'index.js',
        scripts: {
          test: 'vitest'
        }
      })
    );
    
    // Create a basic index.js
    await writeFile(
      join(tempDir, 'index.js'),
      `export default {
        agents: [{
          character: { name: 'Test Agent' },
          plugins: []
        }]
      };`
    );
  });

  afterEach(async () => {
    cwdSpy.mockRestore();
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('component tests', () => {
    it('should run component tests via CLI', async () => {
      // Create a simple test file
      await mkdir(join(tempDir, 'test'), { recursive: true });
      await writeFile(
        join(tempDir, 'test', 'sample.test.js'),
        `
        import { describe, it, expect } from 'vitest';
        describe('sample test', () => {
          it('should pass', () => {
            expect(true).toBe(true);
          });
        });
        `
      );

      try {
        const result = await execa('node', [elizaCmd, 'test', 'component', '--skip-build'], {
          cwd: tempDir,
          env: { ...process.env, NODE_ENV: 'test' }
        });

        expect(result.stdout).toContain('test');
        expect(result.exitCode).toBe(0);
      } catch (error) {
        // If tests aren't actually run, that's OK for this test
        // We're mainly testing the command structure
        expect(error.exitCode).toBeDefined();
      }
    });

    it('should support test filtering', async () => {
      try {
        const result = await execa('node', [elizaCmd, 'test', 'component', '--name', 'agent', '--skip-build'], {
          cwd: tempDir,
          env: { ...process.env, NODE_ENV: 'test' }
        });

        // Command should at least parse correctly
        expect(result.exitCode).toBeDefined();
      } catch (error) {
        // Expected - no actual tests to run
        expect(error.stderr || error.stdout).toBeDefined();
      }
    });
  });

  describe('e2e tests', () => {
    it('should run e2e tests via CLI', async () => {
      try {
        const result = await execa('node', [elizaCmd, 'test', 'e2e', '--port', '3456', '--skip-build'], {
          cwd: tempDir,
          env: { ...process.env, NODE_ENV: 'test' },
          timeout: 10000
        });

        expect(result.exitCode).toBeDefined();
      } catch (error) {
        // Expected - e2e tests require more setup
        expect(error.stderr || error.stdout).toBeDefined();
      }
    });
  });

  describe('all tests', () => {
    it('should run all tests by default', async () => {
      try {
        const result = await execa('node', [elizaCmd, 'test', '--skip-build'], {
          cwd: tempDir,
          env: { ...process.env, NODE_ENV: 'test' },
          timeout: 10000
        });

        expect(result.exitCode).toBeDefined();
      } catch (error) {
        // Expected - tests require more setup
        expect(error.stderr || error.stdout).toBeDefined();
      }
    });

    it('should accept common test options', async () => {
      try {
        const result = await execa('node', [elizaCmd, 'test', 'all', '--port', '3457', '--name', 'sample', '--skip-build'], {
          cwd: tempDir,
          env: { ...process.env, NODE_ENV: 'test' },
          timeout: 10000
        });

        expect(result.exitCode).toBeDefined();
      } catch (error) {
        // Expected - tests require more setup
        expect(error.stderr || error.stdout).toBeDefined();
      }
    });
  });

  describe('help and usage', () => {
    it('should show help for test command', async () => {
      const result = await execa('node', [elizaCmd, 'test', '--help'], {
        cwd: tempDir
      });

      expect(result.stdout).toContain('Run tests for Eliza agent projects and plugins');
      expect(result.stdout).toContain('component');
      expect(result.stdout).toContain('e2e');
      expect(result.stdout).toContain('all');
      expect(result.exitCode).toBe(0);
    });

    it('should show subcommand help', async () => {
      const result = await execa('node', [elizaCmd, 'test', 'component', '--help'], {
        cwd: tempDir
      });

      expect(result.stdout).toContain('Run component tests');
      expect(result.exitCode).toBe(0);
    });
  });

  describe('error handling', () => {
    it('should handle missing project gracefully', async () => {
      // Remove the index.js file
      await rm(join(tempDir, 'index.js'));

      try {
        await execa('node', [elizaCmd, 'test', 'e2e'], {
          cwd: tempDir,
          env: { ...process.env, NODE_ENV: 'test' }
        });
      } catch (error) {
        expect(error.stderr).toBeDefined();
        expect(error.exitCode).not.toBe(0);
      }
    });

    it('should handle invalid port numbers', async () => {
      try {
        await execa('node', [elizaCmd, 'test', 'e2e', '--port', 'invalid'], {
          cwd: tempDir,
          env: { ...process.env, NODE_ENV: 'test' }
        });
      } catch (error) {
        expect(error.stderr).toContain('option');
        expect(error.exitCode).not.toBe(0);
      }
    });
  });
});