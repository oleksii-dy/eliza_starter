/**
 * API endpoint basic tests
 */

import { describe, it, expect, mock, beforeEach, afterEach, spyOn } from 'bun:test';
import express from 'express';
import http from 'node:http';
import { AgentServer } from '../index';

// Mock dependencies
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
    getEntityById: mock().mockResolvedValue(null),
    getEntitiesByIds: mock().mockResolvedValue([]),
    getEntitiesForRoom: mock().mockResolvedValue([]),
    createEntity: mock().mockResolvedValue('test-entity-id'),
    createEntities: mock().mockResolvedValue(true),
    updateEntity: mock().mockResolvedValue(undefined),

    // Message server management
    getMessageServers: mock().mockResolvedValue([
      { id: '00000000-0000-0000-0000-000000000000', name: 'Default Server' },
    ]),
    createMessageServer: mock().mockResolvedValue({ id: '00000000-0000-0000-0000-000000000000' }),
    getAgentsForServer: mock().mockResolvedValue([]),
    addAgentToServer: mock().mockResolvedValue(undefined),

    // Add other methods as needed by tests
    getMemories: mock().mockResolvedValue([]),
    createMemory: mock().mockResolvedValue('test-memory-id'),
    searchMemories: mock().mockResolvedValue([]),
  })),
  DatabaseMigrationService: mock(() => ({
    initializeWithDatabase: mock(() => Promise.resolve(undefined)),
    discoverAndRegisterPluginSchemas: mock(),
    runAllPluginMigrations: mock(() => Promise.resolve(undefined)),
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

// Mock Socket.IO
mock.module('socket.io', () => ({
  Server: mock(() => ({
    on: mock(),
    emit: mock(),
    to: mock(() => ({
      emit: mock(),
    })),
    close: mock((callback) => {
      if (callback) {
        callback();
      }
    }),
  })),
}));

// Skip socket.io initialization for API tests
mock.module('../src/socketio/index', () => ({
  setupSocketIO: mock(() => ({
    on: mock(),
    emit: mock(),
    to: mock(() => ({
      emit: mock(),
    })),
    close: mock((callback) => {
      if (callback) {
        callback();
      }
    }),
  })),
  SocketIORouter: mock(() => ({
    setupListeners: mock(),
  })),
}));

describe('API Server Functionality', () => {
  let server: AgentServer;
  let app: express.Application;
  let mockServer: any;

  beforeEach(async () => {
    mock.restore();

    // Mock HTTP server with all methods Socket.IO expects
    mockServer = {
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
      listeners: mock(() => []),
      removeAllListeners: mock(),
      on: mock(),
      once: mock(),
      emit: mock(),
      address: mock(() => ({ port: 3000 })),
      timeout: 0,
      keepAliveTimeout: 5000,
    };

    spyOn(http, 'createServer').mockReturnValue(mockServer as any);

    server = new AgentServer();
    await server.initialize();
    app = server.app;
  });

  afterEach(async () => {
    if (server) {
      await server.stop();
    }
  });

  describe('Express App Configuration', () => {
    it('should create and configure express app with middleware', () => {
      expect(app).toBeTruthy();
      expect(typeof app.listen).toBe('function');
      expect(typeof app.use).toBe('function');

      // Test that middleware registration works
      const testMiddleware = mock((_req, _res, next) => next());
      server.registerMiddleware(testMiddleware);

      // The middleware should be registered
      expect(typeof server.registerMiddleware).toBe('function');
    });
  });

  describe('Agent Management API', () => {
    it('should manage agent registry correctly', async () => {
      expect(server['agents'] instanceof Map).toBe(true);
      expect(server['agents'].size).toBe(0);

      // Test agent registration
      const mockRuntime = {
        agentId: '123e4567-e89b-12d3-a456-426614174000' as any,
        character: { name: 'TestAgent' },
        registerPlugin: mock().mockResolvedValue(undefined),
        plugins: [],
      } as any;

      // Mock database methods
      server.database = {
        ...server.database,
        getMessageServers: mock().mockResolvedValue([]),
        addAgentToServer: mock().mockResolvedValue(undefined),
        db: { execute: mock().mockResolvedValue([]) },
      } as any;

      await server.registerAgent(mockRuntime);
      expect(server['agents'].size).toBe(1);
      expect(server['agents'].has(mockRuntime.agentId)).toBe(true);

      // Test agent unregistration
      server.unregisterAgent(mockRuntime.agentId);
      expect(server['agents'].size).toBe(0);
    });
  });

  describe('Database Integration', () => {
    it('should initialize database with proper methods', async () => {
      expect(server.database).toBeTruthy();
      expect(typeof server.database.init).toBe('function');
      expect(typeof (server.database as any).getMessageServers).toBe('function');

      // Test that database can perform operations
      const servers = await (server.database as any).getMessageServers();
      expect(Array.isArray(servers)).toBe(true);
    });
  });

  describe('Server Lifecycle', () => {
    it('should handle initialization and shutdown correctly', async () => {
      expect(server.isInitialized).toBe(true);
      expect(server.app).toBeTruthy();
      expect(server.database).toBeTruthy();

      // Test server start
      await server.start(3001);
      expect(mockServer.listen).toHaveBeenCalledWith(3001, expect.any(Function));

      // Test server stop
      await server.stop();
      expect(mockServer.close).toHaveBeenCalled();
    });
  });
});
