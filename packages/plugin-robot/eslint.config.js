import baseConfig from '../../eslint.config.js';

export default [
  ...baseConfig,
  {
    files: ['src/**/*.{js,ts,tsx}'],
    rules: {
      // Turn off no-undef as TypeScript handles this
      'no-undef': 'off',

      // TypeScript specific overrides for this package
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          // Ignore unused parameters in callbacks and interface implementations
          args: 'all',
          ignoreRestSiblings: true,
          // Ignore common parameters that are part of interface contracts
          destructuredArrayIgnorePattern: '^_',
          // Don't warn about unused imports that are only used as types
          // This is common in TypeScript projects
          caughtErrors: 'all',
          caughtErrorsIgnorePattern: '^_',
        },
      ],

      // Radix parameter is common in this package for base-10 parsing
      radix: 'off', // Too many false positives with base 10
    },
  },
  {
    // Special rules for type definition files
    files: ['src/types/**/*.d.ts'],
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
  {
    // Allow certain patterns that are common in this codebase
    files: ['src/**/*.ts'],
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          args: 'all',
          ignoreRestSiblings: true,
          destructuredArrayIgnorePattern: '^_',
          caughtErrors: 'all',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },
  {
    // Test files may have different patterns
    files: ['src/**/*.test.ts', 'src/__tests__/**/*.ts'],
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
  {
    // Plugin-robot specific rules
    rules: {
      // Add any plugin-specific rule overrides here if needed
    },
  },
];
