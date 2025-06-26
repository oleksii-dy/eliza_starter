import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool, type PoolClient } from 'pg';
import { logger, asUUID, type UUID } from '@elizaos/core';
import { v4 as uuidv4 } from 'uuid';
import * as schema from '../schema';

export interface PgManagerConfig {
  connectionString: string;
  ssl?: boolean;
  max?: number;
  min?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
}

/**
 * Enhanced PostgreSQL connection manager for Bun runtime with pgvector support
 */
export class PgManager {
  private pool: Pool;
  private db: NodePgDatabase<typeof schema>;
  private config: PgManagerConfig;
  private agentId: UUID;
  private _isClosed = false;

  constructor(config: PgManagerConfig) {
    this.config = config;
    this.agentId = uuidv4() as UUID;

    // Parse connection string and apply SSL settings
    const poolConfig: any = {
      connectionString: config.connectionString,
      max: config.max || 10,
      min: config.min || 0,
      idleTimeoutMillis: config.idleTimeoutMillis || 30000,
      connectionTimeoutMillis: config.connectionTimeoutMillis || 30000,
    };

    // Auto-detect SSL requirement
    if (this.shouldUseSSL(config.connectionString) || config.ssl) {
      poolConfig.ssl = {
        rejectUnauthorized: false, // For cloud providers with self-signed certs
      };
    }

    this.pool = new Pool(poolConfig);
    this.db = drizzle(this.pool, { schema });

    // Setup connection event handlers
    this.setupEventHandlers();
  }

  private shouldUseSSL(connectionString: string): boolean {
    return (
      connectionString.includes('supabase') ||
      connectionString.includes('amazonaws') ||
      connectionString.includes('azure') ||
      connectionString.includes('gcp') ||
      connectionString.includes('ssl=true') ||
      connectionString.includes('sslmode=require') ||
      connectionString.includes('vercel') ||
      connectionString.includes('railway') ||
      connectionString.includes('render')
    );
  }

  private setupEventHandlers(): void {
    this.pool.on('connect', (client) => {
      logger.debug('[PgManager] New client connected');
    });

    this.pool.on('error', (err) => {
      logger.error('[PgManager] Pool error:', err);
    });

    this.pool.on('remove', () => {
      logger.debug('[PgManager] Client removed from pool');
    });
  }

  /**
   * Initialize connection and verify pgvector extension
   */
  async connect(): Promise<void> {
    try {
      // Test basic connectivity
      await this.testConnection();

      logger.info('[PgManager] PostgreSQL connection established', {
        maxConnections: this.config.max,
        ssl: this.shouldUseSSL(this.config.connectionString),
      });
    } catch (error) {
      logger.error('[PgManager] Failed to connect to PostgreSQL:', error);
      throw new Error(`PostgreSQL connection failed: ${(error as Error).message}`);
    }
  }

  /**
   * Get the Drizzle database instance
   */
  getDatabase(): NodePgDatabase<typeof schema> {
    return this.db;
  }

  /**
   * Get the raw connection pool
   */
  getConnection(): Pool {
    return this.pool;
  }

  /**
   * Get a client from the connection pool
   */
  async getClient(): Promise<PoolClient> {
    try {
      return await this.pool.connect();
    } catch (error) {
      logger.error('[PgManager] Failed to get client from pool:', error);
      throw new Error(`Failed to get database client: ${(error as Error).message}`);
    }
  }

