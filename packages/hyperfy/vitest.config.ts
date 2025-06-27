import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    setupFiles: ['./src/__tests__/setup.ts'],
    testTimeout: 30000, // 30 second timeout
    hookTimeout: 30000,
    pool: 'forks',
    poolOptions: {
      forks: {
        maxForks: 2, // Limit parallel forks
        minForks: 1,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
