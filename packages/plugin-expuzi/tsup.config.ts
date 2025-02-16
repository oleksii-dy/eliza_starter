import { defineConfig } from 'tsup';

export default defineConfig({
    entry: ['src/index.ts'],
    outDir: 'dist',
    clean: true,
    dts: true,
    format: ['esm'],
    sourcemap: true,
    splitting: false,
    treeshake: true,
    external: [
        '@elizaos/core',
        '@elizaos/plugin-coingecko',
        '@mysten/sui.js',
        'coingecko-api'
    ],
    onSuccess: 'tsc --emitDeclarationOnly --declaration'
});
