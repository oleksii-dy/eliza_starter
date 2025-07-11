import {
  Service,
  ServiceType,
  type IAgentRuntime,
  type UUID,
  elizaLogger,
  type ServiceTypeName,
} from '@elizaos/core';
import { AgentKit, CdpWalletProvider } from '@coinbase/agentkit';
import { WalletRepository } from '../database/WalletRepository';
import { EncryptionService } from './EncryptionService';
import type {
  CustodialWallet,
  WalletTransaction,
  WalletPermission,
  CreateWalletRequest,
  ExecuteTransactionRequest,
  TransactionResult,
} from '../types/wallet';
import { randomBytes } from 'crypto';
import type { AgentKitService } from './AgentKitService';

/**
 * Production-ready custodial wallet service with real database persistence
 * No more cache-based storage - this uses proper database and encryption
 */
export class CustodialWalletService extends Service {
  static serviceType = ServiceType.WALLET;
  runtime: IAgentRuntime;
  public capabilityDescription = 'Manages custodial wallets with trust-based access control';

  private agentKit: AgentKit | null = null;
  private walletProvider: CdpWalletProvider | null = null;
  private repository: WalletRepository;
  private encryption: EncryptionService;
  private agentKitService: AgentKitService | null = null;
  private apiKeyId = '';
  private apiKeySecret = '';
  private defaultNetwork = 'base-sepolia';

  constructor(runtime: IAgentRuntime) {
    super(runtime);
    this.runtime = runtime;
    this.repository = new WalletRepository(runtime);
    this.encryption = new EncryptionService();
  }

  static async start(runtime: IAgentRuntime): Promise<CustodialWalletService> {
    const service = new CustodialWalletService(runtime);
    await service.initialize();
    return service;
  }

