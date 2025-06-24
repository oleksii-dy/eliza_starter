# ElizaOS SQL Plugin

`@elizaos/plugin-sql` provides database adapter implementation for ElizaOS using PostgreSQL and PGLite with automatic adapter selection.

## Installation & Configuration

```bash
# Install plugin (usually auto-installed with projects)
bun add @elizaos/plugin-sql

# Environment configuration
POSTGRES_URL=postgresql://user:password@localhost:5432/eliza  # Production
PGLITE_DATA_DIR=./.eliza/.elizadb                            # Development (optional)
FORCE_PGLITE=true                                            # Force PGLite for testing
```

## Database Adapters

### PostgreSQL (Production)
- Full PostgreSQL with vector search (pgvector extension)
- Connection pooling and retry logic
- Requires `POSTGRES_URL` environment variable
- Production-ready with comprehensive error handling

### PGLite (Development)
- Embedded PostgreSQL running in Node.js process
- WebAssembly-based, no external database required
- Data stored in `PGLITE_DATA_DIR` (default: `./.eliza/.elizadb`)
- Perfect for development and testing

### Adaptive Selection
The plugin automatically chooses the best adapter:
1. PostgreSQL if `POSTGRES_URL` is available
2. PGLite if WebAssembly compatibility passes
3. Fallback to PostgreSQL with error handling

## Core Database Schema

### Essential Tables
```sql
-- Agent configurations
agents (id, character, enabled, created_at, updated_at)

-- Users and participants  
entities (id, names, metadata, agent_id, components)

-- Conversation history with embeddings
memories (id, entity_id, agent_id, content, embedding, room_id, world_id, unique, similarity, created_at)

-- Vector embeddings for semantic search (384-3072 dimensions)
embeddings (id, memory_id, embedding, created_at)

-- Conversation spaces
rooms (id, name, agent_id, source, type, channel_id, server_id, world_id, metadata)

-- Room membership
participants (id, entity_id, room_id, agent_id, last_message_at, state)

-- Entity relationships
relationships (id, source_entity_id, target_entity_id, agent_id, tags, metadata, created_at)

-- Modular entity data
components (id, entity_id, agent_id, room_id, world_id, source_entity_id, type, data, created_at)

-- Collections of rooms and entities
worlds (id, name, agent_id, server_id, metadata)

-- Deferred operations
tasks (id, name, updated_at, metadata, description, room_id, world_id, entity_id, tags)
```

## Vector Embedding Support

### Supported Dimensions
```typescript
const VECTOR_DIMS = {
  SMALL: 384,    // Basic embeddings
  MEDIUM: 512,   // Standard embeddings
  LARGE: 768,    // OpenAI text-embedding-ada-002
  XL: 1024,      // Large model embeddings
  XXL: 1536,     // OpenAI text-embedding-3-small/large
  XXXL: 3072     // Maximum dimension support
};
```

### Usage
```typescript
// Create memory with embedding
await runtime.createMemory({
  entityId: userId,
  roomId: roomId,
  content: { text: 'Important information' },
  embedding: await runtime.useModel(ModelType.TEXT_EMBEDDING, {
    text: 'Important information'
  })
}, 'facts');

// Semantic search
const relevant = await runtime.searchMemories({
  embedding: queryEmbedding,
  roomId: roomId,
  match_threshold: 0.7,
  count: 5
});
```

**Important**: Embedding dimensions are set during first agent initialization and cannot be changed.

## Plugin Registration

```typescript
// Automatic registration in project
import { plugin as sqlPlugin } from '@elizaos/plugin-sql';

export default {
  agents: [{
    character: myCharacter,
    plugins: [sqlPlugin], // Database adapter
  }]
};
```

## Manual Adapter Creation

```typescript
import { 
  createDatabaseAdapter, 
  createAdaptiveDatabaseAdapterV2 
} from '@elizaos/plugin-sql';

// Adaptive adapter (recommended)
const adapter = await createAdaptiveDatabaseAdapterV2({
  postgresUrl: process.env.POSTGRES_URL,
  dataDir: process.env.PGLITE_DATA_DIR,
  fallbackToPostgres: true
}, agentId);

// Direct adapter creation
const pgAdapter = await createDatabaseAdapter('postgresql', agentId);
const pgliteAdapter = await createDatabaseAdapter('pglite', agentId);
```

## Database Operations

### Memory Management
```typescript
// Create memory
await adapter.createMemory({
  id: memoryId,
  entityId: userId,
  agentId: runtime.agentId,
  roomId: roomId,
  content: { text: 'User preferences', type: 'preference' },
  embedding: embeddingVector,
  unique: true
}, 'facts');

// Get memories
const memories = await adapter.getMemories({
  roomId: roomId,
  count: 50,
  unique: true
});

// Search by embedding
const similar = await adapter.searchMemories({
  embedding: queryVector,
  roomId: roomId,
  match_threshold: 0.8,
  count: 10
});

// Delete memories
await adapter.deleteMemory(memoryId);
await adapter.deleteAllMemories(roomId, 'messages');
```

