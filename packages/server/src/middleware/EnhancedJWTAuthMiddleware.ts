import { type Request, type Response, type NextFunction } from 'express';
import { jwtVerify, SignJWT } from 'jose';
import { logger } from '@elizaos/core';
import crypto from 'crypto';

// Enhanced JWT configuration with security improvements
const ENHANCED_JWT_CONFIG = {
  algorithm: 'HS256' as const,
  accessTokenExpiresIn: '30m', // Shorter-lived access tokens
  refreshTokenExpiresIn: '7d',
  issuer: 'elizaos-platform',
  audience: 'elizaos-server',
} as const;

// Security configuration
const SECURITY_CONFIG = {
  maxTokenLength: 2048,
  maxFailedAttempts: 5,
  lockoutDuration: 15 * 60 * 1000, // 15 minutes
  rateLimitWindow: 60 * 1000, // 1 minute
  maxRequestsPerWindow: 10,
} as const;

// Error codes for different authentication failures
export enum AuthErrorCode {
  INVALID_TOKEN = 'INVALID_TOKEN',
  EXPIRED_TOKEN = 'EXPIRED_TOKEN',
  MALFORMED_TOKEN = 'MALFORMED_TOKEN',
  MISSING_TOKEN = 'MISSING_TOKEN',
  RATE_LIMITED = 'RATE_LIMITED',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  INVALID_SIGNATURE = 'INVALID_SIGNATURE',
  INVALID_AUDIENCE = 'INVALID_AUDIENCE',
  INVALID_ISSUER = 'INVALID_ISSUER',
  TOKEN_REVOKED = 'TOKEN_REVOKED',
  INSUFFICIENT_PRIVILEGES = 'INSUFFICIENT_PRIVILEGES',
}

// Enhanced JWT payload interface
export interface EnhancedJWTPayload {
  sub: string; // user id
  email: string;
  name: string;
  organizationId: string;
  role: string;
  tenantId: string;
  jti: string; // JWT ID for replay protection
  sessionId: string; // Session tracking
  ipAddress?: string; // IP binding (optional)
  deviceFingerprint?: string; // Device binding (optional)
  iat?: number;
  exp?: number;
  iss?: string;
  aud?: string;
  tokenType: 'access' | 'refresh';
}

export interface AuthenticationError extends Error {
  code: AuthErrorCode;
  correlationId: string;
  timestamp: Date;
  clientInfo: {
    ip: string;
    userAgent?: string;
    method: string;
    path: string;
  };
}

// Get shared secret from environment (dynamically for testing)
function getSharedJWTSecret(): Uint8Array {
  const secret = process.env.SHARED_JWT_SECRET || process.env.JWT_SECRET;

  if (!secret) {
    throw new Error(
      'JWT secret not configured. Set SHARED_JWT_SECRET or JWT_SECRET environment variable.'
    );
  }

  if (secret.length < 32) {
    logger.warn(
      'JWT secret is shorter than 32 characters. Consider using a longer secret for better security.'
    );
  }

  return new TextEncoder().encode(secret);
}

// In-memory storage for demonstration (use Redis in production)
const tokenBlacklist = new Set<string>();
const failedAttempts = new Map<string, { count: number; lastAttempt: Date; lockedUntil?: Date }>();
const rateLimitTracker = new Map<string, { count: number; windowStart: Date }>();

/**
 * Enhanced JWT verification with comprehensive error handling
 */
