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
  registerAgent: vi.fn(),
  unregisterAgent: vi.fn(),
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
  stringToUuid: vi.fn().mockImplementation((str) => `uuid-${str}`),
  encryptedCharacter: vi.fn().mockImplementation((char) => ({ ...char, encrypted: true })),
  AgentRuntime: vi.fn().mockImplementation(function(options) {
    return {
      character: options.character,
      agentId: `agent-${options.character.name}`,
      initialize: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
    };
  }),
}));

vi.mock('../../src/project', () => ({
  loadProject: vi.fn(),
}));

const mockAgentServer = vi.fn().mockImplementation(() => mockServer);

vi.mock('../../src/server/index', () => ({
  AgentServer: vi.fn().mockImplementation(() => mockServer),
}));

vi.mock('../../src/utils', () => ({
  displayBanner: vi.fn(),
  loadConfig: vi.fn().mockResolvedValue({ isDefault: false }),
  buildProject: vi.fn(),
  handleError: vi.fn().mockImplementation((error) => {
    throw error instanceof Error ? error : new Error(String(error));
  }),
  resolvePgliteDir: vi.fn().mockResolvedValue('/mock/.elizadb'),
  UserEnvironment: {
    getInstance: vi.fn().mockReturnValue({
      getInfo: vi.fn().mockResolvedValue({
        paths: {
          elizaDir: '/mock/.eliza',
          envFilePath: '/mock/.env',
        },
        os: {
          platform: 'linux',
          release: '5.10.0',
          arch: 'x64',
        },
      }),
    }),
    getInstanceInfo: vi.fn().mockResolvedValue({
      paths: {
        elizaDir: '/mock/.eliza',
        envFilePath: '/mock/.env',
      },
      os: {
        platform: 'linux',
        release: '5.10.0',
        arch: 'x64',
      },
    }),
  },
  configureDatabaseSettings: vi.fn().mockResolvedValue(null),
  findNextAvailablePort: vi.fn().mockResolvedValue(3000),
  getCliInstallTag: vi.fn().mockReturnValue('latest'),
  promptForEnvVars: vi.fn(),
  saveConfig: vi.fn(),
}));

vi.mock('../../src/utils/directory-detection', () => ({
  detectDirectoryType: vi.fn().mockReturnValue('project'),
}));

vi.mock('../../src/utils/check-port', () => ({
  checkPortAvailable: vi.fn().mockResolvedValue(true),
}));

vi.mock('../../src/utils/load-agents', () => ({
  loadAgents: vi.fn().mockResolvedValue([
    {
      character: { name: 'Test Agent' },
      models: { openai: { model: 'gpt-4' } },
      settings: {},
    },
  ]),
}));

vi.mock('../../src/utils/port-handling', () => ({
  isPortFree: vi.fn().mockResolvedValue(true),
  findNextAvailablePort: vi.fn().mockResolvedValue(3001),
}));

vi.mock('../../src/utils/load-plugin', () => ({
  loadPluginModule: vi.fn().mockImplementation((name) => {
    // Mock different plugins
    if (name === '@elizaos/plugin-sql') {
      return {
        name: '@elizaos/plugin-sql',
        sqlPlugin: { name: '@elizaos/plugin-sql', init: vi.fn() },
        default: { name: '@elizaos/plugin-sql', init: vi.fn() },
      };
    }
    if (name === '@elizaos/plugin-local-ai') {
      return {
        name: '@elizaos/plugin-local-ai',
        localAiPlugin: { name: '@elizaos/plugin-local-ai', init: vi.fn() },
        default: { name: '@elizaos/plugin-local-ai', init: vi.fn() },
      };
    }
    return null;
  }),
}));

const mockLoadProject = vi.fn();
const mockDisplayBanner = vi.fn();
const mockLoadConfig = vi.fn();
const mockBuildProject = vi.fn();
const mockHandleError = vi.fn().mockImplementation((error) => {
  throw error instanceof Error ? error : new Error(String(error));
});
const mockLoadCharacterTryPath = vi.fn().mockResolvedValue({
  name: 'Default Character',
  description: 'Default description',
});
const mockJsonToCharacter = vi.fn().mockImplementation((json) => json);

