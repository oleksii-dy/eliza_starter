import { Adapter, logger, IAgentRuntime, Plugin  } from '@elizaos/core';
import { PgDatabaseAdapter } from './pg';
import { PgliteDatabaseAdapter } from './lite';

const drizzleDatabaseAdapter: Adapter = {
    init: async (runtime: IAgentRuntime) => {
        console.log("Initializing Drizzle database adapter...");

        const connectionConfig = runtime.getSetting("POSTGRES_URL");
        const dataDir = runtime.getSetting("PGLITE_DATA_DIR");

        let db;
        if (dataDir) {
            logger.info(`Initializing Drizzle database at ${dataDir}...`);
            db = new PgliteDatabaseAdapter({ dataDir });
        } else if (connectionConfig) {
            logger.info(`Initializing Drizzle database at ${connectionConfig}...`);
            db = new PgDatabaseAdapter(connectionConfig);
        } else {
            throw new Error("No database configuration found");
        }

        try {
            await db.init();
            logger.success("Successfully connected to Drizzle database");
        } catch (error) {
            logger.error("Failed to connect to Drizzle:", error);
            throw error;
        }

        return db;
    },
};

const drizzlePlugin: Plugin = {
    name: "drizzle",
    description: "Drizzle database adapter plugin",
    adapters: [drizzleDatabaseAdapter],
};

export default drizzlePlugin;
