import rootConfig from '../../eslint.config.js';

export default [
  ...rootConfig,
  {
    files: ['**/*.{js,mjs,cjs,ts,tsx}'],
    rules: {
      // Disable indent rule to avoid conflicts with Prettier
      'indent': 'off',
      '@typescript-eslint/indent': 'off'
    }
  }
]; 