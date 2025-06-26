import { type Request, type Response, type NextFunction } from 'express';
import { logger } from '@elizaos/core';
import {
  enhancedAuthMiddleware,
  requireJWTAuth,
  getTenantId,
  isLegacyAuth,
} from './middleware/JWTAuthMiddleware';

/**
 * Express middleware for validating API Key authentication based on an environment variable.
 *
 * DEPRECATED: Use enhancedAuthMiddleware instead for JWT + legacy API key support
 *
 * If the ELIZA_SERVER_AUTH_TOKEN environment variable is set, this middleware
 * checks for a matching 'X-API-KEY' header in incoming requests.
 *
 * If the environment variable is *not* set, the middleware allows all requests
 * to pass through without authentication checks.
 *
 * @param req - Express request object.
 * @param res - Express response object.
 * @param next - Express next function.
 */
export function apiKeyAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  const serverAuthToken = process.env.ELIZA_SERVER_AUTH_TOKEN;

  // SECURITY: Authentication is now required by default
  // Set ELIZA_DISABLE_AUTH=true to disable authentication (NOT recommended for production)
  const authDisabled = process.env.ELIZA_DISABLE_AUTH === 'true';

  if (!serverAuthToken && !authDisabled) {
    logger.error(
      'SECURITY ERROR: No authentication configured. Set ELIZA_SERVER_AUTH_TOKEN or ELIZA_DISABLE_AUTH=true'
    );
    return res.status(500).json({
      success: false,
      error: {
        code: 'AUTH_NOT_CONFIGURED',
        message: 'Server authentication not properly configured',
      },
    });
  }

  // If explicitly disabled (not recommended for production)
  if (authDisabled) {
    logger.warn(
      'SECURITY WARNING: Authentication is disabled. This should only be used in development.'
    );
    return next();
  }

  // Allow OPTIONS requests for CORS preflight
  if (req.method === 'OPTIONS') {
    return next();
  }

  const apiKey = req.headers?.['x-api-key'];

  if (!apiKey || apiKey !== serverAuthToken) {
    logger.warn(`Unauthorized access attempt: Missing or invalid X-API-KEY from ${req.ip}`);
    return res.status(401).send('Unauthorized: Invalid or missing X-API-KEY');
  }

  // If key is valid, proceed
  next();
}

// Re-export the new enhanced middleware functions
export { enhancedAuthMiddleware, requireJWTAuth, getTenantId, isLegacyAuth };
