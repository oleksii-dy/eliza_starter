import type { IAgentRuntime, UUID } from '@elizaos/core';
import { Service, logger, createUniqueUuid } from '@elizaos/core';
import type {
  SecretContext,
  SecretConfig,
  SecretMetadata,
  SecretPermission,
  SecretAccessLog,
  EncryptedSecret,
} from '../types';
import { validateEnvVar } from '../validation';
import { secureCrypto } from '../security/crypto';
import { EnvManagerService } from '../service';

/**
 * Unified Secret Manager Service
 * Consolidates all secret management functionality into a single service with internal managers
 */
export class UnifiedSecretManager extends EnvManagerService {
  static serviceType = 'SECRETS';
  capabilityDescription =
    'Comprehensive secret management with encryption, access control, versioning, and audit logging';

  // Internal managers (not exposed as services)
  private encryption!: EncryptionManager;
  private storage!: StorageManager;
  private accessControl!: AccessControlManager;
  private audit!: AuditManager;
  private versioning!: VersioningManager;
  private rotation!: RotationManager;
  private backup!: BackupManager;

  static async start(runtime: IAgentRuntime): Promise<UnifiedSecretManager> {
    const service = new UnifiedSecretManager(runtime);
    await service.initialize();
    return service;
  }

  async initialize(): Promise<void> {
    // Initialize parent service for backward compatibility
    await super.initialize();

    logger.info('[UnifiedSecretManager] Initializing unified secret manager');

    // Initialize internal managers
    this.encryption = new EncryptionManager(this.runtime);
    this.storage = new StorageManager(this.runtime, this.encryption);
    this.accessControl = new AccessControlManager(this.runtime, this.storage);
    this.audit = new AuditManager(this.runtime);
    this.versioning = new VersioningManager(this.runtime, this.encryption);
    this.rotation = new RotationManager(this.runtime, this.storage, this.audit);
    this.backup = new BackupManager(this.runtime, this.storage, this.encryption);

    // Load persisted data
    await this.rotation.loadPersistedSchedules();

    logger.info('[UnifiedSecretManager] Initialization complete');
  }

  // === Public API Methods ===

  async get(key: string, context: SecretContext): Promise<string | null> {
    try {
      await this.audit.logAccess(key, 'read', context, true);

      if (!(await this.accessControl.checkPermission(key, 'read', context))) {
        await this.audit.logAccess(key, 'read', context, false, 'Permission denied');
        return null;
      }

      return await this.storage.get(key, context);
    } catch (error) {
      logger.error(`Error getting secret ${key}:`, error);
      await this.audit.logAccess(key, 'read', context, false, error instanceof Error ? error.message : String(error));
      return null;
    }
  }

  async set(
    key: string,
    value: any,
    context: SecretContext,
    config?: Partial<SecretConfig>
  ): Promise<boolean> {
    try {
      await this.audit.logAccess(key, 'write', context, true);

      if (!(await this.accessControl.checkPermission(key, 'write', context))) {
        await this.audit.logAccess(key, 'write', context, false, 'Permission denied');
        return false;
      }

      // Validate if needed
      if (config?.validationMethod || config?.type) {
        const validation = await validateEnvVar(
          key,
          value,
          config.type || 'secret',
          config.validationMethod
        );

        if (!validation.isValid) {
          throw new Error(`Validation failed: ${validation.error}`);
        }
      }

      // Create version before update
      if (await this.storage.exists(key, context)) {
        await this.versioning.createVersion(key, value, context);
      }

      return await this.storage.set(key, value, context, config);
    } catch (error) {
      logger.error(`Error setting secret ${key}:`, error);
      await this.audit.logAccess(key, 'write', context, false, error instanceof Error ? error.message : String(error));
      return false;
    }
  }

  async list(context: SecretContext): Promise<SecretMetadata> {
    return await this.storage.list(context);
  }

  async delete(key: string, context: SecretContext): Promise<boolean> {
    try {
      await this.audit.logAccess(key, 'delete', context, true);

      if (!(await this.accessControl.checkPermission(key, 'delete', context))) {
        await this.audit.logAccess(key, 'delete', context, false, 'Permission denied');
        return false;
      }

      return await this.storage.delete(key, context);
    } catch (error) {
      logger.error(`Error deleting secret ${key}:`, error);
      await this.audit.logAccess(key, 'delete', context, false, error instanceof Error ? error.message : String(error));
      return false;
    }
  }

  // Access control
  async grantAccess(
    key: string,
    context: SecretContext,
    grantee: string,
    permissions: string[]
  ): Promise<boolean> {
    await this.audit.logAccess(key, 'share', context, true);
    return await this.accessControl.grantAccess(key, context, grantee, permissions);
  }