  /**
   * Execute a raw SQL query with parameters
   */
  async query(sql: string, params: any[] = []): Promise<any[]> {
    const client = await this.getClient();
    try {
      const result = await client.query(sql, params);
      return result.rows;
    } catch (error) {
      logger.error('[PgManager] Query failed:', { sql, error: (error as Error).message });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Test database connection health
   */
  async testConnection(): Promise<boolean> {
    let client: PoolClient | null = null;
    try {
      client = await this.pool.connect();
      await client.query('SELECT 1 as test');
      return true;
    } catch (error) {
      logger.error('[PgManager] Connection test failed:', error);
      return false;
    } finally {
      if (client) {
        client.release();
      }
    }
  }

  /**
   * Get connection string (sanitized for logging)
   */
  getConnectionString(): string {
    return this.config.connectionString;
  }

  /**
   * Get agent ID for this manager
   */
  getAgentId(): UUID {
    return this.agentId;
  }

  /**
   * Check if pgvector extension is available
   */
  async checkVectorSupport(): Promise<boolean> {
    try {
      const result = await this.query("SELECT extname FROM pg_extension WHERE extname = 'vector'");
      return result.length > 0;
    } catch (error) {
      logger.debug('[PgManager] Vector support check failed:', error);
      return false;
    }
  }

  /**
   * Initialize pgvector extension if available
   */
  async initializeVectorSupport(): Promise<boolean> {
    try {
      await this.query('CREATE EXTENSION IF NOT EXISTS vector');
      logger.info('[PgManager] pgvector extension initialized');
      return true;
    } catch (error) {
      logger.warn('[PgManager] Failed to initialize pgvector:', error);
      return false;
    }
  }

  /**
   * Get pool statistics for monitoring
   */
  getPoolStats() {
    return {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount,
      maxConnections: this.config.max || 10,
      minConnections: this.config.min || 0,
    };
  }

  /**
   * Get detailed database health metrics
   */
  async getHealthMetrics(): Promise<{
    isHealthy: boolean;
    latency?: number;
    poolStats: ReturnType<PgManager['getPoolStats']>;
    vectorSupport: boolean;
    error?: string;
  }> {
    const startTime = Date.now();

    try {
      const isHealthy = await this.testConnection();
      const latency = Date.now() - startTime;
      const vectorSupport = await this.checkVectorSupport();
      const poolStats = this.getPoolStats();

      return {
        isHealthy,
        latency,
        poolStats,
        vectorSupport,
      };
    } catch (error) {
      return {
        isHealthy: false,
        poolStats: this.getPoolStats(),
        vectorSupport: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Execute function with automatic retry logic
   */
  async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        // Don't retry on certain types of errors
        if (this.isNonRetryableError(error)) {
          throw error;
        }

        if (attempt < maxRetries) {
          const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), 10000);
          logger.warn(
            `[PgManager] Operation failed, retrying in ${delay}ms (attempt ${attempt}/${maxRetries}):`,
            (error as Error).message
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error('Operation failed after all retries');
  }

  private isNonRetryableError(error: any): boolean {
    // Don't retry syntax errors, permission errors, etc.
    return (
      error.code === '42601' || // syntax error
      error.code === '42501' || // insufficient privilege
      error.code === '42P01' || // undefined table
      error.code === '23505' // unique violation
    );
  }

  /**
   * Wait for manager to be ready with timeout
   */
  async waitForReady(timeoutMs: number = 30000): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      if (await this.testConnection()) {
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    throw new Error(`Database not ready after ${timeoutMs}ms timeout`);
  }

  /**
   * Close connection pool and cleanup
   */
  async close(): Promise<void> {
    if (this._isClosed) {
      return;
    }

    this._isClosed = true;

    try {
      await this.pool.end();
      logger.info('[PgManager] Connection pool closed');
    } catch (error) {
      logger.error('[PgManager] Error closing connection pool:', error);
    }
  }

  /**
   * Check if manager is closed
   */
  isClosed(): boolean {
    return this._isClosed;
  }

  /**
   * Log current pool status for debugging
   */
  logPoolStatus(): void {
    const stats = this.getPoolStats();
    logger.info('[PgManager] Pool Status:', {
      total: stats.totalCount,
      idle: stats.idleCount,
      waiting: stats.waitingCount,
      max: stats.maxConnections,
      min: stats.minConnections,
      utilization: `${Math.round((stats.totalCount / stats.maxConnections) * 100)}%`,
    });
  }
}

// Export legacy class name for backward compatibility
export class PostgresConnectionManager extends PgManager {
  constructor(connectionString: string) {
    super({ connectionString });
  }
}
