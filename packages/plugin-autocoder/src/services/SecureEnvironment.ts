import { Service, elizaLogger } from '@elizaos/core';
import type { IAgentRuntime, UUID } from '@elizaos/core';
import crypto from 'crypto';

interface SecretDefinition {
  key: string;
  description: string;
  required: boolean;
  category: 'api_key' | 'credential' | 'token' | 'certificate' | 'config';
  scope: 'global' | 'task' | 'agent';
  encrypted: boolean;
}

interface AgentCredentials {
  agentId: UUID;
  credentials: Record<string, string>;
  permissions: Permission[];
  trustLevel: number; // 0-100
  expiresAt?: Date;
  createdAt: Date;
  lastUsed?: Date;
}

interface Permission {
  resource: string;
  action: 'read' | 'write' | 'execute' | 'delete';
  condition?: string;
}

interface SecurityAuditLog {
  timestamp: Date;
  agentId: UUID;
  action: string;
  resource: string;
  success: boolean;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  details: any;
}

interface TrustPolicy {
  minTrustLevel: number;
  requiredPermissions: Permission[];
  allowedOperations: string[];
  restrictions: string[];
  auditRequired: boolean;
}

interface SecureTaskEnvironment {
  taskId: UUID;
  agentCredentials: Map<UUID, AgentCredentials>;
  secrets: Map<string, string>;
  sandboxConfig: SandboxConfig;
  auditLog: SecurityAuditLog[];
  trustPolicies: Map<string, TrustPolicy>;
}

interface SandboxConfig {
  allowNetworkAccess: boolean;
  allowFileSystemWrite: boolean;
  allowedDomains: string[];
  blockedPaths: string[];
  resourceLimits: {
    maxMemory: number;
    maxCpu: number;
    maxDisk: number;
    maxNetwork: number;
  };
  securityLevel: 'strict' | 'moderate' | 'permissive';
}

export class SecureEnvironment extends Service {
  static serviceName = 'secure-environment';
  static serviceType = 'security' as const;

  private encryptionKey!: Buffer;
  private secretsManager: any; // Trust/secrets service
  private trustEngine: any; // Trust engine service
  private taskEnvironments: Map<UUID, SecureTaskEnvironment> = new Map();
  private globalSecrets: Map<string, SecretDefinition> = new Map();
  private auditLogs: SecurityAuditLog[] = [];

  capabilityDescription =
    'Provides secure environment management with secrets and trust integration';

  constructor(runtime?: IAgentRuntime) {
    super(runtime);
    this.initializeEncryption();
    this.setupSecretDefinitions();
  }

  static async start(runtime: IAgentRuntime): Promise<SecureEnvironment> {
    const service = new SecureEnvironment(runtime);
    await service.initialize();
    elizaLogger.info('SecureEnvironment started successfully');
    return service;
  }

  private async initialize(): Promise<void> {
    try {
      // Get trust and secrets services
      this.secretsManager = this.runtime.getService('secrets-manager');
      this.trustEngine = this.runtime.getService('trust-engine');

      if (!this.secretsManager) {
        elizaLogger.warn('Secrets manager service not available - using local secret storage');
      }

      if (!this.trustEngine) {
        elizaLogger.warn('Trust engine service not available - using basic trust validation');
      }

      // Load global secrets
      await this.loadGlobalSecrets();

      elizaLogger.info('Secure environment initialized');
    } catch (error) {
      elizaLogger.error('Failed to initialize SecureEnvironment:', error);
      throw error;
    }
  }

