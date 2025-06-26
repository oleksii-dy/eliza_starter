import {
  type Character,
  DatabaseAdapter,
  type IAgentRuntime,
  logger,
  type UUID,
} from '@elizaos/core';
import express from 'express';
import http from 'node:http';
import path from 'node:path';
import { Server as SocketIOServer } from 'socket.io';
import { loadCharacterTryPath, jsonToCharacter } from '../utils/character-loader.js';
import {
  createDatabaseAdapter,
  DatabaseMigrationService,
  plugin as sqlPlugin,
} from '@elizaos/plugin-sql';
import { existsSync } from 'node:fs';
import { resolveEnvFile } from '../api/system/environment.js';
import dotenv from 'dotenv';

// Import our services
import { DatabaseService } from '../services/database.js';
import { AgentService } from '../services/agent.js';
import { MiddlewareService } from '../services/middleware.js';
import { HttpService } from '../services/http.js';
import type { ServerOptions, ServerMiddleware } from '../types/server.js';

/**
 * Server - Main server class using composition pattern
 * Clean architecture with services handling specific responsibilities
 */
export class Server {
  public app!: express.Application;
  public server!: http.Server;
  public socketIO!: SocketIOServer;
  public isInitialized: boolean = false;

  // Core services using composition
  private databaseService!: DatabaseService;
  private agentService!: AgentService;
  private middlewareService!: MiddlewareService;
  private httpService!: HttpService;

  // Database adapter (still needed for initialization)
  public database!: DatabaseAdapter;

  // Character loading functions (for compatibility)
  public startAgent!: (character: Character) => Promise<IAgentRuntime>;
  public stopAgent!: (runtime: IAgentRuntime) => void;
  public loadCharacterTryPath!: (characterPath: string) => Promise<Character>;
  public jsonToCharacter!: (character: unknown) => Promise<Character>;

  constructor() {
    try {
      logger.debug('Initializing Server (constructor)...');
      
      // Initialize character loading functions
      this.loadCharacterTryPath = loadCharacterTryPath;
      this.jsonToCharacter = jsonToCharacter;
    } catch (error) {
      logger.error('Failed to initialize Server (constructor):', error);
      throw error;
    }
  }

  /**
   * Initialize the server with dependency injection pattern
   */
  public async initialize(options?: ServerOptions): Promise<void> {
    if (this.isInitialized) {
      logger.warn('Server is already initialized, skipping initialization');
      return;
    }

    try {
      logger.debug('Initializing Server (async operations)...');

      // 1. Initialize database
      await this.initializeDatabase(options);

      // 2. Initialize services with dependency injection
      this.initializeServices();

      // 3. Initialize Express app and middleware
      await this.initializeExpressApp(options);

      // 4. Initialize agent methods after services are ready
      this.initializeAgentMethods();

      this.isInitialized = true;
      logger.success('Server initialization completed');
    } catch (error) {
      logger.error('Failed to initialize Server (async operations):', error);
      console.trace(error);
      throw error;
    }
  }

  /**
   * Register an agent (delegates to AgentService)
   */
  public async registerAgent(runtime: IAgentRuntime): Promise<void> {
    return this.agentService.registerAgent(runtime);
  }

  /**
   * Unregister an agent (delegates to AgentService)
   */
  public unregisterAgent(agentId: UUID): void {
    return this.agentService.unregisterAgent(agentId);
  }

  /**
   * Add middleware (delegates to MiddlewareService)
   */
  public registerMiddleware(middleware: ServerMiddleware): void {
    this.middlewareService.addMiddleware(this.app, middleware);
  }

  /**
   * Start the server (delegates to HttpService)
   */
  public start(port: number): void {
    this.httpService.start(port);
  }

  /**
   * Stop the server (delegates to HttpService)
   */
  public async stop(): Promise<void> {
    // Stop all agents first
    await this.agentService.stopAllAgents();
    
    // Close database
    await this.databaseService.close();
    
    // Stop server
    return this.httpService.stop();
  }

  // ===============================
  // Database Operations (Delegate to DatabaseService)
  // ===============================

  async createServer(data: any): Promise<any> {
    return this.databaseService.createServer(data);
  }

  async getServers(): Promise<any[]> {
    return this.databaseService.getServers();
  }

  async getServerById(serverId: UUID): Promise<any> {
    return this.databaseService.getServerById(serverId);
  }

  async getServerBySourceType(sourceType: string): Promise<any> {
    return this.databaseService.getServerBySourceType(sourceType);
  }

  async createChannel(data: any, participantIds?: UUID[]): Promise<any> {
    return this.databaseService.createChannel(data, participantIds);
  }

