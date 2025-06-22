import { describe, it, expect, vi, beforeEach } from 'vitest';
import { reflectAction } from '../../reflect';
import { createMockRuntime, createMockMemory, createMockState } from '../utils/mock-runtime';
import type { IAgentRuntime, Memory, State, ModelType } from '@elizaos/core';

describe('reflectAction', () => {
  let mockRuntime: IAgentRuntime;
  let mockMemory: Memory;
  let mockState: State;
  let mockCallback: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRuntime = createMockRuntime({
      modelResponses: {
        'TEXT_SMALL': `<response>
          <thought>This is a test reflection</thought>
          <message>I'm thinking about the current situation.</message>
        </response>`,
      },
    });
    mockMemory = createMockMemory({
      content: {
        text: 'Hello, how are you?',
        source: 'test',
      },
    });
    mockState = createMockState();
    mockCallback = vi.fn();
  });

  describe('validate', () => {
    it('should always return true', async () => {
      const result = await reflectAction.validate(mockRuntime, mockMemory, mockState);
      expect(result).toBe(true);
    });

    it('should handle runtime without dependencies', async () => {
      const limitedRuntime = createMockRuntime({ simulateErrors: true });
      const result = await reflectAction.validate(limitedRuntime, mockMemory, mockState);
      expect(result).toBe(true);
    });
  });

  describe('handler', () => {
    it('should process reflection with LLM when no existing responses', async () => {
      await reflectAction.handler(
        mockRuntime,
        mockMemory,
        mockState,
        {},
        mockCallback,
        []
      );

      // Verify LLM was called
      expect(mockRuntime.useModel).toHaveBeenCalledWith(
        'TEXT_SMALL',
        expect.objectContaining({
          prompt: expect.stringContaining('reflection'),
        })
      );

      // Verify memory was created
      expect(mockRuntime.createMemory).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.objectContaining({
            text: expect.stringContaining("I'm thinking"),
            thought: expect.stringContaining('reflection'),
            actions: ['REFLECT'],
          }),
        }),
        'messages'
      );

      // Verify callback was called
      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining("I'm thinking"),
          thought: expect.stringContaining('reflection'),
          actions: ['REFLECT'],
        })
      );
    });

    it('should use existing responses when available', async () => {
      const existingResponses = [
        createMockMemory({
          content: {
            text: 'Existing reflection response',
            thought: 'Existing thought',
            message: 'Existing message',
            actions: ['REFLECT'],
          },
        }),
      ];

      await reflectAction.handler(
        mockRuntime,
        mockMemory,
        mockState,
        {},
        mockCallback,
        existingResponses
      );

      // Verify LLM was NOT called when responses exist
      expect(mockRuntime.useModel).not.toHaveBeenCalled();

      // Verify callback was called with existing response
      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          text: 'Existing message',
          thought: 'Existing thought',
          actions: ['REFLECT'],
        })
      );
    });

    it('should handle LLM errors gracefully', async () => {
      const errorRuntime = createMockRuntime({
        modelErrors: {
          'TEXT_SMALL': new Error('LLM service unavailable'),
        },
      });

      await expect(
        reflectAction.handler(
          errorRuntime,
          mockMemory,
          mockState,
          {},
          mockCallback,
          []
        )
      ).rejects.toThrow('LLM service unavailable');
    });

    it('should handle malformed XML response', async () => {
      const malformedRuntime = createMockRuntime({
        modelResponses: {
          'TEXT_SMALL': 'Invalid XML response without proper tags',
        },
      });

      await reflectAction.handler(
        malformedRuntime,
        mockMemory,
        mockState,
        {},
        mockCallback,
        []
      );

      // Should handle gracefully with fallback values
      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          thought: 'Reflecting on the situation.',
          text: '',
          actions: ['REFLECT'],
        })
      );
    });

    it('should compose state with correct providers', async () => {
      const memoryWithProviders = createMockMemory({
        content: {
          text: 'Test message',
          providers: ['CUSTOM_PROVIDER'],
        },
      });

      await reflectAction.handler(
        mockRuntime,
        memoryWithProviders,
        mockState,
        {},
        mockCallback,
        []
      );

      // Verify state composition included custom providers
      expect(mockRuntime.composeState).toHaveBeenCalledWith(
        memoryWithProviders,
        ['CUSTOM_PROVIDER', 'AUTONOMOUS_FEED']
      );
    });

    it('should handle memory creation failures', async () => {
      const errorRuntime = createMockRuntime({
        modelResponses: {
          'TEXT_SMALL': `<response>
            <thought>Test thought</thought>
            <message>Test message</message>
          </response>`,
        },
        memoryErrors: [new Error('Memory creation failed')],
      });

      await expect(
        reflectAction.handler(
          errorRuntime,
          mockMemory,
          mockState,
          {},
          mockCallback,
          []
        )
      ).rejects.toThrow('Memory creation failed');
    });

    it('should create memory with correct structure', async () => {
      await reflectAction.handler(
        mockRuntime,
        mockMemory,
        mockState,
        {},
        mockCallback,
        []
      );

      expect(mockRuntime.createMemory).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.objectContaining({
            text: expect.any(String),
            thought: expect.any(String),
            actions: ['REFLECT'],
          }),
          entityId: expect.any(String),
          agentId: mockRuntime.agentId,
          roomId: mockMemory.roomId,
          worldId: mockMemory.worldId,
        }),
        'messages'
      );
    });

    it('should filter responses correctly', async () => {
      const mixedResponses = [
        createMockMemory({
          content: {
            text: 'Non-reflect response',
            actions: ['OTHER_ACTION'],
          },
        }),
        createMockMemory({
          content: {
            text: 'Reflect response',
            message: 'Reflection message',
            actions: ['REFLECT'],
          },
        }),
      ];

      await reflectAction.handler(
        mockRuntime,
        mockMemory,
        mockState,
        {},
        mockCallback,
        mixedResponses
      );

      // Should use only the REFLECT response
      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          text: 'Reflection message',
          actions: ['REFLECT'],
        })
      );

      // Should not call LLM since REFLECT response exists
      expect(mockRuntime.useModel).not.toHaveBeenCalled();
    });
  });

  describe('action structure', () => {
    it('should have correct action metadata', () => {
      expect(reflectAction.name).toBe('REFLECT');
      expect(reflectAction.similes).toContain('REFLECTION');
      expect(reflectAction.description).toContain('process the current situation');
      expect(typeof reflectAction.validate).toBe('function');
      expect(typeof reflectAction.handler).toBe('function');
      expect(Array.isArray(reflectAction.examples)).toBe(true);
    });

    it('should have valid examples', () => {
      expect(reflectAction.examples!.length).toBeGreaterThan(0);
      
      reflectAction.examples!.forEach((example, index) => {
        expect(Array.isArray(example)).toBe(true);
        expect(example.length).toBeGreaterThanOrEqual(2);
        
        example.forEach((turn) => {
          expect(turn).toHaveProperty('name');
          expect(turn).toHaveProperty('content');
          expect(typeof turn.content).toBe('object');
        });
      });
    });
  });
});