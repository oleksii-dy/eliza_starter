/**
 * Tests for unified authentication system
 * @jest-environment node
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';

// Mock DOM APIs for Node environment
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

// Mock global objects
Object.defineProperty(global, 'window', {
  value: {
    localStorage: localStorageMock,
    location: {
      href: 'http://localhost:3000',
    },
    open: jest.fn(),
  },
  writable: true,
});

// Also mock localStorage globally
Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Helper function to create a properly typed fetch mock
function createFetchMock() {
  const mockFetch = jest.fn() as unknown as jest.MockedFunction<typeof fetch>;
  Object.assign(mockFetch, { preconnect: jest.fn() });
  return mockFetch;
}

// Mock fetch
const mockFetch = createFetchMock();
global.fetch = mockFetch;

import {
  OAUTH_PROVIDERS,
  type AuthUser,
  type AuthSession,
} from '../src/lib/unified-auth';

describe('Unified Authentication System', () => {
  // Import the auth service after setting up mocks
  let unifiedAuth: any;

  beforeEach(async () => {
    // Clear all mocks
    jest.clearAllMocks();
    localStorageMock.clear();

    // Reset fetch mock
    (mockFetch as any).mockReset();

    // Reset modules to get fresh instance
    jest.resetModules();

    // Re-import auth service
    const authModule = await import('../src/lib/unified-auth');
    unifiedAuth = authModule.unifiedAuth;
  });

  describe('Platform Detection', () => {
    test('should detect web platform by default', () => {
      const state = unifiedAuth.getState();
      expect(state.platform).toBe('web');
    });

    test('should detect Tauri platform when __TAURI__ is available', async () => {
      // Mock Tauri environment
      Object.defineProperty(global.window, '__TAURI__', {
        value: {},
        writable: true,
      });

      // Reset modules and re-import
      jest.resetModules();
      const authModule = await import('../src/lib/unified-auth');
      const newAuth = authModule.unifiedAuth;

      const state = newAuth.getState();
      expect(state.platform).toBe('tauri');

      // Cleanup
      delete (global.window as any).__TAURI__;
    });
  });

  describe('OAuth Providers', () => {
    test('should return available OAuth providers', () => {
      expect(OAUTH_PROVIDERS).toHaveLength(4);
      expect(OAUTH_PROVIDERS).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: 'google', name: 'Google' }),
          expect.objectContaining({ id: 'github', name: 'GitHub' }),
          expect.objectContaining({ id: 'discord', name: 'Discord' }),
          expect.objectContaining({ id: 'microsoft', name: 'Microsoft' }),
        ]),
      );
    });

    test('should get providers from auth service', () => {
      const providers = unifiedAuth.getOAuthProviders();
      expect(providers).toHaveLength(4);
      expect(providers).toEqual(OAUTH_PROVIDERS);
    });
  });

  describe('OAuth Flow', () => {
    test('should reject invalid provider', async () => {
      const result = await unifiedAuth.startOAuthFlow('invalid-provider');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown provider');
    });

    test('should accept valid provider', async () => {
      // Mock window.location.href for web OAuth
      global.window.location.href = '';

      const result = await unifiedAuth.startOAuthFlow('google');
      expect(result.success).toBe(true);
    });
  });

  describe('Session Management', () => {
    const mockSession: AuthSession = {
      accessToken: 'test-token',
      refreshToken: 'test-refresh-token',
      user: {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
      },
      expiresAt: Date.now() + 3600000, // 1 hour from now
    };

    test('should store and retrieve session from localStorage', async () => {
      // Store session
      await (unifiedAuth as any).storeSession(mockSession);

      // Retrieve session
      const storedSession = await (unifiedAuth as any).getStoredSession();
      expect(storedSession).toEqual(mockSession);
    });

    test('should clear stored session', async () => {
      // Store session first
      await (unifiedAuth as any).storeSession(mockSession);

      // Clear session
      await (unifiedAuth as any).clearStoredSession();

      // Verify it's cleared
      const storedSession = await (unifiedAuth as any).getStoredSession();
      expect(storedSession).toBeNull();
    });

    test('should validate session expiration', async () => {
      const expiredSession = {
        ...mockSession,
        expiresAt: Date.now() - 1000, // Already expired
      };

      const isValid = await (unifiedAuth as any).isSessionValid(expiredSession);
      expect(isValid).toBe(false);
    });
  });

  describe('Authentication State', () => {
    test('should start in loading state', () => {
      const state = unifiedAuth.getState();
      expect(state.isLoading).toBe(true);
      expect(state.isAuthenticated).toBe(false);
      expect(state.user).toBeNull();
    });

    test('should allow subscription to state changes', () => {
      const listener = jest.fn();

      const unsubscribe = unifiedAuth.subscribe(listener);

      // Trigger a state change
      (unifiedAuth as any).setState({ isLoading: false });

      expect(listener).toHaveBeenCalled();

      // Cleanup
      unsubscribe();
    });
  });

  describe('API Integration', () => {
    test('should use correct API base URL for web platform', () => {
      const apiUrl = (unifiedAuth as any).getApiBaseUrl();
      expect(apiUrl).toBe(''); // Relative URLs for web
    });

    test('should use configured API base URL for Tauri platform', async () => {
      // Mock Tauri environment
      Object.defineProperty(global.window, '__TAURI__', {
        value: {},
        writable: true,
      });

      // Reset modules and re-import
      jest.resetModules();
      const authModule = await import('../src/lib/unified-auth');
      const newAuth = authModule.unifiedAuth;

      const apiUrl = (newAuth as any).getApiBaseUrl();
      expect(apiUrl).toBe(
        process.env.NEXT_PUBLIC_API_BASE_URL ||
          'https://api.platform.elizaos.com',
      );

      // Cleanup
      delete (global.window as any).__TAURI__;
    });
  });

  describe('Error Handling', () => {
    test('should handle network errors gracefully', async () => {
      // Mock fetch to throw error
      const originalFetch = global.fetch;
      const errorMockFetch = createFetchMock();
      (errorMockFetch as any).mockRejectedValue(new Error('Network error'));
      global.fetch = errorMockFetch;

      const result = await unifiedAuth.startOAuthFlow('google');
      expect(result.success).toBe(false);
      expect(result.error).toContain('OAuth flow failed');

      // Restore fetch
      global.fetch = originalFetch;
    });

    test('should handle JSON parsing errors', async () => {
      const invalidSession = 'invalid-json-data';
      localStorage.setItem('elizaos_auth_session', invalidSession);

      const session = await (unifiedAuth as any).getStoredSession();
      expect(session).toBeNull();
    });
  });

  describe('Cross-Platform Compatibility', () => {
    test('should handle missing Tauri APIs gracefully', async () => {
      // Mock Tauri environment but without APIs
      Object.defineProperty(global.window, '__TAURI__', {
        value: {},
        writable: true,
      });

      // This should not throw an error
      const result = await unifiedAuth.startOAuthFlow('google');
      expect(result.success).toBe(true);

      // Cleanup
      delete (global.window as any).__TAURI__;
    });
  });
});
