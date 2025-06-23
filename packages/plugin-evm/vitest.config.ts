import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/tests/**/*.test.ts', 'src/**/*.test.ts'],
    exclude: ['node_modules/**/*', 'dist/**/*'],
    setupFiles: ['./test-setup.ts'],
    pool: 'forks',
    server: {
      deps: {
        external: ['@elizaos/core']
      }
    }
  },
  resolve: {
    conditions: ['node', 'import', 'module'],
    alias: {
      '@elizaos/core': path.resolve(__dirname, '../../core/dist/index.js'),
    },
  },
});