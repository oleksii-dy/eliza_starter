import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    createCustodialWalletAction,
    transferWalletOwnershipAction,
    addWalletControllerAction,
    listCustodialWalletsAction,
} from '../../../actions/custodial-wallet';
import type { Memory, State, UUID, HandlerCallback } from '@elizaos/core';
import type { IAgentRuntime } from '../../../types/core.d';
import type { CustodialWallet, CreateWalletRequest, ExecuteTransactionRequest } from '../../../types/wallet';

describe('Custodial Wallet Actions', () => {
    let mockRuntime: IAgentRuntime;
    let mockCustodialWalletService: any;
    let mockTrustService: any;
    let mockMessage: Memory;
    let mockState: State;
    let mockCallback: HandlerCallback;

    beforeEach(() => {
        vi.clearAllMocks();

        // Mock services
        mockCustodialWalletService = {
            createWallet: vi.fn(),
            getWallet: vi.fn(),
            getWalletsForEntity: vi.fn(),
            hasPermission: vi.fn(),
            executeTransaction: vi.fn(),
            transferOwnership: vi.fn(),
            addController: vi.fn(),
            removeController: vi.fn(),
        };

        mockTrustService = {
            evaluate: vi.fn().mockResolvedValue({ score: 0.8 }),
            validateFinancialOperation: vi.fn().mockResolvedValue(true),
        };

        // Mock runtime
        mockRuntime = {
            agentId: 'test-agent-id' as UUID,
            getSetting: vi.fn(),
            getService: vi.fn((name: string) => {
                if (name === 'custodial-wallet') return mockCustodialWalletService;
                if (name === 'trust') return mockTrustService;
                return null;
            }),
            messageManager: {
                createMemory: vi.fn(),
            },
            composeState: vi.fn().mockResolvedValue({
                values: {},
                data: {},
                text: '',
            }),
            characterId: 'test-character' as UUID,
        } as unknown as IAgentRuntime;

        // Mock message
        mockMessage = {
            id: 'test-message-id' as UUID,
            entityId: 'test-entity-id' as UUID,
            userId: 'test-user-id' as UUID,
            roomId: 'test-room-id' as UUID,
            content: { text: 'create custodial wallet' },
            createdAt: Date.now(),
        } as Memory;

        // Mock state
        mockState = {
            values: {},
            data: {},
            text: '',
        };

        // Mock callback
        mockCallback = vi.fn();
    });

    describe('createCustodialWalletAction', () => {
        it('should validate when service is available', async () => {
            const isValid = await createCustodialWalletAction.validate(mockRuntime, mockMessage);
            expect(isValid).toBe(true);
        });

        it('should not validate when service is unavailable', async () => {
            mockRuntime.getService = vi.fn().mockReturnValue(null);
            const isValid = await createCustodialWalletAction.validate(mockRuntime, mockMessage);
            expect(isValid).toBe(false);
        });

        it('should create wallet successfully', async () => {
            const mockWallet: CustodialWallet = {
                id: 'wallet-123' as UUID,
                address: '0x1234567890123456789012345678901234567890',
                network: 'base-sepolia',
                name: 'Test Wallet',
                ownerId: 'test-user-id' as UUID,
                permissions: []
                status: 'active',
                createdAt: Date.now(),
                requiredTrustLevel: 50,
                isPool: false,
                metadata: {
                    purpose: 'Testing',
                    trustLevel: 50,
                },
            };

            mockCustodialWalletService.createWallet.mockResolvedValue(mockWallet);

            // Update message to contain parameters the action expects
            const createMessage = {
                ...mockMessage,
                content: { text: 'create custodial wallet called "Test Wallet" for Testing purpose' }
            };

            const result = await createCustodialWalletAction.handler(
                mockRuntime,
                createMessage,
                mockState,
                {},
                mockCallback
            );

            expect(mockCustodialWalletService.createWallet).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: 'Test Wallet',
                    purpose: 'testing',
                    ownerId: 'test-entity-id',
                })
            );
            expect(mockCallback).toHaveBeenCalledWith(
                expect.objectContaining({
                    text: expect.stringContaining('Created custodial wallet successfully'),
                })
            );
        });

        it('should handle wallet creation errors', async () => {
            mockCustodialWalletService.createWallet.mockRejectedValue(
                new Error('Failed to create wallet')
            );

            await createCustodialWalletAction.handler(
                mockRuntime,
                mockMessage,
                mockState,
                { name: 'Test Wallet' },
                mockCallback
            );

            expect(mockCallback).toHaveBeenCalledWith(
                expect.objectContaining({
                    text: expect.stringContaining('Failed to create custodial wallet'),
                })
            );
        });
    });

    describe('listCustodialWalletsAction', () => {
        it('should list wallets for entity', async () => {
            const mockWallets: CustodialWallet[] = [
                {
                    id: 'wallet-1' as UUID,
                    address: '0x1111111111111111111111111111111111111111',
                    name: 'Wallet 1',
                    ownerId: 'test-entity-id' as UUID,
                    network: 'base-sepolia',
                    permissions: []
                    status: 'active',
                    createdAt: Date.now(),
                    requiredTrustLevel: 50,
                    isPool: false,
                    metadata: {
                        purpose: 'general',
                        trustLevel: 50,
                    },
                },
                {
                    id: 'wallet-2' as UUID,
                    address: '0x2222222222222222222222222222222222222222',
                    name: 'Wallet 2',
                    ownerId: 'test-entity-id' as UUID,
                    network: 'base-sepolia',
                    permissions: []
                    status: 'active',
                    createdAt: Date.now(),
                    requiredTrustLevel: 50,
                    isPool: false,
                    metadata: {
                        purpose: 'general',
                        trustLevel: 50,
                    },
                },
            ];

            mockCustodialWalletService.getWalletsForEntity.mockResolvedValue(mockWallets);
            mockCustodialWalletService.getWalletsForRoom = vi.fn().mockResolvedValue([]);

            const listMessage = {
                ...mockMessage,
                content: { text: 'list wallets' }
            };

            await listCustodialWalletsAction.handler(
                mockRuntime,
                listMessage,
                mockState,
                {},
                mockCallback
            );

            expect(mockCustodialWalletService.getWalletsForEntity).toHaveBeenCalledWith('test-entity-id');
            expect(mockCallback).toHaveBeenCalledWith(
                expect.objectContaining({
                    text: expect.stringContaining('Personal Wallets'),
                })
            );
        });

        it('should handle no wallets', async () => {
            mockCustodialWalletService.getWalletsForEntity.mockResolvedValue([]);
            mockCustodialWalletService.getWalletsForRoom = vi.fn().mockResolvedValue([]);

            await listCustodialWalletsAction.handler(
                mockRuntime,
                mockMessage,
                mockState,
                {},
                mockCallback
            );

            expect(mockCallback).toHaveBeenCalledWith(
                expect.objectContaining({
                    text: expect.stringContaining('No custodial wallets found'),
                })
            );
        });
    });

    describe('transferWalletOwnershipAction', () => {
        it('should transfer ownership successfully', async () => {
            mockCustodialWalletService.hasPermission.mockResolvedValue(true);
            mockCustodialWalletService.transferOwnership.mockResolvedValue(undefined);

            const transferMessage = {
                ...mockMessage,
                content: { text: 'transfer ownership of wallet wallet-123 to new-owner-id' }
            };

            await transferWalletOwnershipAction.handler(
                mockRuntime,
                transferMessage,
                mockState,
                {},
                mockCallback
            );

            expect(mockCustodialWalletService.transferOwnership).toHaveBeenCalledWith(
                'wallet-123',
                'new-owner-id',
                'test-entity-id'
            );
            expect(mockCallback).toHaveBeenCalledWith(
                expect.objectContaining({
                    text: expect.stringContaining('Successfully transferred wallet ownership'),
                })
            );
        });

        it('should require admin permission', async () => {
            mockCustodialWalletService.hasPermission.mockResolvedValue(false);

            const transferMessage = {
                ...mockMessage,
                content: { text: 'transfer ownership of wallet wallet-123 to new-owner-id' }
            };

            await transferWalletOwnershipAction.handler(
                mockRuntime,
                transferMessage,
                mockState,
                {},
                mockCallback
            );

            expect(mockCustodialWalletService.transferOwnership).not.toHaveBeenCalled();
            expect(mockCallback).toHaveBeenCalledWith(
                expect.objectContaining({
                    text: expect.stringContaining("don't have permission to transfer ownership"),
                })
            );
        });
    });

    describe('addWalletControllerAction', () => {
        it('should add controller successfully', async () => {
            mockCustodialWalletService.hasPermission.mockResolvedValue(true);
            mockCustodialWalletService.addController.mockResolvedValue(undefined);

            const addMessage = {
                ...mockMessage,
                content: { text: 'add controller controller-123 to wallet wallet-123' }
            };

            await addWalletControllerAction.handler(
                mockRuntime,
                addMessage,
                mockState,
                {},
                mockCallback
            );

            expect(mockCustodialWalletService.addController).toHaveBeenCalledWith(
                'wallet-123',
                'controller-123',
                'test-entity-id'
            );
            expect(mockCallback).toHaveBeenCalledWith(
                expect.objectContaining({
                    text: expect.stringContaining('Successfully added wallet controller'),
                })
            );
        });

        it('should require admin permission', async () => {
            mockCustodialWalletService.hasPermission.mockResolvedValue(false);

            const addMessage = {
                ...mockMessage,
                content: { text: 'add controller controller-123 to wallet wallet-123' }
            };

            await addWalletControllerAction.handler(
                mockRuntime,
                addMessage,
                mockState,
                {},
                mockCallback
            );

            expect(mockCustodialWalletService.addController).not.toHaveBeenCalled();
            expect(mockCallback).toHaveBeenCalledWith(
                expect.objectContaining({
                    text: expect.stringContaining("don't have permission to add controllers"),
                })
            );
        });
    });
}); 