  async createTaskEnvironment(
    taskId: UUID,
    config: {
      requiredSecrets: string[];
      sandboxConfig: Partial<SandboxConfig>;
      trustPolicies?: Record<string, TrustPolicy>;
    }
  ): Promise<SecureTaskEnvironment> {
    try {
      elizaLogger.info(`Creating secure environment for task: ${taskId}`);

      const sandboxConfig: SandboxConfig = {
        allowNetworkAccess: true,
        allowFileSystemWrite: true,
        allowedDomains: ['github.com', 'npmjs.com', 'registry.npmjs.org'],
        blockedPaths: ['/etc', '/var', '/root', '/home'],
        resourceLimits: {
          maxMemory: 2 * 1024 * 1024 * 1024, // 2GB
          maxCpu: 2048, // 2 CPU shares
          maxDisk: 10 * 1024 * 1024 * 1024, // 10GB
          maxNetwork: 100 * 1024 * 1024, // 100MB
        },
        securityLevel: 'moderate',
        ...config.sandboxConfig,
      };

      // Create secure environment
      const environment: SecureTaskEnvironment = {
        taskId,
        agentCredentials: new Map(),
        secrets: new Map(),
        sandboxConfig,
        auditLog: []
        trustPolicies: new Map(),
      };

      // Load required secrets
      for (const secretKey of config.requiredSecrets) {
        const secret = await this.getSecret(secretKey);
        if (secret) {
          environment.secrets.set(secretKey, secret);
        } else {
          elizaLogger.warn(`Required secret not found: ${secretKey}`);
        }
      }

      // Setup trust policies
      if (config.trustPolicies) {
        for (const [operation, policy] of Object.entries(config.trustPolicies)) {
          environment.trustPolicies.set(operation, policy);
        }
      }

      this.taskEnvironments.set(taskId, environment);

      // Audit log
      this.addAuditLog({
        timestamp: new Date(),
        agentId: this.runtime.agentId,
        action: 'create_environment',
        resource: `task:${taskId}`,
        success: true,
        riskLevel: 'low',
        details: { secretsCount: config.requiredSecrets.length },
      });

      elizaLogger.info(`Secure environment created for task: ${taskId}`);
      return environment;
    } catch (error) {
      elizaLogger.error(`Failed to create secure environment for task ${taskId}:`, error);
      throw error;
    }
  }

  async provisionAgentCredentials(
    taskId: UUID,
    agentId: UUID,
    role: string
  ): Promise<AgentCredentials> {
    const environment = this.taskEnvironments.get(taskId);
    if (!environment) {
      throw new Error(`Task environment not found: ${taskId}`);
    }

    try {
      // Get trust level from trust engine
      let trustLevel = 50; // Default moderate trust
      if (this.trustEngine) {
        trustLevel = (await this.trustEngine.getTrustLevel(agentId)) || trustLevel;
      }

      // Generate role-based permissions
      const permissions = this.generateRolePermissions(role, trustLevel);

      // Create agent credentials
      const credentials: AgentCredentials = {
        agentId,
        credentials: await this.generateAgentCredentials(agentId, role),
        permissions,
        trustLevel,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      };

      environment.agentCredentials.set(agentId, credentials);

      // Audit log
      this.addAuditLog({
        timestamp: new Date(),
        agentId,
        action: 'provision_credentials',
        resource: `task:${taskId}`,
        success: true,
        riskLevel: this.assessRiskLevel(trustLevel, permissions),
        details: { role, trustLevel, permissionsCount: permissions.length },
      });

      elizaLogger.info(`Credentials provisioned for agent ${agentId} in task ${taskId}`);
      return credentials;
    } catch (error) {
      this.addAuditLog({
        timestamp: new Date(),
        agentId,
        action: 'provision_credentials',
        resource: `task:${taskId}`,
        success: false,
        riskLevel: 'high',
        details: { error: error instanceof Error ? error.message : String(error), role },
      });

      elizaLogger.error(`Failed to provision credentials for agent ${agentId}:`, error);
      throw error;
    }
  }