vi.mock('node:net', () => ({
  createServer: vi.fn().mockReturnValue({
    once: vi.fn((event, callback) => {
      if (event === 'listening') callback();
    }),
    listen: vi.fn(),
    close: vi.fn(),
  }),
}));

// Mock both fs and node:fs since different modules might use different imports
vi.mock('fs', () => ({
  existsSync: vi.fn().mockReturnValue(false),
  readFileSync: vi.fn().mockReturnValue('{}'),
  writeFileSync: vi.fn(),
}));

vi.mock('node:fs', () => ({
  default: {
    existsSync: vi.fn().mockReturnValue(false),
    readFileSync: vi.fn().mockReturnValue('{}'),
    writeFileSync: vi.fn(),
  },
  existsSync: vi.fn().mockReturnValue(false),
  readFileSync: vi.fn().mockReturnValue('{}'),
  writeFileSync: vi.fn(),
}));

vi.mock('node:fs/promises', () => ({
  readFile: vi.fn().mockResolvedValue('{}'),
  writeFile: vi.fn().mockResolvedValue(undefined),
  mkdir: vi.fn().mockResolvedValue(undefined),
  rm: vi.fn().mockResolvedValue(undefined),
  mkdtemp: vi.fn().mockImplementation((prefix) => Promise.resolve(prefix + 'test')),
}));

vi.mock('dotenv', () => ({
  config: vi.fn(),
}));

vi.mock('../../src/server/loader', () => ({
  loadCharacterTryPath: vi.fn().mockResolvedValue({
    name: 'Default Character',
    description: 'Default description',
  }),
  jsonToCharacter: vi.fn().mockImplementation((json) => json),
}));

vi.mock('../../src/characters/eliza', () => ({
  getElizaCharacter: vi.fn().mockReturnValue({
    name: 'Eliza',
    description: 'Default Eliza character',
    plugins: ['@elizaos/plugin-sql'],
  }),
  character: {
    name: 'Eliza',
    description: 'Default Eliza character', 
    plugins: ['@elizaos/plugin-sql'],
  },
}));