  async revokeAccess(key: string, context: SecretContext, grantee: string): Promise<boolean> {
    return await this.accessControl.revokeAccess(key, context, grantee);
  }

  // Audit
  async getAccessLogs(key: string, context?: SecretContext): Promise<SecretAccessLog[]> {
    return await this.audit.getAccessLogs(key, context);
  }

  // Rotation
  async rotateSecret(key: string, context: SecretContext): Promise<boolean> {
    return await this.rotation.rotateSecret(key, context);
  }

  async scheduleRotation(key: string, context: SecretContext, intervalMs: number): Promise<boolean> {
    await this.rotation.scheduleRotation(key, context, intervalMs);
    return true;
  }

  // Backup
  async createBackup(context: SecretContext): Promise<{ backupId: string; secretCount: number }> {
    return await this.backup.backup(context);
  }

  async restoreBackup(
    backupId: string,
    context: SecretContext,
    overwrite: boolean = false
  ): Promise<{ restoredCount: number }> {
    return await this.backup.restore(backupId, context, overwrite);
  }

  // Versioning
  async getSecretVersions(key: string, context: SecretContext): Promise<Array<{ id: string; createdAt: number; size: number }>> {
    return await this.versioning.listVersions(key, context);
  }

  async rollbackSecret(key: string, versionId: string, context: SecretContext): Promise<boolean> {
    return await this.versioning.rollback(key, versionId, context);
  }

  async stop(): Promise<void> {
    logger.info('[UnifiedSecretManager] Stopping service');
    
    await this.rotation.stop();
    await this.audit.stop();
    
    await super.stop();
    
    logger.info('[UnifiedSecretManager] Service stopped');
  }
}

// === Internal Manager Classes ===

/**
 * Handles encryption/decryption operations
 */
class EncryptionManager {
  private encryptionPassword: string;

  constructor(private runtime: IAgentRuntime) {
    const salt = this.runtime.getSetting('ENCRYPTION_SALT') || secureCrypto.generateToken(32);
    this.encryptionPassword = this.runtime.agentId + salt;
    
    if (!this.runtime.getSetting('ENCRYPTION_SALT')) {
      logger.warn('Generated new encryption salt. Store ENCRYPTION_SALT in environment for persistence.');
    }
  }

  async encrypt(plaintext: string): Promise<string> {
    if (!plaintext) return plaintext;
    return await secureCrypto.encrypt(plaintext, this.encryptionPassword);
  }

  async decrypt(ciphertext: string): Promise<string> {
    if (!ciphertext) return ciphertext;
    
    // Handle legacy format
    if (typeof ciphertext === 'object' && this.isEncrypted(ciphertext)) {
      return (ciphertext as EncryptedSecret).value || '';
    }
    
    return await secureCrypto.decrypt(ciphertext, this.encryptionPassword);
  }

  isEncrypted(data: any): boolean {
    if (typeof data === 'string') {
      try {
        const buffer = Buffer.from(data, 'base64');
        return buffer.length > 100;
      } catch {
        return false;
      }
    }
    
    if (typeof data === 'object' && data !== null) {
      return !!(data.algorithm && data.value);
    }
    
    return false;
  }
}

/**
 * Handles storage operations across different levels
 */
class StorageManager {
  constructor(
    private runtime: IAgentRuntime,
    private encryption: EncryptionManager
  ) {}

  async get(key: string, context: SecretContext): Promise<string | null> {
    switch (context.level) {
      case 'global':
        return await this.getGlobalSecret(key);
      case 'world':
        if (!context.worldId) throw new Error('World ID required');
        return await this.getWorldSecret(key, context.worldId);
      case 'user':
        if (!context.userId) throw new Error('User ID required');
        return await this.getUserSecret(key, context.userId);
      default:
        throw new Error(`Invalid secret level: ${context.level}`);
    }
  }

  async set(
    key: string,
    value: any,
    context: SecretContext,
    config?: Partial<SecretConfig>
  ): Promise<boolean> {
    const fullConfig: SecretConfig = {
      value,
      type: config?.type || 'secret',
      required: config?.required ?? false,
      description: config?.description || `Secret: ${key}`,
      canGenerate: false,
      status: 'valid',
      attempts: 0,
      plugin: config?.plugin || context.level,
      level: context.level,
      ownerId: context.userId,
      worldId: context.worldId,
      encrypted: config?.encrypted ?? true,
      permissions: config?.permissions,
      createdAt: Date.now(),
      validatedAt: Date.now(),
    };

    switch (context.level) {
      case 'global':
        return await this.setGlobalSecret(key, value, fullConfig);
      case 'world':
        if (!context.worldId) throw new Error('World ID required');
        return await this.setWorldSecret(key, value, context.worldId, fullConfig);
      case 'user':
        if (!context.userId) throw new Error('User ID required');
        return await this.setUserSecret(key, value, context.userId, fullConfig);
      default:
        throw new Error(`Invalid secret level: ${context.level}`);
    }
  }

