import selfModificationTestSuite from './self-modification.test.js';
import agentIntegrationTestSuite from '../integration/agent-integration.test.js';
import realRuntimeTestSuite from '../real-runtime/self-modification-real.test.js';

export const testSuites = [
  realRuntimeTestSuite,         // REAL runtime tests first (highest priority)
  selfModificationTestSuite,
  agentIntegrationTestSuite
];

export default testSuites;