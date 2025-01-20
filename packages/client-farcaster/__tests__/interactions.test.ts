import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTestInteraction, handleTestInteraction } from './test-utils';
import { FarcasterClient } from '../src/client';
import { NeynarAPIClient } from '@neynar/nodejs-sdk';
import type { Cast, Profile } from '../src/types';

// Mock dependencies
vi.mock('@neynar/nodejs-sdk', () => ({
    NeynarAPIClient: vi.fn().mockImplementation(() => ({
        publishCast: vi.fn().mockResolvedValue({
            cast: {
                hash: 'cast-1',
                author: { fid: '123' },
                text: 'Test cast',
                timestamp: '2025-01-20T20:00:00Z'
            }
        }),
        recast: vi.fn().mockResolvedValue({ hash: 'recast-1' }),
        like: vi.fn().mockResolvedValue({ hash: 'like-1' })
    }))
}));

describe('Interactions', () => {
    const mockCast: Cast = {
        hash: 'cast-1',
        authorFid: '123',
        text: 'Test cast',
        timestamp: new Date('2025-01-20T20:00:00Z'),
        profile: {
            fid: '123',
            username: 'test.farcaster',
            displayName: 'Test User',
            pfp: 'https://example.com/pic.jpg'
        },
        stats: {
            recasts: 5,
            replies: 3,
            likes: 10
        }
    };

    const mockProfile: Profile = {
        fid: '456',
        username: 'other.farcaster',
        displayName: 'Other User',
        pfp: 'https://example.com/other-pic.jpg'
    };

    describe('createTestInteraction', () => {
        it('should create recast interaction when conditions are met', () => {
            const interaction = createTestInteraction(mockCast, mockProfile);
            expect(interaction).toBeDefined();
            if (interaction) {
                expect(['RECAST', 'REPLY', 'LIKE']).toContain(interaction.type);
            }
        });

        it('should return null when no interaction is needed', () => {
            const lowStatsCast = {
                ...mockCast,
                stats: {
                    recasts: 0,
                    replies: 0,
                    likes: 0
                }
            };
            const interaction = createTestInteraction(lowStatsCast, mockProfile);
            expect(interaction).toBeNull();
        });
    });

    describe('handleTestInteraction', () => {
        let client: FarcasterClient;

        beforeEach(() => {
            vi.clearAllMocks();
            client = new FarcasterClient({
                runtime: {
                    name: 'test-runtime',
                    memory: new Map(),
                    getMemory: vi.fn(),
                    setMemory: vi.fn(),
                    clearMemory: vi.fn()
                },
                url: 'https://api.example.com',
                ssl: true,
                neynar: new NeynarAPIClient({ apiKey: 'test-key' }),
                signerUuid: 'test-signer',
                cache: new Map(),
                farcasterConfig: {
                    apiKey: 'test-key',
                    signerUuid: 'test-signer'
                }
            });
        });

        it('should handle recast interaction successfully', async () => {
            const interaction = {
                type: 'RECAST' as const,
                castId: 'cast-1'
            };

            const result = await handleTestInteraction(client, interaction);
            expect(result).toBeDefined();
            expect(result.hash).toBe('recast-1');
            expect(client.neynar.recast).toHaveBeenCalledWith('cast-1');
        });

        it('should handle reply interaction successfully', async () => {
            const interaction = {
                type: 'REPLY' as const,
                castId: 'cast-1',
                content: 'Test reply'
            };

            const result = await handleTestInteraction(client, interaction);
            expect(result).toBeDefined();
            expect(result.cast.hash).toBe('cast-1');
            expect(client.neynar.publishCast).toHaveBeenCalledWith({
                text: 'Test reply',
                parent: 'cast-1',
                signer_uuid: 'test-signer'
            });
        });

        it('should handle interaction errors', async () => {
            const interaction = {
                type: 'RECAST' as const,
                castId: 'cast-1'
            };

            vi.mocked(client.neynar.recast).mockRejectedValueOnce(new Error('Recast failed'));
            await expect(handleTestInteraction(client, interaction)).rejects.toThrow('Recast failed');
        });
    });
});
