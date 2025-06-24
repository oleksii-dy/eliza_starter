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

import type { IAgentRuntime } from '@elizaos/core';

export function createMockRuntime(): IAgentRuntime {
  return {
    agentId: 'cli-mock-agent',
    character: {
      name: 'CLI Mock Agent',
      bio: ['Mock agent for CLI operations'],
      system: 'Mock system prompt',
      messageExamples: [],
      postExamples: [],
      topics: [],
      knowledge: [],
      plugins: [],
    },
    plugins: [],
    actions: [],
    providers: [],
    evaluators: [],
    services: new Map(),
    events: new Map(),
    routes: [],
    initialize: async () => {},
    registerPlugin: async () => {},
    getService: () => null,
    composeState: async () => ({ values: {}, data: {}, text: '' }),
    useModel: async () => 'mock response',
    processActions: async () => {},
    evaluate: async () => null,
    getSetting: () => null,
    // Add other required methods as needed
  } as any as IAgentRuntime;
}

/**
 * Create a real runtime for scenario testing
 * This replaces the mock runtime with actual functionality
 */
export async function createRuntimeForScenarios(): Promise<IAgentRuntime> {
  return createRealRuntime(cliTestAgent);
}
