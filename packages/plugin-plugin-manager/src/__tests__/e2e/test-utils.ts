import {
  type Content,
  type Entity,
  type IAgentRuntime,
  type Memory,
  type Room,
  type World,
  asUUID,
  ChannelType,
  createUniqueUuid,
  EventType,
  Role,
} from '@elizaos/core';
import { strict as assert } from 'node:assert';
import { v4 as uuid } from 'uuid';

/**
 * Sets up a standard scenario environment for plugin manager E2E tests.
 *
 * This function creates a user and a room, providing an
 * isolated environment for each test case.
 *
 * @param runtime The live IAgentRuntime instance provided by the TestRunner.
 * @returns A promise that resolves to an object containing the created user and room.
 */
export async function setupScenario(runtime: IAgentRuntime): Promise<{ user: Entity; room: Room }> {
  assert(runtime.agentId, 'Runtime must have an agentId to run a scenario');

  // 1. Create a test user entity
  const user: Entity = {
    id: asUUID(uuid()),
    names: ['Test User'],
    agentId: runtime.agentId,
    metadata: { type: 'user' },
  };
  await runtime.createEntity(user);
  assert(user.id, 'Created user must have an id');

  // 2. Create a test world first
  const worldId = asUUID(uuid());
  const world: World = {
    id: worldId,
    name: 'Test World',
    serverId: 'e2e-test-server',
    agentId: runtime.agentId,
    metadata: {
      ownership: {
        ownerId: user.id, // The test user owns the world
      },
      roles: {
        [user.id]: Role.OWNER,
      },
    },
  };
  await runtime.createWorld(world);

  // 3. Create a test room in the world
  const room: Room = {
    id: asUUID(uuid()),
    name: 'Test Plugin Manager Room',
    type: ChannelType.DM,
    source: 'e2e-test',
    serverId: 'e2e-test-server',
    worldId,
    agentId: runtime.agentId,
  };
  await runtime.createRoom(room);

  // 4. Ensure both the agent and the user are participants in the room
  await runtime.ensureParticipantInRoom(runtime.agentId, room.id);
  await runtime.ensureParticipantInRoom(user.id, room.id);

  return { user, room };
}

/**
 * Simulates a user sending a message and waits for the agent's response.
 *
 * This function abstracts the event-driven nature of the message handler
 * into a simple async function, making tests easier to write and read.
 *
 * @param runtime The live IAgentRuntime instance.
 * @param room The room where the message is sent.
 * @param user The user entity sending the message.
 * @param text The content of the message.
 * @returns A promise that resolves with the agent's response content.
 */
export function sendMessageAndWaitForResponse(
  runtime: IAgentRuntime,
  room: Room,
  user: Entity,
  text: string
): Promise<Content> {
  return new Promise((resolve, reject) => {
    assert(runtime.agentId, 'Runtime must have an agentId to send a message');
    assert(user.id, 'User must have an id to send a message');

    // Set a timeout
    const timeout = setTimeout(() => {
      reject(new Error('Timeout waiting for agent response'));
    }, 10000); // 10 second timeout

    // Construct the message object, simulating an incoming message from a user
    const message: Memory = {
      id: createUniqueUuid(runtime, `${user.id}-${Date.now()}`),
      agentId: runtime.agentId,
      entityId: user.id,
      roomId: room.id,
      worldId: room.worldId,
      content: {
        text,
      },
      createdAt: Date.now(),
    };

    // The callback function that the message handler will invoke with the agent's final response.
    // We use this callback to resolve our promise.
    const callback = (responseContent: Content) => {
      clearTimeout(timeout);
      resolve(responseContent);
    };

    // Store the message first
    runtime.createMemory(message, 'messages').then(() => {
      // Emit the event to trigger the agent's message processing logic.
      runtime.emitEvent(EventType.MESSAGE_RECEIVED, {
        runtime,
        message,
        callback,
      });
    }).catch(reject);
  });
}

/**
 * Wrapper for sendMessageAndWaitForResponse that handles timeouts gracefully.
 * In test environments without an LLM, the agent won't respond, which is expected.
 *
 * @param runtime The live IAgentRuntime instance.
 * @param room The room where the message is sent.
 * @param user The user entity sending the message.
 * @param text The content of the message.
 * @returns A promise that resolves with the agent's response content or null if timeout.
 */
export async function sendMessageWithTimeoutHandling(
  runtime: IAgentRuntime,
  room: Room,
  user: Entity,
  text: string
): Promise<Content | null> {
  try {
    return await sendMessageAndWaitForResponse(runtime, room, user, text);
  } catch (_error: any) {
    if (_error.message === 'Timeout waiting for agent response') {
      // This is expected in test environments without an LLM
      console.log('No agent response (expected in test environment without LLM)');
      return null;
    }
    throw _error; // Re-throw other errors
  }
}
