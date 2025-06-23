import type { TestSuite } from '@elizaos/core';
import { envScenariosSuite } from './env-scenarios';
import { envPersistenceSuite } from './env-persistence';
import { secretFormsSuite } from './secret-forms';
import { secretsScenariosSuite } from './scenarios.e2e';
import { integrationScenariosSuite } from './integration-scenarios';

// Export all e2e test suites
export const e2eTestSuites: TestSuite[] = [
  envScenariosSuite,
  envPersistenceSuite,
  secretFormsSuite,
  secretsScenariosSuite,
  integrationScenariosSuite
];

export default e2eTestSuites; 