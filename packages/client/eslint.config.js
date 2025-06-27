import frontendConfig from '../core/configs/eslint/eslint.config.frontend.js';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import reactRefreshPlugin from 'eslint-plugin-react-refresh';

/**
 * ESLint configuration for @elizaos/client
 * Uses the standardized frontend configuration from core/configs
 */
export default [
  ...frontendConfig,
  {
    // Client-specific overrides
    files: ['**/*.{js,jsx,ts,tsx}'],
    plugins: {
      'react-hooks': reactHooksPlugin,
      'react-refresh': reactRefreshPlugin,
    },
    languageOptions: {
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
        confirm: 'readonly',
        alert: 'readonly',
        
        // DOM types
        Element: 'readonly',
        Event: 'readonly',
        Node: 'readonly',
        HTMLElement: 'readonly',
        HTMLInputElement: 'readonly',
        HTMLTextAreaElement: 'readonly',
        HTMLFormElement: 'readonly',
        HTMLButtonElement: 'readonly',
        HTMLDivElement: 'readonly',
        HTMLAnchorElement: 'readonly',
        MouseEvent: 'readonly',
        KeyboardEvent: 'readonly',
        DragEvent: 'readonly',
        
        // File/Blob APIs
        File: 'readonly',
        FileReader: 'readonly',
        Blob: 'readonly',
        BlobPart: 'readonly',
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
        
        // Browser APIs
        ResizeObserver: 'readonly',
        IntersectionObserver: 'readonly',
        DOMException: 'readonly',
        Navigator: 'readonly',
        CanvasRenderingContext2D: 'readonly',
        
        // React
        React: 'readonly',
        
        // Build tool globals
        process: 'readonly',
        global: 'readonly',
        globalThis: 'readonly',
        
        // Core types (for constants.ts)
        CharacterFieldName: 'readonly',
        FieldRequirement: 'readonly',
        
        // Toast types (for use-toast.ts)
        actionTypes: 'readonly',
      },
    },
    rules: {
      // Client-specific rule adjustments
      'no-console': 'off', // Allow console in client for debugging
      'no-alert': 'warn', // Allow but warn about alert/confirm
      'no-undef': 'off', // Turn off no-undef since TypeScript handles this
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
  {
    // Test files - additional globals
    files: ['**/*.test.{js,ts,tsx}', '**/*.spec.{js,ts,tsx}', '**/__tests__/**/*'],
    languageOptions: {
      globals: {
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        jest: 'readonly',
        vi: 'readonly',
        mock: 'readonly',
        spyOn: 'readonly',
      },
    },
    rules: {
      'no-undef': 'off',
    },
  },
  {
    // Cypress files
    files: ['**/*.cy.{js,ts,tsx}'],
    languageOptions: {
      globals: {
        cy: 'readonly',
        Cypress: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        expect: 'readonly',
      },
    },
    rules: {
      'no-undef': 'off',
    },
  },
];
