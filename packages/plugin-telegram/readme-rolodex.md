# Digital Rolodex System

## Overview

The Digital Rolodex is a sophisticated entity management system at the core of the agent infrastructure. It provides a rich, context-aware graph of entities and their relationships, enabling agents to understand, track, and recall information about users and other entities they interact with.

## Key Functions and Implementation

The Rolodex system provides several critical functions that power entity management:

### Entity Resolution

- **findEntityByName**: Core function that uses an LLM to identify which entity is being referenced in a conversation
  - Ingests message context, room entities, and relationship data
  - Generates a specialized LLM prompt to analyze references
  - Returns the resolved entity with filtered components based on permissions
  - Handles special references like "me", "you", @username formats, and contextual pronouns

### Relationship Management

- **getRecentInteractions**: Analyzes interaction patterns between entities
  - Counts direct message replies between entities
  - Retrieves relationship strength from metadata
  - Applies scoring to prioritize recent and meaningful interactions
  - Returns sorted results based on interaction frequency and recency

### Entity Management

- **createUniqueUuid**: Creates deterministic IDs for entity relationships

  - Combines base user ID with agent ID
  - Ensures consistent entity IDs across interactions
  - Special handling for direct agent references

- **getEntityDetails**: Retrieves and processes entity information from a room

  - Parallelizes database queries for efficiency
  - Merges component data into unified representations
  - Deduplicates overlapping information
  - Filters based on permission rules

- **formatEntities**: Converts entity data into human-readable strings
  - Combines names, IDs, and metadata
  - Creates consistent text representation for LLM prompts

### Technical Implementation

- **Entity Resolution Process**:

  ```typescript
  async function findEntityByName(
    runtime: IAgentRuntime,
    message: Memory,
    state: State
  ): Promise<Entity | null> {
    // Get room entities
    const entitiesInRoom = await runtime.getEntitiesForRoom(room.id, true);

    // Filter components based on permissions
    const filteredEntities = await Promise.all(/* permission filtering logic */);

    // Get relationships and interaction data
    const relationships = await runtime.getRelationships({ entityId: message.entityId });
    const interactionData = await getRecentInteractions(
      runtime,
      message.entityId,
      allEntities,
      room.id,
      relationships
    );

    // Use LLM for entity resolution
    const result = await runtime.useModel(ModelType.TEXT_SMALL, { prompt, stopSequences: [] });

    // Parse and return the resolved entity
    const resolution = parseJSONObjectFromText(result);
    // Match logic based on resolution type
  }
  ```

- **Reflection System**:

  ```typescript
  // Extract facts and relationships from conversations
  const reflectionEvaluator: Evaluator = {
    name: 'REFLECTION',
    validate: async (runtime, message) => {
      // Determine when to run reflection (interval-based)
      return messages.length > reflectionInterval;
    },
    handler: async (runtime, message, state) => {
      // Extract facts and relationships
      const reflection = await runtime.useModel(ModelType.OBJECT_SMALL, { prompt });

      // Store new facts in vector database
      await Promise.all(newFacts.map((fact) => runtime.createMemory(factMemory, 'facts', true)));

      // Update relationships based on reflections
      for (const relationship of reflection.relationships) {
        // Create or update relationship
      }
    },
  };
  ```

## Data Model

The Digital Rolodex consists of several interconnected data structures:

### Entities

- **Primary record** for any person, agent, or object in the system
- Contains:
  - Unique ID (`UUID`)
  - Names (array of possible names/aliases)
  - Components (extensible properties)
  - Metadata (source-specific information)

### Components

- **Extensible properties** attached to entities
- Contains:
  - Source entity ID (who created the component)
  - Data (arbitrary JSON)
  - Permission controls
- Examples: usernames, handles, bio information, preferences

### Relationships

- **Connections between entities**
- Contains:
  - Source entity ID (relationship initiator)
  - Target entity ID (relationship recipient)
  - Tags (array of relationship types)
  - Metadata (including interaction counts)
- Directional (A→B is separate from B→A)

### Memories

- **Interactions and facts** about entities
- Different tables for different types:
  - `messages`: Conversation history
  - `facts`: Extracted knowledge about entities
- Contains:
  - Entity ID (who the memory belongs to)
  - Room ID (context where memory was formed)
  - Content (the actual memory data)
  - Timestamps

### Rooms

- **Contexts for interactions**
- Contains:
  - Unique ID
  - Name
  - Type (GROUP, DM, FEED)
  - World ID (parent container)
  - Source platform (e.g., "discord", "twitter")

### Worlds

- **Top-level containers** (e.g., servers, communities)
- Contains:
  - Unique ID
  - Server ID
  - Name
  - Metadata (including roles, settings)

