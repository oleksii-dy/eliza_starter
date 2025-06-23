/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        include: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
        exclude: ['agentkit/**/*', 'node_modules/**/*', 'src/__tests__/cypress/**/*', 'src/__tests__/e2e/**/*'],
        coverage: {
            reporter: ['text', 'json', 'html'],
            include: ['src/**/*.ts'],
            exclude: ['**/*.test.ts', '**/*.d.ts', 'src/__tests__/**/*', 'src/index.ts']
        },
        setupFiles: ['./test-setup.ts'],
        pool: 'forks',
        poolOptions: {
            forks: {
                singleFork: true
            }
        }
    },
    resolve: {
        alias: {
            '@elizaos/core': path.resolve(__dirname, '../../packages/core/src/index.ts'),
            '@elizaos/plugin-trust': path.resolve(__dirname, '../../packages/plugin-trust/src/index.ts')
        }
    }
});
