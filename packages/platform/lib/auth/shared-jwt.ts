/**
 * Shared JWT configuration and utilities for platform-server communication
 */

import { SignJWT, jwtVerify } from 'jose';

// Shared JWT configuration between platform and server
export const SHARED_JWT_CONFIG = {
  algorithm: 'HS256' as const,
  expiresIn: '7d',
  issuer: 'elizaos-platform',
  audience: 'elizaos-server'
} as const;

// Get shared secret from environment (dynamically for testing)
function getSharedJWTSecret(): Uint8Array {
  return new TextEncoder().encode(
    process.env.SHARED_JWT_SECRET || process.env.JWT_SECRET || 'your-shared-secret-between-platform-and-server'
  );
}

// Enhanced JWT payload for multi-tenant support
export interface EnhancedJWTPayload {
  sub: string; // user id
  email: string;
  name: string;
  organizationId: string;
  role: string;
  tenantId: string; // For multi-tenancy (usually same as organizationId)
  iat?: number;
  exp?: number;
  iss?: string;
  aud?: string;
}

/**
 * Create a JWT token with enhanced payload for server communication
 */
export async function createEnhancedJWT(payload: Omit<EnhancedJWTPayload, 'iat' | 'exp' | 'iss' | 'aud'>): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: SHARED_JWT_CONFIG.algorithm })
    .setIssuedAt()
    .setExpirationTime(SHARED_JWT_CONFIG.expiresIn)
    .setIssuer(SHARED_JWT_CONFIG.issuer)
    .setAudience(SHARED_JWT_CONFIG.audience)
    .sign(getSharedJWTSecret());
}

/**
 * Verify a JWT token from the server
 */
export async function verifySharedJWT(token: string): Promise<EnhancedJWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSharedJWTSecret(), {
      issuer: SHARED_JWT_CONFIG.issuer,
      audience: SHARED_JWT_CONFIG.audience
    });

    // Validate required fields
    if (
      payload.sub &&
      typeof payload.email === 'string' &&
      typeof payload.name === 'string' &&
      typeof payload.organizationId === 'string' &&
      typeof payload.role === 'string' &&
      typeof payload.tenantId === 'string'
    ) {
      return {
        sub: payload.sub,
        email: payload.email,
        name: payload.name,
        organizationId: payload.organizationId,
        role: payload.role,
        tenantId: payload.tenantId,
        iat: payload.iat,
        exp: payload.exp,
        iss: payload.iss,
        aud: payload.aud
      } as EnhancedJWTPayload;
    }

    return null;
  } catch (error) {
    console.error('JWT verification failed:', error);
    return null;
  }
}

/**
 * Extract JWT token from various sources
 */
export function extractJWTFromRequest(req: {
  headers: Record<string, string | string[] | undefined>;
  query?: Record<string, string | string[] | undefined>;
  body?: any;
}): string | null {
  // Try Authorization header first
  const authHeader = req.headers.authorization;
  if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Try custom header
  const customHeader = req.headers['x-jwt-token'];
  if (customHeader && typeof customHeader === 'string') {
    return customHeader;
  }

  // Try query parameter (for iframe embedding)
  const queryToken = req.query?.token;
  if (queryToken && typeof queryToken === 'string') {
    return queryToken;
  }

  // Try body (for POST requests)
  if (req.body?.token && typeof req.body.token === 'string') {
    return req.body.token;
  }

  return null;
}

/**
 * Create JWT token URL for iframe embedding
 */
export function createServerEmbedUrl(baseUrl: string, payload: Omit<EnhancedJWTPayload, 'iat' | 'exp' | 'iss' | 'aud'>): Promise<string> {
  return createEnhancedJWT(payload).then(token => {
    const url = new URL(baseUrl);
    url.searchParams.set('token', token);
    url.searchParams.set('embed', 'true');
    return url.toString();
  });
}

/**
 * Generate access token for device authorization
 */
export async function generateAccessToken(user: { userId: string; email: string; name: string }): Promise<string> {
  return new SignJWT({
    sub: user.userId,
    email: user.email,
    name: user.name,
    organizationId: 'default',
    role: 'user',
    tenantId: 'default'
  })
    .setProtectedHeader({ alg: SHARED_JWT_CONFIG.algorithm })
    .setIssuedAt()
    .setExpirationTime(SHARED_JWT_CONFIG.expiresIn)
    .setIssuer(SHARED_JWT_CONFIG.issuer)
    .setAudience(SHARED_JWT_CONFIG.audience)
    .sign(getSharedJWTSecret());
}
