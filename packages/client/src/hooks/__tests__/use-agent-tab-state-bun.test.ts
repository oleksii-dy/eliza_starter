// Import test setup for browser environment
import '../../test/setup';

import { describe, test, expect, beforeEach } from 'bun:test';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAgentTabState } from '../use-agent-tab-state';
import type { UUID } from '@elizaos/core';

describe('useAgentTabState', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  test('should initialize with default tab when no agentId provided', () => {
    const { result } = renderHook(() => useAgentTabState(undefined));

    expect(result.current.currentTab).toBe('details');
  });

  test('should initialize with default tab for new agent', () => {
    const agentId = 'agent-123' as UUID;
    const { result } = renderHook(() => useAgentTabState(agentId));

    expect(result.current.currentTab).toBe('details');
  });

  test('should load stored tab state for existing agent', async () => {
    const agentId = 'agent-123' as UUID;

    // Pre-populate localStorage with saved tab state
    localStorage.setItem(
      'eliza-agent-tab-states',
      JSON.stringify({ [agentId]: 'actions' })
    );

    const { result } = renderHook(() => useAgentTabState(agentId));

    await waitFor(() => {
      expect(result.current.currentTab).toBe('actions');
    });
  });

  test('should update tab state and persist to localStorage', () => {
    const agentId = 'agent-123' as UUID;
    const { result } = renderHook(() => useAgentTabState(agentId));

    act(() => {
      result.current.setTab('logs');
    });

    expect(result.current.currentTab).toBe('logs');

    // Check localStorage was updated
    const stored = localStorage.getItem('eliza-agent-tab-states');
    const parsed = stored ? JSON.parse(stored) : {};
    expect(parsed[agentId]).toBe('logs');
  });

  test('should handle multiple agents with different tab states', () => {
    const agentId1 = 'agent-123' as UUID;
    const agentId2 = 'agent-456' as UUID;

    // First agent
    const { result: result1 } = renderHook(() => useAgentTabState(agentId1));

    act(() => {
      result1.current.setTab('actions');
    });

    // Second agent
    const { result: result2 } = renderHook(() => useAgentTabState(agentId2));

    act(() => {
      result2.current.setTab('memories');
    });

    // Verify both states are preserved
    expect(result1.current.currentTab).toBe('actions');
    expect(result2.current.currentTab).toBe('memories');

    // Check localStorage contains both
    const stored = localStorage.getItem('eliza-agent-tab-states');
    const parsed = stored ? JSON.parse(stored) : {};
    expect(parsed[agentId1]).toBe('actions');
    expect(parsed[agentId2]).toBe('memories');
  });

  test('should switch tab states when agentId changes', async () => {
    const agentId1 = 'agent-123' as UUID;
    const agentId2 = 'agent-456' as UUID;

    // Pre-populate localStorage with different tab states
    localStorage.setItem(
      'eliza-agent-tab-states',
      JSON.stringify({
        [agentId1]: 'actions',
        [agentId2]: 'logs'
      })
    );

    const { result, rerender } = renderHook(
      ({ agentId }) => useAgentTabState(agentId),
      { initialProps: { agentId: agentId1 } }
    );

    // Initially should load agent1's tab state
    await waitFor(() => {
      expect(result.current.currentTab).toBe('actions');
    });

    // Switch to agent2
    rerender({ agentId: agentId2 });

    await waitFor(() => {
      expect(result.current.currentTab).toBe('logs');
    });
  });

  test('should reset to default when agentId becomes undefined', async () => {
    const agentId = 'agent-123' as UUID;

    const { result, rerender } = renderHook(
      ({ agentId }) => useAgentTabState(agentId),
      { initialProps: { agentId } }
    );

    // Set a custom tab
    act(() => {
      result.current.setTab('actions');
    });

    expect(result.current.currentTab).toBe('actions');

    // Switch to undefined agentId
    rerender({ agentId: undefined });

    await waitFor(() => {
      expect(result.current.currentTab).toBe('details');
    });
  });

  test('should handle custom tab values', () => {
    const agentId = 'agent-123' as UUID;
    const { result } = renderHook(() => useAgentTabState(agentId));

    act(() => {
      result.current.setTab('custom-tab');
    });

    expect(result.current.currentTab).toBe('custom-tab');

    // Check localStorage was updated
    const stored = localStorage.getItem('eliza-agent-tab-states');
    const parsed = stored ? JSON.parse(stored) : {};
    expect(parsed[agentId]).toBe('custom-tab');
  });

  test('should handle localStorage read errors gracefully', async () => {
    const agentId = 'agent-123' as UUID;

    // Set invalid JSON in localStorage
    localStorage.setItem('eliza-agent-tab-states', 'invalid-json');

    const { result } = renderHook(() => useAgentTabState(agentId));

    // Should fall back to default
    await waitFor(() => {
      expect(result.current.currentTab).toBe('details');
    });
  });

  test('should handle localStorage write errors gracefully', () => {
    const agentId = 'agent-123' as UUID;
    const { result } = renderHook(() => useAgentTabState(agentId));

    // Mock localStorage to throw an error on setItem
    const originalSetItem = localStorage.setItem;
    localStorage.setItem = () => {
      throw new Error('localStorage save error');
    };

    // Should still update state even if localStorage fails
    act(() => {
      result.current.setTab('actions');
    });

    expect(result.current.currentTab).toBe('actions');

    // Restore original setItem
    localStorage.setItem = originalSetItem;
  });

  test('should not save to localStorage when agentId is undefined', () => {
    const { result } = renderHook(() => useAgentTabState(undefined));

    act(() => {
      result.current.setTab('actions');
    });

    expect(result.current.currentTab).toBe('actions');

    // localStorage should remain empty
    const stored = localStorage.getItem('eliza-agent-tab-states');
    expect(stored).toBeNull();
  });

  test('should preserve existing agent states when updating', () => {
    const agentId1 = 'agent-123' as UUID;
    const agentId2 = 'agent-456' as UUID;

    // Set up initial state for agent1
    localStorage.setItem(
      'eliza-agent-tab-states',
      JSON.stringify({ [agentId1]: 'actions' })
    );

    // Hook for agent2
    const { result } = renderHook(() => useAgentTabState(agentId2));

    act(() => {
      result.current.setTab('logs');
    });

    // Check that both agents' states are preserved
    const stored = localStorage.getItem('eliza-agent-tab-states');
    const parsed = stored ? JSON.parse(stored) : {};
    expect(parsed[agentId1]).toBe('actions'); // Original state preserved
    expect(parsed[agentId2]).toBe('logs'); // New state added
  });
});
