/**
 * Device Authorization Flow Storage and Utilities
 * Database-backed implementation for production use
 */

import { nanoid } from 'nanoid';
import { deviceCodeRepository } from '../database/repositories/device-code';
import { generateAccessToken } from './shared-jwt';

// Legacy interface for backward compatibility
export interface DeviceAuthRequest {
  user_code: string;
  device_code: string;
  client_id: string;
  scope: string;
  created_at: number;
  expires_at: number;
  authorization?: {
    access_token: string;
    user: {
      id: string;
      name: string;
      email: string;
    };
  };
}

// User code format: XXXX-XXXX (8 chars, easy to type)
export function generateUserCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No confusing chars
  let code = '';
  for (let i = 0; i < 8; i++) {
    if (i === 4) {code += '-';}
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/**
 * Database-backed device code operations
 */
export class DeviceFlowService {
  /**
   * Create a new device authorization request
   */
  async createDeviceAuth(
    clientId: string,
    scope: string,
    expiresIn: number = 600,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<{
    device_code: string;
    user_code: string;
    expires_in: number;
    interval: number;
  }> {
    const device_code = nanoid(32);
    const user_code = generateUserCode();
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    await deviceCodeRepository.create({
      deviceCode: device_code,
      userCode: user_code,
      clientId,
      scope,
      expiresAt,
      interval: 5,
      userAgent,
      ipAddress,
    });

    return {
      device_code,
      user_code,
      expires_in: expiresIn,
      interval: 5,
    };
  }

  /**
   * Check device authorization status
   */
  async checkDeviceAuth(deviceCode: string): Promise<{
    success: boolean;
    data?: {
      access_token: string;
      user: {
        id: string;
        name: string;
        email: string;
      };
    };
    error?: string;
  }> {
    // Get device auth with user information from database
    const deviceAuthWithUser =
      await deviceCodeRepository.getByDeviceCodeWithUser(deviceCode);

    if (!deviceAuthWithUser) {
      return { success: false, error: 'invalid_grant' };
    }

    const deviceAuth = deviceAuthWithUser;

    // Check if expired
    if (new Date() > deviceAuth.expiresAt) {
      await deviceCodeRepository.delete(deviceCode);
      return { success: false, error: 'expired_token' };
    }

    // Check if authorized
    if (!deviceAuth.isAuthorized || !deviceAuth.accessToken) {
      return { success: false, error: 'authorization_pending' };
    }

    // Validate that we have real user data
    if (!deviceAuth.user || !deviceAuth.authorizedByUserId) {
      console.error(
        `[DEVICE AUTH] Missing user data for authorized device code: ${deviceCode}`,
      );
      return { success: false, error: 'invalid_grant' };
    }

    // Build user info from database user record
    const user = {
      id: deviceAuth.user.id,
      name:
        deviceAuth.user.firstName && deviceAuth.user.lastName
          ? `${deviceAuth.user.firstName} ${deviceAuth.user.lastName}`.trim()
          : deviceAuth.user.email.split('@')[0], // Fallback to email username
      email: deviceAuth.user.email,
    };

    // Clean up after successful token exchange
    await deviceCodeRepository.delete(deviceCode);

    console.log(
      `[DEVICE AUTH] Token exchange successful for user: ${user.email} (${user.id})`,
    );

    return {
      success: true,
      data: {
        access_token: deviceAuth.accessToken,
        user,
      },
    };
  }

  /**
   * Authorize a device with user consent
   */
  async authorizeDevice(
    userCode: string,
    userId: string,
    userInfo: { id: string; name: string; email: string },
  ): Promise<{
    success: boolean;
    error?: string;
  }> {
    const deviceAuth = await deviceCodeRepository.getByUserCode(userCode);

    if (!deviceAuth) {
      return { success: false, error: 'Invalid or expired user code' };
    }

    // Check if expired
    if (new Date() > deviceAuth.expiresAt) {
      await deviceCodeRepository.delete(deviceAuth.deviceCode);
      return { success: false, error: 'User code has expired' };
    }

    // Generate access token
    const accessToken = await generateAccessToken({
      userId: userInfo.id,
      email: userInfo.email,
      name: userInfo.name,
    });

    // Mark as authorized
    const success = await deviceCodeRepository.authorize(
      deviceAuth.deviceCode,
      userId,
      accessToken,
    );

    if (!success) {
      return { success: false, error: 'Authorization failed' };
    }

    return { success: true };
  }

  /**
   * Clean up expired device codes
   */
  async cleanupExpired(): Promise<number> {
    return await deviceCodeRepository.cleanupExpired();
  }

  /**
   * Check if user code is valid
   */
  async isUserCodeValid(userCode: string): Promise<boolean> {
    return await deviceCodeRepository.isUserCodeValid(userCode);
  }
}

// Export singleton instance
export const deviceFlowService = new DeviceFlowService();

// Legacy map interface for backward compatibility (deprecated)
// This is kept for existing code that might still reference it
export const deviceCodes = {
  get: async (deviceCode: string) => {
    const result = await deviceCodeRepository.getByDeviceCode(deviceCode);
    if (!result) {return null;}

    return {
      user_code: result.userCode,
      device_code: result.deviceCode,
      client_id: result.clientId,
      scope: result.scope,
      created_at: result.createdAt.getTime(),
      expires_at: result.expiresAt.getTime(),
      authorization:
        result.isAuthorized && result.accessToken
          ? {
            access_token: result.accessToken,
            user: {
              id: result.authorizedByUserId || 'unknown',
              name: 'Device User',
              email: 'device@example.com',
            },
          }
          : undefined,
    };
  },
  set: () => {
    console.warn(
      'deviceCodes.set() is deprecated. Use deviceFlowService.createDeviceAuth()',
    );
  },
  delete: async (deviceCode: string) => {
    return await deviceCodeRepository.delete(deviceCode);
  },
  entries: () => {
    console.warn(
      'deviceCodes.entries() is deprecated. Use deviceCodeRepository methods',
    );
    return [];
  },
  forEach: () => {
    console.warn(
      'deviceCodes.forEach() is deprecated. Use deviceCodeRepository methods',
    );
  },
  size: 0, // Deprecated
};

// Start periodic cleanup
if (typeof setInterval !== 'undefined') {
  setInterval(async () => {
    try {
      await deviceFlowService.cleanupExpired();
    } catch (error) {
      console.error('Device code cleanup failed:', error);
    }
  }, 60000); // Every minute
}