## Storage Architecture

The Rolodex data is stored in a multi-layered architecture:

1. **Runtime Database**: Primary storage for active entities, relationships, and recent memories

   - PostgreSQL with JSON fields for flexible schema
   - Indexed for efficient entity and relationship retrieval

2. **Vector Store**: For semantic search of memories

   - Embeddings of messages and facts
   - Enables context-aware memory retrieval

3. **Cache Layer**: For frequently accessed entity data

   - Reduces database load
   - Stores recently accessed entities and relationships

4. **Encrypted Storage**: For sensitive settings
   - AES-256-CBC encryption for secret settings
   - Salt based on agent ID for key derivation

## Entity Resolution Process

One of the most sophisticated aspects of the Rolodex is its entity resolution system:

1. When a reference to an entity is detected in a message, `findEntityByName` is called
2. The system collects:
   - All entities in the current room
   - Relationship data
   - Recent interaction patterns
3. A specialized LLM prompt template (`entityResolutionTemplate`) is used to analyze:
   - Direct references (exact IDs)
   - Name matches
   - Pronoun resolution ("me", "you")
   - Username/handle formats (@username)
   - Context from previous messages
4. The system returns the matched entity with appropriate components filtered by permissions

## Relationship Management

Relationships are dynamically built and updated through:

1. **Reflection Evaluator**: Periodically analyzes conversations to:

   - Extract facts about entities
   - Identify relationship patterns
   - Update interaction counts

2. **Relationship Strength**:

   - Tracked via interaction counts
   - Used for disambiguating entity references
   - Influences memory retrieval priority

3. **Bidirectional Mapping**:
   - A→B and B→A relationships are separate
   - Allows for asymmetric relationships (A likes B, but B dislikes A)

## How Agents Use the Digital Rolodex

Agents leverage the Rolodex in several ways:

1. **Contextual Understanding**:

   - Identify who is speaking in a conversation
   - Understand relationships between participants
   - Access role hierarchies (OWNER, ADMIN, MEMBER)

2. **Memory Recall**:

   - Retrieve facts about entities
   - Access conversation history with specific entities
   - Use relationship strength to prioritize information

3. **Personalization**:

   - Adapt responses based on relationship history
   - Remember preferences and past interactions
   - Adjust tone based on familiarity

4. **Entity Tracking**:

   - Monitor when entities join/leave rooms
   - Track changes in entity properties
   - Update relationship data based on interactions

5. **Privacy Management**:
   - Filter entity components based on permissions
   - Respect role hierarchies for information access
   - Handle encrypted sensitive settings

## Analogies to a Traditional Rolodex

While the system is much more sophisticated than a physical card-based rolodex, the fundamental concept remains the same with digital enhancements:

### Traditional Rolodex → Digital Implementation

| Traditional Rolodex                     | Digital Rolodex Implementation                      |
| --------------------------------------- | --------------------------------------------------- |
| Contact cards with names                | Entities with multiple names/aliases                |
| Physical sections/dividers              | Rooms and Worlds as organization structures         |
| Contact information fields              | Components with extensible data schemas             |
| Handwritten notes about relationships   | Relationship metadata with interaction counts       |
| Manual cross-references between cards   | Bidirectional relationship mappings                 |
| Thumbing through cards to find contacts | Entity resolution with LLM-based matching           |
| Wear and tear on frequently used cards  | Interaction counts indicating relationship strength |
| Personal notes about preferences        | Fact extraction and storage in vector database      |
| Limited sharing of contact information  | Permission-based component filtering                |

The digital rolodex transforms the traditional concept in several key ways:

1. **Dynamic vs. Static**: Traditional rolodexes contain static information that must be manually updated. The digital rolodex continuously evolves through interaction analysis and fact extraction.

2. **Context-Aware Resolution**: Unlike searching alphabetically in a physical rolodex, the digital system understands contextual references and can resolve entities based on conversation history.

3. **Relationship Intelligence**: Beyond simply storing contact information, the digital rolodex understands the nature and strength of relationships between entities.

4. **Multi-Agent Accessibility**: The rolodex serves as a shared knowledge base where different agents can access entity information according to their permissions.

5. **Memory Integration**: The system doesn't just recall static facts but incorporates temporal memory about past interactions, enabling more nuanced entity understanding.

## Integration Points

The Rolodex integrates with other system components:

1. **Message Handler**:

   - Uses Rolodex for entity resolution in conversations
   - Updates relationships based on interactions

2. **Reflection System**:

   - Periodically analyzes conversations to update the Rolodex
   - Extracts facts and relationship information

3. **Settings Management**:

   - Stores configuration in world metadata
   - Uses Rolodex entity IDs for access control

