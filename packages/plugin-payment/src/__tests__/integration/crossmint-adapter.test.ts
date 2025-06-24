import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import { type IAgentRuntime, type UUID, asUUID, ServiceType } from '@elizaos/core';
import { CrossmintAdapter, CrossmintAdapterError } from '../../adapters/CrossmintAdapter';
import { PaymentMethod, PaymentStatus } from '../../types';
import { PaymentService } from '../../services/PaymentService';

// Mock Crossmint services
class MockRealCrossMintService {
  private wallets = new Map<string, any>();
  private transactions = new Map<string, any>();

  async listWallets() {
    return Array.from(this.wallets.values());
  }

  async createWallet(params: { type: string; linkedUser: string }) {
    const wallet = {
      address: `0x${Math.random().toString(16).substring(2).padEnd(40, '0')}`,
      type: params.type,
      linkedUser: params.linkedUser,
      createdAt: new Date().toISOString(),
    };
    this.wallets.set(wallet.address, wallet);
    return wallet;
  }

  async createTransfer(params: any) {
    const transaction = {
      id: `tx_${Date.now()}`,
      hash: `0x${Math.random().toString(16).substring(2).padEnd(64, '0')}`,
      status: 'pending',
      chain: 'ethereum',
      gas: '21000',
      gasPrice: '20000000000',
      createdAt: new Date().toISOString(),
      ...params,
    };
    this.transactions.set(transaction.hash, transaction);

    // Simulate async processing
    setTimeout(() => {
      transaction.status = 'success';
    }, 1000);

    return transaction;
  }

  async getTransaction(hash: string) {
    const tx = this.transactions.get(hash);
    if (!tx) {
      throw new Error('Transaction not found');
    }
    return tx;
  }
}

class MockCrossMintUniversalWalletService {
  private balances = new Map<string, any[]>();
  private crossmintService: MockRealCrossMintService;

  constructor(crossmintService: MockRealCrossMintService) {
    this.crossmintService = crossmintService;
  }

  async getBalances(owner?: string) {
    const defaultBalances = [
      {
        address: 'native',
        symbol: 'ETH',
        name: 'Ethereum',
        decimals: 18,
        balance: '1.5',
        balanceFormatted: '1.500000',
        valueUsd: 3750,
        priceUsd: 2500,
        chain: 'ethereum',
        isNative: true,
      },
      {
        address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        symbol: 'USDC',
        name: 'USD Coin',
        decimals: 6,
        balance: '1000',
        balanceFormatted: '1000.000000',
        valueUsd: 1000,
        priceUsd: 1,
        chain: 'ethereum',
        isNative: false,
      },
    ];

    return this.balances.get(owner || 'default') || defaultBalances;
  }

  async transfer(params: any) {
    // Validate transfer params
    if (!params.to || !params.amount) {
      throw new Error('Invalid transfer parameters');
    }

    // Create transaction through crossmint service
    const tx = await this.crossmintService.createTransfer({
      walletId: params.from || 'default',
      to: params.to,
      amount: params.amount,
      currency: params.tokenAddress ? 'USDC' : 'ETH',
    });

    return {
      hash: tx.hash,
      status: tx.status === 'success' ? 'confirmed' : 'pending',
      chain: params.chain || 'ethereum',
      gasUsed: tx.gas,
      gasPrice: tx.gasPrice,
      confirmations: tx.status === 'success' ? 1 : 0,
      timestamp: new Date().getTime(),
    };
  }

  async getTransaction(hash: string, chain?: string) {
    const tx = await this.crossmintService.getTransaction(hash);
    return {
      hash: tx.hash,
      status: tx.status === 'success' ? 'confirmed' : 'pending',
      chain: tx.chain || chain || 'ethereum',
      gasUsed: tx.gas,
      gasPrice: tx.gasPrice,
      confirmations: tx.status === 'success' ? 1 : 0,
      timestamp: new Date(tx.createdAt).getTime(),
    };
  }

  async createWallet(params: any) {
    const wallet = await this.crossmintService.createWallet({
      type: params.type === 'mpc' ? 'evm-mpc-wallet' : 'evm-smart-wallet',
      linkedUser: params.metadata?.userId || 'default-user',
    });

    return {
      id: `wallet-${wallet.address}`,
      address: wallet.address,
      type: wallet.type.includes('mpc') ? 'mpc' : 'smart',
      name: params.name,
      chain: 'ethereum',
      metadata: { linkedUser: wallet.linkedUser },
      isActive: true,
      createdAt: new Date(wallet.createdAt).getTime(),
    };
  }
}

