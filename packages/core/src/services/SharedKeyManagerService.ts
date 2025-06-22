import { Service, ServiceType, IAgentRuntime } from '../types/index';
import { elizaLogger } from '../logger';
import crypto from 'crypto';

/**
 * Manages secure sharing of private keys between plugins with access control
 */
export class SharedKeyManagerService extends Service {
  static override readonly serviceType = ServiceType.SECURITY;
  static serviceName = 'shared-key-manager';

  public readonly capabilityDescription =
    'Secure cross-plugin private key management with access control and audit logging';

  private keyStore: Map<string, EncryptedKeyData> = new Map();
  private accessMatrix: Map<string, Set<string>> = new Map();
  private auditLog: KeyAccessLog[] = [];
  private encryptionKey: Buffer;

  constructor(runtime?: IAgentRuntime) {
    super(runtime);

    // Initialize encryption key from runtime settings or generate one
    const keyString = runtime?.getSetting('SHARED_KEY_ENCRYPTION_KEY');
    if (keyString && typeof keyString === 'string') {
      this.encryptionKey = Buffer.from(keyString, 'hex');
    } else {
      // Generate a new key and warn user to save it
      this.encryptionKey = crypto.randomBytes(32);
      elizaLogger.warn(
        'Generated new encryption key for SharedKeyManager. ' +
          'Save this to SHARED_KEY_ENCRYPTION_KEY: ' +
          this.encryptionKey.toString('hex')
      );
    }
  }

  static async start(runtime: IAgentRuntime): Promise<SharedKeyManagerService> {
    const manager = new SharedKeyManagerService(runtime);
    elizaLogger.info('Shared Key Manager started');
    return manager;
  }

  async stop(): Promise<void> {
    // Clear sensitive data
    this.keyStore.clear();
    this.accessMatrix.clear();
    this.encryptionKey.fill(0);
    elizaLogger.info('Shared Key Manager stopped and cleared sensitive data');
  }

