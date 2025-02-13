import { describe, expect, it, vi, beforeEach } from 'vitest';
import { retrieveVolatilityState } from '../../src/actions/retrieveVolatilityState';
import { composeContext, generateObject, generateText } from '@elizaos/core';

// Mock external dependencies
vi.mock('@elizaos/core', () => ({
    elizaLogger: {
        log: vi.fn(),
        error: vi.fn(),
    },
    composeContext: vi.fn(),
    generateObject: vi.fn(),
    generateText: vi.fn(),
    ModelClass: {
        SMALL: 'small',
        LARGE: 'large',
    },
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('retrieveVolatilityPrediction', () => {
    let mockRuntime = null;
    let mockMessage = null;
    let mockState = null;
    let mockCallback: () => void;

    beforeEach(() => {
        mockRuntime = {
            character: {
                settings: {},
            },
            composeState: vi.fn().mockResolvedValue({
                agentId: 'test-agent',
                roomId: 'test-room',
            }),
            updateRecentMessageState: vi.fn().mockImplementation((state) => Promise.resolve(state)),
        };

        mockMessage = {
            content: {
                text: 'Retrieve Ethereum market volatility state.',
            },
        };

        mockState = {
            agentId: 'test-agent',
            roomId: 'test-room',
        };

        mockCallback = vi.fn();

        // Reset all mocks
        vi.clearAllMocks();
    });

    describe('validation', () => {
        it('should validate successfully when API is up and running', async () => {
            mockFetch.mockResolvedValueOnce({
                json: () => Promise.resolve({ status: 'ok' }),
            });
            const result = await retrieveVolatilityState.validate(mockRuntime, mockMessage);
            expect(result).toBe(true);
        });

        it('should fail validation when API is down', async () => {
            mockFetch.mockResolvedValueOnce({
                json: () => Promise.resolve({ status: 'down' }),
            });
            const result = await retrieveVolatilityState.validate(mockRuntime, mockMessage);
            expect(result).toBe(false);
        });
    });

    describe('handler', () => {
        it('should handle valid volatility state request', async () => {
            const mockQueryParams = {
                object: {
                    symbol: 'ETH',
                },
            };

            const mockVolatilityState = {
                timestamp: 1739461544161,
                timestamp_str: '2025-02-13T15:45:44.161976Z',
                classification: 'highvol',
                classification_description:
                    'ETH price in highly volatile short momentum, requiring protective measures and caution.',
            };

            const mockFormattedResponse = mockVolatilityState.classification_description;

            mockFetch.mockResolvedValueOnce({
                json: () => Promise.resolve(mockVolatilityState),
            });

            vi.mocked(composeContext).mockReturnValue('mock-context');
            vi.mocked(generateObject).mockResolvedValue(mockQueryParams);
            vi.mocked(generateText).mockResolvedValue(mockFormattedResponse);

            await retrieveVolatilityState.handler(
                mockRuntime,
                mockMessage,
                mockState,
                undefined,
                mockCallback
            );

            expect(composeContext).toHaveBeenCalled();
            expect(generateObject).toHaveBeenCalled();
            expect(mockCallback).toHaveBeenCalledWith({
                text: mockFormattedResponse,
            });
        });

        it('should handle invalid query parameters', async () => {
            const mockInvalidQueryParams = {
                object: {
                    // Missing required fields
                },
            };

            vi.mocked(composeContext).mockReturnValue('mock-context');
            vi.mocked(generateObject).mockResolvedValue(mockInvalidQueryParams);

            await retrieveVolatilityState.handler(
                mockRuntime,
                mockMessage,
                mockState,
                undefined,
                mockCallback
            );

            expect(mockCallback).toHaveBeenCalledWith(
                {
                    text: 'Invalid query params. Please check the inputs.',
                },
                []
            );
            expect(mockFetch).not.toHaveBeenCalled();
        });

        it('should handle API errors gracefully', async () => {
            const mockQueryParams = {
                object: {
                    symbol: 'ETH',
                },
            };

            vi.mocked(composeContext).mockReturnValue('mock-context');
            vi.mocked(generateObject).mockResolvedValue(mockQueryParams);
            vi.mocked(mockFetch).mockRejectedValue('API Error');

            await retrieveVolatilityState.handler(
                mockRuntime,
                mockMessage,
                mockState,
                undefined,
                mockCallback
            );

            expect(mockCallback).toHaveBeenCalledWith({
                text: '❌ An error occurred while retrieving Xtreamly volatility state. Please try again later.',
            });
        });
    });

    describe('action properties', () => {
        it('should have correct action properties', () => {
            expect(retrieveVolatilityState.name).toBe('RETRIEVE_VOLATILITY_STATE');
            expect(retrieveVolatilityState.description).toBeDefined();
            expect(retrieveVolatilityState.similes).toBeDefined();
            expect(Array.isArray(retrieveVolatilityState.similes)).toBe(true);
            expect(retrieveVolatilityState.examples).toBeDefined();
            expect(Array.isArray(retrieveVolatilityState.examples)).toBe(true);
        });
    });
});
