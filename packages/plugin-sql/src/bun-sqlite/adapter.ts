import {
  logger,
  VECTOR_DIMS,
  World,
  type Agent,
  type Component,
  type Entity,
  type Memory,
  type Room,
  type UUID,
} from '@elizaos/core';
import { Database } from 'bun:sqlite';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import * as fs from 'fs';
import * as path from 'path';
import * as sqliteVec from 'sqlite-vec';
import { v4 as uuidv4, v4 } from 'uuid';
import { BaseDrizzleAdapter } from '../base';
import { runPluginMigrations } from '../custom-migrator';
import { DIMENSION_MAP } from '../schema/embedding';
import { SqliteVecExtensionManager } from './extension-manager';
import * as sqliteSchema from './schema';

export interface BunSqliteConfig {
  filename?: string;
  inMemory?: boolean;
  vectorDimensions?: number;
  customSQLitePath?: string; // For macOS users who need to set custom SQLite path
}

/**
 * Bun SQLite adapter that provides local database functionality
 * with vector similarity search support using sqlite-vec extension (required)
 */
export class BunSqliteAdapter extends BaseDrizzleAdapter {
  declare public db: any;
  private sqliteDb: Database;
  private config: BunSqliteConfig;
  private initialized: boolean = false;
  private hasVectorSupport: boolean = false;
  constructor(agentId: UUID, config: BunSqliteConfig = {}) {
    super(agentId);

    this.config = {
      inMemory: config.inMemory ?? false,
      filename: config.filename ?? `.eliza/bun-${agentId}.db`,
      vectorDimensions: config.vectorDimensions || 1536,
      customSQLitePath: config.customSQLitePath,
    };

    // Set custom SQLite path if provided or auto-detect for macOS
    // Note: setCustomSQLite can only be called before SQLite is loaded
    if (this.config.customSQLitePath) {
      try {
        Database.setCustomSQLite(this.config.customSQLitePath);
      } catch (error: any) {
        if (error.message?.includes('SQLite already loaded')) {
          logger.debug('[BunSqliteAdapter] SQLite already loaded, cannot set custom path');
        } else {
          throw error;
        }
      }
    } else if (process.platform === 'darwin') {
      // For macOS, try common homebrew SQLite locations that support extensions
      // Following the sqlite-vec documentation recommendations
      const macOSSQLitePaths = [
        '/usr/local/opt/sqlite3/lib/libsqlite3.dylib', // sqlite3 package (recommended)
        '/opt/homebrew/opt/sqlite3/lib/libsqlite3.dylib', // sqlite3 package Apple Silicon
        '/opt/homebrew/opt/sqlite/lib/libsqlite3.dylib', // sqlite package Apple Silicon Homebrew
        '/usr/local/opt/sqlite/lib/libsqlite3.dylib', // sqlite package Intel Homebrew
        '/opt/homebrew/lib/libsqlite3.dylib',
        '/usr/local/lib/libsqlite3.dylib',
      ];

      for (const sqlitePath of macOSSQLitePaths) {
        if (fs.existsSync(sqlitePath)) {
          try {
            Database.setCustomSQLite(sqlitePath);
            logger.info(`[BunSqliteAdapter] Using custom SQLite from: ${sqlitePath}`);
            break;
          } catch (error: any) {
            if (error.message?.includes('SQLite already loaded')) {
              logger.debug(
                '[BunSqliteAdapter] SQLite already loaded, using previously set custom SQLite'
              );
              break;
            } else {
              logger.debug(
                `[BunSqliteAdapter] Failed to set custom SQLite path ${sqlitePath}:`,
                error
              );
            }
          }
        }
      }
    }

    // Create SQLite database
    const dbPath = this.config.inMemory ? ':memory:' : this.config.filename!;

    // Ensure parent directories exist for non-memory databases
    if (!this.config.inMemory && this.config.filename) {
      const dir = path.dirname(this.config.filename);
      if (!fs.existsSync(dir)) {
        try {
          fs.mkdirSync(dir, { recursive: true });
          logger.debug(`[BunSqliteAdapter] Created directory: ${dir}`);
        } catch (error) {
          logger.error(`[BunSqliteAdapter] Failed to create directory ${dir}:`, error);
          throw error;
        }
      }
    }

    this.sqliteDb = new Database(dbPath);

    // Enable foreign key constraints (disabled by default in SQLite)
    this.sqliteDb.exec('PRAGMA foreign_keys = ON');

    // Enable WAL mode for better concurrency
    if (!this.config.inMemory) {
      this.sqliteDb.exec('PRAGMA journal_mode = WAL');
    }

    // Create Drizzle instance
    this.db = drizzle(this.sqliteDb, { schema: sqliteSchema });

    // Add execute method for compatibility with schema registry
    if (!this.db.execute) {
      this.db.execute = async (query: any, providedParams?: any[]) => {
        let sqlString: string | undefined;
        let params: any[] = providedParams || [];

        if (typeof query === 'string') {
          // Handle raw SQL strings
          sqlString = query;
          // Use providedParams if available for raw SQL strings
          if (providedParams) {
            params = providedParams;
          }
        } else if (query && typeof query === 'object') {
          // Check if this is a Drizzle SQL object with toSQL method
          if (query.toSQL && typeof query.toSQL === 'function') {
            try {
              const sqlData = query.toSQL();
              sqlString = sqlData.sql;
              params = sqlData.params || [];
            } catch (e) {
              logger.debug('[BunSqliteAdapter] toSQL failed:', e);
            }
          }
          // Handle Drizzle SQL tagged template objects
          else if (query.sql && Array.isArray(query.sql)) {
            // This is a sql`` tagged template literal
            const sqlParts = query.sql;
            const values = query.values || [];

            // Build the SQL string with placeholders
            let builtSql = '';
            for (let i = 0; i < sqlParts.length; i++) {
              builtSql += sqlParts[i];
              if (i < values.length) {
                builtSql += '?';
                params.push(values[i]);
              }
            }
            sqlString = builtSql;
          }
          // Handle sql.raw() objects
          else if (query.queryChunks && Array.isArray(query.queryChunks)) {
            // sql.raw() creates queryChunks array
            sqlString = query.queryChunks
              .map((chunk: any) => {
                if (typeof chunk === 'string') return chunk;
                if (chunk && chunk.value) return chunk.value;
                return '';
              })
              .join('');
          }
          // Handle Drizzle SQL objects with getSQL method
          else if (query.getSQL && typeof query.getSQL === 'function') {
            try {
              const sqlData = query.getSQL();
              // Check if we got back a structured result
              if (sqlData && sqlData.sql) {
                sqlString = sqlData.sql;
                params = sqlData.params || [];
              } else if (typeof sqlData === 'string') {
                sqlString = sqlData;
              }
            } catch (e) {
              // If getSQL fails, try other methods
              logger.debug('[BunSqliteAdapter] getSQL failed, trying other methods');
            }
          }

          // If we still don't have SQL, try other patterns
          if (!sqlString) {
            if (query.sql && typeof query.sql === 'string') {
              sqlString = query.sql;
              params = query.params || [];
            }
          }
        }

        if (sqlString && sqlString.trim()) {
          logger.debug(
            '[BunSqliteAdapter] Executing SQL:',
            sqlString.substring(0, 200) + (sqlString.length > 200 ? '...' : '')
          );

          try {
            // Convert PostgreSQL-style parameters ($1, $2, etc.) to SQLite placeholders (?)
            let convertedSql = sqlString;
            const convertedParams = [...params];

            // Convert JavaScript types to SQLite-compatible types
            for (let i = 0; i < convertedParams.length; i++) {
              const param = convertedParams[i];

              if (param === null || param === undefined) {
                convertedParams[i] = null;
              } else if (Array.isArray(param)) {
                // Convert arrays to JSON strings for SQLite
                convertedParams[i] = JSON.stringify(param);
              } else if (typeof param === 'object' && param !== null) {
                // Convert objects to JSON strings for SQLite
                convertedParams[i] = JSON.stringify(param);
              } else if (typeof param === 'boolean') {
                // Convert boolean to number for SQLite
                convertedParams[i] = param ? 1 : 0;
              } else if (typeof param === 'bigint') {
                // Convert bigint to string for SQLite
                convertedParams[i] = param.toString();
              } else {
                // Keep primitives as-is (string, number)
                convertedParams[i] = param;
              }
            }

            // Check if we have PostgreSQL-style parameters
            if (convertedSql.includes('$')) {
              const paramMatches = convertedSql.match(/\$\d+/g);
              if (paramMatches) {
                // Create a map of parameter positions to values
                const paramMap = new Map<number, any>();
                const allParamRefs = [...paramMatches]; // Keep all references, including duplicates

                // Build parameter map from unique parameter numbers
                const uniqueParams = [...new Set(paramMatches)].sort((a, b) => {
                  const numA = parseInt(a.substring(1));
                  const numB = parseInt(b.substring(1));
                  return numA - numB;
                });

                for (const param of uniqueParams) {
                  const paramNum = parseInt(param.substring(1));
                  if (paramNum <= convertedParams.length) {
                    paramMap.set(paramNum, convertedParams[paramNum - 1]);
                  }
                }

                // Expand parameters to match the total number of references
                const expandedParams: any[] = [];
                for (const paramRef of allParamRefs) {
                  const paramNum = parseInt(paramRef.substring(1));
                  if (paramMap.has(paramNum)) {
                    expandedParams.push(paramMap.get(paramNum));
                  }
                }

                // Replace all parameter references with ? placeholders
                convertedSql = convertedSql.replace(/\$\d+/g, '?');

                // Update the parameters array to match the expanded references
                convertedParams.length = 0;
                convertedParams.push(...expandedParams);

                logger.debug('[BunSqliteAdapter] Converted PostgreSQL params to SQLite:', {
                  original: sqlString.substring(0, 200),
                  converted: convertedSql.substring(0, 200),
                  originalParamCount: params.length,
                  expandedParamCount: expandedParams.length,
                });
              }
            }

            // For SQLite, we use prepare().all() for all queries
            const stmt = this.sqliteDb.prepare(convertedSql);
            const results = convertedParams.length > 0 ? stmt.all(...convertedParams) : stmt.all();

            // Ensure consistent result format for compatibility
            return {
              rows: results,
              rowCount: results.length,
            } as any;
          } catch (error: any) {
            logger.error('[BunSqliteAdapter] SQL execution failed:', {
              error: error.message,
              sql: sqlString.substring(0, 500),
              params: params,
            });
            throw error;
          }
        }

        logger.error('[BunSqliteAdapter] Invalid query:', {
          type: typeof query,
          keys: query ? Object.keys(query) : null,
          queryChunks: query?.queryChunks?.length,
          queryChunksContent: query?.queryChunks ? query.queryChunks.slice(0, 2) : null,
          hasGetSQL: query?.getSQL !== undefined,
        });
        throw new Error('Invalid query type for execute');
      };
    }

    logger.info(`[BunSqliteAdapter] Created for agent ${agentId}`, {
      inMemory: this.config.inMemory,
      filename: this.config.filename,
    });
  }

