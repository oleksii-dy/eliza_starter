import { baseConfig, testOverrides, standardIgnores } from '../core/configs/eslint/eslint.config.base.js';

/**
 * ESLint configuration for @elizaos/server
 * Uses the standardized base configuration from core/configs
 * 
 * This is a Node.js server package, so it uses the base config.
 */
export default [
  ...baseConfig,
  {
    // Server-specific overrides
    files: ['**/*.{js,mjs,cjs,ts,tsx}'],
    languageOptions: {
      globals: {
        // Node.js server globals
        process: 'readonly',
        console: 'readonly',
        Buffer: 'readonly',
        global: 'readonly',
        globalThis: 'readonly',
        
        // Web Standards (for Express/Socket.IO compatibility)
        TextEncoder: 'readonly',
        TextDecoder: 'readonly',
        ReadableStream: 'readonly',
        WritableStream: 'readonly',
        TransformStream: 'readonly',
        fetch: 'readonly',
        Response: 'readonly',
        Request: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        Headers: 'readonly',
        FormData: 'readonly',
        File: 'readonly',
        Blob: 'readonly',
        
        // Node.js modules
        require: 'readonly',
        module: 'readonly',
        exports: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
      },
    },
    rules: {
      // Server-specific rule adjustments
      'no-console': 'off', // Allow console logging in server
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      
      // Disable indent rule to avoid conflicts with Prettier
      'indent': 'off',
      '@typescript-eslint/indent': 'off',
    },
  },
  testOverrides,
];
