import type { TestSuite } from '@elizaos/core';
import { envPersistenceSuite } from './env-persistence';
import { envScenariosSuite } from './env-scenarios';
import { integrationScenariosSuite } from './integration-scenarios';
import { secretsScenariosSuite } from './scenarios.e2e';
import { secretFormsSuite } from './secret-forms';

// Export all e2e test suites
export const e2eTestSuites: TestSuite[] = [
  envScenariosSuite,
  envPersistenceSuite,
  secretFormsSuite,
  secretsScenariosSuite,
  integrationScenariosSuite,
];

export default e2eTestSuites;
