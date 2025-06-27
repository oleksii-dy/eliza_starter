import { baseConfig, testOverrides, standardIgnores } from './configs/eslint/eslint.config.base.js';

/**
 * ESLint configuration for @elizaos/core
 * Uses the standardized base configuration from its own configs
 * 
 * This is the core package that defines the standardized configurations,
 * so it uses its own configs directly.
 */
export default [
  ...baseConfig,
  {
    // Core package specific overrides
    files: ['**/*.{js,ts}'],
    languageOptions: {
      globals: {
        // Additional Node.js globals for core functionality
        process: 'readonly',
        console: 'readonly',
        Buffer: 'readonly',
        global: 'readonly',
        globalThis: 'readonly',
        
        // Browser globals for compatibility (core is isomorphic)
        window: 'readonly',
        document: 'readonly',
        fetch: 'readonly',
        
        // Bun globals
        Bun: 'readonly',
      },
    },
    rules: {
      // Core package specific rules
      'no-console': 'off', // Allow console logging in core
      '@typescript-eslint/no-explicit-any': 'warn', // Core needs some flexibility
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      'no-unused-vars': 'off', // TypeScript handles this better
    },
  },
  testOverrides,
  {
    // Additional ignores for core package
    ignores: [
      ...standardIgnores,
      // Core package specific ignores
      'configs/',
      'src/build/',
      'src/crypto-browserify.d.ts',
      'src/types/crypto-browserify.d.ts',
      'build.*.ts',
      'packages/',
    ],
  },
];