---
sidebar_position: 17
title: Event System
description: Complete guide to the ElizaOS event system for handling runtime events and lifecycle hooks
keywords: [events, event system, handlers, lifecycle, hooks, EventType, runtime events]
---

# Event System

The ElizaOS Event System provides a powerful mechanism for handling runtime events, lifecycle hooks, and inter-component communication. It enables plugins and components to react to system-wide events and coordinate behaviors across the agent runtime.

## Overview

The event system is built around a publisher-subscriber pattern where:

- **Publishers** emit events when significant actions occur
- **Subscribers** register handlers to react to specific events
- **The runtime** manages event flow and ensures handlers are called

## Core Concepts

### Event Types

ElizaOS defines standard event types that cover all major runtime activities:

```typescript
export enum EventType {
  // World events
  WORLD_JOINED = 'WORLD_JOINED',
  WORLD_CONNECTED = 'WORLD_CONNECTED',
  WORLD_LEFT = 'WORLD_LEFT',

  // Entity events
  ENTITY_JOINED = 'ENTITY_JOINED',
  ENTITY_LEFT = 'ENTITY_LEFT',
  ENTITY_UPDATED = 'ENTITY_UPDATED',

  // Room events
  ROOM_JOINED = 'ROOM_JOINED',
  ROOM_LEFT = 'ROOM_LEFT',

  // Message events
  MESSAGE_RECEIVED = 'MESSAGE_RECEIVED',
  MESSAGE_SENT = 'MESSAGE_SENT',
  MESSAGE_DELETED = 'MESSAGE_DELETED',

  // Channel events
  CHANNEL_CLEARED = 'CHANNEL_CLEARED',

  // Voice events
  VOICE_MESSAGE_RECEIVED = 'VOICE_MESSAGE_RECEIVED',
  VOICE_MESSAGE_SENT = 'VOICE_MESSAGE_SENT',

  // Interaction events
  REACTION_RECEIVED = 'REACTION_RECEIVED',
  POST_GENERATED = 'POST_GENERATED',
  INTERACTION_RECEIVED = 'INTERACTION_RECEIVED',

  // Run events
  RUN_STARTED = 'RUN_STARTED',
  RUN_ENDED = 'RUN_ENDED',
  RUN_TIMEOUT = 'RUN_TIMEOUT',

  // Action events
  ACTION_STARTED = 'ACTION_STARTED',
  ACTION_COMPLETED = 'ACTION_COMPLETED',

  // Evaluator events
  EVALUATOR_STARTED = 'EVALUATOR_STARTED',
  EVALUATOR_COMPLETED = 'EVALUATOR_COMPLETED',

  // Model events
  MODEL_USED = 'MODEL_USED',
}
```

### Event Payloads

Each event type has a specific payload structure that provides relevant context:

```typescript
// Base payload for all events
export interface EventPayload {
  runtime: IAgentRuntime;
  source: string;
  onComplete?: () => void;
}

// Message event payload
export interface MessagePayload extends EventPayload {
  message: Memory;
  callback?: HandlerCallback;
  onComplete?: () => void;
}

// Entity event payload
export interface EntityPayload extends EventPayload {
  entityId: UUID;
  worldId?: UUID;
  roomId?: UUID;
  metadata?: {
    originalId: string;
    username: string;
    displayName?: string;
    [key: string]: any;
  };
}
```

## Using Events

### Registering Event Handlers

Event handlers can be registered in multiple ways:

#### 1. Via Plugin Events

The most common way is through plugin event handlers:

```typescript
import { Plugin, EventType, MessagePayload } from '@elizaos/core';

export const myPlugin: Plugin = {
  name: 'my-plugin',
  events: {
    [EventType.MESSAGE_RECEIVED]: [
      async (payload: MessagePayload) => {
        console.log('Message received:', payload.message.content.text);
        // React to the message
      },
    ],
    [EventType.ENTITY_JOINED]: [
      async (payload: EntityPayload) => {
        console.log('Entity joined:', payload.metadata?.username);
        // Welcome new entity
      },
    ],
  },
};
```

