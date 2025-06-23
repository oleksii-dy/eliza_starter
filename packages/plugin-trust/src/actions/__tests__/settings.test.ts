import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import type { IAgentRuntime, Memory, State } from '@elizaos/core';
import { ChannelType, ModelType } from '@elizaos/core';
import type { UUID } from '@elizaos/core';
import { updateSettingsAction } from '../../../../plugin-secrets-manager/src/actions/settings';

// Mock the @elizaos/core module
vi.mock('@elizaos/core', async () => {
  const actual = await vi.importActual('@elizaos/core');
  return {
    ...actual,
    findWorldsForOwner: vi.fn(),
    composePrompt: vi.fn().mockReturnValue('test prompt'),
    composePromptFromState: vi.fn().mockReturnValue('test prompt'),
    parseJSONObjectFromText: vi.fn().mockReturnValue({ text: 'test response' }),
    createUniqueUuid: vi.fn().mockReturnValue('world-1'),
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
          value: null,
        },
      },
    },
  };

  return {
    agentId: 'test-agent' as UUID,
    getWorld: vi.fn().mockResolvedValue(mockWorld),
    updateWorld: vi.fn().mockResolvedValue(true),
    useModel: vi.fn(),
  } as any;
};

const createMockMemory = (
  text: string,
  entityId: UUID,
  channelType: ChannelType = ChannelType.DM
): Memory =>
  ({
    entityId,
    content: {
      text,
      channelType,
      serverId: 'server-1',
    },
    roomId: 'room-1' as UUID,
  }) as Memory;

const createMockState = (text: string): State =>
  ({
    values: { content: text },
    data: {},
    text,
  }) as State;

describe('updateSettingsAction', () => {
  let runtime: IAgentRuntime;
  const testEntityId = 'entity-1' as UUID;

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
  });

  it('should update settings successfully', async () => {
    // Mock the extractSettingValues to return a setting
    // The extractValidSettings function looks for objects with keys matching worldSettings
    // So we need to return an object that has 'API_KEY' as a property
    (runtime.useModel as Mock).mockImplementation((modelType, params) => {
      if (modelType === ModelType.OBJECT_LARGE) {
        // Return an object that extractValidSettings can traverse
        return Promise.resolve({
          API_KEY: 'test-api-key-123',
        });
      }
      // For other model calls (success/failure responses)
      return Promise.resolve('Settings updated successfully');
    });

    // Mock getWorld to return updated settings after the update
    let getWorldCallCount = 0;
    (runtime.getWorld as Mock).mockImplementation(() => {
      getWorldCallCount++;
      if (getWorldCallCount <= 2) {
        // First two calls - return original settings
        return Promise.resolve({
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
        });
      } else {
        // Third call - return updated settings
        return Promise.resolve({
          id: 'world-1',
          serverId: 'server-1',
          metadata: {
            settings: {
              API_KEY: {
                name: 'API Key',
                description: 'API key for external service',
                required: true,
                value: 'test-api-key-123',
              },
            },
          },
        });
      }
    });

    const memory = createMockMemory('Set API_KEY to test-api-key-123', testEntityId);
    const state = createMockState('Set API_KEY to test-api-key-123');
    const callback = vi.fn();

    const result = await updateSettingsAction.handler(runtime, memory, state, {}, callback);

    // Check that updateWorld was called (this is what actually saves the settings)
    expect(runtime.updateWorld).toHaveBeenCalled();
    expect(result).toBeDefined();
    if (result && typeof result === 'object' && 'data' in result) {
      expect(result.data?.success).toBe(true);
      expect(result.data?.updatedSettings).toEqual([{ key: 'API_KEY', value: 'test-api-key-123' }]);
    }
    expect(callback).toHaveBeenCalled();
  });

  it('should validate the action correctly', async () => {
    const validMemory = createMockMemory('test', testEntityId, ChannelType.DM);
    const state = {} as State;

    // Should return true for DM channels when user has worlds with settings
    expect(await updateSettingsAction.validate(runtime, validMemory, state)).toBe(true);

    // Should return false for non-DM channels
    const invalidMemory = createMockMemory('test', testEntityId, ChannelType.GROUP);
    expect(await updateSettingsAction.validate(runtime, invalidMemory, state)).toBe(false);
  });

  it('should handle world not found', async () => {
    // Mock getWorld to return null (simulating no settings found)
    (runtime.getWorld as Mock).mockResolvedValue(null);

    const memory = createMockMemory('Set API_KEY to test', testEntityId);
    const state = createMockState('Set API_KEY to test');
    const callback = vi.fn();

    const result = await updateSettingsAction.handler(runtime, memory, state, {}, callback);

    expect(result).toBeDefined();
    if (result && typeof result === 'object' && 'data' in result) {
      expect(result.data?.error).toBe('NO_SETTINGS_STATE');
    }
    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.any(String),
        actions: expect.arrayContaining(['SETTING_UPDATE_ERROR']),
      })
    );
  });

  it('should handle no settings extracted', async () => {
    (runtime.useModel as Mock).mockImplementation((modelType) => {
      if (modelType === ModelType.OBJECT_LARGE) {
        // Return empty object - no settings extracted
        return Promise.resolve({});
      }
      return Promise.resolve('No settings found');
    });

    const memory = createMockMemory('Hello there', testEntityId);
    const state = createMockState('Hello there');
    const callback = vi.fn();

    const result = await updateSettingsAction.handler(runtime, memory, state, {}, callback);

    expect(result).toBeDefined();
    if (result && typeof result === 'object' && 'data' in result) {
      expect(result.data?.success).toBe(false);
    }
    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({
        actions: expect.arrayContaining(['SETTING_UPDATE_FAILED']),
      })
    );
  });
});