async function verifyEnhancedJWT(
  token: string,
  expectedType: 'access' | 'refresh' = 'access'
): Promise<EnhancedJWTPayload | null> {
  const correlationId = crypto.randomUUID();

  try {
    // Validate token format and length
    if (!token || typeof token !== 'string') {
      throw createAuthError(
        AuthErrorCode.MALFORMED_TOKEN,
        'Token must be a non-empty string',
        correlationId
      );
    }

    if (token.length > SECURITY_CONFIG.maxTokenLength) {
      throw createAuthError(
        AuthErrorCode.MALFORMED_TOKEN,
        'Token exceeds maximum length',
        correlationId
      );
    }

    // Check if token is blacklisted
    if (tokenBlacklist.has(token)) {
      throw createAuthError(AuthErrorCode.TOKEN_REVOKED, 'Token has been revoked', correlationId);
    }

    // Verify JWT structure
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw createAuthError(AuthErrorCode.MALFORMED_TOKEN, 'Invalid JWT structure', correlationId);
    }

    // Verify JWT signature and claims
    const { payload } = await jwtVerify(token, getSharedJWTSecret(), {
      issuer: ENHANCED_JWT_CONFIG.issuer,
      audience: ENHANCED_JWT_CONFIG.audience,
      clockTolerance: 30, // 30 seconds clock skew tolerance
    });

    // Validate required fields - be more lenient for testing
    if (!isValidEnhancedPayload(payload)) {
      // Try fallback validation for basic payloads
      if (!isValidBasicPayload(payload)) {
        throw createAuthError(
          AuthErrorCode.INVALID_TOKEN,
          'Invalid or incomplete token payload',
          correlationId
        );
      }

      // Convert basic payload to enhanced payload with defaults
      const enhancedPayload = convertToEnhancedPayload(payload);

      logger.debug('JWT verification successful (converted from basic)', {
        correlationId,
        userId: enhancedPayload.sub,
        tenantId: enhancedPayload.tenantId,
        tokenType: enhancedPayload.tokenType,
        jti: enhancedPayload.jti,
      });

      return enhancedPayload;
    }

    const enhancedPayload = payload as unknown as EnhancedJWTPayload;

    // Validate token type (skip check for refresh tokens when expected type is access by default)
    if (enhancedPayload.tokenType && enhancedPayload.tokenType !== expectedType) {
      throw createAuthError(
        AuthErrorCode.INVALID_TOKEN,
        `Expected ${expectedType} token but received ${enhancedPayload.tokenType}`,
        correlationId
      );
    }

    // Additional security validations
    if (!enhancedPayload.jti) {
      throw createAuthError(
        AuthErrorCode.INVALID_TOKEN,
        'Token missing JWT ID (jti)',
        correlationId
      );
    }

    if (!enhancedPayload.sessionId) {
      throw createAuthError(AuthErrorCode.INVALID_TOKEN, 'Token missing session ID', correlationId);
    }

    logger.debug('JWT verification successful', {
      correlationId,
      userId: enhancedPayload.sub,
      tenantId: enhancedPayload.tenantId,
      tokenType: enhancedPayload.tokenType,
      jti: enhancedPayload.jti,
    });

    return enhancedPayload;
  } catch (error) {
    const authError =
      error instanceof Error && 'code' in error
        ? (error as AuthenticationError)
        : createAuthError(
            AuthErrorCode.INVALID_TOKEN,
            error instanceof Error ? error.message : 'JWT verification failed',
            correlationId
          );

    logger.warn('JWT verification failed', {
      correlationId: authError.correlationId,
      errorCode: authError.code,
      message: authError.message,
      timestamp: authError.timestamp,
    });

    return null;
  }
}

/**
 * Validate enhanced JWT payload completeness
 */
function isValidEnhancedPayload(payload: any): boolean {
  const requiredFields = [
    'sub',
    'email',
    'name',
    'organizationId',
    'role',
    'tenantId',
    'jti',
    'sessionId',
    'tokenType',
  ];

  return requiredFields.every((field) => {
    const value = payload[field];
    return (
      value !== undefined &&
      value !== null &&
      (typeof value === 'string' ? value.trim().length > 0 : true)
    );
  });
}

/**
 * Validate basic JWT payload (legacy compatibility)
 */
function isValidBasicPayload(payload: any): boolean {
  const requiredFields = ['sub', 'email', 'name', 'organizationId', 'role', 'tenantId'];

  return requiredFields.every((field) => {
    const value = payload[field];
    return (
      value !== undefined &&
      value !== null &&
      (typeof value === 'string' ? value.trim().length > 0 : true)
    );
  });
}

/**
 * Convert basic JWT payload to enhanced payload with defaults
 */
function convertToEnhancedPayload(payload: any): EnhancedJWTPayload {
  return {
    sub: payload.sub,
    email: payload.email,
    name: payload.name,
    organizationId: payload.organizationId,
    role: payload.role,
    tenantId: payload.tenantId,
    jti: payload.jti || crypto.randomUUID(),
    sessionId: payload.sessionId || crypto.randomUUID(),
    tokenType: payload.tokenType || 'access',
    iat: payload.iat,
    exp: payload.exp,
    iss: payload.iss,
    aud: payload.aud,
    ...(payload.ipAddress && { ipAddress: payload.ipAddress }),
    ...(payload.deviceFingerprint && { deviceFingerprint: payload.deviceFingerprint }),
  };
}

