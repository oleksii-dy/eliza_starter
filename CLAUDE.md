# ElizaOS Essential Reference

## Core Types

### Character

```typescript
interface Character {
  id?: UUID;
  name: string;
  username?: string;
  system?: string; // System prompt
  bio: string | string[];
  messageExamples?: MessageExample[][];
  knowledge?: (string | { path: string; shared?: boolean } | DirectoryItem)[];
  plugins?: string[];
  settings?: { [key: string]: any };
  secrets?: { [key: string]: string | boolean | number };
}
```

### Action

```typescript
interface Action {
  name: string;
  similes?: string[];
  description: string;
  examples?: ActionExample[][];
  handler: Handler;
  validate: Validator;
  effects?: {
    provides: string[];
    requires: string[];
    modifies: string[];
  };
}
```

### Provider

```typescript
interface Provider {
  name: string;
  dynamic?: boolean; // Only used when requested
  position?: number; // Execution order
  private?: boolean; // Must be explicitly included
  get: (runtime: IAgentRuntime, message: Memory, state: State) => Promise<ProviderResult>;
}

interface ProviderResult {
  values?: { [key: string]: any };
  data?: { [key: string]: any };
  text?: string;
}
```

### Plugin

```typescript
interface Plugin {
  name: string;
  description: string;
  init?: (config: Record<string, string>, runtime: IAgentRuntime) => Promise<void>;
  services?: (typeof Service)[];
  actions?: Action[];
  providers?: Provider[];
  evaluators?: Evaluator[];
  models?: { [key: string]: (...args: any[]) => Promise<any> };
  dependencies?: string[];
  priority?: number;
}
```

## Memory & Content

### Memory

```typescript
interface Memory {
  id?: UUID;
  entityId: UUID;
  agentId?: UUID;
  content: Content;
  embedding?: number[];
  roomId: UUID;
  worldId?: UUID;
  unique?: boolean;
  similarity?: number;
}
```

### Content

```typescript
interface Content {
  thought?: string; // Agent's internal thought
  text?: string; // Main text content
  actions?: string[]; // Actions to perform
  providers?: string[]; // Providers to use
  source?: string;
  inReplyTo?: UUID;
  attachments?: Media[];
  [key: string]: unknown;
}
```

## Entity System

### Entity

```typescript
interface Entity {
  id?: UUID;
  names: string[];
  metadata?: Metadata;
  agentId: UUID;
  components?: Component[];
}
```

### World & Room

```typescript
type World = {
  id: UUID;
  name?: string;
  agentId: UUID;
  serverId: string;
  metadata?: {
    ownership?: { ownerId: string };
    roles?: { [entityId: UUID]: Role };
  };
};

type Room = {
  id: UUID;
  source: string;
  type: ChannelType;
  worldId?: UUID;
};

enum ChannelType {
  SELF = 'SELF',
  DM = 'DM',
  GROUP = 'GROUP',
  FEED = 'FEED',
  THREAD = 'THREAD',
}
```

## Runtime Interface

### IAgentRuntime Key Methods

```typescript
interface IAgentRuntime {
  agentId: UUID;
  character: Character;

  // Core methods
  initialize(): Promise<void>;
  getService<T extends Service>(service: string): T | null;
  composeState(message: Memory, includeList?: string[]): Promise<State>;
  useModel<T extends ModelTypeName>(modelType: T, params: any): Promise<any>;
  processActions(message: Memory, responses: Memory[], state?: State): Promise<void>;

  // Settings
  getSetting(key: string): string | boolean | null | any;

  // Memory operations
  createMemory(memory: Memory, tableName?: string): Promise<void>;
  getMemories(params: { roomId: UUID; count?: number; unique?: boolean }): Promise<Memory[]>;
  searchMemories(params: {
    embedding: number[];
    roomId: UUID;
    match_threshold?: number;
  }): Promise<Memory[]>;

  // Entity operations
  createEntity(entity: Entity): Promise<UUID>;
  getEntityById(entityId: UUID): Promise<Entity | null>;

  // Task operations
  registerTaskWorker(taskHandler: TaskWorker): void;
  createTask(task: Task): Promise<UUID>;
  getTasks(params: { roomId?: UUID; tags?: string[] }): Promise<Task[]>;
}
```

## Essential Utilities

### UUID Helpers

```typescript
type UUID = `${string}-${string}-${string}-${string}-${string}`;

// Convert and validate UUIDs
function asUUID(id: string): UUID;
function stringToUuid(target: string | number): UUID;
function validateUuid(value: unknown): UUID | null;

// Generate deterministic UUIDs for entity-agent pairs
import { createUniqueUuid } from '@elizaos/core';
const uniqueId = createUniqueUuid(runtime, baseUserId);
```

