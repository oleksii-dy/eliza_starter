import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  splitting: false,
  sourcemap: true,
  minify: false,
  platform: 'node',
  target: 'es2020',
  outDir: 'dist',
  skipNodeModulesBundle: true,
  external: ['@elizaos/core', '@elizaos/cli'],
  banner: {
    js: `import { createRequire } from 'module'; const require = createRequire(import.meta.url);`,
  },
});