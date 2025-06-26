import { type Request, type Response, type NextFunction } from 'express';
import { jwtVerify } from 'jose';
import { logger } from '@elizaos/core';

// Shared JWT configuration (must match platform)
const SHARED_JWT_CONFIG = {
  algorithm: 'HS256' as const,
  expiresIn: '7d',
  issuer: 'elizaos-platform',
  audience: 'elizaos-server',
} as const;

// Get shared secret from environment - REQUIRED for security
function getSharedJWTSecret(): Uint8Array {
  const secret = process.env.SHARED_JWT_SECRET || process.env.JWT_SECRET;

  if (!secret) {
    throw new Error(
      'SECURITY ERROR: JWT secret not configured. Please set SHARED_JWT_SECRET or JWT_SECRET environment variable. ' +
        'This is required for secure authentication. Do not use default secrets in production.'
    );
  }

  if (secret.length < 32) {
    throw new Error(
      'SECURITY ERROR: JWT secret is too short. Please use a secret that is at least 32 characters long for adequate security.'
    );
  }

  // Check for common weak secrets
  const weakSecrets = [
    'your-shared-secret-between-platform-and-server',
    'secret',
    'password',
    'jwt-secret',
    'test-secret',
    '123456',
  ];

  if (weakSecrets.includes(secret.toLowerCase())) {
    throw new Error(
      'SECURITY ERROR: JWT secret is too weak. Please use a strong, randomly generated secret.'
    );
  }

  return new TextEncoder().encode(secret);
}

// Enhanced JWT payload interface
export interface EnhancedJWTPayload {
  sub: string; // user id
  email: string;
  name: string;
  organizationId: string;
  role: string;
  tenantId: string; // For multi-tenancy
  iat?: number;
  exp?: number;
  iss?: string;
  aud?: string;
}

// Extended Request interface to include user and tenant info
declare global {
  namespace Express {
    interface Request {
      user?: EnhancedJWTPayload;
      tenantId?: string;
      isLegacyAuth?: boolean;
    }
  }
}

/**
 * Verify a JWT token from the platform
 */
async function verifySharedJWT(token: string): Promise<EnhancedJWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSharedJWTSecret(), {
      issuer: SHARED_JWT_CONFIG.issuer,
      audience: SHARED_JWT_CONFIG.audience,
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
        aud: payload.aud,
      } as EnhancedJWTPayload;
    }

    return null;
  } catch (error) {
    logger.warn('JWT verification failed:', error);
    return null;
  }
}

/**
 * Extract JWT token from various sources
 */
function extractJWTFromRequest(req: Request): string | null {
  // Try Authorization header first
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
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
 * Enhanced authentication middleware supporting both JWT and legacy API key
 */
export async function enhancedAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  const serverAuthToken = process.env.ELIZA_SERVER_AUTH_TOKEN;

  // Allow OPTIONS requests for CORS preflight
  if (req.method === 'OPTIONS') {
    return next();
  }

  // Try JWT authentication first
  const jwtToken = extractJWTFromRequest(req);
  if (jwtToken) {
    try {
      const payload = await verifySharedJWT(jwtToken);
      if (payload) {
        // Set user and tenant context from JWT
        req.user = payload;
        req.tenantId = payload.tenantId;
        req.isLegacyAuth = false;

        logger.info(`JWT authenticated user: ${payload.email} (tenant: ${payload.tenantId})`);
        return next();
      } else {
        logger.warn(`Invalid JWT token from ${req.ip}`);
        return res.status(401).json({
          success: false,
          error: 'Invalid JWT token',
        });
      }
    } catch (error) {
      logger.error('JWT verification error:', error);
      return res.status(401).json({
        success: false,
        error: 'JWT authentication failed',
      });
    }
  }

  // Fallback to legacy API key authentication
  if (!serverAuthToken) {
    // If no token is configured, allow all requests (legacy behavior)
    req.isLegacyAuth = true;
    return next();
  }

  const apiKey = req.headers?.['x-api-key'];
  if (!apiKey || apiKey !== serverAuthToken) {
    logger.warn(`Unauthorized access attempt: Missing or invalid auth from ${req.ip}`);
    return res.status(401).json({
      success: false,
      error: 'Authentication required: provide valid X-API-KEY or JWT token',
    });
  }

  // Legacy API key is valid - mark as legacy auth
  req.isLegacyAuth = true;
  logger.info(`Legacy API key authenticated from ${req.ip}`);
  next();
}

/**
 * Middleware to require JWT authentication (no legacy API key fallback)
 */
export async function requireJWTAuth(req: Request, res: Response, next: NextFunction) {
  // Allow OPTIONS requests for CORS preflight
  if (req.method === 'OPTIONS') {
    return next();
  }

  const jwtToken = extractJWTFromRequest(req);
  if (!jwtToken) {
    return res.status(401).json({
      success: false,
      error: 'JWT token required',
    });
  }

  try {
    const payload = await verifySharedJWT(jwtToken);
    if (payload) {
      req.user = payload;
      req.tenantId = payload.tenantId;
      req.isLegacyAuth = false;
      return next();
    } else {
      return res.status(401).json({
        success: false,
        error: 'Invalid JWT token',
      });
    }
  } catch (error) {
    logger.error('JWT verification error:', error);
    return res.status(401).json({
      success: false,
      error: 'JWT authentication failed',
    });
  }
}

/**
 * Helper function to get tenant ID from request (for database queries)
 */
export function getTenantId(req: Request): string | null {
  return req.tenantId || null;
}

/**
 * Helper function to check if request is using legacy authentication
 */
export function isLegacyAuth(req: Request): boolean {
  return req.isLegacyAuth === true;
}

/**
 * Create a JWT token with enhanced payload for server communication
 */
export async function createEnhancedJWT(
  payload: Omit<EnhancedJWTPayload, 'iat' | 'exp' | 'iss' | 'aud'>
): Promise<string> {
  const { SignJWT } = await import('jose');
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: SHARED_JWT_CONFIG.algorithm })
    .setIssuedAt()
    .setExpirationTime(SHARED_JWT_CONFIG.expiresIn)
    .setIssuer(SHARED_JWT_CONFIG.issuer)
    .setAudience(SHARED_JWT_CONFIG.audience)
    .sign(getSharedJWTSecret());
}

// Re-export verifySharedJWT for testing
export { verifySharedJWT };
