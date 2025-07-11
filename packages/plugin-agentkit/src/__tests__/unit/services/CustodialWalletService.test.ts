import { describe, it, expect, mock, beforeEach } from 'bun:test';
import { createMockRuntime, createMockWallet as _createMockWallet } from '../../test-utils';
import type { IAgentRuntime } from '@elizaos/core';
import type { CustodialWallet as _CustodialWallet } from '../../../types/wallet';

// Mock the WalletRepository module
mock.module('../../../database/WalletRepository', () => ({
  WalletRepository: mock().mockImplementation(() => ({
    initialize: mock().mockResolvedValue(undefined),
    saveWallet: mock().mockResolvedValue(undefined),
    getWallet: mock().mockResolvedValue(null),
    getWalletsForEntity: mock().mockResolvedValue([]),
    getAllWallets: mock().mockResolvedValue([]),
    updateWalletStatus: mock().mockResolvedValue(undefined),
    updateWalletLastUsed: mock().mockResolvedValue(undefined),
    savePermission: mock().mockResolvedValue(undefined),
    removePermission: mock().mockResolvedValue(undefined),
    saveTransaction: mock().mockResolvedValue(undefined),
    updateTransactionStatus: mock().mockResolvedValue(undefined),
    getWalletTransactions: mock().mockResolvedValue([]),
  })),
}));

// Mock @coinbase/agentkit module
mock.module('@coinbase/agentkit', () => ({
  AgentKit: {
    from: mock().mockResolvedValue({
      wallet: {
        address: '0x1234567890123456789012345678901234567890',
        id: 'mock-wallet-id',
      },
    }),
  },
  CdpWalletProvider: {
    configureWithWallet: mock().mockResolvedValue({
      address: '0x1234567890123456789012345678901234567890',
      id: 'mock-wallet-provider-id',
      getNetwork: mock().mockResolvedValue('base-sepolia'),
      getAddress: mock().mockResolvedValue('0x1234567890123456789012345678901234567890'),
      exportWallet: mock().mockResolvedValue({
        walletId: 'mock-wallet-id',
        seed: 'mock-seed-data',
        privateKey: 'mock-private-key',
      }),
    }),
  },
}));

import { CustodialWalletService } from '../../../services/CustodialWalletService';

describe('CustodialWalletService', () => {
  let service: CustodialWalletService;
  let mockRuntime: IAgentRuntime;
  let _mockRepository: any;

  beforeEach(() => {
    // Create mock runtime
    mockRuntime = createMockRuntime();
    service = new CustodialWalletService(mockRuntime);
  });

  describe('initialization', () => {
    it('should initialize the service and repository', async () => {
      await service.initialize();

      // Service should initialize without throwing
      expect(service).toBeDefined();
    });
  });

  describe('wallet operations', () => {
    it('should create a wallet', async () => {
      const walletData = {
        name: 'Test Wallet',
        ownerId: 'user-123' as any,
        purpose: 'testing',
      };

      await service.initialize();
      const wallet = await service.createWallet(walletData);

      expect(wallet).toBeDefined();
      expect(wallet.name).toBe(walletData.name);
      expect(wallet.ownerId).toBe(walletData.ownerId);
    });

    it('should get a wallet by ID', async () => {
      await service.initialize();

      // Should return null for non-existent wallet (mocked repository returns null)
      const wallet = await service.getWallet('wallet-123' as any);
      expect(wallet).toBeNull();
    });

    it('should get wallets for an entity', async () => {
      await service.initialize();

      // Should return empty array (mocked repository returns empty array)
      const wallets = await service.getWalletsForEntity('entity-123' as any);
      expect(Array.isArray(wallets)).toBe(true);
    });
  });

  describe('permission management', () => {
    it('should check permissions correctly', async () => {
      await service.initialize();

      // Test should not crash when checking permissions on non-existent wallet
      const hasPermission = await service.hasPermission(
        'wallet-123' as any,
        'user-456' as any,
        'view'
      );
      expect(typeof hasPermission).toBe('boolean');
    });
  });
});
