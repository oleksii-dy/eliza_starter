import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { logger } from '@elizaos/core';
import { drizzle } from 'drizzle-orm/mysql2';
import { migrate } from 'drizzle-orm/mysql2/migrator';
import mysql from 'mysql2/promise';
import type { IDatabaseClientManager } from '../types';

/**
 * Manages connections to a MySQL database using a connection pool.
 * Implements IDatabaseClientManager interface.
 */
export class MySql2ConnectionManager implements IDatabaseClientManager<mysql.Pool> {
  private pool: mysql.Pool;
  private isShuttingDown = false;
  private readonly connectionTimeout: number = 5000;

  /**
   * Constructor for creating a connection pool.
   * @param {string} connectionString - The connection string used to connect to the database.
   */
  constructor(connectionString: string) {
    // TODO: see if we need this.
    const defaultConfig = {
      waitForConnections: true,
      connectionLimit: 20,
      queueLimit: 0,
      connectTimeout: this.connectionTimeout,
    };

    // Create a pool using mysql2's createPool function
    this.pool = mysql.createPool(connectionString);

    // mysql2 has a slightly different event system compared to node-postgres
    // Here we listen for errors on connections from the pool
    this.pool.on('connection', (connection) => {
      connection.on('error', (err) => {
        logger.error('Unexpected connection error', err);
        this.handlePoolError(err);
      });
    });

    this.setupPoolErrorHandling();
    this.testConnection();
  }

  /**
   * Handles a pool error by attempting to reconnect the pool.
   *
   * @param {Error} error The error that occurred in the pool.
   * @throws {Error} If failed to reconnect the pool.
   */
  private async handlePoolError(error: Error) {
    logger.error('Pool error occurred, attempting to reconnect', {
      error: error.message,
    });

    try {
      await this.pool.end();

      // Create a new pool
      this.pool = mysql.createPool({
        uri: (this.pool.config as any).connectionConfig?.uri,
        connectTimeout: this.connectionTimeout,
      });

      await this.testConnection();
      logger.success('Pool reconnection successful');
    } catch (reconnectError) {
      logger.error('Failed to reconnect pool', {
        error: reconnectError instanceof Error ? reconnectError.message : String(reconnectError),
      });
      throw reconnectError;
    }
  }

  /**
   * Asynchronously tests the database connection by executing a query to get the current timestamp.
   *
   * @returns {Promise<boolean>} - A Promise that resolves to true if the database connection test is successful.
   */
  async testConnection(): Promise<boolean> {
    try {
      const [rows] = await this.pool.query('SELECT NOW()');
      logger.success('Database connection test successful:', rows[0]);
      return true;
    } catch (error) {
      logger.error('Database connection test failed:', error);
      throw new Error(`Failed to connect to database: ${(error as Error).message}`);
    }
  }

  /**
   * Sets up event listeners to handle pool cleanup on SIGINT, SIGTERM, and beforeExit events.
   */
  private setupPoolErrorHandling() {
    process.on('SIGINT', async () => {
      await this.cleanup();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      await this.cleanup();
      process.exit(0);
    });

    process.on('beforeExit', async () => {
      await this.cleanup();
    });
  }

  /**
   * Get the connection pool.
   * @returns {mysql.Pool} The connection pool
   * @throws {Error} If the connection manager is shutting down or an error occurs when trying to get the connection from the pool
   */
  public getConnection(): mysql.Pool {
    if (this.isShuttingDown) {
      throw new Error('Connection manager is shutting down');
    }

    try {
      return this.pool;
    } catch (error) {
      logger.error('Failed to get connection from pool:', error);
      throw error;
    }
  }

  /**
   * Asynchronously acquires a database client from the connection pool.
   *
   * @returns {Promise<mysql.PoolConnection>} A Promise that resolves with the acquired database client.
   * @throws {Error} If an error occurs while acquiring the database client.
   */
  public async getClient(): Promise<mysql.PoolConnection> {
    try {
      return await this.pool.getConnection();
    } catch (error) {
      logger.error('Failed to acquire a database client:', error);
      throw error;
    }
  }

  /**
   * Initializes the MySQL connection manager by testing the connection and logging the result.
   *
   * @returns {Promise<void>} A Promise that resolves once the manager is successfully initialized
   * @throws {Error} If there is an error initializing the connection manager
   */
  public async initialize(): Promise<void> {
    try {
      await this.testConnection();
      logger.debug('MySQL connection manager initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize connection manager:', error);
      throw error;
    }
  }

  /**
   * Asynchronously close the current process by executing a cleanup function.
   * @returns A promise that resolves once the cleanup is complete.
   */
  public async close(): Promise<void> {
    await this.cleanup();
  }

  /**
   * Cleans up and closes the database pool.
   * @returns {Promise<void>} A Promise that resolves when the database pool is closed.
   */
  async cleanup(): Promise<void> {
    try {
      await this.pool.end();
      logger.info('Database pool closed');
    } catch (error) {
      logger.error('Error closing database pool:', error);
    }
  }

  /**
   * Asynchronously runs database migrations using the Drizzle library.
   *
   * Drizzle will first check if the migrations are already applied.
   * If there is a diff between database schema and migrations, it will apply the migrations.
   * If they are already applied, it will skip them.
   *
   * @returns {Promise<void>} A Promise that resolves once the migrations are completed successfully.
   */
  async runMigrations(): Promise<void> {
    try {
      // Get a dedicated connection for migrations (recommended by Drizzle)
      const connection = await mysql.createConnection({
        uri: (this.pool.config as any).connectionConfig?.uri,
      });

      const db = drizzle(connection);

      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);

      await migrate(db, {
        migrationsFolder: path.resolve(__dirname, '../drizzle/migrations'),
      });

      // Close the connection after migration is complete
      await connection.end();
    } catch (error) {
      logger.error('Failed to run database migrations (mysql):', error);
      throw error;
    }
  }
}
