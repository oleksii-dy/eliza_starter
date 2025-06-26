/**
 * Authentication middleware for API service
 */

import type { Context, Next } from 'hono';
import { jwtVerify } from 'jose';
import type { APIServiceConfig } from '../types/index.js';

// Define context variables type
export type AuthContext = {
  user?: {
    id: string;
    organizationId?: string;
  };
  apiKey?: {
    id: string;
    permissions: string[];
  };
  organization?: {
    id: string;
    subscriptionTier: string;
    limits: {
      maxApiRequests: number;
      maxTokensPerRequest: number;
      allowedModels: string[];
      allowedProviders: string[];
    };
  };
};

export function authMiddleware(config: APIServiceConfig) {
  return async (c: Context, next: Next) => {
    const authHeader = c.req.header('Authorization');

    if (!authHeader) {
      return c.json(
        {
          error: {
            message: 'Authorization header required',
            type: 'authentication_error',
            code: 'missing_auth_header',
          },
        },
        401
      );
    }

    const token = authHeader.replace('Bearer ', '');

    if (!token) {
      return c.json(
        {
          error: {
            message: 'Invalid authorization format',
            type: 'authentication_error',
            code: 'invalid_auth_format',
          },
        },
        401
      );
    }

    try {
      // Check if it's an API key (starts with 'eliza_')
      if (token.startsWith('eliza_')) {
        await validateAPIKey(c, token, config);
      } else {
        // Assume it's a JWT token
        await validateJWTToken(c, token, config);
      }

      return await next();
    } catch (error) {
      console.error('Authentication error:', error);

      return c.json(
        {
          error: {
            message: 'Invalid authentication credentials',
            type: 'authentication_error',
            code: 'invalid_credentials',
          },
        },
        401
      );
    }
  };
}

async function validateAPIKey(c: Context, apiKey: string, config: APIServiceConfig) {
  // For now, validate against platform API
  // In production, this would check against local database
  try {
    const response = await fetch(`${config.platformUrl}/api/auth/validate-key`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ apiKey }),
    });

    if (!response.ok) {
      throw new Error('API key validation failed');
    }

    const result = (await response.json()) as {
      user: { id: string; organizationId?: string };
      apiKey: { id: string; permissions: string[] };
      organization: {
        id: string;
        subscriptionTier: string;
        limits: {
          maxApiRequests: number;
          maxTokensPerRequest: number;
          allowedModels: string[];
          allowedProviders: string[];
        };
      };
    };

    // Store auth data in context variables
    c.set('user', result.user);
    c.set('apiKey', result.apiKey);
    c.set('organization', result.organization);
  } catch (error) {
    console.error('API key validation error:', error);
    throw new Error('Invalid API key');
  }
}

async function validateJWTToken(c: Context, token: string, config: APIServiceConfig) {
  try {
    const secret = new TextEncoder().encode(config.jwtSecret);

    const { payload } = await jwtVerify(token, secret);

    if (!payload.sub || !payload.organizationId) {
      throw new Error('Invalid token payload');
    }

    // Store user info in context variables
    c.set('user', {
      id: payload.sub as string,
      organizationId: payload.organizationId as string,
    });

    // Fetch organization details from platform
    try {
      const response = await fetch(
        `${config.platformUrl}/api/organizations/${payload.organizationId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const organization = await response.json();
        c.set('organization', organization);
      }
    } catch (orgError) {
      console.warn('Failed to fetch organization details:', orgError);
      // Continue without organization details
      c.set('organization', {
        id: payload.organizationId as string,
        subscriptionTier: 'free',
        limits: {
          maxApiRequests: 1000,
          maxTokensPerRequest: 4096,
          allowedModels: [],
          allowedProviders: [],
        },
      });
    }
  } catch (error) {
    console.error('JWT validation error:', error);
    throw new Error('Invalid JWT token');
  }
}
