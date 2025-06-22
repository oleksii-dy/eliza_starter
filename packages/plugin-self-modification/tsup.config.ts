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
    'zod'
  ],
  noExternal: [],
});