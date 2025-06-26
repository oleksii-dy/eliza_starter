/**
 * Mock runtime utility for CLI commands
 * Provides a minimal runtime instance for CLI operations
 */

// TODO: REPLACE - Replace mock runtime with real runtime factory
// REASON: Mock runtime doesn't validate actual functionality
// PLAN: Create real runtime factory using actual AgentRuntime class
// IMPACT: All tests will use real runtime instead of mocks

import { createRealRuntime } from './real-runtime-factory.js';
import { cliTestAgent } from '../characters/cli-test-agent.js';
import { createMockRuntime as createCoreMockRuntime } from '@elizaos/core/test-utils';

import type { IAgentRuntime } from '@elizaos/core';

export function createMockRuntime(): IAgentRuntime {
  // Use the unified mock runtime from core with CLI-specific overrides
  return createCoreMockRuntime({
    agentId: 'cli-mock-agent',
    character: {
      id: 'cli-mock-agent',
      name: 'CLI Mock Agent',
      bio: ['Mock agent for CLI operations'],
      system: 'Mock system prompt',
      messageExamples: [],
      postExamples: [],
      topics: [],
      knowledge: [],
      plugins: [],
    },
  });
}

/**
 * Create a real runtime for scenario testing
 * This replaces the mock runtime with actual functionality
 */
export async function createRuntimeForScenarios(): Promise<IAgentRuntime> {
  return createRealRuntime(cliTestAgent);
}