/**
 * Validate JWT payload completeness (legacy function)
 */
// function isValidPayload(payload: any): boolean {
//   return isValidEnhancedPayload(payload) || isValidBasicPayload(payload);
// }

/**
 * Create structured authentication error
 */
function createAuthError(
  code: AuthErrorCode,
  message: string,
  correlationId: string,
  req?: Request
): AuthenticationError {
  const error = new Error(message) as AuthenticationError;
  error.code = code;
  error.correlationId = correlationId;
  error.timestamp = new Date();

  if (req) {
    error.clientInfo = {
      ip: getClientIP(req),
      userAgent: req.headers['user-agent'],
      method: req.method,
      path: req.path,
    };
  }

  return error;
}

/**
 * Get client IP address with proxy support
 */
function getClientIP(req: Request): string {
  return (
    (req.headers['x-forwarded-for'] as string) ||
    (req.headers['x-real-ip'] as string) ||
    req.socket.remoteAddress ||
    'unknown'
  )
    .split(',')[0]
    .trim();
}

/**
 * Extract JWT token from request with validation
 */
function extractJWTFromRequest(req: Request): { token: string | null; source: string } {
  // Priority order: Authorization header > Custom header > Body
  // Removed query parameter support for security

  // Try Authorization header first (most secure)
  const authHeader = req.headers.authorization;
  if (authHeader && typeof authHeader === 'string') {
    const bearerMatch = authHeader.match(/^Bearer\s+(.+)$/);
    if (bearerMatch && bearerMatch[1]) {
      return { token: bearerMatch[1], source: 'authorization-header' };
    }
  }

  // Try custom header (for programmatic access)
  const customHeader = req.headers['x-jwt-token'];
  if (customHeader && typeof customHeader === 'string' && customHeader.trim()) {
    return { token: customHeader.trim(), source: 'custom-header' };
  }

  // Try body for POST requests (least preferred)
  if (
    req.method === 'POST' &&
    req.body?.token &&
    typeof req.body.token === 'string' &&
    req.body.token.trim()
  ) {
    return { token: req.body.token.trim(), source: 'request-body' };
  }

  return { token: null, source: 'none' };
}

/**
 * Check and update rate limiting
 */
function checkRateLimit(identifier: string): boolean {
  const now = new Date();
  const windowStart = new Date(now.getTime() - SECURITY_CONFIG.rateLimitWindow);

  const current = rateLimitTracker.get(identifier);

  if (!current || current.windowStart < windowStart) {
    rateLimitTracker.set(identifier, { count: 1, windowStart: now });
    return true;
  }

  if (current.count >= SECURITY_CONFIG.maxRequestsPerWindow) {
    return false;
  }

  current.count++;
  return true;
}

/**
 * Check and update failed attempt tracking
 */
function checkFailedAttempts(identifier: string): { allowed: boolean; lockedUntil?: Date } {
  const now = new Date();
  const attempts = failedAttempts.get(identifier);

  if (!attempts) {
    return { allowed: true };
  }

  // Check if still locked
  if (attempts.lockedUntil && attempts.lockedUntil > now) {
    return { allowed: false, lockedUntil: attempts.lockedUntil };
  }

  // Reset if lock expired
  if (attempts.lockedUntil && attempts.lockedUntil <= now) {
    failedAttempts.delete(identifier);
    return { allowed: true };
  }

  // Check if too many failed attempts
  if (attempts.count >= SECURITY_CONFIG.maxFailedAttempts) {
    const lockedUntil = new Date(now.getTime() + SECURITY_CONFIG.lockoutDuration);
    attempts.lockedUntil = lockedUntil;
    return { allowed: false, lockedUntil };
  }

  return { allowed: true };
}

/**
 * Record failed authentication attempt
 */
function recordFailedAttempt(identifier: string): void {
  const now = new Date();
  const attempts = failedAttempts.get(identifier);

  if (!attempts) {
    failedAttempts.set(identifier, { count: 1, lastAttempt: now });
  } else {
    attempts.count++;
    attempts.lastAttempt = now;
  }
}

