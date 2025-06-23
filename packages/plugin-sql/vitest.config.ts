import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 60000,
    hookTimeout: 60000,
    // Run tests sequentially to avoid concurrent PGLite instances
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    // Force sequential execution
    maxWorkers: 1,
    minWorkers: 1,
    sequence: {
      concurrent: false,
      shuffle: false,
    },
    // Disable file parallelism
    fileParallelism: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        'dist/**',
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/test/**',
        '**/__tests__/**',
        '**/setupTests.ts',
        'vitest.setup.ts',
        'src/test-utils.ts',
      ],
    },
    setupFiles: ['./src/__tests__/test-setup.ts'],
    env: {
      // Clear PostgreSQL connection during tests to force PGLite usage
      // POSTGRES_URL: '',
      POSTGRES_USER: '',
      POSTGRES_PASSWORD: '',
      NODE_ENV: 'test',
    },
  },
  resolve: {
    alias: {
      '@elizaos/core': path.resolve(__dirname, '../core/src/index.ts'),
    },
  },
});
