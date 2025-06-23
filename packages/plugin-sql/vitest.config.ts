import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Run tests sequentially to prevent PGLite WebAssembly conflicts
    sequence: {
      concurrent: false,
    },
    // Increase timeouts for PGLite initialization
    testTimeout: 60000, // 60 seconds per test
    hookTimeout: 30000, // 30 seconds for setup/teardown
    // Increase worker memory and setup for WebAssembly
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true, // Single process to prevent WebAssembly conflicts
      },
    },
    // Global setup for PGLite cleanup
    globalSetup: './src/__tests__/global-setup.ts',
    // Environment variables for testing
    env: {
      NODE_ENV: 'test',
      VITEST: 'true',
    },
    // Retry failed tests (in case of transient WebAssembly issues)
    retry: 2,
  },
});