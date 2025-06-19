import type { drizzle } from "drizzle-orm/node-postgres";
import type { IAgentRuntime } from "@elizaos/core";

export const getDb = (runtime: IAgentRuntime) => {
  const db = runtime.db;

  if ("select" in db) {
    return db as ReturnType<typeof drizzle>;
  }

  throw new Error("Failed to get database adapter");
};