  async validateAgentOperation(
    taskId: UUID,
    agentId: UUID,
    operation: string,
    resource: string
  ): Promise<boolean> {
    const environment = this.taskEnvironments.get(taskId);
    if (!environment) {
      throw new Error(`Task environment not found: ${taskId}`);
    }

    const credentials = environment.agentCredentials.get(agentId);
    if (!credentials) {
      this.addAuditLog({
        timestamp: new Date(),
        agentId,
        action: 'validate_operation',
        resource,
        success: false,
        riskLevel: 'high',
        details: { operation, reason: 'no_credentials' },
      });
      return false;
    }

    // Check if credentials are expired
    if (credentials.expiresAt && new Date() > credentials.expiresAt) {
      this.addAuditLog({
        timestamp: new Date(),
        agentId,
        action: 'validate_operation',
        resource,
        success: false,
        riskLevel: 'medium',
        details: { operation, reason: 'credentials_expired' },
      });
      return false;
    }

    // Check trust policy
    const policy = environment.trustPolicies.get(operation);
    if (policy) {
      if (credentials.trustLevel < policy.minTrustLevel) {
        this.addAuditLog({
          timestamp: new Date(),
          agentId,
          action: 'validate_operation',
          resource,
          success: false,
          riskLevel: 'high',
          details: {
            operation,
            reason: 'trust_level_insufficient',
            required: policy.minTrustLevel,
            actual: credentials.trustLevel,
          },
        });
        return false;
      }

      // Check permissions
      const hasPermission = this.checkPermissions(
        credentials.permissions,
        policy.requiredPermissions,
        resource
      );
      if (!hasPermission) {
        this.addAuditLog({
          timestamp: new Date(),
          agentId,
          action: 'validate_operation',
          resource,
          success: false,
          riskLevel: 'high',
          details: { operation, reason: 'insufficient_permissions' },
        });
        return false;
      }
    }

    // Update last used timestamp
    credentials.lastUsed = new Date();

    // Success audit log
    this.addAuditLog({
      timestamp: new Date(),
      agentId,
      action: 'validate_operation',
      resource,
      success: true,
      riskLevel: 'low',
      details: { operation },
    });

    return true;
  }

  async getAgentEnvironment(taskId: UUID, agentId: UUID): Promise<Record<string, string>> {
    const environment = this.taskEnvironments.get(taskId);
    if (!environment) {
      throw new Error(`Task environment not found: ${taskId}`);
    }

    const credentials = environment.agentCredentials.get(agentId);
    if (!credentials) {
      throw new Error(`Agent credentials not found: ${agentId}`);
    }

    // Build environment variables
    const env: Record<string, string> = {
      // Security context
      AGENT_ID: agentId,
      TASK_ID: taskId,
      TRUST_LEVEL: credentials.trustLevel.toString(),
      SECURITY_LEVEL: environment.sandboxConfig.securityLevel,

      // Credentials
      ...credentials.credentials,

      // Task secrets (filtered by permissions)
      ...this.getFilteredSecrets(environment.secrets, credentials.permissions),
    };

    return env;
  }

  async cleanupTaskEnvironment(taskId: UUID): Promise<void> {
    const environment = this.taskEnvironments.get(taskId);
    if (!environment) {
      return;
    }

    try {
      // Clear sensitive data
      environment.secrets.clear();
      for (const credentials of environment.agentCredentials.values()) {
        // Clear credential data
        Object.keys(credentials.credentials).forEach((key) => {
          credentials.credentials[key] = '[CLEARED]';
        });
      }
      environment.agentCredentials.clear();

      // Archive audit logs
      this.auditLogs.push(...environment.auditLog);

      this.taskEnvironments.delete(taskId);

      this.addAuditLog({
        timestamp: new Date(),
        agentId: this.runtime.agentId,
        action: 'cleanup_environment',
        resource: `task:${taskId}`,
        success: true,
        riskLevel: 'low',
        details: {},
      });

      elizaLogger.info(`Secure environment cleaned up for task: ${taskId}`);
    } catch (error) {
      elizaLogger.error(`Failed to cleanup environment for task ${taskId}:`, error);
      throw error;
    }
  }

