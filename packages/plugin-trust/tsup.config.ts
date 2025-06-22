import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  // Temporarily disable DTS generation to avoid memory issues
  dts: false,
  clean: true,
  sourcemap: true,
  // Increase memory for the build process
  env: {
    NODE_OPTIONS: '--max-old-space-size=4096'
  },
  // Split into chunks to reduce memory usage
  splitting: true,
  // Skip minification during development
  minify: false,
  // External dependencies to reduce bundle size
  external: [
    '@elizaos/core',
    '@elizaos/plugin-sql',
    'drizzle-orm',
    'dedent'
  ],
  // Optimize output
  treeshake: true,
  // Target modern JavaScript
  target: 'es2022',
});
