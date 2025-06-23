import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WalletRepository } from '../../../database/WalletRepository';
import type { UUID } from '@elizaos/core';
import type { IAgentRuntime } from '../../../types/core.d';
import type { CustodialWallet, WalletPermission, WalletTransaction } from '../../../types/wallet';

describe('WalletRepository', () => {
    let repository: WalletRepository;
    let mockRuntime: IAgentRuntime;
    let mockDb: any;

    beforeEach(() => {
        vi.clearAllMocks();

        // Mock database operations
        mockDb = {
            execute: vi.fn().mockResolvedValue({ changes: 1 }),
            query: vi.fn().mockResolvedValue([]),
            all: vi.fn().mockResolvedValue([]),
            run: vi.fn().mockResolvedValue({ changes: 1 }),
            get: vi.fn().mockResolvedValue(null),
        };

        // Mock runtime with db property
        mockRuntime = {
            agentId: 'test-agent-id' as UUID,
            db: mockDb,  // Direct db property
            databaseAdapter: {
                db: mockDb  // Also provide through databaseAdapter
            },
            logger: {
                info: vi.fn(),
                error: vi.fn(),
                warn: vi.fn(),
                debug: vi.fn(),
            },
        } as unknown as IAgentRuntime;

        repository = new WalletRepository(mockRuntime);
    });

    describe('initialize', () => {
        it('should create tables on initialization', async () => {
            await repository.initialize();

            // Should create 3 tables and 8 indexes
            const totalCalls = mockDb.run.mock.calls.length;
            expect(totalCalls).toBeGreaterThanOrEqual(3);
            
            // Check that tables are created
            const createTableCalls = mockDb.run.mock.calls.filter(call => 
                call[0].includes('CREATE TABLE IF NOT EXISTS')
            );
            expect(createTableCalls).toHaveLength(3);
            expect(createTableCalls[0][0]).toContain('custodial_wallets');
            expect(createTableCalls[1][0]).toContain('wallet_permissions');
            expect(createTableCalls[2][0]).toContain('wallet_transactions');
        });

        it('should handle initialization errors', async () => {
            mockDb.run.mockRejectedValueOnce(new Error('Database error'));

            await expect(repository.initialize()).rejects.toThrow('Database error');
        });
    });

    describe('saveWallet', () => {
        it('should save a new wallet', async () => {
            const wallet: CustodialWallet = {
                id: 'wallet-123' as UUID,
                address: '0x1234567890123456789012345678901234567890',
                network: 'base-sepolia',
                name: 'Test Wallet',
                ownerId: 'user-123' as UUID,
                permissions: []
                status: 'active',
                createdAt: Date.now(),
                requiredTrustLevel: 50,
                isPool: false,
                metadata: {
                    trustLevel: 50,
                },
            };

            await repository.saveWallet(wallet);

            expect(mockDb.run).toHaveBeenCalledWith(
                expect.stringContaining('INSERT OR REPLACE INTO custodial_wallets'),
                expect.arrayContaining([
                    wallet.id,
                    wallet.address,
                    wallet.network,
                    wallet.name,
                ])
            );
        });

        it('should handle save errors', async () => {
            mockDb.run.mockRejectedValueOnce(new Error('Save failed'));

            const wallet = {
                id: 'wallet-123' as UUID,
                address: '0x123',
                network: 'ethereum',
                name: 'Test Wallet',
                ownerId: 'entity-123' as UUID,
                permissions: []
                status: 'active',
                createdAt: Date.now(),
                requiredTrustLevel: 50,
                isPool: false,
                metadata: {
                    trustLevel: 50
                },
            } as CustodialWallet;
            await expect(repository.saveWallet(wallet)).rejects.toThrow('Save failed');
        });
    });

    describe('getWallet', () => {
        it('should retrieve a wallet by ID', async () => {
            const mockWallet = {
                id: 'wallet-123',
                address: '0x1234567890123456789012345678901234567890',
                metadata: '{"key": "value"}',
                permissions: '[]',
                required_trust_level: 50,
                is_pool: 0,
            };

            mockDb.get.mockResolvedValueOnce(mockWallet);
            mockDb.all.mockResolvedValueOnce([]); // No permissions

            const wallet = await repository.getWallet('wallet-123' as UUID);

            expect(wallet).toBeDefined();
            expect(wallet?.id).toBe('wallet-123');
            expect(wallet?.metadata).toEqual({ key: 'value' });
            expect(mockDb.get).toHaveBeenCalledWith(
                expect.stringContaining('SELECT * FROM custodial_wallets WHERE id = ?'),
                ['wallet-123']
            );
        });

        it('should return null for non-existent wallet', async () => {
            mockDb.get.mockResolvedValueOnce(null);

            const wallet = await repository.getWallet('non-existent' as UUID);

            expect(wallet).toBeNull();
        });

        it('should handle query errors', async () => {
            mockDb.get.mockRejectedValueOnce(new Error('Query failed'));

            await expect(repository.getWallet('wallet-123' as UUID)).rejects.toThrow('Query failed');
        });
    });

    describe('getWalletsForEntity', () => {
        it('should retrieve wallets for an entity', async () => {
            const mockWallets = [
                {
                    id: 'wallet-1',
                    address: '0x1111111111111111111111111111111111111111',
                    metadata: '{}',
                    permissions: '[{"entityId": "entity-123", "type": "admin"}]',
                    required_trust_level: 50,
                    is_pool: 0,
                },
                {
                    id: 'wallet-2',
                    address: '0x2222222222222222222222222222222222222222',
                    metadata: '{}',
                    permissions: '[{"entityId": "entity-123", "type": "view"}]',
                    required_trust_level: 50,
                    is_pool: 0,
                },
            ];

            mockDb.all.mockResolvedValueOnce(mockWallets);
            // Mock permission queries
            mockDb.all.mockResolvedValueOnce([]); // No permissions for wallet-1
            mockDb.all.mockResolvedValueOnce([]); // No permissions for wallet-2

            const wallets = await repository.getWalletsForEntity('entity-123' as UUID);

            expect(wallets).toHaveLength(2);
            expect(wallets[0].id).toBe('wallet-1');
            expect(wallets[1].id).toBe('wallet-2');
        });

        it('should return empty array when no wallets found', async () => {
            mockDb.all.mockResolvedValueOnce([]);

            const wallets = await repository.getWalletsForEntity('entity-123' as UUID);

            expect(wallets).toEqual([]);
        });
    });

    describe('permissions', () => {
        it('should save a permission', async () => {
            const permission: WalletPermission = {
                entityId: 'entity-123' as UUID,
                type: 'admin',
                grantedAt: Date.now(),
                grantedBy: 'granter-123' as UUID,
                allowedOperations: ['view', 'transfer', 'admin'],
            };

            await repository.savePermission('wallet-123' as UUID, permission);

            expect(mockDb.run).toHaveBeenCalledWith(
                expect.stringContaining('INSERT OR REPLACE INTO wallet_permissions'),
                expect.arrayContaining([
                    expect.stringContaining('wallet-123'),
                    'wallet-123',
                    permission.entityId,
                    permission.type,
                ])
            );
        });

        it('should remove a permission', async () => {
            await repository.removePermission('wallet-123' as UUID, 'entity-123' as UUID, 'admin');

            expect(mockDb.run).toHaveBeenCalledWith(
                expect.stringContaining('DELETE FROM wallet_permissions'),
                ['wallet-123', 'entity-123', 'admin']
            );
        });
    });

    describe('transactions', () => {
        it('should save a transaction', async () => {
            const transaction: WalletTransaction = {
                id: 'tx-123' as UUID,
                walletId: 'wallet-123' as UUID,
                fromAddress: '0x1234567890123456789012345678901234567890',
                toAddress: '0xabcdef1234567890abcdef1234567890abcdef12',
                amountWei: BigInt('1000000000000000000'),
                initiatedBy: 'user-123' as UUID,
                transactionType: 'eth_transfer',
                status: 'pending',
                createdAt: Date.now(),
            };

            await repository.saveTransaction(transaction);

            expect(mockDb.run).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO wallet_transactions'),
                expect.arrayContaining([
                    transaction.id,
                    transaction.walletId,
                    '1000000000000000000',
                ])
            );
        });

        it('should update transaction status', async () => {
            await repository.updateTransactionStatus('tx-123' as UUID, 'confirmed', '0xhash123', 'Success');

            expect(mockDb.run).toHaveBeenCalledWith(
                expect.stringContaining('UPDATE wallet_transactions SET status = ?'),
                expect.arrayContaining(['confirmed', '0xhash123'])
            );
        });

        it('should get wallet transactions', async () => {
            const mockTransactions = [
                {
                    id: 'tx-1',
                    wallet_id: 'wallet-123',
                    amount_wei: '1000000000000000000',
                    metadata: '{}',
                },
            ];

            mockDb.all.mockResolvedValueOnce(mockTransactions);

            const transactions = await repository.getWalletTransactions('wallet-123' as UUID, 10, 0);

            expect(transactions).toHaveLength(1);
            expect(transactions[0].amountWei).toBe(BigInt('1000000000000000000'));
        });
    });

    describe('wallet status updates', () => {
        it('should update wallet status', async () => {
            await repository.updateWalletStatus('wallet-123' as UUID, 'suspended');

            expect(mockDb.run).toHaveBeenCalledWith(
                expect.stringContaining('UPDATE custodial_wallets SET status = ?'),
                ['suspended', 'wallet-123']
            );
        });

        it('should update wallet last used timestamp', async () => {
            await repository.updateWalletLastUsed('wallet-123' as UUID);

            expect(mockDb.run).toHaveBeenCalledWith(
                expect.stringContaining('UPDATE custodial_wallets SET last_used_at = ?'),
                [expect.any(Number), 'wallet-123']
            );
        });
    });

    describe('getAllWallets', () => {
        it('should retrieve all wallets', async () => {
            const mockWallets = [
                { id: 'wallet-1', metadata: '{}', permissions: '[]', required_trust_level: 50, is_pool: 0 },
                { id: 'wallet-2', metadata: '{}', permissions: '[]', required_trust_level: 50, is_pool: 0 },
            ];

            mockDb.all.mockResolvedValueOnce(mockWallets);
            // Mock permission queries
            mockDb.all.mockResolvedValueOnce([]); // No permissions for wallet-1
            mockDb.all.mockResolvedValueOnce([]); // No permissions for wallet-2

            const wallets = await repository.getAllWallets();

            expect(wallets).toHaveLength(2);
            expect(mockDb.all).toHaveBeenCalledWith(
                expect.stringContaining('SELECT * FROM custodial_wallets')
            );
        });
    });

    describe('getWalletsForRoom', () => {
        it('should retrieve wallets for a room', async () => {
            const mockWallets = [
                { 
                    id: 'wallet-1', 
                    room_id: 'room-123', 
                    metadata: '{}', 
                    permissions: '[]',
                    required_trust_level: 50,
                    is_pool: 0,
                },
            ];

            mockDb.all.mockResolvedValueOnce(mockWallets);
            mockDb.all.mockResolvedValueOnce([]); // No permissions

            const wallets = await repository.getWalletsForRoom('room-123' as UUID);

            expect(wallets).toHaveLength(1);
            expect(wallets[0].roomId).toBe('room-123');
        });
    });

    describe('getWalletsForWorld', () => {
        it('should retrieve wallets for a world', async () => {
            const mockWallets = [
                { 
                    id: 'wallet-1', 
                    world_id: 'world-123', 
                    metadata: '{}', 
                    permissions: '[]',
                    required_trust_level: 50,
                    is_pool: 0,
                },
            ];

            mockDb.all.mockResolvedValueOnce(mockWallets);
            mockDb.all.mockResolvedValueOnce([]); // No permissions

            const wallets = await repository.getWalletsForWorld('world-123' as UUID);

            expect(wallets).toHaveLength(1);
            expect(wallets[0].worldId).toBe('world-123');
        });
    });
}); 