  private initializeEncryption(): void {
    // Generate or load encryption key
    const keyData =
      this.runtime?.getSetting('ENCRYPTION_KEY') || crypto.randomBytes(32).toString('hex');
    this.encryptionKey = Buffer.from(keyData, 'hex');
  }

  private setupSecretDefinitions(): void {
    const definitions: SecretDefinition[] = [
      {
        key: 'GITHUB_TOKEN',
        description: 'GitHub personal access token for repository operations',
        required: true,
        category: 'api_key',
        scope: 'global',
        encrypted: true,
      },
      {
        key: 'NPM_TOKEN',
        description: 'NPM registry authentication token',
        required: false,
        category: 'api_key',
        scope: 'global',
        encrypted: true,
      },
      {
        key: 'OPENAI_API_KEY',
        description: 'OpenAI API key for AI model access',
        required: false,
        category: 'api_key',
        scope: 'global',
        encrypted: true,
      },
      {
        key: 'ANTHROPIC_API_KEY',
        description: 'Anthropic API key for Claude access',
        required: false,
        category: 'api_key',
        scope: 'global',
        encrypted: true,
      },
    ];

    for (const def of definitions) {
      this.globalSecrets.set(def.key, def);
    }
  }

  private async loadGlobalSecrets(): Promise<void> {
    for (const secretDef of this.globalSecrets.values()) {
      if (this.secretsManager) {
        try {
          const secret = await this.secretsManager.getSecret(secretDef.key);
          if (secret && secretDef.encrypted) {
            // Verify secret is properly encrypted in storage
            await this.secretsManager.validateSecret(secretDef.key);
          }
        } catch (error) {
          if (secretDef.required) {
            elizaLogger.error(`Required secret not available: ${secretDef.key}`);
            throw error;
          } else {
            elizaLogger.warn(`Optional secret not available: ${secretDef.key}`);
          }
        }
      }
    }
  }

  private async getSecret(key: string): Promise<string | null> {
    if (this.secretsManager) {
      try {
        return await this.secretsManager.getSecret(key);
      } catch (error) {
        elizaLogger.error(`Failed to get secret ${key}:`, error);
        return null;
      }
    } else {
      // Fallback to environment variables
      return this.runtime?.getSetting(key) || null;
    }
  }

  private generateRolePermissions(role: string, trustLevel: number): Permission[] {
    const basePermissions: Permission[] = [
      { resource: 'file:/workspace/*', action: 'read' },
      { resource: 'network:github.com', action: 'read' },
      { resource: 'network:npmjs.com', action: 'read' },
    ];

    const rolePermissions: Record<string, Permission[]> = {
      coder: [
        { resource: 'file:/workspace/*', action: 'write' },
        { resource: 'git:*', action: 'execute' },
        { resource: 'npm:*', action: 'execute' },
      ],
      reviewer: [
        { resource: 'analysis:*', action: 'execute' },
        { resource: 'security:*', action: 'read' },
      ],
      tester: [
        { resource: 'test:*', action: 'execute' },
        { resource: 'coverage:*', action: 'read' },
      ],
    };

    let permissions = [...basePermissions];

    if (rolePermissions[role]) {
      permissions.push(...rolePermissions[role]);
    }

    // Adjust permissions based on trust level
    if (trustLevel < 30) {
      // Low trust - remove write permissions
      permissions = permissions.filter((p) => p.action !== 'write' && p.action !== 'execute');
    } else if (trustLevel < 70) {
      // Medium trust - limited permissions
      permissions = permissions.filter(
        (p) => !p.resource.includes('sensitive') && !p.resource.includes('admin')
      );
    }

    return permissions;
  }

  private async generateAgentCredentials(
    agentId: UUID,
    role: string
  ): Promise<Record<string, string>> {
    const credentials: Record<string, string> = {
      AGENT_TOKEN: this.generateAgentToken(agentId),
      ROLE: role,
      SESSION_ID: crypto.randomUUID(),
    };

    // Add role-specific credentials
    if (role === 'coder') {
      const githubToken = await this.getSecret('GITHUB_TOKEN');
      if (githubToken) {
        credentials.GITHUB_TOKEN = githubToken;
      }
    }

    return credentials;
  }

