import { IAgentRuntime, Service, logger } from '@elizaos/core';
import { Keypair, PublicKey, Connection } from '@solana/web3.js';
import * as crypto from 'crypto';
import * as bs58 from 'bs58';

export enum EntityType {
  USER = 'user',
  ROOM = 'room',
  WORLD = 'world',
  AGENT = 'agent',
  POOL = 'pool',
  CONTRACT = 'contract',
}

export interface WalletEntity {
  id: string;
  type: EntityType;
  publicKey: string;
  encryptedPrivateKey: string;
  owner: string; // User ID who owns this wallet
  delegates: string[]; // Users who can act on behalf of this wallet
  metadata: {
    name?: string;
    description?: string;
    tags?: string[];
    permissions?: string[];
    createdAt: string;
    updatedAt: string;
    version: number;
  };
  status: 'active' | 'suspended' | 'archived';
  restrictions?: {
    maxTransactionAmount?: number;
    allowedTokens?: string[];
    dailyLimit?: number;
    requireApproval?: boolean;
  };
}

export interface WalletPermission {
  entityId: string;
  userId: string;
  permissions: ('read' | 'transfer' | 'trade' | 'admin')[];
  grantedAt: string;
  grantedBy: string;
  expiresAt?: string;
}

export interface CustodialWalletConfig {
  masterSeed: string;
  encryptionKey: string;
  network: 'mainnet-beta' | 'testnet' | 'devnet';
  defaultRestrictions?: {
    maxTransactionAmount: number;
    dailyLimit: number;
    requireApproval: boolean;
  };
}

export class CustodialWalletService extends Service {
  static serviceName = 'custodial-wallet';
  static serviceType = 'custodial-wallet';
  capabilityDescription =
    'Enterprise-grade custodial wallet management with permissions, restrictions, and audit trails';

  private connection: Connection;
  private masterSeed: string;
  private encryptionKey: string;
  private wallets: Map<string, WalletEntity> = new Map();
  private permissions: Map<string, WalletPermission[]> = new Map();
  private network: string;

  constructor(runtime: IAgentRuntime) {
    super(runtime);

    this.network = runtime.getSetting('SOLANA_NETWORK') || 'devnet';

    // Try to get connection from RPC service first
    const rpcService = runtime.getService('rpc-service');
    if (rpcService && 'getConnection' in rpcService && typeof rpcService.getConnection === 'function') {
      this.connection = rpcService.getConnection();
    } else {
      const rpcUrl = runtime.getSetting('SOLANA_RPC_URL') || this.getDefaultRpcUrl();
      this.connection = new Connection(rpcUrl, 'confirmed');
    }

    // Initialize encryption keys
    this.masterSeed = runtime.getSetting('WALLET_MASTER_SEED') || this.generateMasterSeed();
    this.encryptionKey =
      runtime.getSetting('WALLET_ENCRYPTION_KEY') || this.generateEncryptionKey();

    logger.info(`CustodialWalletService initialized on ${this.network}`);
  }

  private getDefaultRpcUrl(): string {
    switch (this.network) {
      case 'mainnet-beta':
        return 'https://api.mainnet-beta.solana.com';
      case 'testnet':
        return 'https://api.testnet.solana.com';
      case 'devnet':
      default:
        return 'https://api.devnet.solana.com';
    }
  }

  private generateMasterSeed(): string {
    const seed = crypto.randomBytes(32);
    logger.warn('Generated new master seed - this should be saved securely!');
    return seed.toString('hex');
  }

  private generateEncryptionKey(): string {
    const key = crypto.randomBytes(32);
    logger.warn('Generated new encryption key - this should be saved securely!');
    return key.toString('hex');
  }

  private deriveKeypair(entityId: string, entityType: EntityType): Keypair {
    const derivationPath = `${entityType}/${entityId}`;
    const seed = crypto.createHmac('sha256', this.masterSeed).update(derivationPath).digest();

    return Keypair.fromSeed(seed.slice(0, 32));
  }

  private encryptPrivateKey(privateKey: Uint8Array): string {
    const iv = crypto.randomBytes(16);
    const key = crypto.scryptSync(this.encryptionKey, 'salt', 32);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(Buffer.from(privateKey));
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
  }