  async init(): Promise<void> {
    if (this.initialized) {
      logger.debug('[BunSqliteAdapter] Already initialized, skipping');
      return;
    }

    logger.info('[BunSqliteAdapter] Initializing...');

    try {
      // Initialize vector support
      await this.initializeVectorSupport();

      // Skip PostgreSQL migrations - BunSqlite creates tables directly
      logger.info('[BunSqliteAdapter] Skipping PostgreSQL migrations, using direct table creation');

      // Create all SQLite tables directly using our schema
      await this.createSqliteTables();

      // Note: Plugin-specific tables will be created later via runPluginMigrations
      // when the runtime processes plugins with schemas

      // Mark as initialized before calling methods that require withDatabase
      this.initialized = true;

      // Set embedding dimension - skip for now to avoid query issues
      if (this.config.vectorDimensions) {
        // await this.ensureEmbeddingDimension(this.config.vectorDimensions);
        // For now, just set the dimension directly
        const dimensionKey = Object.keys(VECTOR_DIMS).find(
          (key) => VECTOR_DIMS[key as keyof typeof VECTOR_DIMS] === this.config.vectorDimensions
        );
        if (dimensionKey) {
          this.embeddingDimension =
            DIMENSION_MAP[this.config.vectorDimensions as keyof typeof DIMENSION_MAP];
        }
      }

      logger.info('[BunSqliteAdapter] Initialization complete');
    } catch (error) {
      logger.error('[BunSqliteAdapter] Initialization failed:', error);
      // Reset initialized flag on error
      this.initialized = false;
      throw error;
    }
  }

  /**
   * Initialize vector support using sqlite-vec extension (required)
   */
  private async initializeVectorSupport(): Promise<void> {
    try {
      logger.info('[BunSqliteAdapter] Loading sqlite-vec extension...');

      // First, try the standard sqlite-vec.load() method
      let loadSuccess = false;

      try {
        if (sqliteVec && typeof sqliteVec.load === 'function') {
          sqliteVec.load(this.sqliteDb);
          loadSuccess = true;
          logger.debug('[BunSqliteAdapter] sqlite-vec loaded using standard method');
        }
      } catch (standardError: any) {
        logger.debug(
          '[BunSqliteAdapter] Standard sqlite-vec.load() failed:',
          standardError.message
        );
      }

      // If standard method failed, try manual extension loading
      if (!loadSuccess) {
        logger.info('[BunSqliteAdapter] Attempting manual extension loading...');

        // Ensure extension is available locally
        const extensionPath = await SqliteVecExtensionManager.ensureExtensionAvailable();

        if (!extensionPath) {
          throw new Error('sqlite-vec extension not found for current platform');
        }

        try {
          // Try loading the extension manually
          this.sqliteDb.loadExtension(extensionPath);
          loadSuccess = true;
          logger.info(`[BunSqliteAdapter] sqlite-vec loaded manually from: ${extensionPath}`);
        } catch (manualError: any) {
          logger.error('[BunSqliteAdapter] Manual extension loading failed:', manualError.message);
          throw new Error(`Failed to load sqlite-vec extension: ${manualError.message}`);
        }
      }

      // Verify it loaded correctly by calling vec_version()
      const versionResult = this.sqliteDb.prepare('SELECT vec_version() as version').get() as any;

      if (versionResult && versionResult.version) {
        logger.info(
          `[BunSqliteAdapter] ✅ sqlite-vec loaded successfully! Version: ${versionResult.version}`
        );
        this.hasVectorSupport = true;

        // Create vector tables for supported dimensions
        await this.createVectorTable();

        return;
      } else {
        throw new Error('sqlite-vec loaded but vec_version() function not available');
      }
    } catch (loadError: any) {
      logger.error('[BunSqliteAdapter] Failed to load sqlite-vec extension:', {
        error: loadError.message,
        platform: process.platform,
        customSQLiteSet: !!this.config.customSQLitePath,
      });

      // Provide more detailed error information for Mac users
      let errorDetails = '';
      if (process.platform === 'darwin') {
        errorDetails =
          '\n\nFor macOS users:\n' +
          '1. Install SQLite with extension support: brew install sqlite3\n' +
          '2. Verify installation: ls /usr/local/opt/sqlite3/lib/libsqlite3.dylib\n' +
          '3. sqlite-vec is already installed in this project\n' +
          '4. Restart your terminal and try again\n' +
          '5. If issues persist, check: ls node_modules/sqlite-vec/';
      } else {
        errorDetails =
          '\n\nTo fix this:\n' +
          '1. Install SQLite with extension support\n' +
          '2. sqlite-vec is already installed in this project\n' +
          '3. Consider using PostgreSQL with pgvector for production environments';
      }

      throw new Error(
        `[BunSqliteAdapter] sqlite-vec extension is required for vector operations. ` +
          `Error: ${loadError.message}.${errorDetails}`
      );
    }
  }

