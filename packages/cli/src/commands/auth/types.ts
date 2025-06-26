/**
 * Authentication types and interfaces for ElizaOS CLI
 */

export interface AuthState {
  isAuthenticated: boolean;
  skipAuth?: boolean;
  lastChecked?: string;
  email?: string;
  userId?: string;
}

export interface StoredCredentials {
  accessToken: string;
  refreshToken?: string;
  apiKey?: string;
  expiresAt?: string;
  email?: string;
  userId?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  name: string;
}

export interface AuthResponse {
  success: boolean;
  data?: {
    user: {
      id: string;
      email: string;
      name: string;
      avatar?: string;
      createdAt: string;
      updatedAt: string;
    };
    token: string;
  };
  error?: string;
  code?: string;
}

export interface ApiKeyResponse {
  success: boolean;
  data?: {
    apiKey: {
      id: string;
      name: string;
      key: string;
      lastUsed?: string | null;
      createdAt: string;
      expiresAt?: string | null;
    };
  };
  error?: string;
}

export interface ApiKeysListResponse {
  success: boolean;
  data?: {
    apiKeys: Array<{
      id: string;
      name: string;
      key: string; // Masked, only last 4 chars
      lastUsed?: string | null;
      createdAt: string;
      expiresAt?: string | null;
    }>;
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
  error?: string;
}

export interface AuthServiceOptions {
  baseUrl?: string;
  keychainService?: string;
  keychainAccount?: string;
  configPath?: string;
}

// Device Flow Types (OAuth 2.0 Device Authorization Grant)
export interface DeviceAuthInitResponse {
  device_code: string;
  user_code: string;
  verification_uri: string;
  verification_uri_complete?: string;
  expires_in: number;
  interval: number;
}

export interface DeviceAuthPollResponse {
  success: boolean;
  data?: {
    access_token: string;
    token_type: string;
    user: {
      id: string;
      name: string;
      email: string;
    };
  };
  error?: string;
}

export interface WebSocketAuthMessage {
  type: 'auth_success' | 'auth_error';
  data?: {
    access_token: string;
    user: {
      id: string;
      name: string;
      email: string;
    };
  };
  error?: string;
}
