import { type IAgentRuntime, type Plugin, type UUID } from '@elizaos/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PluginManagerService } from '../../services/pluginManagerService.ts';

describe('Event Handler Management (Consolidated)', () => {
  let mockRuntime: IAgentRuntime;
  let pluginManager: PluginManagerService;

  beforeEach(() => {
    mockRuntime = {
      agentId: 'test-agent-id' as UUID,
      plugins: []
      events: new Map(),
      registerEvent: vi.fn((event: string, handler: Function) => {
        const handlers = mockRuntime.events.get(event) || [];
        handlers.push(handler as any);
        mockRuntime.events.set(event, handlers);
      }),
      unregisterEvent: vi.fn((event: string, handler: Function) => {
        const handlers = mockRuntime.events.get(event);
        if (handlers) {
          const filtered = handlers.filter((h: any) => h !== handler);
          if (filtered.length > 0) {
            mockRuntime.events.set(event, filtered);
          } else {
            mockRuntime.events.delete(event);
          }
        }
      }),
      emitEvent: vi.fn(async (event: string, data: any) => {
        // Mock event emission
        return Promise.resolve();
      }),
      // Add other necessary mocks
      actions: []
      providers: []
      evaluators: []
      services: new Map(),
      getService: vi.fn(() => null), // Mock getService to return null
    } as any;

    pluginManager = new PluginManagerService(mockRuntime);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should track and unregister event handlers correctly', async () => {
    const mockEventHandler = vi.fn();
    const testPlugin: Plugin = {
      name: 'test-plugin',
      description: 'Test plugin for event handler management',
      events: { 'test:event': [mockEventHandler] },
    };

    const pluginId = await pluginManager.registerPlugin(testPlugin);
    await pluginManager.loadPlugin({ pluginId });

    // Verify tracked
    const pluginState = pluginManager.getPlugin(pluginId);
    expect(pluginState?.components?.eventHandlers.get('test:event')?.has(mockEventHandler)).toBe(
      true
    );
    expect(mockRuntime.registerEvent).toHaveBeenCalledWith('test:event', mockEventHandler);

    // Unload and verify
    await pluginManager.unloadPlugin({ pluginId });
    expect((mockRuntime as any).unregisterEvent).toHaveBeenCalledWith(
      'test:event',
      mockEventHandler
    );
  });
});
