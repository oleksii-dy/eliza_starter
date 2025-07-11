import { type TestSuite } from '@elizaos/core';
import { CodeGenerationE2ETestSuite } from './code-generation.test';
import claudeCodeIntegrationTestSuite from './claude-code-integration.test';
import claudeCodeStressTestSuite from './claude-code-stress-test';

// Export all E2E test suites for the plugin
export const testSuites: TestSuite[] = [
  new CodeGenerationE2ETestSuite(),
  claudeCodeIntegrationTestSuite,
  claudeCodeStressTestSuite,
];

export default testSuites;
