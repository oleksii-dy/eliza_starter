import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import type { IAgentRuntime, Memory, State } from '@elizaos/core';
import { Role, ChannelType } from '@elizaos/core';
import type { UUID } from '@elizaos/core';
import { updateRoleAction } from '../roles';

const createMockRuntime = (): IAgentRuntime => {
  const mockWorld = {
    id: 'world-1' as UUID,
    metadata: {
      roles: {
        'entity-1': Role.ADMIN,
        'entity-2': Role.NONE
      }
    }
  };

  return {
    agentId: 'test-agent' as UUID,
    getSetting: vi.fn().mockReturnValue('world-1'),
    getWorld: vi.fn().mockResolvedValue(mockWorld),
    updateWorld: vi.fn().mockResolvedValue(true),
    getEntitiesForRoom: vi.fn().mockResolvedValue([
      { id: 'entity-1', names: ['Alice'] },
      { id: 'entity-2', names: ['Bob'] },
      { id: 'target-entity', names: ['Charlie'] }
    ]),
    useModel: vi.fn().mockResolvedValue([
      { entityId: 'target-entity', newRole: Role.ADMIN }
    ])
  } as any;
};

const createMockMemory = (text: string, entityId: UUID): Memory =>
  ({
    entityId,
    content: {
      text,
      channelType: ChannelType.GROUP,
      serverId: 'server-1'
    },
    roomId: 'room-1' as UUID
  } as Memory);

const createMockState = (text: string): State =>
  ({
    values: { content: text },
    data: {},
    text
  } as State);

describe('updateRoleAction', () => {
  let runtime: IAgentRuntime;
  const testEntityId = 'entity-1' as UUID;

  beforeEach(() => {
    runtime = createMockRuntime();
  });

  it('should update entity role when user has permission', async () => {
    const memory = createMockMemory(
      'Make Charlie an admin',
      testEntityId
    );
    const state = createMockState('Make Charlie an admin');
    const callback = vi.fn();

    const result = await updateRoleAction.handler(runtime, memory, state, {}, callback);

    expect(runtime.updateWorld).toHaveBeenCalled();
    expect(result).toBeDefined();
    if (result && typeof result === 'object' && 'data' in result) {
      expect(result.data?.success).toBe(true);
      expect(result.data?.updatedRoles).toHaveLength(1);
    }
    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringContaining("Updated Charlie's role to ADMIN")
      })
    );
  });

  it('should validate the action correctly', async () => {
    const validMemory = createMockMemory('test', testEntityId);
    const state = {} as State;
    
    // Should return true for group channels with serverId
    expect(await updateRoleAction.validate(runtime, validMemory, state)).toBe(true);
    
    // Should return false for non-group channels
    const invalidMemory = {
      ...validMemory,
      content: { ...validMemory.content, channelType: ChannelType.DM }
    } as Memory;
    expect(await updateRoleAction.validate(runtime, invalidMemory, state)).toBe(false);
  });

  it('should handle permission denial', async () => {
    // Set requester as NONE role (no permissions)
    const mockWorld = await runtime.getWorld('world-1' as UUID);
    if (mockWorld && mockWorld.metadata && mockWorld.metadata.roles) {
      mockWorld.metadata.roles['entity-1'] = Role.NONE;
    }

    const memory = createMockMemory(
      'Make Charlie an admin',
      testEntityId
    );
    const state = createMockState('Make Charlie an admin');
    const callback = vi.fn();

    const result = await updateRoleAction.handler(runtime, memory, state, {}, callback);

    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringContaining("don't have permission")
      })
    );
  });

  it('should handle world not found', async () => {
    (runtime.getWorld as Mock).mockResolvedValue(null);

    const memory = createMockMemory(
      'Make someone admin',
      testEntityId
    );
    const state = createMockState('Make someone admin');
    const callback = vi.fn();

    const result = await updateRoleAction.handler(runtime, memory, state, {}, callback);

    expect(result).toBeDefined();
    if (result && typeof result === 'object' && 'data' in result) {
      expect(result.data?.success).toBe(false);
      expect(result.data?.error).toBe('World not found');
    }
    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringContaining("couldn't find the world")
      })
    );
  });
});
