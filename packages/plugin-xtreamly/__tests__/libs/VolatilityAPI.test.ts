import { describe, expect, it, vi, beforeEach } from 'vitest';
import { VolatilityAPI } from '../../src/libs/VolatilityAPI';
// import { XTREAMLY_API_URL_ENDPOINT } from '../../src/constants';
import { elizaLogger } from '@elizaos/core';
import { Horizons } from '../../src/libs/VolatilityPrediction';
import { XTREAMLY_API_URL, XtreamlyAPIPath } from '../../src/libs/XtreamlyAPI';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('VolatilityAPI library', () => {
    const fetchParams = {
        method: 'GET',
        headers: new Headers({
            'x-api-key': 'test-key',
        }),
    };

    beforeEach(() => {
        process.env.XTREAMLY_API_KEY = 'test-key';
        mockFetch.mockReset();
    });

    describe('XTREAMLY_API_KEY is not set', () => {
        it('should throw an error', () => {
            delete process.env.XTREAMLY_API_KEY;
            expect(() => {
                new VolatilityAPI();
            }).toThrow(`
                Missing environment variables: XTREAMLY_API_KEY.
                Request your API key here: https://xtreamly.io/api
            `);
        });
    });

    describe('prediction', () => {
        it('should get live volatility predictions', async () => {
            const mockResponse = {
                timestamp: 123123,
                timestamp_str: '2024-02-02T00:00:00',
                volatility: 0.111,
            };
            mockFetch.mockResolvedValueOnce({
                json: () => Promise.resolve(mockResponse),
            });

            const result = await new VolatilityAPI().prediction(Horizons.min60, 'ETH');

            expect(mockFetch).toHaveBeenCalledWith(
                `${XTREAMLY_API_URL}${XtreamlyAPIPath.volatility}?symbol=ETH&horizon=60min`,
                fetchParams
            );
            expect(result).toBe(mockResponse);
        });
    });

    describe('historical prediction', () => {
        it('should get historical volatility predictions', async () => {
            const mockResponse = [
                {
                    timestamp: 123123,
                    timestamp_str: '2024-02-02T00:00:00',
                    volatility: 0.111,
                },
            ];
            mockFetch.mockResolvedValueOnce({
                json: () => Promise.resolve(mockResponse),
            });

            const endDate = Date.now();
            const startDate = endDate - 10000;
            const result = await new VolatilityAPI().historicalPrediction(
                new Date(startDate),
                new Date(endDate),
                Horizons.min60,
                'ETH'
            );

            expect(mockFetch).toHaveBeenCalledWith(
                `${XTREAMLY_API_URL}${XtreamlyAPIPath.volatilityHistorical}?symbol=ETH&horizon=60min&start_date=${startDate}&end_date=${endDate}`,
                fetchParams
            );
            expect(result).toBe(mockResponse);
        });
    });

    describe('state', () => {
        it('should get live state predictions', async () => {
            const mockResponse = {
                timestamp: 123123,
                timestamp_str: '2024-02-02T00:00:00',
                classification: 'midvol',
                classification_description: 'This is midvol',
            };
            mockFetch.mockResolvedValueOnce({
                json: () => Promise.resolve(mockResponse),
            });

            const result = await new VolatilityAPI().state('ETH');

            expect(mockFetch).toHaveBeenCalledWith(
                `${XTREAMLY_API_URL}${XtreamlyAPIPath.state}?symbol=ETH`,
                fetchParams
            );
            expect(result).toBe(mockResponse);
        });
    });

    describe('historical state', () => {
        it('should get historical state predictions', async () => {
            const mockResponse = [
                {
                    timestamp: 123123,
                    timestamp_str: '2024-02-02T00:00:00',
                    classification: 'midvol',
                    classification_description: 'This is midvol',
                },
            ];
            mockFetch.mockResolvedValueOnce({
                json: () => Promise.resolve(mockResponse),
            });

            const endDate = Date.now();
            const startDate = endDate - 10000;
            const result = await new VolatilityAPI().historicalState(
                new Date(startDate),
                new Date(endDate),
                'ETH'
            );

            expect(mockFetch).toHaveBeenCalledWith(
                `${XTREAMLY_API_URL}${XtreamlyAPIPath.stateHistorical}?symbol=ETH&start_date=${startDate}&end_date=${endDate}`,
                fetchParams
            );
            expect(result).toBe(mockResponse);
        });
    });
});
