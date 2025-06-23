import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    'index': 'src/index.ts',
    'real': 'src/realIndex.ts',
  },
  outDir: 'dist',
  sourcemap: true,
  clean: true,
  format: ['esm'],
  dts: false, // Disable DTS generation for now
  external: [
    '@elizaos/core',
    'fs',
    'path',
    'crypto',
    'http',
    'https',
    'url',
    'buffer',
    'events',
    'stream',
    'util',
    'os'
  ],
});