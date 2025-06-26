import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './lib/database/schema-pglite.ts',
  out: './drizzle/migrations-pglite',
  dbCredentials: {
    // For PGlite, we don't need actual credentials
    // The connection will be handled by the adapter
    url: 'postgres://localhost:5432/.elizadb',
  },
  verbose: true,
  strict: true,
  migrations: {
    table: 'drizzle_migrations',
    schema: 'public',
  },
});
