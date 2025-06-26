/**
 * ElizaOS Server Start Script
 * Simple entry point to start the server using the factory pattern
 */

import { createElizaServer } from './server/factory.js';
import { logger } from '@elizaos/core';

async function main() {
  try {
    // Create and start server
    const serverInstance = await createElizaServer({
      port: parseInt(process.env.PORT || '3000'),
      host: process.env.HOST || 'localhost',
      dataDir: process.env.ELIZA_DATA_DIR || './data/eliza-server',
      postgresUrl: process.env.POSTGRES_URL || process.env.DATABASE_URL,
    });

    serverInstance.start();

    // Graceful shutdown
    const shutdown = async () => {
      logger.info('🛑 Shutting down...');
      await serverInstance.stop();
      process.exit(0);
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
    
  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

main();