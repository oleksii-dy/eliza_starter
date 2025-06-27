import pluginConfig from '../core/configs/eslint/eslint.config.plugin.js';

/**
 * ESLint configuration for @elizaos/plugin-crossmint
 * Uses the standardized plugin configuration from core/configs
 */
export default [
  ...pluginConfig,
  {
    // Crossmint plugin specific overrides
    files: ['**/*.{js,ts,tsx}'],
    rules: {
      // NFT/blockchain operations need flexibility
      '@typescript-eslint/no-explicit-any': 'off',
      'no-console': 'off',
    },
  },
];