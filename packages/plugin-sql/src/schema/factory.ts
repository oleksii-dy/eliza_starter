import { sql } from 'drizzle-orm';
import {
  boolean as pgBoolean,
  check as pgCheck,
  foreignKey as pgForeignKey,
  index as pgIndex,
  integer as pgInteger,
  jsonb as pgJsonb,
  pgTable,
  primaryKey as pgPrimaryKey,
  real as pgReal,
  text as pgText,
  timestamp as pgTimestamp,
  unique as pgUnique,
  uuid as pgUuid,
  vector as pgVector,
  type PgTableFn,
} from 'drizzle-orm/pg-core';

export type DatabaseType = 'postgres' | 'pglite';

// Type helpers for cross-database compatibility
// Since Pglite uses PostgreSQL dialect, we use the same types for both
export type TableFn = PgTableFn;
export type UuidColumn = ReturnType<typeof pgUuid>;
export type TextColumn = ReturnType<typeof pgText>;
export type JsonColumn = ReturnType<typeof pgJsonb>;
export type BooleanColumn = ReturnType<typeof pgBoolean>;
export type TimestampColumn = ReturnType<typeof pgTimestamp>;
export type IntegerColumn = ReturnType<typeof pgInteger>;
export type RealColumn = ReturnType<typeof pgReal>;

/**
 * Schema factory to create database-specific column types
 * Since Pglite is PostgreSQL-compatible, we use the same constructs for both
 */
export class SchemaFactory {
  constructor(public dbType: DatabaseType) {}

  get table(): TableFn {
    // Both postgres and pglite use pgTable
    return pgTable;
  }

  uuid(name: string) {
    // Both postgres and pglite support native UUID
    return pgUuid(name);
  }

  text(name: string) {
    return pgText(name);
  }

  json(name: string) {
    // Both postgres and pglite support JSONB
    return pgJsonb(name);
  }

  boolean(name: string) {
    return pgBoolean(name);
  }

  timestamp(name: string, options?: { withTimezone?: boolean; mode?: 'date' | 'string' }) {
    return pgTimestamp(name, options);
  }

  integer(name: string) {
    return pgInteger(name);
  }

  real(name: string) {
    return pgReal(name);
  }

  vector(name: string, dimensions: number) {
    // For PGLite, use JSONB if vector extension is not available
    if (this.dbType === 'pglite') {
      // Check if vector extension is available
      try {
        // Try to use pgVector if available
        return pgVector(name, { dimensions });
      } catch (error) {
        // Fall back to JSONB for storing vector data
        console.warn(`Vector extension not available, using JSONB for ${name}`);
        return pgJsonb(name);
      }
    }
    // PostgreSQL with pgvector extension
    return pgVector(name, { dimensions });
  }

  textArray(name: string) {
    // Both postgres and pglite support arrays
    return pgText(name).array();
  }

  check(name: string, sql: any) {
    // Both postgres and pglite support CHECK constraints
    return pgCheck(name, sql);
  }

  index(name?: string) {
    return pgIndex(name);
  }

  foreignKey(config: any) {
    return pgForeignKey(config);
  }

  unique(name?: string) {
    // Both postgres and pglite support UNIQUE constraints
    return pgUnique(name);
  }

  primaryKey(config: any) {
    return pgPrimaryKey(config);
  }

  // Helper for timestamp defaults
  defaultTimestamp() {
    if (this.dbType === 'pglite') {
      return sql`CURRENT_TIMESTAMP`;
    }
    return sql`NOW()`;
  }

  // Helper for random UUID generation
  defaultRandomUuid() {
    if (this.dbType === 'pglite') {
      return undefined; // Application generates UUIDs
    }
    return sql`gen_random_uuid()`;
  }

  // Helper for JSON array defaults
  defaultJsonArray() {
    if (this.dbType === 'pglite') {
      // PGLite may handle JSON differently
      return sql`'[]'`;
    }
    return sql`'[]'::jsonb`;
  }

  // Helper for JSON object defaults
  defaultJsonObject() {
    if (this.dbType === 'pglite') {
      // PGLite may handle JSON differently
      return sql`'{}'`;
    }
    return sql`'{}'::jsonb`;
  }

  // Helper for text array defaults
  defaultTextArray() {
    if (this.dbType === 'pglite') {
      // PGLite may handle array defaults differently
      return sql`'{}'`;
    }
    return sql`'{}'::text[]`;
  }

  // Helper for JSON field access
  jsonFieldAccess(column: any, field: string) {
    // Use the ->> operator which works in both PostgreSQL and PGLite
    // Field needs to be a string literal
    return sql`${column}->>${sql.raw(`'${field}'`)}`;
  }

  // Helper for JSON field existence check
  jsonFieldExists(column: any, field: string) {
    // Use a method that works in both PostgreSQL and PGLite
    // Field needs to be a string literal
    return sql`${column}->>${sql.raw(`'${field}'`)} IS NOT NULL`;
  }
}