4. **Role Provider**:

   - Uses Rolodex to retrieve role hierarchies
   - Determines permissions for entity data access

5. **Providers and Evaluators**:
   - Access Rolodex data to provide context for agent decisions
   - Update relationships and entity data

## Implementation Details

### Entity Resolution with LLMs

The system uses a sophisticated prompt to resolve entity references:

```typescript
const entityResolutionTemplate = `# Task: Resolve Entity Name
Message Sender: {{senderName}} (ID: {{senderId}})
Agent: {{agentName}} (ID: {{agentId}})

# Entities in Room:
{{#if entitiesInRoom}}
{{entitiesInRoom}}
{{/if}}

{{recentMessages}}

# Instructions:
1. Analyze the context to identify which entity is being referenced
2. Consider special references like "me" (the message sender) or "you" (agent the message is directed to)
3. Look for usernames/handles in standard formats (e.g. @username)
4. Consider context from recent messages for pronouns and references
...
`;
```

### Relationship Creation

When new relationships are identified by the reflection evaluator:

```typescript
await runtime.createRelationship({
  sourceEntityId: sourceId,
  targetEntityId: targetId,
  tags: relationship.tags,
  metadata: {
    interactions: 1,
    ...relationship.metadata,
  },
});
```

### Entity Details Retrieval

Efficient entity data consolidation:

```typescript
const entityDetails = await getEntityDetails({ runtime, roomId });
```

This merges component data and performs deduplication for efficient storage and retrieval.

## Security Considerations

The Rolodex implements several security measures:

1. **Component Filtering**:

   - Components are filtered based on permissions
   - Only components from trusted sources are visible

2. **Role-Based Access**:

   - World roles (OWNER, ADMIN, MEMBER) control access
   - Higher roles can see more entity data

3. **Encrypted Settings**:

   - Sensitive settings are encrypted with AES-256-CBC
   - Each agent has a unique encryption salt

4. **Permission Boundaries**:
   - Entities can only access their own relationships
   - Cross-entity access requires appropriate roles

## Database Schema and Flow

The Digital Rolodex relies on several database tables and specialized flows to manage entity data:

### Core Tables

| Table Name          | Primary Keys                           | Key Fields                                      | Purpose                             |
| ------------------- | -------------------------------------- | ----------------------------------------------- | ----------------------------------- |
| `entities`          | `id` (UUID)                            | `names`, `metadata`, `created_at`               | Stores basic entity information     |
| `components`        | `id`, `entity_id`                      | `source_entity_id`, `data`, `created_at`        | Stores extensible entity properties |
| `relationships`     | `source_entity_id`, `target_entity_id` | `tags`, `metadata`, `created_at`                | Tracks connections between entities |
| `memories-messages` | `id`                                   | `entity_id`, `room_id`, `content`, `created_at` | Stores conversation history         |
| `memories-facts`    | `id`                                   | `entity_id`, `room_id`, `content`, `created_at` | Stores extracted knowledge          |
| `rooms`             | `id`                                   | `name`, `type`, `world_id`, `source`            | Defines interaction contexts        |
| `worlds`            | `id`                                   | `server_id`, `name`, `metadata`                 | Top-level organizational containers |

### Key Data Flows

1. **Entity Resolution Flow**:

   ```
   User Message → Message Handler → findEntityByName() →
   → Get Room Entities → Filter Components → Analyze Relationships →
   → LLM Resolution → Return Matched Entity
   ```

2. **Relationship Update Flow**:

   ```
   Conversation → Reflection Evaluator → Extract Facts and Relationships →
   → Check Existing Relationships → Update Interaction Counts →
   → Create New Relationships if Needed
   ```

3. **Memory Retrieval Flow**:

   ```
   Agent Query → Vector Search → Filter by Permissions →
   → Sort by Relevance and Relationship Strength →
   → Return Contextualized Memories
   ```

4. **Settings Management Flow**:
   ```
   User Configuration → Encrypt Sensitive Data →
   → Store in World Metadata → Access via Entity ID →
   → Decrypt When Needed
   ```

### Technical Performance Considerations

- **Efficient Entity Retrieval**: Entities and their components are stored with appropriate indexes for quick lookups
- **Vector Embedding**: Messages and facts are stored with vector embeddings for semantic similarity search
- **Caching Strategy**: Frequently accessed entities and recent interactions are cached to reduce database load
- **Permission Filtering**: Component access filtering happens at the application layer for fine-grained control
- **Read/Write Patterns**: Optimized for frequent reads and occasional writes to relationship metadata

The entire system is designed for horizontal scalability, with careful attention to database query performance and efficient LLM usage for entity resolution.
