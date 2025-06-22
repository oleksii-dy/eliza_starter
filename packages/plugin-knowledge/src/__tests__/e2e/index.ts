import type { TestSuite } from '@elizaos/core';
import knowledgeE2ETest from './knowledge-e2e.test';
import startupLoadingTest from './startup-loading.test';
import attachmentHandlingTest from './attachment-handling.test';
import advancedFeaturesE2ETest from './advanced-features-e2e.test';

/**
 * E2E Test Suite for Knowledge Plugin
 * 
 * This suite contains end-to-end tests that require a full runtime environment.
 * These tests verify the complete functionality of the knowledge plugin including
 * document loading, processing, retrieval, and integration with other components.
 */
export class KnowledgeE2ETestSuite implements TestSuite {
  name = 'knowledge-e2e';
  description = 'End-to-end tests for the Knowledge plugin with full runtime';

  tests = [
    knowledgeE2ETest,
    startupLoadingTest,
    attachmentHandlingTest,
    advancedFeaturesE2ETest,
  ];
}

export default new KnowledgeE2ETestSuite();

// Export individual tests for direct access
export {
  knowledgeE2ETest,
  startupLoadingTest,
  attachmentHandlingTest,
  advancedFeaturesE2ETest,
}; 