  async addParticipantsToChannel(channelId: UUID, userIds: UUID[]): Promise<void> {
    return this.databaseService.addParticipantsToChannel(channelId, userIds);
  }

  async getChannelsForServer(serverId: UUID): Promise<any[]> {
    return this.databaseService.getChannelsForServer(serverId);
  }

  async getChannelDetails(channelId: UUID): Promise<any> {
    return this.databaseService.getChannelDetails(channelId);
  }

  async getChannelParticipants(channelId: UUID): Promise<UUID[]> {
    return this.databaseService.getChannelParticipants(channelId);
  }

  async deleteMessage(messageId: UUID): Promise<void> {
    return this.databaseService.deleteMessage(messageId);
  }

  async updateChannel(channelId: UUID, updates: any): Promise<any> {
    return this.databaseService.updateChannel(channelId, updates);
  }

  async deleteChannel(channelId: UUID): Promise<void> {
    return this.databaseService.deleteChannel(channelId);
  }

  async clearChannelMessages(channelId: UUID): Promise<void> {
    return this.databaseService.clearChannelMessages(channelId);
  }

  async findOrCreateCentralDmChannel(user1Id: UUID, user2Id: UUID, messageServerId: UUID): Promise<any> {
    return this.databaseService.findOrCreateCentralDmChannel(user1Id, user2Id, messageServerId);
  }

  async createMessage(data: any): Promise<any> {
    return this.databaseService.createMessage(data);
  }

  async getMessagesForChannel(channelId: UUID, limit?: number, beforeTimestamp?: Date): Promise<any[]> {
    return this.databaseService.getMessagesForChannel(channelId, limit, beforeTimestamp);
  }

  async addAgentToServer(serverId: UUID, agentId: UUID): Promise<void> {
    return this.databaseService.addAgentToServer(serverId, agentId);
  }

  async removeAgentFromServer(serverId: UUID, agentId: UUID): Promise<void> {
    return this.databaseService.removeAgentFromServer(serverId, agentId);
  }

  async getAgentsForServer(serverId: UUID): Promise<UUID[]> {
    return this.databaseService.getAgentsForServer(serverId);
  }

  async getServersForAgent(agentId: UUID): Promise<UUID[]> {
    return this.databaseService.getServersForAgent(agentId);
  }

  async removeParticipantFromChannel(): Promise<void> {
    return this.databaseService.removeParticipantFromChannel();
  }

  // ===============================
  // Private Initialization Methods
  // ===============================

  private async initializeDatabase(options?: ServerOptions): Promise<void> {
    const agentDataDir = await resolvePgliteDir(options?.dataDir);
    logger.info(`[INIT] Database Dir for SQL plugin: ${agentDataDir}`);
    
    // Ensure data directory exists for PGLite
    if (!options?.postgresUrl && agentDataDir) {
      const fs = await import('node:fs');
      const path = await import('node:path');
      
      try {
        fs.mkdirSync(path.dirname(agentDataDir), { recursive: true });
        fs.mkdirSync(agentDataDir, { recursive: true });
        logger.debug(`[INIT] Created data directory: ${agentDataDir}`);
      } catch (error: any) {
        if (error.code !== 'EEXIST') {
          logger.error(`[INIT] Failed to create data directory: ${error.message}`);
          throw error;
        }
      }
    }
    
    this.database = createDatabaseAdapter(
      {
        dataDir: agentDataDir,
        postgresUrl: options?.postgresUrl,
      },
      '00000000-0000-0000-0000-000000000002'
    ) as DatabaseAdapter;
    
    await this.database.init();
    logger.success('Consolidated database initialized successfully');

    // Run migrations
    await this.runDatabaseMigrations();

    // Ensure default server exists
    await this.ensureDefaultServer();
  }

  private async runDatabaseMigrations(): Promise<void> {
    logger.info('[INIT] Running database migrations for messaging tables...');
    try {
      const migrationService = new DatabaseMigrationService();
      const db = (this.database as any).getDatabase();
      await migrationService.initializeWithDatabase(db);
      migrationService.discoverAndRegisterPluginSchemas([sqlPlugin]);
      await migrationService.runAllPluginMigrations();
      logger.success('[INIT] Database migrations completed successfully');
    } catch (migrationError) {
      logger.error('[INIT] Failed to run database migrations:', migrationError);
      throw new Error(
        `Database migration failed: ${migrationError instanceof Error ? migrationError.message : String(migrationError)}`
      );
    }
  }

