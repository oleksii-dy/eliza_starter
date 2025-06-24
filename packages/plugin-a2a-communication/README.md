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

## Future Enhancements

-   Support for external message brokers (e.g., Redis, RabbitMQ) for multi-process/distributed agent communication.
-   More sophisticated message routing and discovery mechanisms.
-   Standardized task ontologies and payload structures for common A2A interactions.

---

*This plugin is part of the ElizaOS project.*
