import { DrizzleDatabaseAdapter } from "@elizaos/plugin-drizzle"

export const adapter = new DrizzleDatabaseAdapter({
  connectionString: process.env.DATABASE_URL,
})