  private generateAgentToken(agentId: UUID): string {
    const payload = {
      agentId,
      issuedAt: Date.now(),
      issuer: this.runtime.agentId,
    };

    const token = Buffer.from(JSON.stringify(payload)).toString('base64');
    const signature = crypto.createHmac('sha256', this.encryptionKey).update(token).digest('hex');

    return `${token}.${signature}`;
  }

  private checkPermissions(
    agentPermissions: Permission[]
    requiredPermissions: Permission[]
    resource: string
  ): boolean {
    for (const required of requiredPermissions) {
      const hasPermission = agentPermissions.some(
        (p) => this.matchesResource(p.resource, required.resource) && p.action === required.action
      );

      if (!hasPermission) {
        return false;
      }
    }

    return true;
  }

  private matchesResource(pattern: string, resource: string): boolean {
    // Simple pattern matching with wildcards
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    return regex.test(resource);
  }

  private getFilteredSecrets(
    secrets: Map<string, string>,
    permissions: Permission[]
  ): Record<string, string> {
    const filtered: Record<string, string> = {};

    for (const [key, value] of secrets) {
      const hasPermission = permissions.some(
        (p) =>
          p.resource.includes('secret') ||
          p.resource.includes(key.toLowerCase()) ||
          p.resource === '*'
      );

      if (hasPermission) {
        filtered[key] = value;
      }
    }

    return filtered;
  }

  private assessRiskLevel(
    trustLevel: number,
    permissions: Permission[]
  ): 'low' | 'medium' | 'high' | 'critical' {
    if (trustLevel < 30) {
      return 'high';
    }

    const hasWritePermissions = permissions.some(
      (p) => p.action === 'write' || p.action === 'execute'
    );
    const hasNetworkPermissions = permissions.some((p) => p.resource.includes('network'));

    if (hasWritePermissions && hasNetworkPermissions) {
      return trustLevel < 70 ? 'medium' : 'low';
    } else if (hasWritePermissions || hasNetworkPermissions) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  private addAuditLog(log: SecurityAuditLog): void {
    this.auditLogs.push(log);

    // Log security events
    if (log.riskLevel === 'high' || log.riskLevel === 'critical') {
      elizaLogger.warn(
        `Security event: ${log.action} by ${log.agentId} - ${log.riskLevel} risk`,
        log.details
      );
    }

    // Keep audit log size manageable
    if (this.auditLogs.length > 10000) {
      this.auditLogs = this.auditLogs.slice(-5000);
    }
  }

  async getAuditLogs(filter?: {
    agentId?: UUID;
    action?: string;
    riskLevel?: 'low' | 'medium' | 'high' | 'critical';
    since?: Date;
  }): Promise<SecurityAuditLog[]> {
    let logs = [...this.auditLogs];

    if (filter) {
      if (filter.agentId) {
        logs = logs.filter((log) => log.agentId === filter.agentId);
      }
      if (filter.action) {
        logs = logs.filter((log) => log.action === filter.action);
      }
      if (filter.riskLevel) {
        logs = logs.filter((log) => log.riskLevel === filter.riskLevel);
      }
      if (filter.since) {
        logs = logs.filter((log) => log.timestamp >= filter.since!);
      }
    }

    return logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  async stop(): Promise<void> {
    try {
      // Cleanup all task environments
      const taskIds = Array.from(this.taskEnvironments.keys());
      for (const taskId of taskIds) {
        await this.cleanupTaskEnvironment(taskId);
      }

      // Clear sensitive data
      this.encryptionKey.fill(0);
      this.globalSecrets.clear();

      elizaLogger.info('SecureEnvironment stopped');
    } catch (error) {
      elizaLogger.error('Error stopping SecureEnvironment:', error);
      throw error;
    }
  }
}
