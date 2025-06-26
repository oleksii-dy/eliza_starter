/**
 * API Key Authentication module
 * Provides testable authentication logic extracted from middleware
 */

export interface AuthRequest {
  headers: { [key: string]: string };
  method: string;
  url: string;
  ip: string;
}

export interface AuthResult {
  isAuthenticated: boolean;
  error?: string;
  metadata?: {
    method: string;
    url: string;
    ip: string;
    timestamp: Date;
  };
}

/**
 * Validate API key authentication
 */
export async function authenticateRequest(request: AuthRequest): Promise<AuthResult> {
  const requiredToken =
    typeof process !== 'undefined' ? process.env?.ELIZA_SERVER_AUTH_TOKEN : undefined;

  // If no token is configured, authentication is disabled
  if (!requiredToken) {
    return {
      isAuthenticated: true,
      metadata: {
        method: request.method,
        url: request.url,
        ip: request.ip,
        timestamp: new Date(),
      },
    };
  }

  const providedKey = request.headers['x-api-key'];

  if (!providedKey) {
    return {
      isAuthenticated: false,
      error: 'Missing X-API-KEY header',
      metadata: {
        method: request.method,
        url: request.url,
        ip: request.ip,
        timestamp: new Date(),
      },
    };
  }

  if (providedKey !== requiredToken) {
    return {
      isAuthenticated: false,
      error: 'Invalid API key',
      metadata: {
        method: request.method,
        url: request.url,
        ip: request.ip,
        timestamp: new Date(),
      },
    };
  }

  return {
    isAuthenticated: true,
    metadata: {
      method: request.method,
      url: request.url,
      ip: request.ip,
      timestamp: new Date(),
    },
  };
}

/**
 * Generate API key for development/testing
 */
export function generateApiKey(prefix: string = 'eliza'): string {
  const randomBytes = Array.from({ length: 16 }, () =>
    Math.floor(Math.random() * 256)
      .toString(16)
      .padStart(2, '0')
  ).join('');

  return `${prefix}-${randomBytes}`;
}

/**
 * Validate API key format
 */
export function isValidApiKeyFormat(key: string): boolean {
  // Basic format validation: prefix-hexstring (case insensitive)
  // Allow letters, numbers, and dashes in prefix, followed by dash and hex string
  const pattern = /^[a-zA-Z0-9-]+-[a-fA-F0-9]{32,}$/;
  return pattern.test(key);
}
