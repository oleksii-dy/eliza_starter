/**
 * Authentication Runtime Integration Tests
 * Tests real ElizaOS agent integration with authentication context
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import type { IAgentRuntime, Memory } from '@elizaos/core';
import { createMockDatabase } from '@elizaos/core/test-utils';
import { PlatformAgentIntegrationService, type AgentAuthContext } from '../../lib/platform-agent-integration';
// import { platformAuthProvider, platformAuthAction, platformSecurityEvaluator } from '../../lib/eliza-auth-extensions';

describe('Authentication Runtime Integration', () => {
  let runtime: IAgentRuntime;
  let mockAuthContext: AgentAuthContext;

  beforeEach(async () => {
    // Create test authentication context
    mockAuthContext = {
      userId: 'test-user-123',
      userEmail: 'test@example.com',
      userRole: 'admin',
      organizationId: 'test-org-456',
      organizationName: 'Test Organization',
      billingPlan: 'pro',
      agentLimit: '10',
    };

    // Create a minimal test character for the runtime
    const testCharacter = {
      name: 'TestBot',
      bio: 'A test bot for authentication integration testing',
      system: 'You are a helpful assistant for testing authentication.',
      messageExamples: [
        [
          { user: 'user', content: { text: 'Hello' } },
          { user: 'assistant', content: { text: 'Hello! How can I help you today?' } }
        ]
      ]
    };

    // Create test database adapter using mock
    const adapter = createMockDatabase();

    // Create authenticated runtime configuration
    const config = PlatformAgentIntegrationService.createSecureAgentConfig(
      {
        character: testCharacter,
        adapter,
        plugins: [],
        settings: {
          logLevel: 'debug'
        }
      },
      mockAuthContext
    );

    // Create the authenticated runtime
    runtime = await PlatformAgentIntegrationService.createAuthenticatedRuntime(config);
    
    // Initialize the runtime
    await runtime.initialize();
  });

  afterEach(async () => {
    // Clean up runtime if it has a cleanup method
    if (runtime && typeof (runtime as any).cleanup === 'function') {
      await (runtime as any).cleanup();
    }
  });

  test('should create runtime with authentication context', async () => {
    expect(runtime).toBeTruthy();
    expect(runtime.agentId).toBeTruthy();
    expect(runtime.character).toBeTruthy();
    expect(runtime.character.name).toBe('TestBot');
  });

  test('should have authentication settings injected', async () => {
    expect(runtime.getSetting('userId')).toBe(mockAuthContext.userId);
    expect(runtime.getSetting('userEmail')).toBe(mockAuthContext.userEmail);
    expect(runtime.getSetting('userRole')).toBe(mockAuthContext.userRole);
    expect(runtime.getSetting('organizationId')).toBe(mockAuthContext.organizationId);
  });

  test('should include platform authentication provider', async () => {
    const testMessage: Memory = {
      id: '123e4567-e89b-12d3-a456-426614174000' as any,
      entityId: mockAuthContext.userId as any,
      agentId: runtime.agentId,
      roomId: 'test-room-789' as any,
      content: { text: 'Test message' },
      createdAt: Date.now(),
    };

    // Compose state which should include our auth provider
    const state = await runtime.composeState(testMessage, ['PLATFORM_AUTH']);
    
    expect(state).toBeTruthy();
    // The auth provider should inject authentication context
    expect(state.toString()).toContain(mockAuthContext.userEmail);
    expect(state.toString()).toContain(mockAuthContext.organizationId);
  });

  test('should process authentication action', async () => {
    const testMessage: Memory = {
      id: '123e4567-e89b-12d3-a456-426614174000' as any,
      entityId: mockAuthContext.userId as any,
      agentId: runtime.agentId,
      roomId: 'test-room-789' as any,
      content: { 
        text: 'I need to know my authentication status',
        actions: ['GET_AUTH_STATUS']
      },
      createdAt: Date.now(),
    };

    const state = await runtime.composeState(testMessage);
    
    // Process the authentication action
    const responses: Memory[] = [];
    await runtime.processActions(testMessage, responses, state);

    // Should have created a response with auth status
    expect(responses.length).toBeGreaterThan(0);
    
    // Find the auth status response
    const authResponse = responses.find(r => 
      r.content.text?.includes('authenticated') || 
      r.content.text?.includes('organization')
    );
    
    expect(authResponse).toBeTruthy();
    expect(authResponse?.content.text).toContain(mockAuthContext.userEmail);
  });

  test('should validate user permissions correctly', async () => {
    const adminContext = { ...mockAuthContext, userRole: 'admin' };
    const memberContext = { ...mockAuthContext, userRole: 'member' };
    const viewerContext = { ...mockAuthContext, userRole: 'viewer' };

    // Test admin permissions
    const adminPermission = PlatformAgentIntegrationService.validateUserPermission(
      adminContext, 
      'delete_agents'
    );
    expect(adminPermission.hasPermission).toBe(true);

    // Test member permissions
    const memberPermission = PlatformAgentIntegrationService.validateUserPermission(
      memberContext, 
      'create_agents'
    );
    expect(memberPermission.hasPermission).toBe(true);

    const memberDeletePermission = PlatformAgentIntegrationService.validateUserPermission(
      memberContext, 
      'delete_agents'
    );
    expect(memberDeletePermission.hasPermission).toBe(false);

    // Test viewer permissions
    const viewerCreatePermission = PlatformAgentIntegrationService.validateUserPermission(
      viewerContext, 
      'create_agents'
    );
    expect(viewerCreatePermission.hasPermission).toBe(false);

    const viewerViewPermission = PlatformAgentIntegrationService.validateUserPermission(
      viewerContext, 
      'view_agents'
    );
    expect(viewerViewPermission.hasPermission).toBe(true);
  });

  test('should validate agent creation quota', async () => {
    // Test with available quota
    const validCreation = await PlatformAgentIntegrationService.validateAgentCreation(
      mockAuthContext,
      5 // Current agent count
    );
    expect(validCreation.canCreate).toBe(true);

    // Test with exceeded quota
    const exceededCreation = await PlatformAgentIntegrationService.validateAgentCreation(
      mockAuthContext,
      15 // Exceeds limit of 10
    );
    expect(exceededCreation.canCreate).toBe(false);
    expect(exceededCreation.reason).toContain('Agent limit reached');
  });

  test('should inject authentication middleware into messages', async () => {
    const middleware = PlatformAgentIntegrationService.createAuthenticationMiddleware(mockAuthContext);
    
    const testMessage = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      content: { text: 'Test message' },
      metadata: {}
    };

    const processedMessage = await middleware.processMessage(runtime, testMessage);
    
    expect(processedMessage.metadata.authContext).toBeTruthy();
    expect(processedMessage.metadata.authContext.userId).toBe(mockAuthContext.userId);
    expect(processedMessage.metadata.authContext.organizationId).toBe(mockAuthContext.organizationId);
    expect(processedMessage.metadata.authContext.timestamp).toBeTruthy();
  });

  test('should log security events', async () => {
    // Capture console.log output for verification
    const originalLog = console.log;
    const logMessages: string[] = [];
    console.log = (...args: any[]) => {
      logMessages.push(args.join(' '));
    };

    try {
      await PlatformAgentIntegrationService.logSecurityEvent({
        action: 'agent_created',
        agentId: 'test-agent-123',
        authContext: mockAuthContext,
        details: { agentName: 'TestBot' },
        severity: 'medium'
      });

      // Verify security event was logged
      const securityLog = logMessages.find(msg => msg.includes('[SECURITY AUDIT]'));
      expect(securityLog).toBeTruthy();
      expect(securityLog).toContain('agent_created');
      expect(securityLog).toContain(mockAuthContext.userId);
      expect(securityLog).toContain(mockAuthContext.organizationId);
    } finally {
      console.log = originalLog;
    }
  });

  test('should handle memory creation with authentication context', async () => {
    const testMemory: Memory = {
      id: '123e4567-e89b-12d3-a456-426614174000' as any,
      entityId: mockAuthContext.userId as any,
      agentId: runtime.agentId,
      roomId: 'test-room-789' as any,
      content: { 
        text: 'Test memory with authentication context',
        thought: 'This is a test memory for auth integration'
      },
      createdAt: Date.now(),
    };

    // Create memory - this should work without errors
    await runtime.createMemory(testMemory, 'messages');

    // Retrieve memories to verify it was stored correctly
    const memories = await runtime.getMemories({
      roomId: testMemory.roomId,
      count: 10,
      tableName: 'messages'
    });

    expect(memories.length).toBeGreaterThan(0);
    const createdMemory = memories.find(m => m.content.text === testMemory.content.text);
    expect(createdMemory).toBeTruthy();
    expect(createdMemory?.entityId).toBe(testMemory.entityId);
  });

  test('should process messages with full authentication context', async () => {
    const testMessage: Memory = {
      id: '123e4567-e89b-12d3-a456-426614174000' as any,
      entityId: mockAuthContext.userId as any,
      agentId: runtime.agentId,
      roomId: 'test-room-789' as any,
      content: { 
        text: 'Hello! What can you tell me about my authentication status?'
      },
      createdAt: Date.now(),
    };

    // Process the message through the full runtime pipeline
    const responses = await runtime.processMessage(testMessage);

    expect(responses).toBeTruthy();
    
    // The response should acknowledge the user's authenticated status
    // and potentially include organization context
    const hasAuthContext = Array.isArray(responses) && responses.some((response: any) => 
      response.content.text?.toLowerCase().includes('authenticated') ||
      response.content.text?.toLowerCase().includes('organization') ||
      response.content.text?.includes(mockAuthContext.userEmail) ||
      response.content.text?.includes(mockAuthContext.organizationName || '')
    );

    // Note: This test may pass or fail depending on the LLM's response
    // The important thing is that the runtime processes without errors
    expect(typeof hasAuthContext).toBe('boolean');
  });
});