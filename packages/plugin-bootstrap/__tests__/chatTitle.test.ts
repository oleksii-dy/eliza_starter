import { describe, it, expect, vi, beforeEach } from 'vitest';
import { chatTitleEvaluator } from '../src/evaluators/chatTitle';
import { createMockRuntime } from './test-utils';
import { ChannelType, ModelType, type Memory, type Room } from '@elizaos/core';

describe('ChatTitleEvaluator', () => {
    let mockRuntime: any;
    let mockMessage: Memory;
    let mockRoom: Room;

    beforeEach(() => {
        mockRuntime = createMockRuntime();

        mockRoom = {
            id: 'room-123' as any,
            type: ChannelType.DM,
            channelId: 'channel-456',
            name: 'Chat - Dec 20, 14:30:22',
            worldId: 'world-789' as any,
            source: 'test',
            metadata: {}
        };

        mockMessage = {
            id: 'msg-123' as any,
            roomId: 'room-123' as any,
            entityId: 'user-456' as any,
            agentId: 'agent-789' as any,
            content: {
                text: 'This is the 10th message in our conversation about React development',
                type: 'text'
            },
            createdAt: Date.now()
        } as Memory;

        // Mock runtime methods
        mockRuntime.getRoom = vi.fn().mockResolvedValue(mockRoom);
        mockRuntime.getCache = vi.fn().mockResolvedValue(null); // Not updated yet
        mockRuntime.setCache = vi.fn().mockResolvedValue(true);
        mockRuntime.countMemories = vi.fn().mockResolvedValue(10);
        mockRuntime.getMemories = vi.fn().mockResolvedValue([
            { content: { text: 'Hi! I need help with React components' }, entityId: 'user-456' },
            { content: { text: 'I\'d be happy to help! What are you working on?' }, entityId: 'agent-789' },
            { content: { text: 'I\'m trying to understand props' }, entityId: 'user-456' },
            { content: { text: 'Props are a fundamental concept...' }, entityId: 'agent-789' },
            { content: { text: 'Can you show me an example?' }, entityId: 'user-456' },
            { content: { text: 'Here\'s a simple example...' }, entityId: 'agent-789' },
            { content: { text: 'That makes sense!' }, entityId: 'user-456' },
            { content: { text: 'Great! Any other questions?' }, entityId: 'agent-789' },
            { content: { text: 'How do I handle state?' }, entityId: 'user-456' },
            { content: { text: 'State management is important...' }, entityId: 'agent-789' }
        ]);
        mockRuntime.useModel = vi.fn().mockResolvedValue('React Props Tutorial');
        mockRuntime.getSetting = vi.fn().mockReturnValue('http://localhost:3006');
        mockRuntime.agentId = 'agent-789';

        // Mock fetch for updating channel
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ success: true })
        }) as any;
    });

    describe('validate', () => {
        it('should return true for DM channels with exactly 10 messages', async () => {
            const result = await chatTitleEvaluator.validate(mockRuntime, mockMessage);
            expect(result).toBe(true);
        });

        it('should return false for GROUP channels with more than 2 participants', async () => {
            mockRoom.type = ChannelType.GROUP;
            // Mock getParticipantsForRoom to return more than 2 participants (not a 1-on-1)
            mockRuntime.getParticipantsForRoom.mockResolvedValue([
                { id: 'user-1', name: 'User 1' },
                { id: 'user-2', name: 'User 2' },
                { id: 'agent-1', name: 'Agent 1' }
            ]);
            const result = await chatTitleEvaluator.validate(mockRuntime, mockMessage);
            expect(result).toBe(false);
        });

        it('should return true for GROUP channels with exactly 2 participants (1-on-1)', async () => {
            mockRoom.type = ChannelType.GROUP;
            // Mock getParticipantsForRoom to return exactly 2 participants (1-on-1 conversation)
            mockRuntime.getParticipantsForRoom.mockResolvedValue([
                { id: 'user-1', name: 'User 1' },
                { id: 'agent-1', name: 'Agent 1' }
            ]);
            const result = await chatTitleEvaluator.validate(mockRuntime, mockMessage);
            expect(result).toBe(true);
        });

        it('should return false when title already updated', async () => {
            mockRuntime.getCache.mockResolvedValue(true); // Already updated
            const result = await chatTitleEvaluator.validate(mockRuntime, mockMessage);
            expect(result).toBe(false);
        });

        it('should return false when message count is less than 10', async () => {
            mockRuntime.countMemories.mockResolvedValue(8);
            const result = await chatTitleEvaluator.validate(mockRuntime, mockMessage);
            expect(result).toBe(false);
        });

        it('should return true when message count is 20 (every 10th message)', async () => {
            mockRuntime.countMemories.mockResolvedValue(20);
            const result = await chatTitleEvaluator.validate(mockRuntime, mockMessage);
            expect(result).toBe(true);
        });

        it('should return true when message count is 30 (every 10th message)', async () => {
            mockRuntime.countMemories.mockResolvedValue(30);
            const result = await chatTitleEvaluator.validate(mockRuntime, mockMessage);
            expect(result).toBe(true);
        });

        it('should return false when message count is not a multiple of 10', async () => {
            mockRuntime.countMemories.mockResolvedValue(15);
            const result = await chatTitleEvaluator.validate(mockRuntime, mockMessage);
            expect(result).toBe(false);
        });
    });

    describe('handler', () => {
        it('should generate and update chat title successfully', async () => {
            await chatTitleEvaluator.handler(mockRuntime, mockMessage);

            // Verify LLM was called with correct parameters
            expect(mockRuntime.useModel).toHaveBeenCalledWith(ModelType.TEXT_SMALL, {
                prompt: expect.stringContaining('Recent conversation:'),
                temperature: 0.3,
                maxTokens: 50
            });

            // Verify API call to update channel
            expect(global.fetch).toHaveBeenCalledWith(
                'http://localhost:3006/api/messaging/central-channels/channel-456',
                {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        name: 'React Props Tutorial'
                    })
                }
            );

            // Verify cache was set to prevent re-processing
            expect(mockRuntime.setCache).toHaveBeenCalledWith(
                'room-123-title-updated-10',
                true
            );
        });

        it('should skip processing if room not found', async () => {
            mockRuntime.getRoom.mockResolvedValue(null);

            await chatTitleEvaluator.handler(mockRuntime, mockMessage);

            expect(mockRuntime.useModel).not.toHaveBeenCalled();
            expect(global.fetch).not.toHaveBeenCalled();
        });

        it('should skip processing if no channelId', async () => {
            mockRoom.channelId = undefined;

            await chatTitleEvaluator.handler(mockRuntime, mockMessage);

            expect(mockRuntime.useModel).not.toHaveBeenCalled();
            expect(global.fetch).not.toHaveBeenCalled();
        });

        it('should handle API errors gracefully', async () => {
            global.fetch = vi.fn().mockResolvedValue({
                ok: false,
                status: 500,
                text: () => Promise.resolve('Internal Server Error')
            }) as any;

            await chatTitleEvaluator.handler(mockRuntime, mockMessage);

            // Should still attempt the API call but not crash
            expect(global.fetch).toHaveBeenCalled();
            expect(mockRuntime.setCache).not.toHaveBeenCalled(); // Should not mark as updated
        });

        it('should clean up quotes from generated title', async () => {
            mockRuntime.useModel.mockResolvedValue('"React Props Tutorial"');

            await chatTitleEvaluator.handler(mockRuntime, mockMessage);

            expect(global.fetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    body: JSON.stringify({
                        name: 'React Props Tutorial' // Without quotes
                    })
                })
            );
        });
    });

    describe('conversation analysis', () => {
        it('should format conversation correctly for LLM', async () => {
            await chatTitleEvaluator.handler(mockRuntime, mockMessage);

            const callArgs = mockRuntime.useModel.mock.calls[0][1];
            expect(callArgs.prompt).toContain('User: Hi! I need help with React components');
            expect(callArgs.prompt).toContain('Agent: I\'d be happy to help!');
        });

        it('should include sufficient context messages', async () => {
            await chatTitleEvaluator.handler(mockRuntime, mockMessage);

            expect(mockRuntime.getMemories).toHaveBeenCalledWith({
                roomId: 'room-123',
                tableName: 'messages',
                count: 15 // Should get extra messages for better context
            });
        });
    });
}); 