  private async ensureDefaultServer(): Promise<void> {
    try {
      logger.info('[INIT] Ensuring default server exists...');
      const servers = await (this.database as any).getMessageServers();
      logger.debug(`[Server] Found ${servers.length} existing servers`);

      const defaultServer = servers.find(
        (s: any) => s.id === '00000000-0000-0000-0000-000000000000'
      );

      if (!defaultServer) {
        logger.info('[Server] Creating default server...');
        
        try {
          await (this.database as any).db.execute(`
            INSERT INTO message_servers (id, name, source_type, created_at, updated_at)
            VALUES ('00000000-0000-0000-0000-000000000000', 'Default Server', 'eliza_default', NOW(), NOW())
            ON CONFLICT (id) DO NOTHING
          `);
          logger.success('[Server] Default server created successfully');
        } catch (sqlError: any) {
          logger.error('[Server] Raw SQL insert failed:', sqlError);
          // Fallback to ORM creation
          const server = await (this.database as any).createMessageServer({
            id: '00000000-0000-0000-0000-000000000000' as UUID,
            name: 'Default Server',
            sourceType: 'eliza_default',
          });
          logger.success('[Server] Default server created via ORM with ID:', server.id);
        }
      } else {
        logger.info('[Server] Default server already exists');
      }
      
      logger.success('[INIT] Default server setup complete');
    } catch (error) {
      logger.error('[Server] Error ensuring default server:', error);
      throw error;
    }
  }

  private initializeServices(): void {
    // Initialize services with dependency injection
    this.databaseService = new DatabaseService(this.database);
    this.agentService = new AgentService(this.databaseService);
    this.middlewareService = new MiddlewareService();
    // ServerService will be initialized after Express app is created
  }

  private async initializeExpressApp(options?: ServerOptions): Promise<void> {
    this.app = express();

    // Setup all middleware using MiddlewareService
    this.middlewareService.setupSecurityMiddleware(this.app);
    this.middlewareService.setupCustomMiddlewares(this.app, options);
    this.middlewareService.setupStandardMiddlewares(this.app);
    this.middlewareService.setupAuthMiddleware(this.app);
    this.middlewareService.setupMediaRoutes(this.app);
    this.middlewareService.setupContentTypeMiddleware(this.app);
    
    // Skip static file serving - server should be API-only
    // Frontend should be served separately or built specifically for server package

    // Initialize HttpService now that app is ready
    this.httpService = new HttpService(this.app, this.agentService.getAgents());
    
    // Setup routes using HttpService
    this.httpService.setupApiRoutes(this);
    this.httpService.setupFallbackRoutes();
    
    // Initialize HTTP server and Socket.IO
    this.httpService.initializeServer(this);
    
    // Expose server and socketIO for compatibility
    this.server = this.httpService.getServer();
    this.socketIO = this.httpService.getSocketIO();

    // Small delay to ensure everything is ready
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  /**
   * Initialize agent methods using the agent service
   */
  private initializeAgentMethods(): void {
    // Implement startAgent method
    this.startAgent = async (character: Character): Promise<IAgentRuntime> => {
      try {
        return await this.agentService.startAgent(character);
      } catch (error) {
        logger.error('Failed to start agent:', error);
        throw error;
      }
    };

    // Implement stopAgent method  
    this.stopAgent = (runtime: IAgentRuntime): void => {
      try {
        this.agentService.stopAgent(runtime);
      } catch (error) {
        logger.error('Failed to stop agent:', error);
        throw error;
      }
    };

    logger.debug('Agent methods initialized');
  }
}

// Export utility functions
export function expandTildePath(filepath: string): string {
  if (!filepath) {
    return filepath;
  }

  if (filepath.startsWith('~')) {
    if (filepath === '~') {
      return process.cwd();
    } else if (filepath.startsWith('~/')) {
      return path.join(process.cwd(), filepath.slice(2));
    } else if (filepath.startsWith('~~')) {
      return filepath;
    } else {
      return path.join(process.cwd(), filepath.slice(1));
    }
  }

  return filepath;
}

export function resolvePgliteDir(dir?: string, fallbackDir?: string): string {
  const envPath = resolveEnvFile();
  if (existsSync(envPath)) {
    dotenv.config({ path: envPath });
  }

  const base =
    dir ??
    process.env.PGLITE_DATA_DIR ??
    fallbackDir ??
    path.join(process.cwd(), '.eliza', '.elizadb');

  const resolved = expandTildePath(base);
  const legacyPath = path.join(process.cwd(), '.elizadb');
  if (resolved === legacyPath) {
    const newPath = path.join(process.cwd(), '.eliza', '.elizadb');
    process.env.PGLITE_DATA_DIR = newPath;
    return newPath;
  }

  return resolved;
}

// For backward compatibility, export Server as AgentServer
export { Server as AgentServer };