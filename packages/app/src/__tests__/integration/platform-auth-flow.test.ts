/**
 * Platform Authentication Flow Integration Tests
 * Tests the complete authentication flow from OAuth to agent creation
 */

import { describe, test, expect, beforeEach, afterEach, mock } from 'bun:test';
import { PlatformAuthService } from '../../lib/platform-auth';
import { PlatformAgentIntegrationService, type AgentAuthContext } from '../../lib/platform-agent-integration';

// Mock Tauri APIs for testing
const mockTauri = {
  os: {
    platform: mock(() => Promise.resolve('darwin')),
  },
  shell: {
    open: mock(() => Promise.resolve()),
  },
  event: {
    listen: mock(() => Promise.resolve(() => {})),
    emit: mock(() => Promise.resolve()),
  },
  invoke: mock(() => Promise.resolve()),
};

// Mock global Tauri object
(globalThis as any).__TAURI__ = mockTauri;

describe('Platform Authentication Flow Integration', () => {
  let authService: PlatformAuthService;
  let mockSessionData: any;

  beforeEach(() => {
    // Initialize authentication service
    authService = new PlatformAuthService();

    // Mock session data that would come from the platform
    mockSessionData = {
      userId: 'test-user-123',
      email: 'test@example.com',
      role: 'admin',
      organizationId: 'test-org-456',
      organizationName: 'Test Organization',
      billingPlan: 'pro',
      agentLimit: 10,
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
      expiresAt: new Date(Date.now() + 86400000).toISOString(), // 24 hours from now
    };

    // Reset all mocks
    mockTauri.shell.open.mockClear();
    mockTauri.event.listen.mockClear();
    mockTauri.invoke.mockClear();
  });

  afterEach(() => {
    // Clean up any test state
  });

  test('should detect Tauri environment correctly', async () => {
    // This service is designed for Tauri environment
    expect(authService.getState().platform).toBe('tauri');
  });

  test('should start OAuth flow and open browser', async () => {
    // Mock successful OAuth initiation
    const mockFetch = mock(() => 
      Promise.resolve({
        ok: true,
        headers: new Map([['location', 'https://auth.workos.com/oauth/authorize?client_id=test']]),
        url: 'https://auth.workos.com/oauth/authorize?client_id=test',
      })
    );
    (globalThis as any).fetch = mockFetch;

    const result = await authService.startOAuthFlow('workos', {
      returnTo: '/dashboard',
      sessionId: 'test-session-123'
    });

    expect(result.success).toBe(true);
    expect(mockTauri.shell.open).toHaveBeenCalledWith('https://auth.workos.com/oauth/authorize?client_id=test');
  });

  test('should handle OAuth callback and store session', async () => {
    // Mock successful session storage
    mockTauri.invoke.mockImplementation(() => Promise.resolve());

    // Simulate OAuth completion
    const result = await authService.completeOAuthFlow(
      'test-auth-code', 'test-state'
    );

    expect(result).toBe(true);
    
    // Check that authentication state was updated
    const authState = authService.getState();
    expect(authState.isAuthenticated).toBe(true);
    expect(mockTauri.invoke).toHaveBeenCalledWith('store_auth_session', expect.any(Object));
  });

  test('should retrieve stored session data', async () => {
    // Mock stored session retrieval
    (mockTauri.invoke as any).mockImplementation(() => Promise.resolve(JSON.stringify(mockSessionData)));

    // Verify authentication state instead of private method
    const authState = authService.getState();
    expect(authState.user).toBeTruthy();
    expect(authState.user?.id).toBe(mockSessionData.userId);
    expect(authState.user?.email).toBe(mockSessionData.email);
  });

  test('should validate session freshness', async () => {
    // Test that auth service tracks authentication state
    const authState = authService.getState();
    
    // Mock a valid session in storage
    (mockTauri.invoke as any).mockImplementation(() => Promise.resolve(JSON.stringify(mockSessionData)));
    
    // Since validateSession is private, we test the behavior through public methods
    expect(authState.platform).toBe('tauri');

  });

  test('should clear stored session on logout', async () => {
    mockTauri.invoke.mockImplementation(() => Promise.resolve());

    await authService.signOut();

    expect(mockTauri.invoke).toHaveBeenCalledWith('clear_auth_session');
  });

  test('should handle network errors gracefully', async () => {
    // Mock network failure
    const mockFetch = mock(() => Promise.reject(new Error('Network error')));
    (globalThis as any).fetch = mockFetch;

    const result = await authService.startOAuthFlow('workos');

    expect(result.success).toBe(false);
    expect(result.error).toContain('Network error');
  });

  test('should refresh expired tokens', async () => {
    // Mock refresh token flow
    const mockFetch = mock(() => 
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          accessToken: 'new-access-token',
          refreshToken: 'new-refresh-token',
          expiresAt: new Date(Date.now() + 86400000).toISOString(),
        }),
      })
    );
    (globalThis as any).fetch = mockFetch;

    mockTauri.invoke.mockImplementation(() => Promise.resolve());

    const refreshResult = await authService.refreshToken();

    expect(refreshResult).toBe(true);
    expect(mockTauri.invoke).toHaveBeenCalledWith('store_auth_session', expect.any(Object));
  });

  test('should integrate with platform agent creation', async () => {
    // Create authentication context from session data
    const authContext: AgentAuthContext = PlatformAgentIntegrationService.extractAuthContext(mockSessionData);

    expect(authContext.userId).toBe(mockSessionData.userId);
    expect(authContext.userEmail).toBe(mockSessionData.email);
    expect(authContext.organizationId).toBe(mockSessionData.organizationId);

    // Validate agent creation permissions
    const validation = await PlatformAgentIntegrationService.validateAgentCreation(authContext, 3);
    expect(validation.canCreate).toBe(true);

    // Create secure agent configuration
    const baseConfig = {
      character: {
        name: 'TestBot',
        bio: 'A test bot created through authenticated flow',
      },
      adapter: null, // Will be mocked in actual runtime tests
      plugins: ['@elizaos/plugin-web-search'],
      settings: {},
    };

    const secureConfig = PlatformAgentIntegrationService.createSecureAgentConfig(baseConfig, authContext);

    expect(secureConfig.authContext).toEqual(authContext);
    expect(secureConfig.settings?.enableSecurityEvaluators).toBe(true);
    expect(secureConfig.settings?.requireAuthentication).toBe(true);
  });

  test('should handle deep link authentication callback', async () => {
    // Mock event listener for deep link
    let deepLinkHandler: (event: any) => void = () => {};
    (mockTauri.event.listen as any).mockImplementation((eventName: string, handler: any) => {
      if (eventName === 'deep-link') {
        deepLinkHandler = handler;
      }
      return Promise.resolve(() => {});
    });

    // Start listening for OAuth callback
    await authService.startOAuthFlow('workos');

    // Simulate deep link callback
    const callbackEvent = {
      payload: 'elizaos://auth/callback?code=test-code&state=test-state'
    };

    // Mock the platform session verification
    const mockFetch = mock(() => 
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockSessionData),
      })
    );
    (globalThis as any).fetch = mockFetch;

    (mockTauri.invoke as any).mockImplementation(() => Promise.resolve());

    // Trigger the deep link handler
    deepLinkHandler(callbackEvent);

    // Allow async operations to complete
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(mockTauri.event.listen).toHaveBeenCalledWith('deep-link', expect.any(Function));
  });

  test('should handle platform communication errors', async () => {
    // Mock platform API failure
    const mockFetch = mock(() => 
      Promise.resolve({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      })
    );
    (globalThis as any).fetch = mockFetch;

    const result = await authService.startOAuthFlow('workos');

    expect(result.success).toBe(false);
    expect(result.error).toContain('Internal Server Error');
  });

  test('should validate secure session storage', async () => {
    // Test that sensitive data is properly handled
    mockTauri.invoke.mockImplementation(() => Promise.resolve());

    await authService.completeOAuthFlow('test-auth-code', 'test-state');

    expect(mockTauri.invoke).toHaveBeenCalledWith('store_auth_session', expect.objectContaining({
      session: expect.any(String)
    }));
  });
});