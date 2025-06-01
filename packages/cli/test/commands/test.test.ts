import { vi, describe, it, expect, beforeEach, afterEach, type Mock } from 'vitest';
import { test } from '../../src/commands/test';
import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

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

const mockExeca = {
  execaCommand: vi.fn(),
};

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
  logger: mockLogger,
}));

vi.mock('../../src/project', () => ({
  loadProject: mockLoadProject,
}));

vi.mock('../../src/utils', () => ({
  buildProject: mockBuildProject,
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
  detectDirectoryType: mockDetectDirectoryType,
}));

vi.mock('../../src/server/index', () => ({
  AgentServer: vi.fn().mockImplementation(() => mockServer),
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

vi.mock('execa', () => mockExeca);

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
    
    // Default mock implementations
    mockDetectDirectoryType.mockReturnValue({
      type: 'elizaos-project',
      isElizaRoot: false,
      hasAgents: true,
    });
    
    mockCheckPortAvailable.mockResolvedValue(true);
    
    mockLoadProject.mockResolvedValue({
      agents: [{
        character: { name: 'Test Agent' },
        plugins: [],
      }],
      isPlugin: false,
    });
    
    mockExeca.execaCommand.mockResolvedValue({
      stdout: 'Tests passed',
      stderr: '',
    });
  });

  afterEach(async () => {
    cwdSpy.mockRestore();
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('component tests', () => {
    it('should run component tests successfully', async () => {
      const action = (test as any)._actionHandler;
      
      await action('component', {});

      expect(mockBuildProject).toHaveBeenCalledWith(tempDir, false);
      expect(mockExeca.execaCommand).toHaveBeenCalledWith(
        expect.stringContaining('bun run vitest run --passWithNoTests')
      );
      expect(mockLogger.info).toHaveBeenCalledWith('Component tests completed');
    });

    it('should skip build when --skip-build is passed', async () => {
      const action = (test as any)._actionHandler;
      
      await action('component', { skipBuild: true });

      expect(mockBuildProject).not.toHaveBeenCalled();
      expect(mockExeca.execaCommand).toHaveBeenCalled();
    });

    it('should filter tests by name', async () => {
      const action = (test as any)._actionHandler;
      
      await action('component', { name: 'agent.test.ts' });

      expect(mockExeca.execaCommand).toHaveBeenCalledWith(
        expect.stringContaining('-t agent')
      );
    });

    it('should handle test failures', async () => {
      mockExeca.execaCommand.mockResolvedValue({
        stdout: 'FAIL: Some tests failed',
        stderr: '',
      });

      const action = (test as any)._actionHandler;
      const result = await action('component', {});

      expect(result).toEqual({ component: { failed: true } });
    });

    it('should handle build errors gracefully', async () => {
      mockBuildProject.mockRejectedValue(new Error('Build failed'));

      const action = (test as any)._actionHandler;
      
      // Should continue with tests despite build error
      await action('component', {});

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Attempting to continue with tests despite build error')
      );
      expect(mockExeca.execaCommand).toHaveBeenCalled();
    });
  });

  describe('e2e tests', () => {
    it('should run e2e tests with server', async () => {
      const action = (test as any)._actionHandler;
      
      await action('e2e', { port: 3000 });

      expect(mockBuildProject).toHaveBeenCalled();
      expect(mockServer.initialize).toHaveBeenCalled();
      expect(mockServer.start).toHaveBeenCalledWith(3000);
      expect(mockLogger.info).toHaveBeenCalledWith('All e2e tests passed successfully');
      expect(mockServer.stop).toHaveBeenCalled();
    });

    it('should handle port conflicts', async () => {
      mockCheckPortAvailable.mockResolvedValue(false);
      const netMock = await import('node:net');
      (netMock.createServer as any).mockReturnValue({
        once: vi.fn((event, callback) => {
          if (event === 'error') callback(new Error('EADDRINUSE'));
        }),
        listen: vi.fn(),
        close: vi.fn(),
      });

      const action = (test as any)._actionHandler;
      
      await expect(action('e2e', { port: 3000 })).rejects.toThrow(
        'Port 3000 is already in use'
      );
    });

    it('should set up database correctly', async () => {
      const action = (test as any)._actionHandler;
      
      await action('e2e', { port: 3000 });

      expect(process.env.PGLITE_DATA_DIR).toBe('/mock/.elizadb');
      expect(mockServer.initialize).toHaveBeenCalledWith(
        expect.objectContaining({
          dataDir: '/mock/.elizadb',
        })
      );
    });

    it('should load and start agents for testing', async () => {
      mockLoadProject.mockResolvedValue({
        agents: [
          { character: { name: 'Agent 1' }, plugins: [] },
          { character: { name: 'Agent 2' }, plugins: [] },
        ],
        isPlugin: false,
      });

      const action = (test as any)._actionHandler;
      await action('e2e', { port: 3000 });

      expect(mockServer.startAgent).toHaveBeenCalledTimes(2);
    });

    it('should handle plugin testing with default character', async () => {
      mockLoadProject.mockResolvedValue({
        agents: [],
        isPlugin: true,
        pluginModule: {
          name: 'test-plugin',
          actions: [],
          providers: [],
        },
      });

      const action = (test as any)._actionHandler;
      await action('e2e', { port: 3000 });

      expect(process.env.ELIZA_TESTING_PLUGIN).toBe('true');
      expect(mockServer.startAgent).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Eliza' }),
        expect.anything(),
        undefined,
        expect.arrayContaining([
          expect.objectContaining({ name: 'test-plugin' })
        ])
      );
    });

    it('should clean up server on test failure', async () => {
      const { TestRunner } = await import('../../src/utils');
      const mockRunTests = vi.fn().mockResolvedValue({
        success: false,
        failedTests: ['test1', 'test2'],
      });
      (TestRunner as any).mockImplementation(() => ({
        runTests: mockRunTests,
      }));

      const action = (test as any)._actionHandler;
      const result = await action('e2e', { port: 3000 });

      expect(mockServer.stop).toHaveBeenCalled();
      expect(result).toEqual({
        e2e: {
          failed: true,
          failedTests: ['test1', 'test2'],
        },
      });
    });
  });

  describe('all tests', () => {
    it('should run both component and e2e tests by default', async () => {
      const action = (test as any)._actionHandler;
      
      const result = await action('all', {});

      expect(mockBuildProject).toHaveBeenCalled();
      expect(mockExeca.execaCommand).toHaveBeenCalled(); // component tests
      expect(mockServer.start).toHaveBeenCalled(); // e2e tests
      expect(result).toEqual({
        component: { failed: false },
        e2e: { failed: false },
      });
    });

    it('should exit with error code if any tests fail', async () => {
      mockExeca.execaCommand.mockResolvedValue({
        stdout: 'FAIL: Component tests failed',
        stderr: '',
      });

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit called');
      });

      const action = (test as any)._actionHandler;
      
      await expect(action('all', {})).rejects.toThrow('process.exit called');
      
      expect(exitSpy).toHaveBeenCalledWith(1);
      exitSpy.mockRestore();
    });

    it('should handle missing test type gracefully', async () => {
      const action = (test as any)._actionHandler;
      
      // Default to 'all' when no type specified
      const result = await action(undefined, {});

      expect(mockBuildProject).toHaveBeenCalled();
      expect(mockExeca.execaCommand).toHaveBeenCalled();
      expect(mockServer.start).toHaveBeenCalled();
    });
  });

  describe('plugin detection', () => {
    it('should detect plugin directory and build as plugin', async () => {
      mockDetectDirectoryType.mockReturnValue({
        type: 'elizaos-plugin',
        isElizaRoot: false,
        hasAgents: false,
      });

      const action = (test as any)._actionHandler;
      await action('component', {});

      expect(mockBuildProject).toHaveBeenCalledWith(tempDir, true); // isPlugin = true
    });

    it('should detect monorepo root', async () => {
      mockDetectDirectoryType.mockReturnValue({
        type: 'elizaos-monorepo',
        isElizaRoot: true,
        hasAgents: false,
      });

      const action = (test as any)._actionHandler;
      await action('component', {});

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Building project')
      );
    });
  });

  describe('error handling', () => {
    it('should handle project load errors in e2e tests', async () => {
      mockLoadProject.mockRejectedValue(new Error('No project found'));

      const action = (test as any)._actionHandler;
      
      await expect(action('e2e', { port: 3000 })).rejects.toThrow();
      
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Tests cannot run without a valid project')
      );
      expect(mockServer.stop).toHaveBeenCalled();
    });

    it('should handle database initialization timeout', async () => {
      mockServer.database.getConnection.mockResolvedValue(false);
      mockServer.database.init.mockRejectedValue(new Error('DB init failed'));

      const action = (test as any)._actionHandler;
      
      // Should eventually timeout (test shortened for speed)
      vi.useFakeTimers();
      const promise = action('e2e', { port: 3000 });
      
      // Fast forward to timeout
      vi.advanceTimersByTime(31000);
      
      await expect(promise).rejects.toThrow(
        'Database initialization timed out'
      );
      
      vi.useRealTimers();
    });
  });
});