  private decryptPrivateKey(encryptedKey: string): Uint8Array {
    const [ivHex, encryptedHex] = encryptedKey.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const key = crypto.scryptSync(this.encryptionKey, 'salt', 32);
    const encrypted = Buffer.from(encryptedHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return new Uint8Array(decrypted);
  }

  async createWallet(
    entityId: string,
    entityType: EntityType,
    owner: string,
    metadata?: Partial<WalletEntity['metadata']>
  ): Promise<WalletEntity> {
    logger.info(`Creating custodial wallet for ${entityType}:${entityId} owned by ${owner}`);

    // Check if wallet already exists
    if (this.wallets.has(entityId)) {
      throw new Error(`Wallet for ${entityType}:${entityId} already exists`);
    }

    // Derive keypair deterministically
    const keypair = this.deriveKeypair(entityId, entityType);
    const encryptedPrivateKey = this.encryptPrivateKey(keypair.secretKey);

    const wallet: WalletEntity = {
      id: entityId,
      type: entityType,
      publicKey: keypair.publicKey.toBase58(),
      encryptedPrivateKey,
      owner,
      delegates: [],
      metadata: {
        name: metadata?.name || `${entityType} wallet`,
        description: metadata?.description || `Custodial wallet for ${entityType}:${entityId}`,
        tags: metadata?.tags || [],
        permissions: metadata?.permissions || ['read', 'transfer'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: 1,
        ...metadata,
      },
      status: 'active',
      restrictions: {
        maxTransactionAmount: 10, // 10 SOL default
        dailyLimit: 100, // 100 SOL daily
        requireApproval: false,
      },
    };

    this.wallets.set(entityId, wallet);

    // Grant full permissions to owner
    await this.grantPermission(entityId, owner, ['read', 'transfer', 'trade', 'admin'], owner);

    logger.info(`Created wallet ${keypair.publicKey.toBase58()} for ${entityType}:${entityId}`);
    return wallet;
  }

  async getWallet(entityId: string): Promise<WalletEntity | null> {
    return this.wallets.get(entityId) || null;
  }

  async getWalletsByOwner(owner: string): Promise<WalletEntity[]> {
    return Array.from(this.wallets.values()).filter((wallet) => wallet.owner === owner);
  }

  async getWalletsByType(entityType: EntityType): Promise<WalletEntity[]> {
    return Array.from(this.wallets.values()).filter((wallet) => wallet.type === entityType);
  }

  async getKeypair(entityId: string, requesterId: string): Promise<Keypair> {
    const wallet = this.wallets.get(entityId);
    if (!wallet) {
      throw new Error(`Wallet not found for entity ${entityId}`);
    }

    // Check permissions
    if (!(await this.hasPermission(entityId, requesterId, 'admin'))) {
      throw new Error(`User ${requesterId} does not have admin permission for wallet ${entityId}`);
    }

    const privateKey = this.decryptPrivateKey(wallet.encryptedPrivateKey);
    return Keypair.fromSecretKey(privateKey);
  }

  async getPublicKey(entityId: string): Promise<PublicKey | null> {
    const wallet = this.wallets.get(entityId);
    return wallet ? new PublicKey(wallet.publicKey) : null;
  }

  async transferOwnership(entityId: string, currentOwner: string, newOwner: string): Promise<void> {
    const wallet = this.wallets.get(entityId);
    if (!wallet) {
      throw new Error(`Wallet not found for entity ${entityId}`);
    }

    if (wallet.owner !== currentOwner) {
      throw new Error(`User ${currentOwner} is not the owner of wallet ${entityId}`);
    }

    wallet.owner = newOwner;
    wallet.metadata.updatedAt = new Date().toISOString();
    wallet.metadata.version++;

    // Transfer admin permissions
    await this.revokePermission(entityId, currentOwner, currentOwner);
    await this.grantPermission(
      entityId,
      newOwner,
      ['read', 'transfer', 'trade', 'admin'],
      newOwner
    );

    logger.info(`Transferred ownership of wallet ${entityId} from ${currentOwner} to ${newOwner}`);
  }

  async grantPermission(
    entityId: string,
    userId: string,
    permissions: ('read' | 'transfer' | 'trade' | 'admin')[],
    grantedBy: string,
    expiresAt?: string
  ): Promise<void> {
    const wallet = this.wallets.get(entityId);
    if (!wallet) {
      throw new Error(`Wallet not found for entity ${entityId}`);
    }

    // Check if granter has admin permission
    if (wallet.owner !== grantedBy && !(await this.hasPermission(entityId, grantedBy, 'admin'))) {
      throw new Error(
        `User ${grantedBy} does not have permission to grant access to wallet ${entityId}`
      );
    }

    const entityPermissions = this.permissions.get(entityId) || [];

    // Remove existing permissions for this user
    const filteredPermissions = entityPermissions.filter((p) => p.userId !== userId);

    // Add new permissions
    const newPermission: WalletPermission = {
      entityId,
      userId,
      permissions,
      grantedAt: new Date().toISOString(),
      grantedBy,
      expiresAt,
    };

    filteredPermissions.push(newPermission);
    this.permissions.set(entityId, filteredPermissions);

    // Add to delegates if not already present
    if (!wallet.delegates.includes(userId) && userId !== wallet.owner) {
      wallet.delegates.push(userId);
    }

    logger.info(
      `Granted permissions [${permissions.join(', ')}] to user ${userId} for wallet ${entityId}`
    );
  }

  async revokePermission(entityId: string, userId: string, revokedBy: string): Promise<void> {
    const wallet = this.wallets.get(entityId);
    if (!wallet) {
      throw new Error(`Wallet not found for entity ${entityId}`);
    }

    // Check if revoker has admin permission
    if (wallet.owner !== revokedBy && !(await this.hasPermission(entityId, revokedBy, 'admin'))) {
      throw new Error(
        `User ${revokedBy} does not have permission to revoke access to wallet ${entityId}`
      );
    }

    const entityPermissions = this.permissions.get(entityId) || [];
    const filteredPermissions = entityPermissions.filter((p) => p.userId !== userId);
    this.permissions.set(entityId, filteredPermissions);

    // Remove from delegates
    wallet.delegates = wallet.delegates.filter((d) => d !== userId);

    logger.info(`Revoked permissions for user ${userId} from wallet ${entityId}`);
  }

  async hasPermission(
    entityId: string,
    userId: string,
    permission: 'read' | 'transfer' | 'trade' | 'admin'
  ): Promise<boolean> {
    const wallet = this.wallets.get(entityId);
    if (!wallet) {
      return false;
    }

    // Owner always has all permissions
    if (wallet.owner === userId) {
      return true;
    }

    const entityPermissions = this.permissions.get(entityId) || [];
    const userPermission = entityPermissions.find((p) => p.userId === userId);

    if (!userPermission) {
      return false;
    }

    // Check if permission has expired
    if (userPermission.expiresAt && new Date(userPermission.expiresAt) < new Date()) {
      return false;
    }

    return userPermission.permissions.includes(permission);
  }

  async updateWalletMetadata(
    entityId: string,
    updates: Partial<WalletEntity['metadata']>,
    updatedBy: string
  ): Promise<void> {
    const wallet = this.wallets.get(entityId);
    if (!wallet) {
      throw new Error(`Wallet not found for entity ${entityId}`);
    }

    if (!(await this.hasPermission(entityId, updatedBy, 'admin'))) {
      throw new Error(`User ${updatedBy} does not have admin permission for wallet ${entityId}`);
    }

    wallet.metadata = {
      ...wallet.metadata,
      ...updates,
      updatedAt: new Date().toISOString(),
      version: wallet.metadata.version + 1,
    };

    logger.info(`Updated metadata for wallet ${entityId}`);
  }

  async updateWalletRestrictions(
    entityId: string,
    restrictions: Partial<WalletEntity['restrictions']>,
    updatedBy: string
  ): Promise<void> {
    const wallet = this.wallets.get(entityId);
    if (!wallet) {
      throw new Error(`Wallet not found for entity ${entityId}`);
    }

    if (!(await this.hasPermission(entityId, updatedBy, 'admin'))) {
      throw new Error(`User ${updatedBy} does not have admin permission for wallet ${entityId}`);
    }

    wallet.restrictions = {
      ...wallet.restrictions,
      ...restrictions,
    };

    wallet.metadata.updatedAt = new Date().toISOString();
    wallet.metadata.version++;

    logger.info(`Updated restrictions for wallet ${entityId}`);
  }

  async suspendWallet(entityId: string, suspendedBy: string, reason?: string): Promise<void> {
    const wallet = this.wallets.get(entityId);
    if (!wallet) {
      throw new Error(`Wallet not found for entity ${entityId}`);
    }

    if (!(await this.hasPermission(entityId, suspendedBy, 'admin'))) {
      throw new Error(`User ${suspendedBy} does not have admin permission for wallet ${entityId}`);
    }

    wallet.status = 'suspended';
    wallet.metadata.updatedAt = new Date().toISOString();
    wallet.metadata.version++;

    if (reason) {
      wallet.metadata.description = `${wallet.metadata.description} | SUSPENDED: ${reason}`;
    }

    logger.warn(`Suspended wallet ${entityId}${reason ? ` (Reason: ${reason})` : ''}`);
  }

  async reactivateWallet(entityId: string, reactivatedBy: string): Promise<void> {
    const wallet = this.wallets.get(entityId);
    if (!wallet) {
      throw new Error(`Wallet not found for entity ${entityId}`);
    }

    if (!(await this.hasPermission(entityId, reactivatedBy, 'admin'))) {
      throw new Error(
        `User ${reactivatedBy} does not have admin permission for wallet ${entityId}`
      );
    }

    wallet.status = 'active';
    wallet.metadata.updatedAt = new Date().toISOString();
    wallet.metadata.version++;

    logger.info(`Reactivated wallet ${entityId}`);
  }

  async deleteWallet(entityId: string, deletedBy: string): Promise<void> {
    const wallet = this.wallets.get(entityId);
    if (!wallet) {
      throw new Error(`Wallet not found for entity ${entityId}`);
    }

    if (wallet.owner !== deletedBy) {
      throw new Error(`Only the owner can delete wallet ${entityId}`);
    }

    this.wallets.delete(entityId);
    this.permissions.delete(entityId);

    logger.warn(`Deleted wallet ${entityId} by ${deletedBy}`);
  }

  async getBalance(entityId: string): Promise<number> {
    const publicKey = await this.getPublicKey(entityId);
    if (!publicKey) {
      throw new Error(`Wallet not found for entity ${entityId}`);
    }

    const balance = await this.connection.getBalance(publicKey);
    return balance / 1e9; // Convert lamports to SOL
  }

  async listWallets(userId: string): Promise<WalletEntity[]> {
    const userWallets: WalletEntity[] = [];

    for (const wallet of this.wallets.values()) {
      if (wallet.owner === userId || (await this.hasPermission(wallet.id, userId, 'read'))) {
        userWallets.push(wallet);
      }
    }

    return userWallets;
  }

  async exportWalletData(
    entityId: string,
    requesterId: string
  ): Promise<{
    publicKey: string;
    metadata: WalletEntity['metadata'];
    permissions: WalletPermission[];
  }> {
    if (!(await this.hasPermission(entityId, requesterId, 'read'))) {
      throw new Error(`User ${requesterId} does not have read permission for wallet ${entityId}`);
    }

    const wallet = this.wallets.get(entityId);
    if (!wallet) {
      throw new Error(`Wallet not found for entity ${entityId}`);
    }

    return {
      publicKey: wallet.publicKey,
      metadata: wallet.metadata,
      permissions: this.permissions.get(entityId) || [],
    };
  }

  static async start(runtime: IAgentRuntime): Promise<CustodialWalletService> {
    logger.info('Starting CustodialWalletService...');
    const service = new CustodialWalletService(runtime);
    await service.initialize();
    return service;
  }

  async stop(): Promise<void> {
    logger.info('Stopping CustodialWalletService...');
    // Clear sensitive data from memory
    this.wallets.clear();
    this.permissions.clear();
  }

  private async initialize(): Promise<void> {
    // Load existing wallets from storage if available
    // This would typically load from a secure database
    logger.info('CustodialWalletService initialized successfully');
  }

  getNetwork(): string {
    return this.network;
  }

  getConnection(): Connection {
    return this.connection;
  }
}
