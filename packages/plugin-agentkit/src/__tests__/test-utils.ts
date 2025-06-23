import { vi } from 'vitest';
import type { IAgentRuntime as CoreIAgentRuntime, Memory, State, UUID } from '@elizaos/core';
import type { CustodialWallet } from '../types/wallet';
import type { IAgentRuntime } from '../types/core.d';

/**
 * Create a mock runtime for agentkit tests
 */
export function createMockRuntime(overrides: any = {}): IAgentRuntime {
  const mockDb = {
    execute: vi.fn().mockResolvedValue({ changes: 1 }),
    query: vi.fn().mockResolvedValue([]),
    all: vi.fn().mockResolvedValue([]),
    run: vi.fn().mockResolvedValue({ changes: 1 }),
    get: vi.fn().mockResolvedValue(null),
  };
  
  const baseRuntime = {
    agentId: 'test-agent-id' as UUID,
    character: overrides.character || {
      name: 'TestAgent',
      bio: ['A test agent'],
      messageExamples: []
      postExamples: []
      topics: []
      knowledge: []
      plugins: []
    },
    providers: []
    actions: []
    evaluators: []
    plugins: []
    services: new Map(),
    events: new Map(),
    routes: []
    
    // Database
    db: mockDb,
    databaseAdapter: {
      db: mockDb
    },
    
    // Core methods
    getSetting: vi.fn((key: string) => {
      const settings: Record<string, string> = {
        CDP_API_KEY_NAME: 'test-api-key',
        CDP_API_KEY_PRIVATE_KEY: 'test-private-key',
        CDP_AGENT_KIT_NETWORK: 'base-sepolia',
        ...(overrides.settings || {}),
      };
      return settings[key];
    }),
    useModel: vi.fn().mockResolvedValue('mock response'),
    composeState: vi.fn().mockResolvedValue({
      values: {},
      data: {},
      text: '',
    }),
    
    // Database methods
    getMemories: vi.fn().mockResolvedValue([]),
    createMemory: vi.fn().mockResolvedValue('test-memory-id' as UUID),
    
    // Service methods
    getService: vi.fn().mockReturnValue(null),
    
    // Logger
    logger: {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    },
    
    // Apply overrides
    ...overrides,
  };

  return baseRuntime as IAgentRuntime;
}

/**
 * Create a mock memory object for agentkit tests
 */
export function createMockMemory(overrides: Partial<Memory> = {}): Memory {
  return {
    id: 'memory-123' as UUID,
    entityId: 'entity-123' as UUID,
    agentId: 'agent-123' as UUID,
    roomId: 'room-123' as UUID,
    content: {
      text: 'test message',
      source: 'agentkit-test',
    },
    createdAt: Date.now(),
    unique: false,
    similarity: 0.9,
    ...overrides,
  };
}

/**
 * Create a mock state object for agentkit tests
 */
export function createMockState(overrides: Partial<State> = {}): State {
  return {
    values: {},
    data: {},
    text: '',
    ...overrides,
  };
}

/**
 * Create a mock custodial wallet for agentkit tests
 */
export function createMockWallet(overrides: Partial<CustodialWallet> = {}): CustodialWallet {
  return {
    id: 'wallet-123' as UUID,
    address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', // Use a real test address
    network: 'base-sepolia',
    name: 'Test Wallet',
    ownerId: 'user-123' as UUID,
    permissions: []
    status: 'active',
    createdAt: Date.now(),
    requiredTrustLevel: 50,
    isPool: false,
    metadata: {
      trustLevel: 50,
    },
    ...overrides,
  };
}