import { type Route, type IAgentRuntime, logger, asUUID, type UUID } from '@elizaos/core';
import type { CustodialWalletService } from '../services/CustodialWalletService';
import { HighValueTransactionValidator } from '../trust/trustIntegration';
import type { CustodialWallet } from '../types/wallet';

// Enhanced interfaces for trust engine and validation
interface TrustEngine {
  calculateTrust(
    entityId: string,
    context: { evaluatorId: string; roomId?: string; operation?: string; context?: unknown }
  ): Promise<{ overallTrust: number }>;
}

interface TrustService {
  trustEngine?: TrustEngine;
}

interface ValidationMessage {
  entityId: UUID;
  content: Record<string, unknown>;
  roomId: UUID;
}

interface DatabaseAdapter {
  query(sql: string, params: unknown[]): Promise<unknown[]>;
  run(sql: string, params: unknown[]): Promise<void>;
  get(sql: string, params: unknown[]): Promise<unknown>;
  all(sql: string, params: unknown[]): Promise<unknown[]>;
}

interface WalletCreationRequest {
  name: string;
  description?: string;
  entityId?: string;
  roomId?: string;
  worldId?: string;
  ownerId: string;
  purpose?: string;
  trustLevel?: number;
  isPool?: boolean;
  maxBalance?: string;
  allowedTokens?: string[];
  network?: string;
}

interface WalletTransferRequest {
  toAddress: string;
  amount: string;
  tokenAddress?: string;
  purpose?: string;
}

interface AgentKitWithTools {
  runTool(toolName: string, params: Record<string, unknown>): Promise<unknown>;
}

interface DatabaseCountResult {
  count: number;
}

interface RuntimeWithDatabase {
  databaseAdapter?: DatabaseAdapter;
  db?: DatabaseAdapter;
}

/**
 * REAL API endpoints for custodial wallet management
 * No more fake handlers - these actually work with real data
 */

