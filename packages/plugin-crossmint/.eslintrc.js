module.exports = {
  root: true,
  extends: ['../../eslint.config.js'],
  parserOptions: {
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
  },
  rules: {
    // Plugin-specific rule overrides if needed
    '@typescript-eslint/no-explicit-any': 'off', // Allow any type for flexibility
    '@typescript-eslint/ban-ts-comment': 'warn', // Warn instead of error for ts-ignore
  },
  ignorePatterns: [
    'dist/',
    'node_modules/',
    '*.config.js',
    '*.config.ts',
    'test-utils/*.mjs',
  ],
}; 