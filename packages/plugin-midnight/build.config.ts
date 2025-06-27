import type { BuildConfig } from 'bun';

export const buildConfig: BuildConfig = {
  entrypoints: ['./src/index.ts'],
  outdir: './dist',
  target: 'node',
  format: 'esm',
  splitting: false,
  sourcemap: 'external',
  external: [
    // Node.js built-ins
    'fs',
    'path',
    'http',
    'https',
    'crypto',
    'node:fs',
    'node:path',
    'node:http',
    'node:https',
    'node:crypto',
    'node:stream',
    'node:buffer',
    'node:util',
    'node:events',
    'node:url',
    'bun:test',
    
    // External dependencies
    'dotenv',
    'zod',
    '@elizaos/core',
    'pino',
    'rxjs',
    
    // Midnight Network SDK packages (externalize to preserve WASM loading)
    '@midnight-ntwrk/ledger',
    '@midnight-ntwrk/wallet',
    '@midnight-ntwrk/wallet-api',
    '@midnight-ntwrk/midnight-js-node-zk-config-provider',
    '@midnight-ntwrk/midnight-js-types',
    '@midnight-ntwrk/midnight-js-level-private-state-provider',
    '@midnight-ntwrk/midnight-js-indexer-public-data-provider',
    '@midnight-ntwrk/midnight-js-http-client-proof-provider',
    '@midnight-ntwrk/midnight-js-network-id',
    '@midnight-ntwrk/compact-runtime',
    '@midnight-ntwrk/midnight-js-contracts',
    '@midnight-ntwrk/zswap',
  ],
  naming: '[dir]/[name].[ext]',
};
