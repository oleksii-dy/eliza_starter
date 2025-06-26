/**
 * Simplified Platform Authentication Flow Integration Tests
 * Tests authentication integration components without full Tauri dependency
 */

import { describe, test, expect, beforeEach } from 'bun:test';
import { PlatformAgentIntegrationService, type AgentAuthContext } from '../../lib/platform-agent-integration';

describe('Platform Authentication Integration', () => {
  let mockAuthContext: AgentAuthContext;

  beforeEach(() => {
    // Mock session data that would come from the platform
    mockAuthContext = {
      userId: 'test-user-123',
      userEmail: 'test@example.com',
      userRole: 'admin',
      organizationId: 'test-org-456',
      organizationName: 'Test Organization',
      billingPlan: 'pro',
      agentLimit: '10',
    };
  });

  test('should extract authentication context from session data', () => {
    const sessionData = {
      userId: 'test-user-123',
      email: 'test@example.com',
      role: 'admin',
      organizationId: 'test-org-456',
      organizationName: 'Test Organization',
      billingPlan: 'pro',
      agentLimit: '10',
    };

    const authContext = PlatformAgentIntegrationService.extractAuthContext(sessionData);

    expect(authContext.userId).toBe(sessionData.userId);
    expect(authContext.userEmail).toBe(sessionData.email);
    expect(authContext.userRole).toBe(sessionData.role);
    expect(authContext.organizationId).toBe(sessionData.organizationId);
    expect(authContext.organizationName).toBe(sessionData.organizationName);
    expect(authContext.billingPlan).toBe(sessionData.billingPlan);
    expect(authContext.agentLimit).toBe(sessionData.agentLimit);
  });

  test('should validate user permissions correctly', () => {
    const testCases = [
      { role: 'owner', permission: 'delete_agents', expected: true },
      { role: 'admin', permission: 'manage_users', expected: true },
      { role: 'admin', permission: 'delete_agents', expected: true },
      { role: 'member', permission: 'create_agents', expected: true },
      { role: 'member', permission: 'delete_agents', expected: false },
      { role: 'viewer', permission: 'view_agents', expected: true },
      { role: 'viewer', permission: 'create_agents', expected: false },
    ];

    testCases.forEach(({ role, permission, expected }) => {
      const context = { ...mockAuthContext, userRole: role };
      const result = PlatformAgentIntegrationService.validateUserPermission(context, permission);
      
      expect(result.hasPermission).toBe(expected);
      if (!expected) {
        expect(result.reason).toContain(`Role '${role}' does not have permission '${permission}'`);
      }
    });
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
    expect(exceededCreation.reason).toContain('15/10');

    // Test with undefined limit (unlimited)
    const unlimitedContext = { ...mockAuthContext, agentLimit: undefined };
    const unlimitedCreation = await PlatformAgentIntegrationService.validateAgentCreation(
      unlimitedContext,
      100
    );
    expect(unlimitedCreation.canCreate).toBe(true);
  });

  test('should create secure agent configuration', () => {
    const baseConfig = {
      character: {
        name: 'TestBot',
        bio: 'A test bot',
      },
      adapter: { type: 'mock' },
      plugins: ['@elizaos/plugin-web-search'],
      settings: {
        customSetting: 'value',
      },
    };

    const secureConfig = PlatformAgentIntegrationService.createSecureAgentConfig(
      baseConfig,
      mockAuthContext
    );

    expect(secureConfig.authContext).toEqual(mockAuthContext);
    expect(secureConfig.character).toEqual(baseConfig.character);
    expect(secureConfig.adapter).toEqual(baseConfig.adapter);
    expect(secureConfig.plugins).toEqual(baseConfig.plugins);
    
    // Check security settings were added
    expect(secureConfig.settings?.enableSecurityEvaluators).toBe(true);
    expect(secureConfig.settings?.requireAuthentication).toBe(true);
    expect(secureConfig.settings?.logSecurityEvents).toBe(true);
    
    // Check original settings were preserved
    expect(secureConfig.settings?.customSetting).toBe('value');
  });

  test('should create authentication middleware', async () => {
    const middleware = PlatformAgentIntegrationService.createAuthenticationMiddleware(mockAuthContext);
    
    expect(middleware.name).toBe('authentication-middleware');

    // Test message without metadata
    const messageWithoutMetadata = {
      id: 'test-msg-001',
      content: { text: 'Test message without metadata' },
    };

    const mockRuntime = { agentId: 'test-agent-123' };
    const processedMessage = await middleware.processMessage(mockRuntime as any, messageWithoutMetadata);

    expect(processedMessage.metadata).toBeTruthy();
    expect(processedMessage.metadata.authContext).toBeTruthy();
    expect(processedMessage.metadata.authContext.userId).toBe(mockAuthContext.userId);
    expect(processedMessage.metadata.authContext.userRole).toBe(mockAuthContext.userRole);
    expect(processedMessage.metadata.authContext.organizationId).toBe(mockAuthContext.organizationId);
    expect(typeof processedMessage.metadata.authContext.timestamp).toBe('number');

    // Test message with existing metadata
    const messageWithMetadata = {
      id: 'test-msg-002',
      content: { text: 'Test message with metadata' },
      metadata: { existingKey: 'existingValue' },
    };

    const processedMessageWithExisting = await middleware.processMessage(
      mockRuntime as any,
      messageWithMetadata
    );

    expect(processedMessageWithExisting.metadata.existingKey).toBe('existingValue');
    expect(processedMessageWithExisting.metadata.authContext).toBeTruthy();
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
        severity: 'medium',
      });

      // Verify security event was logged
      const securityLog = logMessages.find(msg => msg.includes('[SECURITY AUDIT]'));
      expect(securityLog).toBeTruthy();
      expect(securityLog).toContain(mockAuthContext.userId);
      expect(securityLog).toContain(mockAuthContext.organizationId);
    } finally {
      console.log = originalLog;
    }
  });

  test('should handle role-based permission edge cases', () => {
    // Test unknown role
    const unknownRoleContext = { ...mockAuthContext, userRole: 'unknown' };
    const unknownResult = PlatformAgentIntegrationService.validateUserPermission(
      unknownRoleContext,
      'create_agents'
    );
    expect(unknownResult.hasPermission).toBe(false);

    // Test owner wildcard permissions
    const ownerContext = { ...mockAuthContext, userRole: 'owner' };
    const ownerResult = PlatformAgentIntegrationService.validateUserPermission(
      ownerContext,
      'any_random_permission'
    );
    expect(ownerResult.hasPermission).toBe(true);
  });

  test('should handle agent creation with zero limit', async () => {
    const zeroLimitContext = { ...mockAuthContext, agentLimit: '0' };
    const result = await PlatformAgentIntegrationService.validateAgentCreation(
      zeroLimitContext,
      0
    );
    expect(result.canCreate).toBe(false);
    expect(result.reason).toContain('Agent limit reached (0/0)');
  });

  test('should handle invalid agent limit strings', async () => {
    const invalidLimitContext = { ...mockAuthContext, agentLimit: 'invalid' };
    const result = await PlatformAgentIntegrationService.validateAgentCreation(
      invalidLimitContext,
      5
    );
    // Should treat invalid limit as no limit (unlimited)
    expect(result.canCreate).toBe(true);
  });
});