import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    testTimeout: 60000,
    setupFiles: ['./src/test-setup.ts'],
    exclude: ['**/e2e/**', '**/node_modules/**', 'codex/**', 'test-data/**'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
