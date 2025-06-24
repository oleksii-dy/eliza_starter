import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  outDir: 'dist',
  tsconfig: './tsconfig.build.json', // Use build-specific tsconfig
  sourcemap: true,
  clean: true,
  format: ['esm'],
  dts: true, // tsup will generate declaration files
  external: [
    '@elizaos/core',
    'zod',
    // Node.js built-in modules should be external if not polyfilled
    'fs',
    'path',
    'os',
    'node:fs',
    'node:path',
    'node:os',
    'node:events',
    'node:buffer',
    'node:stream',
    // undici is a dependency, so it will be bundled unless it's very large
    // or causes issues. For now, let tsup bundle it.
  ],
  noExternal: [
    // If there are packages you specifically want to bundle, list them here.
    // For example, if 'undici' was small and critical, but generally it's better
    // to keep dependencies external if they are also used by other parts of eliza.
    // Given 'undici' is used by plugin-local-ai's examples, it might be common.
    // However, for a model provider, it's a core part of its functionality.
    // Let's try bundling it by NOT listing it in 'external'.
  ],
  splitting: false, // Keep output in a single file for simpler plugins
  shims: true, // If using features that need shims for ESM/CJS interop
  target: 'node18', // Align with typical Node.js LTS versions
});
