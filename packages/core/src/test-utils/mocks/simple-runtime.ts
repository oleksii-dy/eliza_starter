/**
 * @fileoverview Simplified runtime mock for immediate use
 */

import { vi } from './vi-helper';
import type {
  IAgentRuntime,
  Character,
  Memory,
  State,
  UUID,
} from '../../types';

export function createMockRuntime(overrides: Partial<IAgentRuntime> = {}): IAgentRuntime {
  const defaultCharacter: Character = {
    name: 'TestAgent',
    bio: ['A test agent'],
    messageExamples: [],
    postExamples: [],
    topics: [],
    adjectives: [],
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
    getSetting: vi.fn().mockReturnValue('test-value'),
    useModel: vi.fn().mockResolvedValue('mock response'),
    composeState: vi.fn().mockResolvedValue({
      values: {},
      data: {},
      text: '',
    }),
    
    // Database methods
    getMemories: vi.fn().mockResolvedValue([]),
    createMemory: vi.fn().mockResolvedValue('test-memory-id' as UUID),
    
    // Service methods
    getService: vi.fn().mockReturnValue(null),
    
    // Apply overrides
    ...overrides,
  } as IAgentRuntime;

  return baseRuntime;
}

// Note: vi is used internally but not exported to avoid conflicts