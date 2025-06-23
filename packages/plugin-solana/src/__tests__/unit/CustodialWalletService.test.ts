import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { CustodialWalletService, EntityType } from '../../services/CustodialWalletService';
import { Connection, Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { logger } from '@elizaos/core';
import * as crypto from 'crypto';

// Mock dependencies
vi.mock('@solana/web3.js', () => ({
    Connection: vi.fn().mockImplementation(() => ({
        getBalance: vi.fn(),
        getAccountInfo: vi.fn(),
    })),
    Keypair: {
        fromSeed: vi.fn(),
        fromSecretKey: vi.fn(),
    },
    PublicKey: vi.fn().mockImplementation((key) => ({ 
        toString: () => key,
        toBase58: () => key,
    })),
    LAMPORTS_PER_SOL: 1000000000,
}));

vi.mock('crypto', () => ({
    randomBytes: vi.fn(),
    createHmac: vi.fn(),
    createCipher: vi.fn(),
    createDecipher: vi.fn(),
}));

vi.mock('bs58', () => ({
    default: {
        encode: vi.fn(),
        decode: vi.fn(),
    }
}));

vi.mock('@elizaos/core', () => ({
    Service: class Service {
        constructor(protected runtime: any) {}
    },
    logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
    },
}));

describe('CustodialWalletService', () => {
    let service: CustodialWalletService;
    let mockRuntime: any;
    let mockConnection: any;
    let mockKeypair: any;

    beforeEach(() => {
        vi.clearAllMocks();

        mockKeypair = {
            publicKey: { 
                toString: () => 'CustodialWalletPublicKey123',
                toBase58: () => 'CustodialWalletPublicKey123'
            },
            secretKey: new Uint8Array(64),
        };

        mockConnection = {
            getBalance: vi.fn(),
            getAccountInfo: vi.fn(),
        };

        mockRuntime = {
            getSetting: vi.fn((key: string) => {
                const settings: Record<string, string> = {
                    SOLANA_RPC_URL: 'https://api.devnet.solana.com',
                    SOLANA_NETWORK: 'devnet',
                    WALLET_MASTER_SEED: 'test-master-seed-12345',
                    WALLET_ENCRYPTION_KEY: 'test-encryption-key-12345',
                };
                return settings[key];
            }),
            getService: vi.fn(() => null), // No services available in tests
        };

        // Mock crypto functions
        (crypto.randomBytes as any) = vi.fn().mockReturnValue(Buffer.from('test-random-bytes'));
        (crypto.createHmac as any) = vi.fn().mockReturnValue({
            update: vi.fn().mockReturnThis(),
            digest: vi.fn().mockReturnValue(Buffer.from('test-derived-seed')),
        });
        (crypto.scryptSync as any) = vi.fn().mockReturnValue(Buffer.from('test-derived-key'));
        (crypto.createCipheriv as any) = vi.fn().mockReturnValue({
            update: vi.fn().mockReturnValue(Buffer.from('encrypted-')),
            final: vi.fn().mockReturnValue(Buffer.from('data')),
        });
        (crypto.createDecipheriv as any) = vi.fn().mockReturnValue({
            update: vi.fn().mockReturnValue(Buffer.from('decrypted-')),
            final: vi.fn().mockReturnValue(Buffer.from('data')),
        });

        // Mock Keypair.fromSeed
        (Keypair.fromSeed as any) = vi.fn().mockReturnValue(mockKeypair);
        (Keypair.fromSecretKey as any) = vi.fn().mockReturnValue(mockKeypair);

        service = new CustodialWalletService(mockRuntime);
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('constructor', () => {
        it('should initialize successfully with default settings', () => {
            expect(service).toBeInstanceOf(CustodialWalletService);
            expect(logger.info).toHaveBeenCalledWith(
                expect.stringContaining('CustodialWalletService initialized on devnet')
            );
        });

        it('should initialize with mainnet settings', () => {
            mockRuntime.getSetting = vi.fn((key: string) => {
                if (key === 'SOLANA_NETWORK') return 'mainnet-beta';
                if (key === 'SOLANA_RPC_URL') return 'https://api.mainnet-beta.solana.com';
                return '';
            });

            const mainnetService = new CustodialWalletService(mockRuntime);
            expect(mainnetService).toBeInstanceOf(CustodialWalletService);
            expect(mainnetService.getNetwork()).toBe('mainnet-beta');
        });

        it('should generate master seed and encryption key if not provided', () => {
            mockRuntime.getSetting = vi.fn(() => '');

            const serviceWithoutKeys = new CustodialWalletService(mockRuntime);
            expect(serviceWithoutKeys).toBeInstanceOf(CustodialWalletService);
            expect(logger.warn).toHaveBeenCalledWith(
                expect.stringContaining('Generated new master seed')
            );
            expect(logger.warn).toHaveBeenCalledWith(
                expect.stringContaining('Generated new encryption key')
            );
        });
    });

    describe('createWallet', () => {
        const testUserId = 'user123';
        const testEntityId = 'room456';

        it('should create a new wallet for entity', async () => {
            const wallet = await service.createWallet(
                testEntityId,
                EntityType.ROOM,
                testUserId,
                { name: 'Test Room Wallet' }
            );

            expect(wallet).toBeDefined();
            expect(wallet.id).toBe(testEntityId);
            expect(wallet.type).toBe(EntityType.ROOM);
            expect(wallet.owner).toBe(testUserId);
            expect(wallet.publicKey).toBe('CustodialWalletPublicKey123');
            expect(wallet.status).toBe('active');
            expect(wallet.metadata.name).toBe('Test Room Wallet');
            expect(Keypair.fromSeed).toHaveBeenCalled();
        });

        it('should create wallets for different entity types', async () => {
            const userWallet = await service.createWallet('user1', EntityType.USER, testUserId);
            const worldWallet = await service.createWallet('world1', EntityType.WORLD, testUserId);
            const poolWallet = await service.createWallet('pool1', EntityType.POOL, testUserId);

            expect(userWallet.type).toBe(EntityType.USER);
            expect(worldWallet.type).toBe(EntityType.WORLD);
            expect(poolWallet.type).toBe(EntityType.POOL);
        });

        it('should throw error if wallet already exists', async () => {
            await service.createWallet(testEntityId, EntityType.ROOM, testUserId);

            await expect(
                service.createWallet(testEntityId, EntityType.ROOM, testUserId)
            ).rejects.toThrow(`Wallet for room:${testEntityId} already exists`);
        });

        it('should set default restrictions', async () => {
            const wallet = await service.createWallet(testEntityId, EntityType.ROOM, testUserId);

            expect(wallet.restrictions).toEqual({
                maxTransactionAmount: 10,
                dailyLimit: 100,
                requireApproval: false,
            });
        });
    });

    describe('getWallet', () => {
        const testUserId = 'user123';
        const testEntityId = 'room456';

        beforeEach(async () => {
            await service.createWallet(testEntityId, EntityType.ROOM, testUserId);
        });

        it('should retrieve existing wallet', async () => {
            const wallet = await service.getWallet(testEntityId);

            expect(wallet).toBeDefined();
            expect(wallet?.id).toBe(testEntityId);
            expect(wallet?.owner).toBe(testUserId);
        });

        it('should return null for non-existent wallet', async () => {
            const wallet = await service.getWallet('non-existent');

            expect(wallet).toBeNull();
        });
    });

    describe('wallet ownership and permissions', () => {
        const ownerId = 'owner123';
        const delegateId = 'delegate456';
        const entityId = 'room789';

        beforeEach(async () => {
            await service.createWallet(entityId, EntityType.ROOM, ownerId);
        });

        it('should transfer ownership successfully', async () => {
            await service.transferOwnership(entityId, ownerId, delegateId);

            const wallet = await service.getWallet(entityId);
            expect(wallet?.owner).toBe(delegateId);
        });

        it('should prevent unauthorized ownership transfer', async () => {
            await expect(
                service.transferOwnership(entityId, 'unauthorized', delegateId)
            ).rejects.toThrow(`User unauthorized is not the owner of wallet ${entityId}`);
        });

        it('should grant permissions to users', async () => {
            await service.grantPermission(
                entityId, 
                delegateId, 
                ['read', 'transfer'], 
                ownerId
            );

            const hasReadPermission = await service.hasPermission(entityId, delegateId, 'read');
            const hasTransferPermission = await service.hasPermission(entityId, delegateId, 'transfer');
            const hasAdminPermission = await service.hasPermission(entityId, delegateId, 'admin');

            expect(hasReadPermission).toBe(true);
            expect(hasTransferPermission).toBe(true);
            expect(hasAdminPermission).toBe(false);
        });

        it('should revoke permissions from users', async () => {
            await service.grantPermission(entityId, delegateId, ['read', 'transfer'], ownerId);
            await service.revokePermission(entityId, delegateId, ownerId);

            const hasPermission = await service.hasPermission(entityId, delegateId, 'read');
            expect(hasPermission).toBe(false);
        });

        it('should allow owner to have all permissions by default', async () => {
            const hasReadPermission = await service.hasPermission(entityId, ownerId, 'read');
            const hasAdminPermission = await service.hasPermission(entityId, ownerId, 'admin');

            expect(hasReadPermission).toBe(true);
            expect(hasAdminPermission).toBe(true);
        });

        it('should prevent unauthorized permission grants', async () => {
            await expect(
                service.grantPermission(entityId, delegateId, ['admin'], 'unauthorized')
            ).rejects.toThrow(`User unauthorized does not have permission to grant access to wallet ${entityId}`);
        });
    });

    describe('wallet management operations', () => {
        const ownerId = 'owner123';
        const entityId = 'room789';

        beforeEach(async () => {
            await service.createWallet(entityId, EntityType.ROOM, ownerId);
        });

        it('should suspend wallet', async () => {
            await service.suspendWallet(entityId, ownerId, 'Security concern');

            const wallet = await service.getWallet(entityId);
            expect(wallet?.status).toBe('suspended');
            expect(wallet?.metadata.description).toContain('SUSPENDED: Security concern');
        });

        it('should reactivate suspended wallet', async () => {
            await service.suspendWallet(entityId, ownerId);
            await service.reactivateWallet(entityId, ownerId);

            const wallet = await service.getWallet(entityId);
            expect(wallet?.status).toBe('active');
        });

        it('should update wallet metadata', async () => {
            await service.updateWalletMetadata(
                entityId,
                { name: 'Updated Wallet Name', tags: ['updated'] },
                ownerId
            );

            const wallet = await service.getWallet(entityId);
            expect(wallet?.metadata.name).toBe('Updated Wallet Name');
            expect(wallet?.metadata.tags).toEqual(['updated']);
            expect(wallet?.metadata.version).toBe(2);
        });

        it('should update wallet restrictions', async () => {
            await service.updateWalletRestrictions(
                entityId,
                { maxTransactionAmount: 50, dailyLimit: 500 },
                ownerId
            );

            const wallet = await service.getWallet(entityId);
            expect(wallet?.restrictions?.maxTransactionAmount).toBe(50);
            expect(wallet?.restrictions?.dailyLimit).toBe(500);
        });

        it('should delete wallet (owner only)', async () => {
            await service.deleteWallet(entityId, ownerId);

            const wallet = await service.getWallet(entityId);
            expect(wallet).toBeNull();
        });

        it('should prevent non-owner from deleting wallet', async () => {
            await expect(
                service.deleteWallet(entityId, 'unauthorized')
            ).rejects.toThrow(`Only the owner can delete wallet ${entityId}`);
        });
    });

    describe('wallet queries and listings', () => {
        const ownerId = 'owner123';
        const otherUserId = 'other456';

        beforeEach(async () => {
            await service.createWallet('room1', EntityType.ROOM, ownerId);
            await service.createWallet('world1', EntityType.WORLD, ownerId);
            await service.createWallet('user1', EntityType.USER, otherUserId);
        });

        it('should get wallets by owner', async () => {
            const ownerWallets = await service.getWalletsByOwner(ownerId);
            const otherWallets = await service.getWalletsByOwner(otherUserId);

            expect(ownerWallets).toHaveLength(2);
            expect(otherWallets).toHaveLength(1);
            expect(ownerWallets.every(w => w.owner === ownerId)).toBe(true);
        });

        it('should get wallets by type', async () => {
            const roomWallets = await service.getWalletsByType(EntityType.ROOM);
            const worldWallets = await service.getWalletsByType(EntityType.WORLD);
            const userWallets = await service.getWalletsByType(EntityType.USER);

            expect(roomWallets).toHaveLength(1);
            expect(worldWallets).toHaveLength(1);
            expect(userWallets).toHaveLength(1);
        });

        it('should list wallets with permissions', async () => {
            // Grant read permission to other user for room1
            await service.grantPermission('room1', otherUserId, ['read'], ownerId);

            const wallets = await service.listWallets(otherUserId);

            // Should see their own wallet + the one they have permission for
            expect(wallets).toHaveLength(2);
            expect(wallets.some(w => w.id === 'user1')).toBe(true);
            expect(wallets.some(w => w.id === 'room1')).toBe(true);
        });
    });

    describe('keypair and public key access', () => {
        const ownerId = 'owner123';
        const entityId = 'room789';

        beforeEach(async () => {
            await service.createWallet(entityId, EntityType.ROOM, ownerId);
        });

        it('should return keypair for authorized user', async () => {
            const keypair = await service.getKeypair(entityId, ownerId);

            expect(keypair).toBeDefined();
            expect(Keypair.fromSecretKey).toHaveBeenCalled();
        });

        it('should prevent unauthorized keypair access', async () => {
            await expect(
                service.getKeypair(entityId, 'unauthorized')
            ).rejects.toThrow(`User unauthorized does not have admin permission for wallet ${entityId}`);
        });

        it('should return public key for any entity', async () => {
            const publicKey = await service.getPublicKey(entityId);

            expect(publicKey).toBeDefined();
            expect(publicKey?.toString()).toBe('CustodialWalletPublicKey123');
        });

        it('should return null for non-existent entity public key', async () => {
            const publicKey = await service.getPublicKey('non-existent');

            expect(publicKey).toBeNull();
        });
    });

    describe('balance operations', () => {
        const ownerId = 'owner123';
        const entityId = 'room789';

        beforeEach(async () => {
            await service.createWallet(entityId, EntityType.ROOM, ownerId);
            
            // Mock the service's connection directly
            const mockBalance = 5 * LAMPORTS_PER_SOL;
            (service as any).connection = {
                getBalance: vi.fn().mockResolvedValue(mockBalance)
            };
        });

        it('should get wallet balance', async () => {
            const balance = await service.getBalance(entityId);

            expect(balance).toBe(5); // 5 SOL
            expect((service as any).connection.getBalance).toHaveBeenCalled();
        });

        it('should handle balance errors', async () => {
            (service as any).connection.getBalance = vi.fn().mockRejectedValue(new Error('RPC Error'));

            await expect(service.getBalance(entityId)).rejects.toThrow('RPC Error');
        });
    });

    describe('data export and permissions', () => {
        const ownerId = 'owner123';
        const entityId = 'room789';

        beforeEach(async () => {
            await service.createWallet(entityId, EntityType.ROOM, ownerId);
        });

        it('should export wallet data for authorized user', async () => {
            const data = await service.exportWalletData(entityId, ownerId);

            expect(data).toEqual({
                publicKey: 'CustodialWalletPublicKey123',
                metadata: expect.objectContaining({
                    name: 'room wallet',
                    version: 1,
                }),
                permissions: expect.arrayContaining([
                    expect.objectContaining({
                        userId: ownerId,
                        permissions: ['read', 'transfer', 'trade', 'admin'],
                    })
                ]),
            });
        });

        it('should prevent unauthorized data export', async () => {
            await expect(
                service.exportWalletData(entityId, 'unauthorized')
            ).rejects.toThrow(`User unauthorized does not have read permission for wallet ${entityId}`);
        });
    });

    describe('service lifecycle', () => {
        it('should start service correctly', async () => {
            const startedService = await CustodialWalletService.start(mockRuntime);
            
            expect(startedService).toBeInstanceOf(CustodialWalletService);
            expect(logger.info).toHaveBeenCalledWith('Starting CustodialWalletService...');
        });

        it('should stop service correctly', async () => {
            await service.stop();
            
            expect(logger.info).toHaveBeenCalledWith('Stopping CustodialWalletService...');
        });
    });

    describe('network support', () => {
        it('should support devnet', () => {
            expect(service.getNetwork()).toBe('devnet');
        });

        it('should support mainnet', () => {
            mockRuntime.getSetting = vi.fn((key: string) => {
                if (key === 'SOLANA_NETWORK') return 'mainnet-beta';
                return '';
            });

            const mainnetService = new CustodialWalletService(mockRuntime);
            expect(mainnetService.getNetwork()).toBe('mainnet-beta');
        });

        it('should support testnet', () => {
            mockRuntime.getSetting = vi.fn((key: string) => {
                if (key === 'SOLANA_NETWORK') return 'testnet';
                return '';
            });

            const testnetService = new CustodialWalletService(mockRuntime);
            expect(testnetService.getNetwork()).toBe('testnet');
        });
    });
});