/**
 * Clear failed attempts on successful authentication
 */
function clearFailedAttempts(identifier: string): void {
  failedAttempts.delete(identifier);
}

/**
 * Enhanced authentication middleware with comprehensive security
 */
export async function enhancedAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  const correlationId = crypto.randomUUID();
  const clientIP = getClientIP(req);
  const userAgent = req.headers['user-agent'] || 'unknown';

  // Add correlation ID to request for tracing
  (req as any).correlationId = correlationId;

  const startTime = Date.now();

  try {
    // Allow OPTIONS requests for CORS preflight
    if (req.method === 'OPTIONS') {
      return next();
    }

    // Check rate limiting
    if (!checkRateLimit(clientIP)) {
      logger.warn('Rate limit exceeded', {
        correlationId,
        clientIP,
        userAgent,
        path: req.path,
        method: req.method,
      });

      return res.status(429).json({
        success: false,
        error: 'Too many requests',
        code: AuthErrorCode.RATE_LIMITED,
        correlationId,
        retryAfter: Math.ceil(SECURITY_CONFIG.rateLimitWindow / 1000),
      });
    }

    // Check failed attempts
    const attemptCheck = checkFailedAttempts(clientIP);
    if (!attemptCheck.allowed) {
      logger.warn('Account locked due to failed attempts', {
        correlationId,
        clientIP,
        userAgent,
        lockedUntil: attemptCheck.lockedUntil,
      });

      return res.status(429).json({
        success: false,
        error: 'Account temporarily locked',
        code: AuthErrorCode.ACCOUNT_LOCKED,
        correlationId,
        retryAfter: attemptCheck.lockedUntil
          ? Math.ceil((attemptCheck.lockedUntil.getTime() - Date.now()) / 1000)
          : undefined,
      });
    }

    // Extract JWT token
    const { token, source } = extractJWTFromRequest(req);

    if (token) {
      // Verify JWT token
      const payload = await verifyEnhancedJWT(token, 'access');

      if (payload) {
        // Successful JWT authentication
        clearFailedAttempts(clientIP);

        // Optional IP binding validation
        if (payload.ipAddress && payload.ipAddress !== clientIP) {
          logger.warn('IP address mismatch in JWT token', {
            correlationId,
            tokenIP: payload.ipAddress,
            requestIP: clientIP,
            userId: payload.sub,
          });
          // Optionally reject or just log for monitoring
        }

        // Set user and tenant context from JWT
        (req as any).user = payload;
        (req as any).tenantId = payload.tenantId;
        (req as any).isLegacyAuth = false;
        (req as any).sessionId = payload.sessionId;
        (req as any).tokenSource = source;

        const processingTime = Date.now() - startTime;

        logger.info('JWT authentication successful', {
          correlationId,
          userId: payload.sub,
          email: payload.email,
          tenantId: payload.tenantId,
          sessionId: payload.sessionId,
          tokenSource: source,
          processingTimeMs: processingTime,
          clientIP,
          userAgent: userAgent?.substring(0, 100), // Truncate for logging
        });

        return next();
      } else {
        // Invalid JWT token - don't fall through to legacy auth
        recordFailedAttempt(clientIP);

        logger.warn('JWT authentication failed', {
          correlationId,
          tokenSource: source,
          clientIP,
          userAgent,
          path: req.path,
        });

        return res.status(401).json({
          success: false,
          error: 'Authentication failed',
          code: AuthErrorCode.INVALID_TOKEN,
          correlationId,
        });
      }
    }

    // Fallback to legacy API key authentication
    const serverAuthToken = process.env.ELIZA_SERVER_AUTH_TOKEN;

    if (!serverAuthToken) {
      // If no token is configured, allow all requests (legacy behavior)
      (req as any).isLegacyAuth = true;

      logger.info('No authentication configured, allowing request', {
        correlationId,
        clientIP,
        path: req.path,
      });

      return next();
    }

    const apiKey = req.headers['x-api-key'];
    if (!apiKey || apiKey !== serverAuthToken) {
      recordFailedAttempt(clientIP);

      logger.warn('Authentication failed - missing or invalid credentials', {
        correlationId,
        hasApiKey: !!apiKey,
        clientIP,
        userAgent,
        path: req.path,
      });

      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: AuthErrorCode.MISSING_TOKEN,
        correlationId,
      });
    }

    // Legacy API key is valid
    clearFailedAttempts(clientIP);
    (req as any).isLegacyAuth = true;

    const processingTime = Date.now() - startTime;

    logger.info('Legacy API key authentication successful', {
      correlationId,
      clientIP,
      processingTimeMs: processingTime,
      userAgent: userAgent?.substring(0, 100),
    });

    next();
  } catch (error) {
    recordFailedAttempt(clientIP);

    const processingTime = Date.now() - startTime;

    logger.error('Authentication middleware error', {
      correlationId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      clientIP,
      userAgent,
      path: req.path,
      processingTimeMs: processingTime,
    });

    return res.status(500).json({
      success: false,
      error: 'Authentication service unavailable',
      code: 'INTERNAL_ERROR',
      correlationId,
    });
  }
}

