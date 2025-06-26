import { type IAgentRuntime, type UUID, elizaLogger, asUUID } from '../types/core.d';
import type { CustodialWallet, WalletTransaction, WalletPermission } from '../types/wallet';

// Database adapter interface
interface DatabaseAdapter {
  query(sql: string, params: unknown[]): Promise<unknown[]>;
  run(sql: string, params: unknown[]): Promise<void>;
  get(sql: string, params: unknown[]): Promise<unknown>;
  all(sql: string, params: unknown[]): Promise<unknown[]>;
  db?: unknown;
}

interface RuntimeWithDatabase {
  db?: DatabaseAdapter;
  databaseAdapter?: { db?: DatabaseAdapter };
}

// Database row interface for wallet records
interface WalletRow {
  id: string;
  address: string;
  network: string;
  name: string;
  description?: string;
  entity_id?: string;
  room_id?: string;
  world_id?: string;
  owner_id: string;
  purpose?: string;
  required_trust_level: number;
  is_pool: boolean;
  max_balance?: string;
  allowed_tokens?: string;
  status: string;
  created_at: number;
  last_used_at?: number;
  metadata: string;
}

interface PermissionRow {
  id: string;
  wallet_id: string;
  entity_id: string;
  type: string;
  granted_at: number;
  granted_by: string;
  expires_at?: number;
  allowed_operations?: string;
}

interface TransactionRow {
  id: string;
  wallet_id: string;
  tx_hash?: string;
  from_address: string;
  to_address: string;
  amount_wei: string;
  token_address?: string;
  initiated_by: string;
  transaction_type: string;
  purpose?: string;
  status: string;
  confirmations: number;
  trust_level_at_execution: number;
  created_at: number;
  submitted_at?: number;
  confirmed_at?: number;
  failed_at?: number;
  error_message?: string;
}

/**
 * Real database repository for custodial wallet persistence
 * No more cache-based storage - this is production-ready
 */
export class WalletRepository {
  constructor(private runtime: IAgentRuntime) {}

  /**
   * Initialize database tables if they don't exist
   */
  async initialize(): Promise<void> {
    try {
      const db = this.getDatabase();

      // Create custodial_wallets table
      await db.run(
        `
                CREATE TABLE IF NOT EXISTS custodial_wallets (
                    id TEXT PRIMARY KEY,
                    address TEXT NOT NULL,
                    network TEXT NOT NULL,
                    name TEXT NOT NULL,
                    description TEXT,
                    entity_id TEXT,
                    room_id TEXT,
                    world_id TEXT,
                    owner_id TEXT NOT NULL,
                    purpose TEXT,
                    required_trust_level INTEGER DEFAULT 50,
                    is_pool BOOLEAN DEFAULT FALSE,
                    max_balance TEXT,
                    allowed_tokens TEXT,
                    status TEXT DEFAULT 'active',
                    created_at INTEGER NOT NULL,
                    last_used_at INTEGER,
                    metadata TEXT,
                    UNIQUE(address, network)
                )
            `,
        []
      );

      // Create wallet_permissions table
      await db.run(
        `
                CREATE TABLE IF NOT EXISTS wallet_permissions (
                    id TEXT PRIMARY KEY,
                    wallet_id TEXT NOT NULL,
                    entity_id TEXT NOT NULL,
                    type TEXT NOT NULL,
                    granted_at INTEGER NOT NULL,
                    granted_by TEXT NOT NULL,
                    expires_at INTEGER,
                    allowed_operations TEXT,
                    FOREIGN KEY (wallet_id) REFERENCES custodial_wallets(id),
                    UNIQUE(wallet_id, entity_id, type)
                )
            `,
        []
      );

      // Create wallet_transactions table
      await db.run(
        `
                CREATE TABLE IF NOT EXISTS wallet_transactions (
                    id TEXT PRIMARY KEY,
                    wallet_id TEXT NOT NULL,
                    tx_hash TEXT,
                    from_address TEXT NOT NULL,
                    to_address TEXT NOT NULL,
                    amount_wei TEXT NOT NULL,
                    token_address TEXT,
                    initiated_by TEXT NOT NULL,
                    purpose TEXT,
                    transaction_type TEXT NOT NULL,
                    status TEXT NOT NULL,
                    confirmations INTEGER DEFAULT 0,
                    trust_level_at_execution INTEGER,
                    created_at INTEGER NOT NULL,
                    submitted_at INTEGER,
                    confirmed_at INTEGER,
                    failed_at INTEGER,
                    error_message TEXT,
                    FOREIGN KEY (wallet_id) REFERENCES custodial_wallets(id)
                )
            `,
        []
      );

      // Create indexes for performance
      await db.run(
        'CREATE INDEX IF NOT EXISTS idx_wallets_owner ON custodial_wallets(owner_id)',
        []
      );
      await db.run(
        'CREATE INDEX IF NOT EXISTS idx_wallets_entity ON custodial_wallets(entity_id)',
        []
      );
      await db.run('CREATE INDEX IF NOT EXISTS idx_wallets_room ON custodial_wallets(room_id)', []);
      await db.run(
        'CREATE INDEX IF NOT EXISTS idx_wallets_world ON custodial_wallets(world_id)',
        []
      );
      await db.run(
        'CREATE INDEX IF NOT EXISTS idx_permissions_wallet ON wallet_permissions(wallet_id)',
        []
      );
      await db.run(
        'CREATE INDEX IF NOT EXISTS idx_permissions_entity ON wallet_permissions(entity_id)',
        []
      );
      await db.run(
        'CREATE INDEX IF NOT EXISTS idx_transactions_wallet ON wallet_transactions(wallet_id)',
        []
      );
      await db.run(
        'CREATE INDEX IF NOT EXISTS idx_transactions_status ON wallet_transactions(status)',
        []
      );

      elizaLogger.info('[WalletRepository] Database tables initialized');
    } catch (error) {
      elizaLogger.error('[WalletRepository] Failed to initialize database:', error);
      throw error;
    }
  }

