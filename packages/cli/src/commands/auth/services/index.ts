/**
 * Export auth service and singleton instance
 */

import { AuthService } from './auth-service';

// Singleton instance
let authServiceInstance: AuthService | null = null;

/**
 * Get the singleton auth service instance
 */
export function getAuthService(): AuthService {
  if (!authServiceInstance) {
    authServiceInstance = new AuthService();
  }
  return authServiceInstance;
}

export { AuthService };
export * from '../types';