  async list(context: SecretContext): Promise<SecretMetadata> {
    const metadata: SecretMetadata = {};
    
    // Implementation would fetch and filter secrets based on context
    // Omitting values for security
    
    return metadata;
  }

  async delete(key: string, context: SecretContext): Promise<boolean> {
    switch (context.level) {
      case 'global':
        return await this.deleteGlobalSecret(key);
      case 'world':
        if (!context.worldId) throw new Error('World ID required');
        return await this.deleteWorldSecret(key, context.worldId);
      case 'user':
        if (!context.userId) throw new Error('User ID required');
        return await this.deleteUserSecret(key, context.userId);
      default:
        return false;
    }
  }

  async exists(key: string, context: SecretContext): Promise<boolean> {
    const value = await this.get(key, context);
    return value !== null;
  }

  // Private implementation methods
  private async getGlobalSecret(key: string): Promise<string | null> {
    const envValue = this.runtime.getSetting(key);
    if (envValue) return envValue;

    const characterSecrets = this.runtime.character.secrets;
    return (characterSecrets?.[key] as string) || null;
  }

  private async setGlobalSecret(key: string, value: any, config: SecretConfig): Promise<boolean> {
    this.runtime.setSetting(key, value);
    
    if (!this.runtime.character.secrets) {
      this.runtime.character.secrets = {};
    }
    this.runtime.character.secrets[key] = value;
    
    return true;
  }

  private async deleteGlobalSecret(key: string): Promise<boolean> {
    this.runtime.setSetting(key, null);
    
    if (this.runtime.character.secrets?.[key]) {
      delete this.runtime.character.secrets[key];
    }
    
    return true;
  }

  private async getWorldSecret(key: string, worldId: string): Promise<string | null> {
    const world = await this.runtime.getWorld(worldId as UUID);
    if (!world?.metadata?.secrets?.[key]) return null;

    const secretData = world.metadata.secrets[key];
    if (typeof secretData === 'object' && secretData.encrypted) {
      return await this.encryption.decrypt(secretData.value);
    }
    return secretData.value || secretData;
  }

  private async setWorldSecret(
    key: string,
    value: any,
    worldId: string,
    config: SecretConfig
  ): Promise<boolean> {
    const world = await this.runtime.getWorld(worldId as UUID);
    if (!world) throw new Error(`World ${worldId} not found`);

    if (!world.metadata) world.metadata = {};
    if (!world.metadata.secrets) world.metadata.secrets = {};

    const finalValue = config.encrypted ? await this.encryption.encrypt(value) : value;

    (world.metadata.secrets as any)[key] = {
      ...config,
      value: finalValue,
    };

    await this.runtime.updateWorld(world);
    return true;
  }

  private async deleteWorldSecret(key: string, worldId: string): Promise<boolean> {
    const world = await this.runtime.getWorld(worldId as UUID);
    if (!world?.metadata?.secrets?.[key]) return false;

    delete world.metadata.secrets[key];
    await this.runtime.updateWorld(world);
    return true;
  }

  private async getUserSecret(key: string, userId: string): Promise<string | null> {
    const components = await this.runtime.getComponents(userId as UUID);
    const secretComponent = components.find((c) => {
      const data = c.data as any;
      return data?.key === key && c.type === 'secret' && !data?.deleted;
    });
    
    if (!secretComponent) return null;

    const secretData = secretComponent.data as any;
    if (secretData.metadata?.encrypted && secretData.value) {
      return await this.encryption.decrypt(secretData.value);
    }

    return secretData.value || null;
  }

  private async setUserSecret(
    key: string,
    value: any,
    userId: string,
    config: SecretConfig
  ): Promise<boolean> {
    const existingComponents = await this.runtime.getComponents(userId as UUID);
    const existingComponent = existingComponents.find(
      (c) => c.data?.key === key && c.type === 'secret'
    );

    const finalValue = config.encrypted ? await this.encryption.encrypt(value) : value;

    const componentData = {
      key,
      value: finalValue,
      metadata: config,
      updatedAt: Date.now(),
    };

    if (existingComponent) {
      await this.runtime.updateComponent({
        ...existingComponent,
        data: componentData,
      });
    } else {
      await this.runtime.createComponent({
        id: createUniqueUuid(this.runtime, `${userId}-${key}`),
        createdAt: Date.now(),
        entityId: userId as UUID,
        agentId: this.runtime.agentId,
        roomId: this.runtime.agentId,
        worldId: this.runtime.agentId,
        sourceEntityId: userId as UUID,
        type: 'secret',
        data: componentData,
      });
    }

    return true;
  }

