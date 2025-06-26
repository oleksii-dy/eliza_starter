import { describe, it, expect, mock, spyOn, beforeEach } from 'bun:test';
import GoalsPlugin from '../index';
import { type IAgentRuntime, logger } from '@elizaos/core';

describe('GoalsPlugin', () => {
  it('should export GoalsPlugin with correct structure', () => {
    expect(GoalsPlugin).toBeDefined();
    expect(GoalsPlugin.name).toBe('goals');
    expect(GoalsPlugin.description).toBe(
      'Provides goal management functionality for tracking and achieving objectives.'
    );
    expect(GoalsPlugin.providers).toHaveLength(1);
    expect(GoalsPlugin.actions).toHaveLength(5); // 5 actions
    expect(GoalsPlugin.services).toHaveLength(1); // 1 service: goal data service
    expect(GoalsPlugin.routes).toBeDefined();
    expect(GoalsPlugin.init).toBeInstanceOf(Function);
  });

  it('should have all required actions', () => {
    const actionNames = GoalsPlugin.actions?.map((action) => action.name) || [];
    expect(actionNames).toContain('CREATE_GOAL');
    expect(actionNames).toContain('COMPLETE_GOAL');
    expect(actionNames).toContain('CONFIRM_GOAL');
    expect(actionNames).toContain('UPDATE_GOAL');
    expect(actionNames).toContain('CANCEL_GOAL');
  });

  it('should initialize without errors when database is available', async () => {
    const mockRuntime: IAgentRuntime = {
      agentId: 'test-agent' as any,
      db: {
        execute: mock(() => Promise.resolve({ rows: [] })),
      },
    } as any;

    const config = {};

    // Should not throw when database is available
    await expect(GoalsPlugin.init!(config, mockRuntime)).resolves.toBeUndefined();
  });

  it('should handle missing database gracefully', async () => {
    const mockRuntime: IAgentRuntime = {
      agentId: 'test-agent' as any,
      db: null, // No database available
    } as any;

    const config = {};

    // Should not throw when no database is available
    await expect(GoalsPlugin.init!(config, mockRuntime)).resolves.toBeUndefined();
  });
});
