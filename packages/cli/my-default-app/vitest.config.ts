import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    include: ['src/__tests__/**/*.test.ts'],
    exclude: ['src/__tests__/cypress/**/*', 'src/__tests__/e2e/**/*', 'node_modules/**/*'],
    environment: 'node',
    root: '.',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@elizaos/core': path.resolve(__dirname, '../core/src'),
    },
  },
});