import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  outDir: 'dist',
  tsconfig: './tsconfig.json',
  sourcemap: true,
  clean: true,
  format: ['esm'], // Build as ESM only
  dts: true,
  external: [
    'fs',
    'path',
    'node-cron',
    'uuid',
    '@elizaos/core',
  ],
}); 