  /**
   * Get database adapter from runtime
   */
  private getDatabase(): DatabaseAdapter {
    // Use ElizaOS database adapter with proper type safety
    // Access database through the runtime's database adapter methods
    const runtimeTyped = this.runtime as RuntimeWithDatabase;
    const db = runtimeTyped.db || runtimeTyped.databaseAdapter?.db;
    if (!db) {
      throw new Error(
        '[WalletRepository] Database adapter not available - ensure SQL plugin is loaded'
      );
    }
    return db;
  }

  /**
   * Save a wallet to the database
   */
  async saveWallet(wallet: CustodialWallet): Promise<void> {
    const db = this.getDatabase();

    await db.run(
      `INSERT OR REPLACE INTO custodial_wallets 
            (id, address, network, name, description, entity_id, room_id, world_id, 
             owner_id, purpose, required_trust_level, is_pool, max_balance, 
             allowed_tokens, status, created_at, last_used_at, metadata)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        wallet.id,
        wallet.address,
        wallet.network,
        wallet.name,
        wallet.description,
        wallet.entityId,
        wallet.roomId,
        wallet.worldId,
        wallet.ownerId,
        wallet.purpose,
        wallet.requiredTrustLevel,
        wallet.isPool ? 1 : 0,
        wallet.maxBalance?.toString(),
        JSON.stringify(wallet.allowedTokens),
        wallet.status,
        wallet.createdAt,
        wallet.lastUsedAt,
        JSON.stringify(wallet.metadata),
      ]
    );

    // Save permissions
    for (const permission of wallet.permissions) {
      await this.savePermission(wallet.id, permission);
    }
  }

  /**
   * Get a wallet by ID
   */
  async getWallet(walletId: UUID): Promise<CustodialWallet | null> {
    const db = this.getDatabase();

    const row = (await db.get('SELECT * FROM custodial_wallets WHERE id = ?', [
      walletId,
    ])) as WalletRow | null;

    if (!row) {
      return null;
    }

    // Get permissions
    const permissions = await this.getWalletPermissions(walletId);

    return this.mapRowToWallet(row, permissions);
  }

  /**
   * Get all wallets for an entity
   */
  async getWalletsForEntity(entityId: UUID): Promise<CustodialWallet[]> {
    const db = this.getDatabase();

    const rows = (await db.all(
      'SELECT * FROM custodial_wallets WHERE entity_id = ? OR owner_id = ?',
      [entityId, entityId]
    )) as WalletRow[];

    const wallets: CustodialWallet[] = [];
    for (const row of rows) {
      const permissions = await this.getWalletPermissions(asUUID(row.id));
      wallets.push(this.mapRowToWallet(row, permissions));
    }

    return wallets;
  }

  /**
   * Get all wallets for a room
   */
  async getWalletsForRoom(roomId: UUID): Promise<CustodialWallet[]> {
    const db = this.getDatabase();

    const rows = (await db.all('SELECT * FROM custodial_wallets WHERE room_id = ?', [
      roomId,
    ])) as WalletRow[];

    const wallets: CustodialWallet[] = [];
    for (const row of rows) {
      const permissions = await this.getWalletPermissions(asUUID(row.id));
      wallets.push(this.mapRowToWallet(row, permissions));
    }

    return wallets;
  }

  /**
   * Get all wallets for a world
   */
  async getWalletsForWorld(worldId: UUID): Promise<CustodialWallet[]> {
    const db = this.getDatabase();

    const rows = (await db.all('SELECT * FROM custodial_wallets WHERE world_id = ?', [
      worldId,
    ])) as WalletRow[];

    const wallets: CustodialWallet[] = [];
    for (const row of rows) {
      const permissions = await this.getWalletPermissions(asUUID(row.id));
      wallets.push(this.mapRowToWallet(row, permissions));
    }

    return wallets;
  }

  /**
   * Get all wallets
   */
  async getAllWallets(): Promise<CustodialWallet[]> {
    const db = this.getDatabase();

    const rows = (await db.all('SELECT * FROM custodial_wallets', [])) as WalletRow[];

    const wallets: CustodialWallet[] = [];
    for (const row of rows) {
      const permissions = await this.getWalletPermissions(asUUID(row.id));
      wallets.push(this.mapRowToWallet(row, permissions));
    }

    return wallets;
  }

  /**
   * Update wallet status
   */
  async updateWalletStatus(walletId: UUID, status: string): Promise<void> {
    const db = this.getDatabase();

    await db.run('UPDATE custodial_wallets SET status = ? WHERE id = ?', [status, walletId]);
  }

  /**
   * Update wallet last used timestamp
   */
  async updateWalletLastUsed(walletId: UUID): Promise<void> {
    const db = this.getDatabase();

    await db.run('UPDATE custodial_wallets SET last_used_at = ? WHERE id = ?', [
      Date.now(),
      walletId,
    ]);
  }

  /**
   * Save a permission
   */
  async savePermission(walletId: UUID, permission: WalletPermission): Promise<void> {
    const db = this.getDatabase();

    await db.run(
      `INSERT OR REPLACE INTO wallet_permissions 
            (id, wallet_id, entity_id, type, granted_at, granted_by, expires_at, allowed_operations)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        `${walletId}-${permission.entityId}-${permission.type}`,
        walletId,
        permission.entityId,
        permission.type,
        permission.grantedAt,
        permission.grantedBy,
        permission.expiresAt,
        JSON.stringify(permission.allowedOperations),
      ]
    );
  }

  /**
   * Get permissions for a wallet
   */
  async getWalletPermissions(walletId: UUID): Promise<WalletPermission[]> {
    const db = this.getDatabase();

    const rows = (await db.all('SELECT * FROM wallet_permissions WHERE wallet_id = ?', [
      walletId,
    ])) as PermissionRow[];

    return rows.map((row) => ({
      entityId: row.entity_id as UUID,
      type: row.type as 'view' | 'transfer' | 'admin',
      grantedAt: row.granted_at,
      grantedBy: row.granted_by as UUID,
      expiresAt: row.expires_at,
      allowedOperations: row.allowed_operations ? JSON.parse(row.allowed_operations) : undefined,
    }));
  }

  /**
   * Remove a permission
   */
  async removePermission(walletId: UUID, entityId: UUID, type: string): Promise<void> {
    const db = this.getDatabase();

    await db.run(
      'DELETE FROM wallet_permissions WHERE wallet_id = ? AND entity_id = ? AND type = ?',
      [walletId, entityId, type]
    );
  }

  /**
   * Save a transaction
   */
  async saveTransaction(transaction: WalletTransaction): Promise<void> {
    const db = this.getDatabase();

    await db.run(
      `INSERT INTO wallet_transactions 
            (id, wallet_id, tx_hash, from_address, to_address, amount_wei, token_address,
             initiated_by, purpose, transaction_type, status, confirmations, 
             trust_level_at_execution, created_at, submitted_at, confirmed_at, 
             failed_at, error_message)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        transaction.id,
        transaction.walletId,
        transaction.txHash,
        transaction.fromAddress,
        transaction.toAddress,
        transaction.amountWei.toString(),
        transaction.tokenAddress,
        transaction.initiatedBy,
        transaction.purpose,
        transaction.transactionType,
        transaction.status,
        transaction.confirmations || 0,
        transaction.trustLevelAtExecution,
        transaction.createdAt,
        transaction.submittedAt,
        transaction.confirmedAt,
        transaction.failedAt,
        transaction.errorMessage,
      ]
    );
  }

  /**
   * Update transaction status
   */
  async updateTransactionStatus(
    transactionId: UUID,
    status: string,
    txHash?: string,
    errorMessage?: string
  ): Promise<void> {
    const db = this.getDatabase();

    const now = Date.now();
    let query = 'UPDATE wallet_transactions SET status = ?';
    const params: unknown[] = [status];

    if (txHash) {
      query += ', tx_hash = ?';
      params.push(txHash);
    }

    if (status === 'submitted') {
      query += ', submitted_at = ?';
      params.push(now);
    } else if (status === 'confirmed') {
      query += ', confirmed_at = ?';
      params.push(now);
    } else if (status === 'failed') {
      query += ', failed_at = ?, error_message = ?';
      params.push(now, errorMessage || null);
    }

    query += ' WHERE id = ?';
    params.push(transactionId);

    await db.run(query, params);
  }

  /**
   * Get transactions for a wallet
   */
  async getWalletTransactions(
    walletId: UUID,
    limit = 50,
    offset = 0
  ): Promise<WalletTransaction[]> {
    const db = this.getDatabase();

    const rows = (await db.all(
      `SELECT * FROM wallet_transactions 
             WHERE wallet_id = ? 
             ORDER BY created_at DESC 
             LIMIT ? OFFSET ?`,
      [walletId, limit, offset]
    )) as TransactionRow[];

    return rows.map((row) => ({
      id: row.id as UUID,
      walletId: row.wallet_id as UUID,
      txHash: row.tx_hash,
      fromAddress: row.from_address,
      toAddress: row.to_address,
      amountWei: BigInt(row.amount_wei),
      tokenAddress: row.token_address,
      initiatedBy: row.initiated_by as UUID,
      purpose: row.purpose,
      transactionType: row.transaction_type,
      status: row.status,
      confirmations: row.confirmations,
      trustLevelAtExecution: row.trust_level_at_execution,
      createdAt: row.created_at,
      submittedAt: row.submitted_at,
      confirmedAt: row.confirmed_at,
      failedAt: row.failed_at,
      errorMessage: row.error_message,
    }));
  }

  /**
   * Map database row to CustodialWallet object
   */
  private mapRowToWallet(row: WalletRow, permissions: WalletPermission[]): CustodialWallet {
    return {
      id: row.id as UUID,
      address: row.address,
      network: row.network,
      name: row.name,
      description: row.description,
      entityId: row.entity_id as UUID | undefined,
      roomId: row.room_id as UUID | undefined,
      worldId: row.world_id as UUID | undefined,
      ownerId: row.owner_id as UUID,
      purpose: row.purpose,
      requiredTrustLevel: row.required_trust_level,
      isPool: Boolean(row.is_pool),
      maxBalance: row.max_balance ? BigInt(row.max_balance) : undefined,
      allowedTokens: row.allowed_tokens ? JSON.parse(row.allowed_tokens) : undefined,
      permissions,
      status: row.status,
      createdAt: row.created_at,
      lastUsedAt: row.last_used_at,
      metadata: row.metadata
        ? JSON.parse(row.metadata)
        : {
            trustLevel: row.required_trust_level,
          },
    };
  }
}
