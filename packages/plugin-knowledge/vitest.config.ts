/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.{js,ts,jsx,tsx}'],
    exclude: ['src/__tests__/e2e/**'], // E2E tests are run separately
    setupFiles: [],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        'src/__tests__/fixtures/',
        'src/__tests__/e2e/', // E2E tests are run separately
        'cypress/',
      ],
    },
    // Use server.deps.inline for vite-node
    server: {
      deps: {
        inline: ['@elizaos/core', 'zod'],
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // Explicitly resolve zod
      'zod': path.resolve(__dirname, '../../node_modules/zod/lib/index.mjs'),
    },
  },
  // Add optimizeDeps to handle workspace packages
  optimizeDeps: {
    include: ['@elizaos/core', '@elizaos/plugin-openai', '@elizaos/plugin-anthropic'],
    exclude: ['zod'],
  },
});
