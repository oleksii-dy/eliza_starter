/**
 * Jest configuration for integration tests
 * Specialized configuration for running billing integration tests
 */

const path = require('path');

module.exports = {
  displayName: 'Integration Tests',
  testEnvironment: 'node',
  
  // Test file patterns
  testMatch: [
    '**/__tests__/**/*.integration.test.{js,ts}',
    '**/__tests__/**/integration/*.test.{js,ts}',
  ],
  
  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/__tests__/setup/integration-setup.ts'
  ],
  
  // Module path mapping
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@/lib/(.*)$': '<rootDir>/lib/$1',
    '^@/components/(.*)$': '<rootDir>/components/$1',
    '^@/app/(.*)$': '<rootDir>/app/$1',
  },
  
  // Transform configuration
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        jsx: 'react-jsx',
      },
    }],
  },
  
  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  
  // Coverage configuration
  collectCoverageFrom: [
    'lib/billing/**/*.{ts,tsx}',
    'app/api/billing/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/__tests__/**',
    '!**/node_modules/**',
  ],
  
  coverageDirectory: '<rootDir>/coverage/integration',
  coverageReporters: ['text', 'lcov', 'html'],
  
  // Test timeout for integration tests
  testTimeout: 30000, // 30 seconds
  
  // Environment variables
  setupFiles: ['<rootDir>/__tests__/setup/env-setup.ts'],
  
  // Detect open handles for proper cleanup
  detectOpenHandles: true,
  forceExit: true,
  
  // Global test configuration
  globals: {
    'ts-jest': {
      useESM: false,
    },
  },
  
  // Verbose output for debugging
  verbose: true,
  
  // Run tests in sequence for integration tests to avoid conflicts
  maxWorkers: 1,
  
  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true,
  
  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/.next/',
    '/dist/',
  ],
  
  // Module directories
  moduleDirectories: ['node_modules', '<rootDir>'],
  
  // Error handling
  errorOnDeprecated: true,
};