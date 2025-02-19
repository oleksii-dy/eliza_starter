import { Adapter, logger, IAgentRuntime, Plugin } from '@elizaos/core';
import { PgDatabaseAdapter } from './pg';
import { PgliteDatabaseAdapter } from './pg-lite';

export { PgDatabaseAdapter, PgliteDatabaseAdapter };

const drizzleDatabaseAdapter: Adapter = {
  init: async (runtime: IAgentRuntime) => {
    const dataDir = runtime.getSetting("PGLITE_DATA_DIR");
    const postgresUrl = runtime.getSetting("POSTGRES_URL");
    
    try {
      let db;
      if (dataDir) {
        logger.info(`Initializing PGLite database adapter with data directory: ${dataDir}`);
        db = new PgliteDatabaseAdapter({ dataDir });
      }
      else if (postgresUrl) {
        logger.info("Initializing Postgres database adapter...");
        db = new PgDatabaseAdapter(postgresUrl);
      } 
      else {
        throw new Error("No database configuration found. Please set either PGLITE_DATA_DIR or POSTGRES_URL");
      }
      
      await db.init();
      logger.success("Database connection established successfully");
      
      return db;
    } catch (error) {
      logger.error("Failed to initialize database:", error);
      throw error;
    }
  },
};

const drizzlePlugin: Plugin = {
  name: "drizzle",
  description: "Database adapter plugin using Drizzle ORM",
  adapters: [drizzleDatabaseAdapter],
};

export default drizzlePlugin;
