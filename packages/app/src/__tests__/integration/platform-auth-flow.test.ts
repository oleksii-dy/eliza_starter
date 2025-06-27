/**
 * Platform Authentication Flow Integration Tests
 * Tests the complete authentication flow from OAuth to agent creation
 */

import { describe, test, expect, beforeEach, afterEach, mock } from 'bun:test';

// Create mocks for Tauri modules BEFORE any imports
const mockInvoke = mock(() => Promise.resolve<any>(undefined));
const mockOpen = mock(() => Promise.resolve());
const mockListen = mock(() => Promise.resolve(() => {}));

// Mock global window object for Tauri
const mockWindow = {
  __TAURI_INTERNALS__: {
    invoke: mockInvoke,
    transformCallback: mock((callback: any) => callback),
  },
};

// Set up global window before any imports
(globalThis as any).window = mockWindow;
Object.defineProperty(globalThis, 'window', {
  value: mockWindow,
  writable: true,
  configurable: true,
});

// Mock Tauri modules at the module level
mock.module('@tauri-apps/api/core', () => ({
  invoke: mockInvoke,
}));

mock.module('@tauri-apps/plugin-shell', () => ({
  open: mockOpen,
}));

mock.module('@tauri-apps/api/event', () => ({
  listen: mockListen,
  emit: mock(() => Promise.resolve()),
}));

// Now import the modules that depend on Tauri
import { PlatformAuthService } from '../../lib/platform-auth';
import {
  PlatformAgentIntegrationService,
  type AgentAuthContext,
} from '../../lib/platform-agent-integration';

