import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { IAgentRuntime, Memory, State } from '@elizaos/core';
import { ChannelType } from '@elizaos/core';
import type { UUID } from '@elizaos/core';
import { settingsProvider } from '../../../../plugin-secrets-manager/src/providers/settings';

// Mock the @elizaos/core module
vi.mock('@elizaos/core', async () => {
  const actual = await vi.importActual('@elizaos/core');
  return {
    ...actual,
    findWorldsForOwner: vi.fn(),
    getWorldSettings: vi.fn(),
    logger: {
      info: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    },
  };
});

const createMockRuntime = (): IAgentRuntime => {
  const mockWorld = {
    id: 'world-1' as UUID,
    serverId: 'server-1',
    metadata: {
      settings: {
        API_KEY: {
          name: 'API Key',
          description: 'API key for external service',
          required: true,
          value: null,
        },
        WEBHOOK_URL: {
          name: 'Webhook URL',
          description: 'URL for webhook notifications',
          required: false,
          value: 'https://example.com/webhook',
        },
      },
    },
  };

  return {
    agentId: 'test-agent' as UUID,
    character: {
      name: 'TestAgent',
    },
    getRoom: vi.fn().mockResolvedValue({
      id: 'room-1',
      worldId: 'world-1',
      type: ChannelType.GROUP,
    }),
    getWorld: vi.fn().mockResolvedValue(mockWorld),
    updateWorld: vi.fn().mockResolvedValue(true),
    getSetting: vi.fn(),
  } as any;
};

const createMockMemory = (entityId: UUID, roomId: UUID = 'room-1' as UUID): Memory =>
  ({
    entityId,
    roomId,
    content: {
      text: 'test message',
    },
  }) as Memory;

const createMockState = (): State =>
  ({
    values: {},
    data: {},
    text: '',
    senderName: 'TestUser',
  }) as State;

describe('settingsProvider', () => {
  let runtime: IAgentRuntime;

  beforeEach(async () => {
    runtime = createMockRuntime();
    vi.clearAllMocks();

    // Set up the mocked functions
    const elizaCore = await import('@elizaos/core');
    (elizaCore.findWorldsForOwner as any) = vi.fn().mockResolvedValue([
      {
        id: 'world-1',
        serverId: 'server-1',
        metadata: {
          settings: {
            API_KEY: {
              name: 'API Key',
              description: 'API key for external service',
              required: true,
              value: null,
            },
          },
        },
      },
    ]);
    (elizaCore.getWorldSettings as any) = vi.fn().mockResolvedValue({
      API_KEY: {
        name: 'API Key',
        description: 'API key for external service',
        required: true,
        value: null,
      },
      WEBHOOK_URL: {
        name: 'Webhook URL',
        description: 'URL for webhook notifications',
        required: false,
        value: 'https://example.com/webhook',
      },
    });
  });

  it('should provide settings information for group channels', async () => {
    const memory = createMockMemory('entity-1' as UUID);
    const state = createMockState();

    const result = await settingsProvider.get(runtime, memory, state);

    expect(result).toBeDefined();
    expect(result.text).toContain('Current Configuration');
    expect(result.text).toContain('1 required settings still need configuration');
  });

  it('should handle missing world', async () => {
    (runtime.getWorld as any).mockResolvedValue(null);

    const memory = createMockMemory('entity-1' as UUID);
    const state = createMockState();

    const result = await settingsProvider.get(runtime, memory, state);

    expect(result.text).toContain('Error retrieving configuration information');
  });

  it('should handle DM channels for onboarding', async () => {
    // Mock room with DM type and worldId (for DM onboarding flow)
    (runtime.getRoom as any).mockResolvedValue({
      id: 'dm-room-1',
      worldId: 'world-1', // DM rooms can have worldId in onboarding flow
      type: ChannelType.DM,
    });

    const memory = createMockMemory('entity-1' as UUID, 'dm-room-1' as UUID);
    const state = createMockState();

    const result = await settingsProvider.get(runtime, memory, state);

    expect(result.text).toContain('PRIORITY TASK: Onboarding');
    expect(result.text).toContain('1 required settings');
  });

  it('should show all settings configured when complete', async () => {
    const elizaCore = await import('@elizaos/core');
    (elizaCore.getWorldSettings as any) = vi.fn().mockResolvedValue({
      API_KEY: {
        name: 'API Key',
        description: 'API key for external service',
        required: true,
        value: 'configured-key',
      },
      WEBHOOK_URL: {
        name: 'Webhook URL',
        description: 'URL for webhook notifications',
        required: false,
        value: 'https://example.com/webhook',
      },
    });

    const memory = createMockMemory('entity-1' as UUID);
    const state = createMockState();

    const result = await settingsProvider.get(runtime, memory, state);

    expect(result.text).toContain('All required settings are configured');
    expect(result.text).not.toContain('required settings still need configuration');
  });
});
