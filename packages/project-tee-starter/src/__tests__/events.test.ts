import { describe, expect, it, beforeEach } from 'bun:test';
import plugin from '../plugin';

describe('Plugin Events', () => {
  it('should have events defined', () => {
    expect(plugin.events).toBeDefined();
    if (plugin.events) {
      expect(Object.keys(plugin.events).length).toBeGreaterThan(0);
    }
  });

  it('should handle MESSAGE_RECEIVED event', async () => {
    if (plugin.events && plugin.events.MESSAGE_RECEIVED) {
      expect(Array.isArray(plugin.events.MESSAGE_RECEIVED)).toBe(true);
      expect(plugin.events.MESSAGE_RECEIVED.length).toBeGreaterThan(0);

      const messageHandler = plugin.events.MESSAGE_RECEIVED[0];
      expect(typeof messageHandler).toBe('function');

      // Define mock parameters for testing
      const mockParams = {
        message: {
          id: 'test-id',
          content: { text: 'Hello!' },
        },
        source: 'test',
        runtime: {},
      } as unknown as Parameters<typeof messageHandler>[0];

      // Call the event handler - this should not throw
      await expect(messageHandler(mockParams)).resolves.toBeUndefined();
    }
  });

  it('should handle VOICE_MESSAGE_RECEIVED event', async () => {
    if (plugin.events && plugin.events.VOICE_MESSAGE_RECEIVED) {
      expect(Array.isArray(plugin.events.VOICE_MESSAGE_RECEIVED)).toBe(true);
      expect(plugin.events.VOICE_MESSAGE_RECEIVED.length).toBeGreaterThan(0);

      const voiceHandler = plugin.events.VOICE_MESSAGE_RECEIVED[0];
      expect(typeof voiceHandler).toBe('function');

      // Define mock parameters for testing
      const mockParams = {
        message: {
          id: 'test-id',
          content: { text: 'Voice message!' },
        },
        source: 'test',
        runtime: {},
      } as unknown as Parameters<typeof voiceHandler>[0];

      // Call the event handler - this should not throw
      await expect(voiceHandler(mockParams)).resolves.toBeUndefined();
    }
  });

  it('should handle WORLD_CONNECTED event', async () => {
    if (plugin.events && plugin.events.WORLD_CONNECTED) {
      expect(Array.isArray(plugin.events.WORLD_CONNECTED)).toBe(true);
      expect(plugin.events.WORLD_CONNECTED.length).toBeGreaterThan(0);

      const connectedHandler = plugin.events.WORLD_CONNECTED[0];
      expect(typeof connectedHandler).toBe('function');

      // Define mock parameters for testing
      const mockParams = {
        world: {
          id: 'test-world-id',
          name: 'Test World',
        },
        rooms: [],
        entities: [],
        source: 'test',
        runtime: {},
      } as unknown as Parameters<typeof connectedHandler>[0];

      // Call the event handler - this should not throw
      await expect(connectedHandler(mockParams)).resolves.toBeUndefined();
    }
  });

  it('should handle WORLD_JOINED event', async () => {
    if (plugin.events && plugin.events.WORLD_JOINED) {
      expect(Array.isArray(plugin.events.WORLD_JOINED)).toBe(true);
      expect(plugin.events.WORLD_JOINED.length).toBeGreaterThan(0);

      const joinedHandler = plugin.events.WORLD_JOINED[0];
      expect(typeof joinedHandler).toBe('function');

      // Define mock parameters for testing
      const mockParams = {
        world: {
          id: 'test-world-id',
          name: 'Test World',
        },
        entity: {
          id: 'test-entity-id',
          name: 'Test Entity',
        },
        rooms: [],
        entities: [],
        source: 'test',
        runtime: {},
      } as unknown as Parameters<typeof joinedHandler>[0];

      // Call the event handler - this should not throw
      await expect(joinedHandler(mockParams)).resolves.toBeUndefined();
    }
  });
});
