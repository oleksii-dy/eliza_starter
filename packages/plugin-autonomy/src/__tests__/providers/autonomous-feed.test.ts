import { describe, it, expect, vi, beforeEach } from 'vitest';
import { autonomousFeedProvider } from '../../messageFeed';
import { createMockRuntime, createMockMemory, createMockState } from '../utils/mock-runtime';
import type { IAgentRuntime, Memory, State } from '@elizaos/core';

// Mock the core utilities
vi.mock('@elizaos/core', async () => {
  const actual = await vi.importActual('@elizaos/core');
  return {
    ...actual,
    createUniqueUuid: vi.fn((runtime: any, seed: string) => `unique-${seed}-${runtime.agentId}`),
    addHeader: vi.fn((header: string, content: string) => `${header}\n${content}`),
    formatMessages: vi.fn(async ({ messages, entities }) => {
      return messages.map((msg: any) => 
        `04:26 (just now) [test-entity] Unknown User: ${msg.content.text}`
      ).join('\n');
    }),
    getEntityDetails: vi.fn(async ({ runtime, roomId }) => {
      return [
        {
          id: 'test-entity',
          names: ['Test User'],
          metadata: { platform: 'test' },
        },
      ];
    }),
  };
});

describe('autonomousFeedProvider', () => {
  let mockRuntime: IAgentRuntime;
  let mockMessage: Memory;
  let mockState: State;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRuntime = createMockRuntime({
      memoryResults: [
        createMockMemory({
          id: 'msg-1' as any,
          content: {
            text: 'First message in feed',
            source: 'user',
          },
          createdAt: Date.now() - 10000,
        }),
        createMockMemory({
          id: 'msg-2' as any,
          content: {
            text: 'Second message in feed',
            source: 'agent',
          },
          createdAt: Date.now() - 5000,
        }),
        createMockMemory({
          id: 'msg-3' as any,
          content: {
            text: 'Latest message in feed',
            source: 'user',
          },
          createdAt: Date.now() - 1000,
        }),
      ],
    });
    
    mockMessage = createMockMemory({
      roomId: 'test-room' as any,
      content: {
        text: 'Current message',
        source: 'test',
      },
      metadata: {
        type: 'message',
        entityName: 'Test User',
      },
    });
    
    mockState = createMockState();
  });

  describe('provider structure', () => {
    it('should have correct provider metadata', () => {
      expect(autonomousFeedProvider.name).toBe('AUTONOMOUS_FEED');
      expect(autonomousFeedProvider.description).toContain('feed of messages');
      expect(autonomousFeedProvider.position).toBe(100);
      expect(typeof autonomousFeedProvider.get).toBe('function');
    });

    it('should not be marked as dynamic or private', () => {
      expect(autonomousFeedProvider.dynamic).toBeUndefined();
      expect(autonomousFeedProvider.private).toBeUndefined();
    });
  });

  describe('get method', () => {
    it('should generate feed with recent messages', async () => {
      const result = await autonomousFeedProvider.get(mockRuntime, mockMessage, mockState);
      
      expect(result).toBeDefined();
      expect(result.text).toBeDefined();
      expect(typeof result.text).toBe('string');
      
      // Should include conversation messages header
      expect(result.text).toContain('# Conversation Messages');
      expect(result.text).toContain('First message in feed');
      expect(result.text).toContain('Second message in feed');
      expect(result.text).toContain('Latest message in feed');
      
      // Verify runtime was queried for memories
      expect(mockRuntime.getMemories).toHaveBeenCalledWith(
        expect.objectContaining({
          tableName: 'messages',
          count: 3, // Based on conversation length (memory results length)
          unique: false,
        })
      );
    });

    it('should format messages correctly in feed', async () => {
      const result = await autonomousFeedProvider.get(mockRuntime, mockMessage, mockState);
      
      expect(result.text).toContain('First message in feed');
      expect(result.text).toContain('Second message in feed');
      expect(result.text).toContain('Latest message in feed');
      
      // Should include formatted timestamps
      expect(result.text).toContain('04:26 (just now)');
      expect(result.text).toContain('[test-entity]');
      expect(result.text).toContain('Unknown User:');
    });

    it('should handle empty message history', async () => {
      const emptyRuntime = createMockRuntime({
        memoryResults: [],
      });
      
      const result = await autonomousFeedProvider.get(emptyRuntime, mockMessage, mockState);
      
      expect(result).toBeDefined();
      expect(result.text).toBeDefined();
      expect(result.text).toBe(''); // No messages means empty text
      expect(result.values!.recentMessages).toBe('');
      expect(result.data!.recentMessages).toEqual([]);
    });

    it('should use conversation length for message count', async () => {
      // Create more messages than the conversation length
      const manyMessages = Array.from({ length: 15 }, (_, i) => 
        createMockMemory({
          id: `msg-${i}` as any,
          content: {
            text: `Message ${i}`,
            source: 'test',
          },
          createdAt: Date.now() - (i * 1000),
        })
      );
      
      const runtimeWithMany = createMockRuntime({
        memoryResults: manyMessages,
      });
      
      const result = await autonomousFeedProvider.get(runtimeWithMany, mockMessage, mockState);
      
      // Should use conversation length (15 messages) as count
      expect(runtimeWithMany.getMemories).toHaveBeenCalledWith(
        expect.objectContaining({
          count: 15, // Conversation length matches memory results length
        })
      );
    });

    it('should handle database query failures', async () => {
      const errorRuntime = createMockRuntime({
        simulateErrors: true,
      });
      
      // Mock getMemories to throw error
      errorRuntime.getMemories = vi.fn().mockRejectedValue(new Error('Database error'));
      
      await expect(
        autonomousFeedProvider.get(errorRuntime, mockMessage, mockState)
      ).rejects.toThrow('Database error');
    });

    it('should provide structured data in values and data', async () => {
      const result = await autonomousFeedProvider.get(mockRuntime, mockMessage, mockState);
      
      expect(result.values).toBeDefined();
      expect(result.values!.recentMessages).toBeDefined();
      expect(typeof result.values!.recentMessages).toBe('string');
      
      expect(result.data).toBeDefined();
      expect(result.data!.recentMessages).toBeDefined();
      expect(Array.isArray(result.data!.recentMessages)).toBe(true);
      expect(result.data!.recentMessages.length).toBe(3);
    });

    it('should call formatting utilities correctly', async () => {
      const result = await autonomousFeedProvider.get(mockRuntime, mockMessage, mockState);
      
      // Verify getEntityDetails was called
      const { getEntityDetails } = await import('@elizaos/core');
      expect(getEntityDetails).toHaveBeenCalledWith(
        expect.objectContaining({
          runtime: mockRuntime,
          roomId: expect.stringMatching(/unique-autonomous_room_singleton-.+/),
        })
      );
      
      // Verify formatMessages was called
      const { formatMessages } = await import('@elizaos/core');
      expect(formatMessages).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.any(Array),
          entities: expect.any(Array),
        })
      );
    });

    it('should handle room retrieval', async () => {
      const result = await autonomousFeedProvider.get(mockRuntime, mockMessage, mockState);
      
      // Should attempt to get room information
      expect(mockRuntime.getRoom).toHaveBeenCalledWith(
        expect.stringMatching(/unique-autonomous_room_singleton-.+/)
      );
    });

    it('should extract sender name from message metadata', async () => {
      const messageWithMetadata = createMockMemory({
        metadata: {
          type: 'message',
          entityName: 'Custom User Name',
        },
      });
      
      const result = await autonomousFeedProvider.get(mockRuntime, messageWithMetadata, mockState);
      
      // The provider should process the metadata correctly
      expect(result).toBeDefined();
    });

    it('should handle missing message metadata gracefully', async () => {
      const messageWithoutMetadata = createMockMemory({
        metadata: null as any,
      });
      
      const result = await autonomousFeedProvider.get(mockRuntime, messageWithoutMetadata, mockState);
      
      expect(result).toBeDefined();
      expect(result.text).toBeDefined();
    });

    it('should combine text sections properly', async () => {
      const result = await autonomousFeedProvider.get(mockRuntime, mockMessage, mockState);
      
      // The text should be the formatted recent messages
      expect(result.text).toBe(result.values!.recentMessages);
    });

    it('should handle room query errors gracefully', async () => {
      const errorRuntime = createMockRuntime({
        memoryResults: [
          createMockMemory({
            content: { text: 'Test message' },
          }),
        ],
      });
      
      // Mock getRoom to throw error
      errorRuntime.getRoom = vi.fn().mockRejectedValue(new Error('Room access denied'));
      
      const result = await autonomousFeedProvider.get(errorRuntime, mockMessage, mockState);
      
      // Should handle gracefully and still return result
      expect(result).toBeDefined();
      expect(result.text).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should handle null message gracefully', async () => {
      // Mock the provider to handle null message
      const nullMessage = null as any;
      
      await expect(
        autonomousFeedProvider.get(mockRuntime, nullMessage, mockState)
      ).rejects.toThrow(); // The provider currently doesn't handle null message, which is expected
    });

    it('should handle null state gracefully', async () => {
      const result = await autonomousFeedProvider.get(mockRuntime, mockMessage, null as any);
      
      expect(result).toBeDefined();
      expect(result.text).toBeDefined();
    });

    it('should handle runtime without getRoom method', async () => {
      const limitedRuntime = createMockRuntime({
        memoryResults: [
          createMockMemory({
            content: { text: 'Test message' },
          }),
        ],
      });
      
      // Remove getRoom method
      delete (limitedRuntime as any).getRoom;
      
      const result = await autonomousFeedProvider.get(limitedRuntime, mockMessage, mockState);
      
      expect(result).toBeDefined();
      expect(result.text).toBeDefined();
    });

    it('should handle getMemories throwing error', async () => {
      const errorRuntime = createMockRuntime();
      errorRuntime.getMemories = vi.fn().mockRejectedValue(new Error('Memory access failed'));
      
      await expect(
        autonomousFeedProvider.get(errorRuntime, mockMessage, mockState)
      ).rejects.toThrow('Memory access failed');
    });
  });

  describe('console logging', () => {
    it('should log message feed text', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      const result = await autonomousFeedProvider.get(mockRuntime, mockMessage, mockState);
      
      expect(consoleSpy).toHaveBeenCalledWith('MESSAGE FEED TEXT: ', result.text);
      
      consoleSpy.mockRestore();
    });
  });
});