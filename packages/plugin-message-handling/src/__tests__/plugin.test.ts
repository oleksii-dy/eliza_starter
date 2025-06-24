import { describe, expect, it, mock, beforeEach, afterEach } from 'bun:test';
import { messageHandlingPlugin } from '../index';
import { IAgentRuntime, EventType, Memory, Content, UUID } from '@elizaos/core';
import { MockRuntime, createMockRuntime } from './test-utils';

describe('Message Handling Plugin Integration', () => {
  let mockRuntime: MockRuntime;

  beforeEach(() => {
    mock.restore();
    mockRuntime = createMockRuntime({
      getSetting: mock().mockReturnValue('medium'),
      getParticipantUserState: mock().mockResolvedValue('ACTIVE'),
      composeState: mock().mockResolvedValue({}),
    });
  });

  afterEach(() => {
    mock.restore();
  });

  it('should process message events through the plugin pipeline', async () => {
    const events = messageHandlingPlugin.events;
    expect(events).toBeDefined();

    // Verify critical event handlers exist
    expect(events?.[EventType.MESSAGE_RECEIVED]).toBeDefined();
    expect(events?.[EventType.MESSAGE_RECEIVED]?.length).toBeGreaterThan(0);

    const messageHandler = events?.[EventType.MESSAGE_RECEIVED]?.[0];
    if (!messageHandler) {
      throw new Error('MESSAGE_RECEIVED handler not found');
    }

    const mockMessage: Partial<Memory> = {
      id: 'msg-id' as UUID,
      roomId: 'room-id' as UUID,
      entityId: 'user-id' as UUID,
      content: {
        text: 'Hello, bot!',
      } as Content,
      createdAt: Date.now(),
    };

    const mockCallback = mock();

    // Test that the handler processes messages without throwing
    await expect(
      messageHandler({
        runtime: mockRuntime as unknown as IAgentRuntime,
        message: mockMessage as Memory,
        callback: mockCallback,
        source: 'test',
      })
    ).resolves.toBeUndefined();
  });

  it('should have all required actions registered', () => {
    const actions = messageHandlingPlugin.actions;
    expect(actions).toBeDefined();
    expect(actions?.length).toBeGreaterThan(0);

    if (!actions) {
      return;
    }

    // Verify core actions exist and have required properties
    const actionNames = actions.map((a) => a.name);
    expect(actionNames).toContain('REPLY');
    expect(actionNames).toContain('NONE');
    expect(actionNames).toContain('FOLLOW_ROOM');
    expect(actionNames).toContain('UNFOLLOW_ROOM');
    expect(actionNames).toContain('MUTE_ROOM');
    expect(actionNames).toContain('UNMUTE_ROOM');

    // Verify each action has required handler and validate functions
    actions.forEach((action) => {
      expect(typeof action.handler).toBe('function');
      expect(typeof action.validate).toBe('function');
    });
  });

  it('should have all required providers registered', () => {
    const providers = messageHandlingPlugin.providers;
    expect(providers).toBeDefined();
    expect(providers?.length).toBeGreaterThan(0);

    if (!providers) {
      return;
    }

    // Verify core providers exist
    const providerNames = providers.map((p) => p.name);
    expect(providerNames).toContain('TIME');
    expect(providerNames).toContain('RECENT_MESSAGES');
    expect(providerNames).toContain('CHARACTER');
    expect(providerNames).toContain('ACTIONS');
    expect(providerNames).toContain('ATTACHMENTS');

    // Verify each provider has required get function
    providers.forEach((provider) => {
      expect(typeof provider.get).toBe('function');
    });
  });

  it('should integrate with runtime event system', async () => {
    // Test that plugin events can be registered with runtime
    const events = messageHandlingPlugin.events;
    let registeredCount = 0;

    // Mock registerEvent to count registrations
    mockRuntime.registerEvent = mock().mockImplementation(() => {
      registeredCount++;
    });

    // Simulate plugin initialization
    if (events) {
      Object.entries(events).forEach(([eventType, handlers]) => {
        handlers.forEach((handler) => {
          mockRuntime.registerEvent(eventType, handler);
        });
      });
    }

    expect(registeredCount).toBeGreaterThan(0);
    expect(mockRuntime.registerEvent).toHaveBeenCalled();
  });

  it('should handle plugin lifecycle correctly', async () => {
    // Test that plugin can be initialized and used
    const runtime = mockRuntime as unknown as IAgentRuntime;

    // Register providers
    if (messageHandlingPlugin.providers) {
      for (const provider of messageHandlingPlugin.providers) {
        // Mock functions don't return promises, so we just call them
        runtime.registerProvider(provider);
      }
    }

    // Register actions
    if (messageHandlingPlugin.actions) {
      for (const action of messageHandlingPlugin.actions) {
        // Mock functions don't return promises, so we just call them
        runtime.registerAction(action);
      }
    }

    expect(mockRuntime.registerProvider).toHaveBeenCalled();
    expect(mockRuntime.registerAction).toHaveBeenCalled();
  });
});
