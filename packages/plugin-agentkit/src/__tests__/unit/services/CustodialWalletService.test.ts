import { describe, it, expect, mock, beforeEach } from 'bun:test';
import { CustodialWalletService } from '../../../services/CustodialWalletService';
import { createMockRuntime, createMockWallet } from '../../test-utils';
import type { IAgentRuntime } from '../../../types/core.d';
import type { CustodialWallet } from '../../../types/wallet';

describe('CustodialWalletService', () => {
  let service: CustodialWalletService;
  let mockRuntime: IAgentRuntime;
  let mockRepository: any;

  beforeEach(() => {
    mock.restore();

    // Create mock repository
    mockRepository = {
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
    };

    // Create mock runtime
    mockRuntime = createMockRuntime();

    // Mock the repository creation
    const originalModule = require('../../../database/WalletRepository');
    originalModule.WalletRepository = mock().mockImplementation(() => mockRepository);

    service = new CustodialWalletService(mockRuntime);
  });

  describe('initialization', () => {
    it('should initialize the service and repository', async () => {
      await service.initialize();

      expect(mockRepository.initialize).toHaveBeenCalled();
    });
  });

  describe('wallet operations', () => {
    it('should create a wallet', async () => {
      const walletData = {
        name: 'Test Wallet',
        ownerId: 'user-123' as any,
        purpose: 'testing',
      };

      const wallet = await service.createWallet(walletData);

      expect(wallet).toBeDefined();
      expect(wallet.name).toBe(walletData.name);
      expect(wallet.ownerId).toBe(walletData.ownerId);
      expect(mockRepository.saveWallet).toHaveBeenCalledWith(expect.objectContaining({
        name: walletData.name,
        ownerId: walletData.ownerId,
      }));
    });

    it('should get a wallet by ID', async () => {
      const mockWallet = createMockWallet();
      mockRepository.getWallet.mockResolvedValueOnce(mockWallet);

      const wallet = await service.getWallet(mockWallet.id);

      expect(wallet).toEqual(mockWallet);
      expect(mockRepository.getWallet).toHaveBeenCalledWith(mockWallet.id);
    });

    it('should get wallets for an entity', async () => {
      const mockWallets = [createMockWallet(), createMockWallet()];
      mockRepository.getWalletsForEntity.mockResolvedValueOnce(mockWallets);

      const wallets = await service.getWalletsForEntity('entity-123' as any);

      expect(wallets).toEqual(mockWallets);
      expect(mockRepository.getWalletsForEntity).toHaveBeenCalledWith('entity-123');
    });
  });

  describe('permission management', () => {
    it('should check permissions correctly', async () => {
      const wallet = createMockWallet({
        ownerId: 'owner-123' as any,
        permissions: [{
          entityId: 'controller-456' as any,
          type: 'transfer',
          grantedAt: Date.now(),
          grantedBy: 'owner-123' as any,
        }],
      });
      mockRepository.getWallet.mockResolvedValueOnce(wallet);

      // Owner should have all permissions
      expect(await service.hasPermission(wallet.id, 'owner-123' as any, 'admin')).toBe(true);
      expect(await service.hasPermission(wallet.id, 'owner-123' as any, 'transfer')).toBe(true);
      expect(await service.hasPermission(wallet.id, 'owner-123' as any, 'view')).toBe(true);

      // Controller should have transfer permission
      mockRepository.getWallet.mockResolvedValueOnce(wallet);
      expect(await service.hasPermission(wallet.id, 'controller-456' as any, 'transfer')).toBe(true);

      // Controller should not have admin permission
      mockRepository.getWallet.mockResolvedValueOnce(wallet);
      expect(await service.hasPermission(wallet.id, 'controller-456' as any, 'admin')).toBe(false);

      // Stranger should have no permissions
      mockRepository.getWallet.mockResolvedValueOnce(wallet);
      expect(await service.hasPermission(wallet.id, 'stranger-789' as any, 'view')).toBe(false);
    });
  });
});
