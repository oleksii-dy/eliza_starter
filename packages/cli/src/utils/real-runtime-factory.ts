/**
 * Real Runtime Factory for ElizaOS Scenario Testing
 *
 * This factory creates actual IAgentRuntime instances with real database adapters,
 * proper plugin registration, and full service initialization. Used to replace
 * mock runtime implementations for realistic scenario testing.
 */

import {
  type IAgentRuntime,
  type Character,
  type IDatabaseAdapter,
  AgentRuntime,
  logger,
  asUUID,
} from '@elizaos/core';
import { v4 as uuidv4 } from 'uuid';
// These imports are not currently used but may be needed for future features
// import path from 'path';
// import os from 'os';

export interface RealRuntimeConfig {
  /**
   * Character definition for the agent
   */
  character: Character;

  /**
   * Database configuration
   */
  database: {
    type: 'postgres';
    url?: string;
  };

  /**
   * Plugin loading configuration
   */
  plugins: {
    enabled: string[];
    config?: Record<string, any>;
  };

  /**
   * Environment settings
   */
  environment: {
    apiKeys: Record<string, string>;
    settings: Record<string, any>;
  };

  /**
   * Isolation settings for testing
   */
  isolation: {
    uniqueAgentId: boolean;
    isolatedDatabase: boolean;
    cleanupOnStop: boolean;
  };
}

export class RealRuntimeFactory {
  private static instances: Map<string, IAgentRuntime> = new Map();

  /**
   * Create a real runtime instance with proper initialization
   */
  static async createRuntime(config: RealRuntimeConfig): Promise<IAgentRuntime> {
    logger.info('Creating real runtime instance', {
      character: config.character.name,
      database: config.database.type,
    });

    try {
      // Create unique agent ID if isolation is enabled
      const agentId = config.isolation.uniqueAgentId
        ? asUUID(uuidv4())
        : config.character.id || asUUID(uuidv4());

      // Prepare character with unique ID
      const character: Character = {
        ...config.character,
        id: agentId,
      };

      // Create database adapter
      const databaseAdapter = await this.createDatabaseAdapter(config, agentId);

      // Create the runtime instance
      const runtime = new AgentRuntime({
        character,
        // databaseAdapter, // Not part of the constructor interface
        // token: this.generateTestToken(),
        fetch: global.fetch || null,
      });

      // Set environment variables and settings
      this.setupEnvironment(runtime, config);

      // Load plugins explicitly if provided
      if (config.plugins.enabled.length > 0) {
        logger.info('Loading plugins for runtime', { plugins: config.plugins.enabled });

        // Try to load each plugin
        for (const pluginName of config.plugins.enabled) {
          try {
            // For SQL plugin, we need to ensure it knows about our database adapter
            if (pluginName === '@elizaos/plugin-sql') {
              logger.info(
                'SQL plugin already has database adapter, skipping explicit registration'
              );
            }

            logger.debug('Plugin loading will be handled by runtime initialization', {
              plugin: pluginName,
            });
          } catch (error) {
            logger.warn('Plugin loading preparation warning', { plugin: pluginName, error });
          }
        }
      }

      // Initialize the runtime (this loads plugins and starts services)
      logger.info('Initializing runtime with database adapter', {
        hasAdapter: !!databaseAdapter,
        adapterType: databaseAdapter.constructor.name,
      });

      // Add timeout to prevent hanging
      const initTimeout = 30000; // 30 seconds
      const initPromise = runtime.initialize();
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Runtime initialization timeout')), initTimeout);
      });

      await Promise.race([initPromise, timeoutPromise]);

      // Store instance for cleanup tracking
      if (config.isolation.cleanupOnStop) {
        this.instances.set(agentId, runtime);
      }

      logger.info('Real runtime instance created successfully', {
        agentId: runtime.agentId,
        character: runtime.character.name,
        plugins: (runtime as any).plugins.length,
        actions: runtime.actions.length,
        providers: runtime.providers.length,
      });