#### 2. Via Runtime Registration

You can also register handlers directly on the runtime:

```typescript
// Register a handler
runtime.registerEvent('MESSAGE_RECEIVED', async (payload) => {
  console.log('Handling message:', payload.message);
});

// Register custom event
runtime.registerEvent('CUSTOM_EVENT', async (payload) => {
  console.log('Custom event triggered:', payload);
});
```

### Emitting Events

Events can be emitted to trigger all registered handlers:

```typescript
// Emit a standard event
await runtime.emitEvent(EventType.MESSAGE_SENT, {
  runtime,
  source: 'discord',
  message: memory,
  callback,
});

// Emit multiple events
await runtime.emitEvent([EventType.RUN_STARTED, 'CUSTOM_RUN_EVENT'], {
  runtime,
  source: 'system',
  runId,
  messageId,
  roomId,
  entityId,
  startTime: Date.now(),
  status: 'started',
});
```

## Event Categories

### World Events

Triggered when agents join or leave worlds (servers/platforms):

```typescript
// Handle world joining
events: {
  [EventType.WORLD_JOINED]: [
    async (payload: WorldPayload) => {
      console.log(`Joined world: ${payload.world.name}`);
      console.log(`Available rooms: ${payload.rooms.length}`);
      console.log(`Active entities: ${payload.entities.length}`);
    }
  ]
}
```

### Message Events

Core events for message handling:

```typescript
events: {
  [EventType.MESSAGE_RECEIVED]: [
    async (payload: MessagePayload) => {
      const { message, runtime } = payload;

      // Analyze message
      if (message.content.text?.includes('help')) {
        // Trigger help response
        await runtime.speak(
          message.roomId,
          'How can I help you?',
          message.entityId
        );
      }
    }
  ],

  [EventType.MESSAGE_SENT]: [
    async (payload: MessagePayload) => {
      // Log outgoing messages
      console.log(`Sent: ${payload.message.content.text}`);
    }
  ]
}
```

### Lifecycle Events

Track action and evaluator execution:

```typescript
events: {
  [EventType.ACTION_STARTED]: [
    async (payload: ActionEventPayload) => {
      console.log(`Action ${payload.actionName} started`);
    }
  ],

  [EventType.ACTION_COMPLETED]: [
    async (payload: ActionEventPayload) => {
      const duration = Date.now() - (payload.startTime || 0);
      console.log(`Action ${payload.actionName} completed in ${duration}ms`);

      if (payload.error) {
        console.error(`Action failed:`, payload.error);
      }
    }
  ]
}
```

### Run Events

Monitor conversation processing:

```typescript
events: {
  [EventType.RUN_STARTED]: [
    async (payload: RunEventPayload) => {
      console.log(`Processing message ${payload.messageId}`);
    }
  ],

  [EventType.RUN_TIMEOUT]: [
    async (payload: RunEventPayload) => {
      console.error(`Run timeout after ${payload.duration}ms`);
      // Handle timeout recovery
    }
  ]
}
```

### Model Events

Track AI model usage:

```typescript
events: {
  [EventType.MODEL_USED]: [
    async (payload: ModelEventPayload) => {
      console.log(`Model: ${payload.provider} ${payload.type}`);
      console.log(`Tokens: ${payload.tokens?.total || 'unknown'}`);

      // Track usage for analytics
      await trackModelUsage({
        provider: payload.provider,
        type: payload.type,
        promptTokens: payload.tokens?.prompt,
        completionTokens: payload.tokens?.completion
      });
    }
  ]
}
```

## Advanced Patterns

### Event Chaining

Chain events for complex workflows:

```typescript
events: {
  [EventType.MESSAGE_RECEIVED]: [
    async (payload) => {
      // Process message
      const processed = await processMessage(payload.message);

      // Emit custom event for next stage
      await payload.runtime.emitEvent('MESSAGE_PROCESSED', {
        ...payload,
        processedData: processed
      });
    }
  ],

  MESSAGE_PROCESSED: [
    async (payload) => {
      // Continue processing chain
      await analyzeProcessedMessage(payload);
    }
  ]
}
```

