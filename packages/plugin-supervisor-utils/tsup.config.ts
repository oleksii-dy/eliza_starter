import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [
    'src/index.ts', // Main entry for the plugin (if it exports anything directly)
    'src/db/schema.ts', // Specific entry point for the schema
    'src/supervisor-task-db.service.ts' // Specific entry for the service
  ],
  outDir: 'dist',
  tsconfig: './tsconfig.build.json',
  sourcemap: true,
  clean: true,
  format: ['esm'],
  dts: true, // Generate declaration files
  external: [
    '@elizaos/core',
    'drizzle-orm',
    // SQL drivers (pg, better-sqlite3, mysql2) should be peer dependencies or dependencies of @elizaos/plugin-sql
    'pg',
    'better-sqlite3',
    'mysql2',
    'uuid', // Often a peer or handled by consuming packages
    // Node.js built-ins
    'fs', 'path', 'os',
    'node:fs', 'node:path', 'node:os',
  ],
  splitting: false, // Keep it simple for utility plugins, false by default
  shims: true, // If CJS/ESM interop is needed
  target: 'node18',
});
