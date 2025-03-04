import { drizzle } from 'drizzle-orm/pglite';
import { migrate as pgliteMigrate } from 'drizzle-orm/pglite/migrator';
import { migrate as pgMigrate } from 'drizzle-orm/node-postgres/migrator';
import { PGlite } from '@electric-sql/pglite';
import { PostgresConnectionManager } from './pg/manager.js';
import { drizzle as pgDrizzle } from 'drizzle-orm/node-postgres';
import { config } from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, '..');
const migrationsPath = path.resolve(projectRoot, 'drizzle/migrations');

config({ path: '../../.env' });

async function runMigrations() {
  if (process.env.POSTGRES_URL) {
    console.log('Using PostgreSQL database');
    try {
      const connectionManager = new PostgresConnectionManager(process.env.POSTGRES_URL);
      await connectionManager.initialize();
      

      const client = await connectionManager.getClient();
      const db = pgDrizzle(client);
      
      await pgMigrate(db, {
        migrationsFolder: migrationsPath,
      });
      
      await connectionManager.close();
    } catch (error) {
      console.error('PostgreSQL migration failed:', error);
      process.exit(1);
    }
    return;
  }

  console.log('Using PGlite database');
  const client = new PGlite('file://../../pglite');
  const db = drizzle(client);

  try {
    await pgliteMigrate(db, {
      migrationsFolder: './drizzle/migrations',
    });
    console.log('Migrations completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigrations().catch(console.error); 