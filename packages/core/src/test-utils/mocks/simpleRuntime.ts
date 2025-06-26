/**
 * @fileoverview Simplified runtime mock for immediate use
 */

import { mock } from './mockUtils';
import type { IAgentRuntime, Character, Memory, State, UUID } from '../../types';

export function createMockRuntime(overrides: Partial<IAgentRuntime> = {}): IAgentRuntime {
  const defaultCharacter: Character = {
    name: 'TestAgent',
    bio: ['A test agent'],
    messageExamples: [],
    postExamples: [],
    topics: [],
    knowledge: [],
    plugins: [],
  };

  const baseRuntime = {
    agentId: 'test-agent-id' as UUID,
    character: overrides.character || defaultCharacter,
    providers: [],
    actions: [],
    evaluators: [],
    plugins: [],
    services: new Map(),
    events: new Map(),
    routes: [],

    // Core methods
    getSetting: mock().mockReturnValue('test-value'),
    useModel: mock().mockResolvedValue('mock response'),
    composeState: mock().mockResolvedValue({
      values: {},
      data: {},
      text: '',
    }),

    // Database methods
    getMemories: mock().mockResolvedValue([]),
    createMemory: mock().mockResolvedValue('test-memory-id' as UUID),

    // Service methods
    getService: mock().mockReturnValue(null),

    // Apply overrides
    ...overrides,
  } as IAgentRuntime;

  return baseRuntime;
}
