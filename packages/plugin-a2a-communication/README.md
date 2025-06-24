# @elizaos/plugin-a2a-communication

An ElizaOS plugin to enable basic Agent-to-Agent (A2A) communication.

## Overview

This plugin provides actions and services necessary for agents within the ElizaOS framework to send messages to and receive messages from other agents. It defines a simple A2A messaging protocol and uses an in-memory message bus for agents running in the same process.

## Features

-   Defines an A2A message structure (see `src/types.ts`).
-   `SEND_A2A_MESSAGE` action: Allows an agent (typically prompted by an LLM) to send a structured message to another agent.
-   `A2AService`: A service that manages the underlying message transport. The initial version uses a global in-memory EventEmitter, suitable for single-process multi-agent setups.
-   Event-driven message reception: Agents with this plugin will listen for A2A messages directed to them and can react accordingly.

## A2A Message Protocol

Messages generally include:
-   `protocol_version`
-   `message_id` (UUID)
-   `timestamp`
-   `sender_agent_id` (UUID)
-   `receiver_agent_id` (UUID)
-   `conversation_id` (optional UUID)
-   `message_type` (e.g., `TASK_REQUEST`, `TASK_RESPONSE`, `INFO_SHARE`, `ACK`)
-   `payload` (JSON object, content varies by `message_type`)

Refer to `src/types.ts` for detailed schemas.

## Configuration

This plugin currently has minimal configuration:

-   `A2A_MESSAGE_BUS_TYPE`: (Optional) Defaults to `"in-memory"`. Future versions might support other bus types like Redis for multi-process communication.

## Usage

### Sending a Message

An agent's LLM can decide to use the `SEND_A2A_MESSAGE` action. The LLM needs to provide the `receiver_agent_id`, `message_type`, and the `payload`.

Example of an LLM output to trigger the action:

```json
{
  "action": "SEND_A2A_MESSAGE",
  "options": {
    "receiver_agent_id": "agent-uuid-target-001",
    "message_type": "TASK_REQUEST",
    "payload": {
      "task_name": "GENERATE_REPORT",
      "parameters": { "data_source": "/shared/data.csv" }
    },
    "conversation_id": "conv-uuid-123"
  }
}
```

### Receiving a Message

The plugin's `init` function sets up a listener using the `A2AService`. When an A2A message is received for the current agent, an event `a2a_message_received:<agentId>` is emitted on the agent's runtime. The plugin logs the received message and sends an ACK.

Further processing of the received message (e.g., feeding it to the LLM, triggering other actions) would typically be implemented by adding more sophisticated logic to the event handler or by other plugins designed to react to these A2A messages.

## Development

### Build

```bash
bun run build
```

### Test

```bash
bun test
```

Unit tests are located in `src/__tests__`.

## Asynchronous Task Handling

The `A2AService` includes an in-memory task queue. When a `TASK_REQUEST` is received:
1.  It's added to the receiving agent's local queue.
2.  An immediate `ACK` (with status `TASK_QUEUED`) is sent back to the requester.
3.  A background task processor in `A2AService` dequeues tasks and emits a local `PROCESS_A2A_TASK_EVENT` on the agent's runtime.
4.  The plugin's `init` function sets up a listener for `PROCESS_A2A_TASK_EVENT`. This handler is responsible for the actual task execution (e.g., LLM calls, using other actions) and sending the final `TASK_RESPONSE`.

This setup allows agents to acknowledge tasks quickly and process them asynchronously without blocking further message reception.

## Future Enhancements & Distributed Communication

The current in-memory message bus and task queue are suitable for agents running within a **single Node.js process**. For true multi-process or distributed agent communication and task management, the following enhancements are envisioned:

1.  **Pluggable Message Bus Backend for `A2AService`**:
    *   **Concept**: Refactor `A2AService` to use an `IMessageBusAdapter` interface. This would allow different messaging technologies to be plugged in.
        ```typescript
        // Conceptual interface (details in scratchpad.md or src/types.ts)
        interface IMessageBusAdapter {
          publish(topic: string, message: A2AMessage): Promise<void>;
          subscribe(topic: string, handler: (message: A2AMessage) => void): Promise<void>;
          // ... connect, disconnect, unsubscribe ...
        }
        ```
    *   **Configuration**: The plugin would be configured with the desired bus type (e.g., `A2A_BUS_TYPE: "redis"`) and its connection parameters.
    *   **Example: Redis Adapter**:
        *   Uses a Redis client (e.g., `ioredis`).
        *   `publish`: Publishes messages to a Redis channel, e.g., `a2a:agent:<receiver_agent_id>`.
        *   `subscribe`: Subscribes to the agent's specific Redis channel.
    *   Other potential backends: RabbitMQ, NATS, Kafka.

2.  **Distributed Task Queues**:
    *   If using an external message broker that also supports persistent queues (like RabbitMQ or Redis with lists/streams), the agent's task queue could also be moved to this external system. This would provide better scalability and resilience for task management.

3.  **Agent Discovery/Registry**:
    *   In a distributed environment, agents need a way to discover each other and their "addresses" (e.g., message bus topics or API endpoints). A central agent registry service could manage this. This is a broader ElizaOS architectural consideration.

4.  **Enhanced A2A Protocol**:
    *   Richer status updates (e.g., `TASK_IN_PROGRESS` with progress details).
    *   Support for `CANCEL_TASK` messages.
    *   Standardized error reporting within `TASK_RESPONSE` payloads.

5.  **Standardized Task Ontologies**:
    *   Defining common `task_name` values and `payload` structures for frequent inter-agent operations (e.g., `CODE_GENERATION_REQUEST`, `CONTRACT_AUDIT_REQUEST`) would improve interoperability between different agent types and teams.

These enhancements would enable `plugin-a2a-communication` to support more complex and scalable multi-agent systems within ElizaOS.

---

*This plugin is part of the ElizaOS project.*
