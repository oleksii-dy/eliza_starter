import { describe, expect, it, mock, beforeEach, afterEach } from 'bun:test';

// Mock the Solana web3.js module
mock.module('@solana/web3.js', () => ({
  Connection: mock(() => ({
    getBalance: mock(),
    getParsedTokenAccountsByOwner: mock(),
  })),
  PublicKey: mock((key) => ({ toString: () => key })),
  LAMPORTS_PER_SOL: 1000000000,
}));

// Mock the SPL token module
mock.module('@solana/spl-token', () => ({
  TOKEN_PROGRAM_ID: { toString: () => 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' },
  getMint: mock(),
}));

// Mock logger
mock.module('@elizaos/core', () => ({
  Service: class Service {
    constructor(protected runtime: any) {}
  },
  logger: {
    info: mock(),
    error: mock(),
    warn: mock(),
  },
}));

import { WalletBalanceService } from '../../services/WalletBalanceService';
import { Connection, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { logger } from '@elizaos/core';
import { createMockRuntime } from '@elizaos/core/test-utils';

describe('WalletBalanceService', () => {
  let service: WalletBalanceService;
  let mockRuntime: any;
  let mockConnection: any;

  beforeEach(() => {
    // Reset all mocks
    mock.restore();

    // Create a fresh mock connection with jest functions
    mockConnection = {
      getBalance: mock(),
      getParsedTokenAccountsByOwner: mock(),
    };

    // Override the Connection constructor
    (Connection as any).mockImplementation(() => mockConnection);

    // Create mock runtime
    mockRuntime = createMockRuntime({
      getSetting: mock((key: string) => {
        const settings: Record<string, string> = {
          SOLANA_NETWORK: 'mainnet-beta',
          SOLANA_RPC_URL: '',
        };
        return settings[key];
      }),
      getService: mock(() => null), // No services available in tests
    });

    // Create service instance
    service = new WalletBalanceService(mockRuntime);
  });

  afterEach(() => {
    mock.restore();
  });

  describe('constructor', () => {
    it('should initialize with mainnet by default', () => {
      expect(service.getNetwork()).toBe('mainnet-beta');
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('WalletBalanceService initialized on mainnet-beta')
      );
    });

    it('should initialize with testnet when specified', () => {
      mockRuntime.getSetting = mock((key: string) => {
        if (key === 'SOLANA_NETWORK') {
          return 'testnet';
        }
        return '';
      });

      const testnetService = new WalletBalanceService(mockRuntime);
      expect(testnetService.getNetwork()).toBe('testnet');
    });

    it('should use custom RPC URL when provided', () => {
      const customRpc = 'https://custom.rpc.url';
      mockRuntime.getSetting = mock((key: string) => {
        if (key === 'SOLANA_RPC_URL') {
          return customRpc;
        }
        return '';
      });

      new WalletBalanceService(mockRuntime);
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining(customRpc));
    });
  });

  describe('getWalletBalance', () => {
    const testAddress = '11111111111111111111111111111111';
    const solBalance = 5 * LAMPORTS_PER_SOL;

    beforeEach(() => {
      mockConnection.getBalance.mockResolvedValue(solBalance);
      mockConnection.getParsedTokenAccountsByOwner.mockResolvedValue({
        value: [],
      });
    });

    it('should fetch SOL balance correctly', async () => {
      const balance = await service.getWalletBalance(testAddress);

      expect(mockConnection.getBalance).toHaveBeenCalledWith(
        expect.objectContaining({ toString: expect.any(Function) })
      );
      expect(balance.sol.balance).toBe(solBalance.toString());
      expect(balance.sol.uiAmount).toBe(5);
      expect(balance.sol.decimals).toBe(9);
    });

    it('should fetch token balances correctly', async () => {
      const mockTokenData = {
        value: [
          {
            account: {
              data: {
                parsed: {
                  info: {
                    mint: 'TokenMint11111111111111111111111111111111',
                    tokenAmount: {
                      amount: '1000000000',
                      decimals: 9,
                      uiAmount: 1,
                    },
                  },
                },
              },
            },
          },
        ],
      };

      mockConnection.getParsedTokenAccountsByOwner.mockResolvedValue(mockTokenData);

      const balance = await service.getWalletBalance(testAddress);

      expect(balance.tokens).toHaveLength(1);
      expect(balance.tokens[0].address).toBe('TokenMint11111111111111111111111111111111');
      expect(balance.tokens[0].uiAmount).toBe(1);
      expect(balance.tokens[0].decimals).toBe(9);
    });

    it('should handle errors gracefully', async () => {
      const error = new Error('RPC Error');
      mockConnection.getBalance.mockRejectedValue(error);

      await expect(service.getWalletBalance(testAddress)).rejects.toThrow('RPC Error');
      expect(logger.error).toHaveBeenCalledWith('Error fetching wallet balance:', error);
    });

    it('should filter out zero balance tokens', async () => {
      const mockTokenData = {
        value: [
          {
            account: {
              data: {
                parsed: {
                  info: {
                    mint: 'TokenMint1',
                    tokenAmount: {
                      amount: '0',
                      decimals: 9,
                      uiAmount: 0,
                    },
                  },
                },
              },
            },
          },
          {
            account: {
              data: {
                parsed: {
                  info: {
                    mint: 'TokenMint2',
                    tokenAmount: {
                      amount: '1000000000',
                      decimals: 9,
                      uiAmount: 1,
                    },
                  },
                },
              },
            },
          },
        ],
      };

      mockConnection.getParsedTokenAccountsByOwner.mockResolvedValue(mockTokenData);

      const balance = await service.getWalletBalance(testAddress);

      expect(balance.tokens).toHaveLength(1);
      expect(balance.tokens[0].address).toBe('TokenMint2');
    });
  });

  describe('getSolBalance', () => {
    it('should return SOL balance in correct units', async () => {
      const lamports = 2.5 * LAMPORTS_PER_SOL;
      mockConnection.getBalance.mockResolvedValue(lamports);

      const balance = await service.getSolBalance('11111111111111111111111111111111');

      expect(balance).toBe(2.5);
    });

    it('should handle errors', async () => {
      const error = new Error('Network error');
      mockConnection.getBalance.mockRejectedValue(error);

      await expect(service.getSolBalance('invalid')).rejects.toThrow('Network error');
      expect(logger.error).toHaveBeenCalledWith('Error fetching SOL balance:', error);
    });
  });

  describe('getTokenBalance', () => {
    const walletAddress = '11111111111111111111111111111111';
    const tokenMint = 'TokenMint11111111111111111111111111111111';

    it('should return token balance when found', async () => {
      const mockTokenData = {
        value: [
          {
            account: {
              data: {
                parsed: {
                  info: {
                    tokenAmount: {
                      amount: '5000000000',
                      decimals: 9,
                      uiAmount: 5,
                    },
                  },
                },
              },
            },
          },
        ],
      };

      mockConnection.getParsedTokenAccountsByOwner.mockResolvedValue(mockTokenData);

      const balance = await service.getTokenBalance(walletAddress, tokenMint);

      expect(balance).not.toBeNull();
      expect(balance?.address).toBe(tokenMint);
      expect(balance?.uiAmount).toBe(5);
    });

    it('should return null when no token account found', async () => {
      mockConnection.getParsedTokenAccountsByOwner.mockResolvedValue({ value: [] });

      const balance = await service.getTokenBalance(walletAddress, tokenMint);

      expect(balance).toBeNull();
    });

    it('should handle errors and return null', async () => {
      const error = new Error('Token fetch error');
      mockConnection.getParsedTokenAccountsByOwner.mockRejectedValue(error);

      const balance = await service.getTokenBalance(walletAddress, tokenMint);

      expect(balance).toBeNull();
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining(`Error fetching token balance for ${tokenMint}:`),
        error
      );
    });
  });

  describe('getMultipleWalletBalances', () => {
    it('should fetch multiple wallet balances in batches', async () => {
      const addresses = Array.from({ length: 12 }, (_, i) => `wallet${i}`);

      mockConnection.getBalance.mockResolvedValue(1 * LAMPORTS_PER_SOL);
      mockConnection.getParsedTokenAccountsByOwner.mockResolvedValue({ value: [] });

      const balances = await service.getMultipleWalletBalances(addresses);

      expect(balances.size).toBe(12);
      // Should be called in batches of 5
      expect(mockConnection.getBalance).toHaveBeenCalledTimes(12);
    });

    it('should handle individual wallet errors gracefully', async () => {
      const addresses = ['wallet1', 'wallet2', 'wallet3'];

      mockConnection.getBalance
        .mockResolvedValueOnce(1 * LAMPORTS_PER_SOL)
        .mockRejectedValueOnce(new Error('Wallet 2 error'))
        .mockResolvedValueOnce(3 * LAMPORTS_PER_SOL);

      mockConnection.getParsedTokenAccountsByOwner.mockResolvedValue({ value: [] });

      const balances = await service.getMultipleWalletBalances(addresses);

      expect(balances.size).toBe(2);
      expect(balances.has('wallet1')).toBe(true);
      expect(balances.has('wallet2')).toBe(false);
      expect(balances.has('wallet3')).toBe(true);
    });
  });

  describe('network handling', () => {
    it('should return correct RPC URL for testnet', () => {
      mockRuntime.getSetting = mock((key: string) => {
        if (key === 'SOLANA_NETWORK') {
          return 'testnet';
        }
        return '';
      });

      const _testnetService = new WalletBalanceService(mockRuntime);
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('https://api.testnet.solana.com')
      );
    });

    it('should return correct RPC URL for devnet', () => {
      mockRuntime.getSetting = mock((key: string) => {
        if (key === 'SOLANA_NETWORK') {
          return 'devnet';
        }
        return '';
      });

      const _devnetService = new WalletBalanceService(mockRuntime);
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('https://api.devnet.solana.com')
      );
    });
  });

  describe('service lifecycle', () => {
    it('should start service correctly', async () => {
      const startedService = await WalletBalanceService.start(mockRuntime);

      expect(startedService).toBeInstanceOf(WalletBalanceService);
      expect(logger.info).toHaveBeenCalledWith('Starting WalletBalanceService...');
    });

    it('should stop service correctly', async () => {
      await service.stop();

      expect(logger.info).toHaveBeenCalledWith('Stopping WalletBalanceService...');
    });
  });
});