  /**
   * Register a private key for a specific chain type under a plugin's ownership
   */
  async registerPrivateKey(
    ownerPlugin: string,
    chainType: ChainType,
    privateKey: string,
    metadata?: KeyMetadata
  ): Promise<void> {
    const keyId = this.generateKeyId(ownerPlugin, chainType);

    try {
      const encryptedData = this.encryptPrivateKey(privateKey, metadata);
      this.keyStore.set(keyId, encryptedData);

      // Owner plugin has automatic access
      this.grantAccess(ownerPlugin, ownerPlugin, chainType);

      this.logAccess({
        action: 'register',
        keyId,
        requestingPlugin: ownerPlugin,
        ownerPlugin,
        chainType,
        timestamp: Date.now(),
        success: true,
      });

      elizaLogger.info(`Private key registered for ${ownerPlugin}:${chainType}`);
    } catch (error) {
      this.logAccess({
        action: 'register',
        keyId,
        requestingPlugin: ownerPlugin,
        ownerPlugin,
        chainType,
        timestamp: Date.now(),
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Grant access to a private key for another plugin
   */
  grantAccess(ownerPlugin: string, requestingPlugin: string, chainType: ChainType): void {
    const keyId = this.generateKeyId(ownerPlugin, chainType);

    if (!this.keyStore.has(keyId)) {
      throw new Error(`No private key found for ${ownerPlugin}:${chainType}`);
    }

    const accessKey = this.generateAccessKey(requestingPlugin, chainType);
    if (!this.accessMatrix.has(accessKey)) {
      this.accessMatrix.set(accessKey, new Set());
    }

    this.accessMatrix.get(accessKey)!.add(keyId);

    elizaLogger.info(
      `Granted ${requestingPlugin} access to ${ownerPlugin}:${chainType} private key`
    );
  }

  /**
   * Revoke access to a private key
   */
  revokeAccess(ownerPlugin: string, requestingPlugin: string, chainType: ChainType): void {
    const keyId = this.generateKeyId(ownerPlugin, chainType);
    const accessKey = this.generateAccessKey(requestingPlugin, chainType);

    const accessSet = this.accessMatrix.get(accessKey);
    if (accessSet) {
      accessSet.delete(keyId);
      if (accessSet.size === 0) {
        this.accessMatrix.delete(accessKey);
      }
    }

    elizaLogger.info(
      `Revoked ${requestingPlugin} access to ${ownerPlugin}:${chainType} private key`
    );
  }

  /**
   * Get private key if plugin has access
   */
  async getPrivateKey(
    requestingPlugin: string,
    chainType: ChainType,
    ownerPlugin?: string
  ): Promise<string | null> {
    let keyId: string;

    if (ownerPlugin) {
      // Specific owner plugin requested
      keyId = this.generateKeyId(ownerPlugin, chainType);
    } else {
      // Find any accessible key for this chain type
      keyId = this.findAccessibleKey(requestingPlugin, chainType);
    }

    if (!keyId) {
      this.logAccess({
        action: 'get',
        keyId: keyId || 'unknown',
        requestingPlugin,
        ownerPlugin: ownerPlugin || 'any',
        chainType,
        timestamp: Date.now(),
        success: false,
        error: 'No accessible key found',
      });
      return null;
    }

    const accessKey = this.generateAccessKey(requestingPlugin, chainType);
    const hasAccess = this.accessMatrix.get(accessKey)?.has(keyId) || false;

    if (!hasAccess) {
      this.logAccess({
        action: 'get',
        keyId,
        requestingPlugin,
        ownerPlugin: ownerPlugin || 'unknown',
        chainType,
        timestamp: Date.now(),
        success: false,
        error: 'Access denied',
      });
      return null;
    }

    try {
      const encryptedData = this.keyStore.get(keyId);
      if (!encryptedData) {
        throw new Error('Key data not found');
      }

      const privateKey = this.decryptPrivateKey(encryptedData);

      this.logAccess({
        action: 'get',
        keyId,
        requestingPlugin,
        ownerPlugin: ownerPlugin || 'unknown',
        chainType,
        timestamp: Date.now(),
        success: true,
      });

      return privateKey;
    } catch (error) {
      this.logAccess({
        action: 'get',
        keyId,
        requestingPlugin,
        ownerPlugin: ownerPlugin || 'unknown',
        chainType,
        timestamp: Date.now(),
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Check if plugin has access to a specific key
   */
  hasAccess(requestingPlugin: string, chainType: ChainType, ownerPlugin?: string): boolean {
    if (ownerPlugin) {
      const keyId = this.generateKeyId(ownerPlugin, chainType);
      const accessKey = this.generateAccessKey(requestingPlugin, chainType);
      return this.accessMatrix.get(accessKey)?.has(keyId) || false;
    } else {
      // Check if has access to any key of this chain type
      return this.findAccessibleKey(requestingPlugin, chainType) !== '';
    }
  }

  /**
   * Get list of chain types that a plugin has access to
   */
  getAccessibleChainTypes(requestingPlugin: string): ChainType[] {
    const chainTypes: ChainType[] = [];

    for (const chainType of Object.values(ChainType)) {
      if (this.findAccessibleKey(requestingPlugin, chainType)) {
        chainTypes.push(chainType);
      }
    }

    return chainTypes;
  }

  /**
   * Get audit log for security monitoring
   */
  getAuditLog(filters?: {
    plugin?: string;
    chainType?: ChainType;
    action?: KeyAccessAction;
    since?: number;
    limit?: number;
  }): KeyAccessLog[] {
    let logs = [...this.auditLog];

    if (filters) {
      if (filters.plugin) {
        logs = logs.filter(
          (log) => log.requestingPlugin === filters.plugin || log.ownerPlugin === filters.plugin
        );
      }

      if (filters.chainType) {
        logs = logs.filter((log) => log.chainType === filters.chainType);
      }

      if (filters.action) {
        logs = logs.filter((log) => log.action === filters.action);
      }

      if (filters.since) {
        logs = logs.filter((log) => log.timestamp >= filters.since!);
      }

      if (filters.limit) {
        logs = logs.slice(-filters.limit);
      }
    }

    return logs.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Get access matrix for administrative purposes
   */
  getAccessMatrix(): Record<string, string[]> {
    const matrix: Record<string, string[]> = {};

    for (const [accessKey, keyIds] of this.accessMatrix) {
      matrix[accessKey] = Array.from(keyIds);
    }

    return matrix;
  }

  /**
   * Clear audit log (for maintenance)
   */
  clearAuditLog(olderThan?: number): number {
    const initialLength = this.auditLog.length;

    if (olderThan) {
      this.auditLog = this.auditLog.filter((log) => log.timestamp >= olderThan);
    } else {
      this.auditLog = [];
    }

    const cleared = initialLength - this.auditLog.length;
    elizaLogger.info(`Cleared ${cleared} audit log entries`);
    return cleared;
  }

  // Private helper methods

  private generateKeyId(ownerPlugin: string, chainType: ChainType): string {
    return `${ownerPlugin}:${chainType}`;
  }

  private generateAccessKey(requestingPlugin: string, chainType: ChainType): string {
    return `${requestingPlugin}:${chainType}`;
  }

  private findAccessibleKey(requestingPlugin: string, chainType: ChainType): string {
    const accessKey = this.generateAccessKey(requestingPlugin, chainType);
    const accessibleKeys = this.accessMatrix.get(accessKey);

    if (!accessibleKeys || accessibleKeys.size === 0) {
      return '';
    }

    // Return first accessible key
    return Array.from(accessibleKeys)[0];
  }

  private encryptPrivateKey(privateKey: string, metadata?: KeyMetadata): EncryptedKeyData {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.encryptionKey, iv);

    let encrypted = cipher.update(privateKey, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();

    return {
      encryptedKey: encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
      metadata: metadata || {},
      createdAt: Date.now(),
    };
  }

  private decryptPrivateKey(encryptedData: EncryptedKeyData): string {
    const iv = Buffer.from(encryptedData.iv, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', this.encryptionKey, iv);
    decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));

    let decrypted = decipher.update(encryptedData.encryptedKey, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  private logAccess(log: KeyAccessLog): void {
    this.auditLog.push(log);

    // Keep only last 10000 entries to prevent memory issues
    if (this.auditLog.length > 10000) {
      this.auditLog = this.auditLog.slice(-5000);
    }

    // Log security events
    if (!log.success) {
      elizaLogger.warn(
        `Key access denied: ${log.requestingPlugin} -> ${log.ownerPlugin}:${log.chainType} (${log.error})`
      );
    }
  }
}

// Supporting types

export enum ChainType {
  SOLANA = 'solana',
  ETHEREUM = 'ethereum',
  EVM = 'evm', // Generic EVM chains
  BITCOIN = 'bitcoin',
}

export interface KeyMetadata {
  description?: string;
  source?: string;
  restrictions?: string[];
  expiresAt?: number;
}

export interface EncryptedKeyData {
  encryptedKey: string;
  iv: string;
  authTag: string;
  metadata: KeyMetadata;
  createdAt: number;
}

export type KeyAccessAction = 'register' | 'get' | 'grant' | 'revoke';

export interface KeyAccessLog {
  action: KeyAccessAction;
  keyId: string;
  requestingPlugin: string;
  ownerPlugin: string;
  chainType: ChainType;
  timestamp: number;
  success: boolean;
  error?: string;
}
