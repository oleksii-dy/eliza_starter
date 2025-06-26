/**
 * Platform-Native Authentication Service for Tauri
 * Integrates with the Next.js platform backend while providing native capabilities
 */

import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-shell';
import { listen } from '@tauri-apps/api/event';

export interface AuthUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  avatar?: string;
  organizationId?: string;
  role?: string;
}

export interface AuthSession {
  accessToken: string;
  refreshToken?: string;
  user: AuthUser;
  expiresAt: number;
}

export interface OAuthProvider {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export const OAUTH_PROVIDERS: OAuthProvider[] = [
  { id: 'google', name: 'Google', icon: '🔵', color: '#4285f4' },
  { id: 'github', name: 'GitHub', icon: '⚫', color: '#24292e' },
  { id: 'discord', name: 'Discord', icon: '🟣', color: '#7289da' },
  { id: 'microsoft', name: 'Microsoft', icon: '🟦', color: '#0078d4' },
];

export interface AuthState {
  isAuthenticated: boolean;
  user: AuthUser | null;
  isLoading: boolean;
  error: string | null;
  platform: 'tauri';
}

export interface OAuthResult {
  success: boolean;
  error?: string;
  redirectUrl?: string;
}

type AuthListener = (state: AuthState) => void;

interface OAuthCallbackData {
  code: string;
  state: string;
}

class PlatformAuthService {
  private state: AuthState = {
    isAuthenticated: false,
    user: null,
    isLoading: true,
    error: null,
    platform: 'tauri',
  };

  private listeners: AuthListener[] = [];
  private initPromise: Promise<void> | null = null;
  private platformUrl: string;

  constructor() {
    // Get platform URL from environment or default
    this.platformUrl = import.meta.env.VITE_PLATFORM_URL || 'http://localhost:3333';
    this.initPromise = this.initialize();
  }

  /**
   * Initialize the authentication service
   */
  private async initialize(): Promise<void> {
    try {
      this.setState({ isLoading: true, error: null });

      // Check for existing session
      const session = await this.getStoredSession();
      if (session && await this.isSessionValid(session)) {
        this.setState({
          isAuthenticated: true,
          user: session.user,
          isLoading: false,
        });
      } else {
        // Clear invalid session
        await this.clearStoredSession();
        this.setState({
          isAuthenticated: false,
          user: null,
          isLoading: false,
        });
      }

      // Listen for OAuth callbacks
      await this.setupOAuthListener();
    } catch (error) {
      console.error('Platform auth initialization failed:', error);
      this.setState({
        isLoading: false,
        error: 'Failed to initialize authentication',
      });
    }
  }

  /**
   * Set up OAuth callback listener using Tauri's deep link capability
   */
  private async setupOAuthListener(): Promise<void> {
    try {
      // Listen for deep link events (elizaos://auth/callback)
      await listen<OAuthCallbackData>('oauth-callback', async (event) => {
        const { code, state } = event.payload;
        await this.completeOAuthFlow(code, state);
      });
    } catch (error) {
      console.warn('Failed to setup OAuth listener:', error);
    }
  }

  /**
   * Wait for initialization to complete
   */
  async waitForInit(): Promise<void> {
    if (this.initPromise) {
      await this.initPromise;
    }
  }

  /**
   * Get current authentication state
   */
  getState(): AuthState {
    return { ...this.state };
  }

  /**
   * Start OAuth flow for the specified provider
   */
  async startOAuthFlow(
    providerId: string,
    options: { returnTo?: string; sessionId?: string } = {}
  ): Promise<OAuthResult> {
    try {
      // Validate provider
      const provider = OAUTH_PROVIDERS.find(p => p.id === providerId);
      if (!provider) {
        return {
          success: false,
          error: `Unknown provider: ${providerId}`,
        };
      }

      const { returnTo = '/dashboard' } = options;

      // Build the OAuth initiation URL for Tauri platform
      const params = new URLSearchParams({
        platform: 'tauri',
        return_to: returnTo,
        ...(options.sessionId && { session_id: options.sessionId }),
      });

      const oauthUrl = `${this.platformUrl}/api/auth/social/${providerId}?${params}`;

      // Get the OAuth redirect URL from the platform
      const response = await fetch(oauthUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        redirect: 'manual', // Don't follow redirects automatically
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        return {
          success: false,
          error: errorData.message || 'Failed to initiate OAuth flow',
        };
      }

      // Get the actual OAuth URL from the platform
      const redirectUrl = response.headers.get('location') || response.url;
      
      // Open OAuth URL in external browser
      await open(redirectUrl);
      
      return { success: true };
    } catch (error) {
      console.error('OAuth flow failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'OAuth flow failed',
      };
    }
  }

