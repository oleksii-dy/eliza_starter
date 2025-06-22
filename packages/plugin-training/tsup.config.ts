import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/cli/index.ts', 'src/mvp-only.ts', 'src/enhanced-export.ts'],
  outDir: 'dist',
  target: 'node18',
  format: ['esm'],
  dts: false,
  sourcemap: true,
  clean: true,
  external: ['@elizaos/core', '@elizaos/plugin-sql'],
  esbuildOptions(options) {
    options.conditions = ['module'];
  },
});