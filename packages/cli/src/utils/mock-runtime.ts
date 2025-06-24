/**
 * Mock runtime utility for CLI commands
 * Provides a minimal runtime instance for CLI operations
 */

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
