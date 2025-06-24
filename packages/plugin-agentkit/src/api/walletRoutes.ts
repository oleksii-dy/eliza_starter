import { type Route, type IAgentRuntime, logger } from "../types/core.d";
import type { CustodialWalletService } from "../services/CustodialWalletService";
import { AgentKitTrustValidator, HighValueTransactionValidator } from "../trust/trustIntegration";
import type { CustodialWallet } from "../types/wallet";

/**
 * REAL API endpoints for custodial wallet management
 * No more fake handlers - these actually work with real data
 */

export const custodialWalletRoutes: Route[] = [
    {
        path: "/custodial-wallets",
        type: "GET",
        name: "List Custodial Wallets",
        handler: async (req, res, runtime) => {
            try {
                const entityId = req.query.entityId as string;
                const roomId = req.query.roomId as string;
                const worldId = req.query.worldId as string;
                
                if (!entityId && !roomId && !worldId) {
                    return res.status(400).json({
                        error: "Must specify entityId, roomId, or worldId"
                    });
                }
                
                const custodialService = runtime.getService<CustodialWalletService>("custodial-wallet");
                if (!custodialService) {
                    return res.status(503).json({
                        error: "Custodial wallet service not available"
                    });
                }
                
                let wallets: CustodialWallet[] = [];
                if (entityId) {
                    wallets = await custodialService.getWalletsForEntity(entityId as any);
                } else if (roomId) {
                    wallets = await custodialService.getWalletsForRoom(roomId as any);
                } else if (worldId) {
                    wallets = await custodialService.getWalletsForWorld(worldId as any);
                }
                
                // Filter based on permissions
                const accessibleWallets: CustodialWallet[] = [];
                if (wallets) {
                    for (const wallet of wallets) {
                        const requestingEntity = req.headers['x-entity-id'] as string || entityId;
                        const hasPermission = await custodialService.hasPermission(
                            wallet.id,
                            requestingEntity as any,
                            'view'
                        );
                        if (hasPermission) {
                            accessibleWallets.push(wallet);
                        }
                    }
                }
                
                res.json({
                    success: true,
                    wallets: accessibleWallets.map(wallet => ({
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
                    }))
                });
                
            } catch (error) {
                logger.error("[WalletAPI] Error listing wallets:", error);
                res.status(500).json({
                    error: "Failed to list wallets"
                });
            }
        }
    },
    
    {
        path: "/custodial-wallets",
        type: "POST",
        name: "Create Custodial Wallet",
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
                    network
                } = req.body;
                
                if (!name || !ownerId) {
                    return res.status(400).json({
                        error: "Name and ownerId are required"
                    });
                }
                
                // Validate that requester has permission to create wallets
                const requestingEntity = req.headers['x-entity-id'] as string;
                if (requestingEntity !== ownerId) {
                    // Check if requesting entity has admin permissions in the context
                    const hasPermission = await validateCreatePermission(
                        runtime,
                        requestingEntity,
                        entityId || roomId || worldId
                    );
                    
                    if (!hasPermission) {
                        return res.status(403).json({
                            error: "Insufficient permissions to create wallet"
                        });
                    }
                }
                
                const custodialService = runtime.getService<CustodialWalletService>("custodial-wallet");
                if (!custodialService) {
                    return res.status(503).json({
                        error: "Custodial wallet service not available"
                    });
                }
                
                const wallet = await custodialService.createWallet({
                    name,
                    description,
                    entityId: entityId as any,
                    roomId: roomId as any,
                    worldId: worldId as any,
                    ownerId: ownerId as any,
                    purpose,
                    trustLevel: trustLevel || 50,
                    isPool: isPool || false,
                    maxBalance,
                    allowedTokens,
                    network
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
                    }
                });
                
            } catch (error) {
                logger.error("[WalletAPI] Error creating wallet:", error);
                res.status(500).json({
                    error: `Failed to create wallet: ${error instanceof Error ? error.message : String(error)}`
                });
            }
        }
    },
    
    {
        path: "/custodial-wallets/:walletId",
        type: "GET",
        name: "Get Custodial Wallet Details",
        handler: async (req, res, runtime) => {
            try {
                const { walletId } = req.params;
                const requestingEntity = req.headers['x-entity-id'] as string;
                
                if (!requestingEntity) {
                    return res.status(401).json({
                        error: "Entity ID required in headers"
                    });
                }
                
                const custodialService = runtime.getService<CustodialWalletService>("custodial-wallet");
                if (!custodialService) {
                    return res.status(503).json({
                        error: "Custodial wallet service not available"
                    });
                }
                
                const wallet = await custodialService.getWallet(walletId as any);
                if (!wallet) {
                    return res.status(404).json({
                        error: "Wallet not found"
                    });
                }
                
                // Check permissions
                const hasPermission = await custodialService.hasPermission(
                    wallet.id,
                    requestingEntity as any,
                    'view'
                );
                
                if (!hasPermission) {
                    return res.status(403).json({
                        error: "Insufficient permissions to view wallet"
                    });
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
                        permissions: wallet.permissions.map(p => ({
                            entityId: p.entityId,
                            type: p.type,
                            grantedAt: p.grantedAt,
                            expiresAt: p.expiresAt,
                            allowedOperations: p.allowedOperations,
                        }))
                    }
                });
                
            } catch (error) {
                logger.error("[WalletAPI] Error getting wallet details:", error);
                res.status(500).json({
                    error: "Failed to get wallet details"
                });
            }
        }
    },
    
    {
        path: "/custodial-wallets/:walletId/transfer",
        type: "POST",
        name: "Execute Wallet Transfer",
        handler: async (req, res, runtime) => {
            try {
                const { walletId } = req.params;
                const { toAddress, amount, tokenAddress, purpose } = req.body;
                const requestingEntity = req.headers['x-entity-id'] as string;
                
                if (!requestingEntity) {
                    return res.status(401).json({
                        error: "Entity ID required in headers"
                    });
                }
                
                if (!toAddress || !amount) {
                    return res.status(400).json({
                        error: "toAddress and amount are required"
                    });
                }
                
                const custodialService = runtime.getService<CustodialWalletService>("custodial-wallet");
                if (!custodialService) {
                    return res.status(503).json({
                        error: "Custodial wallet service not available"
                    });
                }
                
                const wallet = await custodialService.getWallet(walletId as any);
                if (!wallet) {
                    return res.status(404).json({
                        error: "Wallet not found"
                    });
                }
                
                // Check transfer permissions
                const hasPermission = await custodialService.hasPermission(
                    wallet.id,
                    requestingEntity as any,
                    'transfer'
                );
                
                if (!hasPermission) {
                    return res.status(403).json({
                        error: "Insufficient permissions to transfer from wallet"
                    });
                }
                
                // Validate trust level for the transfer
                const amountWei = BigInt(amount);
                
                // Get trust level and validate transaction value
                const trustService = runtime.getService('trust-engine');
                let trustLevel = 50; // Default trust level
                
                if (trustService) {
                    const trustEngine = (trustService as any).trustEngine;
                    if (trustEngine) {
                        const trustProfile = await trustEngine.calculateTrust(requestingEntity, {
                            evaluatorId: runtime.agentId,
                            roomId: walletId
                        });
                        trustLevel = trustProfile.overallTrust;
                    }
                }
                
                if (trustLevel < wallet.requiredTrustLevel) {
                    return res.status(403).json({
                        error: `Trust validation failed: Trust level ${trustLevel} < ${wallet.requiredTrustLevel}`,
                        currentTrustLevel: trustLevel,
                        requiredLevel: wallet.requiredTrustLevel
                    });
                }
                
                // Validate transaction value for high-value transfers
                const amountInEth = Number(amountWei) / 1e18;
                const tokenSymbol = tokenAddress || 'ETH';
                const validation = await HighValueTransactionValidator.validateTransactionValue(
                    runtime,
                    { entityId: requestingEntity, content: {} } as any,
                    amountInEth,
                    tokenSymbol
                );
                
                if (!validation.allowed) {
                    return res.status(403).json({
                        error: `Transaction blocked: ${validation.reason}`,
                        requiresApproval: validation.requiresApproval
                    });
                }
                
                // Execute the transfer
                const result = await custodialService.executeTransaction({
                    walletId: wallet.id,
                    toAddress,
                    amountWei,
                    tokenAddress,
                    initiatedBy: requestingEntity as any,
                    purpose: purpose || 'API transfer',
                    trustLevel: trustLevel,
                });
                
                res.json({
                    success: true,
                    transactionHash: result.txHash,
                    transactionId: result.transactionId,
                    trustLevel: trustLevel,
                    validation: {
                        allowed: validation.allowed,
                        requiresApproval: validation.requiresApproval
                    }
                });
                
            } catch (error) {
                logger.error("[WalletAPI] Error executing transfer:", error);
                res.status(500).json({
                    error: `Transfer failed: ${error instanceof Error ? error.message : String(error)}`
                });
            }
        }
    },
    
    {
        path: "/custodial-wallets/:walletId/balance",
        type: "GET",
        name: "Get Wallet Balance",
        handler: async (req, res, runtime) => {
            try {
                const { walletId } = req.params;
                const { tokenAddress } = req.query;
                const requestingEntity = req.headers['x-entity-id'] as string;
                
                if (!requestingEntity) {
                    return res.status(401).json({
                        error: "Entity ID required in headers"
                    });
                }
                
                const custodialService = runtime.getService<CustodialWalletService>("custodial-wallet");
                if (!custodialService) {
                    return res.status(503).json({
                        error: "Custodial wallet service not available"
                    });
                }
                
                const wallet = await custodialService.getWallet(walletId as any);
                if (!wallet) {
                    return res.status(404).json({
                        error: "Wallet not found"
                    });
                }
                
                // Check view permissions
                const hasPermission = await custodialService.hasPermission(
                    wallet.id,
                    requestingEntity as any,
                    'view'
                );
                
                if (!hasPermission) {
                    return res.status(403).json({
                        error: "Insufficient permissions to view wallet balance"
                    });
                }
                
                // Get actual balance from blockchain (not fake balance)
                const agentKitService = runtime.getService("agentkit") as any;
                if (!agentKitService || !agentKitService.isReady()) {
                    return res.status(503).json({
                        error: "AgentKit service not available for balance lookup"
                    });
                }
                
                const agentKit = agentKitService.getAgentKit();
                
                let balance;
                if (tokenAddress && tokenAddress !== 'ETH') {
                    // Get ERC20 token balance
                    balance = await agentKit.runTool("get_token_balance", {
                        tokenAddress: tokenAddress as string,
                        walletAddress: wallet.address
                    });
                } else {
                    // Get native ETH balance
                    balance = await agentKit.runTool("get_balance", {
                        address: wallet.address
                    });
                }
                
                res.json({
                    success: true,
                    balance: {
                        walletId: wallet.id,
                        address: wallet.address,
                        network: wallet.network,
                        tokenAddress: tokenAddress || 'ETH',
                        balance: balance.toString(),
                        lastUpdated: Date.now()
                    }
                });
                
            } catch (error) {
                logger.error("[WalletAPI] Error getting balance:", error);
                res.status(500).json({
                    error: `Failed to get balance: ${error instanceof Error ? error.message : String(error)}`
                });
            }
        }
    },
    
    {
        path: "/custodial-wallets/:walletId/transactions",
        type: "GET",
        name: "Get Wallet Transaction History",
        handler: async (req, res, runtime) => {
            try {
                const { walletId } = req.params;
                const { limit = 50, offset = 0 } = req.query;
                const requestingEntity = req.headers['x-entity-id'] as string;
                
                if (!requestingEntity) {
                    return res.status(401).json({
                        error: "Entity ID required in headers"
                    });
                }
                
                const custodialService = runtime.getService<CustodialWalletService>("custodial-wallet");
                if (!custodialService) {
                    return res.status(503).json({
                        error: "Custodial wallet service not available"
                    });
                }
                
                const wallet = await custodialService.getWallet(walletId as any);
                if (!wallet) {
                    return res.status(404).json({
                        error: "Wallet not found"
                    });
                }
                
                // Check view permissions
                const hasPermission = await custodialService.hasPermission(
                    wallet.id,
                    requestingEntity as any,
                    'view'
                );
                
                if (!hasPermission) {
                    return res.status(403).json({
                        error: "Insufficient permissions to view transaction history"
                    });
                }
                
                // Get transactions from database
                const db = (runtime as any).databaseAdapter || (runtime as any).db;
                if (!db) {
                    return res.status(503).json({
                        error: "Database not available"
                    });
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
                    [walletId, Number.parseInt(limit as string), Number.parseInt(offset as string)]
                );
                
                const totalCount = await db.query(
                    "SELECT COUNT(*) as count FROM wallet_transactions WHERE wallet_id = ?",
                    [walletId]
                );
                
                res.json({
                    success: true,
                    transactions: transactions || [],
                    pagination: {
                        total: totalCount?.[0]?.count || 0,
                        limit: Number.parseInt(limit as string),
                        offset: Number.parseInt(offset as string)
                    }
                });
                
            } catch (error) {
                logger.error("[WalletAPI] Error getting transaction history:", error);
                res.status(500).json({
                    error: "Failed to get transaction history"
                });
            }
        }
    }
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
            const trustEngine = (trustService as any).trustEngine;
            if (trustEngine) {
                const trustProfile = await trustEngine.calculateTrust(requestingEntity, {
                    evaluatorId: runtime.agentId,
                    operation: 'create_wallet',
                    context: { contextId }
                });
                
                return trustProfile.overallTrust >= 30; // Minimum trust to create wallets
            }
        }
        
        return true; // Allow if trust service not available
    } catch (error) {
        logger.error("[WalletAPI] Error validating create permission:", error);
        return false;
    }
}