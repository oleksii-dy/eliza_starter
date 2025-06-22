import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import type { IAgentRuntime, Memory, State } from '@elizaos/core';
import type { UUID } from '@elizaos/core';
import { recordTrustInteractionAction } from '../recordTrustInteraction';
import type { TrustInteraction } from '../../types/trust';

const createMockRuntime = (): IAgentRuntime =>
  ({
    agentId: 'test-agent' as UUID,
    getService: vi.fn()
  } as any);

const createMockMemory = (text: string, entityId: UUID): Memory =>
  ({
    entityId,
    content: {
      text
    },
    roomId: 'room-1' as UUID
  } as Memory);

describe('recordTrustInteractionAction', () => {
  let runtime: IAgentRuntime;
  let trustService: any;
  const testEntityId = 'entity-1' as UUID;

  beforeEach(() => {
    runtime = createMockRuntime();
    trustService = {
      recordInteraction: vi.fn().mockResolvedValue({ success: true })
    };
    (runtime.getService as unknown as Mock).mockReturnValue(trustService);
  });

  it('should record a trust interaction', async () => {
    const memory = createMockMemory(
      '{"type": "HELPFUL_ACTION", "impact": 5, "description": "Helped with task"}',
      testEntityId
    );

    const result = await recordTrustInteractionAction.handler(runtime, memory);

    expect(trustService.recordInteraction).toHaveBeenCalled();
    const calledWith = trustService.recordInteraction.mock.calls[0][0];
    expect(calledWith.sourceEntityId).toBe(testEntityId);
    expect(calledWith.targetEntityId).toBe('test-agent');
    expect(calledWith.type).toBe('HELPFUL_ACTION');
    expect(calledWith.impact).toBe(5); // Now properly converted to number
    expect(calledWith.details.description).toBe('Helped with task');

    expect(result).toBeDefined();
    expect((result as any).text).toContain('Trust interaction recorded');
  });

  it('should validate the action correctly', async () => {
    const memory = createMockMemory('test', testEntityId);
    const state = {} as State;
    
    // Mock trust-engine service
    (runtime.getService as unknown as Mock).mockImplementation((name: string) => {
      if (name === 'trust-engine') return trustService;
      return null;
    });
    
    expect(await recordTrustInteractionAction.validate(runtime, memory, state)).toBe(true);
    
    (runtime.getService as unknown as Mock).mockReturnValue(null);
    expect(await recordTrustInteractionAction.validate(runtime, memory, state)).toBe(false);
  });

  it('should handle errors gracefully', async () => {
    trustService.recordInteraction.mockRejectedValue(new Error('Database error'));

    const memory = createMockMemory(
      '{"type": "HELPFUL_ACTION", "impact": 5}',
      testEntityId
    );

    const result = await recordTrustInteractionAction.handler(runtime, memory);

    expect((result as any).text).toContain('Failed to record trust interaction');
    expect((result as any).error).toBe(true);
  });

  it('should handle invalid JSON input', async () => {
    const memory = createMockMemory('invalid json', testEntityId);

    const result = await recordTrustInteractionAction.handler(runtime, memory);

    expect((result as any).text).toContain('Could not parse trust interaction details');
    expect((result as any).error).toBe(true);
  });
});
