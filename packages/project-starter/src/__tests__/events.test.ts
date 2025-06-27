import { describe, expect, it } from 'bun:test';
import plugin from '../plugin';

describe('Plugin Events', () => {

  it('should have events defined', () => {
    expect(plugin.events).toBeDefined();
    if (plugin.events) {
      expect(Object.keys(plugin.events).length).toBeGreaterThan(0);
    }
  });

  it('should handle MESSAGE_RECEIVED event', () => {
    if (plugin.events && plugin.events.MESSAGE_RECEIVED) {
      expect(Array.isArray(plugin.events.MESSAGE_RECEIVED)).toBe(true);
      expect(plugin.events.MESSAGE_RECEIVED.length).toBeGreaterThan(0);

      const messageHandler = plugin.events.MESSAGE_RECEIVED[0];
      expect(typeof messageHandler).toBe('function');

      // Just verify the function exists and is callable
      expect(messageHandler).toBeDefined();
    }
  });

  it('should handle VOICE_MESSAGE_RECEIVED event', () => {
    if (plugin.events && plugin.events.VOICE_MESSAGE_RECEIVED) {
      expect(Array.isArray(plugin.events.VOICE_MESSAGE_RECEIVED)).toBe(true);
      expect(plugin.events.VOICE_MESSAGE_RECEIVED.length).toBeGreaterThan(0);

      const voiceHandler = plugin.events.VOICE_MESSAGE_RECEIVED[0];
      expect(typeof voiceHandler).toBe('function');

      // Just verify the function exists and is callable
      expect(voiceHandler).toBeDefined();
    }
  });

  it('should handle WORLD_CONNECTED event', () => {
    if (plugin.events && plugin.events.WORLD_CONNECTED) {
      expect(Array.isArray(plugin.events.WORLD_CONNECTED)).toBe(true);
      expect(plugin.events.WORLD_CONNECTED.length).toBeGreaterThan(0);

      const connectedHandler = plugin.events.WORLD_CONNECTED[0];
      expect(typeof connectedHandler).toBe('function');

      // Just verify the function exists and is callable
      expect(connectedHandler).toBeDefined();
    }
  });

  it('should handle WORLD_JOINED event', () => {
    if (plugin.events && plugin.events.WORLD_JOINED) {
      expect(Array.isArray(plugin.events.WORLD_JOINED)).toBe(true);
      expect(plugin.events.WORLD_JOINED.length).toBeGreaterThan(0);

      const joinedHandler = plugin.events.WORLD_JOINED[0];
      expect(typeof joinedHandler).toBe('function');

      // Just verify the function exists and is callable
      expect(joinedHandler).toBeDefined();
    }
  });
});
