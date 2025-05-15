import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'tests/**/*.test.ts',
        'src/types.ts',
        'src/index.ts',
      ],
    },
    deps: {
      interopDefault: true,
    },
    mockReset: true,
    setupFiles: ['./vitest.setup.ts'],
  },
  resolve: {
    alias: {
      '@elizaos/core': resolve(__dirname, 'tests/mocks/core-mock.ts'),
      '@elizaos/plugin-tee': resolve(__dirname, 'tests/mocks/plugin-tee-mock.ts'),
    },
  },
}); 