import pluginConfig from '../core/configs/eslint/eslint.config.plugin.js';

/**
 * ESLint configuration for create-eliza
 * Uses the standardized plugin configuration from core/configs
 */
export default [
  ...pluginConfig,
  {
    // JavaScript-specific overrides for .mjs files
    files: ['**/*.mjs'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
    },
  },
];