  private async deleteUserSecret(key: string, userId: string): Promise<boolean> {
    const components = await this.runtime.getComponents(userId as UUID);
    const secretComponent = components.find((c) => c.data?.key === key && c.type === 'secret');
    
    if (!secretComponent) return false;

    await this.runtime.updateComponent({
      ...secretComponent,
      data: {
        ...secretComponent.data,
        deleted: true,
        deletedAt: Date.now(),
        value: null,
      }
    });

    return true;
  }
}

/**
 * Handles access control and permissions
 */
class AccessControlManager {
  constructor(
    private runtime: IAgentRuntime,
    private storage: StorageManager
  ) {}

  async checkPermission(
    key: string,
    action: 'read' | 'write' | 'delete' | 'share',
    context: SecretContext
  ): Promise<boolean> {
    // Global secrets
    if (context.level === 'global') {
      if (action === 'read') return true;
      return context.requesterId === this.runtime.agentId;
    }

    // World secrets
    if (context.level === 'world' && context.worldId) {
      const world = await this.runtime.getWorld(context.worldId as UUID);
      if (!world) return false;

      const requesterRole = world.metadata?.roles?.[context.requesterId || ''] || 'NONE';

      if (action === 'read') return true;
      return requesterRole === 'OWNER' || requesterRole === 'ADMIN';
    }

    // User secrets
    if (context.level === 'user' && context.userId) {
      return context.requesterId === context.userId;
    }

    return false;
  }

  async grantAccess(
    key: string,
    context: SecretContext,
    grantee: string,
    permissions: string[]
  ): Promise<boolean> {
    if (!(await this.checkPermission(key, 'share', context))) {
      return false;
    }

    // Implementation would update permissions metadata
    return true;
  }

  async revokeAccess(key: string, context: SecretContext, grantee: string): Promise<boolean> {
    if (!(await this.checkPermission(key, 'share', context))) {
      return false;
    }

    // Implementation would update permissions metadata
    return true;
  }
}

/**
 * Handles audit logging
 */
class AuditManager {
  private accessLogs: SecretAccessLog[] = [];
  private readonly MAX_LOGS = 10000;
  private persistenceInterval: NodeJS.Timeout | null = null;

  constructor(private runtime: IAgentRuntime) {
    this.startPersistence();
  }

  async logAccess(
    key: string,
    action: 'read' | 'write' | 'delete' | 'share',
    context: SecretContext,
    success: boolean,
    error?: string
  ): Promise<void> {
    const log: SecretAccessLog = {
      secretKey: key,
      entityId: context.requesterId || context.userId || this.runtime.agentId,
      action,
      timestamp: Date.now(),
      context,
      success,
      error,
    };

    this.accessLogs.push(log);

    if (this.accessLogs.length > this.MAX_LOGS) {
      await this.archiveLogs();
    }
  }

  async getAccessLogs(key: string, context?: SecretContext): Promise<SecretAccessLog[]> {
    return this.accessLogs.filter((log) => {
      if (log.secretKey !== key) return false;
      if (context && log.context) {
        if (context.level && log.context.level !== context.level) return false;
        if (context.worldId && log.context.worldId !== context.worldId) return false;
        if (context.userId && log.context.userId !== context.userId) return false;
      }
      return true;
    });
  }

  private startPersistence(): void {
    this.persistenceInterval = setInterval(async () => {
      await this.persistLogs();
    }, 5 * 60 * 1000);
  }

  private async persistLogs(): Promise<void> {
    if (this.accessLogs.length === 0) return;

    const recentLogs = this.accessLogs.slice(-1000);
    
    await this.runtime.createMemory({
      entityId: this.runtime.agentId,
      agentId: this.runtime.agentId,
      roomId: this.runtime.agentId,
      content: {
        text: `Audit logs batch: ${recentLogs.length} entries`,
        metadata: {
          type: 'audit_logs',
          logs: recentLogs,
          timestamp: Date.now(),
        },
      },
    }, 'audit');
  }

  private async archiveLogs(): Promise<void> {
    const toArchive = this.accessLogs.slice(0, Math.floor(this.MAX_LOGS * 0.2));
    this.accessLogs = this.accessLogs.slice(Math.floor(this.MAX_LOGS * 0.2));
    
    // Archive implementation
  }

