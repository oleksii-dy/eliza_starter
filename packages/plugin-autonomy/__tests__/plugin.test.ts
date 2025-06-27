import { describe, expect, it, beforeEach } from 'bun:test';
import { autoPlugin } from '../src/index';
import { adminChatProvider } from '../src/providers/admin-chat';
import { setAdminAction, toggleLoopAction } from '../src/actions';
import { AutonomousLoopService } from '../src/loop-service';
import { 
  createMockRuntime,
  createUnitTest,
  createPluginTest,
  TestSuite,
  TestDataGenerator
} from '@elizaos/core/test-utils';
import type { IAgentRuntime, Memory, State, UUID } from '@elizaos/core';

describe('Autonomy Plugin Tests', () => {
  let mockRuntime: IAgentRuntime;
  let mockMessage: Memory;
  let mockState: State;

  beforeEach(() => {
    mockRuntime = createMockRuntime({
      character: {
        name: 'TestAgent',
        bio: ['Test agent for autonomy plugin'],
        settings: {},
      },
      getSetting: (key: string) => {
        const settings = {
          ADMIN_USER_ID: 'a1b2c3d4-5678-4abc-b123-123456789012',
          AUTONOMOUS_LOOP_INTERVAL: '30000',
        };
        return settings[key as keyof typeof settings];
      },
      getMemories: async () => [],
      createMemory: async () => 'test-memory-id' as UUID,
      getService: () => null,
    }) as unknown as IAgentRuntime;
    mockMessage = {
      id: 'test-msg-id' as UUID,
      entityId: 'test-user-id' as UUID,
      roomId: 'test-room-id' as UUID,
      content: { text: 'Test message' },
    };

    mockState = {
      values: {},
      data: {},
      text: '',
    };
  });

  // Convert to unified test structure
  const pluginStructureSuite = new TestSuite('Plugin Structure Tests');

  pluginStructureSuite.addTest(createUnitTest(
    'should have correct plugin metadata',
    async () => {
      expect(autoPlugin.name).toBe('auto');
      expect(autoPlugin.description).toContain('autonomous loop');
      expect(autoPlugin.services).toBeDefined();
      expect(autoPlugin.actions).toBeDefined();
      expect(autoPlugin.providers).toBeDefined();
    }
  ));

  pluginStructureSuite.addTest(createUnitTest(
    'should export required components',
    async () => {
      expect(autoPlugin.services).toHaveLength(1);
      expect(autoPlugin.actions).toHaveLength(2);
      expect(autoPlugin.providers).toHaveLength(1);
    }
  ));

  pluginStructureSuite.addTest(createUnitTest(
    'should have the correct service',
    async () => {
      const service = autoPlugin.services?.[0];
      expect(service).toBe(AutonomousLoopService);
    }
  ));

  pluginStructureSuite.addTest(createUnitTest(
    'should have the correct actions',
    async () => {
      const actionNames = autoPlugin.actions?.map((a) => a.name) || [];
      expect(actionNames).toContain('TOGGLE_AUTONOMOUS_LOOP');
      expect(actionNames).toContain('SET_ADMIN_USER');
    }
  ));

  pluginStructureSuite.addTest(createUnitTest(
    'should have the correct provider',
    async () => {
      const provider = autoPlugin.providers?.[0];
      expect(provider?.name).toBe('ADMIN_CHAT');
    }
  ));

  it('should pass all plugin structure tests', async () => {
    const results = await pluginStructureSuite.run();
    expect(results.failed).toBe(0);
    expect(results.passed).toBe(5);
  });

  const serviceSuite = new TestSuite('AutonomousLoopService Tests');

  serviceSuite.addTest(createUnitTest(
    'should be constructable',
    async () => {
      expect(() => new AutonomousLoopService(mockRuntime as IAgentRuntime)).not.toThrow();
    }
  ));

  serviceSuite.addTest(createUnitTest(
    'should have correct service metadata',
    async () => {
      expect(AutonomousLoopService.serviceName).toBe('autonomous-loop');
      expect(AutonomousLoopService.serviceType).toBe('autonomous-loop');
    }
  ));

  it('should pass all service tests', async () => {
    const results = await serviceSuite.run();
    expect(results.failed).toBe(0);
    expect(results.passed).toBe(2);
  });

  const providerSuite = new TestSuite('AdminChat Provider Tests');

  providerSuite.addTest(createUnitTest(
    'should have correct metadata',
    async () => {
      expect(adminChatProvider.name).toBe('ADMIN_CHAT');
      expect(adminChatProvider.description).toContain('conversation history');
    }
  ));

  providerSuite.addTest(createUnitTest(
    'should handle no admin configured',
    async () => {
      const runtimeWithoutAdmin = {
        ...mockRuntime,
        getSetting: () => null,
      };

      const result = await adminChatProvider.get(
        runtimeWithoutAdmin as IAgentRuntime,
        mockMessage,
        mockState
      );

      expect(result.text).toContain('No admin user configured');
      expect(result.data?.adminConfigured).toBe(false);
    }
  ));

  providerSuite.addTest(createUnitTest(
    'should work when admin is configured',
    async () => {
      const result = await adminChatProvider.get(
        mockRuntime as IAgentRuntime,
        mockMessage,
        mockState
      );

      expect(result.data?.adminConfigured).toBe(true);
      expect(result.data?.adminUserId).toBe('a1b2c3d4-5678-4abc-b123-123456789012');
    }
  ));

  it('should pass all provider tests', async () => {
    const results = await providerSuite.run();
    expect(results.failed).toBe(0);
    expect(results.passed).toBe(3);
  });

  const toggleActionSuite = new TestSuite('Toggle Loop Action Tests');

  toggleActionSuite.addTest(createUnitTest(
    'should have correct metadata',
    async () => {
      expect(toggleLoopAction.name).toBe('TOGGLE_AUTONOMOUS_LOOP');
      expect(toggleLoopAction.description).toContain('Toggle');
      expect(toggleLoopAction.validate).toBeDefined();
      expect(toggleLoopAction.handler).toBeDefined();
    }
  ));

  toggleActionSuite.addTest(createPluginTest(
    'should validate correct messages',
    autoPlugin,
    async (runtime, plugin) => {
      const validMessage = {
        ...mockMessage,
        content: { text: 'start autonomous loop' },
      };

      const isValid = await toggleLoopAction.validate(runtime, validMessage);
      expect(isValid).toBe(true);
    }
  ));

  toggleActionSuite.addTest(createPluginTest(
    'should reject invalid messages',
    autoPlugin,
    async (runtime, plugin) => {
      const invalidMessage = {
        ...mockMessage,
        content: { text: 'hello there' },
      };

      const isValid = await toggleLoopAction.validate(runtime, invalidMessage);
      expect(isValid).toBe(false);
    }
  ));

  it('should pass all toggle action tests', async () => {
    const results = await toggleActionSuite.run();
    expect(results.failed).toBe(0);
    expect(results.passed).toBe(3);
  });

  const setAdminSuite = new TestSuite('Set Admin Action Tests');

  setAdminSuite.addTest(createUnitTest(
    'should have correct metadata',
    async () => {
      expect(setAdminAction.name).toBe('SET_ADMIN_USER');
      expect(setAdminAction.description).toContain('admin user');
      expect(setAdminAction.validate).toBeDefined();
      expect(setAdminAction.handler).toBeDefined();
    }
  ));

  setAdminSuite.addTest(createPluginTest(
    'should validate admin setup messages',
    autoPlugin,
    async (runtime, plugin) => {
      const validMessage = {
        ...mockMessage,
        content: { text: 'set me as admin user' },
      };

      const isValid = await setAdminAction.validate(runtime, validMessage);
      expect(isValid).toBe(true);
    }
  ));

  setAdminSuite.addTest(createPluginTest(
    'should reject non-admin messages',
    autoPlugin,
    async (runtime, plugin) => {
      const invalidMessage = {
        ...mockMessage,
        content: { text: 'what is the weather' },
      };

      const isValid = await setAdminAction.validate(runtime, invalidMessage);
      expect(isValid).toBe(false);
    }
  ));

  it('should pass all set admin action tests', async () => {
    const results = await setAdminSuite.run();
    expect(results.failed).toBe(0);
    expect(results.passed).toBe(3);
  });

  const integrationSuite = new TestSuite('Plugin Integration Tests');

  integrationSuite.addTest(createUnitTest(
    'should have all components properly connected',
    async () => {
      // Verify that all expected components are present
      expect(autoPlugin.services).toContain(AutonomousLoopService);
      expect(autoPlugin.actions).toContain(toggleLoopAction);
      expect(autoPlugin.actions).toContain(setAdminAction);
      expect(autoPlugin.providers).toContain(adminChatProvider);
    }
  ));

  integrationSuite.addTest(createUnitTest(
    'should have consistent naming',
    async () => {
      expect(autoPlugin.name).toBe('auto');
      expect(AutonomousLoopService.serviceName).toBe('autonomous-loop');
      expect(adminChatProvider.name).toBe('ADMIN_CHAT');
      expect(toggleLoopAction.name).toBe('TOGGLE_AUTONOMOUS_LOOP');
      expect(setAdminAction.name).toBe('SET_ADMIN_USER');
    }
  ));

  it('should pass all integration tests', async () => {
    const results = await integrationSuite.run();
    expect(results.failed).toBe(0);
    expect(results.passed).toBe(2);
  });
});
