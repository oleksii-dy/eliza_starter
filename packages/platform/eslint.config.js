import frontendConfig from '../core/configs/eslint/eslint.config.frontend.js';
import { FlatCompat } from '@eslint/eslintrc';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create compatibility layer for Next.js config
const compat = new FlatCompat({
  baseDirectory: __dirname,
});

// Next.js 15 compatible flat config
const config = [
  ...frontendConfig,
  // Use compat to include Next.js ESLint rules
  ...compat.extends('next'),
  {
    // Additional Next.js specific settings
    files: ['**/*.{js,jsx,ts,tsx}'],
    rules: {
      // Override any conflicting rules
      'react/no-unescaped-entities': 'off',
      'react-hooks/exhaustive-deps': 'warn',
      'react/jsx-key': 'warn',
    },
  },
  {
    // Ignore patterns from the original .eslintrc.json
    ignores: ['lib/test-utils.ts', '__tests__/**/*'],
  },
];

export default config;