  async stop(): Promise<void> {
    if (this.persistenceInterval) {
      clearInterval(this.persistenceInterval);
      this.persistenceInterval = null;
    }
    await this.persistLogs();
  }
}

/**
 * Handles secret versioning
 */
class VersioningManager {
  private readonly MAX_VERSIONS_PER_SECRET = 10;

  constructor(
    private runtime: IAgentRuntime,
    private encryption: EncryptionManager
  ) {}

  async createVersion(key: string, value: any, context: SecretContext): Promise<string> {
    const versionId = createUniqueUuid(this.runtime, `${key}-${Date.now()}`);
    const encryptedValue = await this.encryption.encrypt(String(value));
    
    await this.runtime.createMemory({
      id: versionId,
      entityId: this.runtime.agentId,
      agentId: this.runtime.agentId,
      roomId: this.runtime.agentId,
      content: {
        text: `Secret version: ${key}`,
        metadata: {
          type: 'secret_version',
          version: {
            id: versionId,
            key,
            value: encryptedValue,
            context,
            createdAt: Date.now(),
            size: String(value).length,
          },
        },
      },
    }, 'versions');

    await this.cleanupOldVersions(key, context);
    
    return versionId;
  }

  async listVersions(
    key: string,
    context: SecretContext
  ): Promise<Array<{ id: string; createdAt: number; size: number }>> {
    // Implementation would fetch from memories
    return [];
  }

  async rollback(key: string, versionId: string, context: SecretContext): Promise<boolean> {
    // Implementation would restore from version
    return false;
  }

  private async cleanupOldVersions(key: string, context: SecretContext): Promise<void> {
    // Implementation would remove old versions
  }
}

/**
 * Handles secret rotation
 */
class RotationManager {
  private schedules: Map<string, any> = new Map();
  private rotationTimer: NodeJS.Timeout | null = null;

  constructor(
    private runtime: IAgentRuntime,
    private storage: StorageManager,
    private audit: AuditManager
  ) {
    this.startRotationTimer();
  }

  async scheduleRotation(
    key: string,
    context: SecretContext,
    intervalMs: number
  ): Promise<void> {
    const scheduleKey = this.getScheduleKey(key, context);
    
    this.schedules.set(scheduleKey, {
      key,
      context,
      intervalMs,
      nextRotation: Date.now() + intervalMs,
    });
    
    await this.persistSchedule(scheduleKey);
  }

  async rotateSecret(key: string, context: SecretContext): Promise<boolean> {
    // Generate new value and update
    const newValue = this.generateSecureToken(32);
    
    const success = await this.storage.set(key, newValue, context);
    
    if (success) {
      await this.audit.logAccess(key, 'write', context, true, 'Secret rotated');
    }
    
    return success;
  }

  async loadPersistedSchedules(): Promise<void> {
    // Load from memories
  }

  private startRotationTimer(): void {
    this.rotationTimer = setInterval(async () => {
      await this.processRotations();
    }, 60 * 1000);
  }

  private async processRotations(): Promise<void> {
    const now = Date.now();
    
    for (const [key, schedule] of this.schedules) {
      if (schedule.nextRotation <= now) {
        await this.rotateSecret(schedule.key, schedule.context);
        schedule.nextRotation = now + schedule.intervalMs;
      }
    }
  }

  private getScheduleKey(key: string, context: SecretContext): string {
    return `${context.level}:${context.worldId || ''}:${context.userId || ''}:${key}`;
  }

  private async persistSchedule(scheduleKey: string): Promise<void> {
    // Persist to memory
  }

  private generateSecureToken(length: number): string {
    return secureCrypto.generateToken(length);
  }

  async stop(): Promise<void> {
    if (this.rotationTimer) {
      clearInterval(this.rotationTimer);
      this.rotationTimer = null;
    }
  }
}

/**
 * Handles secret backup and restore
 */
class BackupManager {
  constructor(
    private runtime: IAgentRuntime,
    private storage: StorageManager,
    private encryption: EncryptionManager
  ) {}

  async backup(context: SecretContext): Promise<{ backupId: string; secretCount: number }> {
    const backupId = createUniqueUuid(this.runtime, `backup-${Date.now()}`);
    const secrets = await this.storage.list(context);
    
    // Implementation would create backup
    
    return { backupId, secretCount: Object.keys(secrets).length };
  }

  async restore(
    backupId: string,
    context: SecretContext,
    overwrite: boolean = false
  ): Promise<{ restoredCount: number }> {
    // Implementation would restore from backup
    return { restoredCount: 0 };
  }
} 