import { IAgentRuntime, logger, asUUID, UUID } from '@elizaos/core';
import type { Address, Hash, Hex } from 'viem';
import { keccak256, encodePacked, toHex } from 'viem';
import { sign } from 'viem/accounts';
import { WalletDatabaseService } from '../core/database/service';
import { decrypt, encrypt } from '../core/security/encryption';
import type {
  SessionPermission,
  WalletSession,
  SessionKey as ISessionKey,
} from '../core/interfaces/IWalletService';
import { randomBytes } from 'crypto';

export interface SessionConfig {
  walletAddress: Address;
  permissions: SessionPermission[];
  expiresAt: number;
  name?: string;
  metadata?: Record<string, any>;
}

export interface SessionKey {
  privateKey: Hex;
  publicKey: Hex;
  address: Address;
}

export interface SessionValidation {
  isValid: boolean;
  reason?: string;
  remainingTime?: number;
}

export class SessionManager {
  private dbService: WalletDatabaseService;
  private activeSessions: Map<string, WalletSession> = new Map();
  private cleanupInterval?: NodeJS.Timeout;

  constructor(private runtime: IAgentRuntime) {
    this.dbService = new WalletDatabaseService(runtime);
    this.startCleanupInterval();
  }

  /**
   * Create a new session key with specific permissions
   */
  async createSession(config: SessionConfig): Promise<WalletSession> {
    try {
      // Generate session key
      const sessionKey = await this.generateSessionKey();

      // Create session ID
      const sessionId = asUUID(
        keccak256(
          encodePacked(
            ['address', 'address', 'uint256'],
            [config.walletAddress, sessionKey.address, BigInt(Date.now())],
          ),
        ),
      );

      // Encrypt the private key
      const encryptedKey = await encrypt(sessionKey.privateKey, this.getEncryptionKey());

      // Create session object
      const session: Omit<WalletSession, 'id'> = {
        walletId: config.walletAddress, // This should be the wallet UUID in production
        sessionKey: sessionKey.address,
        permissions: config.permissions,
        expiresAt: config.expiresAt,
        createdAt: Date.now(),
        lastUsedAt: Date.now(),
        isActive: true,
        name: config.name || `Session ${sessionId.slice(0, 8)}`,
        metadata: {
          ...config.metadata,
          publicKey: sessionKey.publicKey,
          encryptedPrivateKey: encryptedKey,
        },
      };

      // Add the ID to the session
      const sessionWithId: WalletSession = {
        ...session,
        id: sessionId,
      };

      // Save to database - we'll need to implement this in dbService
      // For now, just cache in memory
      this.activeSessions.set(sessionId, sessionWithId);

      logger.info(`Session created: ${sessionId} for wallet ${config.walletAddress}`);

      return sessionWithId;
    } catch (error) {
      logger.error('Error creating session:', error);
      throw new Error(
        `Failed to create session: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Generate a new session key pair
   */
  private async generateSessionKey(): Promise<SessionKey> {
    // Generate random 32 bytes for private key
    const privateKeyBytes = randomBytes(32);
    const privateKey = `0x${privateKeyBytes.toString('hex')}` as Hex;

    // Import viem's privateKeyToAccount to get public key and address
    const { privateKeyToAccount } = await import('viem/accounts');
    const account = privateKeyToAccount(privateKey);

    return {
      privateKey,
      publicKey: account.publicKey,
      address: account.address,
    };
  }

  /**
   * Validate a session and check permissions
   */
  async validateSession(
    sessionId: string,
    action: string,
    params?: any,
  ): Promise<SessionValidation> {
    try {
      // Check cache first
      let session = this.activeSessions.get(sessionId);

      // If not in cache, load from database
      if (!session) {
        // For now, we'll just check the cache since we don't have DB methods yet
        // In production, we'd load from database here
        session = undefined;
      }

      if (!session) {
        return {
          isValid: false,
          reason: 'Session not found',
        };
      }

      // Check if session is active
      if (!session.isActive) {
        return {
          isValid: false,
          reason: 'Session is inactive',
        };
      }

      // Check expiration
      const now = Date.now();
      if (session.expiresAt <= now) {
        // Mark as inactive
        await this.revokeSession(sessionId);
        return {
          isValid: false,
          reason: 'Session has expired',
        };
      }

      // Check permissions
      const hasPermission = this.checkPermission(session, action, params);
      if (!hasPermission) {
        return {
          isValid: false,
          reason: `No permission for action: ${action}`,
        };
      }

      // Update last used timestamp
      await this.updateLastUsed(sessionId);

      return {
        isValid: true,
        remainingTime: session.expiresAt - now,
      };
    } catch (error) {
      logger.error('Error validating session:', error);
      return {
        isValid: false,
        reason: 'Validation error',
      };
    }
  }

  /**
   * Check if a session has permission for a specific action
   */
  private checkPermission(session: WalletSession, action: string, params?: any): boolean {
    for (const permission of session.permissions) {
      // Check action type
      if (permission.type !== action && permission.type !== '*') {
        continue;
      }

      // Check target if specified
      if (permission.target && params?.target) {
        if (permission.target.toLowerCase() !== params.target.toLowerCase()) {
          continue;
        }
      }

      // Check value limits
      if (permission.valueLimit !== undefined && params?.value) {
        const value = BigInt(params.value);
        const limit = BigInt(permission.valueLimit);
        if (value > limit) {
          continue;
        }
      }

      // Check gas limits
      if (permission.gasLimit !== undefined && params?.gasLimit) {
        const gasLimit = BigInt(params.gasLimit);
        const limit = BigInt(permission.gasLimit);
        if (gasLimit > limit) {
          continue;
        }
      }

      // Check chain ID
      if (permission.chainId !== undefined && params?.chainId) {
        if (permission.chainId !== params.chainId) {
          continue;
        }
      }

      // All checks passed
      return true;
    }

    return false;
  }

  /**
   * Sign a message or transaction with a session key
   */
  async signWithSession(sessionId: string, message: string | Hex): Promise<Hash> {
    try {
      const session = this.activeSessions.get(sessionId);
      if (!session || !session.metadata?.encryptedPrivateKey) {
        throw new Error('Session not found or invalid');
      }

      // Decrypt the private key
      const privateKey = await decrypt(
        session.metadata.encryptedPrivateKey,
        this.getEncryptionKey(),
      );

      // Sign the message
      const { privateKeyToAccount } = await import('viem/accounts');
      const account = privateKeyToAccount(privateKey as Hex);

      const signature = await account.signMessage({
        message: typeof message === 'string' ? message : message,
      });

      return signature;
    } catch (error) {
      logger.error('Error signing with session:', error);
      throw new Error(
        `Failed to sign with session: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Revoke a session
   */
  async revokeSession(sessionId: string): Promise<void> {
    try {
      // Remove from cache
      this.activeSessions.delete(sessionId);

      // Update in database
      const session = await this.dbService.getSession(sessionId as UUID);
      if (session) {
        await this.dbService.updateSession(sessionId as UUID, {
          isActive: false,
        });
      }

      logger.info(`Session revoked: ${sessionId}`);
    } catch (error) {
      logger.error('Error revoking session:', error);
      throw new Error(
        `Failed to revoke session: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Update last used timestamp
   */
  private async updateLastUsed(sessionId: string): Promise<void> {
    try {
      const now = Date.now();

      // Update cache
      const session = this.activeSessions.get(sessionId);
      if (session) {
        session.lastUsedAt = now;
      }

      // Update database
      await this.dbService.updateSession(sessionId as UUID, {
        lastUsedAt: now,
      });
    } catch (error) {
      logger.error('Error updating last used:', error);
    }
  }

  /**
   * Get active sessions for a wallet
   */
  async getActiveSessions(walletAddress: Address): Promise<WalletSession[]> {
    try {
      const sessions = await this.dbService.listSessions();
      const now = Date.now();

      // Convert SessionKey to WalletSession
      const activeSessions: WalletSession[] = sessions
        .filter((session) => session.isActive && session.expiresAt > now)
        .map((session) => ({
          id: session.id,
          walletId: walletAddress as any, // Should be wallet UUID
          sessionKey: session.publicKey as Address,
          permissions: session.permissions,
          expiresAt: session.expiresAt,
          createdAt: session.createdAt,
          lastUsedAt: session.lastUsedAt || 0,
          isActive: session.isActive,
          name: `Session ${session.id.slice(0, 8)}`,
          metadata: {},
        }));

      return activeSessions;
    } catch (error) {
      logger.error('Error getting active sessions:', error);
      return [];
    }
  }

  /**
   * Clean up expired sessions
   */
  private async cleanupExpiredSessions(): Promise<void> {
    try {
      const now = Date.now();

      // Clean up cache
      for (const [sessionId, session] of this.activeSessions.entries()) {
        if (session.expiresAt <= now || !session.isActive) {
          this.activeSessions.delete(sessionId);
        }
      }

      logger.debug('Cleaned up expired sessions');
    } catch (error) {
      logger.error('Error cleaning up sessions:', error);
    }
  }

  /**
   * Start cleanup interval
   */
  private startCleanupInterval(): void {
    // Run cleanup every 5 minutes
    this.cleanupInterval = setInterval(() => this.cleanupExpiredSessions(), 5 * 60 * 1000);
  }

  /**
   * Get encryption key for session keys
   */
  private getEncryptionKey(): string {
    const key = this.runtime.getSetting('SESSION_ENCRYPTION_KEY');
    if (!key) {
      throw new Error('SESSION_ENCRYPTION_KEY not configured');
    }
    return key;
  }

  /**
   * Stop the session manager
   */
  async stop(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.activeSessions.clear();
    logger.info('Session manager stopped');
  }
}

// Export factory function
export function createSessionManager(runtime: IAgentRuntime): SessionManager {
  return new SessionManager(runtime);
}
