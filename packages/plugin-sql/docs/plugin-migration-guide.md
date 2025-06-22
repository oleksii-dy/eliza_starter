# Plugin Migration Guide for ElizaOS

This guide explains how to create custom database tables for your ElizaOS plugins using the unified migration system.

## Overview

The unified migration system allows plugins to register custom database tables that will be created automatically when the agent starts up. This ensures all required tables exist before your plugin runs.

## Table Schema Format

Plugins define their tables using the `TableSchema` interface:

```typescript
interface TableSchema {
  name: string;              // Table name
  pluginName: string;        // Your plugin name
  sql: string;               // CREATE TABLE SQL statement
  dependencies?: string[];   // Other tables this depends on
  fallbackSql?: string;      // Alternative SQL (e.g., when vector extension unavailable)
}
```

## Example: Hello World Plugin

Here's how the hello world plugin defines its tables:

```typescript
import type { TableSchema } from '@elizaos/plugin-sql';

const HELLO_WORLD_TABLES: TableSchema[] = [
  {
    name: 'hello_world',
    pluginName: 'hello-world',
    sql: `
      CREATE TABLE IF NOT EXISTS hello_world (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        message VARCHAR(255) NOT NULL,
        author VARCHAR(100) DEFAULT 'anonymous',
        agent_id UUID NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `,
    dependencies: [],
  },
  {
    name: 'greetings',
    pluginName: 'hello-world',
    sql: `
      CREATE TABLE IF NOT EXISTS greetings (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        greeting VARCHAR(100) NOT NULL,
        language VARCHAR(20) NOT NULL DEFAULT 'en',
        is_active VARCHAR(10) NOT NULL DEFAULT 'true',
        agent_id UUID NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `,
    dependencies: [],
  },
];
```

## Plugin Integration

To integrate with the unified migration system:

### 1. Export Your Table Schemas

```typescript
// src/tables.ts
export const MY_PLUGIN_TABLES: TableSchema[] = [
  // Your table definitions
];
```

### 2. Register Tables in Plugin Initialization

```typescript
import type { Plugin, IAgentRuntime } from '@elizaos/core';
import { MY_PLUGIN_TABLES } from './tables';

export const myPlugin: Plugin = {
  name: 'my-plugin',
  description: 'My custom plugin',
  
  init: async (config: any, runtime: IAgentRuntime) => {
    // If the adapter supports table registration
    if (runtime.adapter?.registerPluginTables) {
      await runtime.adapter.registerPluginTables(MY_PLUGIN_TABLES);
    }
    
    // Your other initialization code
  },
  
  // ... other plugin properties
};
```

## Table Dependencies

If your tables depend on other tables (including core tables), specify them:

```typescript
{
  name: 'user_stats',
  pluginName: 'analytics',
  sql: `
    CREATE TABLE IF NOT EXISTS user_stats (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      entity_id UUID NOT NULL REFERENCES entities(id),
      stat_name VARCHAR(50) NOT NULL,
      stat_value INTEGER DEFAULT 0,
      updated_at TIMESTAMP DEFAULT NOW() NOT NULL
    )
  `,
  dependencies: ['entities'],  // Depends on core 'entities' table
}
```

## Database Compatibility

### PostgreSQL vs PGLite

Consider both database types when designing your tables:

**PostgreSQL-specific features:**
- Vector types (with pgvector extension)
- Advanced indexes
- Foreign key constraints

**PGLite-compatible approach:**
```typescript
// For PGLite compatibility, use TEXT instead of UUID
{
  name: 'my_table',
  pluginName: 'my-plugin',
  sql: `
    CREATE TABLE IF NOT EXISTS my_table (
      id TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `,
  dependencies: []
}
```

## Best Practices

1. **Always use IF NOT EXISTS**: Ensures idempotent table creation
2. **Include agent_id**: Most tables should be scoped to specific agents
3. **Use appropriate data types**: Consider both PostgreSQL and PGLite compatibility
4. **Handle migrations carefully**: The system creates tables but doesn't handle schema updates
5. **Test with both databases**: Ensure your plugin works with both PostgreSQL and PGLite

## Testing Your Plugin Tables

Use the test pattern from the hello world plugin:

```typescript
import { describe, it, expect } from 'vitest';
import { schemaRegistry } from '@elizaos/plugin-sql';

describe('My Plugin Tables', () => {
  it('should create plugin tables', async () => {
    // Register your tables
    schemaRegistry.registerTables(MY_PLUGIN_TABLES);
    
    // Create tables
    await schemaRegistry.createTables(db, 'pglite');
    
    // Test table operations
    // ... your tests
  });
});
```

## Migration Workflow

When an agent starts:

1. Core SQL plugin initializes
2. Unified migrator creates core tables
3. Each plugin registers its tables
4. Tables are created in dependency order
5. Agent is ready to use all tables

This ensures a consistent database schema across all agents and plugins.
