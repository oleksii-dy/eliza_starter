import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import type { IAgentRuntime, Memory, State } from '@elizaos/core';
import type { UUID } from '@elizaos/core';
import { reflectionEvaluator } from '../reflection';

const createMockRuntime = (): IAgentRuntime => {
  return {
    agentId: 'test-agent' as UUID,
    getCache: vi.fn().mockResolvedValue(null),
    setCache: vi.fn().mockResolvedValue(true),
    getMemories: vi.fn().mockResolvedValue([
      { id: 'msg-1', content: { text: 'Hello' } },
      { id: 'msg-2', content: { text: 'How are you?' } },
      { id: 'msg-3', content: { text: 'I am fine' } },
      { id: 'msg-4', content: { text: 'Great!' } },
      { id: 'msg-5', content: { text: 'What about you?' } },
    ]),
    getConversationLength: vi.fn().mockReturnValue(4),
    getRelationships: vi.fn().mockResolvedValue([]),
    getRoom: vi.fn().mockResolvedValue({
      id: 'room-1',
      name: 'Test Room',
      source: 'test'
    }),
    getEntitiesForRoom: vi.fn().mockResolvedValue([
      { id: 'entity-1', names: ['User 1'] },
      { id: 'test-agent', names: ['Test Agent'] }
    ]),
    getMemoriesByRoomIds: vi.fn().mockResolvedValue([
      { userId: 'entity-1', agentId: 'test-agent' },
      { userId: 'test-agent', agentId: 'test-agent' }
    ]),
    useModel: vi.fn().mockResolvedValue({
      thought: 'I am reflecting on this conversation',
      facts: [
        {
          claim: 'User is feeling fine',
          type: 'fact',
          in_bio: false,
          already_known: false,
        },
      ],
      relationships: []
    }),
    addEmbeddingToMemory: vi.fn().mockImplementation((memory) => ({
      ...memory,
      id: `fact-${Date.now()}`,
    })),
    createMemory: vi.fn().mockResolvedValue(true),
    updateRelationship: vi.fn().mockResolvedValue(true),
    createRelationship: vi.fn().mockResolvedValue(true),
  } as any;
};

const createMockMemory = (text: string, entityId: UUID): Memory =>
  ({
    id: 'msg-current' as UUID,
    entityId,
    agentId: 'test-agent' as UUID,
    content: {
      text,
      channelType: 'group',
    },
    roomId: 'room-1' as UUID,
  }) as Memory;

describe('reflectionEvaluator', () => {
  let runtime: IAgentRuntime;
  const testEntityId = 'entity-1' as UUID;

  beforeEach(() => {
    runtime = createMockRuntime();
    vi.clearAllMocks();
  });

  it('should validate when enough messages have accumulated', async () => {
    const memory = createMockMemory('test', testEntityId);

    // Should validate when messages > conversation length / 4
    expect(await reflectionEvaluator.validate(runtime, memory)).toBe(true);
  });

  it('should not validate when not enough messages', async () => {
    // Set up runtime to return only 1 message
    (runtime.getMemories as Mock).mockResolvedValue([{ id: 'msg-1', content: { text: 'Hello' } }]);

    const memory = createMockMemory('test', testEntityId);

    expect(await reflectionEvaluator.validate(runtime, memory)).toBe(false);
  });

  it('should evaluate and extract facts and relationships', async () => {
    const memory = createMockMemory('I trust you completely', testEntityId);
    const state = {} as State;

    const result = await reflectionEvaluator.handler(runtime, memory, state);

    expect(runtime.useModel).toHaveBeenCalled();
    expect(runtime.createMemory).toHaveBeenCalled();
    expect(runtime.setCache).toHaveBeenCalledWith(
      'room-1-reflection-last-processed',
      'msg-current'
    );
    expect(result).toHaveProperty('thought');
    expect(result).toHaveProperty('facts');
    expect(result).toHaveProperty('relationships');
  });

  it('should handle errors gracefully', async () => {
    (runtime.useModel as Mock).mockRejectedValue(new Error('Model error'));

    const memory = createMockMemory('test', testEntityId);
    const state = {} as State;

    // Should not throw
    const result = await reflectionEvaluator.handler(runtime, memory, state);
    expect(result).toBeUndefined();
  });

  it('should skip reflection if last processed message is recent', async () => {
    // Set cache to return the last message ID
    (runtime.getCache as Mock).mockResolvedValue('msg-4');
    (runtime.getMemories as Mock).mockResolvedValue([
      { id: 'msg-1', content: { text: 'Hello' } },
      { id: 'msg-2', content: { text: 'How are you?' } },
      { id: 'msg-3', content: { text: 'I am fine' } },
      { id: 'msg-4', content: { text: 'Great!' } },
      { id: 'msg-5', content: { text: 'What about you?' } },
    ]);

    const memory = createMockMemory('test', testEntityId);

    // Should not validate because only 1 new message since last reflection
    expect(await reflectionEvaluator.validate(runtime, memory)).toBe(false);
  });
});
