import { expect, mock, spyOn } from 'bun:test';
import { createUnitTest } from '../test-utils/unifiedTestSuite';
import { getUserServerRole, findWorldsForOwner } from '../roles';
import { Role, type IAgentRuntime, type UUID, type World } from '../types';
import * as entities from '../entities';
import * as logger_module from '../logger';

const rolesSuite = createUnitTest('Roles Utilities Tests');

// Test context for shared data
interface TestContext {
  mockRuntime: IAgentRuntime;
}

rolesSuite.beforeEach<TestContext>((context) => {
  mock.restore();

  // Set up scoped mocks for this test
  spyOn(entities, 'createUniqueUuid').mockImplementation(
    (_runtime: any, serverId: any) => `unique-${serverId}` as UUID
  );

  // Mock logger if it doesn't have the methods
  if (logger_module.logger) {
    const methods = ['error', 'info', 'warn', 'debug'];
    methods.forEach((method) => {
      if (typeof logger_module.logger[method] === 'function') {
        logger_module.logger[method] = mock(() => {});
      } else {
        logger_module.logger[method] = mock(() => {});
      }
    });
  }

  context.mockRuntime = {
    agentId: 'agent-123' as UUID,
    getWorld: mock(),
    getAllWorlds: mock(),
  } as unknown as IAgentRuntime;
});

rolesSuite.addTest<TestContext>('getUserServerRole should return role from world metadata', async (context) => {
  const mockWorld: World = {
    id: 'world-123' as UUID,
    name: 'Test World',
    agentId: 'agent-123' as UUID,
    serverId: 'server-123',
    metadata: {
      roles: {
        ['user-123-456-789-abc-def012345678' as UUID]: Role.ADMIN,
      },
    },
  };

  (context.mockRuntime.getWorld as any).mockResolvedValue(mockWorld);

  const role = await getUserServerRole(
    context.mockRuntime,
    'user-123-456-789-abc-def012345678',
    'server-123'
  );
  expect(role).toBe(Role.ADMIN);
});

rolesSuite.addTest<TestContext>('getUserServerRole should return Role.NONE when world is null', async (context) => {
  (context.mockRuntime.getWorld as any).mockResolvedValue(null);

  const role = await getUserServerRole(context.mockRuntime, 'user-123', 'server-123');
  expect(role).toBe(Role.NONE);
});

rolesSuite.addTest<TestContext>('getUserServerRole should return Role.NONE when world has no metadata', async (context) => {
  const mockWorld: World = {
    id: 'world-123' as UUID,
    name: 'Test World',
    agentId: 'agent-123' as UUID,
    serverId: 'server-123',
    metadata: {},
  };

  (context.mockRuntime.getWorld as any).mockResolvedValue(mockWorld);

  const role = await getUserServerRole(context.mockRuntime, 'user-123', 'server-123');
  expect(role).toBe(Role.NONE);
});

rolesSuite.addTest<TestContext>('getUserServerRole should return Role.NONE when world has no roles in metadata', async (context) => {
  const mockWorld: World = {
    id: 'world-123' as UUID,
    name: 'Test World',
    agentId: 'agent-123' as UUID,
    serverId: 'server-123',
    metadata: {
      someOtherData: 'value',
    },
  };

  (context.mockRuntime.getWorld as any).mockResolvedValue(mockWorld);

  const role = await getUserServerRole(context.mockRuntime, 'user-123', 'server-123');
  expect(role).toBe(Role.NONE);
});

rolesSuite.addTest<TestContext>('getUserServerRole should check original ID format when first check fails', async (context) => {
  const mockWorld: World = {
    id: 'world-123' as UUID,
    name: 'Test World',
    agentId: 'agent-123' as UUID,
    serverId: 'server-123',
    metadata: {
      roles: {
        ['user-456-789-abc-def-012345678901' as UUID]: Role.OWNER,
      },
    },
  };

  (context.mockRuntime.getWorld as any).mockResolvedValue(mockWorld);

  // Even though the code has duplicate checks for entityId, it should return NONE
  // since 'user-123' is not in the roles
  const role = await getUserServerRole(context.mockRuntime, 'user-123', 'server-123');
  expect(role).toBe(Role.NONE);
});

rolesSuite.addTest<TestContext>('getUserServerRole should return role for different role types', async (context) => {
  const mockWorld: World = {
    id: 'world-123' as UUID,
    name: 'Test World',
    agentId: 'agent-123' as UUID,
    serverId: 'server-123',
    metadata: {
      roles: {
        ['owner-user-123-456-789-abcdef0123' as UUID]: Role.OWNER,
        ['admin-user-123-456-789-abcdef0123' as UUID]: Role.ADMIN,
        ['none-user-123-456-789-abcdef01234' as UUID]: Role.NONE,
      },
    },
  };

  (context.mockRuntime.getWorld as any).mockResolvedValue(mockWorld);

  const ownerRole = await getUserServerRole(
    context.mockRuntime,
    'owner-user-123-456-789-abcdef0123',
    'server-123'
  );
  expect(ownerRole).toBe(Role.OWNER);

  const adminRole = await getUserServerRole(
    context.mockRuntime,
    'admin-user-123-456-789-abcdef0123',
    'server-123'
  );
  expect(adminRole).toBe(Role.ADMIN);

  const noneRole = await getUserServerRole(
    context.mockRuntime,
    'none-user-123-456-789-abcdef01234',
    'server-123'
  );
  expect(noneRole).toBe(Role.NONE);
});

