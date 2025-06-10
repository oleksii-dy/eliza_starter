import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/build/**',
        '**/.vite/**',
        '**/.next/**',
        '**/.vercel/**',
        '**/coverage/**',
        '**/test/**',
        '**/test.{ts,js}',
        '**/tests/**',
        '**/tests.{ts,js}',
        '**/__tests__/**',
        '**/__tests__.{ts,js}',
        '**/*.d.ts',
        '**/*.config.{ts,js}',
        '**/*.setup.{ts,js}',
        'src/index.ts',
        'src/scripts/**',
        'src/tee/phala/**',
      ],
      include: [
        'src/server/**',
        'src/commands/**',
      ],
    },
    setupFiles: ['./test/setup.ts'],
    alias: {
      '@/src': path.resolve(__dirname, 'src'),
    },
    include: ['tests/api/**/*.test.ts', 'tests/api/**/*.spec.ts'],
    exclude: ['tests/commands/**', 'test/**'],
    poolOptions: {
      threads: {
        minThreads: 1,
        maxThreads: 2, // Limit for API tests since they start servers
        isolate: true, // Isolate API tests since they modify global state
      },
    },
    testTimeout: 120000, // 2 minutes for API tests
    hookTimeout: 120000, // 2 minutes for setup/teardown
    teardownTimeout: 30000, // 30 seconds for cleanup
    // Sequential execution to avoid port conflicts
    sequence: {
      concurrent: false,
    },
    // Environment variables for API testing
    env: {
      NODE_ENV: 'test',
      LOG_LEVEL: 'error',
      DISABLE_TELEMETRY: 'true',
      DISABLE_ANALYTICS: 'true',
      TEST_MODE: 'api',
    },
    // Retry failed tests once (network issues, timing)
    retry: 1,
    // reporters: ['verbose'], // Enable for debugging
  },
});