  async initialize(): Promise<void> {
    try {
      // Get CDP credentials
      this.apiKeyId = (this.runtime?.getSetting('CDP_API_KEY_NAME') as string) || '';
      this.apiKeySecret = (this.runtime?.getSetting('CDP_API_KEY_PRIVATE_KEY') as string) || '';
      this.defaultNetwork =
        (this.runtime?.getSetting('CDP_NETWORK_ID') as string) || 'base-sepolia';

      if (!this.apiKeyId || !this.apiKeySecret) {
        throw new Error('CDP API credentials not configured');
      }

      // Initialize encryption with agent-specific passphrase
      const encryptionPassphrase =
        (this.runtime?.getSetting('WALLET_ENCRYPTION_PASSPHRASE') as string) || '';
      if (!encryptionPassphrase) {
        throw new Error('Wallet encryption passphrase not configured');
      }
      this.encryption.setPassphrase(encryptionPassphrase);

      // Initialize database
      await this.repository.initialize();

      // Initialize CDP AgentKit with new SDK
      this.walletProvider = await CdpWalletProvider.configureWithWallet({
        apiKeyId: this.apiKeyId,
        apiKeySecret: this.apiKeySecret,
        networkId: this.defaultNetwork as string,
      });

      this.agentKit = await AgentKit.from({
        walletProvider: this.walletProvider,
      });

      elizaLogger.info('[CustodialWalletService] Initialized with real database and encryption');
    } catch (error) {
      elizaLogger.error('[CustodialWalletService] Failed to initialize:', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    // Secure cleanup
    this.agentKit = null;
    this.walletProvider = null;
    elizaLogger.info('[CustodialWalletService] Service stopped');
  }

  /**
   * Create a new custodial wallet with real CDP integration
   */
  async createWallet(request: CreateWalletRequest): Promise<CustodialWallet> {
    try {
      if (!this.walletProvider) {
        throw new Error('Wallet provider not initialized');
      }

      elizaLogger.info(`[CustodialWalletService] Creating wallet: ${request.name}`);

      // Get wallet data from provider
      const walletData = await this.walletProvider.exportWallet();
      const encryptedWalletData = this.encryption.encrypt(JSON.stringify(walletData));

      // Generate wallet ID
      const walletId = `wallet-${randomBytes(16).toString('hex')}` as UUID;

      // Get address from wallet provider
      const address = await this.walletProvider.getAddress();

      // Create custodial wallet record
      const custodialWallet: CustodialWallet = {
        id: walletId,
        address,
        network: this.runtime.getSetting('CDP_NETWORK_ID') || 'base-sepolia',
        name: request.name,
        description: request.description,
        ownerId: request.ownerId,
        entityId: request.entityId,
        roomId: request.roomId,
        worldId: request.worldId,
        createdAt: Date.now(),
        lastUsedAt: undefined,
        status: 'active',
        permissions: [
          {
            entityId: request.ownerId,
            type: 'admin',
            grantedAt: Date.now(),
            grantedBy: this.runtime.agentId,
            allowedOperations: ['view', 'transfer', 'admin'],
          },
        ],
        requiredTrustLevel: request.trustLevel || 50,
        isPool: request.isPool || false,
        metadata: {
          cdpWalletData: encryptedWalletData,
          purpose: request.purpose,
          trustLevel: request.trustLevel || 50,
        },
      };

      // Save to database
      await this.repository.saveWallet(custodialWallet);

      elizaLogger.info(`[CustodialWalletService] Created wallet ${walletId} at ${address}`);
      return custodialWallet;
    } catch (error) {
      elizaLogger.error('[CustodialWalletService] Failed to create wallet:', error);
      throw error;
    }
  }

  /**
   * Get a wallet by ID
   */
  async getWallet(walletId: UUID): Promise<CustodialWallet | null> {
    try {
      return await this.repository.getWallet(walletId);
    } catch (error) {
      elizaLogger.error(`[CustodialWalletService] Failed to get wallet ${walletId}:`, error);
      return null;
    }
  }

  /**
   * Get all wallets for an entity
   */
  async getWalletsForEntity(entityId: UUID): Promise<CustodialWallet[]> {
    try {
      return await this.repository.getWalletsForEntity(entityId);
    } catch (error) {
      elizaLogger.error(
        `[CustodialWalletService] Failed to get wallets for entity ${entityId}:`,
        error
      );
      return [];
    }
  }

  /**
   * Get all wallets for a room
   */
  async getWalletsForRoom(roomId: UUID): Promise<CustodialWallet[]> {
    try {
      return await this.repository.getWalletsForRoom(roomId);
    } catch (error) {
      elizaLogger.error(
        `[CustodialWalletService] Failed to get wallets for room ${roomId}:`,
        error
      );
      return [];
    }
  }

  /**
   * Get all wallets for a world
   */
  async getWalletsForWorld(worldId: UUID): Promise<CustodialWallet[]> {
    try {
      return await this.repository.getWalletsForWorld(worldId);
    } catch (error) {
      elizaLogger.error(
        `[CustodialWalletService] Failed to get wallets for world ${worldId}:`,
        error
      );
      return [];
    }
  }

  /**
   * Check if entity has permission for wallet operation
   */
  async hasPermission(
    walletId: UUID,
    entityId: UUID,
    operation: 'view' | 'transfer' | 'admin'
  ): Promise<boolean> {
    try {
      const wallet = await this.repository.getWallet(walletId);
      if (!wallet) {
        throw new Error('Wallet not found');
      }

      // Check if the entity has permission for the operation
      const permission = wallet.permissions.find((p) => p.entityId === entityId);
      if (!permission) {
        return false;
      }

      // Check operation-specific permissions
      if (permission.allowedOperations) {
        return permission.allowedOperations.includes(operation);
      }

      return false;
    } catch (error) {
      elizaLogger.error('[CustodialWalletService] Failed to check permission:', error);
      return false;
    }
  }

  /**
   * Execute a transaction from a custodial wallet
   */
  async executeTransaction(request: ExecuteTransactionRequest): Promise<TransactionResult> {
    try {
      if (!this.agentKit) {
        throw new Error('AgentKit not initialized');
      }

      const wallet = await this.repository.getWallet(request.walletId);
      if (!wallet) {
        throw new Error('Wallet not found');
      }

      // Create transaction record
      const transactionId = `tx-${randomBytes(16).toString('hex')}` as UUID;
      const transaction: WalletTransaction = {
        id: transactionId,
        walletId: request.walletId,
        fromAddress: wallet.address,
        toAddress: request.toAddress,
        amountWei: request.amountWei,
        tokenAddress: request.tokenAddress,
        initiatedBy: request.initiatedBy,
        purpose: request.purpose,
        transactionType: request.tokenAddress ? 'erc20_transfer' : 'eth_transfer',
        status: 'pending',
        trustLevelAtExecution: request.trustLevel,
        createdAt: Date.now(),
      };

      await this.repository.saveTransaction(transaction);

      try {
        // Decrypt wallet data to restore AgentKit instance
        const walletDataStr = this.encryption.decrypt(wallet.metadata.cdpWalletData as string);
        const _walletData = JSON.parse(walletDataStr);

        // Create a new wallet provider with the saved wallet data
        const walletProvider = await CdpWalletProvider.configureWithWallet({
          cdpWalletData: walletDataStr,
          apiKeyId: this.apiKeyId,
          apiKeySecret: this.apiKeySecret,
          networkId: wallet.network as string,
        });

        const walletAgentKit = await AgentKit.from({
          walletProvider,
        });

        // Execute the actual transaction based on type
        let txHash: string;

        if (request.tokenAddress) {
          // ERC20 transfer using actions
          const actions = walletAgentKit.getActions();
          const transferAction = actions.find(
            (a) => a.name === 'transfer' || a.name === 'erc20_transfer'
          );

          if (!transferAction) {
            throw new Error('Transfer action not available');
          }

          const result = await transferAction.invoke({
            to: request.toAddress,
            contractAddress: request.tokenAddress,
            amount: request.amountWei.toString(),
          });

          // Extract transaction hash from result
          txHash =
            (typeof result === 'string'
              ? result
              : ((result as Record<string, unknown>).hash as string)) || '';
        } else {
          // Native ETH transfer using wallet provider
          const txRequest = {
            to: request.toAddress as `0x${string}`,
            value: BigInt(request.amountWei),
            data: '0x' as `0x${string}`,
          };

          txHash = await walletProvider.sendTransaction(txRequest);
        }

        if (!txHash) {
          throw new Error('Transaction failed - no hash returned');
        }

        elizaLogger.info(`[CustodialWalletService] Transaction executed: ${txHash}`);

        // Update transaction as submitted
        await this.repository.updateTransactionStatus(transactionId, 'submitted', txHash);

        // Update wallet last used
        await this.repository.updateWalletLastUsed(request.walletId);

        return {
          transactionId,
          txHash,
          status: 'submitted',
        };
      } catch (error) {
        // Update transaction as failed
        await this.repository.updateTransactionStatus(
          transactionId,
          'failed',
          undefined,
          (error as Error).message
        );

        throw error;
      }
    } catch (error) {
      elizaLogger.error('[CustodialWalletService] Failed to execute transaction:', error);
      throw new Error(
        `Transaction failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Add permission to a wallet
   */
  async addPermission(walletId: UUID, permission: WalletPermission): Promise<void> {
    try {
      await this.repository.savePermission(walletId, permission);
      elizaLogger.info(
        `[CustodialWalletService] Added ${permission.type} permission for ${permission.entityId} on wallet ${walletId}`
      );
    } catch (error) {
      elizaLogger.error('[CustodialWalletService] Failed to add permission:', error);
      throw error;
    }
  }

  /**
   * Remove permission from a wallet
   */
  async removePermission(walletId: UUID, entityId: UUID, type: string): Promise<void> {
    try {
      await this.repository.removePermission(walletId, entityId, type);
      elizaLogger.info(
        `[CustodialWalletService] Removed ${type} permission for ${entityId} on wallet ${walletId}`
      );
    } catch (error) {
      elizaLogger.error('[CustodialWalletService] Failed to remove permission:', error);
      throw error;
    }
  }

  /**
   * Get transaction history for a wallet
   */
  async getTransactionHistory(
    walletId: UUID,
    limit = 50,
    offset = 0
  ): Promise<WalletTransaction[]> {
    try {
      return await this.repository.getWalletTransactions(walletId, limit, offset);
    } catch (error) {
      elizaLogger.error(
        `[CustodialWalletService] Failed to get transaction history for wallet ${walletId}:`,
        error
      );
      return [];
    }
  }

  /**
   * Get all custodial wallets (admin function)
   */
  async getAllWallets(): Promise<CustodialWallet[]> {
    try {
      return await this.repository.getAllWallets();
    } catch (error) {
      elizaLogger.error('[CustodialWalletService] Failed to get all wallets:', error);
      return [];
    }
  }

  /**
   * Add a controller to a wallet (for E2E tests)
   */
  async addController(walletId: UUID, controllerId: UUID, requestedBy: UUID): Promise<void> {
    try {
      const wallet = await this.repository.getWallet(walletId);
      if (!wallet) {
        throw new Error(`Wallet ${walletId} not found`);
      }

      // Check if requestedBy has admin permission
      const hasAdminPermission = await this.hasPermission(walletId, requestedBy, 'admin');
      if (!hasAdminPermission) {
        throw new Error('Only owner or admin can add controllers');
      }

      // Add controller permission
      const controllerPermission: WalletPermission = {
        entityId: controllerId,
        type: 'transfer',
        grantedAt: Date.now(),
        grantedBy: requestedBy,
        allowedOperations: ['view', 'transfer'],
      };

      await this.addPermission(walletId, controllerPermission);
      elizaLogger.info(
        `[CustodialWalletService] Added controller ${controllerId} to wallet ${walletId}`
      );
    } catch (error) {
      elizaLogger.error('[CustodialWalletService] Failed to add controller:', error);
      throw error;
    }
  }

  /**
   * Remove a controller from a wallet (for E2E tests)
   */
  async removeController(walletId: UUID, controllerId: UUID, requestedBy: UUID): Promise<void> {
    try {
      const wallet = await this.repository.getWallet(walletId);
      if (!wallet) {
        throw new Error(`Wallet ${walletId} not found`);
      }

      // Check if requestedBy has admin permission
      const hasAdminPermission = await this.hasPermission(walletId, requestedBy, 'admin');
      if (!hasAdminPermission) {
        throw new Error('Only owner or admin can remove controllers');
      }

      // Remove controller permission
      await this.removePermission(walletId, controllerId, 'transfer');
      elizaLogger.info(
        `[CustodialWalletService] Removed controller ${controllerId} from wallet ${walletId}`
      );
    } catch (error) {
      elizaLogger.error('[CustodialWalletService] Failed to remove controller:', error);
      throw error;
    }
  }

  /**
   * Transfer ownership of a wallet (for E2E tests)
   */
  async transferOwnership(walletId: UUID, newOwnerId: UUID, requestedBy: UUID): Promise<void> {
    try {
      const wallet = await this.repository.getWallet(walletId);
      if (!wallet) {
        throw new Error(`Wallet ${walletId} not found`);
      }

      // Check if requestedBy is the current owner or has admin permission
      const isOwner = wallet.ownerId === requestedBy;
      const hasAdminPermission = await this.hasPermission(walletId, requestedBy, 'admin');

      if (!isOwner && !hasAdminPermission) {
        throw new Error('Only owner or admin can transfer ownership');
      }

      // Update wallet with new owner
      const updatedWallet = {
        ...wallet,
        ownerId: newOwnerId,
        metadata: {
          ...wallet.metadata,
          previousOwner: wallet.ownerId,
          lastOwnershipTransfer: Date.now(),
          transferredBy: requestedBy,
        },
      };

      await this.repository.saveWallet(updatedWallet);

      // Add admin permission for new owner
      const ownerPermission: WalletPermission = {
        entityId: newOwnerId,
        type: 'admin',
        grantedAt: Date.now(),
        grantedBy: requestedBy,
        allowedOperations: ['view', 'transfer', 'admin'],
      };

      await this.addPermission(walletId, ownerPermission);

      // Remove old owner's permissions (if not the same as requester with admin)
      if (wallet.ownerId !== requestedBy) {
        await this.removePermission(walletId, wallet.ownerId, 'admin');
      }

      elizaLogger.info(
        `[CustodialWalletService] Transferred ownership of wallet ${walletId} from ${wallet.ownerId} to ${newOwnerId}`
      );
    } catch (error) {
      elizaLogger.error('[CustodialWalletService] Failed to transfer ownership:', error);
      throw error;
    }
  }

  /**
   * Health check
   */
  isReady(): boolean {
    return !!this.agentKit && !!this.repository && !!this.encryption;
  }

  /**
   * Get service metadata
   */
  getMetadata(): object {
    return {
      serviceName: CustodialWalletService.serviceName,
      serviceType: CustodialWalletService.serviceType,
      isReady: this.isReady(),
      defaultNetwork: this.defaultNetwork,
      hasAgentKit: !!this.agentKit,
      hasRepository: !!this.repository,
      hasEncryption: !!this.encryption,
      encryptionMetadata: this.encryption?.getMetadata(),
    };
  }
}