rolesSuite.addTest<TestContext>('findWorldsForOwner should find worlds where user is owner', async (context) => {
  const mockWorlds: World[] = [
    {
      id: 'world-1' as UUID,
      name: 'World 1',
      agentId: 'agent-123' as UUID,
      serverId: 'server-1',
      metadata: {
        ownership: {
          ownerId: 'user-123',
        },
      },
    },
    {
      id: 'world-2' as UUID,
      name: 'World 2',
      agentId: 'agent-123' as UUID,
      serverId: 'server-2',
      metadata: {
        ownership: {
          ownerId: 'other-user',
        },
      },
    },
    {
      id: 'world-3' as UUID,
      name: 'World 3',
      agentId: 'agent-123' as UUID,
      serverId: 'server-3',
      metadata: {
        ownership: {
          ownerId: 'user-123',
        },
      },
    },
  ];

  (context.mockRuntime.getAllWorlds as any).mockResolvedValue(mockWorlds);

  const ownerWorlds = await findWorldsForOwner(context.mockRuntime, 'user-123');

  expect(ownerWorlds).toBeDefined();
  expect(ownerWorlds?.length).toBe(2);
  expect(ownerWorlds?.[0].id).toBe('world-1' as UUID);
  expect(ownerWorlds?.[1].id).toBe('world-3' as UUID);
});

rolesSuite.addTest<TestContext>('findWorldsForOwner should return null when entityId is empty', async (context) => {
  const { logger } = await import('../logger');

  const result = await findWorldsForOwner(context.mockRuntime, '');

  expect(result).toBeNull();
  expect(logger.error).toHaveBeenCalledWith('User ID is required to find server');
});

rolesSuite.addTest<TestContext>('findWorldsForOwner should return null when entityId is null', async (context) => {
  const { logger } = await import('../logger');

  const result = await findWorldsForOwner(context.mockRuntime, null as any);

  expect(result).toBeNull();
  expect(logger.error).toHaveBeenCalledWith('User ID is required to find server');
});

rolesSuite.addTest<TestContext>('findWorldsForOwner should return null when no worlds exist', async (context) => {
  const { logger } = await import('../logger');

  (context.mockRuntime.getAllWorlds as any).mockResolvedValue([]);

  const result = await findWorldsForOwner(context.mockRuntime, 'user-123');

  expect(result).toBeNull();
  expect(logger.info).toHaveBeenCalledWith('No worlds found for this agent');
});

rolesSuite.addTest<TestContext>('findWorldsForOwner should return null when getAllWorlds returns null', async (context) => {
  const { logger } = await import('../logger');

  (context.mockRuntime.getAllWorlds as any).mockResolvedValue(null);

  const result = await findWorldsForOwner(context.mockRuntime, 'user-123');

  expect(result).toBeNull();
  expect(logger.info).toHaveBeenCalledWith('No worlds found for this agent');
});

rolesSuite.addTest<TestContext>('findWorldsForOwner should return null when no worlds match the owner', async (context) => {
  const mockWorlds: World[] = [
    {
      id: 'world-1' as UUID,
      name: 'World 1',
      agentId: 'agent-123' as UUID,
      serverId: 'server-1',
      metadata: {
        ownership: {
          ownerId: 'other-user-1',
        },
      },
    },
    {
      id: 'world-2' as UUID,
      name: 'World 2',
      agentId: 'agent-123' as UUID,
      serverId: 'server-2',
      metadata: {
        ownership: {
          ownerId: 'other-user-2',
        },
      },
    },
  ];

  (context.mockRuntime.getAllWorlds as any).mockResolvedValue(mockWorlds);

  const result = await findWorldsForOwner(context.mockRuntime, 'user-123');

  expect(result).toBeNull();
});

rolesSuite.addTest<TestContext>('findWorldsForOwner should handle worlds without metadata', async (context) => {
  const mockWorlds: World[] = [
    {
      id: 'world-1' as UUID,
      name: 'World 1',
      agentId: 'agent-123' as UUID,
      serverId: 'server-1',
      metadata: {},
    },
    {
      id: 'world-2' as UUID,
      name: 'World 2',
      agentId: 'agent-123' as UUID,
      serverId: 'server-2',
    } as World,
  ];

  (context.mockRuntime.getAllWorlds as any).mockResolvedValue(mockWorlds);

  const result = await findWorldsForOwner(context.mockRuntime, 'user-123');

  expect(result).toBeNull();
});

rolesSuite.addTest<TestContext>('findWorldsForOwner should handle worlds without ownership in metadata', async (context) => {
  const mockWorlds: World[] = [
    {
      id: 'world-1' as UUID,
      name: 'World 1',
      agentId: 'agent-123' as UUID,
      serverId: 'server-1',
      metadata: {
        someOtherData: 'value',
      },
    },
  ];

  (context.mockRuntime.getAllWorlds as any).mockResolvedValue(mockWorlds);

  const result = await findWorldsForOwner(context.mockRuntime, 'user-123');

  expect(result).toBeNull();
});
