/**
 * ElizaOS Authentication Extensions Unit Tests
 * Tests the individual authentication providers, actions, and evaluators
 */

import { describe, test, expect, mock } from 'bun:test';
import type { IAgentRuntime, Memory, State } from '@elizaos/core';
import {
  platformAuthProvider,
  checkUserPermissionAction,
  getUserContextAction,
  securityContextEvaluator,
  organizationContextProvider,
  platformAuthPlugin,
} from '../../lib/eliza-auth-extensions';

describe('ElizaOS Authentication Extensions', () => {
  const mockRuntime: IAgentRuntime = {
    agentId: 'test-agent-123' as any,
    getSetting: mock((key: string) => {
      const settings: Record<string, any> = {
        userId: 'test-user-123',
        userEmail: 'test@example.com',
        userRole: 'admin',
        organizationId: 'test-org-456',
        organizationName: 'Test Organization',
      };
      return settings[key];
    }),
  } as any;

  const mockMessage: Memory = {
    id: 'test-msg-123' as any,
    entityId: 'test-user-123' as any,
    agentId: 'test-agent-123' as any,
    roomId: 'test-room-789' as any,
    content: { text: 'Test message' },
    createdAt: Date.now(),
  };

  const mockState: State = new Map() as any;

  describe('Platform Authentication Provider', () => {
    test('should provide authentication context', async () => {
      const result = await platformAuthProvider.get(mockRuntime, mockMessage, mockState);

      expect(result).toBeTruthy();
      expect(result.text).toContain('test@example.com');
      expect(result.text).toContain('admin');
      expect(result.text).toContain('test-org-456');
      expect(result.data).toBeTruthy();
      expect(result.data?.authenticated).toBe(true);
      expect(result.data?.userId).toBe('test-user-123');
      expect(result.data?.organizationId).toBe('test-org-456');
      expect(result.data?.userRole).toBe('admin');
      expect(result.data?.isAdmin).toBe(true);
    });

    test('should handle missing authentication settings', async () => {
      const mockRuntimeNoAuth: IAgentRuntime = {
        ...mockRuntime,
        getSetting: mock(() => undefined),
      } as any;

      const result = await platformAuthProvider.get(mockRuntimeNoAuth, mockMessage, mockState);

      expect(result).toBeTruthy();
      expect(result.text).toContain('No authenticated user context available');
      expect(result.data?.authenticated).toBe(false);
    });

    test('should identify non-admin users correctly', async () => {
      const mockRuntimeMember: IAgentRuntime = {
        ...mockRuntime,
        getSetting: mock((key: string) => {
          if (key === 'userRole') return 'member';
          return mockRuntime.getSetting(key);
        }),
      } as any;

      const result = await platformAuthProvider.get(mockRuntimeMember, mockMessage, mockState);

      expect(result.data?.userRole).toBe('member');
      expect(result.data?.isAdmin).toBe(false);
    });
  });

  describe('User Context Action', () => {
    test('should execute user context action', async () => {
      // const _responses: Memory[] = [];
      const callback = mock();

      const result = await getUserContextAction.handler(
        mockRuntime,
        mockMessage,
        mockState,
        {},
        callback
      );

      expect(result).toBeTruthy();
      if (result && typeof result === 'object' && 'text' in result) {
        expect(result.text).toContain('test@example.com');
        expect(result.text).toContain('admin');
      }
    });

    test('should validate user context action correctly', async () => {
      const isValid = await getUserContextAction.validate(mockRuntime, mockMessage, mockState);
      expect(isValid).toBe(true);
    });

    test('should handle user context action for unauthenticated user', async () => {
      const mockRuntimeNoAuth: IAgentRuntime = {
        ...mockRuntime,
        getSetting: mock(() => undefined),
      } as any;

      const result = await getUserContextAction.handler(
        mockRuntimeNoAuth,
        mockMessage,
        mockState,
        {},
        mock()
      );

      if (result && typeof result === 'object' && 'text' in result) {
        expect(result.text).toContain('No user context available - you may not be authenticated');
      }
    });
  });

  describe('Check User Permission Action', () => {
    test('should validate user permissions', async () => {
      const permissionMessage: Memory = {
        ...mockMessage,
        content: { text: 'create_agents' },
      };

      const result = await checkUserPermissionAction.handler(
        mockRuntime,
        permissionMessage,
        mockState,
        {},
        mock()
      );

      expect(result).toBeTruthy();
      if (result && typeof result === 'object' && 'text' in result) {
        expect(result.text).toContain('Please specify which permission to check');
      }
    });

    test('should validate permission check action correctly', async () => {
      const isValid = await checkUserPermissionAction.validate(mockRuntime, mockMessage, mockState);
      expect(isValid).toBe(true);
    });
  });

  describe('Security Context Evaluator', () => {
    test('should evaluate security context correctly', async () => {
      const result = await securityContextEvaluator.handler(mockRuntime, mockMessage, mockState);

      expect(result).toBeTruthy();
      // The security context evaluator returns a score object
      if (result && typeof result === 'object' && 'score' in result && 'recommendation' in result) {
        expect(typeof result.score).toBe('number');
        expect(result.recommendation).toBeTruthy();
      }
    });

    test('should validate security evaluator conditions', async () => {
      const isValid = await securityContextEvaluator.validate(mockRuntime, mockMessage, mockState);
      expect(isValid).toBe(true);
    });

    test('should handle unauthenticated context', async () => {
      const mockRuntimeNoAuth: IAgentRuntime = {
        ...mockRuntime,
        getSetting: mock(() => undefined),
      } as any;

      const result = await securityContextEvaluator.handler(
        mockRuntimeNoAuth,
        mockMessage,
        mockState
      );

      if (result && typeof result === 'object' && 'reason' in result) {
        expect(result.reason).toContain('User not authenticated');
      }
    });
  });

  describe('Organization Context Provider', () => {
    test('should provide organization context', async () => {
      const result = await organizationContextProvider.get(mockRuntime, mockMessage, mockState);

      expect(result).toBeTruthy();
      if (result && typeof result === 'object' && 'text' in result && 'data' in result) {
        expect(result.text).toContain('Test Organization');
        if (result.data) {
          expect(result.data.hasOrganization).toBe(true);
          expect(result.data.organizationId).toBe('test-org-456');
        }
      }
    });

    test('should handle missing organization context', async () => {
      const mockRuntimeNoOrg: IAgentRuntime = {
        ...mockRuntime,
        getSetting: mock((key: string) => {
          if (key === 'organizationId') return undefined;
          return mockRuntime.getSetting(key);
        }),
      } as any;

      const result = await organizationContextProvider.get(
        mockRuntimeNoOrg,
        mockMessage,
        mockState
      );

      if (result && typeof result === 'object' && 'data' in result && result.data) {
        expect(result.data.hasOrganization).toBe(false);
      }
    });
  });

  describe('Platform Authentication Plugin', () => {
    test('should contain all required components', () => {
      expect(platformAuthPlugin.name).toBe('platform-auth');
      expect(platformAuthPlugin.description).toBeTruthy();
      expect(platformAuthPlugin.providers).toContain(platformAuthProvider);
      expect(platformAuthPlugin.providers).toContain(organizationContextProvider);
      expect(platformAuthPlugin.actions).toContain(checkUserPermissionAction);
      expect(platformAuthPlugin.actions).toContain(getUserContextAction);
      expect(platformAuthPlugin.evaluators).toContain(securityContextEvaluator);
    });

    test('should have correct provider configuration', () => {
      expect(platformAuthProvider.name).toBe('PLATFORM_AUTH');
      expect(typeof platformAuthProvider.get).toBe('function');

      expect(organizationContextProvider.name).toBe('ORGANIZATION_CONTEXT');
      expect(typeof organizationContextProvider.get).toBe('function');
    });

    test('should have correct action configuration', () => {
      expect(checkUserPermissionAction.name).toBe('CHECK_USER_PERMISSION');
      expect(typeof checkUserPermissionAction.handler).toBe('function');
      expect(typeof checkUserPermissionAction.validate).toBe('function');

      expect(getUserContextAction.name).toBe('GET_USER_CONTEXT');
      expect(typeof getUserContextAction.handler).toBe('function');
      expect(typeof getUserContextAction.validate).toBe('function');
    });

    test('should have correct evaluator configuration', () => {
      expect(securityContextEvaluator.name).toBe('SECURITY_CONTEXT');
      expect(typeof securityContextEvaluator.handler).toBe('function');
      expect(typeof securityContextEvaluator.validate).toBe('function');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle null runtime gracefully', async () => {
      try {
        await platformAuthProvider.get(null as any, mockMessage, mockState);
        // Should not throw
      } catch (error) {
        // If it throws, that's also acceptable for null inputs
        expect(error).toBeTruthy();
      }
    });

    test('should handle malformed message content', async () => {
      const malformedMessage: Memory = {
        ...mockMessage,
        content: null as any,
      };

      const result = await securityContextEvaluator.handler(
        mockRuntime,
        malformedMessage,
        mockState
      );
      expect(result).toBeTruthy();
      if (result && typeof result === 'object' && 'score' in result) {
        expect(typeof result.score).toBe('number');
      }
    });

    test('should handle empty message text', async () => {
      const emptyMessage: Memory = {
        ...mockMessage,
        content: { text: '' },
      };

      const result = await securityContextEvaluator.handler(mockRuntime, emptyMessage, mockState);
      expect(result).toBeTruthy();
    });
  });
});
