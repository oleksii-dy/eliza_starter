/**
 * TypeScript Example: Standalone Server Usage
 *
 * This example demonstrates how to use @elizaos/server as a standalone package
 * to create a custom agent server without the CLI dependency.
 */

import { createElizaServer, type ServerFactoryOptions, type ServerMiddleware } from '@elizaos/server';
import { logger } from '@elizaos/core';
import { Request, Response, NextFunction } from 'express';

// Custom middleware example
const customLoggingMiddleware: ServerMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
  });

  next();
};

// Server configuration
const serverOptions: ServerFactoryOptions = {
  dataDir: './data/eliza-server',
  middlewares: [customLoggingMiddleware],
  // postgresUrl: process.env.DATABASE_URL, // Optional PostgreSQL
};

async function createStandaloneServer() {
  try {
    logger.info('🚀 Creating standalone ElizaOS server...');

    // Create server instance using factory pattern
    const serverInstance = await createElizaServer(serverOptions);

    // Register custom middleware if needed
    serverInstance.server.registerMiddleware((req, res, next) => {
      // Custom request processing
      res.setHeader('X-Powered-By', 'ElizaOS-Standalone');
      next();
    });

    logger.success('✅ Server initialized successfully');

    return serverInstance;
  } catch (error) {
    logger.error('❌ Failed to create server:', error);
    throw error;
  }
}

async function startServer() {
  try {
    const serverInstance = await createStandaloneServer();

    // Start server using the factory's start method
    const port = parseInt(process.env.PORT || '3000');
    const host = process.env.HOST || 'localhost';

    logger.info(`🌐 Starting server on ${host}:${port}...`);
    serverInstance.start(port, host);

    // Graceful shutdown
    const gracefulShutdown = async () => {
      logger.info('🛑 Graceful shutdown initiated...');
      await serverInstance.stop();
      logger.success('✅ Server stopped successfully');
      process.exit(0);
    };

    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);
  } catch (error) {
    logger.error('❌ Server startup failed:', error);
    process.exit(1);
  }
}

// Export for programmatic usage
export { createStandaloneServer, startServer };

// Direct execution
if (import.meta.url === `file://${process.argv[1]}`) {
  startServer();
}
