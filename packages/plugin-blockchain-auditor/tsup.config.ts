import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  outDir: 'dist',
  tsconfig: './tsconfig.build.json',
  sourcemap: true,
  clean: true,
  format: ['esm'],
  dts: true,
  external: [
    '@elizaos/core',
    'zod',
    // Node.js built-in modules
    'fs',
    'path',
    'os',
    'child_process',
    'node:fs',
    'node:path',
    'node:os',
    'node:child_process',
    'node:events',
    'node:buffer',
    'node:stream',
  ],
  splitting: false,
  shims: true,
  target: 'node18',
});