// Global factory instance - will be set based on database type
let globalFactory: SchemaFactory | null = null;

export function setDatabaseType(dbType: DatabaseType) {
  globalFactory = new SchemaFactory(dbType);
}

export function getSchemaFactory(): SchemaFactory {
  if (!globalFactory) {
    globalFactory = new SchemaFactory('postgres');
  }
  return globalFactory;
}

/**
 * Helper function to create a lazy-loaded table proxy
 * This ensures the table is only created when first accessed
 * and properly forwards all property access
 */
export function createLazyTableProxy<T extends object>(createTableFn: () => T): T {
  let cachedTable: T | null = null;
  let isCreating = false;

  // Create a simple object that will be the proxy target
  const proxyTarget = {
    _isLazyProxy: true,
    _createTableFn: createTableFn,
  } as any;

  return new Proxy(proxyTarget, {
    get(target, prop, receiver) {
      // Prevent infinite recursion during table creation
      if (isCreating) {
        return undefined;
      }

      // Handle Symbol.for('drizzle:IsAlias') and other Drizzle internal symbols
      if (typeof prop === 'symbol') {
        if (!cachedTable && !isCreating) {
          isCreating = true;
          try {
            cachedTable = createTableFn();
          } finally {
            isCreating = false;
          }
        }
        return cachedTable ? (cachedTable as any)[prop] : undefined;
      }

      // Handle common string properties that might be accessed during inspection
      if (prop === 'constructor' || prop === 'toString' || prop === 'valueOf') {
        if (!cachedTable && !isCreating) {
          isCreating = true;
          try {
            cachedTable = createTableFn();
          } finally {
            isCreating = false;
          }
        }
        const value = cachedTable ? (cachedTable as any)[prop] : undefined;
        return typeof value === 'function' ? value.bind(cachedTable) : value;
      }

      // For all other properties, create the table if needed
      if (!cachedTable && !isCreating) {
        isCreating = true;
        try {
          cachedTable = createTableFn();
        } finally {
          isCreating = false;
        }
      }

      if (!cachedTable) {
        return undefined;
      }

      const value = Reflect.get(cachedTable, prop, cachedTable);

      // If the value is a function, bind it to the cached table
      if (typeof value === 'function') {
        return value.bind(cachedTable);
      }

      return value;
    },
    has(target, prop) {
      if (isCreating) {
        return false;
      }
      if (!cachedTable && !isCreating) {
        isCreating = true;
        try {
          cachedTable = createTableFn();
        } finally {
          isCreating = false;
        }
      }
      return cachedTable ? Reflect.has(cachedTable, prop) : false;
    },
    ownKeys(target) {
      if (isCreating) {
        return [];
      }
      if (!cachedTable && !isCreating) {
        isCreating = true;
        try {
          cachedTable = createTableFn();
        } finally {
          isCreating = false;
        }
      }
      return cachedTable ? Reflect.ownKeys(cachedTable) : [];
    },
    getOwnPropertyDescriptor(target, prop) {
      if (isCreating) {
        return undefined;
      }
      if (!cachedTable && !isCreating) {
        isCreating = true;
        try {
          cachedTable = createTableFn();
        } finally {
          isCreating = false;
        }
      }
      return cachedTable ? Reflect.getOwnPropertyDescriptor(cachedTable, prop) : undefined;
    },
    getPrototypeOf(target) {
      if (isCreating) {
        return null;
      }
      if (!cachedTable && !isCreating) {
        isCreating = true;
        try {
          cachedTable = createTableFn();
        } finally {
          isCreating = false;
        }
      }
      return cachedTable ? Reflect.getPrototypeOf(cachedTable) : null;
    },
    set(target, prop, value, receiver) {
      if (isCreating) {
        return false;
      }
      if (!cachedTable && !isCreating) {
        isCreating = true;
        try {
          cachedTable = createTableFn();
        } finally {
          isCreating = false;
        }
      }
      return cachedTable ? Reflect.set(cachedTable, prop, value, cachedTable) : false;
    },
    defineProperty(target, prop, descriptor) {
      if (isCreating) {
        return false;
      }
      if (!cachedTable && !isCreating) {
        isCreating = true;
        try {
          cachedTable = createTableFn();
        } finally {
          isCreating = false;
        }
      }
      return cachedTable ? Reflect.defineProperty(cachedTable, prop, descriptor) : false;
    },
    deleteProperty(target, prop) {
      if (isCreating) {
        return false;
      }
      if (!cachedTable && !isCreating) {
        isCreating = true;
        try {
          cachedTable = createTableFn();
        } finally {
          isCreating = false;
        }
      }
      return cachedTable ? Reflect.deleteProperty(cachedTable, prop) : false;
    },
  }) as T;
}