  /**
   * Check if SQLite supports extensions
   */
  private checkExtensionSupport(): boolean {
    try {
      // First check if we have the loadExtension method
      if (!this.sqliteDb.loadExtension || typeof this.sqliteDb.loadExtension !== 'function') {
        logger.debug('[BunSqliteAdapter] SQLite database does not have loadExtension method');
        return false;
      }

      // Try to check compile options for OMIT_LOAD_EXTENSION
      try {
        // Check all compile options
        let i = 0;
        let hasOmitLoadExtension = false;

        while (i < 100) {
          // Check up to 100 options (SQLite usually has fewer)
          try {
            const result = this.sqliteDb
              .prepare(`SELECT sqlite_compileoption_get(${i}) as opt`)
              .get() as any;

            if (!result || !result.opt) break; // No more options

            if (result.opt === 'OMIT_LOAD_EXTENSION') {
              hasOmitLoadExtension = true;
              break;
            }
            i++;
          } catch {
            break; // No more options
          }
        }

        if (hasOmitLoadExtension) {
          logger.debug(
            '[BunSqliteAdapter] SQLite compiled with OMIT_LOAD_EXTENSION - extensions disabled'
          );
          return false;
        }

        logger.debug('[BunSqliteAdapter] SQLite supports extensions');
        return true;
      } catch (error) {
        // If we can't check compile options, try a different approach
        // Check if the SQLite version supports extensions (3.33.0+)
        try {
          const versionResult = this.sqliteDb
            .prepare('SELECT sqlite_version() as version')
            .get() as any;
          if (versionResult && versionResult.version) {
            const version = versionResult.version;
            const [major, minor] = version.split('.').map(Number);
            // SQLite 3.33.0+ has better extension support
            if (major > 3 || (major === 3 && minor >= 33)) {
              logger.debug(
                `[BunSqliteAdapter] SQLite version ${version} should support extensions`
              );
              return true;
            }
          }
        } catch {
          // Fallback if version check fails
        }

        // Default to assuming extensions are supported if we have the method
        return true;
      }
    } catch (error) {
      logger.debug('[BunSqliteAdapter] Error checking extension support:', error);
      return false;
    }
  }

  /**
   * Create vector tables for sqlite-vec
   */
  private async createVectorTable(): Promise<void> {
    try {
      // Create virtual tables using vec0 module for each dimension we support
      const dimensions = [384, 512, 768, 1024, 1536, 3072];

      for (const dim of dimensions) {
        const tableName = `vec_embeddings_${dim}`;
        try {
          // Create a virtual table using vec0
          await this.sqliteDb.exec(`
            CREATE VIRTUAL TABLE IF NOT EXISTS ${tableName} USING vec0(
              embedding float[${dim}]
            )
          `);
          logger.debug(`[BunSqliteAdapter] Created vec0 virtual table: ${tableName}`);
        } catch (createError) {
          logger.error(
            `[BunSqliteAdapter] Failed to create vec0 virtual table ${tableName}:`,
            createError
          );
          throw new Error(
            `Failed to create vec0 virtual table ${tableName}. ` +
              `This likely means sqlite-vec is not properly loaded. Error: ${(createError as Error).message}`
          );
        }
      }

      logger.info('[BunSqliteAdapter] Vector tables created successfully');
    } catch (error) {
      logger.error('[BunSqliteAdapter] Failed to create vector tables:', error);
      throw error;
    }
  }

