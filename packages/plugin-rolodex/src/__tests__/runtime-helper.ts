/**
 * Real runtime test helper for integration testing
 * Uses actual ElizaOS runtime instead of mocks
 */

import { 
  Character,
  stringToUuid,
  type Plugin,
  type UUID,
  type Memory,
  type IAgentRuntime,
  AgentRuntime,
  type IDatabaseAdapter,
} from '@elizaos/core';
import { rolodexPlugin } from '../index';

// Import sql plugin to get database adapter
import sqlPlugin from '@elizaos/plugin-sql';

// Test character configuration
const testCharacter: Character = {
  name: 'Test Agent',
  username: 'test-agent',
  bio: ['A test agent for rolodex plugin testing'],
  system: 'You are a helpful assistant for testing the rolodex plugin.',
  settings: {
    model: 'gpt-4o-mini',
    temperature: 0.3,
  },
  plugins: ['rolodex'],
};

export interface TestRuntimeOptions {
  character?: Partial<Character>;
  plugins?: Plugin[];
  testName?: string;
}

/**
 * Creates a real runtime instance for testing
 */
export async function createTestRuntime(options: TestRuntimeOptions = {}): Promise<IAgentRuntime> {
  const testName = options.testName || `rolodex-test-${Date.now()}`;
  
  // Merge character options
  const character: Character = {
    ...testCharacter,
    ...options.character,
    id: options.character?.id || stringToUuid(`test-agent-${testName}`),
  };

  // Create runtime with SQL plugin for database and rolodex plugin
  const runtime = new AgentRuntime({
    character,
    plugins: [sqlPlugin, rolodexPlugin, ...(options.plugins || [])],
    conversationLength: 10,
  });

  // Initialize runtime
  await runtime.initialize();

  return runtime;
}

/**
 * Creates a test message
 */
export function createTestMessage(
  runtime: IAgentRuntime,
  text: string,
  options: {
    entityId?: UUID;
    roomId?: UUID;
  } = {}
): Memory {
  return {
    id: stringToUuid(`msg-${Date.now()}`),
    entityId: options.entityId || stringToUuid('test-user'),
    agentId: runtime.agentId,
    roomId: options.roomId || stringToUuid('test-room'),
    content: {
      text,
      source: 'test',
    },
    createdAt: Date.now(),
  };
}

/**
 * Waits for a condition to be true
 */
export async function waitForCondition(
  condition: () => boolean | Promise<boolean>,
  timeout: number = 5000,
  interval: number = 100
): Promise<void> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  
  throw new Error('Condition not met within timeout');
}

/**
 * Processes a message and waits for completion
 */
export async function processMessageAndWait(
  runtime: IAgentRuntime,
  message: Memory,
  waitTime: number = 2000
): Promise<void> {
  // Cast to any to access processMessage which exists on AgentRuntime but not in interface
  await (runtime as any).processMessage(message);
  await new Promise(resolve => setTimeout(resolve, waitTime));
}

/**
 * Cleanup function to close database connections
 */
export async function cleanupRuntime(runtime: IAgentRuntime): Promise<void> {
  // Stop all services
  const services = runtime.getAllServices();
  for (const [name, service] of services) {
    try {
      await service.stop();
    } catch (error) {
      console.error(`Error stopping service ${name}:`, error);
    }
  }

  // Close database connection
  await runtime.stop();
}

/**
 * Test helper to get service from runtime
 */
export function getService<T>(runtime: IAgentRuntime, serviceName: string): T {
  const service = runtime.getService(serviceName);
  if (!service) {
    throw new Error(`Service ${serviceName} not found`);
  }
  return service as T;
} 