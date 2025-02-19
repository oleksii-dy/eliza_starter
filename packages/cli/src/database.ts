import { PgliteDatabaseAdapter } from "@elizaos/plugin-drizzle";

// Initialize database adapter
export const adapter = new PgliteDatabaseAdapter({
  dataDir: process.env.PGLITE_DATA_DIR,
});
