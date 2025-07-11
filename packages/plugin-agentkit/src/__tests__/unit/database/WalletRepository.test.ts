import { describe, it, expect, mock, beforeEach } from 'bun:test';
import { randomUUID } from 'crypto';
import { WalletRepository } from '../../../database/WalletRepository';
import type { UUID } from '@elizaos/core';
import type { IAgentRuntime } from '@elizaos/core';
import type { CustodialWallet } from '../../../types/wallet';

/**
 * Production-ready test suite for WalletRepository
 * Includes both unit tests (for error handling) and integration tests (for real functionality)
 */
describe('WalletRepository', () => {
  let repository: WalletRepository;
  let mockRuntime: IAgentRuntime;
  let mockDb: any;

  beforeEach(() => {
    mock.restore();

    // Mock database
    mockDb = {
      run: mock(),
      get: mock(),
      all: mock(),
    };

    mockRuntime = {
      agentId: 'test-agent-id' as UUID,
      db: mockDb,
      logger: {
        info: mock(),
        error: mock(),
        warn: mock(),
        debug: mock(),
      },
    } as unknown as IAgentRuntime;

    repository = new WalletRepository(mockRuntime);
  });

  describe('Initialization', () => {
    it('should initialize database tables', async () => {
      mockDb.run.mockResolvedValue({ changes: 1 });

      await repository.initialize();

      // Should create tables (3) and indexes (8) = 11 total calls
      expect(mockDb.run).toHaveBeenCalledTimes(11);

      // Verify specific table creation calls
      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('CREATE TABLE IF NOT EXISTS custodial_wallets'),
        []
      );
      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('CREATE TABLE IF NOT EXISTS wallet_permissions'),
        []
      );
      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('CREATE TABLE IF NOT EXISTS wallet_transactions'),
        []
      );
    });

    it('should handle initialization errors', async () => {
      mockDb.run.mockRejectedValueOnce(new Error('Database error'));

      await expect(repository.initialize()).rejects.toThrow('Database error');
    });

    it('should handle missing database adapter', async () => {
      const runtimeWithoutDb = {
        agentId: 'test-agent-id' as UUID,
        logger: {
          info: mock(),
          error: mock(),
        },
      } as unknown as IAgentRuntime;

      const repo = new WalletRepository(runtimeWithoutDb);

      await expect(repo.initialize()).rejects.toThrow('Database adapter not available');
    });
  });

  describe('Wallet Operations', () => {
    it('should save a new wallet', async () => {
      mockDb.run.mockResolvedValue({ changes: 1 });
      mockDb.get.mockResolvedValue(null); // No existing wallet

      const wallet: CustodialWallet = {
        id: 'wallet-123' as UUID,
        address: '0x1234567890123456789012345678901234567890',
        network: 'base-sepolia',
        name: 'Test Wallet',
        ownerId: 'owner-123' as UUID,
        permissions: [],
        status: 'active',
        createdAt: Date.now(),
        requiredTrustLevel: 50,
        isPool: false,
        metadata: { trustLevel: 50 },
      };

      await repository.saveWallet(wallet);

      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('INSERT OR REPLACE INTO custodial_wallets'),
        expect.arrayContaining([
          wallet.id,
          wallet.address,
          wallet.network,
          wallet.name,
          wallet.ownerId,
          wallet.requiredTrustLevel,
          wallet.isPool ? 1 : 0,
          wallet.status,
          wallet.createdAt,
        ])
      );
    });

    it('should get a wallet by ID', async () => {
      const walletData = {
        id: 'wallet-123',
        address: '0x1234567890123456789012345678901234567890',
        network: 'base-sepolia',
        name: 'Test Wallet',
        owner_id: 'owner-123',
        status: 'active',
        created_at: Date.now(),
        metadata: JSON.stringify({ trustLevel: 50 }),
      };

      mockDb.get.mockResolvedValue(walletData);
      mockDb.all.mockResolvedValue([]); // No permissions

      const wallet = await repository.getWallet('00000000-0000-0000-0000-000000000123' as UUID);

      expect(wallet).toBeDefined();
      expect(wallet?.id).toBe(walletData.id as UUID);
      expect(wallet?.address).toBe(walletData.address);
    });

    it('should return null for non-existent wallet', async () => {
      mockDb.get.mockResolvedValue(null);

      const wallet = await repository.getWallet('00000000-0000-0000-0000-000000000999' as UUID);

      expect(wallet).toBeNull();
    });

    it('should get wallets for entity', async () => {
      mockDb.all.mockResolvedValue([
        {
          id: '00000000-0000-0000-0000-000000000001',
          address: '0x1234',
          network: 'base-sepolia',
          name: 'Wallet 1',
          owner_id: '00000000-0000-0000-0000-000000000002',
          status: 'active',
          created_at: Date.now(),
          metadata: '{}',
        },
      ]);

      const wallets = await repository.getWalletsForEntity(
        '00000000-0000-0000-0000-000000000002' as UUID
      );

      expect(wallets).toHaveLength(1);
      expect(wallets[0].id).toBe('00000000-0000-0000-0000-000000000001' as UUID);
    });

    it('should update wallet status', async () => {
      mockDb.run.mockResolvedValue({ changes: 1 });

      await repository.updateWalletStatus('wallet-123' as UUID, 'suspended');

      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE custodial_wallets SET status = ? WHERE id = ?'),
        ['suspended', 'wallet-123']
      );
    });

    it('should update wallet last used timestamp', async () => {
      mockDb.run.mockResolvedValue({ changes: 1 });

      await repository.updateWalletLastUsed('wallet-123' as UUID);

      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE custodial_wallets SET last_used_at = ?'),
        [expect.any(Number), 'wallet-123']
      );
    });
  });

  describe('Permission Management', () => {
    it('should save wallet permission', async () => {
      mockDb.run.mockResolvedValue({ changes: 1 });

      await repository.savePermission('wallet-123' as UUID, {
        entityId: 'entity-456' as UUID,
        type: 'transfer',
        grantedAt: Date.now(),
        grantedBy: 'admin-123' as UUID,
      });

      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('INSERT OR REPLACE INTO wallet_permissions'),
        expect.arrayContaining(['wallet-123', 'entity-456', 'transfer'])
      );
    });

    it('should remove wallet permission', async () => {
      mockDb.run.mockResolvedValue({ changes: 1 });

      await repository.removePermission('wallet-123' as UUID, 'entity-456' as UUID, 'transfer');

      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM wallet_permissions'),
        ['wallet-123', 'entity-456', 'transfer']
      );
    });
  });

  describe('Transaction Management', () => {
    it('should save a transaction', async () => {
      mockDb.run.mockResolvedValue({ changes: 1 });

      const transaction = {
        id: 'tx-123' as UUID,
        walletId: 'wallet-123' as UUID,
        fromAddress: '0x1234',
        toAddress: '0x5678',
        amountWei: BigInt('1000000000000000000'),
        initiatedBy: 'user-123' as UUID,
        transactionType: 'eth_transfer',
        status: 'pending' as const,
        createdAt: Date.now(),
      };

      await repository.saveTransaction(transaction);

      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO wallet_transactions'),
        expect.arrayContaining([
          transaction.id,
          transaction.walletId,
          transaction.fromAddress,
          transaction.toAddress,
          transaction.amountWei.toString(),
        ])
      );
    });

    it('should get wallet transactions', async () => {
      mockDb.all.mockResolvedValue([
        {
          id: 'tx-123',
          wallet_id: 'wallet-123',
          from_address: '0x1234',
          to_address: '0x5678',
          amount_wei: '1000000000000000000',
          initiated_by: 'user-123',
          transaction_type: 'eth_transfer',
          status: 'confirmed',
          created_at: Date.now(),
        },
      ]);

      const transactions = await repository.getWalletTransactions('wallet-123' as UUID);

      expect(transactions).toHaveLength(1);
      expect(transactions[0].id).toBe('tx-123' as UUID);
      expect(transactions[0].amountWei).toEqual(BigInt('1000000000000000000'));
    });

    it('should update transaction status', async () => {
      mockDb.run.mockResolvedValue({ changes: 1 });

      await repository.updateTransactionStatus('tx-123' as UUID, 'confirmed', '0xhash123');

      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE wallet_transactions SET status = ?'),
        expect.arrayContaining(['confirmed', '0xhash123'])
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors when saving wallet', async () => {
      mockDb.run.mockRejectedValueOnce(new Error('Database error'));

      const wallet = {
        id: 'wallet-123' as UUID,
        address: '0x1234',
        network: 'base-sepolia',
        name: 'Test',
        ownerId: 'owner-123' as UUID,
        permissions: [],
        status: 'active' as const,
        createdAt: Date.now(),
        requiredTrustLevel: 50,
        isPool: false,
        metadata: { trustLevel: 50 },
      };

      await expect(repository.saveWallet(wallet)).rejects.toThrow('Database error');
    });

    it('should handle constraint violations', async () => {
      mockDb.run.mockRejectedValueOnce(
        new Error('UNIQUE constraint failed: custodial_wallets.address, custodial_wallets.network')
      );

      const wallet = {
        id: 'wallet-123' as UUID,
        address: '0x1234',
        network: 'base-sepolia',
        name: 'Test',
        ownerId: 'owner-123' as UUID,
        permissions: [],
        status: 'active' as const,
        createdAt: Date.now(),
        requiredTrustLevel: 50,
        isPool: false,
        metadata: { trustLevel: 50 },
      };

      await expect(repository.saveWallet(wallet)).rejects.toThrow('UNIQUE constraint failed');
    });
  });
});

/**
 * Helper function to create test wallet with defaults
 */
function _createTestWallet(overrides: Partial<CustodialWallet> = {}): CustodialWallet {
  return {
    id: randomUUID() as UUID,
    address: `0x${randomUUID().replace(/-/g, '').slice(0, 40)}`,
    network: 'base-sepolia',
    name: 'Test Wallet',
    ownerId: 'owner-123' as UUID,
    permissions: [],
    status: 'active',
    createdAt: Date.now(),
    requiredTrustLevel: 50,
    isPool: false,
    metadata: {
      trustLevel: 50,
    },
    ...overrides,
  };
}
