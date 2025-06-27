import pluginConfig from '../core/configs/eslint/eslint.config.plugin.js';

/**
 * ESLint configuration for @elizaos/plugin-agentkit
 * Uses the standardized plugin configuration from core/configs
 */
export default [
  ...pluginConfig,
  {
    // AgentKit plugin specific overrides
    files: ['**/*.{js,ts,tsx}'],
    rules: {
      // Blockchain/crypto code needs flexibility
      '@typescript-eslint/no-explicit-any': 'off',
      'no-console': 'off',
    },
  },
];