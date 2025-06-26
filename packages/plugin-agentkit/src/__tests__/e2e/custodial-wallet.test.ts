import type { TestSuite, IAgentRuntime } from '../../types/core';
import type { CustodialWalletService } from '../../services/CustodialWalletService';
import {
  createCustodialWalletAction,
  listCustodialWalletsAction,
} from '../../actions/custodial-wallet';

/**
 * Comprehensive test suite for custodial wallet functionality
 */
export class CustodialWalletTestSuite implements TestSuite {
  name = 'custodial-wallet-tests';
  description =
    'Comprehensive tests for custodial wallet service and actions with trust integration';

  tests = [
    {
      name: 'Custodial Wallet Service Initialization',
      fn: async (runtime: IAgentRuntime) => {
        console.log('Testing custodial wallet service initialization...');

        const custodialService = runtime.getService<CustodialWalletService>('custodial-wallet');

        if (!custodialService) {
          throw new Error('Custodial wallet service not found');
        }

        // Verify service is properly initialized
        if (typeof custodialService.createWallet !== 'function') {
          throw new Error('Service not properly initialized - missing createWallet method');
        }

        console.log('✅ Custodial wallet service initialized successfully');
      },
    },

    {
      name: 'Create Entity Custodial Wallet',
      fn: async (runtime: IAgentRuntime) => {
        console.log('Testing entity custodial wallet creation...');

        const custodialService = runtime.getService<CustodialWalletService>('custodial-wallet');
        if (!custodialService) {
          throw new Error('Custodial wallet service not available');
        }

        // Test wallet creation
        const wallet = await custodialService.createWallet({
          name: 'Test Entity Wallet',
          description: 'Test wallet for entity',
          entityId: 'test-entity-123' as any,
          ownerId: 'test-entity-123' as any,
          purpose: 'testing',
          trustLevel: 50,
          isPool: false,
        });

        if (!wallet.id) {
          throw new Error('Wallet creation failed - no ID generated');
        }

        if (!wallet.address) {
          throw new Error('Wallet creation failed - no address generated');
        }

        if (wallet.entityId !== ('test-entity-123' as any)) {
          throw new Error('Wallet association failed - incorrect entity ID');
        }

        if (wallet.ownerId !== ('test-entity-123' as any)) {
          throw new Error('Wallet ownership not set correctly');
        }

        console.log(`✅ Created entity wallet: ${wallet.id} at ${wallet.address}`);
      },
    },

    {
      name: 'Create Room Pool Wallet',
      fn: async (runtime: IAgentRuntime) => {
        console.log('Testing room pool wallet creation...');

        const custodialService = runtime.getService<CustodialWalletService>('custodial-wallet');
        if (!custodialService) {
          throw new Error('Custodial wallet service not available');
        }

        const poolWallet = await custodialService.createWallet({
          name: 'Test Pool Wallet',
          description: 'Shared pool for testing',
          roomId: 'test-room-456' as any,
          ownerId: 'test-admin-789' as any,
          purpose: 'pool',
          trustLevel: 70,
          isPool: true,
          maxBalance: 10000,
        });

        if (!poolWallet.isPool) {
          throw new Error('Pool wallet not marked as pool');
        }

        if (poolWallet.roomId !== ('test-room-456' as any)) {
          throw new Error('Pool wallet not associated with room');
        }

        if (poolWallet.maxBalance !== BigInt(10000)) {
          throw new Error('Pool wallet max balance not set correctly');
        }

        console.log(`✅ Created pool wallet: ${poolWallet.id} for room test-room-456`);
      },
    },

    {
      name: 'Wallet Permission System',
      fn: async (runtime: IAgentRuntime) => {
        console.log('Testing wallet permission system...');

        const custodialService = runtime.getService<CustodialWalletService>('custodial-wallet');
        if (!custodialService) {
          throw new Error('Custodial wallet service not available');
        }

        // Create a test wallet
        const wallet = await custodialService.createWallet({
          name: 'Permission Test Wallet',
          ownerId: 'owner-123' as any,
          purpose: 'testing',
          trustLevel: 60,
        });

        // Test owner permissions
        const ownerCanView = await custodialService.hasPermission(
          wallet.id,
          'owner-123' as any,
          'view'
        );
        const ownerCanTransfer = await custodialService.hasPermission(
          wallet.id,
          'owner-123' as any,
          'transfer'
        );
        const ownerCanAdmin = await custodialService.hasPermission(
          wallet.id,
          'owner-123' as any,
          'admin'
        );

        if (!ownerCanView || !ownerCanTransfer || !ownerCanAdmin) {
          throw new Error('Owner permissions not working correctly');
        }

        // Test non-owner permissions
        const strangerCanView = await custodialService.hasPermission(
          wallet.id,
          'stranger-456' as any,
          'view'
        );
        const strangerCanTransfer = await custodialService.hasPermission(
          wallet.id,
          'stranger-456' as any,
          'transfer'
        );
        const strangerCanAdmin = await custodialService.hasPermission(
          wallet.id,
          'stranger-456' as any,
          'admin'
        );

        if (strangerCanView || strangerCanTransfer || strangerCanAdmin) {
          throw new Error('Stranger should not have permissions');
        }

        console.log('✅ Wallet permission system working correctly');
      },
    },

    {
      name: 'Add and Remove Controllers',
      fn: async (runtime: IAgentRuntime) => {
        console.log('Testing controller management...');

        const custodialService = runtime.getService<CustodialWalletService>('custodial-wallet');
        if (!custodialService) {
          throw new Error('Custodial wallet service not available');
        }

        // Create a test wallet
        const wallet = await custodialService.createWallet({
          name: 'Controller Test Wallet',
          ownerId: 'owner-789' as any,
          purpose: 'testing',
        });

        // Add a controller
        await custodialService.addController(
          wallet.id,
          'controller-456' as any,
          'owner-789' as any
        );

        // Verify controller was added
        const controllerCanTransfer = await custodialService.hasPermission(
          wallet.id,
          'controller-456' as any,
          'transfer'
        );

        if (!controllerCanTransfer) {
          throw new Error('Controller permissions not granted');
        }

        // Remove the controller
        await custodialService.removeController(
          wallet.id,
          'controller-456' as any,
          'owner-789' as any
        );

        // Verify controller was removed
        const controllerStillHasAccess = await custodialService.hasPermission(
          wallet.id,
          'controller-456' as any,
          'transfer'
        );

        if (controllerStillHasAccess) {
          throw new Error('Controller permissions not revoked');
        }

        console.log('✅ Controller management working correctly');
      },
    },

    {
      name: 'Transfer Wallet Ownership',
      fn: async (runtime: IAgentRuntime) => {
        console.log('Testing wallet ownership transfer...');

        const custodialService = runtime.getService<CustodialWalletService>('custodial-wallet');
        if (!custodialService) {
          throw new Error('Custodial wallet service not available');
        }

        // Create a test wallet
        const wallet = await custodialService.createWallet({
          name: 'Ownership Test Wallet',
          ownerId: 'original-owner' as any,
          purpose: 'testing',
        });

        const _originalOwnerId = wallet.ownerId;

        // Transfer ownership
        await custodialService.transferOwnership(
          wallet.id,
          'new-owner' as any,
          'original-owner' as any
        );

        // Get updated wallet
        const updatedWallet = await custodialService.getWallet(wallet.id);
        if (!updatedWallet) {
          throw new Error('Wallet not found after ownership transfer');
        }

        if (updatedWallet.ownerId !== ('new-owner' as any)) {
          throw new Error('Ownership transfer failed');
        }

        if (!updatedWallet.metadata.lastOwnershipTransfer) {
          throw new Error('Transfer timestamp not recorded');
        }

        // Verify new owner has permissions
        const newOwnerCanAdmin = await custodialService.hasPermission(
          wallet.id,
          'new-owner' as any,
          'admin'
        );

        if (!newOwnerCanAdmin) {
          throw new Error('New owner does not have admin permissions');
        }

        console.log('✅ Ownership transfer working correctly');
      },
    },

    {
      name: 'Create Custodial Wallet Action',
      fn: async (runtime: IAgentRuntime) => {
        console.log('Testing create custodial wallet action...');

        // Test message for creating a wallet
        const message = {
          id: 'test-msg-123' as any,
          entityId: 'test-user-456' as any,
          roomId: 'test-room-789' as any,
          agentId: runtime.agentId,
          content: {
            text: 'Create a custodial wallet for my DeFi activities',
            source: 'test',
          },
          createdAt: Date.now(),
        };

        // Test validation
        const isValid = await createCustodialWalletAction.validate(runtime, message);
        if (!isValid) {
          throw new Error('Create custodial wallet action validation failed');
        }

        // Test handler (mock callback)
        let callbackCalled = false;
        let callbackContent: any = null;

        const mockCallback = async (content: any) => {
          callbackCalled = true;
          callbackContent = content;
          return [];
        };

        const result = await createCustodialWalletAction.handler(
          runtime,
          message,
          { values: {}, data: {}, text: '' },
          {},
          mockCallback
        );

        if (!result) {
          throw new Error('Create custodial wallet action failed');
        }

        if (!callbackCalled) {
          throw new Error('Action callback not called');
        }

        if (
          !callbackContent ||
          !callbackContent.text.includes('Created custodial wallet successfully')
        ) {
          throw new Error('Action response invalid');
        }

        console.log('✅ Create custodial wallet action working correctly');
      },
    },

    {
      name: 'List Custodial Wallets Action',
      fn: async (runtime: IAgentRuntime) => {
        console.log('Testing list custodial wallets action...');

        // Test message for listing wallets
        const message = {
          id: 'test-msg-456' as any,
          entityId: 'test-user-789' as any,
          roomId: 'test-room-123' as any,
          agentId: runtime.agentId,
          content: {
            text: 'Show me my custodial wallets',
            source: 'test',
          },
          createdAt: Date.now(),
        };

        // Test validation
        const isValid = await listCustodialWalletsAction.validate(runtime, message);
        if (!isValid) {
          throw new Error('List custodial wallets action validation failed');
        }

        // Test handler
        let callbackCalled = false;
        const mockCallback = async (_content: any) => {
          callbackCalled = true;
          return [];
        };

        const result = await listCustodialWalletsAction.handler(
          runtime,
          message,
          { values: {}, data: {}, text: '' },
          {},
          mockCallback
        );

        if (!result || (typeof result === 'object' && 'success' in result && !result.success)) {
          throw new Error('List custodial wallets action failed');
        }

        if (!callbackCalled) {
          throw new Error('Action callback not called');
        }

        console.log('✅ List custodial wallets action working correctly');
      },
    },

    {
      name: 'Trust Integration Test',
      fn: async (runtime: IAgentRuntime) => {
        console.log('Testing trust integration with custodial wallets...');

        const custodialService = runtime.getService<CustodialWalletService>('custodial-wallet');
        if (!custodialService) {
          throw new Error('Custodial wallet service not available');
        }

        // Create a high-trust requirement wallet
        const highTrustWallet = await custodialService.createWallet({
          name: 'High Trust Wallet',
          ownerId: 'test-user-999' as any,
          purpose: 'trading',
          trustLevel: 90, // Very high trust requirement
        });

        if (highTrustWallet.metadata.trustLevel !== 90) {
          throw new Error('High trust level not set correctly');
        }

        // Create a low-trust requirement wallet
        const lowTrustWallet = await custodialService.createWallet({
          name: 'Low Trust Wallet',
          ownerId: 'test-user-999' as any,
          purpose: 'savings',
          trustLevel: 20, // Low trust requirement
        });

        if (lowTrustWallet.metadata.trustLevel !== 20) {
          throw new Error('Low trust level not set correctly');
        }

        // Verify trust levels are stored and retrievable
        const retrievedHighTrust = await custodialService.getWallet(highTrustWallet.id);
        const retrievedLowTrust = await custodialService.getWallet(lowTrustWallet.id);

        if (!retrievedHighTrust || retrievedHighTrust.metadata.trustLevel !== 90) {
          throw new Error('High trust wallet not retrieved correctly');
        }

        if (!retrievedLowTrust || retrievedLowTrust.metadata.trustLevel !== 20) {
          throw new Error('Low trust wallet not retrieved correctly');
        }

        console.log('✅ Trust integration working correctly');
      },
    },

    {
      name: 'Wallet Filtering and Queries',
      fn: async (runtime: IAgentRuntime) => {
        console.log('Testing wallet filtering and query functions...');

        const custodialService = runtime.getService<CustodialWalletService>('custodial-wallet');
        if (!custodialService) {
          throw new Error('Custodial wallet service not available');
        }

        // Create entity wallet
        const entityWallet = await custodialService.createWallet({
          name: 'Entity Query Test',
          entityId: 'query-entity-123' as any,
          ownerId: 'query-entity-123' as any,
          purpose: 'testing',
        });

        // Create room wallet
        const roomWallet = await custodialService.createWallet({
          name: 'Room Query Test',
          roomId: 'query-room-456' as any,
          ownerId: 'query-admin-789' as any,
          purpose: 'testing',
          isPool: true,
        });

        // Create world wallet
        const worldWallet = await custodialService.createWallet({
          name: 'World Query Test',
          worldId: 'query-world-789' as any,
          ownerId: 'query-admin-789' as any,
          purpose: 'testing',
        });

        // Test entity wallet query
        const entityWallets = await custodialService.getWalletsForEntity('query-entity-123' as any);
        if (entityWallets.length !== 1 || entityWallets[0].id !== entityWallet.id) {
          throw new Error('Entity wallet query failed');
        }

        // Test room wallet query
        const roomWallets = await custodialService.getWalletsForRoom('query-room-456' as any);
        if (roomWallets.length !== 1 || roomWallets[0].id !== roomWallet.id) {
          throw new Error('Room wallet query failed');
        }

        // Test world wallet query
        const worldWallets = await custodialService.getWalletsForWorld('query-world-789' as any);
        if (worldWallets.length !== 1 || worldWallets[0].id !== worldWallet.id) {
          throw new Error('World wallet query failed');
        }

        console.log('✅ Wallet filtering and queries working correctly');
      },
    },

    {
      name: 'Error Handling and Edge Cases',
      fn: async (runtime: IAgentRuntime) => {
        console.log('Testing error handling and edge cases...');

        const custodialService = runtime.getService<CustodialWalletService>('custodial-wallet');
        if (!custodialService) {
          throw new Error('Custodial wallet service not available');
        }

        // Test invalid wallet association (multiple associations)
        try {
          await custodialService.createWallet({
            name: 'Invalid Wallet',
            entityId: 'test-entity' as any,
            roomId: 'test-room' as any, // Should not allow both
            ownerId: 'test-owner' as any,
          });
          throw new Error('Should have thrown error for multiple associations');
        } catch (error) {
          // Expected error for duplicate association
          if (!(error instanceof Error) || !error.message.includes('only be associated with one')) {
            throw error;
          }
        }

        // Test permission denial for non-owner
        const wallet = await custodialService.createWallet({
          name: 'Permission Test',
          ownerId: 'real-owner' as any,
          purpose: 'testing',
        });

        try {
          await custodialService.transferOwnership(
            wallet.id,
            'new-owner' as any,
            'fake-owner' as any // Not the real owner
          );
          throw new Error('Should have thrown error for unauthorized transfer');
        } catch (error) {
          // Expected error for non-owner
          if (!(error instanceof Error) || !error.message.includes('Only owner or admin')) {
            throw error;
          }
        }

        // Test getting non-existent wallet
        const nonExistent = await custodialService.getWallet('non-existent' as any);
        if (nonExistent !== null) {
          throw new Error('Should return null for non-existent wallet');
        }

        console.log('✅ Error handling and edge cases working correctly');
      },
    },
  ];
}

export default new CustodialWalletTestSuite();
