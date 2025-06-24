import type { UUID } from "../types/core.d";

/**
 * Wallet permission types
 */
export interface WalletPermission {
    entityId: UUID;
    type: 'view' | 'transfer' | 'admin';
    grantedAt: number;
    grantedBy: UUID;
    expiresAt?: number;
    allowedOperations?: string[];
}

/**
 * Custodial wallet data structure
 */
export interface CustodialWallet {
    id: UUID;
    address: string;
    network: string;
    name: string;
    description?: string;
    
    // Association - one of these will be set
    entityId?: UUID; // Associated with specific entity (user)
    roomId?: UUID; // Shared wallet for a room
    worldId?: UUID; // Shared wallet for a world
    
    // Ownership
    ownerId: UUID; // Primary owner
    
    // Configuration
    purpose?: string; // e.g., "trading", "defi", "savings", "pool"
    requiredTrustLevel: number; // Required trust level to interact
    isPool: boolean; // Whether this is a shared pool
    maxBalance?: bigint; // Optional balance limit in wei
    allowedTokens?: string[]; // Restricted token list
    
    // Permissions
    permissions: WalletPermission[];
    
    // Status
    status: string; // 'active', 'frozen', 'disabled'
    
    // Timestamps
    createdAt: number;
    lastUsedAt?: number;
    
    // Metadata for extensibility
    metadata: {
        trustLevel: number;
        [key: string]: any;
    };
}

/**
 * Wallet transaction record
 */
export interface WalletTransaction {
    id: UUID;
    walletId: UUID;
    txHash?: string; // Blockchain transaction hash
    fromAddress: string;
    toAddress: string;
    amountWei: bigint;
    tokenAddress?: string; // ERC20 token address, undefined for ETH
    initiatedBy: UUID; // Entity that initiated the transaction
    purpose?: string; // Human-readable purpose
    transactionType: string; // 'transfer', 'swap', 'stake', etc.
    status: string; // 'pending', 'submitted', 'confirmed', 'failed'
    confirmations?: number;
    trustLevelAtExecution?: number;
    createdAt: number;
    submittedAt?: number;
    confirmedAt?: number;
    failedAt?: number;
    errorMessage?: string;
}

/**
 * Wallet creation request
 */
export interface CreateWalletRequest {
    name: string;
    description?: string;
    entityId?: UUID;
    roomId?: UUID;
    worldId?: UUID;
    ownerId: UUID;
    purpose?: string;
    trustLevel?: number;
    isPool?: boolean;
    maxBalance?: number;
    allowedTokens?: string[];
    network?: string;
}

/**
 * Transaction execution request
 */
export interface ExecuteTransactionRequest {
    walletId: UUID;
    toAddress: string;
    amountWei: bigint;
    tokenAddress?: string;
    initiatedBy: UUID;
    purpose?: string;
    trustLevel?: number;
}

/**
 * Transaction execution result
 */
export interface TransactionResult {
    transactionId: UUID;
    txHash?: string;
    status: string;
    error?: string;
}