import { PostgresConnectionManager } from "./pg/manager.js";
import { PGliteClientManager } from "./pg-lite/manager.js";
import { config } from "dotenv";

config({ path: "../../.env" });

async function runMigrations() {
  console.log("Running migrations");
  console.log("POSTGRES_URL:", process.env.POSTGRES_URL);
  if (process.env.POSTGRES_URL) {
    console.log("Using PostgreSQL database");
    try {
      const connectionManager = new PostgresConnectionManager(
        process.env.POSTGRES_URL
      );
      await connectionManager.initialize();
      await connectionManager.runMigrations();
      await connectionManager.close();
    } catch (error) {
      console.error("PostgreSQL migration failed:", error);
      process.exitCode = 1;
      return;
    }
    return;
  }

  console.log("Using PGlite database");
  const clientManager = new PGliteClientManager({
    dataDir: "../../pglite"
  });
  
  try {
    await clientManager.initialize();
    await clientManager.runMigrations();
    console.log("Migrations completed successfully");
    await clientManager.close();
  } catch (error) {
    console.error("Migration failed:", error);
    try {
      await clientManager.close();
    } catch (closeError) {
      console.error("Error during client close:", closeError);
    }
    process.exitCode = 1;
  }
}

runMigrations().catch(console.error);
