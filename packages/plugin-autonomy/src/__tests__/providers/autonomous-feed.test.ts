import { describe, it, expect, mock, beforeEach, afterEach } from 'bun:test';
import { autonomousFeedProvider } from '../../messageFeed';
import { createMockRuntime, createMockMemory, createMockState } from '../utils/mock-runtime';
import type { IAgentRuntime, Memory, State } from '@elizaos/core';

describe('Autonomous Feed Provider', () => {
  let mockRuntime: IAgentRuntime;
  let mockMemory: Memory;
  let mockState: State;

  beforeEach(() => {
    mock.restore();

    // Create mock runtime with memory results
    mockRuntime = createMockRuntime({
      memoryResults: [
        createMockMemory({
          id: 'memory-1' as any,
          content: { text: 'First message', source: 'user' },
          createdAt: Date.now() - 300000, // 5 minutes ago
        }),
        createMockMemory({
          id: 'memory-2' as any,
          content: { text: 'Second message', source: 'agent' },
          createdAt: Date.now() - 180000, // 3 minutes ago
        }),
        createMockMemory({
          id: 'memory-3' as any,
          content: { text: 'Third message', source: 'user' },
          createdAt: Date.now() - 60000, // 1 minute ago
        }),
      ],
    });

    mockMemory = createMockMemory({
      content: { text: 'Test message', source: 'test' },
    });

    mockState = createMockState();
  });

  afterEach(() => {
    mock.restore();
  });

  describe('Provider Properties', () => {
    it('should have correct name and configuration', () => {
      expect(autonomousFeedProvider.name).toBe('AUTONOMOUS_FEED');
      expect(autonomousFeedProvider.position).toBe(5);
      expect(autonomousFeedProvider.dynamic).toBe(true);
    });
  });

  describe('get() method', () => {
    it('should return formatted message feed with recent messages', async () => {
      const result = await autonomousFeedProvider.get(mockRuntime, mockMemory, mockState);

      expect(result).toBeDefined();
      expect(result.text).toBeDefined();
      expect(result.text).toContain('Conversation Messages');
      expect(result.data).toBeDefined();
      expect(result.data!.recentMessages).toBeDefined();
      expect(Array.isArray(result.data!.recentMessages)).toBe(true);
    });

    it('should include messages from memory results', async () => {
      const result = await autonomousFeedProvider.get(mockRuntime, mockMemory, mockState);

      // Check that messages are included
      expect(result.data!.recentMessages).toHaveLength(3);
      expect(result.data!.recentMessages[0].content.text).toBe('First message');
      expect(result.data!.recentMessages[1].content.text).toBe('Second message');
      expect(result.data!.recentMessages[2].content.text).toBe('Third message');
    });

    it('should format message text correctly', async () => {
      const result = await autonomousFeedProvider.get(mockRuntime, mockMemory, mockState);

      // The provider should format messages with timestamps and entity info
      expect(result.text).toContain('Unknown User');
      expect(result.text).toContain('First message');
      expect(result.text).toContain('Second message');
      expect(result.text).toContain('Third message');
    });

    it('should handle empty message history', async () => {
      const emptyRuntime = createMockRuntime({
        memoryResults: [],
      });

      const result = await autonomousFeedProvider.get(emptyRuntime, mockMemory, mockState);

      expect(result).toBeDefined();
      expect(result.text).toBeDefined();
      expect(result.data!.recentMessages).toHaveLength(0);
    });

    it('should handle runtime errors gracefully', async () => {
      const errorRuntime = createMockRuntime({
        simulateErrors: true,
      });

      // Mock getMemories to throw an error
      errorRuntime.getMemories = mock().mockRejectedValue(new Error('Memory fetch error'));

      const result = await autonomousFeedProvider.get(errorRuntime, mockMemory, mockState);

      expect(result).toBeDefined();
      expect(result.text).toBeDefined();
      expect(result.data!.recentMessages).toHaveLength(0);
    });

    it('should limit messages to recent timeframe', async () => {
      const runtimeWithOldMessages = createMockRuntime({
        memoryResults: [
          createMockMemory({
            content: { text: 'Very old message', source: 'user' },
            createdAt: Date.now() - 86400000, // 24 hours ago
          }),
          createMockMemory({
            content: { text: 'Recent message', source: 'user' },
            createdAt: Date.now() - 60000, // 1 minute ago
          }),
        ],
      });

      const result = await autonomousFeedProvider.get(
        runtimeWithOldMessages,
        mockMemory,
        mockState
      );

      expect(result.data!.recentMessages).toHaveLength(2);
    });

    it('should handle different message sources', async () => {
      const runtimeWithVariedSources = createMockRuntime({
        memoryResults: [
          createMockMemory({
            content: { text: 'User message', source: 'user' },
          }),
          createMockMemory({
            content: { text: 'Agent message', source: 'agent' },
          }),
          createMockMemory({
            content: { text: 'System message', source: 'system' },
          }),
        ],
      });

      const result = await autonomousFeedProvider.get(
        runtimeWithVariedSources,
        mockMemory,
        mockState
      );

      expect(result.data!.recentMessages).toHaveLength(3);
      expect(result.data!.recentMessages[0].content.source).toBe('user');
      expect(result.data!.recentMessages[1].content.source).toBe('agent');
      expect(result.data!.recentMessages[2].content.source).toBe('system');
    });

    it('should include room and world IDs in query', async () => {
      const memoryWithIds = createMockMemory({
        roomId: 'specific-room' as any,
        worldId: 'specific-world' as any,
      });

      await autonomousFeedProvider.get(mockRuntime, memoryWithIds, mockState);

      expect(mockRuntime.getMemories).toHaveBeenCalledWith(
        expect.objectContaining({
          roomId: 'specific-room',
          count: expect.any(Number),
        })
      );
    });

    it('should format timestamps correctly', async () => {
      const now = Date.now();
      const runtimeWithTimestamps = createMockRuntime({
        memoryResults: [
          createMockMemory({
            content: { text: 'Just now', source: 'user' },
            createdAt: now - 30000, // 30 seconds ago
          }),
          createMockMemory({
            content: { text: 'Minutes ago', source: 'user' },
            createdAt: now - 180000, // 3 minutes ago
          }),
        ],
      });

      const result = await autonomousFeedProvider.get(runtimeWithTimestamps, mockMemory, mockState);

      expect(result.text).toContain('just now');
    });

    it('should handle messages with attachments', async () => {
      const runtimeWithAttachments = createMockRuntime({
        memoryResults: [
          createMockMemory({
            content: {
              text: 'Message with attachment',
              source: 'user',
              attachments: [
                {
                  id: 'attachment-1',
                  url: 'https://example.com/image.jpg',
                  title: 'Test Image',
                  description: 'Test image attachment',
                },
              ],
            },
          }),
        ],
      });

      const result = await autonomousFeedProvider.get(
        runtimeWithAttachments,
        mockMemory,
        mockState
      );

      expect(result.data!.recentMessages[0].content.attachments).toBeDefined();
      expect(result.data!.recentMessages[0].content.attachments).toHaveLength(1);
    });

    it('should provide context for autonomous decision making', async () => {
      const result = await autonomousFeedProvider.get(mockRuntime, mockMemory, mockState);

      // The feed should provide enough context for the agent to understand conversation flow
      expect(result.text).toContain('Conversation Messages');
      expect(result.data!.messageCount).toBe(3);
      expect(result.data!.timeRange).toBeDefined();
    });

    it('should handle concurrent requests efficiently', async () => {
      const promises = Array(5)
        .fill(null)
        .map(() => autonomousFeedProvider.get(mockRuntime, mockMemory, mockState));

      const results = await Promise.all(promises);

      results.forEach((result) => {
        expect(result).toBeDefined();
        expect(result.text).toBeDefined();
        expect(result.data).toBeDefined();
      });

      // Should have called getMemories 5 times
      expect(mockRuntime.getMemories).toHaveBeenCalledTimes(5);
    });
  });

  describe('Integration with OODA Loop', () => {
    it('should provide feed data suitable for observation phase', async () => {
      const result = await autonomousFeedProvider.get(mockRuntime, mockMemory, mockState);

      // Data should be structured for easy processing by OODA observation
      expect(result.data!.recentMessages).toBeDefined();
      expect(result.data!.messageCount).toBeDefined();
      expect(result.data!.timeRange).toBeDefined();

      // Should provide raw data for analysis
      result.data!.recentMessages.forEach((msg: any) => {
        expect(msg).toHaveProperty('id');
        expect(msg).toHaveProperty('content');
        expect(msg).toHaveProperty('createdAt');
        expect(msg).toHaveProperty('entityId');
      });
    });

    it('should support filtering by time window', async () => {
      const result = await autonomousFeedProvider.get(mockRuntime, mockMemory, mockState);

      // Should only include recent messages (not older than a certain threshold)
      const messages = result.data!.recentMessages as Memory[];
      const now = Date.now();
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours

      messages.forEach((msg) => {
        const age = now - (msg.createdAt || 0);
        expect(age).toBeLessThan(maxAge);
      });
    });
  });
});
