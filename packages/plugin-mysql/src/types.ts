import type { MySql2Database } from 'drizzle-orm/mysql2';
import type { ResultSetHeader, FieldPacket } from 'mysql2';

export type MySqlRawQueryResult = [ResultSetHeader, FieldPacket[]];

/**
 * Represents the MySQL database type.
 */
export type DrizzleDatabase = MySql2Database;

/**
 * Interface for managing a database client.
 * @template T - The type of the database connection object.
 */
export interface IDatabaseClientManager<T> {
  initialize(): Promise<void>;
  getConnection(): T;
  runMigrations(): Promise<void>;
  close(): Promise<void>;
}
