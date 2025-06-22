import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    environmentMatchGlobs: [
      ['src/frontend/**/*.test.{ts,tsx}', 'jsdom'],
      ['src/**/*.test.{ts,tsx}', 'node']
    ],
    setupFiles: ['./src/__tests__/setup.ts'],
    testTimeout: 60000,
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true
      }
    },
    deps: {
      inline: ['force-graph']
    },
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/cypress/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*',
      '**/src/__tests__/e2e/**',
      '**/src/__tests__/runtime/**'
    ]
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@elizaos/core': path.resolve(__dirname, '../core/dist'),
      'force-graph': path.resolve(__dirname, './src/__mocks__/force-graph.ts')
    }
  }
});
