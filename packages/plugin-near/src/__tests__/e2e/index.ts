import nearPluginTestSuite from './near-plugin.e2e.js';
import storageServiceIntegrationTest from './storage-integration.e2e.js';
import agentInteractionsE2ETest from './agent-interactions.e2e.js';
import multiAgentCommunicationTest from './multi-agent-communication.e2e.js';
import realContractsTestSuite from './real-contracts.e2e.js';
import agentMessageHandlingTestSuite from './agent-message-handling.e2e.js';

export const testSuites = [
  nearPluginTestSuite,
  storageServiceIntegrationTest,
  agentInteractionsE2ETest,
  multiAgentCommunicationTest,
  realContractsTestSuite,
  agentMessageHandlingTestSuite,
];

export default testSuites;