  /**
   * Create all SQLite tables using schema definitions
   */
  private async createSqliteTables(): Promise<void> {
    try {
      logger.info('[BunSqliteAdapter] Creating SQLite tables...');

      // Define all table creation SQL statements using SQLite syntax
      const tableCreationStatements = [
        // Agents table
        `CREATE TABLE IF NOT EXISTS agents (
          id TEXT PRIMARY KEY,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now')),
          name TEXT NOT NULL,
          username TEXT,
          bio TEXT NOT NULL,
          system TEXT,
          topics TEXT DEFAULT '[]',
          knowledge TEXT DEFAULT '[]',
          message_examples TEXT DEFAULT '[]',
          post_examples TEXT DEFAULT '[]',
          style TEXT DEFAULT '{}',
          enabled INTEGER DEFAULT 1,
          status TEXT DEFAULT 'active',
          settings TEXT DEFAULT '{}',
          plugins TEXT DEFAULT '[]'
        )`,

        // Cache table
        `CREATE TABLE IF NOT EXISTS cache (
          key TEXT NOT NULL,
          agent_id TEXT NOT NULL,
          value TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          expires_at TEXT,
          PRIMARY KEY (key, agent_id)
        )`,

        // Entities table
        `CREATE TABLE IF NOT EXISTS entities (
          id TEXT PRIMARY KEY,
          agent_id TEXT NOT NULL,
          names TEXT NOT NULL DEFAULT '[]',
          metadata TEXT DEFAULT '{}',
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        )`,

        // Rooms table
        `CREATE TABLE IF NOT EXISTS rooms (
          id TEXT PRIMARY KEY,
          name TEXT,
          agent_id TEXT,
          source TEXT NOT NULL,
          type TEXT NOT NULL,
          channel_id TEXT,
          server_id TEXT,
          world_id TEXT,
          metadata TEXT DEFAULT '{}',
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        )`,

        // Memories table
        `CREATE TABLE IF NOT EXISTS memories (
          id TEXT PRIMARY KEY,
          type TEXT NOT NULL,
          entity_id TEXT,
          agent_id TEXT NOT NULL,
          room_id TEXT,
          world_id TEXT,
          content TEXT NOT NULL,
          \`unique\` INTEGER DEFAULT 0,
          metadata TEXT DEFAULT '{}',
          embedding TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )`,

        // Embeddings table
        `CREATE TABLE IF NOT EXISTS embeddings (
          id TEXT PRIMARY KEY,
          memory_id TEXT NOT NULL,
          dim_384 TEXT,
          dim_512 TEXT,
          dim_768 TEXT,
          dim_1024 TEXT,
          dim_1536 TEXT,
          dim_3072 TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )`,

        // Relationships table
        `CREATE TABLE IF NOT EXISTS relationships (
          id TEXT PRIMARY KEY,
          source_entity_id TEXT NOT NULL,
          target_entity_id TEXT NOT NULL,
          agent_id TEXT NOT NULL,
          tags TEXT NOT NULL DEFAULT '[]',
          metadata TEXT DEFAULT '{}',
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now')),
          relationship_type TEXT,
          strength INTEGER,
          last_interaction_at TEXT,
          next_follow_up_at TEXT
        )`,

        // Participants table
        `CREATE TABLE IF NOT EXISTS participants (
          id TEXT PRIMARY KEY,
          entity_id TEXT NOT NULL,
          room_id TEXT NOT NULL,
          agent_id TEXT NOT NULL,
          room_state TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        )`,

        // Worlds table
        `CREATE TABLE IF NOT EXISTS worlds (
          id TEXT PRIMARY KEY,
          name TEXT,
          agent_id TEXT NOT NULL,
          server_id TEXT NOT NULL,
          metadata TEXT DEFAULT '{}',
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        )`,

        // Tasks table
        `CREATE TABLE IF NOT EXISTS tasks (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          agent_id TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'new',
          type TEXT NOT NULL DEFAULT 'task',
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now')),
          metadata TEXT DEFAULT '{}',
          description TEXT,
          room_id TEXT,
          world_id TEXT,
          entity_id TEXT,
          tags TEXT DEFAULT '[]'
        )`,

        // Todos table (for plugin-todo) - matches plugin schema
        `CREATE TABLE IF NOT EXISTS todos (
          id TEXT PRIMARY KEY,
          agent_id TEXT NOT NULL,
          world_id TEXT NOT NULL,
          room_id TEXT NOT NULL,
          entity_id TEXT NOT NULL,
          name TEXT NOT NULL,
          description TEXT,
          type TEXT NOT NULL,
          priority INTEGER DEFAULT 4,
          is_urgent INTEGER DEFAULT 0,
          is_completed INTEGER DEFAULT 0,
          due_date TEXT,
          completed_at TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now')),
          metadata TEXT DEFAULT '{}'
        )`,

        // Goals table (for plugin-goals) - matches plugin schema
        `CREATE TABLE IF NOT EXISTS goals (
          id TEXT PRIMARY KEY,
          agent_id TEXT NOT NULL,
          owner_type TEXT NOT NULL,
          owner_id TEXT NOT NULL,
          name TEXT NOT NULL,
          description TEXT,
          is_completed INTEGER DEFAULT 0,
          completed_at TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now')),
          metadata TEXT DEFAULT '{}'
        )`,

        // NOTE: Trust plugin tables are now dynamically created by plugin-trust schema
        // via the dynamic migrator - no hardcoded trust tables needed here

        // Components table
        `CREATE TABLE IF NOT EXISTS components (
          id TEXT PRIMARY KEY,
          entity_id TEXT NOT NULL,
          agent_id TEXT NOT NULL,
          room_id TEXT,
          world_id TEXT,
          source_entity_id TEXT,
          type TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now')),
          data TEXT DEFAULT '{}'
        )`,

        // Logs table
        `CREATE TABLE IF NOT EXISTS logs (
          id TEXT PRIMARY KEY,
          entity_id TEXT NOT NULL,
          room_id TEXT,
          agent_id TEXT NOT NULL,
          body TEXT NOT NULL DEFAULT '{}',
          type TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        )`,

        // Message servers table
        `CREATE TABLE IF NOT EXISTS message_servers (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          source_type TEXT NOT NULL,
          source_id TEXT,
          metadata TEXT DEFAULT '{}',
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        )`,

        // Channels table
        `CREATE TABLE IF NOT EXISTS channels (
          id TEXT PRIMARY KEY,
          server_id TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now')),
          name TEXT NOT NULL,
          type TEXT NOT NULL,
          source_type TEXT,
          source_id TEXT,
          topic TEXT,
          metadata TEXT DEFAULT '{}'
        )`,

        // Messages table
        `CREATE TABLE IF NOT EXISTS messages (
          id TEXT PRIMARY KEY,
          channel_id TEXT NOT NULL,
          author_id TEXT NOT NULL,
          content TEXT NOT NULL,
          raw_message TEXT,
          source_type TEXT,
          source_id TEXT,
          metadata TEXT,
          in_reply_to_root_message_id TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        )`,

        // Channel participants table
        `CREATE TABLE IF NOT EXISTS channel_participants (
          channel_id TEXT NOT NULL,
          user_id TEXT NOT NULL
        )`,

        // Todo tags table (for plugin-todo) - matches plugin schema
        `CREATE TABLE IF NOT EXISTS todo_tags (
          id TEXT PRIMARY KEY,
          todo_id TEXT NOT NULL,
          tag TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )`,

        // Goal tags table (for plugin-goals) - matches plugin schema
        `CREATE TABLE IF NOT EXISTS goal_tags (
          id TEXT PRIMARY KEY,
          goal_id TEXT NOT NULL,
          tag TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )`,

        // Server agents table
        `CREATE TABLE IF NOT EXISTS server_agents (
          server_id TEXT NOT NULL,
          agent_id TEXT NOT NULL
        )`,
      ];

      // Execute all table creation statements
      for (let i = 0; i < tableCreationStatements.length; i++) {
        const statement = tableCreationStatements[i];
        try {
          // Log the statement being executed
          const tableName = statement.match(/CREATE TABLE IF NOT EXISTS (\w+)/)?.[1] || 'unknown';
          logger.info(`[BunSqliteAdapter] Creating table: ${tableName}`);

          await this.sqliteDb.exec(statement);
          logger.debug(`[BunSqliteAdapter] Successfully created table: ${tableName}`);
        } catch (error) {
          const tableName = statement.match(/CREATE TABLE IF NOT EXISTS (\w+)/)?.[1] || 'unknown';
          logger.error(`[BunSqliteAdapter] Failed to create table ${tableName}:`, {
            error: error instanceof Error ? error.message : String(error),
            statement: statement.substring(0, 200) + (statement.length > 200 ? '...' : ''),
          });
          throw error;
        }
      }

      logger.info('[BunSqliteAdapter] All SQLite tables created successfully');
    } catch (error) {
      logger.error('[BunSqliteAdapter] Failed to create SQLite tables:', error);
      throw error;
    }
  }

