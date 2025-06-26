import { describe, expect, it, beforeEach } from 'bun:test';
import { autoPlugin } from '../src/index';
import { adminChatProvider } from '../src/providers/admin-chat';
import { setAdminAction, toggleLoopAction } from '../src/actions';
import { AutonomousLoopService } from '../src/loop-service';
import type { IAgentRuntime, Memory, State, UUID } from '@elizaos/core';

// Mock runtime for testing
const createMockRuntime = (): Partial<IAgentRuntime> => ({
  agentId: 'test-agent-id' as UUID,
  character: {
    name: 'TestAgent',
    bio: ['Test agent for autonomy plugin'],
    settings: {}
  },
  getSetting: (key: string) => {
    const settings = {
      ADMIN_USER_ID: 'a1b2c3d4-5678-4abc-b123-123456789012',
      AUTONOMOUS_LOOP_INTERVAL: '30000'
    };
    return settings[key as keyof typeof settings];
  },
  getMemories: async () => [],
  createMemory: async () => 'test-memory-id' as UUID,
  getService: () => null,
});

describe('Autonomy Plugin Tests', () => {
  let mockRuntime: Partial<IAgentRuntime>;
  let mockMessage: Memory;
  let mockState: State;

  beforeEach(() => {
    mockRuntime = createMockRuntime();
    mockMessage = {
      id: 'test-msg-id' as UUID,
      entityId: 'test-user-id' as UUID,
      roomId: 'test-room-id' as UUID,
      content: { text: 'Test message' }
    };
    
    mockState = {
      values: {},
      data: {},
      text: ''
    };
  });

  describe('Plugin Structure', () => {
    it('should have correct plugin metadata', () => {
      expect(autoPlugin.name).toBe('auto');
      expect(autoPlugin.description).toContain('autonomous loop');
      expect(autoPlugin.services).toBeDefined();
      expect(autoPlugin.actions).toBeDefined();
      expect(autoPlugin.providers).toBeDefined();
    });

    it('should export required components', () => {
      expect(autoPlugin.services).toHaveLength(1);
      expect(autoPlugin.actions).toHaveLength(2);
      expect(autoPlugin.providers).toHaveLength(1);
    });

    it('should have the correct service', () => {
      const service = autoPlugin.services?.[0];
      expect(service).toBe(AutonomousLoopService);
    });

    it('should have the correct actions', () => {
      const actionNames = autoPlugin.actions?.map(a => a.name) || [];
      expect(actionNames).toContain('TOGGLE_AUTONOMOUS_LOOP');
      expect(actionNames).toContain('SET_ADMIN_USER');
    });

    it('should have the correct provider', () => {
      const provider = autoPlugin.providers?.[0];
      expect(provider?.name).toBe('ADMIN_CHAT');
    });
  });

  describe('AutonomousLoopService', () => {
    it('should be constructable', () => {
      expect(() => new AutonomousLoopService(mockRuntime as IAgentRuntime)).not.toThrow();
    });

    it('should have correct service metadata', () => {
      expect(AutonomousLoopService.serviceName).toBe('autonomous-loop');
      expect(AutonomousLoopService.serviceType).toBe('autonomous-loop');
    });
  });

  describe('AdminChat Provider', () => {
    it('should have correct metadata', () => {
      expect(adminChatProvider.name).toBe('ADMIN_CHAT');
      expect(adminChatProvider.description).toContain('conversation history');
    });

    it('should handle no admin configured', async () => {
      const runtimeWithoutAdmin = {
        ...mockRuntime,
        getSetting: () => null
      };

      const result = await adminChatProvider.get(
        runtimeWithoutAdmin as IAgentRuntime,
        mockMessage,
        mockState
      );

      expect(result.text).toContain('No admin user configured');
      expect(result.data?.adminConfigured).toBe(false);
    });

    it('should work when admin is configured', async () => {
      const result = await adminChatProvider.get(
        mockRuntime as IAgentRuntime,
        mockMessage,
        mockState
      );

      expect(result.data?.adminConfigured).toBe(true);
      expect(result.data?.adminUserId).toBe('a1b2c3d4-5678-4abc-b123-123456789012');
    });
  });

  describe('Toggle Loop Action', () => {
    it('should have correct metadata', () => {
      expect(toggleLoopAction.name).toBe('TOGGLE_AUTONOMOUS_LOOP');
      expect(toggleLoopAction.description).toContain('Toggle');
      expect(toggleLoopAction.validate).toBeDefined();
      expect(toggleLoopAction.handler).toBeDefined();
    });

    it('should validate correct messages', async () => {
      const validMessage = {
        ...mockMessage,
        content: { text: 'start autonomous loop' }
      };

      const isValid = await toggleLoopAction.validate(mockRuntime as IAgentRuntime, validMessage);
      expect(isValid).toBe(true);
    });

    it('should reject invalid messages', async () => {
      const invalidMessage = {
        ...mockMessage,
        content: { text: 'hello there' }
      };

      const isValid = await toggleLoopAction.validate(mockRuntime as IAgentRuntime, invalidMessage);
      expect(isValid).toBe(false);
    });
  });

  describe('Set Admin Action', () => {
    it('should have correct metadata', () => {
      expect(setAdminAction.name).toBe('SET_ADMIN_USER');
      expect(setAdminAction.description).toContain('admin user');
      expect(setAdminAction.validate).toBeDefined();
      expect(setAdminAction.handler).toBeDefined();
    });

    it('should validate admin setup messages', async () => {
      const validMessage = {
        ...mockMessage,
        content: { text: 'set me as admin user' }
      };

      const isValid = await setAdminAction.validate(mockRuntime as IAgentRuntime, validMessage);
      expect(isValid).toBe(true);
    });

    it('should reject non-admin messages', async () => {
      const invalidMessage = {
        ...mockMessage,
        content: { text: 'what is the weather' }
      };

      const isValid = await setAdminAction.validate(mockRuntime as IAgentRuntime, invalidMessage);
      expect(isValid).toBe(false);
    });
  });

  describe('Plugin Integration', () => {
    it('should have all components properly connected', () => {
      // Verify that all expected components are present
      expect(autoPlugin.services).toContain(AutonomousLoopService);
      expect(autoPlugin.actions).toContain(toggleLoopAction);
      expect(autoPlugin.actions).toContain(setAdminAction);
      expect(autoPlugin.providers).toContain(adminChatProvider);
    });

    it('should have consistent naming', () => {
      expect(autoPlugin.name).toBe('auto');
      expect(AutonomousLoopService.serviceName).toBe('autonomous-loop');
      expect(adminChatProvider.name).toBe('ADMIN_CHAT');
      expect(toggleLoopAction.name).toBe('TOGGLE_AUTONOMOUS_LOOP');
      expect(setAdminAction.name).toBe('SET_ADMIN_USER');
    });
  });
});