### JSON/XML Parsing

```typescript
// Parse LLM responses
import { parseJSONObjectFromText, parseKeyValueXml, normalizeJsonString } from '@elizaos/core';

const data = parseJSONObjectFromText(llmResponse);
const kvData = parseKeyValueXml(xmlResponse);
```

### Text Processing

```typescript
import {
  truncateToCompleteSentence,
  splitChunks,
  trimTokens,
  parseBooleanFromText,
} from '@elizaos/core';

// Smart text truncation
const truncated = truncateToCompleteSentence(text, maxLength);

// Token-aware trimming
const trimmed = await trimTokens(prompt, maxTokens, runtime);
```

### Entity Resolution

```typescript
import { findEntityByName, getEntityDetails, formatEntities } from '@elizaos/core';

// LLM-powered entity resolution
const entity = await findEntityByName(runtime, message, state);

// Get entity details with components
const details = await getEntityDetails({ runtime, roomId });
```

## Action Chaining

### ActionResult & ActionContext

```typescript
interface ActionResult {
  values?: { [key: string]: any };
  data?: { [key: string]: any };
  text?: string;
}

interface ActionContext {
  previousResults?: ActionResult[];
  workingMemory?: WorkingMemory;
  updateMemory?: (key: string, value: any) => void;
  getMemory?: (key: string) => any;
}
```

### Chained Action Pattern

```typescript
const processAction: Action = {
  name: 'PROCESS_DATA',
  handler: async (runtime, message, state, options, callback) => {
    const context = options?.context as ActionContext;
    const data = context?.previousResults?.[0]?.values?.fetchedData;

    const processed = await processData(data);

    return {
      values: { processed },
      data: { internal: 'state' },
    };
  },
};
```

## Services System

### Service Implementation

```typescript
abstract class Service {
  static serviceName: string;
  abstract capabilityDescription: string;

  static async start(runtime: IAgentRuntime): Promise<Service>;
  abstract stop(): Promise<void>;
}

class MyService extends Service {
  static serviceName = 'my-service';

  static async start(runtime: IAgentRuntime): Promise<MyService> {
    const service = new MyService();
    // Initialize service
    return service;
  }

  async stop(): Promise<void> {
    // Cleanup
  }
}
```

## Provider System

### Provider Types & State Composition

```typescript
// Regular providers: included automatically
// Dynamic providers: only when requested (expensive)
// Private providers: must be explicitly included

// Default: all regular providers
const state = await runtime.composeState(message);

// Include specific providers only
const state = await runtime.composeState(message, ['TIME', 'FACTS']);
```

## Tasks System

### Task Management

```typescript
interface Task {
  id?: UUID;
  name: string;
  description: string;
  roomId?: UUID;
  tags: string[];
  metadata?: {
    updateInterval?: number; // For recurring tasks
    options?: { name: string; description: string }[]; // For choice tasks
  };
}

// Register worker
runtime.registerTaskWorker({
  name: 'SEND_REMINDER',
  execute: async (runtime, options, task) => {
    // Implementation
    await runtime.deleteTask(task.id); // One-time tasks
  },
});

// Create task
await runtime.createTask({
  name: 'SEND_REMINDER',
  description: 'Send reminder message',
  tags: ['reminder'],
  metadata: { scheduledFor: Date.now() + 86400000 },
});
```

## Database Operations

### Memory Management

```typescript
// Create memory with embedding
await runtime.createMemory(
  {
    entityId: userId,
    roomId: roomId,
    content: { text: 'Important information' },
    embedding: await runtime.useModel(ModelType.TEXT_EMBEDDING, { text: 'Important information' }),
  },
  'facts'
);

// Semantic search
const memories = await runtime.searchMemories({
  embedding: queryEmbedding,
  roomId: roomId,
  match_threshold: 0.7,
  count: 5,
});
```

### Participant Management

```typescript
// Add participant to room
await runtime.addParticipant(entityId, roomId);

// Set follow state
await runtime.setParticipantUserState(roomId, entityId, 'FOLLOWED');
// States: 'FOLLOWED' (active), 'MUTED' (ignored), null (mention only)
```

## Model Integration

### Model Types & Usage

```typescript
const ModelType = {
  TEXT_SMALL: 'TEXT_SMALL',
  TEXT_LARGE: 'TEXT_LARGE',
  TEXT_EMBEDDING: 'TEXT_EMBEDDING',
  TEXT_REASONING_LARGE: 'REASONING_LARGE',
} as const;

// Use model
const response = await runtime.useModel(ModelType.TEXT_LARGE, {
  prompt: 'Generate response',
  temperature: 0.7,
  maxTokens: 1000,
});
```

## Settings & Security

### Settings Management

