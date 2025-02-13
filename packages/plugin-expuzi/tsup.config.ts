import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  external: [
    '@elizaos/core',
    '@elizaos/plugin-coingecko',
    '@mysten/sui.js',
    'coingecko-api'
  ]
});