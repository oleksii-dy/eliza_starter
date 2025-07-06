---
sidebar_position: 3
title: Services System
description: Understanding ElizaOS services - core components that enable AI agents to interact with external platforms
keywords: [services, platforms, integration, Discord, Twitter, Telegram, communication, API]
image: /img/services.jpg
---

# 🔌 Services

Services are core components in Eliza that enable AI agents to interact with external platforms and services. Each service provides a specialized interface for communication while maintaining consistent agent behavior across different platforms.

---

## Core Service Types

The ElizaOS core package defines the following service types in the `ServiceTypeRegistry`:

| Service Type                | Constant                  | Description                            |
| --------------------------- | ------------------------- | -------------------------------------- |
| **TRANSCRIPTION**           | `transcription`           | Audio-to-text transcription services   |
| **VIDEO**                   | `video`                   | Video processing and analysis          |
| **BROWSER**                 | `browser`                 | Web browser automation and interaction |
| **PDF**                     | `pdf`                     | PDF document processing and extraction |
| **REMOTE_FILES**            | `aws_s3`                  | Remote file storage (e.g., AWS S3)     |
| **WEB_SEARCH**              | `web_search`              | Web search capabilities                |
| **EMAIL**                   | `email`                   | Email integration and management       |
| **TEE**                     | `tee`                     | Trusted Execution Environment services |
| **TASK**                    | `task`                    | Task management and scheduling         |
| **WALLET**                  | `wallet`                  | Cryptocurrency wallet interactions     |
| **LP_POOL**                 | `lp_pool`                 | Liquidity pool management              |
| **TOKEN_DATA**              | `token_data`              | Token information and analytics        |
| **DATABASE_MIGRATION**      | `database_migration`      | Database migration management          |
| **PLUGIN_MANAGER**          | `PLUGIN_MANAGER`          | Plugin lifecycle management            |
| **PLUGIN_CONFIGURATION**    | `PLUGIN_CONFIGURATION`    | Plugin configuration services          |
| **PLUGIN_USER_INTERACTION** | `PLUGIN_USER_INTERACTION` | Plugin user interaction handling       |

## Communication Services (via Plugins)

Communication with external platforms is provided through plugins, not core services:

