/**
 * Platform Agent Integration Service
 * Integrates authentication extensions with the platform's agent runtime system
 */

import type { IAgentRuntime } from '@elizaos/core';
import { platformAuthPlugin } from './eliza-auth-extensions';

export interface AgentAuthContext {
  userId: string;
  userEmail: string;
  userRole: string;
  organizationId: string;
  organizationName?: string;
  billingPlan?: string;
  agentLimit?: string;
}

export interface AuthenticatedRuntimeConfig {
  character: any;
  adapter: any;
  plugins?: any[];
  settings?: Record<string, any>;
  authContext: AgentAuthContext;
}

/**
 * Service for integrating authentication with ElizaOS agent runtime
 */
export class PlatformAgentIntegrationService {
  /**
   * Create an authenticated agent runtime with authentication context
   */
  static async createAuthenticatedRuntime(
    config: AuthenticatedRuntimeConfig
  ): Promise<IAgentRuntime> {
    const { AgentRuntime } = await import('@elizaos/core');

    // Prepare authentication settings for the runtime
    const authSettings: Record<string, string | undefined> = {
      userId: config.authContext.userId,
      userEmail: config.authContext.userEmail,
      userRole: config.authContext.userRole,
      organizationId: config.authContext.organizationId,
      organizationName: config.authContext.organizationName,
      billingPlan: config.authContext.billingPlan,
      agentLimit: config.authContext.agentLimit,
    };

    // Merge with existing settings
    const runtimeSettings = {
      ...config.settings,
      ...authSettings,
    };

    // Add authentication plugin to the plugins array
    const plugins = [...(config.plugins || []), platformAuthPlugin];

    // Create the runtime with authentication context
    const runtime = new AgentRuntime({
      character: config.character,
      adapter: config.adapter,
      plugins,
      settings: runtimeSettings,
    });

    return runtime;
  }

  /**
   * Validate user permissions for agent operations
   */
  static validateUserPermission(
    authContext: AgentAuthContext,
    permission: string
  ): { hasPermission: boolean; reason?: string } {
    const rolePermissions: Record<string, string[]> = {
      owner: ['*'], // Owner has all permissions
      admin: [
        'create_agents',
        'delete_agents',
        'manage_users',
        'view_billing',
        'manage_settings',
        'deploy_agents',
        'manage_plugins',
      ],
      member: ['create_agents', 'view_agents', 'edit_own_agents', 'deploy_agents'],
      viewer: ['view_agents'],
    };

    const userPermissions = rolePermissions[authContext.userRole] || [];
    const hasPermission = userPermissions.includes('*') || userPermissions.includes(permission);

    return {
      hasPermission,
      reason: hasPermission
        ? undefined
        : `Role '${authContext.userRole}' does not have permission '${permission}'`,
    };
  }

  /**
   * Extract authentication context from platform session
   */
  static extractAuthContext(sessionData: any): AgentAuthContext {
    return {
      userId: sessionData.userId,
      userEmail: sessionData.email,
      userRole: sessionData.role,
      organizationId: sessionData.organizationId,
      organizationName: sessionData.organizationName,
      billingPlan: sessionData.billingPlan,
      agentLimit: sessionData.agentLimit,
    };
  }

  /**
   * Check if user has sufficient permissions and agent quota
   */
  static async validateAgentCreation(
    authContext: AgentAuthContext,
    currentAgentCount: number
  ): Promise<{ canCreate: boolean; reason?: string }> {
    // Check permission
    const permissionCheck = this.validateUserPermission(authContext, 'create_agents');
    if (!permissionCheck.hasPermission) {
      return { canCreate: false, reason: permissionCheck.reason };
    }

    // Check agent limit
    const agentLimit = authContext.agentLimit ? parseInt(authContext.agentLimit, 10) : undefined;
    if (agentLimit !== undefined && !isNaN(agentLimit) && currentAgentCount >= agentLimit) {
      return {
        canCreate: false,
        reason: `Agent limit reached (${currentAgentCount}/${agentLimit}). Please upgrade your plan or delete existing agents.`,
      };
    }

    return { canCreate: true };
  }

  /**
   * Create a secure agent configuration with authentication context
   */
  static createSecureAgentConfig(
    baseConfig: any,
    authContext: AgentAuthContext
  ): AuthenticatedRuntimeConfig {
    return {
      character: baseConfig.character,
      adapter: baseConfig.adapter,
      plugins: baseConfig.plugins || [],
      settings: {
        ...baseConfig.settings,
        // Ensure security settings
        enableSecurityEvaluators: true,
        requireAuthentication: true,
        logSecurityEvents: true,
      },
      authContext,
    };
  }

  /**
   * Middleware to inject authentication context into agent messages
   */
  static createAuthenticationMiddleware(authContext: AgentAuthContext) {
    return {
      name: 'authentication-middleware',
      async processMessage(_runtime: IAgentRuntime, message: any) {
        // Inject authentication context into message metadata
        if (!message.metadata) {
          message.metadata = {};
        }

        message.metadata.authContext = {
          userId: authContext.userId,
          userRole: authContext.userRole,
          organizationId: authContext.organizationId,
          timestamp: Date.now(),
        };

        return message;
      },
    };
  }

  /**
   * Create a database adapter with organization context
   */
  static async createAuthenticatedAdapter(adapterConfig: any, authContext: AgentAuthContext) {
    // This would integrate with the platform's database adapter
    // that already has organization scoping
    const adapter = adapterConfig.adapter;

    // Ensure the adapter has organization context
    if (adapter && typeof adapter.setOrganizationContext === 'function') {
      adapter.setOrganizationContext({
        organizationId: authContext.organizationId,
        userId: authContext.userId,
      });
    }

    return adapter;
  }

  /**
   * Security audit logger for agent actions
   */
  static async logSecurityEvent(event: {
    action: string;
    agentId: string;
    authContext: AgentAuthContext;
    details?: any;
    severity: 'low' | 'medium' | 'high';
  }) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      event: event.action,
      agentId: event.agentId,
      userId: event.authContext.userId,
      organizationId: event.authContext.organizationId,
      userRole: event.authContext.userRole,
      severity: event.severity,
      details: event.details,
    };

    // In a real implementation, this would write to a security audit log
    console.log('[SECURITY AUDIT]', JSON.stringify(logEntry));

    // Could integrate with platform's logging system
    // await auditLogger.log(logEntry);
  }
}

export default PlatformAgentIntegrationService;
