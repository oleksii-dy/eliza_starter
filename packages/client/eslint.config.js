import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import reactRefreshPlugin from 'eslint-plugin-react-refresh';

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
      'react-refresh': reactRefreshPlugin,
    },
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        // Browser globals
        window: 'readonly',
        document: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        navigator: 'readonly',
        console: 'readonly',
        fetch: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        
        // DOM types
        Element: 'readonly',
        Event: 'readonly',
        HTMLElement: 'readonly',
        HTMLInputElement: 'readonly',
        HTMLTextAreaElement: 'readonly',
        HTMLFormElement: 'readonly',
        HTMLButtonElement: 'readonly',
        HTMLDivElement: 'readonly',
        HTMLSpanElement: 'readonly',
        HTMLAnchorElement: 'readonly',
        HTMLLIElement: 'readonly',
        HTMLUListElement: 'readonly',
        HTMLParagraphElement: 'readonly',
        HTMLHeadingElement: 'readonly',
        HTMLAudioElement: 'readonly',
        Node: 'readonly',
        MouseEvent: 'readonly',
        KeyboardEvent: 'readonly',
        DragEvent: 'readonly',
        
        // File/Blob APIs
        File: 'readonly',
        FileReader: 'readonly',
        Blob: 'readonly',
        FormData: 'readonly',
        Image: 'readonly',
        
        // Request/Response
        Request: 'readonly',
        Response: 'readonly',
        Headers: 'readonly',
        HeadersInit: 'readonly',
        RequestInit: 'readonly',
        
        // Media APIs
        MediaRecorder: 'readonly',
        MediaStream: 'readonly',
        AudioContext: 'readonly',
        AnalyserNode: 'readonly',
        BlobPart: 'readonly',
        
        // Browser APIs
        ResizeObserver: 'readonly',
        DOMException: 'readonly',
        Navigator: 'readonly',
        
        // React
        React: 'readonly',
        
        // Global functions
        alert: 'readonly',
        confirm: 'readonly',
        
        // Node.js globals (still needed for some build tools)
        process: 'readonly',
        Buffer: 'readonly',
        global: 'readonly',
        globalThis: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        module: 'readonly',
        require: 'readonly',
        exports: 'writable',
      },
    },
    ignores: [
      'node_modules/',
      'dist/',
      'build/',
      'coverage/',
      '.turbo/',
      '.next/',
      '.nuxt/',
      '.output/',
      '.vscode/',
      '.git/',
      '*.min.js',
      '*.min.css',
      'public/',
      'static/',
      '.env*',
      'vite.config.*',
      'tailwind.config.*',
      'postcss.config.*',
      'cypress.config.*',
      'cypress.config.cjs',
      'tsconfig*.json',
      'package-lock.json',
      'yarn.lock',
      'pnpm-lock.yaml',
      'bun.lockb',
    ],
    rules: {
      // TypeScript specific rules
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-inferrable-types': 'off',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/ban-ts-comment': 'warn',
      
      // React specific rules
      'react/react-in-jsx-scope': 'off', // Not needed with new JSX transform
      'react/prop-types': 'off', // Using TypeScript for prop validation
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      
      // General rules
      'no-duplicate-imports': 'warn',
      'no-console': 'off', // Allow console in frontend for debugging
      'no-alert': 'warn', // Allow but warn about alert/confirm
      'no-undef': 'off', // Handled by TypeScript
      'no-unused-vars': 'off', // Handled by TypeScript rule
      'no-useless-catch': 'warn',
      'no-fallthrough': 'warn',
      'no-case-declarations': 'warn',
      'no-control-regex': 'warn',
      'no-useless-escape': 'warn',
      'no-empty': 'warn',
      'no-dupe-keys': 'error',
      'no-redeclare': 'error',
      'no-prototype-builtins': 'error',
      'radix': 'error',
    },
  },
  {
    // Test files
    files: ['**/*.test.{js,ts,tsx}', '**/*.spec.{js,ts,tsx}', '**/__tests__/**/*', '**/*.cy.{js,ts,tsx}'],
    languageOptions: {
      globals: {
        // Testing globals
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        jest: 'readonly',
        
        // Cypress globals
        cy: 'readonly',
        Cypress: 'readonly',
        
        // Bun test globals
        mock: 'readonly',
        spyOn: 'readonly',
      },
    },
    rules: {
      // Relax rules for test files
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      'no-console': 'off',
      'no-undef': 'off',
      'no-duplicate-imports': 'off',
      'no-useless-catch': 'off',
      'no-fallthrough': 'off',
      'no-case-declarations': 'off',
      'no-control-regex': 'off',
      'no-useless-escape': 'off',
      'no-alert': 'off',
    },
  },
  {
    // CommonJS files (like cypress.config.cjs)
    files: ['**/*.cjs'],
    languageOptions: {
      globals: {
        module: 'writable',
        exports: 'writable',
        require: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        global: 'readonly',
        globalThis: 'readonly',
      },
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
      'no-undef': 'off',
    },
  },
];