### Conditional Handlers

Add logic to selectively handle events:

```typescript
events: {
  [EventType.MESSAGE_RECEIVED]: [
    async (payload) => {
      // Only handle messages from specific rooms
      if (payload.message.roomId === specialRoomId) {
        await handleSpecialMessage(payload);
      }
    },

    async (payload) => {
      // Only handle messages with attachments
      if (payload.message.content.attachments?.length) {
        await processAttachments(payload);
      }
    }
  ]
}
```

### Error Handling

Events are wrapped in error handling, but you should still be defensive:

```typescript
events: {
  [EventType.MESSAGE_RECEIVED]: [
    async (payload) => {
      try {
        await riskyOperation(payload);
      } catch (error) {
        console.error('Handler error:', error);

        // Emit error event
        await payload.runtime.emitEvent('HANDLER_ERROR', {
          ...payload,
          error: error.message,
          handler: 'riskyOperation'
        });
      }
    }
  ]
}
```

### Event Ordering

Multiple handlers for the same event execute in registration order:

```typescript
// Plugin 1 - Registers first
plugin1.events = {
  [EventType.MESSAGE_RECEIVED]: [async () => console.log('Handler 1')],
};

// Plugin 2 - Registers second
plugin2.events = {
  [EventType.MESSAGE_RECEIVED]: [async () => console.log('Handler 2')],
};

// Output order:
// Handler 1
// Handler 2
```

## Best Practices

### 1. Keep Handlers Focused

Each handler should have a single responsibility:

```typescript
// ✅ Good - Focused handlers
events: {
  [EventType.MESSAGE_RECEIVED]: [
    logMessageHandler,
    analyticsHandler,
    moderationHandler
  ]
}

// ❌ Bad - Doing too much
events: {
  [EventType.MESSAGE_RECEIVED]: [
    async (payload) => {
      // Logging
      console.log(payload);
      // Analytics
      await track(payload);
      // Moderation
      await moderate(payload);
      // Processing
      await process(payload);
    }
  ]
}
```

### 2. Avoid Blocking Operations

Use async operations and don't block the event loop:

```typescript
// ✅ Good - Non-blocking
events: {
  [EventType.MESSAGE_RECEIVED]: [
    async (payload) => {
      // Don't await if not necessary
      trackAsync(payload); // Fire and forget

      // Only await critical operations
      if (needsImmediate) {
        await criticalOperation(payload);
      }
    }
  ]
}

// ❌ Bad - Blocking
events: {
  [EventType.MESSAGE_RECEIVED]: [
    async (payload) => {
      // Unnecessary synchronous blocking
      const result = expensiveSyncOperation();
      await slowAsyncOperation(result);
    }
  ]
}
```

### 3. Handle Errors Gracefully

Always handle potential errors:

```typescript
events: {
  [EventType.MESSAGE_RECEIVED]: [
    async (payload) => {
      try {
        await processMessage(payload);
      } catch (error) {
        // Log error
        console.error(`Error processing message:`, error);

        // Don't throw - it would break other handlers
        // Instead, emit an error event if needed
        await payload.runtime.emitEvent('PROCESSING_ERROR', {
          ...payload,
          error
        });
      }
    }
  ]
}
```

### 4. Use Type Safety

Leverage TypeScript for type-safe event handling:

```typescript
import { EventType, EventHandler, MessagePayload, EntityPayload } from '@elizaos/core';

// Type-safe handler functions
const messageHandler: EventHandler<EventType.MESSAGE_RECEIVED> = async (payload) => {
  // payload is correctly typed as MessagePayload
  console.log(payload.message.content.text);
};

const entityHandler: EventHandler<EventType.ENTITY_JOINED> = async (payload) => {
  // payload is correctly typed as EntityPayload
  console.log(payload.metadata?.username);
};
```

