import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'index.production': 'src/index.production.ts'
  },
  outDir: 'dist',
  tsconfig: './tsconfig.build.json', // Use build-specific tsconfig
  sourcemap: true,
  clean: true,
  format: ['esm'], // ESM format
  dts: true, // Generate TypeScript declarations
  treeshake: true, // Enable tree-shaking to exclude unused code
  // Bundle splitting to avoid vitest issues
  splitting: false,
  external: [
    'dotenv',
    'fs',
    'path',
    'https',
    'http',
    '@elizaos/core',
    '@elizaos/plugin-message-handling',
    '@elizaos/plugin-discord',
    '@elizaos/plugin-knowledge',
    '@elizaos/plugin-telegram',
    '@elizaos/plugin-ngrok',
    'zod',
    'vitest', // Externalize vitest to prevent bundling
    '@vitest/coverage-v8',
    '@vitest/runner',
    '@vitest/ui',
    'vite',
    'express',
    'helmet',
    'cors',
    'nanoid',
    'puppeteer',
    'cookie-parser',
    'express-session',
    'isomorphic-dompurify',
    // Runtime modules that should be external
    'node:assert',
    'node:crypto',
    'node:fs',
    'node:path',
    'node:url',
    'node:buffer',
    'node:process',
    'node:stream',
    'node:util',
  ],
  noExternal: [
    // Force some modules to be bundled if needed
  ],
  esbuildOptions(options) {
    // Exclude test-related code patterns
    options.conditions = ['module'];
    options.define = {
      'process.env.NODE_ENV': '"production"'
    };
  },
});
