/**
 * Authentication service for ElizaOS CLI
 * Handles secure credential storage and API communication
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { logger } from '@elizaos/core';
import { getCredentialStorage } from './credential-storage';
import type {
  AuthState,
  StoredCredentials,
  LoginCredentials,
  RegisterCredentials,
  AuthResponse,
  ApiKeyResponse,
  ApiKeysListResponse,
  AuthServiceOptions,
  DeviceAuthInitResponse,
  DeviceAuthPollResponse,
} from '../types';

const DEFAULT_BASE_URL = process.env.ELIZAOS_API_URL || 'https://api.elizaos.com/v1';
const KEYCHAIN_SERVICE = 'elizaos-cli';
const KEYCHAIN_ACCOUNT = 'default';
const AUTH_CONFIG_FILE = 'auth.json';

export class AuthService {
  private baseUrl: string;
  private keychainService: string;
  private keychainAccount: string;
  private configPath: string;
  private authState: AuthState | null = null;

  constructor(options: AuthServiceOptions = {}) {
    this.baseUrl = options.baseUrl || DEFAULT_BASE_URL;
    this.keychainService = options.keychainService || KEYCHAIN_SERVICE;
    this.keychainAccount = options.keychainAccount || KEYCHAIN_ACCOUNT;
    this.configPath = options.configPath || path.join(os.homedir(), '.eliza', AUTH_CONFIG_FILE);
  }

  /**
   * Login with email and password
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      const data: AuthResponse = await response.json();

      if (data.success && data.data) {
        // Store credentials securely
        await this.storeCredentials({
          accessToken: data.data.token,
          email: data.data.user.email,
          userId: data.data.user.id,
        });

        // Update auth state
        await this.updateAuthState({
          isAuthenticated: true,
          email: data.data.user.email,
          userId: data.data.user.id,
          lastChecked: new Date().toISOString(),
        });

        // Create initial API key if none exists
        await this.ensureApiKey();
      }

      return data;
    } catch (_error) {
      logger.error('Login failed:', _error);
      return {
        success: false,
        error: _error instanceof Error ? _error.message : 'Login failed',
      };
    }
  }

  /**
   * Register a new account
   */
  async register(credentials: RegisterCredentials): Promise<AuthResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      const data: AuthResponse = await response.json();

      if (data.success && data.data) {
        // Store credentials securely
        await this.storeCredentials({
          accessToken: data.data.token,
          email: data.data.user.email,
          userId: data.data.user.id,
        });

        // Update auth state
        await this.updateAuthState({
          isAuthenticated: true,
          email: data.data.user.email,
          userId: data.data.user.id,
          lastChecked: new Date().toISOString(),
        });

        // Create initial API key
        await this.ensureApiKey();
      }

      return data;
    } catch (__error) {
      logger.error('Registration failed:', __error);
      return {
        success: false,
        error: __error instanceof Error ? __error.message : 'Registration failed',
      };
    }
  }

  /**
   * Logout and clear credentials
   */
  async logout(): Promise<void> {
    try {
      // Get current token for logout request
      const credentials = await this.getCredentials();
      if (credentials?.accessToken) {
        // Notify server about logout
        await fetch(`${this.baseUrl}/auth/logout`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${credentials.accessToken}`,
          },
        }).catch(() => {
          // Ignore logout API _errors
        });
      }

      // Clear stored credentials
      const storage = getCredentialStorage();
      await storage.deletePassword(this.keychainService, this.keychainAccount);

      // Update auth state
      await this.updateAuthState({
        isAuthenticated: false,
      });

      logger.success('Logged out successfully');
    } catch (__error) {
      logger.error('Logout error:', __error);
      throw __error;
    }
  }

  /**
   * Get current authentication status
   */
  async getStatus(): Promise<AuthState> {
    if (!this.authState) {
      await this.loadAuthState();
    }

    // Check if credentials are valid
    const credentials = await this.getCredentials();
    if (!credentials) {
      return {
        isAuthenticated: false,
      };
    }

    // Verify token is still valid
    const isValid = await this.verifyToken(credentials.accessToken);
    if (!isValid) {
      await this.updateAuthState({
        isAuthenticated: false,
      });
    }

    return this.authState || { isAuthenticated: false };
  }

  /**
   * Get current API key or create one if none exists
   */
  async getApiKey(): Promise<string | null> {
    try {
      const credentials = await this.getCredentials();
      if (!credentials?.accessToken) {
        return null;
      }

      // Check if we have a cached API key
      if (credentials.apiKey) {
        return credentials.apiKey;
      }

      // Fetch API keys from server
      const response = await fetch(`${this.baseUrl}/api-keys`, {
        headers: {
          Authorization: `Bearer ${credentials.accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch API keys');
      }

      const data: ApiKeysListResponse = await response.json();

      if (data.success && data.data && data.data.apiKeys.length > 0) {
        // We only have the masked version, need to create a new one
        return await this.createApiKey();
      } else {
        // No API keys exist, create one
        return await this.createApiKey();
      }
    } catch (__error) {
      logger.error('Failed to get API key:', __error);
      return null;
    }
  }

  /**
   * Create a new API key
   */
  async createApiKey(): Promise<string | null> {
    try {
      const credentials = await this.getCredentials();
      if (!credentials?.accessToken) {
        return null;
      }

      const response = await fetch(`${this.baseUrl}/api-keys`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${credentials.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'ElizaOS CLI',
          expiresIn: 'never',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create API key');
      }

      const data: ApiKeyResponse = await response.json();

      if (data.success && data.data?.apiKey.key) {
        // Store the API key
        await this.storeCredentials({
          ...credentials,
          apiKey: data.data.apiKey.key,
        });

        return data.data.apiKey.key;
      }

      return null;
    } catch (__error) {
      logger.error('Failed to create API key:', __error);
      return null;
    }
  }

  /**
   * Reset (regenerate) the API key
   */
  async resetApiKey(): Promise<string | null> {
    try {
      const credentials = await this.getCredentials();
      if (!credentials?.accessToken) {
        return null;
      }

      // First, get the list of API keys to find the ID
      const listResponse = await fetch(`${this.baseUrl}/api-keys`, {
        headers: {
          Authorization: `Bearer ${credentials.accessToken}`,
        },
      });

      if (!listResponse.ok) {
        throw new Error('Failed to fetch API keys');
      }

      const listData: ApiKeysListResponse = await listResponse.json();

      if (!listData.success || !listData.data?.apiKeys.length) {
        // No existing keys, create a new one
        return await this.createApiKey();
      }

      // Find the CLI API key
      const cliKey = listData.data.apiKeys.find((key) => key.name === 'ElizaOS CLI');
      if (!cliKey) {
        return await this.createApiKey();
      }

      // Regenerate the key
      const response = await fetch(`${this.baseUrl}/api-keys/${cliKey.id}/regenerate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${credentials.accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to regenerate API key');
      }

      const data = await response.json();

      if (data.data?.key) {
        // Store the new API key
        await this.storeCredentials({
          ...credentials,
          apiKey: data.data.key,
        });

        return data.data.key;
      }

      return null;
    } catch (__error) {
      logger.error('Failed to reset API key:', __error);
      return null;
    }
  }

  /**
   * Set base URL (useful for local development)
   */
  setBaseUrl(url: string): void {
    this.baseUrl = url;
  }

  /**
   * Initiate device authorization flow
   */
  async initiateDeviceAuth(): Promise<DeviceAuthInitResponse> {
    const response = await fetch(`${this.baseUrl}/auth/device`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: 'elizaos-cli',
        scope: 'read write',
      }),
    });

    if (!response.ok) {
      throw new Error(`Device auth initialization failed: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Poll for device authorization completion
   */
  async pollDeviceAuth(deviceCode: string): Promise<DeviceAuthPollResponse> {
    const response = await fetch(`${this.baseUrl}/auth/device/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: 'elizaos-cli',
        device_code: deviceCode,
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
      }),
    });

    return await response.json();
  }

  /**
   * Store device auth result
   */
  async storeDeviceAuthResult(authResult: DeviceAuthPollResponse): Promise<void> {
    if (!authResult.success || !authResult.data) {
      throw new Error('Invalid auth result');
    }

    // Store credentials securely
    await this.storeCredentials({
      accessToken: authResult.data.access_token,
      email: authResult.data.user.email,
      userId: authResult.data.user.id,
    });

    // Update auth state
    await this.updateAuthState({
      isAuthenticated: true,
      email: authResult.data.user.email,
      userId: authResult.data.user.id,
      lastChecked: new Date().toISOString(),
    });

    // Create initial API key if none exists
    await this.ensureApiKey();
  }

  /**
   * Set skip auth preference
   */
  async setSkipAuth(skip: boolean): Promise<void> {
    await this.updateAuthState({
      ...this.authState,
      skipAuth: skip,
    });
  }

  /**
   * Check if user has chosen to skip auth
   */
  async shouldSkipAuth(): Promise<boolean> {
    const state = await this.getStatus();
    return state.skipAuth || false;
  }

  // Private methods

  private async storeCredentials(credentials: StoredCredentials): Promise<void> {
    const serialized = JSON.stringify(credentials);
    const storage = getCredentialStorage();
    await storage.setPassword(this.keychainService, this.keychainAccount, serialized);
  }

  private async getCredentials(): Promise<StoredCredentials | null> {
    try {
      const storage = getCredentialStorage();
      const serialized = await storage.getPassword(this.keychainService, this.keychainAccount);
      if (!serialized) {
        return null;
      }
      return JSON.parse(serialized);
    } catch (__error) {
      logger.error('Failed to get credentials:', __error);
      return null;
    }
  }

  private async loadAuthState(): Promise<void> {
    try {
      const data = await fs.readFile(this.configPath, 'utf8');
      this.authState = JSON.parse(data);
    } catch (__error) {
      // File doesn't exist or is invalid
      this.authState = { isAuthenticated: false };
    }
  }

  private async updateAuthState(state: Partial<AuthState>): Promise<void> {
    this.authState = {
      isAuthenticated: false, // Default value
      ...this.authState,
      ...state,
    } as AuthState;

    // Ensure directory exists
    const dir = path.dirname(this.configPath);
    await fs.mkdir(dir, { recursive: true });

    // Write state to file
    await fs.writeFile(this.configPath, JSON.stringify(this.authState, null, 2));
  }

  private async verifyToken(token: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return response.ok;
    } catch (__error) {
      return false;
    }
  }

  private async ensureApiKey(): Promise<void> {
    const apiKey = await this.getApiKey();
    if (!apiKey) {
      logger.warn('Failed to create initial API key');
    }
  }
}
