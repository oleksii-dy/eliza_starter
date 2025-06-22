import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  external: [
    '@elizaos/core',
    '@elizaos/plugin-sql',
    '@elizaos/plugin-message-handling',
    '@elizaos/plugin-agentkit',
    '@elizaos/plugin-evm',
    '@elizaos/plugin-solana',
    '@elizaos/plugin-secrets-manager',
    '@elizaos/plugin-trust',
    '@elizaos/plugin-tasks',
  ],
  noExternal: [],
  platform: 'node',
  target: 'node18',
  esbuildOptions(options) {
    options.define = {
      ...options.define,
      'global.Buffer': 'Buffer',
    };
    options.banner = {
      js: `import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { Buffer } = require('buffer');
globalThis.Buffer = Buffer;`,
    };
    // Ensure proper module resolution
    options.outExtension = { '.js': '.js' };
    options.format = 'esm';
  },
  shims: true,
  // Ensure imports have .js extensions
  onSuccess: async () => {
    console.log('Build completed successfully');
  },
});