  /**
   * Complete OAuth flow with authorization code from deep link callback
   */
  async completeOAuthFlow(code: string, state: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.platformUrl}/api/auth/callback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code, state }),
      });

      if (!response.ok) {
        throw new Error(`OAuth callback failed: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.session) {
        await this.setSession(data.session);
        return true;
      }

      return false;
    } catch (error) {
      console.error('OAuth completion failed:', error);
      this.setState({ error: 'Authentication failed' });
      return false;
    }
  }

  /**
   * Sign out the current user
   */
  async signOut(): Promise<void> {
    try {
      // Clear stored session
      await this.clearStoredSession();

      // Update state
      this.setState({
        isAuthenticated: false,
        user: null,
        error: null,
      });

      // Notify platform backend
      try {
        await fetch(`${this.platformUrl}/api/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });
      } catch (error) {
        console.warn('Logout API call failed:', error);
      }
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  }

  /**
   * Refresh the authentication token
   */
  async refreshToken(): Promise<boolean> {
    try {
      const session = await this.getStoredSession();
      if (!session?.refreshToken) {
        return false;
      }

      const response = await fetch(`${this.platformUrl}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken: session.refreshToken }),
      });

      if (!response.ok) {
        await this.signOut();
        return false;
      }

      const data = await response.json();
      if (data.session) {
        await this.setSession(data.session);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return false;
    }
  }

  /**
   * Set the user session
   */
  private async setSession(session: AuthSession): Promise<void> {
    await this.storeSession(session);
    this.setState({
      isAuthenticated: true,
      user: session.user,
      error: null,
    });
  }

  /**
   * Store session using Tauri's secure storage
   */
  private async storeSession(session: AuthSession): Promise<void> {
    try {
      const sessionData = JSON.stringify(session);
      await invoke('store_auth_session', { session: sessionData });
    } catch (error) {
      console.error('Failed to store session:', error);
      throw error;
    }
  }

  /**
   * Get stored session from Tauri's secure storage
   */
  private async getStoredSession(): Promise<AuthSession | null> {
    try {
      const sessionData = await invoke<string>('get_auth_session');
      if (!sessionData) {
        return null;
      }
      return JSON.parse(sessionData);
    } catch (error) {
      console.error('Failed to get stored session:', error);
      return null;
    }
  }

  /**
   * Clear stored session from Tauri's secure storage
   */
  private async clearStoredSession(): Promise<void> {
    try {
      await invoke('clear_auth_session');
    } catch (error) {
      console.error('Failed to clear stored session:', error);
    }
  }

  /**
   * Check if session is valid
   */
  private async isSessionValid(session: AuthSession): Promise<boolean> {
    // Check expiration
    if (Date.now() >= session.expiresAt) {
      return false;
    }

    // Verify with platform backend
    try {
      const response = await fetch(`${this.platformUrl}/api/auth/verify`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.accessToken}`,
        },
      });
      
      return response.ok;
    } catch (error) {
      console.warn('Session verification failed:', error);
      // If verification fails due to network issues, assume session is valid
      // but schedule a retry
      setTimeout(() => this.refreshToken(), 5000);
      return true;
    }
  }

  /**
   * Get available OAuth providers
   */
  getOAuthProviders(): OAuthProvider[] {
    return [...OAUTH_PROVIDERS];
  }

  /**
   * Get platform URL for accessing the web interface
   */
  getPlatformUrl(): string {
    return this.platformUrl;
  }

  /**
   * Subscribe to authentication state changes
   */
  subscribe(listener: AuthListener): () => void {
    this.listeners.push(listener);
    
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Update state and notify listeners
   */
  private setState(updates: Partial<AuthState>): void {
    this.state = { ...this.state, ...updates };
    this.listeners.forEach(listener => {
      try {
        listener(this.state);
      } catch (error) {
        console.error('Auth listener error:', error);
      }
    });
  }
}

// Export class and singleton instance
export { PlatformAuthService };
export const platformAuth = new PlatformAuthService();
export default platformAuth;