## Custom Events

You can create custom events for your specific needs:

```typescript
// Define custom event payload
interface CustomEventPayload extends EventPayload {
  customData: string;
  timestamp: number;
}

// Register handler
runtime.registerEvent('CUSTOM_ANALYSIS_COMPLETE', async (payload: CustomEventPayload) => {
  console.log(`Analysis complete: ${payload.customData}`);
});

// Emit custom event
await runtime.emitEvent('CUSTOM_ANALYSIS_COMPLETE', {
  runtime,
  source: 'analyzer',
  customData: 'Analysis results here',
  timestamp: Date.now(),
});
```

## Platform-Specific Events

Some events may be platform-specific:

```typescript
// Platform prefix for custom events
export enum PlatformPrefix {
  DISCORD = 'DISCORD',
  TELEGRAM = 'TELEGRAM',
  TWITTER = 'TWITTER',
}

// Register platform-specific handler
runtime.registerEvent(`${PlatformPrefix.DISCORD}_VOICE_STATE_UPDATE`, async (payload) => {
  // Handle Discord-specific voice state changes
});
```

## Performance Considerations

### Event Handler Performance

- Keep handlers lightweight
- Offload heavy processing to queues or workers
- Use debouncing for high-frequency events
- Monitor handler execution time

### Memory Management

- Clean up event listeners when no longer needed
- Avoid storing large objects in event payloads
- Use weak references where appropriate

## Debugging Events

### Event Logging

Enable detailed event logging for debugging:

```typescript
// Log all events
runtime.registerEvent('*', async (payload) => {
  console.log(`Event: ${payload.source}`, payload);
});

// Log specific event types
const debugEvents = [EventType.MESSAGE_RECEIVED, EventType.ACTION_STARTED];
debugEvents.forEach((eventType) => {
  runtime.registerEvent(eventType, async (payload) => {
    console.debug(`[${eventType}]`, payload);
  });
});
```

### Event Tracing

Trace event flow through the system:

```typescript
events: {
  [EventType.MESSAGE_RECEIVED]: [
    async (payload) => {
      const traceId = generateTraceId();
      console.log(`[${traceId}] Message received`);

      // Pass trace ID through event chain
      await payload.runtime.emitEvent('CUSTOM_EVENT', {
        ...payload,
        traceId
      });
    }
  ]
}
```

## Integration Examples

### Analytics Integration

```typescript
events: {
  [EventType.MESSAGE_RECEIVED]: [
    async (payload) => {
      await analytics.track('message_received', {
        userId: payload.message.entityId,
        roomId: payload.message.roomId,
        platform: payload.source,
        messageLength: payload.message.content.text?.length || 0
      });
    }
  ],

  [EventType.MODEL_USED]: [
    async (payload) => {
      await analytics.track('model_usage', {
        provider: payload.provider,
        modelType: payload.type,
        tokenCount: payload.tokens?.total
      });
    }
  ]
}
```

### Monitoring Integration

```typescript
events: {
  [EventType.RUN_TIMEOUT]: [
    async (payload) => {
      await monitoring.alert('conversation_timeout', {
        severity: 'warning',
        runId: payload.runId,
        duration: payload.duration,
        roomId: payload.roomId
      });
    }
  ],

  [EventType.ACTION_COMPLETED]: [
    async (payload) => {
      if (payload.error) {
        await monitoring.alert('action_error', {
          severity: 'error',
          action: payload.actionName,
          error: payload.error.message
        });
      }
    }
  ]
}
```

## Summary

The ElizaOS Event System provides:

- **Standardized event types** for all runtime activities
- **Type-safe event handling** with TypeScript
- **Flexible registration** through plugins or runtime
- **Platform-agnostic design** with platform-specific extensions
- **Error resilience** with built-in error handling

Use events to:

- React to system activities
- Coordinate between components
- Implement cross-cutting concerns
- Build extensible integrations
- Monitor system behavior

The event system is fundamental to building responsive, modular agents that can adapt to various platforms and use cases.
