import { migrate } from "drizzle-orm/pglite/migrator";
import { fileURLToPath } from 'url';
import path from "path";
import { drizzle } from "drizzle-orm/pglite";
import type { PGlite } from "@electric-sql/pglite";
import { logger } from "@elizaos/core";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function runMigrations(database: PGlite): Promise<void> {
    try {
        const db = drizzle(database);
        await migrate(db, {
            migrationsFolder: path.resolve(__dirname, "../drizzle/migrations"),
        });
        logger.info("Migrations completed successfully!");
    } catch (error) {
        logger.error("Failed to run database migrations:", error);
        throw error;
    }
}