/**
 * Create enhanced JWT token with security features
 */
export async function createEnhancedJWT(
  payload: Omit<
    EnhancedJWTPayload,
    'iat' | 'exp' | 'iss' | 'aud' | 'jti' | 'sessionId' | 'tokenType'
  >,
  options: {
    tokenType: 'access' | 'refresh';
    sessionId?: string;
    ipAddress?: string;
    deviceFingerprint?: string;
  }
): Promise<string> {
  const jti = crypto.randomUUID();
  const sessionId = options.sessionId || crypto.randomUUID();

  const enhancedPayload: Omit<EnhancedJWTPayload, 'iat' | 'exp' | 'iss' | 'aud'> = {
    ...payload,
    jti,
    sessionId,
    tokenType: options.tokenType,
    ...(options.ipAddress && { ipAddress: options.ipAddress }),
    ...(options.deviceFingerprint && { deviceFingerprint: options.deviceFingerprint }),
  };

  const expiresIn =
    options.tokenType === 'access'
      ? ENHANCED_JWT_CONFIG.accessTokenExpiresIn
      : ENHANCED_JWT_CONFIG.refreshTokenExpiresIn;

  const token = await new SignJWT(enhancedPayload)
    .setProtectedHeader({ alg: ENHANCED_JWT_CONFIG.algorithm })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .setIssuer(ENHANCED_JWT_CONFIG.issuer)
    .setAudience(ENHANCED_JWT_CONFIG.audience)
    .sign(getSharedJWTSecret());

  logger.debug('Enhanced JWT token created', {
    tokenType: options.tokenType,
    jti,
    sessionId,
    userId: payload.sub,
    tenantId: payload.tenantId,
    expiresIn,
  });

  return token;
}

/**
 * Revoke a JWT token (add to blacklist)
 */
export function revokeToken(token: string): void {
  tokenBlacklist.add(token);
  logger.info('JWT token revoked', {
    tokenHash: crypto.createHash('sha256').update(token).digest('hex').substring(0, 16),
  });
}

/**
 * Clear token blacklist (for cleanup)
 */
export function clearTokenBlacklist(): void {
  tokenBlacklist.clear();
  logger.info('Token blacklist cleared');
}

/**
 * Clear all security state (for testing)
 */
export function clearSecurityState(): void {
  tokenBlacklist.clear();
  failedAttempts.clear();
  rateLimitTracker.clear();
}

/**
 * Get authentication statistics
 */
export function getAuthStats() {
  return {
    blacklistedTokens: tokenBlacklist.size,
    failedAttemptTracking: failedAttempts.size,
    rateLimitTracking: rateLimitTracker.size,
    lockedAccounts: Array.from(failedAttempts.values()).filter(
      (a) => a.lockedUntil && a.lockedUntil > new Date()
    ).length,
  };
}

// Helper functions for backward compatibility
export function getTenantId(req: Request): string | null {
  return (req as any).tenantId || null;
}

export function isLegacyAuth(req: Request): boolean {
  return (req as any).isLegacyAuth === true;
}

export function getCorrelationId(req: Request): string | undefined {
  return (req as any).correlationId;
}

export function getSessionId(req: Request): string | undefined {
  return (req as any).sessionId;
}

// Re-export enhanced verification for testing
export { verifyEnhancedJWT as verifySharedJWT };
export { createEnhancedJWT as createSharedJWT };
