import type { BuildConfig } from 'bun';

export const buildConfig: BuildConfig = {
  entrypoints: ['./src/index.ts'],
  outdir: './dist/browser',
  target: 'browser',
  format: 'esm',
  splitting: false,
  sourcemap: 'external',
  external: [
    '@solana/web3.js',
    'zod',
    '@hapi/shot',
    '@elizaos/core',
    'sharp',
    'langchain',
    'pdfjs-dist',
  ],
  naming: '[dir]/[name].[ext]',
}; 