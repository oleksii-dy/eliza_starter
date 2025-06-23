/**
 * API endpoint basic tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import http from 'node:http';
import { AgentServer } from '../index';

// Mock dependencies
vi.mock('@elizaos/core', async () => {
  const actual = await vi.importActual('@elizaos/core');
  return {
    ...actual,
    logger: {
      warn: vi.fn(),
      info: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      success: vi.fn(),
    },
    Service: class MockService {
      constructor() {}
      async initialize() {}
      async cleanup() {}
    },
    createUniqueUuid: vi.fn(() => '123e4567-e89b-12d3-a456-426614174000'),
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

vi.mock('@elizaos/plugin-sql', () => ({
  createDatabaseAdapter: vi.fn(() => ({
    // Core database methods
    init: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
    getDatabase: vi.fn(() => ({
      execute: vi.fn().mockResolvedValue([]),
    })),
    db: { execute: vi.fn().mockResolvedValue([]) },
    isReady: vi.fn().mockResolvedValue(true),
    runMigrations: vi.fn().mockResolvedValue(undefined),

    // Agent management
    getAgents: vi.fn().mockResolvedValue([]),
    getAgent: vi.fn().mockResolvedValue({
      id: '00000000-0000-0000-0000-000000000000',
      name: 'MigrationAgent',
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
    createAgent: vi.fn().mockResolvedValue(true),
    updateAgent: vi.fn().mockResolvedValue(true),
    deleteAgent: vi.fn().mockResolvedValue(true),

    // Entity management
    getEntityById: vi.fn().mockResolvedValue(null),
    getEntitiesByIds: vi.fn().mockResolvedValue([]),
    getEntitiesForRoom: vi.fn().mockResolvedValue([]),
    createEntity: vi.fn().mockResolvedValue('test-entity-id'),
    createEntities: vi.fn().mockResolvedValue(true),
    updateEntity: vi.fn().mockResolvedValue(undefined),

    // Message server management
    getMessageServers: vi
      .fn()
      .mockResolvedValue([{ id: '00000000-0000-0000-0000-000000000000', name: 'Default Server' }]),
    createMessageServer: vi.fn().mockResolvedValue({ id: '00000000-0000-0000-0000-000000000000' }),
    getAgentsForServer: vi.fn().mockResolvedValue([]),
    addAgentToServer: vi.fn().mockResolvedValue(undefined),

    // Add other methods as needed by tests
    getMemories: vi.fn().mockResolvedValue([]),
    createMemory: vi.fn().mockResolvedValue('test-memory-id'),
    searchMemories: vi.fn().mockResolvedValue([]),
  })),
  DatabaseMigrationService: vi.fn(() => ({
    initializeWithDatabase: vi.fn(() => Promise.resolve(undefined)),
    discoverAndRegisterPluginSchemas: vi.fn(),
    runAllPluginMigrations: vi.fn(() => Promise.resolve(undefined)),
  })),
  plugin: {
    name: '@elizaos/plugin-sql',
    description: 'SQL database plugin',
    actions: []
    providers: []
    evaluators: []
    services: []
  },
}));

vi.mock('node:fs', () => ({
  default: {
    mkdirSync: vi.fn(),
    existsSync: vi.fn(() => true),
    readFileSync: vi.fn(() => '{}'),
    writeFileSync: vi.fn(),
  },
  mkdirSync: vi.fn(),
  existsSync: vi.fn(() => true),
  readFileSync: vi.fn(() => '{}'),
  writeFileSync: vi.fn(),
}));

// Mock Socket.IO
vi.mock('socket.io', () => ({
  Server: vi.fn(() => ({
    on: vi.fn(),
    emit: vi.fn(),
    to: vi.fn(() => ({
      emit: vi.fn(),
    })),
    close: vi.fn((callback) => {
      if (callback) callback();
    }),
  })),
}));

// Skip socket.io initialization for API tests
vi.mock('../src/socketio/index', () => ({
  setupSocketIO: vi.fn(() => ({
    on: vi.fn(),
    emit: vi.fn(),
    to: vi.fn(() => ({
      emit: vi.fn(),
    })),
    close: vi.fn((callback) => {
      if (callback) callback();
    }),
  })),
  SocketIORouter: vi.fn(() => ({
    setupListeners: vi.fn(),
  })),
}));

describe('API Server Functionality', () => {
  let server: AgentServer;
  let app: express.Application;
  let mockServer: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Mock HTTP server with all methods Socket.IO expects
    mockServer = {
      listen: vi.fn((_port, callback) => {
        if (callback) callback();
      }),
      close: vi.fn((callback) => {
        if (callback) callback();
      }),
      listeners: vi.fn(() => []),
      removeAllListeners: vi.fn(),
      on: vi.fn(),
      once: vi.fn(),
      emit: vi.fn(),
      address: vi.fn(() => ({ port: 3000 })),
      timeout: 0,
      keepAliveTimeout: 5000,
    };

    vi.spyOn(http, 'createServer').mockReturnValue(mockServer as any);

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
    it('should create and configure express app', () => {
      expect(app).toBeDefined();
      expect(typeof app.listen).toBe('function');
      expect(typeof app.use).toBe('function');
      // _router might not exist immediately after initialization
      expect(app._router !== undefined || app.router !== undefined).toBe(true);
    });

    it('should have middleware configured', () => {
      // Test that basic middleware functions exist
      expect(typeof server.registerMiddleware).toBe('function');
    });
  });

  describe('Agent Management API Structure', () => {
    it('should have agent management capabilities', () => {
      expect(typeof server.registerAgent).toBe('function');
      expect(typeof server.unregisterAgent).toBe('function');
      expect(server['agents']).toBeDefined();
      expect(server['agents'] instanceof Map).toBe(true);
    });

    it('should initialize with empty agent registry', () => {
      expect(server['agents'].size).toBe(0);
    });
  });

  describe('Database Integration', () => {
    it('should have database configured', () => {
      expect(server.database).toBeDefined();
      expect(typeof server.database.init).toBe('function');
      expect(typeof (server.database as any).getMessageServers).toBe('function');
    });
  });

  describe('Server Lifecycle', () => {
    it('should be initialized after setup', () => {
      expect(server.isInitialized).toBe(true);
    });

    it('should have proper server structure', () => {
      expect(server.app).toBeDefined();
      expect(server.database).toBeDefined();
    });
  });
});
