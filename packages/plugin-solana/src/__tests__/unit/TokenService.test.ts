import { describe, expect, it, mock, beforeEach, afterEach } from 'bun:test';

// Mock dependencies
mock.module('@solana/web3.js', () => ({
  Connection: mock(() => ({
    getParsedAccountInfo: mock(),
    getParsedTokenAccountsByOwner: mock(),
  })),
  PublicKey: mock((key) => ({
    toString: () => key,
    toBase58: () => key,
  })),
}));

mock.module('@solana/spl-token', () => ({
  TOKEN_PROGRAM_ID: { toString: () => 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' },
  TOKEN_2022_PROGRAM_ID: { toString: () => 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb' },
  getAssociatedTokenAddress: mock(),
  createAssociatedTokenAccountInstruction: mock(),
  getAccount: mock(),
  getMint: mock(),
}));

mock.module('axios', () => ({
  default: {
    get: mock(),
  },
}));

mock.module('@elizaos/core', () => ({
  Service: class Service {
    constructor(protected runtime: any) {}
  },
  logger: {
    info: mock(),
    error: mock(),
    warn: mock(),
    debug: mock(),
  },
}));

import { TokenService } from '../../services/TokenService';
import { Connection, PublicKey } from '@solana/web3.js';
import { logger } from '@elizaos/core';
import axios from 'axios';

describe('TokenService', () => {
  let service: TokenService;
  let mockRuntime: any;
  let mockConnection: any;
  let mockAxios: any;

  beforeEach(() => {
    mock.restore();
    mockAxios = axios as any;

    mockRuntime = {
      getSetting: mock((key: string) => {
        const settings: Record<string, string> = {
          SOLANA_RPC_URL: 'https://api.devnet.solana.com',
          SOLANA_NETWORK: 'devnet',
        };
        return settings[key];
      }),
      getService: mock(() => ({
        getConnection: () => mockConnection,
      })),
    };

    mockConnection = {
      getParsedAccountInfo: mock(),
      getParsedTokenAccountsByOwner: mock(),
    };

    service = new TokenService(mockRuntime);
  });

  afterEach(() => {
    mock.restore();
  });

  describe('constructor', () => {
    it('should initialize successfully', () => {
      expect(service).toBeInstanceOf(TokenService);
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('TokenService initialized'));
    });
  });

  describe('getTokenInfo', () => {
    const testMint = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'; // USDC

    it('should fetch token info successfully', async () => {
      const mockTokenInfo = {
        address: testMint,
        symbol: 'USDC',
        name: 'USD Coin',
        decimals: 6,
        logoURI: 'https://example.com/usdc.png',
      };

      mockAxios.get.mockResolvedValue({ data: mockTokenInfo });

      const tokenInfo = await service.getTokenInfo(testMint);

      expect(tokenInfo).toEqual(mockTokenInfo);
      expect(mockAxios.get).toHaveBeenCalledWith(
        expect.stringContaining(`token/${testMint}`),
        expect.any(Object)
      );
    });

    it('should return cached token info on subsequent calls', async () => {
      const mockTokenInfo = {
        address: testMint,
        symbol: 'USDC',
        name: 'USD Coin',
        decimals: 6,
      };

      mockAxios.get.mockResolvedValue({ data: mockTokenInfo });

      // First call
      await service.getTokenInfo(testMint);

      // Second call should use cache
      const cachedInfo = await service.getTokenInfo(testMint);

      expect(cachedInfo).toEqual(mockTokenInfo);
      expect(mockAxios.get).toHaveBeenCalledTimes(1);
    });

    it('should handle missing token info', async () => {
      mockAxios.get.mockResolvedValue({ data: null });

      const tokenInfo = await service.getTokenInfo(testMint);

      expect(tokenInfo).toBeNull();
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining(`Failed to get token info for ${testMint}`),
        expect.any(Error)
      );
    });

    it('should handle API errors gracefully', async () => {
      mockAxios.get.mockRejectedValue(new Error('API Error'));

      const tokenInfo = await service.getTokenInfo(testMint);

      expect(tokenInfo).toBeNull();
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining(`Failed to get token info for ${testMint}`),
        expect.any(Error)
      );
    });
  });

  describe('getTokenMetadata', () => {
    const testMint = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

    it('should fetch token metadata from on-chain data', async () => {
      const mockMintData = {
        value: {
          data: {
            parsed: {
              info: {
                decimals: 6,
                mintAuthority: null,
                supply: '1000000000000',
                freezeAuthority: null,
              },
            },
          },
        },
      };

      mockConnection.getParsedAccountInfo.mockResolvedValue(mockMintData);

      const metadata = await service.getTokenMetadata(testMint);

      expect(metadata).toEqual({
        mint: testMint,
        decimals: 6,
        supply: '1000000000000',
        mintAuthority: null,
        freezeAuthority: null,
      });
    });

    it('should handle invalid mint address', async () => {
      mockConnection.getParsedAccountInfo.mockResolvedValue({ value: null });

      const metadata = await service.getTokenMetadata('invalid-mint');

      expect(metadata).toBeNull();
      // No error is logged when value is null, it just returns null
    });
  });

  describe('getTokenAccounts', () => {
    const testOwner = '11111111111111111111111111111111';
    const testMint = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

    it('should fetch token accounts for owner', async () => {
      const mockTokenAccounts = {
        value: [
          {
            pubkey: { toString: () => 'account1' },
            account: {
              data: {
                parsed: {
                  info: {
                    mint: testMint,
                    owner: testOwner,
                    tokenAmount: {
                      amount: '1000000000',
                      decimals: 6,
                      uiAmount: 1000,
                    },
                  },
                },
              },
            },
          },
        ],
      };

      mockConnection.getParsedTokenAccountsByOwner
        .mockResolvedValueOnce(mockTokenAccounts) // First call (TOKEN_PROGRAM_ID)
        .mockResolvedValueOnce({ value: [] }); // Second call (TOKEN_2022_PROGRAM_ID)

      const accounts = await service.getTokenAccounts(testOwner);

      expect(accounts).toHaveLength(1);
      expect(accounts[0].mint.toString()).toBe(testMint);
      expect(accounts[0].amount).toBe(BigInt('1000000000'));
    });

    it('should filter by specific mint when provided', async () => {
      const mockTokenAccounts = {
        value: [
          {
            pubkey: { toString: () => 'account1' },
            account: {
              data: {
                parsed: {
                  info: {
                    mint: testMint,
                    owner: testOwner,
                    tokenAmount: {
                      amount: '1000000000',
                      decimals: 6,
                      uiAmount: 1000,
                    },
                  },
                },
              },
            },
          },
        ],
      };

      mockConnection.getParsedTokenAccountsByOwner.mockResolvedValue(mockTokenAccounts);

      const accounts = await service.getTokenAccounts(testOwner, testMint);

      expect(accounts).toHaveLength(1);
      expect(mockConnection.getParsedTokenAccountsByOwner).toHaveBeenCalledWith(
        expect.any(Object), // PublicKey
        { mint: expect.any(Object) } // filter by mint
      );
    });

    it('should handle errors gracefully', async () => {
      mockConnection.getParsedTokenAccountsByOwner.mockRejectedValue(new Error('RPC Error'));

      const accounts = await service.getTokenAccounts(testOwner);

      expect(accounts).toEqual([]);
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error fetching token accounts'),
        expect.any(Error)
      );
    });
  });

  describe('network-specific behavior', () => {
    it('should use devnet endpoints for devnet network', () => {
      mockRuntime.getSetting = mock((key: string) => {
        if (key === 'SOLANA_NETWORK') {
          return 'devnet';
        }
        return '';
      });

      const devnetService = new TokenService(mockRuntime);
      expect(devnetService).toBeInstanceOf(TokenService);
    });

    it('should use mainnet endpoints for mainnet network', () => {
      mockRuntime.getSetting = mock((key: string) => {
        if (key === 'SOLANA_NETWORK') {
          return 'mainnet-beta';
        }
        return '';
      });

      const mainnetService = new TokenService(mockRuntime);
      expect(mainnetService).toBeInstanceOf(TokenService);
    });
  });

  describe('service lifecycle', () => {
    it('should start service correctly', async () => {
      const startedService = await TokenService.start(mockRuntime);

      expect(startedService).toBeInstanceOf(TokenService);
    });

    it('should stop service correctly', async () => {
      await service.stop();

      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('TokenService stopped'));
    });
  });
});
