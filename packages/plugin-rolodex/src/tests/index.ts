import type { TestSuite } from '../core-types';
import comprehensiveTests from '../__tests__/e2e';
import runtimeTests from '../__tests__/runtime';

// Export all test suites
export const testSuites: TestSuite[] = [
  // Runtime tests using real ElizaOS runtime with LLM
  runtimeTests,
  
  // Comprehensive E2E test suite
  comprehensiveTests,
];

// Main test suite for the plugin
export const rolodexTestSuite: TestSuite = {
  name: 'Rolodex Plugin Test Suite',
  description: 'All tests for the Rolodex plugin',
  tests: [
    ...runtimeTests.tests,
    ...comprehensiveTests.tests,
  ],
};

export default rolodexTestSuite;