describe('start command', () => {
  let tempDir: string;
  let cwdSpy: Mock;
  let envBackup: NodeJS.ProcessEnv;
  let consoleLogSpy: any;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'start-test-'));
    cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(tempDir);
    envBackup = { ...process.env };
    
    // Mock console.log
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    
    // Reset all mocks
    vi.clearAllMocks();
    
    // Reset mock behavior for all imported functions
    mockLoadProject.mockResolvedValue({});
    mockLoadConfig.mockResolvedValue({ isDefault: false });
    mockDisplayBanner.mockImplementation(() => {});
    mockBuildProject.mockImplementation(() => {});
    mockHandleError.mockImplementation((error) => {
      throw error instanceof Error ? error : new Error(String(error));
    });
    
    // Set up the server mock
    mockAgentServer.mockImplementation(() => mockServer);
    mockServer.start.mockImplementation(() => {});
    mockServer.initialize.mockResolvedValue(undefined);
    
    // Ensure startAgent remains a mock by using a getter
    const startAgentMock = vi.fn().mockImplementation(async (character) => {
      console.log('Mock startAgent called with:', character.name);
      return {
        agentId: 'mock-agent-id',
        character: { name: character.name || 'Mock Agent' },
      };
    });
    
    Object.defineProperty(mockServer, 'startAgent', {
      get: () => startAgentMock,
      set: () => {}, // Ignore attempts to overwrite
      configurable: true,
    });
    
    mockServer.loadCharacterTryPath = mockLoadCharacterTryPath;
    mockServer.jsonToCharacter = mockJsonToCharacter;
  });

  afterEach(async () => {
    cwdSpy.mockRestore();
    consoleLogSpy.mockRestore();
    process.env = envBackup;
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('basic server start', () => {
    it('should start server with default configuration', async () => {
      // Mock detectDirectoryType to return no project
      const { detectDirectoryType } = await import('../../src/utils/directory-detection');
      (detectDirectoryType as any).mockReturnValue({ type: 'unknown' });
      
      await start.parseAsync(['node', 'script', '--port', '3000'], { from: 'user' });

      expect(mockDisplayBanner).toHaveBeenCalled();
      expect(mockBuildProject).not.toHaveBeenCalled();
      expect(mockServer.initialize).toHaveBeenCalled();
      expect(mockServer.start).toHaveBeenCalledWith(3000);
      expect(consoleLogSpy).toHaveBeenCalledWith('pgliteDataDir', '/mock/.elizadb');
    });

    it('should handle port conflicts', async () => {
      const { isPortFree } = await import('../../src/utils/port-handling');
      
      // Mock port conflict
      (isPortFree as any).mockResolvedValueOnce(false);

      await expect(
        start.parseAsync(['node', 'script', '--port', '3000'], { from: 'user' })
      ).rejects.toThrow();
      
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Port 3000 is already in use')
      );
    });

    it('should build project before starting if --build is passed', async () => {
      await start.parseAsync(['node', 'script', '--port', '3000', '--build'], { from: 'user' });

      expect(mockBuildProject).toHaveBeenCalledWith(tempDir);
    });

    it('should not build when --build is not passed', async () => {
      await start.parseAsync(['node', 'script', '--port', '3000'], { from: 'user' });

      expect(mockBuildProject).not.toHaveBeenCalled();
    });
  });

  describe('agent loading', () => {
    it('should load single agent from project', async () => {
      mockLoadProject.mockResolvedValueOnce({
        agents: [{
          character: { name: 'Test Agent' },
          models: { openai: { model: 'gpt-4' } },
          settings: {},
        }],
      });

      await start.parseAsync(['node', 'script', '--port', '3000'], { from: 'user' });

      expect(mockServer.startAgent).toHaveBeenCalledWith(
        expect.objectContaining({
          character: { name: 'Test Agent' },
        })
      );
    });

    it('should load multiple agents from project', async () => {
      mockLoadProject.mockResolvedValueOnce({
        agents: [
          { character: { name: 'Agent 1' } },
          { character: { name: 'Agent 2' } },
          { character: { name: 'Agent 3' } },
        ],
      });

      await start.parseAsync(['node', 'script', '--port', '3000'], { from: 'user' });

      expect(mockServer.startAgent).toHaveBeenCalledTimes(3);
    });

    it('should handle plugin projects with default Eliza character', async () => {
      const utils = await import('../../src/utils/directory-detection');
      (utils.detectDirectoryType as any).mockReturnValueOnce('plugin');
      
      mockLoadProject.mockResolvedValueOnce({
        name: 'test-plugin',
        plugins: [{
          name: 'test-plugin',
          actions: [],
          providers: [],
        }],
        // Include a default agent for plugin projects
        agents: [{
          character: { name: 'Eliza' },
        }],
      });

      await start.parseAsync(['node', 'script', '--port', '3000'], { from: 'user' });

      expect(mockServer.startAgent).toHaveBeenCalledWith(
        expect.objectContaining({
          character: { name: 'Eliza' },
        })
      );
    });

    it('should load character from file when specified', async () => {
      const characterFile = join(tempDir, 'character.json');
      await writeFile(characterFile, JSON.stringify({
        name: 'File Character',
        description: 'Loaded from file',
      }));
      
      // Mock the loadCharacterTryPath to return the character
      const { loadCharacterTryPath } = await import('../../src/server/loader');
      (loadCharacterTryPath as any).mockResolvedValueOnce({
        name: 'File Character',
        description: 'Loaded from file',
      });

      await start.parseAsync(['node', 'script', '--port', '3000', '--character', characterFile], { from: 'user' });

      expect(loadCharacterTryPath).toHaveBeenCalledWith(characterFile);
    });
  });

  describe('environment and configuration', () => {
    it('should handle different database configurations', async () => {
      const envBackup = { ...process.env };
      process.env.POSTGRES_URL = 'postgres://localhost/test';
      
      const { configureDatabaseSettings } = await import('../../src/utils');
      (configureDatabaseSettings as any).mockResolvedValueOnce('postgres://localhost/test');
      
      await start.parseAsync(['node', 'script', '--port', '3000'], { from: 'user' });

      expect(mockServer.initialize).toHaveBeenCalledWith(
        expect.objectContaining({
          postgresUrl: 'postgres://localhost/test',
        })
      );
      
      process.env = envBackup;
    });

    it('should use PGLite when no Postgres URL is provided', async () => {
      delete process.env.POSTGRES_URL;
      
      await start.parseAsync(['node', 'script', '--port', '3000'], { from: 'user' });

      expect(mockServer.initialize).toHaveBeenCalledWith(
        expect.objectContaining({
          dataDir: '/mock/.elizadb',
        })
      );
    });

    it('should respect custom agent names', async () => {
      mockLoadProject.mockResolvedValueOnce({
        agents: [{
          character: { name: 'Default Name' },
        }],
      });

      await start.parseAsync(['node', 'script', '--port', '3000'], { from: 'user' });

      expect(mockServer.startAgent).toHaveBeenCalledWith(
        expect.objectContaining({
          character: expect.objectContaining({
            name: 'Default Name',
          }),
        })
      );
    });
  });

  describe('error handling', () => {
    it('should handle project loading errors', async () => {
      mockLoadProject.mockRejectedValueOnce(new Error('Failed to load project'));
      
      // The command should catch and handle the error
      try {
        await start.parseAsync(['node', 'script', '--port', '3000'], { from: 'user' });
      } catch (error) {
        // Expected - handleError will throw
        expect(error.message).toBe('Failed to load project');
      }
      
      expect(mockHandleError).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Failed to load project' })
      );
    });

    it('should handle database initialization errors', async () => {
      mockServer.initialize.mockRejectedValueOnce(new Error('Database error'));
      
      try {
        await start.parseAsync(['node', 'script', '--port', '3000'], { from: 'user' });
      } catch (error) {
        // Expected - handleError will throw
        expect(error.message).toBe('Database error');
      }
      
      expect(mockHandleError).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Database error' })
      );
    });

    it('should handle agent startup errors gracefully', async () => {
      mockLoadProject.mockResolvedValueOnce({
        agents: [
          { character: { name: 'Agent 1' } },
          { character: { name: 'Agent 2' } },
        ],
      });
      
      // First agent succeeds, second fails
      mockServer.startAgent
        .mockResolvedValueOnce({ agentId: '1', character: { name: 'Agent 1' } })
        .mockRejectedValueOnce(new Error('Agent 2 failed'));
      
      // Should not throw, but should log warning
      await start.parseAsync(['node', 'script', '--port', '3000'], { from: 'user' });
      
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Failed to start agent Agent 2')
      );
      
      // Server should still start
      expect(mockServer.start).toHaveBeenCalled();
    });

    it('should clean up on server start failure', async () => {
      mockServer.start.mockImplementation(() => {
        throw new Error('Server start failed');
      });
      
      try {
        await start.parseAsync(['node', 'script', '--port', '3000'], { from: 'user' });
      } catch (error) {
        // Expected - handleError will throw
        expect(error.message).toBe('Server start failed');
      }
      
      expect(mockHandleError).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Server start failed' })
      );
    });
  });

  describe('special modes', () => {
    it('should start in debug mode with verbose logging', async () => {
      process.env.DEBUG = 'true';
      
      await start.parseAsync(['node', 'script', '--port', '3000'], { from: 'user' });

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Attempting to start server')
      );
      
      delete process.env.DEBUG;
    });

    it('should handle graceful shutdown on SIGINT', async () => {
      // Start server
      const startPromise = start.parseAsync(['node', 'script', '--port', '3000'], { from: 'user' });
      await startPromise;
      
      // Simulate SIGINT
      process.emit('SIGINT' as any);
      
      // Allow time for cleanup
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(mockServer.stop).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Shutting down gracefully')
      );
    });
  });
});