| Plugin    | Repository                                                                            | Features                                         |
| --------- | ------------------------------------------------------------------------------------- | ------------------------------------------------ |
| Discord   | [plugin-discord](https://github.com/elizaos-plugins/plugin-discord)                   | Voice channels, server management, moderation    |
| Twitter   | [plugin-twitter](https://github.com/elizaos-plugins/plugin-twitter)                   | Post scheduling, timeline monitoring, engagement |
| Telegram  | [plugin-telegram](https://github.com/elizaos-plugins/plugin-telegram)                 | Bot API, group chat, media handling              |
| Direct    | [plugin-direct](https://github.com/elizaOS/eliza/tree/develop/packages/plugin-direct) | REST endpoints, web integration                  |
| GitHub    | [plugin-github](https://github.com/elizaos-plugins/plugin-github)                     | Repository management, issues, PRs               |
| Slack     | [plugin-slack](https://github.com/elizaos-plugins/plugin-slack)                       | Channel management, workspace tools              |
| Lens      | [plugin-lens](https://github.com/elizaos-plugins/plugin-lens)                         | Web3 social networking                           |
| Farcaster | [plugin-farcaster](https://github.com/elizaos-plugins/plugin-farcaster)               | Decentralized social platform                    |
| Auto      | [plugin-auto](https://github.com/elizaos-plugins/plugin-auto)                         | Task automation and scheduling                   |

---

## System Overview

Services serve as bridges between Eliza agents and various platforms, providing core capabilities:

1. **Message Processing**

   - Platform-specific message formatting and delivery
   - Media handling and attachments via [`Memory`](/api/interfaces/Memory) objects
   - Reply threading and context management
   - Support for different content types

2. **State & Memory Management**

   - Each service maintains independent state to prevent cross-platform contamination
   - Integrates with runtime memory managers for different types of content:
   - Messages processed by one service don't automatically appear in other services' contexts
   - [`State`](/api/interfaces/State) persists across agent restarts through the database adapter

3. **Platform Integration**
   - Authentication and API compliance
   - Event processing and webhooks
   - Rate limiting and cache management
   - Platform-specific feature support

## Service Configuration

Services can be configured through the service's `config` property, which extends the `Metadata` type:

```typescript
import { Service, Metadata, IAgentRuntime } from '@elizaos/core';

interface MyServiceConfig extends Metadata {
  apiKey: string;
  endpoint?: string;
  timeout?: number;
}

export class MyService extends Service {
  config?: MyServiceConfig;

  constructor(runtime: IAgentRuntime, config: MyServiceConfig) {
    super(runtime);
    this.config = config;
  }
}
```

### Extending the ServiceTypeRegistry

Plugins can extend the core service types through module augmentation:

```typescript
// In your plugin
declare module '@elizaos/core' {
  interface ServiceTypeRegistry {
    MY_CUSTOM_SERVICE: 'my_custom_service';
  }
}

// Now you can use your custom service type
const myService = runtime.getService('my_custom_service');
```

## Service Implementation

Each service manages its own:

- Platform-specific message formatting and delivery
- Event processing and webhooks
- Authentication and API integration
- Message queueing and rate limiting
- Media handling and attachments
- State management and persistence

Example of a basic service implementation:

```typescript
import { Service, IAgentRuntime, ServiceType } from '@elizaos/core';

export class CustomService extends Service {
  static serviceType = ServiceType.TRANSCRIPTION; // Use core service type
  capabilityDescription = 'The agent is able to transcribe audio to text';

  constructor(protected runtime: IAgentRuntime) {
    super();
    // Initialize service
  }

  static async start(runtime: IAgentRuntime): Promise<CustomService> {
    const service = new CustomService(runtime);
    // Additional initialization if needed
    return service;
  }

  async stop(): Promise<void> {
    // Cleanup resources
  }
}
```

### Using the ServiceBuilder Pattern

The core package provides a `ServiceBuilder` for type-safe service creation:

```typescript
import {
  ServiceBuilder,
  createService,
  defineService,
  IAgentRuntime,
  ServiceType,
} from '@elizaos/core';

// Method 1: Using ServiceBuilder directly
const MyService = new ServiceBuilder(ServiceType.WEB_SEARCH)
  .withDescription('Custom web search service')
  .withStart(async (runtime: IAgentRuntime) => {
    // Initialize and return service instance
    return new MySearchService(runtime);
  })
  .withStop(async () => {
    // Cleanup logic
  })
  .build();

// Method 2: Using createService helper
const MyService2 = createService(ServiceType.PDF)
  .withDescription('PDF processing service')
  .withStart(async (runtime) => new MyPdfService(runtime))
  .build();

// Method 3: Using defineService for complete type safety
const MyService3 = defineService({
  serviceType: ServiceType.EMAIL,
  description: 'Email integration service',
  start: async (runtime) => new MyEmailService(runtime),
  stop: async () => {
    // Optional cleanup
  },
});
```

### Runtime Integration

Services interact with the agent runtime through the [`IAgentRuntime`](api/interfaces/IAgentRuntime/) interface, which provides:

- Memory managers for different types of data storage
- Service access for capabilities like transcription or image generation
- State management and composition
- Message processing and action handling

### Memory System Integration

Services use the runtime's database methods to persist conversation data (source: [`memory.ts`](/api/interfaces/Memory)).

- Chat messages stored via `createMemory()`
- File attachments stored as memories with attachment metadata
- Media descriptions stored as part of memory content

<details>
<summary>See example</summary>
```typescript
// Store a new message
await runtime.createMemory({
    id: messageId,
    content: { text: message.content },
    userId: userId,
    roomId: roomId,
    agentId: runtime.agentId
}, 'messages');

// Retrieve recent messages
const recentMessages = await runtime.getMemories({
roomId: roomId,
count: 10,
tableName: 'messages'
});

```
</details>


---

## FAQ

### What can services actually do?

Services handle platform-specific communication (like Discord messages or Twitter posts), manage memories and state, and execute actions like processing media or handling commands. Each service adapts these capabilities to its platform while maintaining consistent agent behavior.

### Can multiple services be used simultaneously?
Yes, Eliza supports running multiple services concurrently while maintaining consistent agent behavior across platforms.

### How are service-specific features handled?
Each service implements platform-specific features through its capabilities system, while maintaining a consistent interface for the agent.

### How do services handle rate limits?
Services implement platform-specific rate limiting with backoff strategies and queue management.

### How is service state managed?
Services maintain their own connection state while integrating with the agent's runtime database adapter and memory / state management system.

### How do services handle messages?

Services translate platform messages into Eliza's internal format, process any attachments (images, audio, etc.), maintain conversation context, and manage response queuing and rate limits.

### How are messages processed across services?
Each service processes messages independently in its platform-specific format, while maintaining conversation context through the shared memory system. V2 improves upon this architecture.

### How is state managed between services?
Each service maintains separate state to prevent cross-contamination, but can access shared agent state through the runtime.


### How do services integrate with platforms?

Each service implements platform-specific authentication, API compliance, webhook handling, and follows the platform's rules for rate limiting and content formatting.

### How do services manage memory?

Services use Eliza's memory system to track conversations, user relationships, and state, enabling context-aware responses and persistent interactions across sessions.
```