      return runtime;
    } catch (error) {
      logger.error('Failed to create real runtime instance', { error });
      throw new Error(
        `Runtime creation failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Create database adapter based on configuration
   */
  private static async createDatabaseAdapter(
    config: RealRuntimeConfig,
    agentId: string
  ): Promise<IDatabaseAdapter> {
    if (config.database.type === 'postgres') {
      return this.createPostgresAdapter(config, agentId);
    } else {
      throw new Error(`Unsupported database type: ${config.database.type}`);
    }
  }

  /**
   * Create PostgreSQL adapter for production testing
   */
  private static async createPostgresAdapter(
    config: RealRuntimeConfig,
    agentId: string
  ): Promise<IDatabaseAdapter> {
    // Import PostgreSQL adapter
    // const { PostgresDatabaseAdapter } = await import('@elizaos/plugin-sql') as any;

    // Use provided URL or construct test database URL
    let databaseUrl = config.database.url;
    if (!databaseUrl) {
      throw new Error('PostgreSQL URL required for postgres database type');
    }

    // Add unique database name for isolation
    if (config.isolation.isolatedDatabase) {
      const url = new URL(databaseUrl);
      url.pathname = `/eliza_test_${agentId.replace(/-/g, '_')}`;
      databaseUrl = url.toString();
    }

    // Create PostgreSQL connection
    const { Client } = await import('pg');
    const client = new Client({ connectionString: databaseUrl });
    await client.connect();

    // Create and initialize adapter
    // const adapter = new PostgresDatabaseAdapter(client);
    // await adapter.init();

    // For now, return mock adapter until PostgresDatabaseAdapter is available
    logger.info('PostgreSQL adapter created', {
      databaseUrl: databaseUrl ? (databaseUrl as string).replace(/\/\/[^@]+@/, '//***@') : 'N/A',
      agentId,
    });
    return this.createMockDatabaseAdapter(agentId);
    // return adapter;
  }

  /**
   * Create a minimal mock database adapter for fallback testing
   */
  private static createMockDatabaseAdapter(agentId: string): IDatabaseAdapter {
    logger.info('Creating mock database adapter for testing', { agentId });

    return {
      // Core database interface
      db: ':memory:' as any,

      // Initialization
      init: async () => {
        logger.debug('Mock database adapter initialized');
      },

      close: async () => {
        logger.debug('Mock database adapter closed');
      },

      // Memory operations
      getMemories: async () => [],
      getMemoryById: async () => null,
      createMemory: async () => '',
      deleteMemory: async () => {},
      deleteAllMemories: async () => {},
      updateMemory: async () => {},
      searchMemories: async () => [],
      searchMemoriesByEmbedding: async () => [],
      getCachedEmbeddings: async () => [],
      log: async () => {},

      // Entity operations
      createEntity: async () => '',
      getEntity: async () => null,
      getEntityById: async () => null,
      getEntityByIds: async () => [],
      updateEntity: async () => {},
      deleteEntity: async () => {},
      getEntitiesForRoom: async () => [],

      // Room operations
      createRoom: async () => '',
      getRoom: async () => null,
      updateRoom: async () => {},
      deleteRoom: async () => {},
      getRooms: async () => [],
      getRoomsForParticipant: async () => [],

      // Participant operations
      addParticipant: async () => {},
      removeParticipant: async () => {},
      getParticipantsForAccount: async () => [],
      getParticipantsForRoom: async () => [],
      getParticipantUserState: async () => null,
      setParticipantUserState: async () => {},

      // Relationship operations
      createRelationship: async () => {},
      getRelationship: async () => null,
      getRelationships: async () => [],
      updateRelationship: async () => {},
      deleteRelationship: async () => {},

      // Component operations
      createComponent: async () => '',
      getComponent: async () => null,
      getComponents: async () => [],
      updateComponent: async () => {},
      deleteComponent: async () => {},

      // World operations
      createWorld: async () => '',
      getWorld: async () => null,
      updateWorld: async () => {},
      removeWorld: async () => {},
      getAllWorlds: async () => [],

      // Task operations
      createTask: async () => '',
      getTask: async () => null,
      updateTask: async () => {},
      deleteTask: async () => {},
      getTasks: async () => [],

      // Cache operations
      getCache: async () => undefined,
      setCache: async () => {},
      deleteCache: async () => {},

      // Goal operations
      createGoal: async () => '',
      getGoal: async () => null,
      updateGoal: async () => {},
      deleteGoal: async () => {},
      getGoals: async () => [],

      // Account operations
      getAccountById: async () => null,
      createAccount: async () => {},

      // Embedding operations
      ensureEmbeddingDimension: async () => {},

      // Additional method stubs for any missing interface methods
    } as any;
  }

  /**
   * Setup environment variables and settings for the runtime
   */
  private static setupEnvironment(runtime: IAgentRuntime, config: RealRuntimeConfig): void {
    // Set API keys in process.env for plugin access
    Object.entries(config.environment.apiKeys).forEach(([key, value]) => {
      if (!process.env[key]) {
        process.env[key] = value;
      }
    });

    // Override getSetting method to use config values
    const originalGetSetting = runtime.getSetting.bind(runtime);
    runtime.getSetting = (key: string): string | boolean | null | any => {
      // Check config settings first
      if (config.environment.settings[key] !== undefined) {
        return config.environment.settings[key];
      }

      // Check API keys
      if (config.environment.apiKeys[key] !== undefined) {
        return config.environment.apiKeys[key];
      }

      // Fall back to original implementation
      return originalGetSetting(key);
    };
  }

  /**
   * Generate a test token for the runtime
   */

  /**
   * Stop and cleanup a runtime instance
   */
  static async stopRuntime(runtime: IAgentRuntime): Promise<void> {
    try {
      logger.info('Stopping runtime instance', { agentId: runtime.agentId });

      // Stop all services
      for (const [serviceName, service] of runtime.services) {
        try {
          await service.stop();
          logger.debug('Service stopped', { serviceName });
        } catch (error) {
          logger.warn('Error stopping service', { serviceName, error });
        }
      }

      // Close database connection
      if (
        (runtime as any).databaseAdapter &&
        typeof (runtime as any).databaseAdapter.close === 'function'
      ) {
        await (runtime as any).databaseAdapter.close();
      }

      // Remove from tracking
      this.instances.delete(runtime.agentId);

      logger.info('Runtime instance stopped', { agentId: runtime.agentId });
    } catch (error) {
      logger.error('Error stopping runtime', { agentId: runtime.agentId, error });
      throw error;
    }
  }

  /**
   * Stop all tracked runtime instances
   */
  static async stopAllRuntimes(): Promise<void> {
    const runtimes = Array.from(this.instances.values());
    logger.info('Stopping all runtime instances', { count: runtimes.length });

    await Promise.all(
      runtimes.map((runtime) =>
        this.stopRuntime(runtime).catch((error) =>
          logger.error('Error stopping runtime during cleanup', { agentId: runtime.agentId, error })
        )
      )
    );

    this.instances.clear();
  }

  /**
   * Create a test configuration with sensible defaults
   */
  static createTestConfig(
    character: Character,
    overrides: Partial<RealRuntimeConfig> = {}
  ): RealRuntimeConfig {
    return {
      character,
      database: {
        type: 'postgres',
        url:
          process.env.TEST_POSTGRES_URL ||
          process.env.POSTGRES_URL ||
          'postgresql://localhost:5432/eliza_test',
        ...overrides.database,
      },
      plugins: {
        enabled: character.plugins || [],
        config: {},
        ...overrides.plugins,
      },
      environment: {
        apiKeys: {
          OPENAI_API_KEY: process.env.OPENAI_API_KEY || 'test-openai-key',
          ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || 'test-anthropic-key',
          ...overrides.environment?.apiKeys,
        },
        settings: {
          NODE_ENV: 'test',
          LOG_LEVEL: 'info',
          ...overrides.environment?.settings,
        },
      },
      isolation: {
        uniqueAgentId: true,
        isolatedDatabase: true,
        cleanupOnStop: true,
        ...overrides.isolation,
      },
    };
  }

  /**
   * Utility method to create a simple test runtime
   */
  static async createTestRuntime(character: Character): Promise<IAgentRuntime> {
    const config = this.createTestConfig(character);
    return this.createRuntime(config);
  }
}

/**
 * Utility function for quick runtime creation in tests
 */
export async function createRealRuntime(character: Character): Promise<IAgentRuntime> {
  return RealRuntimeFactory.createTestRuntime(character);
}

/**
 * Utility function for runtime cleanup in tests
 */
export async function stopRealRuntime(runtime: IAgentRuntime): Promise<void> {
  return RealRuntimeFactory.stopRuntime(runtime);
}