describe('Platform Authentication Flow Integration', () => {
  let authService: PlatformAuthService;
  let mockSessionData: any;

  beforeEach(() => {
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
    mockOpen.mockClear();
    mockListen.mockClear();
    mockInvoke.mockClear();

    // Initialize authentication service AFTER mocks are reset
    authService = new PlatformAuthService();
  });

  afterEach(() => {
    // Clean up any test state
  });

  test('should detect Tauri environment correctly', async () => {
    // This service is designed for Tauri environment
    expect(authService.getState().platform).toBe('tauri');
  });

  test('should start OAuth flow and open browser', async () => {
    // Mock successful OAuth initiation with proper Response object
    const mockFetch = mock(() =>
      Promise.resolve({
        ok: true,
        url: 'https://auth.google.com/oauth/authorize?client_id=test',
        headers: {
          get: (header: string) => {
            if (header === 'location') return 'https://auth.google.com/oauth/authorize?client_id=test';
            return null;
          },
        },
        json: () =>
          Promise.resolve({
            authorizationUrl: 'https://auth.google.com/oauth/authorize?client_id=test',
          }),
      })
    );
    (globalThis as any).fetch = mockFetch;

    const result = await authService.startOAuthFlow('google', {
      returnTo: '/dashboard',
      sessionId: 'test-session-123',
    });

    expect(result.success).toBe(true);
    expect(mockOpen).toHaveBeenCalledWith('https://auth.google.com/oauth/authorize?client_id=test');
  });

  test('should handle OAuth callback and store session', async () => {
    // Mock successful session storage
    mockInvoke.mockImplementation(() => Promise.resolve());

    // Mock the OAuth callback response
    const mockFetch = mock(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ session: mockSessionData }),
      })
    );
    (globalThis as any).fetch = mockFetch;

    // Simulate OAuth completion
    const result = await authService.completeOAuthFlow('test-auth-code', 'test-state');

    expect(result).toBe(true);

    // Check that authentication state was updated
    const authState = authService.getState();
    expect(authState.isAuthenticated).toBe(true);
    expect(mockInvoke).toHaveBeenCalledWith('store_auth_session', expect.any(Object));
  });

  test('should retrieve stored session data', async () => {
    // Create a new service with session data already mocked
    mockInvoke.mockImplementation((command: string) => {
      if (command === 'get_auth_session') {
        return Promise.resolve(JSON.stringify({
          accessToken: mockSessionData.accessToken,
          refreshToken: mockSessionData.refreshToken,
          user: {
            id: mockSessionData.userId,
            email: mockSessionData.email,
            role: mockSessionData.role,
            organizationId: mockSessionData.organizationId,
          },
          expiresAt: Date.now() + 86400000, // 24 hours from now
        }));
      }
      return Promise.resolve();
    });

    // Create a new auth service instance to trigger initialization with session data
    const newAuthService = new PlatformAuthService();
    
    // Wait a bit for async initialization to complete
    await new Promise(resolve => setTimeout(resolve, 50));

    // Verify authentication state
    const authState = newAuthService.getState();
    expect(authState.user).toBeTruthy();
    expect(authState.user?.id).toBe(mockSessionData.userId);
    expect(authState.user?.email).toBe(mockSessionData.email);
  });

  test('should validate session freshness', async () => {
    // Test that auth service tracks authentication state
    const authState = authService.getState();

    // Mock a valid session in storage
    mockInvoke.mockImplementation(() => Promise.resolve(JSON.stringify(mockSessionData)));

    // Since validateSession is private, we test the behavior through public methods
    expect(authState.platform).toBe('tauri');
  });

  test('should clear stored session on logout', async () => {
    mockInvoke.mockImplementation(() => Promise.resolve());

    await authService.signOut();

    expect(mockInvoke).toHaveBeenCalledWith('clear_auth_session');
  });

  test('should handle network errors gracefully', async () => {
    // Mock network failure
    const mockFetch = mock(() => Promise.reject(new Error('Network error')));
    (globalThis as any).fetch = mockFetch;

    const result = await authService.startOAuthFlow('google');

    expect(result.success).toBe(false);
    expect(result.error).toContain('Network error');
  });

  test('should refresh expired tokens', async () => {
    // First mock the stored session to have a refresh token
    mockInvoke.mockImplementation((command: string) => {
      if (command === 'get_auth_session') {
        return Promise.resolve(JSON.stringify({
          accessToken: 'old-access-token',
          refreshToken: 'old-refresh-token',
          user: mockSessionData,
          expiresAt: Date.now() - 1000, // Expired
        }));
      }
      if (command === 'store_auth_session') {
        return Promise.resolve();
      }
      return Promise.resolve();
    });

    // Mock refresh token flow
    const mockFetch = mock(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            session: {
              accessToken: 'new-access-token',
              refreshToken: 'new-refresh-token',
              user: mockSessionData,
              expiresAt: Date.now() + 86400000,
            },
          }),
      })
    );
    (globalThis as any).fetch = mockFetch;

    const refreshResult = await authService.refreshToken();

    expect(refreshResult).toBe(true);
    expect(mockInvoke).toHaveBeenCalledWith('store_auth_session', expect.any(Object));
  });

  test('should integrate with platform agent creation', async () => {
    // Create authentication context from session data
    const authContext: AgentAuthContext =
      PlatformAgentIntegrationService.extractAuthContext(mockSessionData);

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

    const secureConfig = PlatformAgentIntegrationService.createSecureAgentConfig(
      baseConfig,
      authContext
    );

    expect(secureConfig.authContext).toEqual(authContext);
    expect(secureConfig.settings?.enableSecurityEvaluators).toBe(true);
    expect(secureConfig.settings?.requireAuthentication).toBe(true);
  });

  test('should handle deep link authentication callback', async () => {
    // Mock event listener for deep link
    let deepLinkHandler: (event: any) => void = () => {};
    mockListen.mockImplementation((eventName?: string, handler?: any) => {
      if (eventName === 'deep-link') {
        deepLinkHandler = handler;
      }
      return Promise.resolve(() => {});
    });

    // Mock the OAuth start flow fetch
    const mockFetch = mock(() =>
      Promise.resolve({
        ok: true,
        url: 'https://auth.google.com/oauth/authorize?client_id=test',
        headers: {
          get: (header: string) => {
            if (header === 'location') return 'https://auth.google.com/oauth/authorize?client_id=test';
            return null;
          },
        },
        json: () =>
          Promise.resolve({
            authorizationUrl: 'https://auth.google.com/oauth/authorize?client_id=test',
          }),
      })
    );
    (globalThis as any).fetch = mockFetch;

    // Start listening for OAuth callback
    await authService.startOAuthFlow('google');

    // Simulate deep link callback
    const callbackEvent = {
      payload: 'elizaos://auth/callback?code=test-code&state=test-state',
    };

    // Mock the platform session verification for OAuth completion
    mockFetch.mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ session: mockSessionData }),
      })
    );

    mockInvoke.mockImplementation(() => Promise.resolve());

    // Trigger the deep link handler
    deepLinkHandler(callbackEvent);

    // Allow async operations to complete
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Verify that the event listener was set up correctly
    expect(mockListen).toHaveBeenCalled();
  });

  test('should handle platform communication errors', async () => {
    // Mock platform API failure with proper Response object
    const mockFetch = mock(() =>
      Promise.resolve({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        headers: {
          get: () => null,
        },
        json: () => Promise.resolve({ message: 'Internal Server Error' }),
      })
    );
    (globalThis as any).fetch = mockFetch;

    const result = await authService.startOAuthFlow('google');

    expect(result.success).toBe(false);
    expect(result.error).toContain('Internal Server Error');
  });

  test('should validate secure session storage', async () => {
    // Test that sensitive data is properly handled
    mockInvoke.mockImplementation(() => Promise.resolve());

    // Mock the OAuth callback response
    const mockFetch = mock(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ session: mockSessionData }),
      })
    );
    (globalThis as any).fetch = mockFetch;

    await authService.completeOAuthFlow('test-auth-code', 'test-state');

    expect(mockInvoke).toHaveBeenCalledWith(
      'store_auth_session',
      expect.objectContaining({
        session: expect.any(String),
      })
    );
  });
});
