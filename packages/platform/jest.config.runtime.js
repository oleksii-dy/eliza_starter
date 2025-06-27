/**
 * Jest configuration for runtime integration tests
 * Tests billing functionality using real ElizaOS runtime
 */

const path = require('path');

module.exports = {
  displayName: 'Runtime Integration Tests',
  testEnvironment: 'node',

  // Test file patterns for runtime tests
  testMatch: [
    '**/__tests__/**/runtime/*.test.{js,ts}',
    '**/__tests__/**/*.runtime.test.{js,ts}',
  ],

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup/runtime-setup.ts'],

  // Module path mapping
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@elizaos/(.*)$': '<rootDir>/../../$1/src',
  },

  // Transform configuration
  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        tsconfig: {
          jsx: 'react-jsx',
          resolveJsonModule: true,
          allowSyntheticDefaultImports: true,
          esModuleInterop: true,
        },
      },
    ],
  },

  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],

  // Coverage configuration for runtime tests
  collectCoverageFrom: [
    'lib/billing/**/*.{ts,tsx}',
    'app/api/billing/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/__tests__/**',
    '!**/node_modules/**',
  ],

  coverageDirectory: '<rootDir>/coverage/runtime',
  coverageReporters: ['text', 'lcov', 'html'],

  // Extended timeout for runtime tests
  testTimeout: 60000, // 60 seconds for runtime initialization

  // Environment variables for runtime tests
  setupFiles: ['<rootDir>/__tests__/setup/runtime-env.ts'],

  // Detect open handles
  detectOpenHandles: true,
  forceExit: true,

  // Run tests sequentially for runtime stability
  maxWorkers: 1,

  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true,

  // Ignore patterns
  testPathIgnorePatterns: ['/node_modules/', '/.next/', '/dist/', '/coverage/'],

  // Module directories
  moduleDirectories: ['node_modules', '<rootDir>', '<rootDir>/../..'],

  // Global configuration
  globals: {
    'ts-jest': {
      useESM: false,
      isolatedModules: true,
    },
  },

  // Transform ignore patterns for ESM modules
  transformIgnorePatterns: ['node_modules/(?!(uuid|@elizaos)/)'],

  // Error handling
  errorOnDeprecated: true,

  // Verbose output for debugging
  verbose: true,

  // Bail on first test failure for faster feedback
  bail: false,

  // Test result processor
  testResultsProcessor: undefined,

  // Custom test runner
  runner: 'jest-runner',
};
