import { describe, it, expect, beforeEach } from 'bun:test';
import type { IAgentRuntime, Memory, State } from '@elizaos/core';
import { Role, ChannelType } from '@elizaos/core';
import type { UUID } from '@elizaos/core';
import { mock } from '@elizaos/core/test-utils';

interface MockFunction<T = any> {
  (...args: any[]): T;
  mockReturnValue: (value: T) => MockFunction<T>;
  mockResolvedValue: (value: T) => MockFunction<T>;
  mockRejectedValue: (error: any) => MockFunction<T>;
  mockImplementation: (fn: (...args: any[]) => T) => MockFunction<T>;
  calls: any[][];
  mock: {
    calls: any[][];
    results: any[];
  };
}
import { updateRoleAction } from '../roles';
import { createMockRuntime, createMockMemory, createMockState } from '../../__tests__/test-utils';

const createRolesMockRuntime = (): IAgentRuntime => {
  const mockWorld = {
    id: 'world-1' as UUID,
    metadata: {
      roles: {
        'entity-1': Role.ADMIN,
        'entity-2': Role.NONE,
      },
    },
  };

  return createMockRuntime({
    getSetting: mock().mockReturnValue('world-1'),
    getWorld: mock().mockResolvedValue(mockWorld),
    updateWorld: mock().mockResolvedValue(true),
    getEntitiesForRoom: mock().mockResolvedValue([
      { id: 'entity-1', names: ['Alice'] },
      { id: 'entity-2', names: ['Bob'] },
      { id: 'target-entity', names: ['Charlie'] },
    ]),
    useModel: mock().mockResolvedValue([{ entityId: 'target-entity', newRole: Role.ADMIN }]),
  });
};

describe('updateRoleAction', () => {
  let runtime: IAgentRuntime;
  const testEntityId = 'entity-1' as UUID;

  beforeEach(() => {
    runtime = createRolesMockRuntime();
  });

  it('should update entity role when user has permission', async () => {
    const memory = createMockMemory('Make Charlie an admin', testEntityId);
    const state = createMockState({ text: 'Make Charlie an admin' });
    const callback = mock();

    const result = await updateRoleAction.handler(runtime, memory, state, {}, callback);

    expect((runtime.updateWorld as MockFunction).mock.calls.length).toBeGreaterThan(0);
    expect(result).toBeDefined();
    if (result && typeof result === 'object' && 'data' in result) {
      expect(result.data?.success).toBe(true);
      expect(result.data?.updatedRoles).toHaveLength(1);
    }
    expect(callback.mock.calls.length).toBeGreaterThan(0);
    expect(callback.calls[0][0].text).toContain("Updated Charlie's role to ADMIN");
  });

  it('should validate the action correctly', async () => {
    const validMemory = createMockMemory('test', testEntityId, {
      content: {
        text: 'test',
        channelType: ChannelType.GROUP,
        serverId: 'test-server-id',
      },
    });
    const state = {} as State;

    // Should return true for group channels with serverId
    expect(await updateRoleAction.validate(runtime, validMemory, state)).toBe(true);

    // Should return false for non-group channels
    const invalidMemory = {
      ...validMemory,
      content: { ...validMemory.content, channelType: ChannelType.DM },
    } as Memory;
    expect(await updateRoleAction.validate(runtime, invalidMemory, state)).toBe(false);
  });

  it('should handle permission denial', async () => {
    // Set requester as NONE role (no permissions)
    const mockWorld = await runtime.getWorld('world-1' as UUID);
    if (mockWorld && mockWorld.metadata && mockWorld.metadata.roles) {
      mockWorld.metadata.roles['entity-1'] = Role.NONE;
    }

    const memory = createMockMemory('Make Charlie an admin', testEntityId);
    const state = createMockState({ text: 'Make Charlie an admin' });
    const callback = mock();

    const result = await updateRoleAction.handler(runtime, memory, state, {}, callback);

    expect(callback.mock.calls.length).toBeGreaterThan(0);
    expect(callback.calls[0][0].text).toContain("don't have permission");
  });

  it('should handle world not found', async () => {
    (runtime.getWorld as MockFunction<any>).mockResolvedValue(null);

    const memory = createMockMemory('Make someone admin', testEntityId);
    const state = createMockState({ text: 'Make someone admin' });
    const callback = mock();

    const result = await updateRoleAction.handler(runtime, memory, state, {}, callback);

    expect(result).toBeDefined();
    if (result && typeof result === 'object' && 'data' in result) {
      expect(result.data?.success).toBe(false);
      expect(result.data?.error).toBe('World not found');
    }
    expect(callback.mock.calls.length).toBeGreaterThan(0);
    expect(callback.calls[0][0].text).toContain("couldn't find the world");
  });
});
