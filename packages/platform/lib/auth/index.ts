/**
 * Main authentication module exports
 */

import { sessionService } from './session';

// WorkOS SSO functionality
export {
  workosAuth,
  mapWorkOSRoleToAppRole,
  getDomainFromEmail
} from './workos';

// Session management
export {
  sessionService,
  authService,
  type SessionData,
  type AuthTokens,
  SessionService,
  AuthService
} from './session';

// Convenience re-exports for auth route usage
export type { User, Organization } from '../database';

// Main auth function for API routes
export async function auth() {
  try {
    const session = await sessionService.getSessionFromCookies();
    if (!session) {
      return null;
    }
    
    return {
      user: {
        id: session.userId,
        email: session.email,
        role: session.role,
      },
      organizationId: session.organizationId,
    };
  } catch (error) {
    console.error('Auth error:', error);
    return null;
  }
}

// JWT token verification
export async function verifyJwtToken(token: string) {
  return await sessionService.verifyAccessToken(token);
}
