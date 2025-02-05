import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AssetsProvider } from '../../providers/assetsProvider';
import { RoochClient, Address } from '@roochnetwork/rooch-sdk/dist/esm';
import { BTCUTXO, RoochCoin } from '../../types';

// Mock the RoochClient
const mockRoochClient = {
    queryUTXO: vi.fn(),
    getBalances: vi.fn(),
};

// Mock the Address
const mockAddress = {
    toStr: vi.fn().mockReturnValue('mockAddress'),
};

// Mock runtime for formatting
const mockRuntime = {
    character: {
        name: 'TestCharacter',
    },
};

describe('AssetsProvider', () => {
    let assetsProvider: AssetsProvider;

    beforeEach(() => {
        assetsProvider = new AssetsProvider(mockRoochClient as unknown as RoochClient, mockAddress as unknown as Address);
        vi.clearAllMocks();
    });

    describe('fetchBTCUTXOs', () => {
        it('should fetch all BTC UTXOs without pagination', async () => {
            const mockUTXOs: BTCUTXO[] = [
                { id: 'utxo1', sats: '1000' },
                { id: 'utxo2', sats: '2000' },
            ];

            mockRoochClient.queryUTXO.mockResolvedValueOnce({
                data: mockUTXOs.map(utxo => ({
                    id: utxo.id,
                    value: { value: utxo.sats }
                })),
                has_next_page: false,
                next_cursor: null,
            });

            const result = await assetsProvider.fetchBTCUTXOs();
            expect(result).toEqual(mockUTXOs);
            expect(mockRoochClient.queryUTXO).toHaveBeenCalledTimes(1);
        });

        it('should handle empty UTXO list', async () => {
            mockRoochClient.queryUTXO.mockResolvedValueOnce({
                data: [],
                has_next_page: false,
                next_cursor: null,
            });

            const result = await assetsProvider.fetchBTCUTXOs();
            expect(result).toEqual([]);
        });

        it('should handle UTXOs with missing optional fields', async () => {
            const mockUTXOs = [
                { id: undefined, value: { value: '1000' } },
                { id: 'utxo2', value: { value: undefined } },
            ];

            mockRoochClient.queryUTXO.mockResolvedValueOnce({
                data: mockUTXOs,
                has_next_page: false,
                next_cursor: null,
            });

            const result = await assetsProvider.fetchBTCUTXOs();
            expect(result).toEqual([
                { id: undefined, sats: '1000' },
                { id: 'utxo2', sats: undefined },
            ]);
        });
    });

    describe('fetchRoochCoins', () => {
        it('should fetch all Rooch coins without pagination', async () => {
            const mockCoins: RoochCoin[] = [
                { symbol: 'ROOCH', name: 'Rooch Coin', balance: '100000000000', decimals: 8 },
                { symbol: 'BTC', name: 'Bitcoin', balance: '200000000000', decimals: 8 },
            ];

            mockRoochClient.getBalances.mockResolvedValueOnce({
                data: mockCoins.map(coin => ({
                    symbol: coin.symbol,
                    name: coin.name,
                    balance: coin.balance,
                    decimals: coin.decimals
                })),
                has_next_page: false,
                next_cursor: null,
            });

            const result = await assetsProvider.fetchRoochCoins();
            expect(result).toEqual(mockCoins.map(coin => ({
                ...coin,
                balance: coin.balance // Should be number type as per interface
            })));
        });

        it('should handle empty coin list', async () => {
            mockRoochClient.getBalances.mockResolvedValueOnce({
                data: [],
                has_next_page: false,
                next_cursor: null,
            });

            const result = await assetsProvider.fetchRoochCoins();
            expect(result).toEqual([]);
        });

        it('should handle decimal balance values', async () => {
            const mockCoins = [{
                symbol: 'ETH',
                name: 'Ethereum',
                balance: '3141590000',
                decimals: 9,
            }];

            mockRoochClient.getBalances.mockResolvedValueOnce({
                data: mockCoins,
                has_next_page: false,
                next_cursor: null,
            });

            const result = await assetsProvider.fetchRoochCoins();
            expect(result[0].balance).toBeTypeOf('string');
            expect(result[0].balance).toEqual('3141590000');
        });
    });

    describe('fetchAssets', () => {
        it('should combine both BTC UTXOs and Rooch coins', async () => {
            const mockUTXOs: BTCUTXO[] = [
                { id: 'utxo1', sats: '1000' },
            ];
            const mockCoins: RoochCoin[] = [
                { symbol: 'ROOCH', name: 'Rooch Coin', balance: '100000000000', decimals: 8 },
            ];

            vi.spyOn(assetsProvider, 'fetchBTCUTXOs').mockResolvedValueOnce(mockUTXOs);
            vi.spyOn(assetsProvider, 'fetchRoochCoins').mockResolvedValueOnce(mockCoins);

            const result = await assetsProvider.fetchAssets();
            expect(result.utxos).toEqual(mockUTXOs);
            expect(result.coins).toEqual(mockCoins);
        });

        it('should handle empty assets', async () => {
            vi.spyOn(assetsProvider, 'fetchBTCUTXOs').mockResolvedValueOnce([]);
            vi.spyOn(assetsProvider, 'fetchRoochCoins').mockResolvedValueOnce([]);

            const result = await assetsProvider.fetchAssets();
            expect(result.utxos).toEqual([]);
            expect(result.coins).toEqual([]);
        });
    });

    describe('formatAssets and getFormattedAssets', () => {
        const mockAssets = {
            utxos: [{ id: 'utxo1', sats: '1000' }] as BTCUTXO[],
            coins: [{ symbol: 'ROOCH', name: 'Rooch Coin', balance: '100000000000', decimals: 8 }] as RoochCoin[],
        };

        it('should format assets with correct number formatting', () => {
            const result = assetsProvider.formatAssets(mockRuntime, mockAssets);

            expect(result).toContain('TestCharacter');
            expect(result).toContain('Assets(mockAddress):');
            expect(result).toContain('ROOCH(Rooch Coin) Balance:1000.00');
            expect(result).toContain('UTXO(utxo1) 1000.00 Sats');
        });

        it('should handle empty assets in formatting', () => {
            const emptyAssets = { utxos: [], coins: [] };
            const result = assetsProvider.formatAssets(mockRuntime, emptyAssets);

            expect(result).toContain('Rooch network coin assets:');
            expect(result).toContain('BTC assets:');
            expect(result).not.toContain('Balance:');
            expect(result).not.toContain('Sats');
        });

        it('should handle missing optional fields in formatting', () => {
            const assetsWithMissingFields = {
                utxos: [] as BTCUTXO[],
                coins: [{ symbol: 'TEST', name: '', balance: '0', decimals: 6 }] as RoochCoin[],
            };

            const result = assetsProvider.formatAssets(mockRuntime, assetsWithMissingFields);
            expect(result).toContain('TEST() Balance:0.00');
        });
    });
});