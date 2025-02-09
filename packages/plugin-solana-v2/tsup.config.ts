import { defineConfig } from "tsup";

export default defineConfig({
    entry: ['src/index.ts'],
    format: ['esm'],
    dts: true,
    splitting: false,
    sourcemap: true,
    clean: true,
    external: [
      'net',
      'tls',
      'crypto',
      'stream',
      'buffer',
      'events',
      'util',
      'ws',
      '@phala/dstack-sdk'
    ],
    noExternal: [
      ''
    ],
    platform: 'node',
    target: 'node18'
})
