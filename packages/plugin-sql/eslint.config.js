import pluginConfig from '../core/configs/eslint/eslint.config.plugin.js';

/**
 * ESLint configuration for @elizaos/plugin-sql
 * Uses the standardized plugin configuration from core/configs
 * 
 * This is a database plugin with complex PostgreSQL integration.
 */
export default [
  ...pluginConfig,
  {
    // SQL plugin specific overrides
    files: ['**/*.{js,mjs,cjs,ts}'],
    rules: {
      // Database plugins need flexibility with types
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      'no-console': 'off', // Allow console logging for database operations
      'no-control-regex': 'off', // Database strings may have control regex
      'prefer-const': 'error',
    },
  },
];
