import { vi, describe, it, expect, beforeEach, afterEach, type Mock } from 'vitest';
import { start } from '../../src/commands/start';
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
  spinner: () => ({
    start: vi.fn(),
    stop: vi.fn(),
    succeed: vi.fn(),
    fail: vi.fn(),
    text: '',
  }),
};

const mockLoadProject = vi.fn();
const mockDisplayBanner = vi.fn();
const mockLoadEnvConfig = vi.fn();
const mockBuildProject = vi.fn();
const mockHandleError = vi.fn().mockImplementation((error) => {
  throw error instanceof Error ? error : new Error(String(error));
});

const mockServer = {
  start: vi.fn(),
  stop: vi.fn(),
  initialize: vi.fn(),
  database: {
    init: vi.fn(),
    getConnection: vi.fn().mockResolvedValue(true),
  },
  agents: new Map(),
  startAgent: vi.fn().mockResolvedValue({
    agentId: 'mock-agent-id',
    character: { name: 'Mock Agent' },
  }),
  loadCharacterTryPath: vi.fn(),
  jsonToCharacter: vi.fn(),
};

const mockAgentServer = vi.fn().mockImplementation(() => mockServer);

vi.mock('@elizaos/core', () => ({
  logger: mockLogger,
}));

vi.mock('../../src/project', () => ({
  loadProject: mockLoadProject,
}));

vi.mock('../../src/server/index', () => ({
  AgentServer: mockAgentServer,
}));

vi.mock('../../src/server/loader', () => ({
  loadCharacterTryPath: vi.fn(),
  jsonToCharacter: vi.fn(),
}));

