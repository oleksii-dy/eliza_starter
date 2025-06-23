import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  outDir: 'dist',
  sourcemap: true,
  clean: true,
  format: ['esm', 'cjs'],
  dts: true,
  splitting: false,
  minify: false,
  external: [
    '@elizaos/core',
    'fs-extra',
    'zod',
    'bun:test'
  ],
  noExternal: [],
  ignoreWatch: ['src/**/*.test.ts', 'src/**/*.test.js'],
  // Exclude test files from build
  onSuccess: async () => {
    console.log('Build completed!');
  }
});