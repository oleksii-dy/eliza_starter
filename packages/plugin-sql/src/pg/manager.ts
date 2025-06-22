import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool, type PoolClient } from 'pg';
import { logger } from '@elizaos/core';

export class PostgresConnectionManager {
  private pool: Pool;
  private db: NodePgDatabase;

  constructor(connectionString: string) {
    // Parse connection string to check if SSL is needed
    const poolConfig: any = { connectionString };

    // If connecting to Supabase or other cloud providers, enable SSL
    if (
      connectionString.includes('supabase') ||
      connectionString.includes('amazonaws') ||
      connectionString.includes('azure') ||
      connectionString.includes('gcp') ||
      connectionString.includes('ssl=true') ||
      connectionString.includes('sslmode=require')
    ) {
      poolConfig.ssl = {
        rejectUnauthorized: false, // For development; in production, use proper certificates
      };
    }

    this.pool = new Pool(poolConfig);
    this.db = drizzle(this.pool as any);
  }

  public getDatabase(): NodePgDatabase {
    return this.db;
  }

  public getDb(): NodePgDatabase {
    return this.db;
  }

  public getConnection(): Pool {
    return this.pool;
  }

  public getPool(): Pool {
    return this.pool;
  }

  public async getClient(): Promise<PoolClient> {
    return this.pool.connect();
  }

  public async testConnection(): Promise<boolean> {
    let client: PoolClient | null = null;
    try {
      client = await this.pool.connect();
      await client.query('SELECT 1');
      return true;
    } catch (error) {
      logger.error('Failed to connect to the database:', error);
      return false;
    } finally {
      if (client) {
        client.release();
      }
    }
  }

  private _isClosed = false;

  /**
   * Closes the connection pool.
   * @returns {Promise<void>}
   * @memberof PostgresConnectionManager
   */
  public async close(): Promise<void> {
    if (this._isClosed) {
      return;
    }
    this._isClosed = true;
    await this.pool.end();
  }

  public async end(): Promise<void> {
    if (this._isClosed) {
      return;
    }
    this._isClosed = true;
    await this.pool.end();
  }

  // For backward compatibility with new adapter
  async waitForInitialization(): Promise<void> {
    // No-op since we initialize synchronously
    return Promise.resolve();
  }

  /**
   * Get pool statistics for monitoring and optimization
   */
  public getPoolStats() {
    return {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount,
      maxConnections: 10,
      minConnections: 0,
    };
  }

  /**
   * Log current pool status for debugging
   */
  public logPoolStatus(): void {
    const stats = this.getPoolStats();
    logger.info('PostgreSQL Pool Status:', {
      total: stats.totalCount,
      idle: stats.idleCount,
      waiting: stats.waitingCount,
      max: stats.maxConnections,
      min: stats.minConnections,
      utilization: `${Math.round((stats.totalCount / stats.maxConnections) * 100)}%`,
    });
  }
}
