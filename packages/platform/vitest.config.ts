import { defineConfig } from 'vitest/config';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  esbuild: {
    jsx: 'automatic',
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
    testTimeout: 20000, // 20 second default timeout
    hookTimeout: 20000,
    include: [
      'tests/**/*.test.ts',
      'tests/**/*.test.tsx',
      '__tests__/**/*.test.ts',
      '__tests__/**/*.test.tsx',
      'lib/**/__tests__/*.test.ts',
      'lib/**/__tests__/*.test.tsx',
      'app/**/__tests__/*.test.ts',
      'app/**/__tests__/*.test.tsx',
    ],
    env: {
      NODE_ENV: 'test',
      JWT_SECRET: 'test-jwt-secret-key-for-testing',
      WORKOS_API_KEY: 'test-workos-api-key',
      NEXTAUTH_SECRET: 'test-nextauth-secret',
      NEXTAUTH_URL: 'http://localhost:3000',
      DATABASE_URL: 'postgresql://test:test@localhost:5432/platform_test',
      STRIPE_SECRET_KEY: 'sk_test_mock_key',
      STRIPE_PUBLISHABLE_KEY: 'pk_test_mock_key',
      STRIPE_WEBHOOK_SECRET: 'whsec_test_webhook_secret',
      OPENAI_API_KEY: 'test-openai-key',
      ANTHROPIC_API_KEY: 'test-anthropic-key',
      ALCHEMY_API_KEY: 'test-alchemy-key',
      NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
      LOG_LEVEL: 'error',
      ELIZAOS_LOG_LEVEL: 'error',
    },
    mockReset: true,
    restoreMocks: true,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, '.'),
      '@tauri-apps/api/tauri': resolve(__dirname, './__mocks__/tauri.ts'),
    },
  },
});
