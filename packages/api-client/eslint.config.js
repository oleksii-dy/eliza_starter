import { baseConfig, testOverrides, standardIgnores } from '../core/configs/eslint/eslint.config.base.js';

/**
 * ESLint configuration for @elizaos/api-client
 * Uses the standardized base configuration from core/configs
 * 
 * This is a Node.js library package, so it uses the base config
 * rather than the frontend config.
 */
export default [
  ...baseConfig,
  {
    // API client specific overrides
    files: ['**/*.{js,ts}'],
    languageOptions: {
      globals: {
        // Node.js globals
        process: 'readonly',
        console: 'readonly',
        Buffer: 'readonly',
        global: 'readonly',
        globalThis: 'readonly',
        
        // Node.js modules
        require: 'readonly',
        module: 'readonly',
        exports: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
      },
    },
    rules: {
      // API client specific rules
      'no-console': 'off', // Allow console logging in API client
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
    },
  },
  testOverrides,
];