describe('CrossmintAdapter Integration Tests', () => {
  let runtime: IAgentRuntime;
  let adapter: CrossmintAdapter;
  let mockCrossmintService: MockRealCrossMintService;
  let mockWalletService: MockCrossMintUniversalWalletService;

  beforeEach(() => {
    // Create mock services
    mockCrossmintService = new MockRealCrossMintService();
    mockWalletService = new MockCrossMintUniversalWalletService(mockCrossmintService);

    // Mock runtime
    runtime = {
      agentId: asUUID('00000000-0000-0000-0000-000000000123'),
      getSetting: mock((key: string) => {
        const settings: Record<string, string> = {
          CROSSMINT_API_KEY: 'test-api-key',
          CROSSMINT_PROJECT_ID: 'test-project-id',
          CROSSMINT_ENVIRONMENT: 'sandbox',
        };
        return settings[key];
      }),
      getService: mock((name: string) => {
        if (name === 'real-crossmint') {
          return mockCrossmintService;
        }
        if (name === 'crossmint-universal-wallet') {
          return mockWalletService;
        }
        return null;
      }),
    } as any;

    adapter = new CrossmintAdapter(runtime);
  });

  afterEach(() => {
    mock.restore();
  });

  describe('Initialization', () => {
    it('should initialize successfully with required services', async () => {
      await expect(adapter.initialize()).resolves.not.toThrow();
    });

    it('should throw error if required configuration is missing', async () => {
      runtime.getSetting = mock(() => undefined);

      await expect(adapter.initialize()).rejects.toThrow(CrossmintAdapterError);
      await expect(adapter.initialize()).rejects.toThrow('Missing required settings');
    });

    it('should throw error if services are not available', async () => {
      runtime.getService = mock(() => null);

      await expect(adapter.initialize()).rejects.toThrow(CrossmintAdapterError);
      await expect(adapter.initialize()).rejects.toThrow('No Crossmint services found');
    });

    it('should validate service interfaces correctly', async () => {
      // Test with incomplete service
      const incompleteService = { listWallets: () => {} };
      runtime.getService = mock((name: string) => {
        if (name === 'real-crossmint') {
          return incompleteService;
        }
        return null;
      });

      await expect(adapter.initialize()).rejects.toThrow('No Crossmint services found');
    });
  });

  describe('Balance Operations', () => {
    beforeEach(async () => {
      await adapter.initialize();
    });

    it('should get ETH balance correctly', async () => {
      const address = '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD3e';
      const balance = await adapter.getBalance(address, PaymentMethod.ETH);

      expect(balance).toBe(BigInt('1500000000000000000')); // 1.5 ETH
    });

    it('should get USDC balance correctly', async () => {
      const address = '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD3e';
      const balance = await adapter.getBalance(address, PaymentMethod.USDC_ETH);

      expect(balance).toBe(BigInt('1000000000')); // 1000 USDC (6 decimals)
    });

    it('should throw error for invalid address', async () => {
      const invalidAddress = 'invalid-address';

      await expect(adapter.getBalance(invalidAddress, PaymentMethod.ETH)).rejects.toThrow(
        'Invalid address format'
      );
    });

    it('should return zero balance for unknown token', async () => {
      const address = '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD3e';

      // Mock empty balances
      mockWalletService.getBalances = mock().mockResolvedValue([]);

      const balance = await adapter.getBalance(address, PaymentMethod.ETH);
      expect(balance).toBe(BigInt(0));
    });

    it('should handle decimal balance parsing correctly', async () => {
      // Mock balance with many decimals
      mockWalletService.getBalances = mock().mockResolvedValue([
        {
          address: 'native',
          symbol: 'ETH',
          name: 'Ethereum',
          decimals: 18,
          balance: '0.123456789012345678',
          balanceFormatted: '0.123456789012345678',
          valueUsd: 308.64,
          priceUsd: 2500,
          chain: 'ethereum',
          isNative: true,
        },
      ]);

      const address = '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD3e';
      const balance = await adapter.getBalance(address, PaymentMethod.ETH);

      expect(balance).toBe(BigInt('123456789012345678')); // Correct wei amount
    });
  });

  describe('Transaction Operations', () => {
    beforeEach(async () => {
      await adapter.initialize();
    });

    it('should send ETH transaction successfully', async () => {
      const fromAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD3e';
      const toAddress = '0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199';
      const amount = BigInt('1000000000000000000'); // 1 ETH

      const result = await adapter.sendTransaction(
        fromAddress,
        toAddress,
        amount,
        PaymentMethod.ETH
      );

      expect(result).toBeDefined();
      expect(result.hash).toMatch(/^0x[a-fA-F0-9]{64}$/);
      expect(result.status).toBe(PaymentStatus.PROCESSING);
      expect(result.confirmations).toBe(0);
    });

    it('should send USDC transaction successfully', async () => {
      const fromAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD3e';
      const toAddress = '0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199';
      const amount = BigInt('1000000'); // 1 USDC

      const result = await adapter.sendTransaction(
        fromAddress,
        toAddress,
        amount,
        PaymentMethod.USDC_ETH
      );

      expect(result).toBeDefined();
      expect(result.hash).toMatch(/^0x[a-fA-F0-9]{64}$/);
      expect(result.status).toBe(PaymentStatus.PROCESSING);
    });

    it('should throw error for invalid recipient address', async () => {
      const fromAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD3e';
      const invalidToAddress = 'invalid-address';
      const amount = BigInt('1000000000000000000');

      await expect(
        adapter.sendTransaction(fromAddress, invalidToAddress, amount, PaymentMethod.ETH)
      ).rejects.toThrow('Invalid address format');
    });

    it('should throw error for zero amount', async () => {
      const fromAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD3e';
      const toAddress = '0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199';
      const amount = BigInt(0);

      await expect(
        adapter.sendTransaction(fromAddress, toAddress, amount, PaymentMethod.ETH)
      ).rejects.toThrow('Invalid amount');
    });

    it('should get transaction status', async () => {
      // First create a transaction
      const fromAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD3e';
      const toAddress = '0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199';
      const amount = BigInt('1000000000000000000');

      const sendResult = await adapter.sendTransaction(
        fromAddress,
        toAddress,
        amount,
        PaymentMethod.ETH
      );

      // Get transaction status
      const txStatus = await adapter.getTransaction(sendResult.hash);

      expect(txStatus).toBeDefined();
      expect(txStatus.hash).toBe(sendResult.hash);
      expect(txStatus.status).toBe(PaymentStatus.PROCESSING);

      // Wait for confirmation and check again
      await new Promise((resolve) => setTimeout(resolve, 1100));

      const confirmedStatus = await adapter.getTransaction(sendResult.hash);
      expect(confirmedStatus.status).toBe(PaymentStatus.COMPLETED);
      expect(confirmedStatus.confirmations).toBe(1);
    });

    it('should handle transaction not found gracefully', async () => {
      const unknownHash = `0x${'0'.repeat(64)}`;

      const result = await adapter.getTransaction(unknownHash);

      expect(result.hash).toBe(unknownHash);
      expect(result.status).toBe(PaymentStatus.PROCESSING);
      expect(result.confirmations).toBe(0);
    });
  });

  describe('Wallet Operations', () => {
    beforeEach(async () => {
      await adapter.initialize();
    });

    it('should create MPC wallet successfully', async () => {
      const wallet = await adapter.createWallet();

      expect(wallet).toBeDefined();
      expect(wallet.address).toMatch(/^0x[a-fA-F0-9]{40}$/);
      expect(wallet.privateKey).toBe(''); // MPC wallets don't expose private keys
    });

    it('should create wallet with proper metadata', async () => {
      const spy = mock.spyOn(mockWalletService, 'createWallet');

      await adapter.createWallet();

      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'mpc',
          name: expect.stringContaining('Payment Wallet'),
          metadata: expect.objectContaining({
            purpose: 'payments',
            createdBy: 'payment-service',
            createdAt: expect.any(String),
          }),
        })
      );
    });
  });

  describe('Address Validation', () => {
    beforeEach(async () => {
      await adapter.initialize();
    });

    it('should validate EVM addresses correctly', () => {
      const validAddresses = [
        '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD3e',
        '0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199',
        '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      ];

      validAddresses.forEach((address) => {
        expect(adapter.validateAddress(address, PaymentMethod.ETH)).toBe(true);
        expect(adapter.validateAddress(address, PaymentMethod.USDC_ETH)).toBe(true);
      });
    });

    it('should reject invalid EVM addresses', () => {
      const invalidAddresses = [
        '',
        '0x',
        '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD3', // Too short
        '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD3e1', // Too long
        '742d35Cc6634C0532925a3b844Bc9e7595f2bD3e', // Missing 0x
        '0xZZZZ35Cc6634C0532925a3b844Bc9e7595f2bD3e', // Invalid hex
      ];

      invalidAddresses.forEach((address) => {
        expect(adapter.validateAddress(address, PaymentMethod.ETH)).toBe(false);
      });
    });

    it('should validate Solana addresses correctly', () => {
      const validAddress = '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZjDpNqYV4N';
      expect(adapter.validateAddress(validAddress, PaymentMethod.SOL)).toBe(true);
    });

    it('should reject invalid Solana addresses', () => {
      const invalidAddresses = [
        '',
        '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD3e', // EVM address
        'invalid-base58-chars!@#',
        '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZjD', // Too short (38 chars)
        '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZjDpNqYV4N7xKXtg2CW87d97', // Too long
      ];

      invalidAddresses.forEach((address) => {
        const isValid = adapter.validateAddress(address, PaymentMethod.SOL);
        expect(isValid).toBe(false);
      });
    });

    it('should reject unsupported payment methods', () => {
      const address = '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD3e';
      expect(adapter.validateAddress(address, PaymentMethod.BTC)).toBe(false);
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      await adapter.initialize();
    });

    it('should throw specific error when adapter not initialized', async () => {
      const uninitializedAdapter = new CrossmintAdapter(runtime);

      await expect(
        uninitializedAdapter.getBalance(
          '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD3e',
          PaymentMethod.ETH
        )
      ).rejects.toThrow('Adapter not initialized');
    });

    it('should handle service errors gracefully', async () => {
      // Mock service error
      mockWalletService.transfer = mock().mockRejectedValue(new Error('Network error'));

      const fromAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD3e';
      const toAddress = '0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199';
      const amount = BigInt('1000000000000000000');

      await expect(
        adapter.sendTransaction(fromAddress, toAddress, amount, PaymentMethod.ETH)
      ).rejects.toThrow(CrossmintAdapterError);
    });

    it('should preserve error details in CrossmintAdapterError', async () => {
      const originalError = new Error('Original error message');
      mockWalletService.getBalances = mock().mockRejectedValue(originalError);

      try {
        await adapter.getBalance('0x742d35Cc6634C0532925a3b844Bc9e7595f2bD3e', PaymentMethod.ETH);
      } catch (error) {
        expect(error).toBeInstanceOf(CrossmintAdapterError);
        expect((error as CrossmintAdapterError).code).toBe('BALANCE_ERROR');
        expect((error as CrossmintAdapterError).details).toBe(originalError);
      }
    });
  });

  describe('Multi-chain Support', () => {
    beforeEach(async () => {
      await adapter.initialize();
    });

    it('should handle different chains correctly', async () => {
      const address = '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD3e';

      // Test different chain methods
      const methods = [
        PaymentMethod.ETH,
        PaymentMethod.MATIC,
        PaymentMethod.ARB,
        PaymentMethod.OP,
        PaymentMethod.BASE,
      ];

      for (const method of methods) {
        expect(adapter.validateAddress(address, method)).toBe(true);
      }
    });

    it('should use correct token addresses for different networks', async () => {
      // Test mainnet
      runtime.getSetting = mock((key: string) => {
        if (key === 'CROSSMINT_ENVIRONMENT') {
          return 'production';
        }
        return 'test-value';
      });

      const fromAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD3e';
      const toAddress = '0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199';
      const amount = BigInt('1000000');

      const spy = mock.spyOn(mockWalletService, 'transfer');

      await adapter.sendTransaction(fromAddress, toAddress, amount, PaymentMethod.USDC_ETH);

      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          tokenAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // Mainnet USDC
        })
      );
    });

    it('should use testnet addresses in sandbox mode', async () => {
      const fromAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD3e';
      const toAddress = '0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199';
      const amount = BigInt('1000000');

      const spy = mock.spyOn(mockWalletService, 'transfer');

      await adapter.sendTransaction(fromAddress, toAddress, amount, PaymentMethod.USDC_ETH);

      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          tokenAddress: '0x07865c6E87B9F70255377e024ace6630C1Eaa37F', // Goerli USDC
        })
      );
    });
  });
});
