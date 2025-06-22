import type { IAgentRuntime, UUID } from '@elizaos/core';
import type { SecretContext, SecretConfig, SecretMetadata, SecretAccessLog } from '../types';

/**
 * Interface for encryption operations
 */
export interface IEncryptionService {
  encrypt(plaintext: string): Promise<string>;
  decrypt(ciphertext: string): Promise<string>;
  generateToken(length?: number): string;
  isEncrypted(data: any): boolean;
}

/**
 * Interface for secret storage operations
 */
export interface ISecretStorage {
  get(key: string, context: SecretContext): Promise<string | null>;
  set(key: string, value: any, context: SecretContext, config?: Partial<SecretConfig>): Promise<boolean>;
  list(context: SecretContext): Promise<SecretMetadata>;
  delete(key: string, context: SecretContext): Promise<boolean>;
  exists(key: string, context: SecretContext): Promise<boolean>;
}

/**
 * Interface for access control operations
 */
export interface IAccessControl {
  checkPermission(key: string, action: 'read' | 'write' | 'delete' | 'share', context: SecretContext): Promise<boolean>;
  grantAccess(key: string, context: SecretContext, grantee: string, permissions: string[]): Promise<boolean>;
  revokeAccess(key: string, context: SecretContext, grantee: string): Promise<boolean>;
  getAccessLogs(key: string, context?: SecretContext): Promise<SecretAccessLog[]>;
}

/**
 * Interface for audit logging
 */
export interface IAuditLogger {
  logAccess(
    key: string,
    action: 'read' | 'write' | 'delete' | 'share',
    context: SecretContext,
    success: boolean,
    error?: string
  ): Promise<void>;
  getAccessLogs(key: string, context?: SecretContext): Promise<SecretAccessLog[]>;
  archiveLogs(beforeDate: number): Promise<void>;
}

/**
 * Interface for secret validation
 */
export interface ISecretValidator {
  validate(key: string, value: any, type: string, method?: string): Promise<{
    isValid: boolean;
    error?: string;
  }>;
  sanitize(value: any, type: string): any;
}

/**
 * Interface for secret rotation
 */
export interface ISecretRotation {
  scheduleRotation(key: string, context: SecretContext, intervalMs: number): Promise<void>;
  rotateSecret(key: string, context: SecretContext): Promise<boolean>;
  cancelRotation(key: string, context: SecretContext): Promise<void>;
  getRotationSchedule(key: string, context: SecretContext): Promise<{ nextRotation: number; interval: number } | null>;
}

/**
 * Interface for secret versioning
 */
export interface ISecretVersioning {
  createVersion(key: string, value: any, context: SecretContext): Promise<string>;
  getVersion(key: string, versionId: string, context: SecretContext): Promise<string | null>;
  listVersions(key: string, context: SecretContext): Promise<Array<{ id: string; createdAt: number; size: number }>>;
  deleteVersion(key: string, versionId: string, context: SecretContext): Promise<boolean>;
  rollback(key: string, versionId: string, context: SecretContext): Promise<boolean>;
}

/**
 * Interface for backup and recovery
 */
export interface ISecretBackup {
  backup(context: SecretContext): Promise<{ backupId: string; secretCount: number }>;
  restore(backupId: string, context: SecretContext, overwrite?: boolean): Promise<{ restoredCount: number }>;
  listBackups(context: SecretContext): Promise<Array<{ id: string; createdAt: number; secretCount: number }>>;
  deleteBackup(backupId: string): Promise<boolean>;
}

/**
 * Main secret manager interface
 */
export interface ISecretManager {
  // Core operations
  get(key: string, context: SecretContext): Promise<string | null>;
  set(key: string, value: any, context: SecretContext, config?: Partial<SecretConfig>): Promise<boolean>;
  list(context: SecretContext): Promise<SecretMetadata>;
  delete(key: string, context: SecretContext): Promise<boolean>;

  // Access control
  grantAccess(key: string, context: SecretContext, grantee: string, permissions: string[]): Promise<boolean>;
  revokeAccess(key: string, context: SecretContext, grantee: string): Promise<boolean>;
  checkAccess(key: string, context: SecretContext, accessCheck: {
    actionId?: string;
    entityId?: string;
    permission: string;
  }): Promise<boolean>;

  // Audit
  getAccessLogs(key: string, context?: SecretContext): Promise<SecretAccessLog[]>;

  // Advanced features
  rotateSecret?(key: string, context: SecretContext): Promise<boolean>;
  createBackup?(context: SecretContext): Promise<{ backupId: string; secretCount: number }>;
  restoreBackup?(backupId: string, context: SecretContext): Promise<{ restoredCount: number }>;
}

/**
 * Factory for creating secret manager instances
 */
export interface ISecretManagerFactory {
  create(runtime: IAgentRuntime): Promise<ISecretManager>;
  createWithServices(
    runtime: IAgentRuntime,
    encryption: IEncryptionService,
    storage: ISecretStorage,
    accessControl: IAccessControl,
    auditLogger: IAuditLogger
  ): Promise<ISecretManager>;
}