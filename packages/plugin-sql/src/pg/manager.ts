import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool, type PoolClient } from 'pg';
import { logger } from '@elizaos/core';
import * as schema from '../schema/index';

export class PostgresConnectionManager {
  private pool: Pool;
  private db: NodePgDatabase<typeof schema>;
  private _isClosed: boolean = false;

  constructor(connectionString: string) {
    this.pool = new Pool({ connectionString });
    this.db = drizzle(this.pool as any, { schema });
  }

  public getDatabase(): NodePgDatabase<typeof schema> {
    return this.db;
  }

  public isClosed(): boolean {
    return this._isClosed;
  }

  public getConnection(): Pool {
    if (this._isClosed) {
      throw new Error('Cannot get connection from closed PostgreSQL connection pool');
    }
    return this.pool;
  }

  public async getClient(): Promise<PoolClient> {
    if (this._isClosed) {
      throw new Error('Cannot get client from closed PostgreSQL connection pool');
    }
    return this.pool.connect();
  }

  public async testConnection(): Promise<boolean> {
    if (this._isClosed) {
      return false;
    }

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

  /**
   * Closes the connection pool.
   * @returns {Promise<void>}
   * @memberof PostgresConnectionManager
   */
  public async close(): Promise<void> {
    if (this._isClosed) {
      logger.debug('PostgreSQL connection pool already closed, skipping');
      return;
    }

    try {
      await this.pool.end();
      this._isClosed = true;
      logger.debug('PostgreSQL connection pool closed successfully');
    } catch (error) {
      logger.error('Error closing PostgreSQL connection pool:', error);
      // Mark as closed even if there was an error to prevent retry
      this._isClosed = true;
      throw error;
    }
  }
}
