import eslint from '@eslint/js';
import typescriptEslint from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import prettierPlugin from 'eslint-plugin-prettier';
import importPlugin from 'eslint-plugin-import';

export default [
  eslint.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        project: './tsconfig.json'
      },
      globals: {
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        exports: 'writable',
        module: 'writable',
        require: 'readonly',
        global: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        crypto: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        setImmediate: 'readonly',
        clearImmediate: 'readonly',
        Date: 'readonly',
        Promise: 'readonly',
        fetch: 'readonly',
        document: 'readonly',
        window: 'readonly',
        NodeJS: 'readonly'
      }
    },
    plugins: {
      '@typescript-eslint': typescriptEslint,
      'prettier': prettierPlugin,
      'import': importPlugin
    },
    rules: {
      // TypeScript
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          'argsIgnorePattern': '^_',
          'varsIgnorePattern': '^_',
          'caughtErrorsIgnorePattern': '^_'
        }
      ],
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-floating-promises': ['error', { ignoreVoid: true }],
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/no-misused-promises': [
        'error',
        {
          checksVoidReturn: false
        }
      ],
      '@typescript-eslint/ban-ts-comment': [
        'error',
        {
          'ts-expect-error': 'allow-with-description',
          'ts-ignore': true,
          'ts-nocheck': true,
          'ts-check': false
        }
      ],
      
      // Import
      'import/order': [
        'error',
        {
          'groups': ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
          'newlines-between': 'never',
          'alphabetize': {
            'order': 'asc',
            'caseInsensitive': true
          }
        }
      ],
      'import/no-unresolved': 'off',
      'import/named': 'off',
      
      // General
      'no-console': 'off',
      'prefer-const': 'error',
      'no-debugger': 'error',
      'no-duplicate-imports': 'error',
      'no-multiple-empty-lines': ['error', { max: 1 }],
      'prettier/prettier': 'error',
      'no-undef': 'off',
      'no-unused-vars': 'off',
      'no-useless-catch': 'warn',
      'no-control-regex': 'off',
      'radix': ['error', 'always'],
      'no-case-declarations': 'error',
      'no-useless-escape': 'error'
    }
  },
  {
    files: ['**/__tests__/**/*.ts', '**/*.test.ts', '**/e2e/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'no-console': 'off'
    }
  },
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      '*.js',
      '*.d.ts',
      'cypress/**',
      'coverage/**',
      '*.config.js',
      '*.config.ts',
      'logs/**',
      '.next/**',
      '.turbo/**',
      '*.min.js'
    ]
  }
]; 