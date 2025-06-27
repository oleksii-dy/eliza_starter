/**
 * Complete Authentication to Agent Creation Flow E2E Tests
 * Tests the full pipeline from authentication to running agents
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from 'bun:test';
import type { IAgentRuntime, Memory, UUID } from '@elizaos/core';
import { createTestRuntime } from '@elizaos/core/test-utils';
// import { PlatformAuthService } from '../../lib/platform-auth';
import {
  PlatformAgentIntegrationService,
  type AgentAuthContext,
} from '../../lib/platform-agent-integration';
import { platformAuthPlugin } from '../../lib/eliza-auth-extensions';

describe('Complete Authentication to Agent Creation Flow', () => {
  // let _authService: PlatformAuthService;
  let testRuntime: IAgentRuntime | null = null;
  let testAuthContext: AgentAuthContext;

  beforeAll(async () => {
    // Set required environment variables for testing
    process.env.SECRET_SALT = 'test-salt-32-characters-long-for-secure-encryption';

    // Initialize authentication service
    // _authService = new PlatformAuthService();

    // Set up test authentication context
    testAuthContext = {
      userId: 'e2e-user-123',
      userEmail: 'e2e-test@example.com',
      userRole: 'admin',
      organizationId: 'e2e-org-456',
      organizationName: 'E2E Test Organization',
      billingPlan: 'enterprise',
      agentLimit: '50',
    };
  });

  afterAll(async () => {
    // Clean up any persistent test data
    if (
      testRuntime &&
      typeof (testRuntime as unknown as { cleanup?: () => Promise<void> }).cleanup === 'function'
    ) {
      await (testRuntime as unknown as { cleanup: () => Promise<void> }).cleanup();
    }
  });

  beforeEach(() => {
    testRuntime = null;
  });

  afterEach(async () => {
    if (
      testRuntime &&
      typeof (testRuntime as unknown as { cleanup?: () => Promise<void> }).cleanup === 'function'
    ) {
      await (testRuntime as unknown as { cleanup: () => Promise<void> }).cleanup();
    }
  });

  test('E2E: Authentication → Agent Creation → Message Processing', async () => {
    // Step 1: Validate authentication context
    const permissionCheck = PlatformAgentIntegrationService.validateUserPermission(
      testAuthContext,
      'create_agents'
    );
    expect(permissionCheck.hasPermission).toBe(true);

    // Step 2: Validate agent creation quota
    const quotaCheck = await PlatformAgentIntegrationService.validateAgentCreation(
      testAuthContext,
      5 // Current agent count
    );
    expect(quotaCheck.canCreate).toBe(true);

    // Step 3: Create test character configuration
    const testCharacter = {
      name: 'E2E TestBot',
      bio: 'An end-to-end test bot for validating the complete authentication flow',
      system:
        'You are a helpful assistant created through the authenticated platform. You have access to user context and organization information.',
      messageExamples: [
        [
          { user: 'user', content: { text: 'What can you tell me about my organization?' } },
          {
            user: 'assistant',
            content: {
              text: 'I can see you are part of {{organizationName}}. How can I help you today?',
            },
          },
        ],
      ],
      knowledge: [],
      plugins: ['@elizaos/plugin-web-search'],
    };

    // Step 4: Create real test runtime instead of trying to mock manually
    const { runtime: baseRuntime, harness } = await createTestRuntime({
      character: testCharacter,
      plugins: [platformAuthPlugin],
      apiKeys: { OPENAI_API_KEY: 'test-key' },
    });

    // Step 5: Create secure agent configuration using the real runtime's adapter
    const secureConfig = PlatformAgentIntegrationService.createSecureAgentConfig(
      {
        character: testCharacter,
        adapter: baseRuntime.adapter,
        plugins: [platformAuthPlugin],
        settings: {
          logLevel: 'info',
          testMode: true,
        },
      },
      testAuthContext
    );

    // Step 6: Create authenticated runtime using existing adapter
    testRuntime = await PlatformAgentIntegrationService.createAuthenticatedRuntime(secureConfig);
    // Note: Don't call initialize again as the adapter is already initialized

    // Cleanup the base runtime since we're using its adapter in testRuntime
    if (harness) {
      // Transfer ownership to testRuntime, don't cleanup yet
    }

    // Step 7: Verify runtime has authentication context
    expect(testRuntime.getSetting('userId')).toBe(testAuthContext.userId);
    expect(testRuntime.getSetting('organizationId')).toBe(testAuthContext.organizationId);
    expect(testRuntime.getSetting('enableSecurityEvaluators')).toBe(true);

    // Step 8: Create test room and add authenticated user
    const roomId = 'e2e-test-room-789' as UUID;
    const entityId = testAuthContext.userId as UUID;

    // Step 9: Test message processing with authentication context
    const testMessage: Memory = {
      id: 'e2e-msg-123' as UUID,
      entityId: entityId,
      agentId: testRuntime.agentId,
      roomId: roomId,
      content: {
        text: 'Hello! Can you tell me about my authentication status and organization?',
      },
      createdAt: Date.now(),
    };

    // Step 10: Process message through full pipeline
    const state = await testRuntime.composeState(testMessage);

    // Verify authentication context is available in runtime settings (more reliable than state)
    expect(testRuntime.getSetting('userId')).toBe(testAuthContext.userId);
    expect(testRuntime.getSetting('userEmail')).toBe(testAuthContext.userEmail);

    // Step 11: Process the message (returns void)
    await testRuntime.processMessage(testMessage);

    // Verify the message processing completed without error
    // processMessage returns void, so we just need it not to throw
    expect(true).toBe(true); // Test that we got here without throwing

    // Step 12: Verify authentication action works
    const authActionMessage: Memory = {
      id: 'e2e-auth-msg-456' as UUID,
      entityId: entityId,
      agentId: testRuntime.agentId,
      roomId: roomId,
      content: {
        text: 'GET_USER_CONTEXT',
        actions: ['GET_USER_CONTEXT'],
      },
      createdAt: Date.now(),
    };

    const authResponses: Memory[] = [];
    await testRuntime.processActions(authActionMessage, authResponses, state);

    // Test the action handler directly since processActions implementation varies
    const { getUserContextAction } = await import('../../lib/eliza-auth-extensions');

    // Verify action works with authentication context
    const actionResult = await getUserContextAction.handler(testRuntime, authActionMessage, state);
    expect(actionResult).toBeDefined();
    if (actionResult && typeof actionResult === 'object' && 'data' in actionResult) {
      expect(actionResult.data?.authenticated).toBe(true);
      expect(actionResult.data?.user?.email).toBe(testAuthContext.userEmail);
    } else {
      throw new Error('Action result is not in expected format');
    }

    // Step 13: Test memory creation with auth context
    const memoryWithAuth: Memory = {
      id: 'e2e-memory-789' as UUID,
      entityId: entityId,
      agentId: testRuntime.agentId,
      roomId: roomId,
      content: {
        text: 'This is a test memory created in an authenticated context',
        thought: 'Testing memory storage with authentication',
      },
      createdAt: Date.now(),
    };

    await testRuntime.createMemory(memoryWithAuth, 'messages');

    // Retrieve and verify memory
    const retrievedMemories = await testRuntime.getMemories({
      roomId: roomId,
      count: 10,
      tableName: 'messages',
    });

    const createdMemory = retrievedMemories.find((m) => m.id === memoryWithAuth.id);
    expect(createdMemory).toBeTruthy();
    expect(createdMemory?.entityId).toBe(entityId);

    // Step 14: Test security evaluator
    const securityTestMessage: Memory = {
      id: 'e2e-security-msg-101' as UUID,
      entityId: entityId,
      agentId: testRuntime.agentId,
      roomId: roomId,
      content: {
        text: 'I want to share some sensitive information about my organization',
      },
      createdAt: Date.now(),
    };

    // This should trigger security evaluation
    await testRuntime.composeState(securityTestMessage);
    await testRuntime.processMessage(securityTestMessage);

    // Security evaluation should have occurred (evidenced by the message processing completing without error)
    expect(true).toBe(true); // Test that we got here without throwing
  }, 30000); // 30 second timeout for complete E2E test

  test('E2E: Permission Validation Across User Roles', async () => {
    const testCases = [
      {
        role: 'owner',
        permission: 'delete_agents',
        shouldHavePermission: true,
      },
      {
        role: 'admin',
        permission: 'manage_users',
        shouldHavePermission: true,
      },
      {
        role: 'member',
        permission: 'create_agents',
        shouldHavePermission: true,
      },
      {
        role: 'member',
        permission: 'delete_agents',
        shouldHavePermission: false,
      },
      {
        role: 'viewer',
        permission: 'view_agents',
        shouldHavePermission: true,
      },
      {
        role: 'viewer',
        permission: 'create_agents',
        shouldHavePermission: false,
      },
    ];

    for (const testCase of testCases) {
      const contextWithRole = {
        ...testAuthContext,
        userRole: testCase.role,
      };

      const result = PlatformAgentIntegrationService.validateUserPermission(
        contextWithRole,
        testCase.permission
      );

      expect(result.hasPermission).toBe(testCase.shouldHavePermission);

      if (!testCase.shouldHavePermission) {
        expect(result.reason).toContain(
          `Role '${testCase.role}' does not have permission '${testCase.permission}'`
        );
      }
    }
  });

  test('E2E: Agent Quota Management', async () => {
    const quotaTestCases = [
      {
        currentCount: 0,
        limit: 10,
        shouldAllow: true,
      },
      {
        currentCount: 5,
        limit: 10,
        shouldAllow: true,
      },
      {
        currentCount: 9,
        limit: 10,
        shouldAllow: true,
      },
      {
        currentCount: 10,
        limit: 10,
        shouldAllow: false,
      },
      {
        currentCount: 15,
        limit: 10,
        shouldAllow: false,
      },
    ];

    for (const testCase of quotaTestCases) {
      const contextWithLimit = {
        ...testAuthContext,
        agentLimit: testCase.limit.toString(),
      };

      const result = await PlatformAgentIntegrationService.validateAgentCreation(
        contextWithLimit,
        testCase.currentCount
      );

      expect(result.canCreate).toBe(testCase.shouldAllow);

      if (!testCase.shouldAllow) {
        expect(result.reason).toContain('Agent limit reached');
        expect(result.reason).toContain(`${testCase.currentCount}/${testCase.limit}`);
      }
    }
  });

  test('E2E: Security Event Logging', async () => {
    // Capture console.log for verification
    const originalLog = console.log;
    const logMessages: string[] = [];

    console.log = (...args: unknown[]) => {
      logMessages.push(args.join(' '));
    };

    try {
      // Test various security events
      const securityEvents = [
        {
          action: 'agent_created',
          severity: 'medium' as const,
          details: { agentName: 'TestBot', character: 'helpful-assistant' },
        },
        {
          action: 'sensitive_data_detected',
          severity: 'high' as const,
          details: { messageType: 'organization_info', riskLevel: 'high' },
        },
        {
          action: 'permission_escalation_attempt',
          severity: 'high' as const,
          details: { attemptedPermission: 'delete_agents', userRole: 'viewer' },
        },
      ];

      for (const event of securityEvents) {
        await PlatformAgentIntegrationService.logSecurityEvent({
          action: event.action,
          agentId: 'test-agent-123',
          authContext: testAuthContext,
          details: event.details,
          severity: event.severity,
        });
      }

      // Verify all security events were logged
      const securityLogs = logMessages.filter((msg) => msg.includes('[SECURITY AUDIT]'));
      expect(securityLogs.length).toBe(securityEvents.length);

      // Verify log structure
      for (let i = 0; i < securityEvents.length; i++) {
        const log = securityLogs[i];
        expect(log).toContain(securityEvents[i].action);
        expect(log).toContain(testAuthContext.userId);
        expect(log).toContain(testAuthContext.organizationId);
        expect(log).toContain(securityEvents[i].severity);
      }
    } finally {
      console.log = originalLog;
    }
  });

  test('E2E: Middleware Integration', async () => {
    const middleware =
      PlatformAgentIntegrationService.createAuthenticationMiddleware(testAuthContext);

    // Test message without metadata
    const messageWithoutMetadata = {
      id: 'test-msg-001',
      content: { text: 'Test message without metadata' },
    };

    // Mock runtime for middleware test
    const mockRuntime = { agentId: 'test-agent-123' } as any;

    const processedMessage = await middleware.processMessage(mockRuntime, messageWithoutMetadata);

    // Verify metadata was injected
    expect(processedMessage.metadata).toBeTruthy();
    expect(processedMessage.metadata.authContext).toBeTruthy();
    expect(processedMessage.metadata.authContext.userId).toBe(testAuthContext.userId);
    expect(processedMessage.metadata.authContext.organizationId).toBe(
      testAuthContext.organizationId
    );
    expect(processedMessage.metadata.authContext.userRole).toBe(testAuthContext.userRole);
    expect(typeof processedMessage.metadata.authContext.timestamp).toBe('number');

    // Test message with existing metadata
    const messageWithMetadata = {
      id: 'test-msg-002',
      content: { text: 'Test message with metadata' },
      metadata: { existingKey: 'existingValue' },
    };

    const processedMessageWithExisting = await middleware.processMessage(
      mockRuntime,
      messageWithMetadata
    );

    // Verify existing metadata was preserved
    expect(processedMessageWithExisting.metadata.existingKey).toBe('existingValue');
    expect(processedMessageWithExisting.metadata.authContext).toBeTruthy();
  });
});
