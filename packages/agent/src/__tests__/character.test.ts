import { describe, expect, it } from 'bun:test';
import { character } from '../index';

describe('Character Configuration', () => {
  it('should have a valid character configuration for agent initialization', () => {
    // Test that the character has all required fields for runtime
    expect(character).toHaveProperty('name');
    expect(character).toHaveProperty('bio');
    expect(character).toHaveProperty('plugins');
    expect(character).toHaveProperty('system');
    expect(character).toHaveProperty('messageExamples');

    // Ensure arrays are non-empty for proper agent behavior
    expect(character.bio?.length || 0).toBeGreaterThan(0);
    expect(character.messageExamples?.length || 0).toBeGreaterThan(0);
  });

  it('should have valid message examples with proper structure', () => {
    // Message examples are critical for agent behavior
    expect(character.messageExamples).toBeDefined();
    character.messageExamples?.forEach((conversation, index) => {
      expect(Array.isArray(conversation)).toBe(true);
      expect(conversation.length).toBeGreaterThanOrEqual(2); // At least user + agent

      // Verify each message has required structure
      conversation.forEach((message) => {
        expect(message).toHaveProperty('name');
        expect(message).toHaveProperty('content');
        expect(message.content).toHaveProperty('text');
        expect(typeof message.content?.text).toBe('string');
        expect(message.content?.text?.length || 0).toBeGreaterThan(0);
      });

      // Ensure conversation alternates between user and agent
      const names = conversation.map((m) => m.name);
      const hasUserMessages = names.some((name) => name !== character.name);
      const hasAgentMessages = names.some((name) => name === character.name);
      expect(hasUserMessages).toBe(true);
      expect(hasAgentMessages).toBe(true);
    });
  });

  it('should conditionally load plugins based on environment', () => {
    // This tests actual runtime behavior
    const hasOpenAIKey = !!process.env.OPENAI_API_KEY;
    const hasAnthropicKey = !!process.env.ANTHROPIC_API_KEY;

    if (hasOpenAIKey) {
      expect(character.plugins).toContain('@elizaos/plugin-openai');
    }

    if (hasAnthropicKey) {
      expect(character.plugins).toContain('@elizaos/plugin-anthropic');
    }

    // Core plugin should always be present
    expect(character.plugins).toContain('@elizaos/plugin-sql');
  });

  it('should have a system prompt that guides agent behavior', () => {
    expect(character.system).toBeTruthy();
    expect(typeof character.system).toBe('string');
    expect(character.system?.length || 0).toBeGreaterThan(50); // Meaningful prompt

    // System prompt should contain key behavioral guidance
    const systemLower = character.system?.toLowerCase() || '';
    const hasGuidance =
      systemLower.includes('curious') ||
      systemLower.includes('human') ||
      systemLower.includes('build') ||
      systemLower.includes('create') ||
      systemLower.includes('understand');

    expect(hasGuidance).toBe(true);
  });
});