vi.mock('../../src/utils', () => ({
  displayBanner: mockDisplayBanner,
  loadEnvConfig: mockLoadEnvConfig,
  buildProject: mockBuildProject,
  handleError: mockHandleError,
  resolvePgliteDir: vi.fn().mockResolvedValue('/mock/.elizadb'),
  UserEnvironment: {
    getInstance: vi.fn().mockReturnValue({
      getInfo: vi.fn().mockResolvedValue({
        paths: {
          elizaDir: '/mock/.eliza',
          envFilePath: '/mock/.env',
          pgliteDbDir: '/mock/.elizadb',
        },
      }),
      getPathInfo: vi.fn().mockResolvedValue({
        elizaDir: '/mock/.eliza',
        envFilePath: '/mock/.env',
      }),
    }),
  },
  promptForEnvVars: vi.fn(),
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

vi.mock('fs', () => ({
  existsSync: vi.fn().mockReturnValue(true),
  mkdirSync: vi.fn(),
}));

vi.mock('dotenv', () => ({
  config: vi.fn(),
}));

describe('start command', () => {
  let tempDir: string;
  let cwdSpy: Mock;
  let envBackup: typeof process.env;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'start-test-'));
    cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(tempDir);
    envBackup = { ...process.env };
    
    // Reset all mocks
    vi.clearAllMocks();
    mockServer.agents.clear();
    
    // Default mock implementations
    mockLoadProject.mockResolvedValue({
      agents: [{
        character: { name: 'Test Agent' },
        plugins: [],
      }],
      isPlugin: false,
    });
  });

  afterEach(async () => {
    cwdSpy.mockRestore();
    process.env = envBackup;
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('basic server start', () => {
    it('should start server with default configuration', async () => {
      const action = (start as any)._actionHandler;
      
      await action({ port: 3000, nonInteractive: true });

      expect(mockDisplayBanner).toHaveBeenCalled();
      expect(mockLoadEnvConfig).toHaveBeenCalled();
      expect(mockLoadProject).toHaveBeenCalledWith(tempDir);
      expect(mockServer.initialize).toHaveBeenCalled();
      expect(mockServer.start).toHaveBeenCalledWith(3000);
      expect(mockLogger.success).toHaveBeenCalledWith(
        expect.stringContaining('Server running at')
      );
    });

    it('should handle port conflicts', async () => {
      const action = (start as any)._actionHandler;
      
      // Mock port already in use
      const netMock = await import('node:net');
      (netMock.createServer as any).mockReturnValue({
        once: vi.fn((event, callback) => {
          if (event === 'error') callback(new Error('EADDRINUSE'));
        }),
        listen: vi.fn(),
        close: vi.fn(),
      });

      await expect(action({ port: 3000 })).rejects.toThrow();
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Port 3000 is already in use')
      );
    });

    it('should build project before starting if not built', async () => {
      const action = (start as any)._actionHandler;
      
      await action({ port: 3000, skipBuild: false, nonInteractive: true });

      expect(mockBuildProject).toHaveBeenCalledWith(tempDir, false);
      expect(mockBuildProject).toHaveBeenCalledBefore(mockServer.start as any);
    });

    it('should skip build when --skip-build is passed', async () => {
      const action = (start as any)._actionHandler;
      
      await action({ port: 3000, skipBuild: true, nonInteractive: true });

      expect(mockBuildProject).not.toHaveBeenCalled();
    });
  });

  describe('agent loading', () => {
    it('should load single agent from project', async () => {
      const testAgent = {
        character: { name: 'Custom Agent', description: 'Test agent' },
        plugins: ['test-plugin'],
      };
      
      mockLoadProject.mockResolvedValue({
        agents: [testAgent],
        isPlugin: false,
      });

      const action = (start as any)._actionHandler;
      await action({ port: 3000, nonInteractive: true });

      expect(mockServer.startAgent).toHaveBeenCalledWith(
        testAgent.character,
        expect.anything(),
        undefined,
        testAgent.plugins,
        expect.any(Object)
      );
    });

    it('should load multiple agents from project', async () => {
      const agents = [
        { character: { name: 'Agent 1' }, plugins: [] },
        { character: { name: 'Agent 2' }, plugins: [] },
        { character: { name: 'Agent 3' }, plugins: [] },
      ];
      
      mockLoadProject.mockResolvedValue({
        agents,
        isPlugin: false,
      });

      const action = (start as any)._actionHandler;
      await action({ port: 3000, nonInteractive: true });

      expect(mockServer.startAgent).toHaveBeenCalledTimes(3);
      agents.forEach((agent, index) => {
        expect(mockServer.startAgent).toHaveBeenNthCalledWith(
          index + 1,
          agent.character,
          expect.anything(),
          undefined,
          agent.plugins,
          expect.any(Object)
        );
      });
    });

    it('should handle plugin projects with default Eliza character', async () => {
      const testPlugin = {
        name: 'test-plugin',
        actions: [],
        providers: [],
      };
      
      mockLoadProject.mockResolvedValue({
        agents: [],
        isPlugin: true,
        pluginModule: testPlugin,
      });

      const action = (start as any)._actionHandler;
      await action({ port: 3000, nonInteractive: true });

      expect(mockServer.startAgent).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Eliza' }), // Default character
        expect.anything(),
        undefined,
        [testPlugin],
        expect.objectContaining({ isPluginTestMode: true })
      );
    });

    it('should load character from file when specified', async () => {
      const characterPath = join(tempDir, 'character.json');
      const characterData = {
        name: 'File Character',
        description: 'Loaded from file',
      };
      await writeFile(characterPath, JSON.stringify(characterData));
      
      mockLoadProject.mockResolvedValue({
        agents: [],
        isPlugin: false,
      });

      const action = (start as any)._actionHandler;
      await action({ 
        port: 3000, 
        nonInteractive: true,
        character: characterPath,
      });

      expect(mockServer.startAgent).toHaveBeenCalledWith(
        expect.objectContaining(characterData),
        expect.anything(),
        undefined,
        [],
        expect.any(Object)
      );
    });
  });

  describe('environment and configuration', () => {
    it('should handle different database configurations', async () => {
      process.env.POSTGRES_URL = 'postgresql://localhost/test';
      
      const action = (start as any)._actionHandler;
      await action({ port: 3000, db: 'postgres', nonInteractive: true });

      expect(mockServer.initialize).toHaveBeenCalledWith(
        expect.objectContaining({
          postgresUrl: 'postgresql://localhost/test',
        })
      );
    });

    it('should use PGLite when no Postgres URL is provided', async () => {
      delete process.env.POSTGRES_URL;
      
      const action = (start as any)._actionHandler;
      await action({ port: 3000, db: 'pglite', nonInteractive: true });

      expect(mockServer.initialize).toHaveBeenCalledWith(
        expect.objectContaining({
          dataDir: '/mock/.elizadb',
        })
      );
    });

    it('should respect custom agent names', async () => {
      const customAgent = {
        character: { name: 'Original Name' },
        plugins: [],
      };
      
      mockLoadProject.mockResolvedValue({
        agents: [customAgent],
        isPlugin: false,
      });

      const action = (start as any)._actionHandler;
      await action({ 
        port: 3000, 
        nonInteractive: true,
        agentName: 'Custom Name',
      });

      expect(mockServer.startAgent).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Custom Name' }),
        expect.anything(),
        undefined,
        [],
        expect.any(Object)
      );
    });
  });

  describe('error handling', () => {
    it('should handle project loading errors', async () => {
      mockLoadProject.mockRejectedValue(new Error('Failed to load project'));
      
      const action = (start as any)._actionHandler;
      await expect(action({ port: 3000 })).rejects.toThrow('Failed to load project');
      
      expect(mockHandleError).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Failed to load project' })
      );
    });

    it('should handle database initialization errors', async () => {
      mockServer.initialize.mockRejectedValue(new Error('Database error'));
      
      const action = (start as any)._actionHandler;
      await expect(action({ port: 3000 })).rejects.toThrow('Database error');
      
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Database initialization failed')
      );
    });

    it('should handle agent startup errors gracefully', async () => {
      const agents = [
        { character: { name: 'Good Agent' }, plugins: [] },
        { character: { name: 'Bad Agent' }, plugins: [] },
      ];
      
      mockLoadProject.mockResolvedValue({
        agents,
        isPlugin: false,
      });
      
      mockServer.startAgent
        .mockResolvedValueOnce({ agentId: 'good-agent' })
        .mockRejectedValueOnce(new Error('Agent startup failed'));

      const action = (start as any)._actionHandler;
      
      // Should not throw, but should log warning
      await action({ port: 3000, nonInteractive: true });
      
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Skipping agent Bad Agent')
      );
      expect(mockServer.agents.size).toBe(1);
    });

    it('should clean up on server start failure', async () => {
      mockServer.start.mockRejectedValue(new Error('Server start failed'));
      
      const action = (start as any)._actionHandler;
      await expect(action({ port: 3000 })).rejects.toThrow('Server start failed');
      
      expect(mockServer.stop).toHaveBeenCalled();
    });
  });

  describe('special modes', () => {
    it('should start in debug mode with verbose logging', async () => {
      const action = (start as any)._actionHandler;
      await action({ port: 3000, debug: true, nonInteractive: true });

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Debug mode enabled')
      );
    });

    it('should handle graceful shutdown on SIGINT', async () => {
      const action = (start as any)._actionHandler;
      
      // Start server
      const startPromise = action({ port: 3000, nonInteractive: true });
      await startPromise;
      
      // Simulate SIGINT
      const sigintHandler = process.listeners('SIGINT')[0] as Function;
      await sigintHandler();
      
      expect(mockServer.stop).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith('Shutting down gracefully...');
    });
  });
});