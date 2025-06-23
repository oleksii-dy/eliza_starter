import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    testTimeout: 60000, // 60 seconds
    hookTimeout: 30000, // 30 seconds
    globals: true,
    environment: 'node',
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    setupFiles: ['./tests/global-setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
      '@elizaos/core': path.resolve(__dirname, '../core/dist/index.js'),
      '@elizaos/plugin-sql': path.resolve(__dirname, '../plugin-sql/dist/index.js'),
      '@elizaos/plugin-todo': path.resolve(__dirname, '../plugin-todo/dist/index.js'),
      '@elizaos/plugin-trust': path.resolve(__dirname, '../plugin-trust/dist/index.js'),
      '@elizaos/plugin-rolodex': path.resolve(__dirname, '../plugin-rolodex/dist/index.js'),
    },
  },
}); 