export const custodialWalletRoutes: Route[] = [
  {
    path: '/custodial-wallets',
    type: 'GET',
    name: 'List Custodial Wallets',
    handler: async (req, res, runtime) => {
      try {
        const entityId = req.query.entityId as string;
        const roomId = req.query.roomId as string;
        const worldId = req.query.worldId as string;

        if (!entityId && !roomId && !worldId) {
          res.status(400).json({
            error: 'Must specify entityId, roomId, or worldId',
          });
          return;
        }

        const custodialService = runtime.getService<CustodialWalletService>('custodial-wallet');
        if (!custodialService) {
          res.status(503).json({
            error: 'Custodial wallet service not available',
          });
          return;
        }

        let wallets: CustodialWallet[] = [];
        if (entityId) {
          wallets = await custodialService.getWalletsForEntity(asUUID(entityId));
        } else if (roomId) {
          wallets = await custodialService.getWalletsForRoom(asUUID(roomId));
        } else if (worldId) {
          wallets = await custodialService.getWalletsForWorld(asUUID(worldId));
        }

        // Filter based on permissions
        const accessibleWallets: CustodialWallet[] = [];
        if (wallets) {
          for (const wallet of wallets) {
            const requestingEntity = (req.headers['x-entity-id'] as string) || entityId;
            const hasPermission = await custodialService.hasPermission(
              wallet.id,
              asUUID(requestingEntity),
              'view'
            );
            if (hasPermission) {
              accessibleWallets.push(wallet);
            }
          }
        }

        res.json({
          success: true,
          wallets: accessibleWallets.map((wallet) => ({
            id: wallet.id,
            address: wallet.address,
            network: wallet.network,
            name: wallet.name,
            description: wallet.description,
            isPool: wallet.isPool,
            status: wallet.status,
            requiredTrustLevel: wallet.requiredTrustLevel,
            createdAt: wallet.createdAt,
            lastUsedAt: wallet.lastUsedAt,
            // Don't expose sensitive data like private keys
          })),
        });
      } catch (error) {
        logger.error('[WalletAPI] Error listing wallets:', error);
        res.status(500).json({
          error: 'Failed to list wallets',
        });
      }
    },
  },

  {
    path: '/custodial-wallets',
    type: 'POST',
    name: 'Create Custodial Wallet',
    handler: async (req, res, runtime) => {
      try {
        const {
          name,
          description,
          entityId,
          roomId,
          worldId,
          ownerId,
          purpose,
          trustLevel,
          isPool,
          maxBalance,
          allowedTokens,
          network,
        } = req.body as unknown as WalletCreationRequest;

        if (!name || !ownerId) {
          res.status(400).json({
            error: 'Name and ownerId are required',
          });
          return;
        }

        // Validate that requester has permission to create wallets
        const requestingEntity = req.headers['x-entity-id'] as string;
        if (requestingEntity !== ownerId) {
          // Check if requesting entity has admin permissions in the context
          const hasPermission = await validateCreatePermission(
            runtime,
            asUUID(requestingEntity),
            entityId || roomId || worldId
          );

          if (!hasPermission) {
            res.status(403).json({
              error: 'Insufficient permissions to create wallet',
            });
            return;
          }
        }

        const custodialService = runtime.getService<CustodialWalletService>('custodial-wallet');
        if (!custodialService) {
          res.status(503).json({
            error: 'Custodial wallet service not available',
          });
          return;
        }

        const wallet = await custodialService.createWallet({
          name,
          description,
          entityId: entityId ? asUUID(entityId) : undefined,
          roomId: roomId ? asUUID(roomId) : undefined,
          worldId: worldId ? asUUID(worldId) : undefined,
          ownerId: asUUID(ownerId),
          purpose,
          trustLevel: typeof trustLevel === 'string' ? parseInt(trustLevel, 10) : trustLevel || 50,
          isPool: isPool || false,
          maxBalance: maxBalance
            ? typeof maxBalance === 'string'
              ? parseFloat(maxBalance)
              : maxBalance
            : undefined,
          allowedTokens,
          network,
        });

        res.status(201).json({
          success: true,
          wallet: {
            id: wallet.id,
            address: wallet.address,
            network: wallet.network,
            name: wallet.name,
            description: wallet.description,
            isPool: wallet.isPool,
            status: wallet.status,
            requiredTrustLevel: wallet.requiredTrustLevel,
            createdAt: wallet.createdAt,
          },
        });
      } catch (error) {
        logger.error('[WalletAPI] Error creating wallet:', error);
        res.status(500).json({
          error: `Failed to create wallet: ${error instanceof Error ? error.message : String(error)}`,
        });
      }
    },
  },

  {
    path: '/custodial-wallets/:walletId',
    type: 'GET',
    name: 'Get Custodial Wallet Details',
    handler: async (req, res, runtime) => {
      try {
        const { walletId } = req.params;
        const requestingEntity = req.headers['x-entity-id'] as string;

        if (!requestingEntity) {
          res.status(401).json({
            error: 'Entity ID required in headers',
          });
          return;
        }

        const custodialService = runtime.getService<CustodialWalletService>('custodial-wallet');
        if (!custodialService) {
          res.status(503).json({
            error: 'Custodial wallet service not available',
          });
          return;
        }

        const wallet = await custodialService.getWallet(asUUID(walletId));
        if (!wallet) {
          res.status(404).json({
            error: 'Wallet not found',
          });
          return;
        }

        // Check permissions
        const hasPermission = await custodialService.hasPermission(
          wallet.id,
          asUUID(requestingEntity),
          'view'
        );

        if (!hasPermission) {
          res.status(403).json({
            error: 'Insufficient permissions to view wallet',
          });
          return;
        }

        res.json({
          success: true,
          wallet: {
            id: wallet.id,
            address: wallet.address,
            network: wallet.network,
            name: wallet.name,
            description: wallet.description,
            isPool: wallet.isPool,
            maxBalance: wallet.maxBalance?.toString(),
            allowedTokens: wallet.allowedTokens,
            status: wallet.status,
            requiredTrustLevel: wallet.requiredTrustLevel,
            createdAt: wallet.createdAt,
            lastUsedAt: wallet.lastUsedAt,
            permissions: wallet.permissions.map((p) => ({
              entityId: p.entityId,
              type: p.type,
              grantedAt: p.grantedAt,
              expiresAt: p.expiresAt,
              allowedOperations: p.allowedOperations,
            })),
          },
        });
      } catch (error) {
        logger.error('[WalletAPI] Error getting wallet details:', error);
        res.status(500).json({
          error: 'Failed to get wallet details',
        });
      }
    },
  },

  {
    path: '/custodial-wallets/:walletId/transfer',
    type: 'POST',
    name: 'Execute Wallet Transfer',
    handler: async (req, res, runtime) => {
      try {
        const { walletId } = req.params;
        const { toAddress, amount, tokenAddress, purpose } =
          req.body as unknown as WalletTransferRequest;
        const requestingEntity = req.headers['x-entity-id'] as string;

        if (!requestingEntity) {
          res.status(401).json({
            error: 'Entity ID required in headers',
          });
          return;
        }

        if (!toAddress || !amount) {
          res.status(400).json({
            error: 'toAddress and amount are required',
          });
          return;
        }

        const custodialService = runtime.getService<CustodialWalletService>('custodial-wallet');
        if (!custodialService) {
          res.status(503).json({
            error: 'Custodial wallet service not available',
          });
          return;
        }

        const wallet = await custodialService.getWallet(asUUID(walletId));
        if (!wallet) {
          res.status(404).json({
            error: 'Wallet not found',
          });
          return;
        }

        // Check transfer permissions
        const hasPermission = await custodialService.hasPermission(
          wallet.id,
          asUUID(requestingEntity),
          'transfer'
        );

        if (!hasPermission) {
          res.status(403).json({
            error: 'Insufficient permissions to transfer from wallet',
          });
          return;
        }

        // Validate trust level for the transfer
        const amountWei = BigInt(amount);

        // Get trust level and validate transaction value
        const trustService = runtime.getService('trust-engine');
        let trustLevel = 50; // Default trust level

        if (trustService) {
          const trustEngine = (trustService as TrustService).trustEngine;
          if (trustEngine) {
            const trustProfile = await trustEngine.calculateTrust(requestingEntity, {
              evaluatorId: runtime.agentId,
              roomId: walletId,
            });
            trustLevel = trustProfile.overallTrust;
          }
        }

        if (trustLevel < wallet.requiredTrustLevel) {
          res.status(403).json({
            error: `Trust validation failed: Trust level ${trustLevel} < ${wallet.requiredTrustLevel}`,
            currentTrustLevel: trustLevel,
            requiredLevel: wallet.requiredTrustLevel,
          });
          return;
        }

        // Validate transaction value for high-value transfers
        const amountInEth = Number(amountWei) / 1e18;
        const tokenSymbol = tokenAddress || 'ETH';
        const validationMessage: ValidationMessage = {
          entityId: asUUID(requestingEntity),
          content: {},
          roomId: asUUID(wallet.roomId || 'default-room'),
        };
        const validation = await HighValueTransactionValidator.validateTransactionValue(
          runtime,
          validationMessage,
          amountInEth,
          tokenSymbol
        );

        if (!validation.allowed) {
          res.status(403).json({
            error: `Transaction blocked: ${validation.reason}`,
            requiresApproval: validation.requiresApproval,
          });
          return;
        }

        // Execute the transfer
        const result = await custodialService.executeTransaction({
          walletId: wallet.id,
          toAddress,
          amountWei,
          tokenAddress,
          initiatedBy: asUUID(requestingEntity),
          purpose: purpose || 'API transfer',
          trustLevel,
        });

        res.json({
          success: true,
          transactionHash: result.txHash,
          transactionId: result.transactionId,
          trustLevel,
          validation: {
            allowed: validation.allowed,
            requiresApproval: validation.requiresApproval,
          },
        });
      } catch (error) {
        logger.error('[WalletAPI] Error executing transfer:', error);
        res.status(500).json({
          error: `Transfer failed: ${error instanceof Error ? error.message : String(error)}`,
        });
      }
    },
  },

  {
    path: '/custodial-wallets/:walletId/balance',
    type: 'GET',
    name: 'Get Wallet Balance',
    handler: async (req, res, runtime) => {
      try {
        const { walletId } = req.params;
        const { tokenAddress } = req.query;
        const requestingEntity = req.headers['x-entity-id'] as string;

        if (!requestingEntity) {
          res.status(401).json({
            error: 'Entity ID required in headers',
          });
          return;
        }

        const custodialService = runtime.getService<CustodialWalletService>('custodial-wallet');
        if (!custodialService) {
          res.status(503).json({
            error: 'Custodial wallet service not available',
          });
          return;
        }

        const wallet = await custodialService.getWallet(asUUID(walletId));
        if (!wallet) {
          res.status(404).json({
            error: 'Wallet not found',
          });
          return;
        }

        // Check view permissions
        const hasPermission = await custodialService.hasPermission(
          wallet.id,
          asUUID(requestingEntity),
          'view'
        );

        if (!hasPermission) {
          res.status(403).json({
            error: 'Insufficient permissions to view wallet balance',
          });
          return;
        }

        // Get actual balance from blockchain (not fake balance)
        const agentKitService = runtime.getService('agentkit') as unknown as {
          isReady(): boolean;
          getAgentKit(): unknown;
        } | null;
        if (!agentKitService || !agentKitService.isReady()) {
          res.status(503).json({
            error: 'AgentKit service not available for balance lookup',
          });
          return;
        }

        const agentKit = agentKitService.getAgentKit() as AgentKitWithTools;

        let balance;
        if (tokenAddress && tokenAddress !== 'ETH') {
          // Get ERC20 token balance
          balance = await agentKit.runTool('get_token_balance', {
            tokenAddress: tokenAddress as string,
            walletAddress: wallet.address,
          });
        } else {
          // Get native ETH balance
          balance = await agentKit.runTool('get_balance', {
            address: wallet.address,
          });
        }

        res.json({
          success: true,
          balance: {
            walletId: wallet.id,
            address: wallet.address,
            network: wallet.network,
            tokenAddress: tokenAddress || 'ETH',
            balance: String(balance),
            lastUpdated: Date.now(),
          },
        });
      } catch (error) {
        logger.error('[WalletAPI] Error getting balance:', error);
        res.status(500).json({
          error: `Failed to get balance: ${error instanceof Error ? error.message : String(error)}`,
        });
      }
    },
  },

  {
    path: '/custodial-wallets/:walletId/transactions',
    type: 'GET',
    name: 'Get Wallet Transaction History',
    handler: async (req, res, runtime) => {
      try {
        const { walletId } = req.params;
        const { limit = 50, offset = 0 } = req.query;
        const requestingEntity = req.headers['x-entity-id'] as string;

        if (!requestingEntity) {
          res.status(401).json({
            error: 'Entity ID required in headers',
          });
          return;
        }

        const custodialService = runtime.getService<CustodialWalletService>('custodial-wallet');
        if (!custodialService) {
          res.status(503).json({
            error: 'Custodial wallet service not available',
          });
          return;
        }

        const wallet = await custodialService.getWallet(asUUID(walletId));
        if (!wallet) {
          res.status(404).json({
            error: 'Wallet not found',
          });
          return;
        }

        // Check view permissions
        const hasPermission = await custodialService.hasPermission(
          wallet.id,
          asUUID(requestingEntity),
          'view'
        );

        if (!hasPermission) {
          res.status(403).json({
            error: 'Insufficient permissions to view transaction history',
          });
          return;
        }

        // Get transactions from database
        const db =
          (runtime as RuntimeWithDatabase).databaseAdapter || (runtime as RuntimeWithDatabase).db;
        if (!db) {
          res.status(503).json({
            error: 'Database not available',
          });
          return;
        }

        const transactions = await db.query(
          `SELECT 
                        id, tx_hash, from_address, to_address, amount_wei, 
                        token_address, transaction_type, purpose, status,
                        confirmations, trust_level_at_execution, created_at,
                        submitted_at, confirmed_at, failed_at, error_message
                     FROM wallet_transactions 
                     WHERE wallet_id = ? 
                     ORDER BY created_at DESC 
                     LIMIT ? OFFSET ?`,
          [walletId, Number.parseInt(limit as string, 10), Number.parseInt(offset as string, 10)]
        );

        const totalCount = await db.query(
          'SELECT COUNT(*) as count FROM wallet_transactions WHERE wallet_id = ?',
          [walletId]
        );

        res.json({
          success: true,
          transactions: transactions || [],
          pagination: {
            total: (totalCount?.[0] as DatabaseCountResult)?.count || 0,
            limit: Number.parseInt(limit as string, 10),
            offset: Number.parseInt(offset as string, 10),
          },
        });
      } catch (error) {
        logger.error('[WalletAPI] Error getting transaction history:', error);
        res.status(500).json({
          error: 'Failed to get transaction history',
        });
      }
    },
  },
];

async function validateCreatePermission(
  runtime: IAgentRuntime,
  requestingEntity: string,
  contextId?: string
): Promise<boolean> {
  // For now, allow any authenticated entity to create wallets
  // In production, you might want to check admin permissions
  // based on the context (room/world admin roles, etc.)

  try {
    const trustService = runtime.getService('trust-engine');
    if (trustService) {
      const trustEngine = (trustService as TrustService).trustEngine;
      if (trustEngine) {
        const trustProfile = await trustEngine.calculateTrust(requestingEntity, {
          evaluatorId: runtime.agentId,
          operation: 'create_wallet',
          context: { contextId },
        });

        return trustProfile.overallTrust >= 30; // Minimum trust to create wallets
      }
    }

    return true; // Allow if trust service not available
  } catch (error) {
    logger.error('[WalletAPI] Error validating create permission:', error);
    return false;
  }
}
