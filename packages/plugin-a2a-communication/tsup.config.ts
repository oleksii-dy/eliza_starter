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
    'node:fs',
    'node:path',
    'node:os',
    'node:events',
    'node:buffer',
    'node:stream',
    // uuid will be bundled as it's a direct dependency for message ID generation
  ],
  splitting: false,
  shims: true,
  target: 'node18',
});
