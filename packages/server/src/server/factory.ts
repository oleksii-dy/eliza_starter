/**
 * ElizaOS Server Factory
 * 
 * Centralized server creation and configuration logic
 * Provides a clean API for creating configured server instances
 */

import { logger } from '@elizaos/core';
import { Server } from './server.js';
import { type ServerOptions, type ServerFactoryOptions, type ServerMiddleware } from '../types/server.js';
import { findNextAvailablePort } from '../utils/port.js';

export interface ElizaServerInstance {
  server: Server;
  start: (port?: number, host?: string) => void;
  stop: () => Promise<void>;
  getServerOptions: () => ServerOptions & { port: number; host: string };
}

// Re-export types for convenience
export type { ServerFactoryOptions, ServerOptions, ServerMiddleware };

/**
 * Creates and configures an ElizaOS server instance
 */
export async function createElizaServer(options: ServerFactoryOptions = {}): Promise<ElizaServerInstance> {
  try {
    logger.info('🏭 Creating ElizaOS server...');

    // Resolve configuration
    const config = await resolveServerConfig(options);
    
    // Create server instance
    const server = new Server();
    
    // Initialize with resolved config
    logger.info('⚙️  Initializing server...');
    await server.initialize({
      dataDir: config.dataDir,
      postgresUrl: config.postgresUrl,
      middlewares: config.middlewares,
    });
    
    // Add default production headers
    server.registerMiddleware((_req, res, next) => {
      res.setHeader('X-Powered-By', 'ElizaOS');
      res.setHeader('X-Service', 'ElizaOS-Server');
      next();
    });

    logger.success('✅ Server created successfully');

    return {
      server,
      start: (port?: number, host?: string) => startServer(server, port || config.port, host || config.host),
      stop: () => stopServer(server),
      getServerOptions: () => config,
    };
  } catch (error) {
    logger.error('❌ Failed to create server:', error);
    throw error;
  }
}


/**
 * Resolves server configuration from options and environment
 */
async function resolveServerConfig(options: ServerFactoryOptions): Promise<ServerOptions & { port: number; host: string }> {
  // Database configuration - use external function if provided (for CLI)
  let postgresUrl: string | null | undefined = null;
  let dataDir: string;

  if (options.configureDatabaseFn) {
    // Use CLI's database configuration logic
    postgresUrl = await options.configureDatabaseFn(options.configure);
    if (postgresUrl) process.env.POSTGRES_URL = postgresUrl;
    
    // Use CLI's data directory resolution if provided
    dataDir = options.resolveDataDirFn ? await options.resolveDataDirFn() : './data/eliza-server';
  } else {
    // Standard configuration for standalone server
    postgresUrl = options.postgresUrl || 
                  process.env.POSTGRES_URL || 
                  process.env.DATABASE_URL || 
                  null;

    dataDir = options.dataDir || 
              process.env.ELIZA_DATA_DIR || 
              process.env.PGLITE_DATA_DIR ||
              './data/eliza-server';
  }

  // Port configuration with automatic conflict resolution
  const desiredPort = options.port || 
                      parseInt(process.env.PORT || process.env.SERVER_PORT || '3000');
  
  const port = await findNextAvailablePort(desiredPort);
  if (port !== desiredPort) {
    logger.warn(`Port ${desiredPort} is in use, using port ${port} instead`);
    process.env.SERVER_PORT = port.toString();
  }
  
  const host = options.host || 
               process.env.HOST || 
               process.env.SERVER_HOST || 
               '0.0.0.0';

  // Configure middlewares
  const middlewares = options.middlewares || [];
  
  // Add request logging middleware by default
  if (!middlewares.some(mw => mw.name === 'requestLogging')) {
    middlewares.unshift(createRequestLoggingMiddleware());
  }

  logger.info(`📊 Database: ${postgresUrl ? 'PostgreSQL' : `PGLite (${dataDir})`}`);
  logger.info(`🌐 Server: ${host}:${port}`);
  logger.info(`🔧 Middlewares: ${middlewares.length} registered`);

  return {
    dataDir: postgresUrl ? undefined : dataDir,
    postgresUrl: postgresUrl || undefined,
    middlewares,
    port,
    host,
  };
}

/**
 * Creates request logging middleware
 */
function createRequestLoggingMiddleware(): ServerMiddleware {
  const middleware: ServerMiddleware = (req, res, next) => {
    const start = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - start;
      // Skip logging for health checks and frequent endpoints
      if (req.path !== '/api/server/ping' && req.path !== '/favicon.ico') {
        logger.info(`${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
      }
    });

    next();
  };
  
  // Add name for identification
  Object.defineProperty(middleware, 'name', { value: 'requestLogging' });
  return middleware;
}

/**
 * Starts the server with graceful shutdown handling
 */
function startServer(server: Server, port: number, host: string): void {
  logger.info(`🌐 Starting server on ${host}:${port}...`);
  
  server.start(port);

  // Log available endpoints
  logger.info('📡 Server ready! Available endpoints:');
  const baseUrl = host === '0.0.0.0' ? `http://localhost:${port}` : `http://${host}:${port}`;
  logger.info(`   Dashboard: ${baseUrl}/`);
  logger.info(`   Health: ${baseUrl}/api/server/health`);
  logger.info(`   Status: ${baseUrl}/api/server/status`);
  logger.info(`   Ping: ${baseUrl}/api/server/ping`);
  logger.info(`   API: ${baseUrl}/api/`);
  logger.info(`   WebSocket: ws://${host === '0.0.0.0' ? 'localhost' : host}:${port}/`);
}

/**
 * Stops the server gracefully
 */
async function stopServer(server: Server): Promise<void> {
  logger.info('🛑 Stopping server...');
  try {
    await server.stop();
    logger.success('✅ Server stopped successfully');
  } catch (error) {
    logger.error('❌ Error stopping server:', error);
    throw error;
  }
}