  /**
   * Search memories using sqlite-vec extension
   */
  async searchMemoriesByEmbedding(
    embedding: number[],
    params: {
      match_threshold?: number;
      count?: number;
      roomId?: UUID;
      worldId?: UUID;
      entityId?: UUID;
      unique?: boolean;
      tableName: string;
    }
  ): Promise<Memory[]> {
    const {
      match_threshold = 0.8,
      count = 10,
      roomId,
      worldId,
      entityId,
      unique = false,
      tableName,
    } = params;

    if (!this.hasVectorSupport) {
      throw new Error(
        '[BunSqliteAdapter] Vector search requested but sqlite-vec is not loaded. ' +
          'Cannot perform similarity search without vector extension.'
      );
    }

    const vecTableName = `vec_embeddings_${embedding.length}`;

    // Check if the vector table exists, create it if it doesn't
    const tableExists = this.sqliteDb
      .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`)
      .get(vecTableName);

    if (!tableExists) {
      // If the table doesn't exist and we're here, it means sqlite-vec is loaded
      // but the table for this dimension hasn't been created yet
      logger.debug(
        `[BunSqliteAdapter] Creating vec0 virtual table for dimension ${embedding.length}`
      );
      try {
        await this.sqliteDb.exec(`
          CREATE VIRTUAL TABLE IF NOT EXISTS ${vecTableName} USING vec0(
            embedding float[${embedding.length}]
          )
        `);
        logger.debug(`[BunSqliteAdapter] Created vec0 virtual table: ${vecTableName}`);
      } catch (error) {
        logger.error(
          `[BunSqliteAdapter] Failed to create vec0 virtual table ${vecTableName}:`,
          error
        );
        throw new Error(
          `Vec0 virtual table ${vecTableName} does not exist and could not be created. Error: ${(error as Error).message}`
        );
      }
    }

    // Use sqlite-vec for similarity search
    const embeddingFloat32 = new Float32Array(embedding);

    // Build the SQL query using sqlite-vec functions
    let query = `
      SELECT 
        m.*,
        1 - vec_distance_cosine(v.embedding, ?) as similarity
      FROM memories m
      JOIN ${vecTableName} v ON v.rowid = m.ROWID
      WHERE m.type = ?
        AND m.agent_id = ?
        AND 1 - vec_distance_cosine(v.embedding, ?) >= ?
    `;

    const queryParams: any[] = [
      embeddingFloat32,
      tableName,
      this.agentId,
      embeddingFloat32,
      match_threshold,
    ];

    if (roomId) {
      query += ' AND m.room_id = ?';
      queryParams.push(roomId);
    }

    if (worldId) {
      query += ' AND m.world_id = ?';
      queryParams.push(worldId);
    }

    if (entityId) {
      query += ' AND m.entity_id = ?';
      queryParams.push(entityId);
    }

    if (unique) {
      query += ' AND m.unique = 1';
    }

    query += ' ORDER BY similarity DESC LIMIT ?';
    queryParams.push(count);

    const results = this.sqliteDb.prepare(query).all(...queryParams);

    return results.map((row: any) =>
      this.mapMemoryRow({
        ...row,
        similarity: row.similarity,
      })
    );
  }

  /**
   * JSON-based vector search fallback when sqlite-vec is not available
   */

  async createMemory(memory: Memory, tableName: string): Promise<UUID> {
    const memoryId = memory.id || (uuidv4() as UUID);

    return this.withDatabase(async () => {
      // Check if memory already exists
      const existing = await this.getMemoryById(memoryId);
      if (existing) {
        logger.debug('Memory already exists, skipping creation:', { memoryId });
        return memoryId;
      }

      let isUnique = memory.unique ?? false;

      // Check for similar memories if embedding provided
      if (memory.embedding && Array.isArray(memory.embedding) && !isUnique) {
        const similarMemories = await this.searchMemoriesByEmbedding(memory.embedding, {
          roomId: memory.roomId,
          worldId: memory.worldId,
          entityId: memory.entityId,
          match_threshold: 0.95,
          count: 1,
          tableName,
        });
        isUnique = similarMemories.length === 0;
      }

      // Use transaction for consistency
      await this.db.transaction(async (_tx: any) => {
        // Insert memory using prepared statement for SQLite
        const insertSql = `
          INSERT INTO memories (
            id, type, entity_id, agent_id, room_id, world_id,
            content, \`unique\`, metadata, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const params = [
          memoryId,
          tableName,
          memory.entityId,
          memory.agentId || this.agentId,
          memory.roomId,
          memory.worldId || null,
          JSON.stringify(memory.content),
          isUnique ? 1 : 0,
          JSON.stringify(memory.metadata || {}),
          memory.createdAt ? new Date(memory.createdAt).toISOString() : new Date().toISOString(),
        ];

        await this.sqliteDb.prepare(insertSql).run(...params);

        // Store embedding
        if (memory.embedding && Array.isArray(memory.embedding)) {
          if (!this.hasVectorSupport) {
            throw new Error(
              '[BunSqliteAdapter] Cannot store embedding - sqlite-vec is not loaded. ' +
                'Vector extension is required for embedding storage.'
            );
          } else {
            // Use sqlite-vec extension
            const vecTableName = `vec_embeddings_${memory.embedding.length}`;

            // Ensure vector table exists for this dimension
            const tableExists = this.sqliteDb
              .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`)
              .get(vecTableName);

            if (!tableExists) {
              logger.debug(
                `[BunSqliteAdapter] Creating vec0 virtual table for dimension ${memory.embedding.length}`
              );
              await this.sqliteDb.exec(`
                CREATE VIRTUAL TABLE IF NOT EXISTS ${vecTableName} USING vec0(
                  embedding float[${memory.embedding.length}]
                )
              `);
              logger.debug(`[BunSqliteAdapter] Created vec0 virtual table: ${vecTableName}`);
            }

            // Get the rowid of the inserted memory
            // First, get the ROWID from the main table based on the UUID
            const memoryRow = this.sqliteDb
              .prepare(`SELECT ROWID FROM memories WHERE id = ?`)
              .get(memoryId) as any;

            if (memoryRow) {
              // Store in sqlite-vec table using the ROWID
              const embeddingFloat32 = new Float32Array(memory.embedding);

              await this.sqliteDb
                .prepare(`INSERT OR REPLACE INTO ${vecTableName} (rowid, embedding) VALUES (?, ?)`)
                .run(memoryRow.ROWID, embeddingFloat32);
            }
          }
        }
      });

      return memoryId;
    });
  }

  protected async withDatabase<T>(operation: () => Promise<T>): Promise<T> {
    if (!this.initialized) {
      throw new Error('BunSqliteAdapter not initialized. Call init() first.');
    }
    return operation();
  }

  async isReady(): Promise<boolean> {
    try {
      if (!this.initialized || !this.sqliteDb) {
        return false;
      }

      // Test basic query
      const result = this.sqliteDb.prepare('SELECT 1 as test').get() as
        | { test: number }
        | undefined;
      return result?.test === 1;
    } catch (error) {
      logger.error('[BunSqliteAdapter] Ready check failed:', error);
      return false;
    }
  }

  async close(): Promise<void> {
    logger.info('[BunSqliteAdapter] Closing...');

    try {
      if (this.sqliteDb) {
        this.sqliteDb.close();
      }
      this.initialized = false;
      logger.info('[BunSqliteAdapter] Closed successfully');
    } catch (error) {
      logger.error('[BunSqliteAdapter] Error during close:', error);
      throw error;
    }
  }

  protected async listTables(): Promise<string[]> {
    try {
      const tables = this.sqliteDb
        .prepare(
          `
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
        ORDER BY name
      `
        )
        .all();

      return tables.map((t: any) => t.name);
    } catch (error) {
      logger.error('[BunSqliteAdapter] Failed to list tables:', error);
      return [];
    }
  }

  // Override methods that need SQLite-specific handling
  async getConnection() {
    return this.sqliteDb;
  }

  /**
   * Get the Drizzle database instance
   */
  getDatabase() {
    return this.db;
  }

  async query(sqlQuery: string, params?: any[]): Promise<any[]> {
    try {
      const stmt = this.sqliteDb.prepare(sqlQuery);
      return params ? stmt.all(...params) : stmt.all();
    } catch (error) {
      logger.error('[BunSqliteAdapter] Query failed:', error);
      throw error;
    }
  }

  /**
   * Override mapMemoryRow to handle SQLite-specific data types and readonly objects
   */
  protected mapMemoryRow(row: any): Memory {
    const metadata = row.metadata
      ? typeof row.metadata === 'string'
        ? JSON.parse(row.metadata)
        : row.metadata
      : {};

    // Add type to metadata if not already present
    if (row.type && !metadata.type) {
      metadata.type = row.type;
    }

    // Handle cases where created_at might be undefined
    let createdAt: number;
    const rawCreatedAt = row.created_at || row.createdAt;

    if (rawCreatedAt) {
      // If created_at exists, use it
      createdAt =
        rawCreatedAt instanceof Date ? rawCreatedAt.getTime() : new Date(rawCreatedAt).getTime();
    } else {
      // If created_at is missing, use current time and log a warning
      logger.warn('[BunSqliteAdapter] Memory row missing created_at field, using current time', {
        memoryId: row.id,
        rowKeys: Object.keys(row),
      });
      createdAt = Date.now();
    }

    return {
      id: row.id as UUID,
      createdAt,
      content: typeof row.content === 'string' ? JSON.parse(row.content) : row.content,
      entityId: row.entity_id || row.entityId,
      agentId: row.agent_id || row.agentId,
      roomId: row.room_id || row.roomId,
      worldId: row.world_id || row.worldId,
      unique: Boolean(row.unique),
      metadata,
      embedding: row.embedding,
      similarity: row.similarity,
    };
  }

  /**
   * Run database migrations
   */
  async runMigrations(): Promise<void> {
    // Migrations are handled by runPluginMigrations during init
    logger.info('[BunSqliteAdapter] Migrations handled by runPluginMigrations during init');
  }

  /**
   * Run plugin-specific migrations for schema registration
   */
  async runPluginMigrations(schema: unknown, pluginName: string): Promise<void> {
    logger.info(`[BunSqliteAdapter] Running migrations for plugin: ${pluginName}`);

    if (!schema || typeof schema !== 'object') {
      logger.debug(`[BunSqliteAdapter] No schema provided for plugin: ${pluginName}`);
      return;
    }

    try {
      // Use the comprehensive migration system from custom-migrator
      await runPluginMigrations(this.db, pluginName, schema);
      logger.info(`[BunSqliteAdapter] Successfully migrated schema for plugin: ${pluginName}`);
    } catch (error) {
      logger.error(`[BunSqliteAdapter] Failed to migrate schema for plugin ${pluginName}:`, error);
      throw error;
    }
  }

  /**
   * Override getWorld to handle SQLite date format
   */
  async getWorld(worldId: UUID): Promise<World | null> {
    return this.withDatabase(async () => {
      try {
        const query = 'SELECT * FROM worlds WHERE id = ? LIMIT 1';
        const row = this.sqliteDb.prepare(query).get(worldId) as any;

        if (!row) {
          return null;
        }

        return {
          id: row.id,
          name: row.name,
          agentId: row.agent_id,
          serverId: row.server_id,
          metadata: row.metadata ? JSON.parse(row.metadata) : {},
          createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
          updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : undefined,
        };
      } catch (error) {
        logger.error('[BunSqliteAdapter] Failed to get world:', error);
        return null;
      }
    });
  }

  /**
   * Override getAllWorlds to handle SQLite date format
   */
  async getAllWorlds(): Promise<World[]> {
    return this.withDatabase(async () => {
      try {
        const query = 'SELECT * FROM worlds';
        const rows = this.sqliteDb.prepare(query).all();

        return rows.map((row: any) => ({
          id: row.id,
          name: row.name,
          agentId: row.agent_id,
          serverId: row.server_id,
          metadata: row.metadata ? JSON.parse(row.metadata) : {},
          createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
          updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : undefined,
        }));
      } catch (error) {
        logger.error('[BunSqliteAdapter] Failed to get all worlds:', error);
        return [];
      }
    });
  }

  /**
   * Get all worlds for the agent
   */
  async getWorlds(params?: { serverId?: string }): Promise<World[]> {
    return this.withDatabase(async () => {
      try {
        let query = 'SELECT * FROM worlds WHERE agent_id = ?';
        const queryParams: any[] = [this.agentId];

        if (params?.serverId) {
          query += ' AND server_id = ?';
          queryParams.push(params.serverId);
        }

        const rows = this.sqliteDb.prepare(query).all(...queryParams);
        return rows.map((row: any) => ({
          id: row.id,
          name: row.name,
          agentId: row.agent_id,
          serverId: row.server_id,
          metadata: row.metadata ? JSON.parse(row.metadata) : {},
          createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
          updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : undefined,
        }));
      } catch (error) {
        logger.error('[BunSqliteAdapter] Failed to get worlds:', error);
        return [];
      }
    });
  }

  /**
   * Override getRoom to handle SQLite date format
   */
  async getRoom(roomId: UUID): Promise<Room | null> {
    return this.withDatabase(async () => {
      try {
        const query = 'SELECT * FROM rooms WHERE id = ? LIMIT 1';
        const row = this.sqliteDb.prepare(query).get(roomId) as any;

        if (!row) {
          return null;
        }

        return {
          id: row.id,
          name: row.name,
          agentId: row.agent_id,
          source: row.source,
          type: row.type,
          channelId: row.channel_id,
          serverId: row.server_id,
          worldId: row.world_id,
          metadata: row.metadata ? JSON.parse(row.metadata) : {},
          createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
          updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : undefined,
        };
      } catch (error) {
        logger.error('[BunSqliteAdapter] Failed to get room:', error);
        return null;
      }
    });
  }

  /**
   * Override getRooms to handle SQLite date format
   */
  async getRooms(worldId?: UUID): Promise<Room[]> {
    return this.withDatabase(async () => {
      try {
        let query = 'SELECT * FROM rooms';
        const queryParams: any[] = [];

        if (worldId) {
          query += ' WHERE world_id = ?';
          queryParams.push(worldId);
        }

        const rows = this.sqliteDb.prepare(query).all(...queryParams);

        return rows.map((row: any) => ({
          id: row.id,
          name: row.name,
          agentId: row.agent_id,
          source: row.source,
          type: row.type,
          channelId: row.channel_id,
          serverId: row.server_id,
          worldId: row.world_id,
          metadata: row.metadata ? JSON.parse(row.metadata) : {},
          createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
          updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : undefined,
        }));
      } catch (error) {
        logger.error('[BunSqliteAdapter] Failed to get rooms:', error);
        return [];
      }
    });
  }

  /**
   * Override getAgent to properly handle UUID queries in SQLite
   */
  async getAgent(agentId: UUID): Promise<Agent | null> {
    return this.withDatabase(async () => {
      try {
        // Use parameterized query for SQLite
        const result = this.sqliteDb
          .prepare(
            `
          SELECT * FROM agents WHERE id = ? LIMIT 1
        `
          )
          .all(agentId);

        if (result.length === 0) {
          return null;
        }

        const row = result[0] as any;

        // Parse JSON fields
        const settings =
          typeof row.settings === 'string' ? JSON.parse(row.settings) : row.settings || {};
        const plugins =
          typeof row.plugins === 'string' ? JSON.parse(row.plugins) : row.plugins || [];
        const topics = typeof row.topics === 'string' ? JSON.parse(row.topics) : row.topics || [];
        const knowledge =
          typeof row.knowledge === 'string' ? JSON.parse(row.knowledge) : row.knowledge || [];
        const messageExamples =
          typeof row.message_examples === 'string'
            ? JSON.parse(row.message_examples)
            : row.message_examples || [];
        const postExamples =
          typeof row.post_examples === 'string'
            ? JSON.parse(row.post_examples)
            : row.post_examples || [];
        const style = typeof row.style === 'string' ? JSON.parse(row.style) : row.style || {};

        return {
          id: row.id as UUID,
          name: row.name,
          username: row.username || '',
          bio: row.bio || '',
          system: row.system || undefined,
          enabled: row.enabled !== undefined ? row.enabled : true,
          status: row.status,
          settings,
          plugins,
          topics,
          knowledge,
          messageExamples,
          postExamples,
          style,
          createdAt: row.created_at
            ? row.created_at instanceof Date
              ? row.created_at.getTime()
              : new Date(row.created_at).getTime()
            : Date.now(),
          updatedAt: row.updated_at
            ? row.updated_at instanceof Date
              ? row.updated_at.getTime()
              : new Date(row.updated_at).getTime()
            : undefined,
        };
      } catch (error) {
        // Handle case where agents table doesn't exist yet (during initialization)
        if (
          error instanceof Error &&
          (error.message.includes('relation "agents" does not exist') ||
            error.message.includes('no such table: agents') ||
            error.message.includes("doesn't exist") ||
            (error.message.includes('Failed query') && error.message.includes('from "agents"')))
        ) {
          logger.warn('Agents table not yet created, returning null for getAgent');
          return null;
        }
        throw error;
      }
    });
  }

  /**
   * Override createAgent to handle JSON serialization for SQLite
   */
  async createAgent(agent: Agent | Partial<Agent>): Promise<boolean> {
    return this.withDatabase(async () => {
      try {
        if (!agent.id) {
          throw new Error('Agent ID is required');
        }

        const agentData = {
          id: agent.id,
          name: agent.name || 'Unnamed Agent',
          bio: Array.isArray(agent.bio)
            ? agent.bio.join('\n')
            : agent.bio || 'A helpful AI assistant.',
          system: agent.system || 'You are a helpful assistant.',
          settings: JSON.stringify(agent.settings || {}),
          enabled: agent.enabled !== undefined ? (agent.enabled ? 1 : 0) : 1,
          status: agent.status || 'active',
          topics: JSON.stringify(agent.topics || []),
          knowledge: JSON.stringify(agent.knowledge || []),
          messageExamples: JSON.stringify(agent.messageExamples || []),
          postExamples: JSON.stringify(agent.postExamples || []),
          style: JSON.stringify(agent.style || {}),
          plugins: JSON.stringify(agent.plugins || []),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const query = `
          INSERT INTO agents (
            id, name, bio, system, settings, enabled, status,
            topics, knowledge, message_examples, post_examples,
            style, plugins, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        this.sqliteDb
          .prepare(query)
          .run(
            agentData.id,
            agentData.name,
            agentData.bio,
            agentData.system,
            agentData.settings,
            agentData.enabled,
            agentData.status,
            agentData.topics,
            agentData.knowledge,
            agentData.messageExamples,
            agentData.postExamples,
            agentData.style,
            agentData.plugins,
            agentData.created_at,
            agentData.updated_at
          );

        logger.debug('[BunSqliteAdapter] Agent created successfully:', agent.id);
        return true;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        logger.error('[BunSqliteAdapter] Failed to create agent:', {
          error: errorMessage,
          agentId: agent.id,
        });
        throw error;
      }
    });
  }

  /**
   * Override createRooms to handle JSON serialization for SQLite
   */
  async createRooms(rooms: Room[]): Promise<UUID[]> {
    return this.withDatabase(async () => {
      const insertedIds: UUID[] = [];

      for (const room of rooms) {
        try {
          const roomId = room.id || v4();
          const roomData = {
            id: roomId,
            name: room.name || null,
            channel_id: room.channelId || null,
            agent_id: room.agentId || this.agentId,
            server_id: room.serverId || null,
            world_id: room.worldId || null,
            type: room.type,
            source: room.source,
            metadata: room.metadata ? JSON.stringify(room.metadata) : '{}',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          const query = `
            INSERT INTO rooms (
              id, name, channel_id, agent_id, server_id, 
              world_id, type, source, metadata, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO NOTHING
          `;

          this.sqliteDb
            .prepare(query)
            .run(
              roomData.id,
              roomData.name,
              roomData.channel_id,
              roomData.agent_id,
              roomData.server_id,
              roomData.world_id,
              roomData.type,
              roomData.source,
              roomData.metadata,
              roomData.created_at,
              roomData.updated_at
            );

          insertedIds.push(roomId as UUID);
        } catch (error) {
          logger.error('[BunSqliteAdapter] Failed to create room:', {
            error: error instanceof Error ? error.message : String(error),
            room,
          });
          throw error;
        }
      }

      return insertedIds;
    });
  }

  /**
   * Override getMemoryById to properly handle readonly metadata objects
   */
  async getMemoryById(id: UUID): Promise<Memory | null> {
    return this.withDatabase(async () => {
      try {
        // First get the memory
        const memoryQuery = `SELECT * FROM memories WHERE id = ? LIMIT 1`;
        const memoryRow = this.sqliteDb.prepare(memoryQuery).get(id);

        if (!memoryRow) {
          return null;
        }
        // Use mapMemoryRow which properly handles readonly objects
        return this.mapMemoryRow(memoryRow);
      } catch (error) {
        logger.error('[BunSqliteAdapter] Error in getMemoryById:', {
          id,
          error: error instanceof Error ? error.message : String(error),
        });
        return null;
      }
    });
  }

  /**
   * Override getEntitiesByIds to handle SQLite-specific queries
   */
  async getEntitiesByIds(entityIds: UUID[]): Promise<Entity[]> {
    return this.withDatabase(async () => {
      try {
        if (entityIds.length === 0) {
          return [];
        }

        // Use parameterized queries for SQLite
        const placeholders = entityIds.map(() => '?').join(', ');
        const query = `
          SELECT 
            e.id,
            e.agent_id,
            e.names,
            e.metadata,
            c.id as component_id,
            c.entity_id as component_entity_id,
            c.agent_id as component_agent_id,
            c.room_id as component_room_id,
            c.world_id as component_world_id,
            c.source_entity_id as component_source_entity_id,
            c.type as component_type,
            c.created_at as component_created_at,
            c.data as component_data
          FROM entities e
          LEFT JOIN components c ON c.entity_id = e.id
          WHERE e.id IN (${placeholders})
        `;

        const rows = this.sqliteDb.prepare(query).all(...entityIds);

        if (rows.length === 0) {
          return [];
        }

        // Process the raw results into Entity objects
        return this.processSqliteEntityResults(rows);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (
          errorMessage.includes('no such table: entities') ||
          errorMessage.includes("doesn't exist")
        ) {
          logger.debug(
            'Entities table not yet created during initialization, returning empty array',
            {
              error: errorMessage,
              entityIds,
            }
          );
          return [];
        }
        throw error;
      }
    });
  }

  /**
   * Override getEntityByIds to handle SQLite data format and provide compatibility
   * This is an alias for getEntitiesByIds to maintain interface compatibility
   */
  async getEntityByIds(entityIds: UUID[]): Promise<Entity[]> {
    try {
      const entities = await this.getEntitiesByIds(entityIds);
      return entities; // Return the array as expected by the interface
    } catch (error) {
      logger.error('Error in getEntityByIds:', { error, entityIds });
      return [];
    }
  }

  /**
   * Process SQLite entity results into Entity objects
   */
  private processSqliteEntityResults(rows: any[]): Entity[] {
    if (rows.length === 0) {
      return [];
    }

    // Group components by entity
    const entities: Record<string, Entity> = {};
    const entityComponents: Record<string, Component[]> = {};

    for (const row of rows) {
      const entityId = row.id;

      // Create entity if it doesn't exist
      if (!entities[entityId]) {
        entities[entityId] = {
          id: row.id,
          agentId: row.agent_id,
          names: typeof row.names === 'string' ? JSON.parse(row.names) : row.names || [],
          metadata:
            typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata || {},
          components: [],
        };
        entityComponents[entityId] = [];
      }

      // Add component if it exists
      if (row.component_id) {
        const component: Component = {
          id: row.component_id,
          entityId: row.component_entity_id,
          agentId: row.component_agent_id,
          roomId: row.component_room_id,
          worldId: row.component_world_id,
          sourceEntityId: row.component_source_entity_id,
          type: row.component_type,
          createdAt: row.component_created_at,
          data:
            typeof row.component_data === 'string'
              ? JSON.parse(row.component_data)
              : row.component_data || {},
        };
        entityComponents[entityId].push(component);
      }
    }

    // Attach components to entities
    for (const entityId of Object.keys(entityComponents)) {
      entities[entityId].components = entityComponents[entityId];
    }

    return Object.values(entities);
  }

  /**
   * Override createEntities to handle SQLite-specific data transformations
   * SQLite stores JSON fields as text, so we need to serialize arrays and objects
   */
  async createEntities(entities: Entity[]): Promise<boolean> {
    return this.withDatabase(async () => {
      try {
        // Transform entities for SQLite
        const sqliteEntities = entities.map((entity) => ({
          id: entity.id,
          agent_id: entity.agentId, // Map agentId to agent_id for SQLite schema
          names: JSON.stringify(entity.names || []),
          metadata: JSON.stringify(entity.metadata || {}),
        }));

        return await this.db.transaction(async (tx: any) => {
          await tx.insert(sqliteSchema.entityTable).values(sqliteEntities);

          logger.debug(`${entities.length} Entities created successfully`);

          return true;
        });
      } catch (error) {
        logger.error('Error creating entity:', {
          error: error instanceof Error ? error.message : String(error),
          entityId: entities[0].id,
          name: entities[0].metadata?.name,
        });
        // trace the error
        logger.trace(error instanceof Error ? error.stack || error.message : String(error));
        return false;
      }
    });
  }

  /**
   * Override addParticipant to handle SQLite schema
   */
  async addParticipant(entityId: UUID, roomId: UUID): Promise<boolean> {
    return this.withDatabase(async () => {
      try {
        const query = `
          INSERT OR IGNORE INTO participants (entity_id, room_id, agent_id)
          VALUES (?, ?, ?)
        `;

        this.sqliteDb.prepare(query).run(entityId, roomId, this.agentId);
        return true;
      } catch (error) {
        logger.error('Error adding participant', {
          error: error instanceof Error ? error.message : String(error),
          entityId,
          roomId,
          agentId: this.agentId,
        });
        return false;
      }
    });
  }

  /**
   * Override addParticipantsRoom to handle SQLite schema
   */
  async addParticipantsRoom(entityIds: UUID[], roomId: UUID): Promise<boolean> {
    return this.withDatabase(async () => {
      try {
        const query = `
          INSERT OR IGNORE INTO participants (entity_id, room_id, agent_id)
          VALUES (?, ?, ?)
        `;

        const stmt = this.sqliteDb.prepare(query);
        for (const entityId of entityIds) {
          stmt.run(entityId, roomId, this.agentId);
        }

        logger.debug(`${entityIds.length} Entities linked successfully`);
        return true;
      } catch (error) {
        logger.error('Error adding participants', {
          error: error instanceof Error ? error.message : String(error),
          entityIdSample: entityIds[0],
          roomId,
          agentId: this.agentId,
        });
        return false;
      }
    });
  }

  /**
   * Override getParticipantsForRoom to handle SQLite schema
   */
  async getParticipantsForRoom(roomId: UUID): Promise<UUID[]> {
    return this.withDatabase(async () => {
      try {
        const query = `
          SELECT entity_id FROM participants 
          WHERE room_id = ?
        `;

        const rows = this.sqliteDb.prepare(query).all(roomId);
        return rows.map((row: any) => row.entity_id);
      } catch (error) {
        logger.error('Error getting participants for room', {
          error: error instanceof Error ? error.message : String(error),
          roomId,
        });
        return [];
      }
    });
  }

  /**
   * Override getParticipantUserState to handle SQLite schema
   */
  async getParticipantUserState(
    roomId: UUID,
    entityId: UUID
  ): Promise<'FOLLOWED' | 'MUTED' | null> {
    return this.withDatabase(async () => {
      try {
        const query = `
          SELECT room_state FROM participants 
          WHERE room_id = ? AND entity_id = ?
        `;

        const result = this.sqliteDb.prepare(query).get(roomId, entityId);
        const state = result ? (result as any).room_state : null;

        // Validate and return only expected values
        if (state === 'FOLLOWED' || state === 'MUTED') {
          return state;
        }
        return null;
      } catch (error) {
        logger.error('Error getting participant user state', {
          error: error instanceof Error ? error.message : String(error),
          roomId,
          entityId,
        });
        return null;
      }
    });
  }

  /**
   * Override setParticipantUserState to handle SQLite schema
   */
  async setParticipantUserState(
    roomId: UUID,
    entityId: UUID,
    state: 'FOLLOWED' | 'MUTED' | null
  ): Promise<void> {
    return this.withDatabase(async () => {
      try {
        const query = `
          UPDATE participants 
          SET room_state = ?, updated_at = datetime('now')
          WHERE room_id = ? AND entity_id = ?
        `;

        this.sqliteDb.prepare(query).run(state, roomId, entityId);
      } catch (error) {
        logger.error('Error setting participant user state', {
          error: error instanceof Error ? error.message : String(error),
          roomId,
          entityId,
          state,
        });
        throw error;
      }
    });
  }

  // Override component methods to use SQLite schema
  async createComponent(component: Component): Promise<boolean> {
    return this.withDatabase(async () => {
      try {
        await this.db.insert(sqliteSchema.componentTable).values([
          {
            id: component.id || v4(),
            entity_id: component.entityId,
            agent_id: component.agentId,
            room_id: component.roomId,
            world_id: component.worldId,
            source_entity_id: component.sourceEntityId,
            type: component.type,
            data: JSON.stringify(component.data),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ]);
        return true;
      } catch (error) {
        logger.error('Error creating component:', error);
        return false;
      }
    });
  }

  async getComponent(
    entityId: UUID,
    type: string,
    worldId?: UUID,
    sourceEntityId?: UUID
  ): Promise<Component | null> {
    return this.withDatabase(async () => {
      try {
        const conditions = [sql`entity_id = ${entityId}`, sql`type = ${type}`];

        if (worldId) {
          conditions.push(sql`world_id = ${worldId}`);
        }

        if (sourceEntityId) {
          conditions.push(sql`source_entity_id = ${sourceEntityId}`);
        }

        const result = await this.db
          .select()
          .from(sqliteSchema.componentTable)
          .where(sql`${sql.join(conditions, sql` AND `)}`)
          .limit(1);

        if (result.length === 0) return null;

        const component = result[0];
        return {
          id: component.id as UUID,
          entityId: component.entity_id as UUID,
          agentId: component.agent_id as UUID,
          roomId: component.room_id as UUID,
          worldId: component.world_id as UUID,
          sourceEntityId: component.source_entity_id as UUID,
          type: component.type,
          data: typeof component.data === 'string' ? JSON.parse(component.data) : component.data,
          createdAt: component.created_at ? new Date(component.created_at).getTime() : Date.now(),
        };
      } catch (error) {
        logger.error('Error getting component:', error);
        return null;
      }
    });
  }

  async getComponents(entityId: UUID, worldId?: UUID, sourceEntityId?: UUID): Promise<Component[]> {
    return this.withDatabase(async () => {
      try {
        const conditions = [sql`entity_id = ${entityId}`];

        if (worldId) {
          conditions.push(sql`world_id = ${worldId}`);
        }

        if (sourceEntityId) {
          conditions.push(sql`source_entity_id = ${sourceEntityId}`);
        }

        const result = await this.db
          .select()
          .from(sqliteSchema.componentTable)
          .where(sql`${sql.join(conditions, sql` AND `)}`);

        return result.map((component: any) => ({
          id: component.id as UUID,
          entityId: component.entity_id as UUID,
          agentId: component.agent_id as UUID,
          roomId: component.room_id as UUID,
          worldId: component.world_id as UUID | undefined,
          sourceEntityId: component.source_entity_id as UUID | undefined,
          type: component.type,
          data: typeof component.data === 'string' ? JSON.parse(component.data) : component.data,
        }));
      } catch (error) {
        logger.error('Error getting components:', error);
        return [];
      }
    });
  }

  async updateComponent(component: Component): Promise<void> {
    return this.withDatabase(async () => {
      try {
        await this.db
          .update(sqliteSchema.componentTable)
          .set({
            data: JSON.stringify(component.data),
            updated_at: new Date().toISOString(),
          })
          .where(sql`id = ${component.id}`);
      } catch (error) {
        logger.error('Error updating component:', error);
        throw error;
      }
    });
  }

  async deleteComponent(componentId: UUID): Promise<void> {
    return this.withDatabase(async () => {
      try {
        await this.db.delete(sqliteSchema.componentTable).where(sql`id = ${componentId}`);
      } catch (error) {
        logger.error('Error deleting component:', error);
        throw error;
      }
    });
  }

  /**
   * SQLite-specific createWorld method that overrides the PostgreSQL implementation
   * Uses SQLite-compatible syntax instead of PostgreSQL's now() function
   */
  async createWorld(world: World): Promise<UUID> {
    return this.withDatabase(async () => {
      try {
        const worldId = world.id || (v4() as UUID);
        await this.db.insert(sqliteSchema.worldTable).values({
          id: worldId,
          agent_id: world.agentId,
          name: world.name,
          metadata: world.metadata ? JSON.stringify(world.metadata) : null,
          server_id: world.serverId || 'local',
          created_at: new Date().toISOString(),
        });
        return worldId;
      } catch (error) {
        logger.error('Error creating world:', {
          error: error instanceof Error ? error.message : String(error),
          worldId: world.id,
        });
        throw error;
      }
    });
  }

  /**
   * SQLite-specific log method that overrides the PostgreSQL implementation
   * Stores the log entry with proper SQLite-compatible JSON serialization
   */
  async log(params: {
    body: { [key: string]: unknown };
    entityId: UUID;
    roomId: UUID;
    type: string;
  }): Promise<void> {
    return this.withDatabase(async () => {
      try {
        // Simple sanitization to prevent issues - just ensure it's serializable
        const sanitizedBody = JSON.parse(JSON.stringify(params.body));

        // Serialize to JSON string for SQLite storage
        const jsonString = JSON.stringify(sanitizedBody);

        // Use direct SQLite insert without PostgreSQL-specific JSONB casting
        await this.db.run(sql`
          INSERT INTO logs (id, body, entity_id, room_id, agent_id, type, created_at, updated_at)
          VALUES (${uuidv4()}, ${jsonString}, ${params.entityId}, ${params.roomId}, ${this.agentId}, ${params.type}, datetime('now'), datetime('now'))
        `);
      } catch (error) {
        logger.error('Failed to create log entry:', {
          error: error instanceof Error ? error.message : String(error),
          entityId: params.entityId,
          roomId: params.roomId,
          type: params.type,
        });
        // Don't throw error to prevent breaking the main flow
      }
    });
  }
}
