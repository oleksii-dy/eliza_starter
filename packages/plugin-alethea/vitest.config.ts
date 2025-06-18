import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'node',
        globals: true,
        setupFiles: [],
        testTimeout: 10000,
        hookTimeout: 10000,
        teardownTimeout: 10000,
        isolate: false,
    },
    resolve: {
        alias: {
            '@elizaos/core': new URL('../core/src', import.meta.url).pathname,
        },
    },
});