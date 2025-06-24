import { describe, it, expect, mock, beforeEach, type Mock } from 'bun:test';
import type { IAgentRuntime, Memory, State } from '@elizaos/core';
import type { UUID } from '@elizaos/core';
import { trustChangeEvaluator } from '../trustChangeEvaluator';

const createMockRuntime = (): IAgentRuntime =>
  ({
    agentId: 'test-agent' as UUID,
    getService: mock()
  } as any);

const createMockMemory = (text: string, entityId: UUID): Memory =>
  ({
    id: 'msg-1' as UUID,
    entityId,
    content: {
      text
    },
    roomId: 'room-1' as UUID
  } as Memory);

describe('trustChangeEvaluator', () => {
  let runtime: IAgentRuntime;
  let trustService: any;
  const testEntityId = 'entity-1' as UUID;

  beforeEach(() => {
    runtime = createMockRuntime();
    trustService = {
      recordInteraction: mock().mockResolvedValue({ success: true })
    };
    (runtime.getService as unknown as Mock).mockImplementation((name: string) => {
      if (name === 'trust-engine') {return trustService;}
      if (name === 'llm-evaluator') {return null;} // No LLM evaluator for these tests
      return null;
    });
  });

  it('should validate when trust service is available', async () => {
    const memory = createMockMemory('test', testEntityId);
    const state = {} as State;

    expect(await trustChangeEvaluator.validate(runtime, memory, state)).toBe(true);
  });

  it('should not validate when trust service is unavailable', async () => {
    (runtime.getService as unknown as Mock).mockReturnValue(null);

    const memory = createMockMemory('test', testEntityId);
    const state = {} as State;

    expect(await trustChangeEvaluator.validate(runtime, memory, state)).toBe(false);
  });

  it('should analyze trust evidence and update trust', async () => {
    const memory = createMockMemory('Thank you for your help!', testEntityId);
    const state = {} as State;

    const result = await trustChangeEvaluator.handler(runtime, memory, state);

    expect(trustService.recordInteraction).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceEntityId: testEntityId,
        targetEntityId: 'test-agent',
        type: 'HELPFUL_ACTION',
        impact: 5
      })
    );
    expect(result).toBeDefined();
    if (result && typeof result === 'object' && 'data' in result) {
      expect(result.data?.positive).toBe(true);
    }
  });

  it('should detect negative behaviors', async () => {
    const memory = createMockMemory('This is spam spam spam!', testEntityId);
    const state = {} as State;

    const result = await trustChangeEvaluator.handler(runtime, memory, state);

    expect(trustService.recordInteraction).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceEntityId: testEntityId,
        targetEntityId: 'test-agent',
        type: 'SPAM_BEHAVIOR',
        impact: -10
      })
    );
    expect(result).toBeDefined();
    if (result && typeof result === 'object' && 'data' in result) {
      expect(result.data?.positive).toBe(false);
    }
  });

  it('should not update trust if no patterns match', async () => {
    const memory = createMockMemory('Hello, how are you?', testEntityId);
    const state = {} as State;

    const result = await trustChangeEvaluator.handler(runtime, memory, state);

    expect(trustService.recordInteraction).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });

  it('should handle errors gracefully', async () => {
    trustService.recordInteraction.mockRejectedValue(new Error('Database error'));

    const memory = createMockMemory('Thank you!', testEntityId);
    const state = {} as State;

    // Should not throw
    const result = await trustChangeEvaluator.handler(runtime, memory, state);
    expect(result).toBeNull();
  });
});