### Entity Operations
```typescript
// Create entity
const entityId = await adapter.createEntity({
  names: ['John Doe'],
  metadata: { platform: 'discord', username: 'johndoe#1234' },
  agentId: runtime.agentId
});

// Get entity
const entity = await adapter.getEntityById(entityId);
const entitiesInRoom = await adapter.getEntitiesForRoom(roomId);

// Components (modular entity data)
await adapter.createComponent({
  entityId: entityId,
  agentId: runtime.agentId,
  roomId: roomId,
  type: 'profile',
  data: { bio: 'Software developer', location: 'SF' }
});

const profile = await adapter.getComponent(entityId, 'profile');
```

### Room & Participant Management
```typescript
// Create room
const roomId = await adapter.createRoom({
  name: 'general-chat',
  source: 'discord',
  type: 'GROUP',
  worldId: worldId
});

// Manage participants
await adapter.addParticipant(entityId, roomId);
await adapter.removeParticipant(entityId, roomId);

// Participant states
await adapter.setParticipantUserState(roomId, entityId, 'FOLLOWED');
// States: 'FOLLOWED' (active), 'MUTED' (ignored), null (mention only)

const participants = await adapter.getParticipantsForRoom(roomId);
```

### World Management
```typescript
// Create world
const worldId = await adapter.createWorld({
  name: 'My Server',
  agentId: runtime.agentId,
  serverId: 'discord-server-123',
  metadata: {
    ownership: { ownerId: ownerEntityId },
    roles: { [adminEntityId]: 'ADMIN' }
  }
});

// Get worlds
const world = await adapter.getWorld(worldId);
const allWorlds = await adapter.getAllWorlds();
```

## Connection Management

### Singleton Pattern
```typescript
// Connections are managed globally to prevent duplicates
const manager = PostgresManager.getInstance();
const connection = await manager.getConnection(connectionString);

// Cleanup handled automatically
process.on('SIGINT', () => {
  manager.closeAll();
});
```

### Retry Logic
```typescript
// Built-in exponential backoff
protected async withRetry<T>(operation: () => Promise<T>): Promise<T> {
  // Automatic retry with exponential backoff
  // maxRetries: 3, baseDelay: 1000ms, maxDelay: 10000ms
}
```

## Schema Extensions

### Plugin Table Registration
```typescript
import { schemaRegistry } from '@elizaos/plugin-sql';

// Register custom tables
await schemaRegistry.registerPluginTables([
  {
    name: 'my_custom_table',
    pluginName: '@my/plugin',
    sql: `CREATE TABLE my_custom_table (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      data JSONB NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    fallbackSql: `CREATE TABLE my_custom_table (
      id TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      created_at INTEGER DEFAULT (strftime('%s', 'now'))
    )` // PGLite compatibility
  }
]);
```

## Performance Features

### Indexing
- Vector similarity search optimized with pgvector
- B-tree indexes on frequently queried columns
- Composite indexes for complex queries

### Caching
- Connection pooling for PostgreSQL
- Query result caching where appropriate
- Singleton pattern prevents duplicate connections

### Optimizations
- Bulk operations for entity/memory creation
- Efficient participant state management
- Optimized vector similarity queries

## Development & Testing

### Testing Configuration
```bash
# Use PGLite for tests
FORCE_PGLITE=true
NODE_ENV=test

# Run tests
elizaos test
```

### Development Setup
```bash
# PostgreSQL development
docker run -d \
  --name postgres-eliza \
  -e POSTGRES_DB=eliza \
  -e POSTGRES_USER=eliza \
  -e POSTGRES_PASSWORD=eliza \
  -p 5432:5432 \
  pgvector/pgvector:pg16

export POSTGRES_URL="postgresql://eliza:eliza@localhost:5432/eliza"
```

## Migration System

### Auto-Migration
- Schema automatically created on first run
- Plugin tables registered during initialization
- Version tracking and dependency management
- Safe concurrent migration with locking

### Manual Migration
```typescript
import { unifiedMigrator } from '@elizaos/plugin-sql';

await unifiedMigrator.migrateCoreTablesV2(adapter);
await unifiedMigrator.registerPluginTables(pluginTables);
```

## Best Practices

1. **Environment Variables**: Always provide `POSTGRES_URL` for production
2. **Embedding Dimensions**: Choose dimensions at project start - cannot change later
3. **Connection Management**: Plugin handles connections automatically via singleton
4. **Error Handling**: Built-in retry logic handles transient failures
5. **Testing**: Use `FORCE_PGLITE=true` to avoid PostgreSQL dependencies in tests
6. **Vector Search**: Use appropriate `match_threshold` values (0.7-0.9 typically)
7. **Memory Organization**: Use different table names for different memory types
8. **Participant States**: Understand FOLLOWED/MUTED/null behavior for room interactions

This plugin provides the complete database layer for ElizaOS with intelligent adapter selection and production-ready features.