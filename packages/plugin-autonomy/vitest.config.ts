import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    testTimeout: 60000,
    setupFiles: ['./src/__tests__/setup.ts'],
    exclude: [
      '**/e2e/**', 
      '**/node_modules/**',
      'plugin-*/**', // Exclude tests from plugin subdirectories
      '**/dist/**'   // Exclude built files
    ],
    coverage: {
      enabled: true,
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage',
      exclude: [
        'coverage/**',
        'dist/**',
        '**/node_modules/**',
        '**/e2e/**',
        '**/*.d.ts',
        '**/*.test.ts',
        '**/*.test.tsx',
        '**/types.ts',
        '**/index.ts', // Export-only files
        'src/ui/__tests__/**', // UI test utilities
      ],
      include: [
        'src/**/*.ts',
        'src/**/*.tsx',
      ],
      // Temporarily disable thresholds while building tests
      // thresholds: {
      //   lines: 75,
      //   functions: 75,
      //   branches: 75,
      //   statements: 75,
      // },
      all: true,
      skipFull: false,
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
