import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CustodialWalletService } from '../../../services/CustodialWalletService';
import { createMockRuntime } from '../../test-utils';
import type { UUID } from '@elizaos/core';
import type { IAgentRuntime } from '../../../types/core.d';

describe('CustodialWalletService', () => {
    let service: CustodialWalletService;
    let mockRuntime: IAgentRuntime;

    beforeEach(() => {
        vi.clearAllMocks();

        // Create mock runtime
        mockRuntime = createMockRuntime({
            getSetting: vi.fn((key: string) => {
                const settings: Record<string, string> = {
                    CDP_API_KEY_NAME: 'test-api-key',
                    CDP_API_KEY_PRIVATE_KEY: 'test-private-key',
                    CDP_NETWORK_ID: 'base-sepolia',
                    WALLET_ENCRYPTION_PASSPHRASE: 'test-passphrase-very-secure',
                };
                return settings[key];
            }),
        });

        service = new CustodialWalletService(mockRuntime);
    });

    describe('constructor', () => {
        it('should create service instance', () => {
            expect(service).toBeDefined();
            expect(service.capabilityDescription).toBe(
                'Manages custodial wallets with trust-based access control'
            );
        });
    });

    describe('getWallet', () => {
        it('should return null when wallet not found', async () => {
            const result = await service.getWallet('wallet-123' as UUID);
            expect(result).toBeNull();
        });
    });

    describe('getWalletsForEntity', () => {
        it('should return empty array when no wallets found', async () => {
            const result = await service.getWalletsForEntity('entity-123' as UUID);
            expect(result).toEqual([]);
        });
    });

    describe('getWalletsForRoom', () => {
        it('should return empty array when no wallets found', async () => {
            const result = await service.getWalletsForRoom('room-123' as UUID);
            expect(result).toEqual([]);
        });
    });

    describe('getWalletsForWorld', () => {
        it('should return empty array when no wallets found', async () => {
            const result = await service.getWalletsForWorld('world-123' as UUID);
            expect(result).toEqual([]);
        });
    });

    describe('hasPermission', () => {
        it('should return false when wallet not found', async () => {
            const result = await service.hasPermission(
                'wallet-123' as UUID,
                'entity-123' as UUID,
                'view'
            );
            expect(result).toBe(false);
        });
    });

    describe('getAllWallets', () => {
        it('should return empty array when no wallets exist', async () => {
            const result = await service.getAllWallets();
            expect(result).toEqual([]);
        });
    });

    describe('getTransactionHistory', () => {
        it('should return empty array when no transactions exist', async () => {
            const result = await service.getTransactionHistory('wallet-123' as UUID);
            expect(result).toEqual([]);
        });
    });

    describe('isReady', () => {
        it('should return false before initialization', () => {
            expect(service.isReady()).toBe(false);
        });
    });

    describe('getMetadata', () => {
        it('should return service metadata', () => {
            const metadata = service.getMetadata();
            expect(metadata).toMatchObject({
                serviceName: 'custodial-wallet',
                serviceType: 'wallet',
                isReady: false,
                hasAgentKit: false,
                hasRepository: true,
                hasEncryption: true,
            });
        });
    });

    describe('stop', () => {
        it('should clean up resources', async () => {
            await service.stop();
            expect(service.isReady()).toBe(false);
        });
    });
}); 