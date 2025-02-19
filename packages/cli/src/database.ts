import { PgDatabaseAdapter, PgliteDatabaseAdapter } from "@elizaos/plugin-drizzle";

const getDatabaseAdapter = () => {
  if (process.env.PGLITE_DATA_DIR) {
    return new PgliteDatabaseAdapter({
      dataDir: process.env.PGLITE_DATA_DIR
    });
  }
  
  if (process.env.POSTGRES_URL) {
    return new PgDatabaseAdapter({
      connectionString: process.env.POSTGRES_URL
    });
  }

  throw new Error("No database configuration found. Please set either PGLITE_DATA_DIR or POSTGRES_URL environment variable.");
};

export const adapter = getDatabaseAdapter();