import type { TestSuite } from '@elizaos/core';
import validationTestSuite from './validation.runtime.test';
import uxFlowTestSuite from './ux-flow.runtime.test';

// Export all unit/integration test suites
export const unitTestSuites: TestSuite[] = [
  validationTestSuite,
  uxFlowTestSuite
];

export default unitTestSuites;