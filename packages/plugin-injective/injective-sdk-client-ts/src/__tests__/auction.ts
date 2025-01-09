import {
    getAuctionModuleParams,
    getAuctionModuleState,
    getCurrentBasket,
    getAuctionRound,
    getAuctions,
    msgBid
} from '../modules/auction';
import { MsgBid } from "@injectivelabs/sdk-ts";
import { INJ_DENOM } from "@injectivelabs/utils";
import { createSuccessResponse, createErrorResponse } from "../types";
import { start } from 'repl';

// Mock dependencies
jest.mock("@injectivelabs/sdk-ts");
jest.mock("@injectivelabs/utils");

describe('Auction Module Tests', () => {
    // Mock InjectiveGrpcBase context
    let mockContext: any;

    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();

        // Setup mock context that simulates InjectiveGrpcBase
        mockContext = {
            request: jest.fn(),
            query: jest.fn(),
            injAddress: 'inj123mock',
            chainGrpcAuctionApi: {
                fetchModuleParams: jest.fn(),
                fetchModuleState: jest.fn(),
                fetchCurrentBasket: jest.fn(),
            },
            indexerGrpcAuctionApi: {
                fetchAuction: jest.fn(),
                fetchAuctions: jest.fn(),
            },
            msgBroadcaster: {
                broadcast: jest.fn()
            }
        };
    });

    describe('getAuctionModuleParams', () => {
        it('should successfully fetch auction module parameters', async () => {
            const mockResponse = { params: { someParam: 'value' } };
            mockContext.request.mockResolvedValueOnce(mockResponse);

            const result = await getAuctionModuleParams.call(mockContext);

            expect(result).toEqual(createSuccessResponse(mockResponse));
            expect(mockContext.request).toHaveBeenCalledWith({
                method: mockContext.chainGrpcAuctionApi.fetchModuleParams,
                params: {}
            });
        });

        it('should handle errors appropriately', async () => {
            const mockError = new Error('Failed to fetch params');
            mockContext.request.mockRejectedValueOnce(mockError);

            const result = await getAuctionModuleParams.call(mockContext);

            expect(result).toEqual(createErrorResponse('getAuctionModuleParamsError', mockError));
        });
    });

    describe('getAuctionModuleState', () => {
        it('should successfully fetch auction module state', async () => {
            const mockResponse = { state: { status: 'active' } };
            mockContext.request.mockResolvedValueOnce(mockResponse);

            const result = await getAuctionModuleState.call(mockContext);

            expect(result).toEqual(createSuccessResponse(mockResponse));
            expect(mockContext.request).toHaveBeenCalledWith({
                method: mockContext.chainGrpcAuctionApi.fetchModuleState,
                params: {}
            });
        });

        it('should handle errors appropriately', async () => {
            const mockError = new Error('Failed to fetch state');
            mockContext.request.mockRejectedValueOnce(mockError);

            const result = await getAuctionModuleState.call(mockContext);

            expect(result).toEqual(createErrorResponse('getAuctionModuleStateError', mockError));
        });
    });

    describe('getCurrentBasket', () => {
        it('should successfully fetch current basket', async () => {
            const mockResponse = { basket: { items: [] } };
            mockContext.request.mockResolvedValueOnce(mockResponse);

            const result = await getCurrentBasket.call(mockContext);

            expect(result).toEqual(createSuccessResponse(mockResponse));
            expect(mockContext.request).toHaveBeenCalledWith({
                method: mockContext.chainGrpcAuctionApi.fetchCurrentBasket,
                params: {}
            });
        });

        it('should handle errors appropriately', async () => {
            const mockError = new Error('Failed to fetch basket');
            mockContext.request.mockRejectedValueOnce(mockError);

            const result = await getCurrentBasket.call(mockContext);

            expect(result).toEqual(createErrorResponse('getCurrentBasketError', mockError));
        });
    });

    describe('getAuctionRound', () => {
        const mockParams = { round: 1 };

        it('should successfully fetch auction round details', async () => {
            const mockResponse = { round: { id: 1, status: 'active' } };
            mockContext.query.mockResolvedValueOnce(mockResponse);

            const result = await getAuctionRound.call(mockContext, mockParams);

            expect(result).toEqual(createSuccessResponse(mockResponse));
            expect(mockContext.query).toHaveBeenCalledWith({
                method: mockContext.indexerGrpcAuctionApi.fetchAuction,
                params: mockParams.round
            });
        });

        it('should handle errors appropriately', async () => {
            const mockError = new Error('Failed to fetch auction round');
            mockContext.query.mockRejectedValueOnce(mockError);

            const result = await getAuctionRound.call(mockContext, mockParams);

            expect(result).toEqual(createErrorResponse('getAuctionRoundError', mockError));
        });
    });

    describe('getAuctions', () => {
        const mockParams = { startRound: 1, limit: 200 };

        it('should successfully fetch auctions list', async () => {
            const mockResponse = { auctions: [{ id: 1 }, { id: 2 }] };
            mockContext.query.mockResolvedValueOnce(mockResponse);

            const result = await getAuctions.call(mockContext, mockParams);

            expect(result).toEqual(createSuccessResponse(mockResponse));
            expect(mockContext.query).toHaveBeenCalledWith({
                method: mockContext.indexerGrpcAuctionApi.fetchAuctions,
                params: mockParams
            });
        });

        it('should handle errors appropriately', async () => {
            const mockError = new Error('Failed to fetch auctions');
            mockContext.query.mockRejectedValueOnce(mockError);

            const result = await getAuctions.call(mockContext, mockParams);

            expect(result).toEqual(createErrorResponse('getAuctionsError', mockError));
        });
    });

    describe('msgBid', () => {
        const mockBidParams = {
            round: 1,
            amount: '1000000'
        };

        beforeEach(() => {
            // Mock MsgBid.fromJSON
            (MsgBid.fromJSON as jest.Mock).mockImplementation((params) => ({
                ...params,
                // Add any other necessary mock properties
            }));
        });

        it('should successfully place a bid', async () => {
            const mockResponse = { txHash: 'mock-hash' };
            mockContext.msgBroadcaster.broadcast.mockResolvedValueOnce(mockResponse);

            const result = await msgBid.call(mockContext, mockBidParams);

            expect(result).toEqual(createSuccessResponse(mockResponse));
            expect(MsgBid.fromJSON).toHaveBeenCalledWith({
                round: mockBidParams.round,
                injectiveAddress: mockContext.injAddress,
                amount: { denom: INJ_DENOM, amount: mockBidParams.amount }
            });
            expect(mockContext.msgBroadcaster.broadcast).toHaveBeenCalledWith({
                msgs: expect.any(Object)
            });
        });

        it('should handle errors appropriately', async () => {
            const mockError = new Error('Failed to place bid');
            mockContext.msgBroadcaster.broadcast.mockRejectedValueOnce(mockError);

            const result = await msgBid.call(mockContext, mockBidParams);

            expect(result).toEqual(createErrorResponse('msgBidError', mockError));
        });

        it('should construct bid message with correct parameters', async () => {
            mockContext.msgBroadcaster.broadcast.mockResolvedValueOnce({});

            await msgBid.call(mockContext, mockBidParams);

            expect(MsgBid.fromJSON).toHaveBeenCalledWith({
                round: mockBidParams.round,
                injectiveAddress: mockContext.injAddress,
                amount: {
                    denom: INJ_DENOM,
                    amount: mockBidParams.amount
                }
            });
        });
    });
});