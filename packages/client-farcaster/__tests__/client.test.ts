import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FarcasterClient } from '../src/client';
import { NeynarAPIClient } from '@neynar/nodejs-sdk';

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
        lookupUserByFid: vi.fn().mockResolvedValue({
            result: {
                user: {
                    fid: '123',
                    username: 'test.farcaster',
                    displayName: 'Test User',
                    pfp: {
                        url: 'https://example.com/pic.jpg'
                    }
                }
            }
        }),
        getCastsByFid: vi.fn().mockResolvedValue({
            result: {
                casts: [
                    {
                        hash: 'cast-1',
                        author: { fid: '123' },
                        text: 'Test cast',
                        timestamp: '2025-01-20T20:00:00Z'
                    }
                ]
            }
        })
    }))
}));

describe('FarcasterClient', () => {
    let client: FarcasterClient;
    const mockRuntime = {
        name: 'test-runtime',
        memory: new Map(),
        getMemory: vi.fn(),
        setMemory: vi.fn(),
        clearMemory: vi.fn()
    };

    beforeEach(() => {
        vi.clearAllMocks();
        client = new FarcasterClient({
            runtime: mockRuntime,
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

    describe('loadCastFromNeynarResponse', () => {
        it('should load cast from Neynar response', async () => {
            const neynarResponse = {
                hash: 'cast-1',
                author: { fid: '123' },
                text: 'Test cast',
                timestamp: '2025-01-20T20:00:00Z'
            };

            const cast = await client.loadCastFromNeynarResponse(neynarResponse);
            expect(cast).toBeDefined();
            expect(cast.hash).toBe('cast-1');
            expect(cast.authorFid).toBe('123');
            expect(cast.text).toBe('Test cast');
            expect(cast.profile).toBeDefined();
            expect(cast.profile.fid).toBe('123');
            expect(cast.profile.username).toBe('test.farcaster');
        });

        it('should handle cast with parent', async () => {
            const neynarResponse = {
                hash: 'cast-2',
                author: { fid: '123' },
                text: 'Reply cast',
                parent_hash: 'cast-1',
                parent_author: { fid: '456' },
                timestamp: '2025-01-20T20:00:00Z'
            };

            const cast = await client.loadCastFromNeynarResponse(neynarResponse);
            expect(cast.inReplyTo).toBeDefined();
            expect(cast.inReplyTo?.hash).toBe('cast-1');
            expect(cast.inReplyTo?.fid).toBe('456');
        });
    });

    describe('getProfile', () => {
        it('should fetch profile successfully', async () => {
            const profile = await client.getProfile('123');
            expect(profile).toBeDefined();
            expect(profile.fid).toBe('123');
            expect(profile.username).toBe('test.farcaster');
            expect(profile.displayName).toBe('Test User');
            expect(profile.pfp).toBe('https://example.com/pic.jpg');
        });

        it('should handle profile fetch errors', async () => {
            vi.mocked(client.neynar.lookupUserByFid).mockRejectedValueOnce(new Error('Profile fetch failed'));
            await expect(client.getProfile('123')).rejects.toThrow('Profile fetch failed');
        });
    });

    describe('getCasts', () => {
        it('should fetch casts successfully', async () => {
            const casts = await client.getCasts('123');
            expect(casts).toHaveLength(1);
            expect(casts[0].hash).toBe('cast-1');
            expect(casts[0].authorFid).toBe('123');
            expect(casts[0].text).toBe('Test cast');
        });

        it('should handle cast fetch errors', async () => {
            vi.mocked(client.neynar.getCastsByFid).mockRejectedValueOnce(new Error('Cast fetch failed'));
            await expect(client.getCasts('123')).rejects.toThrow('Cast fetch failed');
        });
    });
});
