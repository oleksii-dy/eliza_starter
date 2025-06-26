/**
 * Drizzle configuration for database migrations and schema management
 */

import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './lib/database/schema.ts',
  out: './drizzle/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgresql://localhost:5432/elizaos_platform',
  },
  verbose: true,
  strict: true,
});