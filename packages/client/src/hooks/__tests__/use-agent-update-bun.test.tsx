// Import test setup for browser environment
import '../../test/setup';

import { describe, test, expect } from 'bun:test';
import { renderHook, act } from '@testing-library/react';
import { useAgentUpdate } from '../use-agent-update';
import type { Agent } from '@elizaos/core';

// Create a factory for mock agents
const createMockAgent = (overrides: Partial<Agent> = {}): Agent => ({
  id: 'test-agent-id',
  name: 'Test Agent',
  username: 'testagent',
  system: 'You are a helpful test agent.',
  enabled: true,
  bio: ['Test bio line 1', 'Test bio line 2'],
  topics: ['testing', 'development'],
  style: {
    all: ['style rule 1'],
    chat: ['chat style rule'],
    post: ['post style rule']
  },
  plugins: ['plugin1', 'plugin2'],
  settings: {
    avatar: 'https://example.com/avatar.png',
    voice: {
      model: 'test-model'
    },
    secrets: {
      API_KEY: 'test-key',
      SECRET_TOKEN: 'test-token'
    }
  },
  ...overrides
});

describe('useAgentUpdate', () => {
  test('should initialize with provided agent', () => {
    const mockAgent = createMockAgent();
    const { result } = renderHook(() => useAgentUpdate(mockAgent));

    expect(result.current.agent).toEqual(mockAgent);
  });

  test('should update basic fields', () => {
    const mockAgent = createMockAgent();
    const { result } = renderHook(() => useAgentUpdate(mockAgent));

    act(() => {
      result.current.updateField('name', 'Updated Agent Name');
    });

    expect(result.current.agent.name).toBe('Updated Agent Name');
  });

  test('should update system prompt', () => {
    const mockAgent = createMockAgent();
    const { result } = renderHook(() => useAgentUpdate(mockAgent));

    act(() => {
      result.current.updateSystemPrompt('New system prompt');
    });

    expect(result.current.agent.system).toBe('New system prompt');
  });

  test('should add and remove array items from bio', () => {
    const mockAgent = createMockAgent();
    const { result } = renderHook(() => useAgentUpdate(mockAgent));

    // Add to bio
    act(() => {
      result.current.addArrayItem('bio', 'New bio line');
    });

    expect(result.current.agent.bio).toHaveLength(3);
    expect(result.current.agent.bio?.[2]).toBe('New bio line');

    // Remove from bio
    act(() => {
      result.current.removeArrayItem('bio', 1);
    });

    expect(result.current.agent.bio).toHaveLength(2);
    expect(result.current.agent.bio).toEqual(['Test bio line 1', 'New bio line']);
  });

  test('should update array items', () => {
    const mockAgent = createMockAgent();
    const { result } = renderHook(() => useAgentUpdate(mockAgent));

    act(() => {
      result.current.updateArrayItem('bio', 0, 'Updated bio line');
    });

    expect(result.current.agent.bio?.[0]).toBe('Updated bio line');
  });

  test('should add and remove style rules', () => {
    const mockAgent = createMockAgent();
    const { result } = renderHook(() => useAgentUpdate(mockAgent));

    // Add style rule
    act(() => {
      result.current.addStyleRule('all', 'new style rule');
    });

    expect(result.current.agent.style?.all).toHaveLength(2);
    expect(result.current.agent.style?.all?.[1]).toBe('new style rule');

    // Remove style rule
    act(() => {
      result.current.removeStyleRule('all', 0);
    });

    expect(result.current.agent.style?.all).toHaveLength(1);
    expect(result.current.agent.style?.all?.[0]).toBe('new style rule');
  });

  test('should update style rules', () => {
    const mockAgent = createMockAgent();
    const { result } = renderHook(() => useAgentUpdate(mockAgent));

    act(() => {
      result.current.updateStyleRule('all', 0, 'updated style rule');
    });

    expect(result.current.agent.style?.all?.[0]).toBe('updated style rule');
  });

  test('should set complete style arrays', () => {
    const mockAgent = createMockAgent();
    const { result } = renderHook(() => useAgentUpdate(mockAgent));

    const newStyles = ['style 1', 'style 2', 'style 3'];

    act(() => {
      result.current.setStyleArray('chat', newStyles);
    });

    expect(result.current.agent.style?.chat).toEqual(newStyles);
  });

  test('should manage plugins', () => {
    const mockAgent = createMockAgent();
    const { result } = renderHook(() => useAgentUpdate(mockAgent));

    // Add plugin
    act(() => {
      result.current.addPlugin('new-plugin');
    });

    expect(result.current.agent.plugins).toHaveLength(3);
    expect(result.current.agent.plugins?.[2]).toBe('new-plugin');

    // Remove plugin
    act(() => {
      result.current.removePlugin(0);
    });

    expect(result.current.agent.plugins).toHaveLength(2);
    expect(result.current.agent.plugins).toEqual(['plugin2', 'new-plugin']);

    // Set plugins
    act(() => {
      result.current.setPlugins(['only-plugin']);
    });

    expect(result.current.agent.plugins).toEqual(['only-plugin']);
  });

  test('should update settings', () => {
    const mockAgent = createMockAgent();
    const { result } = renderHook(() => useAgentUpdate(mockAgent));

    act(() => {
      result.current.updateSetting('voice.model', 'new-model');
    });

    expect(result.current.agent.settings?.voice?.model).toBe('new-model');
  });

  test('should update avatar', () => {
    const mockAgent = createMockAgent();
    const { result } = renderHook(() => useAgentUpdate(mockAgent));

    act(() => {
      result.current.updateAvatar('https://new-avatar.com/image.png');
    });

    expect(result.current.agent.settings?.avatar).toBe('https://new-avatar.com/image.png');
  });

  test('should manage secrets', () => {
    const mockAgent = createMockAgent();
    const { result } = renderHook(() => useAgentUpdate(mockAgent));

    // Add secret
    act(() => {
      result.current.updateSecret('NEW_SECRET', 'new-secret-value');
    });

    expect(result.current.agent.settings?.secrets?.NEW_SECRET).toBe('new-secret-value');
    expect(result.current.agent.settings?.secrets?.API_KEY).toBe('test-key'); // Existing secret preserved

    // Remove secret
    act(() => {
      result.current.removeSecret('API_KEY');
    });

    expect(result.current.agent.settings?.secrets?.API_KEY).toBeUndefined();
    expect(result.current.agent.settings?.secrets?.NEW_SECRET).toBe('new-secret-value'); // Other secrets preserved
  });

  test('should reset to initial state', () => {
    const mockAgent = createMockAgent();
    const { result } = renderHook(() => useAgentUpdate(mockAgent));

    // Make changes
    act(() => {
      result.current.updateField('name', 'Changed Name');
      result.current.updateSystemPrompt('Changed system');
    });

    expect(result.current.agent.name).toBe('Changed Name');

    // Reset
    act(() => {
      result.current.reset();
    });

    expect(result.current.agent.name).toBe('Test Agent');
    expect(result.current.agent.system).toBe('You are a helpful test agent.');
  });

  test('should import agent template', () => {
    const mockAgent = createMockAgent();
    const { result } = renderHook(() => useAgentUpdate(mockAgent));

    const templateAgent = createMockAgent({
      name: 'Template Agent',
      system: 'Template system prompt',
      bio: ['Template bio'],
      topics: ['template-topic'],
      settings: {
        avatar: 'template-avatar.png',
        voice: { model: 'template-model' }
      }
    });

    act(() => {
      result.current.importAgent(templateAgent);
    });

    expect(result.current.agent.name).toBe('Template Agent');
    expect(result.current.agent.system).toBe('Template system prompt');
    expect(result.current.agent.bio).toEqual(['Template bio']);
    expect(result.current.agent.topics).toEqual(['template-topic']);
    expect(result.current.agent.settings?.avatar).toBe('template-avatar.png');
    expect(result.current.agent.settings?.voice?.model).toBe('template-model');
  });

  test('should track changed fields', () => {
    const mockAgent = createMockAgent();
    const { result } = renderHook(() => useAgentUpdate(mockAgent));

    // Initially no changes
    expect(Object.keys(result.current.getChangedFields())).toHaveLength(0);

    // Make some changes
    act(() => {
      result.current.updateField('name', 'Changed Name');
      result.current.updateSystemPrompt('Changed system');
      result.current.updateSecret('NEW_KEY', 'new-value');
    });

    const changedFields = result.current.getChangedFields();

    expect(changedFields.name).toBe('Changed Name');
    expect(changedFields.system).toBe('Changed system');
    expect(changedFields.settings?.secrets?.NEW_KEY).toBe('new-value');

    // Unchanged fields should not be included
    expect(changedFields.bio).toBeUndefined();
    expect(changedFields.topics).toBeUndefined();
  });

  test('should handle settings updates', () => {
    const mockAgent = createMockAgent();
    const { result } = renderHook(() => useAgentUpdate(mockAgent));

    const newSettings = {
      avatar: 'new-avatar.png',
      voice: { model: 'new-model' },
      secrets: { NEW_SECRET: 'new-value' }
    };

    act(() => {
      result.current.setSettings(newSettings);
    });

    expect(result.current.agent.settings?.avatar).toBe('new-avatar.png');
    expect(result.current.agent.settings?.voice?.model).toBe('new-model');
    expect(result.current.agent.settings?.secrets?.NEW_SECRET).toBe('new-value');
  });
});
