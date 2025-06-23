import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/__tests__/setup.ts'],
    testTimeout: 30000,
    hookTimeout: 30000,
    env: {
      // Default to devnet for tests unless explicitly set
      SOLANA_NETWORK: process.env.SOLANA_NETWORK || 'devnet',
      SOLANA_RPC_URL: process.env.SOLANA_RPC_URL || '',
      HELIUS_API_KEY: process.env.HELIUS_API_KEY || '',
      BIRDEYE_API_KEY: process.env.BIRDEYE_API_KEY || '',
      NODE_ENV: 'test',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData.ts',
        '**/__tests__/**',
        '**/e2e/**',
        'src/types.ts',
        'src/index.ts'
      ],
      thresholds: {
        global: {
          branches: 70,
          functions: 70,
          lines: 70,
          statements: 70
        }
      }
    },
    include: [
      'src/__tests__/**/*.test.ts',
      'src/__tests__/**/*.spec.ts',
      'src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'
    ],
    exclude: ['**/node_modules/**', '**/dist/**', '**/cypress/**'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
}); 