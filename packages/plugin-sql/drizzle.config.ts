import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";
import os from "node:os";
import path from "node:path";

config({ path: "../../.env" });

const homeDir = os.homedir();
const elizaDir = path.join(homeDir, ".eliza");
const elizaDbDir = path.join(elizaDir, "db");
const pgliteUrl = `file:///${elizaDbDir}`;

const drizzleConfig = process.env.POSTGRES_URL
	? {
			dialect: "postgresql" as const,
			schema: "./src/schema/index.ts",
			out: "./drizzle/migrations",
			dbCredentials: {
				url: process.env.POSTGRES_URL,
			},
			breakpoints: true,
	  }
	: {
			dialect: "postgresql" as const,
			driver: "pglite",
			schema: "./src/schema/index.ts",
			out: "./drizzle/migrations",
			dbCredentials: {
				url: pgliteUrl,
			},
			breakpoints: true,
	  };
export default defineConfig(drizzleConfig);
