import baseConfig from '../../eslint.config.js';

export default [
  ...baseConfig,
  {
    files: ['**/*.{js,mjs,cjs,ts,tsx}'],
    rules: {
      // Disable indent rule - conflicts with Prettier formatting
      indent: 'off',
    },
  },
];
