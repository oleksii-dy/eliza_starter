import { describe, expect, it, beforeEach } from 'vitest';
import { liaison } from '../src/liaison';
import { createTestMessage, createTestRuntime, clearAllMocks } from './setup';

describe('Ruby Character', () => {
  let runtime: any;

  beforeEach(() => {
    clearAllMocks();
    runtime = createTestRuntime(liaison.character);
  });

  describe('Character Initialization', () => {
    it('should initialize with correct name and plugins', () => {
      expect(liaison.character.name).toBe('Ruby');
      expect(liaison.character.plugins).toContain('@elizaos/plugin-sql');
      expect(liaison.character.plugins).toContain('@elizaos/plugin-anthropic');
      expect(liaison.character.plugins).toContain('@elizaos/plugin-openai');
      expect(liaison.character.plugins).toContain('@elizaos/plugin-discord');
      expect(liaison.character.plugins).toContain('@elizaos/plugin-pdf');
      expect(liaison.character.plugins).toContain('@elizaos/plugin-video-understanding');
    });

    it('should have required settings', () => {
      expect(liaison.character.settings).toBeDefined();
      const settings = liaison.character.settings as { secrets: any; avatar: any };
      expect(settings.secrets).toBeDefined();
      expect(settings.avatar).toBeDefined();
    });
  });

  describe('Message Handling', () => {
    it('should respond to cross-platform queries', async () => {
      const message = createTestMessage('What are people discussing in the Telegram group today?');
      const state = await runtime.composeState(message);
      const response = await runtime.evaluate(message, state);

      expect(response).toBeDefined();
      expect(response.content.text).toContain('Telegram');
      expect(response.content.text).toContain('discussing');
      expect(response.content.text).toContain('group');
    });

    it('should handle platform recommendations', async () => {
      const message = createTestMessage(
        'Where should I ask my question about deploying ElizaOS agents?'
      );
      const state = await runtime.composeState(message);
      const response = await runtime.evaluate(message, state);

      expect(response).toBeDefined();
      expect(response.content.text).toContain('Discord');
      expect(response.content.text).toContain('deployment');
      expect(response.content.text).toContain('agents');
    });

    it('should process community feedback tracking', async () => {
      const message = createTestMessage(
        "What's the community's reaction to the latest ElizaOS update?"
      );
      const state = await runtime.composeState(message);
      const response = await runtime.evaluate(message, state);

      expect(response).toBeDefined();
      expect(response.content.text).toContain('reaction');
      expect(response.content.text).toContain('update');
      expect(response.content.text).toContain('community');
    });

    it('should provide event information', async () => {
      const message = createTestMessage(
        'Are there any ElizaOS community events happening this week?'
      );
      const state = await runtime.composeState(message);
      const response = await runtime.evaluate(message, state);

      expect(response).toBeDefined();
      expect(response.content.text).toContain('events');
      expect(response.content.text).toContain('week');
      expect(response.content.text).toContain('community');
    });
  });

  describe('Style Guidelines', () => {
    it('should maintain informative tone', async () => {
      const message = createTestMessage(
        'Which platform has the most up-to-date information about the ElizaOS service outage?'
      );
      const state = await runtime.composeState(message);
      const response = await runtime.evaluate(message, state);

      expect(response).toBeDefined();
      expect(response.content.text).toContain('updates');
      expect(response.content.text).toContain('status');
      expect(response.content.text).toContain('real-time');
    });

    it('should provide platform-specific guidance', async () => {
      const message = createTestMessage(
        "I'm new to ElizaOS. What platforms should I join to stay informed?"
      );
      const state = await runtime.composeState(message);
      const response = await runtime.evaluate(message, state);

      expect(response).toBeDefined();
      expect(response.content.text).toContain('Discord');
      expect(response.content.text).toContain('Slack');
      expect(response.content.text).toContain('Telegram');
    });

    it('should track cross-platform discussions', async () => {
      const message = createTestMessage(
        'Has anyone discussed the character system feature request I posted on Slack?'
      );
      const state = await runtime.composeState(message);
      const response = await runtime.evaluate(message, state);

      expect(response).toBeDefined();
      expect(response.content.text).toContain('discussion');
      expect(response.content.text).toContain('feature');
      expect(response.content.text).toContain('Discord');
    });
  });

  describe('Community Coordination', () => {
    it('should help with cross-platform events', async () => {
      const message = createTestMessage(
        'Can you help coordinate a cross-platform ElizaOS hackathon?'
      );
      const state = await runtime.composeState(message);
      const response = await runtime.evaluate(message, state);

      expect(response).toBeDefined();
      expect(response.content.text.toLowerCase()).toContain('hackathon');
      expect(response.content.text.toLowerCase()).toContain('platform');
      expect(response.content.text.toLowerCase()).toContain('include');
    });

    it('should guide users to active discussions', async () => {
      const message = createTestMessage(
        'Has anyone shared examples of using the new ElizaOS plugin system?'
      );
      const state = await runtime.composeState(message);
      const response = await runtime.evaluate(message, state);

      expect(response).toBeDefined();
      expect(response.content.text.toLowerCase()).toContain('examples');
      expect(response.content.text.toLowerCase()).toContain('plugin');
      expect(response.content.text.toLowerCase()).toContain('code');
    });
  });
});
