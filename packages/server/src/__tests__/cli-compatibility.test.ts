/**
 * CLI Compatibility Tests
 *
 * Tests to ensure the server package maintains backward compatibility
 * with the CLI package usage patterns.
 */

import { describe, it, expect, mock } from 'bun:test';

// Mock core dependencies
mock.module('@elizaos/core', async () => {
  const actual = await import('@elizaos/core');
  return {
    ...actual,
    logger: {
      warn: mock(),
      info: mock(),
      error: mock(),
      debug: mock(),
      success: mock(),
    },
    validateUuid: (id: string) => {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      return uuidRegex.test(id) ? id : null;
    },
    Service: class MockService {
      constructor() {}
      async initialize() {}
      async cleanup() {}
    },
    createUniqueUuid: mock(() => '123e4567-e89b-12d3-a456-426614174000'),
    ChannelType: {
      DIRECT: 'direct',
      GROUP: 'group',
    },
    EventType: {
      MESSAGE: 'message',
      USER_JOIN: 'user_join',
    },
    SOCKET_MESSAGE_TYPE: {
      MESSAGE: 'message',
      AGENT_UPDATE: 'agent_update',
      CONNECTION: 'connection',
    },
    AgentRuntime: class MockAgentRuntime {
      constructor(config: any) {
        this.agentId = config.agentId;
        this.character = config.character;
        this.adapter = config.adapter;
        this.plugins = config.plugins || [];
      }
      async initialize() {
        // Mock successful initialization
        return Promise.resolve();
      }
      agentId: string;
      character: any;
      adapter: any;
      plugins: any[];
    },
  };
});

