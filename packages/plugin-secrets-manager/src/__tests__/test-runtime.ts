import {
  type IAgentRuntime,
  type Plugin,
  type Character,
  type Memory,
  type UUID,
  type World,
  type Component,
  type Room,
  Role,
  ChannelType,
  ModelType,
  AgentRuntime,
} from '@elizaos/core';
import envPlugin from '../index';
import sqlPlugin from '@elizaos/plugin-sql';

// Test settings
const TEST_SETTINGS = {
  ENCRYPTION_KEY: 'test-encryption-key-32-chars-long!!',
  ENCRYPTION_SALT: 'test-salt-12345',
};

/**
 * Create a test runtime with real plugin integration
 * This replaces mock-based testing with real runtime integration
 */
export async function createTestRuntime(options?: {
  character?: Partial<Character>;
  plugins?: Plugin[];
  includeEnvPlugin?: boolean;
}): Promise<IAgentRuntime> {
  // Create test character
  const character: Character = {
    id: '00000000-0000-0000-0000-000000000001' as UUID,
    name: 'TestAgent',
    bio: ['A test agent for running integration tests'],
    system: 'You are a test agent for integration testing',
    settings: {
      // Add any default settings for tests
      ...TEST_SETTINGS,
      ...options?.character?.settings,
    },
    ...options?.character,
  };

  // Create runtime - it will use in-memory database by default
  const runtime = new AgentRuntime({
    character,
    agentId: character.id,
    plugins: [
      sqlPlugin,
      ...(options?.includeEnvPlugin !== false ? [envPlugin] : []),
      ...(options?.plugins || []),
    ],
  });

  // Initialize runtime
  await runtime.initialize();

  return runtime;
}

/**
 * Clean up test runtime
 */
export async function cleanupTestRuntime(runtime: IAgentRuntime): Promise<void> {
  // Stop all services
  const services = runtime.services;
  if (services) {
    for (const [_, service] of services) {
      try {
        await service.stop();
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  }
}

/**
 * Create test entities for multi-level secret testing
 */
export async function createTestEntities(runtime: IAgentRuntime): Promise<{
  world: World;
  room: Room;
  user: Component;
}> {
  // Create test world
  const world: World = {
    id: `world-${Date.now()}` as UUID,
    name: 'Test World',
    agentId: runtime.agentId,
    serverId: 'test-server',
    metadata: {
      ownership: {
        ownerId: runtime.agentId,
      },
      roles: {
        [runtime.agentId]: Role.OWNER,
      },
    },
  };

  await runtime.createWorld(world);

  // Create test room
  const room: Room = {
    id: `room-${Date.now()}` as UUID,
    name: 'Test Room',
    agentId: runtime.agentId,
    source: 'test',
    type: ChannelType.GROUP,
    worldId: world.id,
    serverId: 'test-server',
    channelId: 'test-channel',
  };

  // Create test user component
  const user: Component = {
    id: `user-${Date.now()}` as UUID,
    entityId: `entity-${Date.now()}` as UUID,
    agentId: runtime.agentId,
    roomId: room.id,
    worldId: world.id,
    sourceEntityId: runtime.agentId,
    type: 'user',
    createdAt: Date.now(),
    data: {
      name: 'Test User',
      userId: `user-${Date.now()}`,
    },
  };

  await runtime.createComponent(user);

  return { world, room, user };
}

/**
 * Create a test memory
 */
export function createTestMemory(overrides: Partial<Memory> = {}): Memory {
  return {
    id: `memory-${Date.now()}` as UUID,
    entityId: `entity-${Date.now()}` as UUID,
    roomId: `room-${Date.now()}` as UUID,
    agentId: `agent-${Date.now()}` as UUID,
    content: {
      text: 'Test message',
      source: 'test',
    },
    createdAt: Date.now(),
    ...overrides,
  } as Memory;
}
