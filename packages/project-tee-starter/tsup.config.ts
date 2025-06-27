import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  splitting: false,
  skipNodeModulesBundle: true,
  shims: true,
  external: ['@elizaos/core', '@phala/dstack-sdk', 'viem', '@solana/web3.js', 'crypto'],
  outDir: 'dist',
  tsconfig: 'tsconfig.build.json',
}); 