// Mock plugin-sql
mock.module('@elizaos/plugin-sql', () => ({
  createDatabaseAdapter: mock(() => ({
    // Core database methods
    init: mock().mockResolvedValue(undefined),
    close: mock().mockResolvedValue(undefined),
    getDatabase: mock(() => ({
      execute: mock().mockResolvedValue([]),
    })),
    db: { execute: mock().mockResolvedValue([]) },
    isReady: mock().mockResolvedValue(true),
    runMigrations: mock().mockResolvedValue(undefined),

    // Agent management
    getAgents: mock().mockResolvedValue([]),
    getAgent: mock().mockResolvedValue({
      id: '00000000-0000-0000-0000-000000000000',
      name: 'MigrationAgent',
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
    createAgent: mock().mockResolvedValue(true),
    updateAgent: mock().mockResolvedValue(true),
    deleteAgent: mock().mockResolvedValue(true),

    // Entity management
    getEntityById: mock((id) => {
      // Return a mock entity for the migration agent
      if (id === '00000000-0000-0000-0000-000000000000') {
        return Promise.resolve({
          id: '00000000-0000-0000-0000-000000000000',
          names: ['MigrationAgent'],
          metadata: {},
          agentId: '00000000-0000-0000-0000-000000000000',
        });
      }
      return Promise.resolve(null);
    }),
    getEntitiesByIds: mock().mockResolvedValue([]),
    getEntitiesForRoom: mock().mockResolvedValue([]),
    createEntity: mock().mockResolvedValue('test-entity-id'),
    createEntities: mock().mockResolvedValue(true),
    updateEntity: mock().mockResolvedValue(undefined),

    // Message server management
    getMessageServers: mock(() =>
      Promise.resolve([{ id: '00000000-0000-0000-0000-000000000000', name: 'Default Server' }])
    ),
    createMessageServer: mock().mockResolvedValue({
      id: '00000000-0000-0000-0000-000000000000',
      name: 'Default Server',
    }),
    addAgentToServer: mock().mockResolvedValue(undefined),
    getChannelsForServer: mock().mockResolvedValue([]),
    createChannel: mock().mockResolvedValue({ id: '123e4567-e89b-12d3-a456-426614174000' }),
    getAgentsForServer: mock().mockResolvedValue([]),

    // Add other methods as needed by tests
    getMemories: mock().mockResolvedValue([]),
    createMemory: mock().mockResolvedValue('test-memory-id'),
    searchMemories: mock().mockResolvedValue([]),
  })),
  DatabaseMigrationService: mock(() => ({
    initializeWithDatabase: mock().mockResolvedValue(undefined),
    discoverAndRegisterPluginSchemas: mock(),
    runAllPluginMigrations: mock().mockResolvedValue(undefined),
  })),
  plugin: {
    name: '@elizaos/plugin-sql',
    description: 'SQL database plugin',
    actions: [],
    providers: [],
    evaluators: [],
    services: [],
  },
}));

// Mock filesystem
mock.module('node:fs', () => ({
  default: {
    mkdirSync: mock(),
    existsSync: mock(() => true),
    readFileSync: mock(() => '{}'),
    writeFileSync: mock(),
  },
  mkdirSync: mock(),
  existsSync: mock(() => true),
  readFileSync: mock(() => '{}'),
  writeFileSync: mock(),
}));

describe('CLI Compatibility Tests', () => {
  describe('AgentServer API Compatibility', () => {
    it('should allow CLI to extend server with custom methods', async () => {
      const { AgentServer } = await import('../');

      const server = new AgentServer();

      // Simulate CLI's pattern of extending the server
      const mockStartAgent = mock();
      const mockStopAgent = mock();
      const mockLoadCharacterTryPath = mock();
      const mockJsonToCharacter = mock();

      (server as any).startAgent = mockStartAgent;
      (server as any).stopAgent = mockStopAgent;
      (server as any).loadCharacterTryPath = mockLoadCharacterTryPath;
      (server as any).jsonToCharacter = mockJsonToCharacter;

      // Verify the extensions work
      expect((server as any).startAgent).toBe(mockStartAgent);
      expect((server as any).stopAgent).toBe(mockStopAgent);
      expect((server as any).loadCharacterTryPath).toBe(mockLoadCharacterTryPath);
      expect((server as any).jsonToCharacter).toBe(mockJsonToCharacter);
    });

    it('should maintain required method signatures for CLI usage', async () => {
      const { AgentServer } = await import('../');

      const server = new AgentServer();

      // Test that required methods exist and have correct signatures
      expect(typeof server.initialize).toBe('function');
      expect(typeof server.start).toBe('function');
      expect(typeof server.stop).toBe('function');
      expect(typeof server.registerAgent).toBe('function');
      expect(typeof server.unregisterAgent).toBe('function');
      expect(typeof server.registerMiddleware).toBe('function');

      // Test that properties exist
      expect(Object.prototype.hasOwnProperty.call(server, 'isInitialized')).toBe(true);
    });
  });

  describe('CLI Usage Patterns', () => {
    it('should support CLI initialization pattern', async () => {
      const { AgentServer } = await import('../');

      // Simulate CLI's server creation pattern
      const server = new AgentServer();

      const initOptions = {
        dataDir: './test-data',
        postgresUrl: undefined,
      };

      await server.initialize(initOptions);

      expect(server.isInitialized).toBe(true);
      expect(server.app).toBeTruthy();
      expect(server.database).toBeTruthy();
    });

    it('should support CLI server startup pattern', async () => {
      const { AgentServer } = await import('../');

      const server = new AgentServer();
      await server.initialize();

      // Mock HTTP server for testing
      const mockServer = {
        listen: mock((_port, callback) => {
          if (callback) {
            callback();
          }
        }),
        close: mock((callback) => {
          if (callback) {
            callback();
          }
        }),
      };

      server.server = mockServer as any;

      // Test CLI's server start pattern
      expect(() => server.start(3000)).not.toThrow();
      expect(mockServer.listen).toHaveBeenCalledWith(3000, expect.any(Function));
    });

    it('should support CLI agent registration pattern', async () => {
      const { AgentServer } = await import('../');

      const server = new AgentServer();
      await server.initialize();

      const mockRuntime = {
        agentId: '123e4567-e89b-12d3-a456-426614174000' as any,
        character: { name: 'TestAgent' },
        registerPlugin: mock().mockResolvedValue(undefined),
        plugins: [],
        registerProvider: mock(),
        registerAction: mock(),
      } as any;

      // Mock database methods that registration uses
      server.database = {
        ...server.database,
        getMessageServers: mock().mockResolvedValue([]),
        addAgentToServer: mock().mockResolvedValue(undefined),
        db: { execute: mock().mockResolvedValue([]) },
      } as any;

      // Test CLI's agent registration pattern
      await server.registerAgent(mockRuntime);

      expect(server['agents'].has(mockRuntime.agentId)).toBe(true);
    });

    it('should support middleware registration with CLI patterns', async () => {
      const { AgentServer } = await import('../');

      // Test that middleware function signature is compatible
      const testMiddleware = (_req: any, _res: any, next: any) => {
        next();
      };

      const server = new AgentServer();
      await server.initialize();

      // This should work with CLI's usage pattern
      expect(() => server.registerMiddleware(testMiddleware)).not.toThrow();
    });
  });

  describe('Error Handling Compatibility', () => {
    it('should handle invalid agent registration gracefully', async () => {
      const { AgentServer } = await import('../');

      const server = new AgentServer();
      await server.initialize();

      // Test CLI error handling patterns
      await expect(server.registerAgent(null as any)).rejects.toThrow(
        'Attempted to register null/undefined runtime'
      );
      await expect(server.registerAgent({} as any)).rejects.toThrow('Runtime missing agentId');
    });

    it('should handle invalid server startup gracefully', async () => {
      const { AgentServer } = await import('../');

      const server = new AgentServer();
      await server.initialize();

      // Test CLI error handling for invalid ports
      expect(() => server.start(null as any)).toThrow('Invalid port number');
      expect(() => server.start('invalid' as any)).toThrow('Invalid port number');
    });
  });

  describe('Path Utility Functions', () => {
    it('should handle path expansion correctly', async () => {
      const { expandTildePath } = await import('../');

      // Test actual functionality
      expect(expandTildePath('~/test')).toMatch(/test$/);
      expect(expandTildePath('/absolute/path')).toBe('/absolute/path');
      expect(expandTildePath('relative/path')).toBe('relative/path');
      expect(expandTildePath('')).toBe('');
    });

    it('should resolve PGLite directory correctly', async () => {
      const { resolvePgliteDir } = await import('../');

      // Test with custom directory
      expect(resolvePgliteDir('/custom/dir')).toBe('/custom/dir');

      // Test with environment variable
      process.env.PGLITE_DATA_DIR = '/env/dir';
      expect(resolvePgliteDir()).toBe('/env/dir');
      delete process.env.PGLITE_DATA_DIR;

      // Test with fallback
      expect(resolvePgliteDir(undefined, '/fallback/dir')).toBe('/fallback/dir');
    });
  });

  describe('Character Loading Functions', () => {
    it('should transform character data with environment secrets', async () => {
      const { jsonToCharacter } = await import('../');

      const character = {
        name: 'Test Character',
        id: 'test-char',
      };

      process.env['CHARACTER.TEST-CHAR.API_KEY'] = 'secret-key';
      process.env['CHARACTER.TEST-CHAR.ENDPOINT'] = 'https://api.example.com';

      const result = await jsonToCharacter(character);

      expect(result.secrets).toEqual({
        API_KEY: 'secret-key',
        ENDPOINT: 'https://api.example.com',
      });

      // Cleanup
      delete process.env['CHARACTER.TEST-CHAR.API_KEY'];
      delete process.env['CHARACTER.TEST-CHAR.ENDPOINT'];
    });
  });
});