```typescript
import { getWorldSettings, updateWorldSettings } from '@elizaos/core';

// Get world settings
const settings = await getWorldSettings(runtime, serverId);

// Update settings
await updateWorldSettings(runtime, serverId, updatedSettings);
```

### Encryption

```typescript
import { encryptStringValue, decryptStringValue, getSalt } from '@elizaos/core/settings';

// Encrypt sensitive data
const encrypted = encryptStringValue(secretValue, getSalt());
const decrypted = decryptStringValue(encrypted, getSalt());
```

## Testing

### E2E Runtime Tests

```typescript
export interface TestCase {
  name: string;
  fn: (runtime: IAgentRuntime) => Promise<void> | void;
}

// Test with real runtime
{
  name: 'Agent responds correctly',
  fn: async (runtime) => {
    const message = {
      id: `msg-${Date.now()}`,
      entityId: 'test-user',
      roomId: `room-${Date.now()}`,
      content: { text: 'hello' },
    };

    await runtime.processMessage(message);

    // Verify response
    const responses = await runtime.getMemories({ roomId: message.roomId });
    if (!responses.find(r => r.entityId === runtime.agentId)) {
      throw new Error('Agent did not respond');
    }
  }
}
```

## CLI Commands

### Essential Commands

```bash
# Project management
elizaos create [name] --type project|plugin|agent
elizaos start [--character path/to/character.json]
elizaos test

# Plugin management
elizaos plugins add <plugin-name>
elizaos plugins remove <plugin-name>
elizaos plugins list

# Agent management
elizaos agent list
elizaos agent start --path character.json
elizaos agent stop --name "Agent Name"

# Environment
elizaos env list
elizaos env edit-local
elizaos env reset

# Benchmarking
elizaos benchmark run --agent <id> --benchmark <id>
elizaos benchmark leaderboard
```

## Event System

### Key Events

```typescript
enum EventType {
  MESSAGE_RECEIVED = 'MESSAGE_RECEIVED',
  MESSAGE_SENT = 'MESSAGE_SENT',
  WORLD_JOINED = 'WORLD_JOINED',
  ENTITY_JOINED = 'ENTITY_JOINED',
  ACTION_STARTED = 'ACTION_STARTED',
  ACTION_COMPLETED = 'ACTION_COMPLETED',
}

// Handle events in plugin
const plugin: Plugin = {
  events: {
    [EventType.MESSAGE_RECEIVED]: [
      async (payload) => {
        const { runtime, message } = payload;
        // Handle event
      },
    ],
  },
};
```

## Performance & Production

### Database Adapter Patterns

```typescript
// Check adapter readiness
await adapter.isReady();
await adapter.waitForReady(30000);

// Get capabilities
const caps = await adapter.getCapabilities();
// { isReady: boolean; tables: string[]; hasVector: boolean }

// Embedding dimension management
await adapter.ensureEmbeddingDimension(1536); // OpenAI embeddings
```

### Connection Management

```typescript
// Singleton pattern for database connections
class PostgresManager {
  private static instance: PostgresManager;
  static getInstance(): PostgresManager;
}
```

## Development Principles

- **Real Implementation**: Never write stubs or placeholders - only production code
- **Action Chaining**: Design actions to work together via `ActionResult`
- **State Management**: Use providers for context, services for persistence
- **Memory Formation**: Use evaluators for post-processing and knowledge extraction
- **Error Handling**: Handle all error scenarios gracefully
- **Testing**: Use real runtime instances, not mocks

### The Scathing Review Mindset

When you claim something is done, immediately ask:

- "What would break if 1000 users hit this simultaneously?"
- "What happens when the AI model is down?"
- "How would a malicious user exploit this?"
- "What if the database connection fails mid-operation?"
- "How would this behave with unexpected Unicode characters?"
- "What if the user provides a 10MB input string?"
- "How does this handle network timeouts?"
- "What if two users trigger this action at exactly the same time?"

### Implementation Standards

**Never Accept These as "Good Enough":**

- Functions that don't handle errors
- Configurations that can't be changed without code changes
- User input validation using simple string operations
- Missing logging for debugging
- Hard-to-test code due to tight coupling
- Algorithms that work "most of the time"
- Features that only work in ideal conditions
- Code that requires manual setup or intervention

### The Relentless Improvement Cycle

1. **Implement** → Think you're done
2. **Review Critically** → Find 10+ issues
3. **Fix Issues** → Think you're done again
4. **Review Even More Critically** → Find 5+ more issues
5. **Fix Again** → Still not satisfied
6. **Final Critical Review** → Maybe acceptable for production

**Only after this cycle can you consider something truly complete.**

Remember: The difference between amateur and professional code is not the initial implementation - it's the number of times you've criticized and improved it before calling it finished.
