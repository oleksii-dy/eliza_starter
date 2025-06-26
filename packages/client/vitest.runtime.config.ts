import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/vitest-setup.ts'],
    globals: true,
    include: ['./src/__tests__/runtime/**/*.test.{ts,tsx}'],
    testTimeout: 30000, // Longer timeout for runtime tests
    hookTimeout: 30000,
    teardownTimeout: 30000,
    reporters: ['verbose'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.test.{ts,tsx}',
        '**/__tests__/**',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@elizaos/core': path.resolve(__dirname, '../core/src'),
      '@elizaos/client': path.resolve(__dirname, './src'),
    },
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify('test'),
    global: 'globalThis',
  },
});