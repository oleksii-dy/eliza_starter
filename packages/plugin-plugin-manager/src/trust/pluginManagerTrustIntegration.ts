import {
  type Action,
  type IAgentRuntime,
  type Memory,
  type State,
  type HandlerCallback,
  elizaLogger,
} from '@elizaos/core';

/**
 * Trust levels required for different plugin manager operations
 * ADMIN_ROLE: Full system access for critical operations
 * DEVELOPER_ROLE: Plugin development and loading operations
 * USER_ROLE: Basic plugin interaction and status checking
 */
export const PLUGIN_MANAGER_TRUST_REQUIREMENTS = {
  // Critical system operations requiring ADMIN_ROLE
  LOAD_PLUGIN: { minTrustScore: 0.8, requiredRole: 'ADMIN_ROLE' },
  UNLOAD_PLUGIN: { minTrustScore: 0.8, requiredRole: 'ADMIN_ROLE' },
  PUBLISH_PLUGIN: { minTrustScore: 0.9, requiredRole: 'ADMIN_ROLE' },
  INSTALL_PLUGIN_FROM_REGISTRY: { minTrustScore: 0.7, requiredRole: 'ADMIN_ROLE' },
  CLONE_PLUGIN: { minTrustScore: 0.7, requiredRole: 'ADMIN_ROLE' },
  UPDATE_PLUGIN: { minTrustScore: 0.8, requiredRole: 'ADMIN_ROLE' },
  RECOVER_PLUGIN: { minTrustScore: 0.8, requiredRole: 'ADMIN_ROLE' },

  // Development operations requiring DEVELOPER_ROLE
  START_PLUGIN_CONFIGURATION: { minTrustScore: 0.6, requiredRole: 'DEVELOPER_ROLE' },
  MANAGE_PLUGIN_BRANCH: { minTrustScore: 0.6, requiredRole: 'DEVELOPER_ROLE' },
  CHECK_DEPENDENCIES: { minTrustScore: 0.5, requiredRole: 'DEVELOPER_ROLE' },

  // Read-only operations requiring USER_ROLE
  SEARCH_PLUGIN: { minTrustScore: 0.3, requiredRole: 'USER_ROLE' },
} as const;

/**
 * Enhanced trust validation for plugin manager actions
 */
export async function validatePluginManagerTrust(
  runtime: IAgentRuntime,
  message: Memory,
  actionName: string,
  requirements: { minTrustScore: number; requiredRole: string }
): Promise<{ allowed: boolean; reason?: string; trustScore?: number }> {
  try {
    // Get trust service
    const trustService = runtime.getService('trust-engine');
    if (!trustService) {
      elizaLogger.warn('Trust service not available - allowing action with warning');
      return { allowed: true, reason: 'Trust service unavailable' };
    }

    // Get role service
    const roleService = runtime.getService('role-manager');
    if (!roleService) {
      elizaLogger.warn('Role service not available - allowing action with warning');
      return { allowed: true, reason: 'Role service unavailable' };
    }

    const entityId = message.entityId;
    if (!entityId) {
      return { allowed: false, reason: 'No entity ID available for trust validation' };
    }

    // Check trust score
    const trustScore = await (trustService as any).getTrustScore(entityId);
    if (trustScore < requirements.minTrustScore) {
      elizaLogger.warn(
        `Plugin manager action ${actionName} rejected: insufficient trust score ${trustScore} < ${requirements.minTrustScore}`
      );
      return {
        allowed: false,
        reason: `Insufficient trust score (${trustScore.toFixed(2)} < ${requirements.minTrustScore})`,
        trustScore,
      };
    }

    // Check role authorization
    const hasRole = await (roleService as any).hasRole(entityId, requirements.requiredRole);
    if (!hasRole) {
      elizaLogger.warn(
        `Plugin manager action ${actionName} rejected: insufficient role permissions for ${requirements.requiredRole}`
      );
      return {
        allowed: false,
        reason: `Insufficient role permissions (requires ${requirements.requiredRole})`,
        trustScore,
      };
    }

    // Additional security checks for high-risk operations
    if (requirements.requiredRole === 'ADMIN_ROLE') {
      const securityModule = runtime.getService('security-module');
      if (securityModule) {
        const securityCheck = await (securityModule as any).validateHighRiskOperation({
          entityId,
          action: actionName,
          context: message.content,
          requiredPermissions: [requirements.requiredRole],
        });

        if (!securityCheck.allowed) {
          elizaLogger.warn(`Plugin manager admin action ${actionName} blocked by security module`);
          return {
            allowed: false,
            reason: securityCheck.reason || 'Security validation failed',
            trustScore,
          };
        }
      }

      // Special validation for plugin loading/publishing operations
      if (
        actionName.includes('LOAD') ||
        actionName.includes('PUBLISH') ||
        actionName.includes('INSTALL')
      ) {
        const pluginSecurityCheck = await validatePluginSecurityContext(
          runtime,
          message,
          actionName
        );
        if (!pluginSecurityCheck.allowed) {
          return {
            allowed: false,
            reason: pluginSecurityCheck.reason,
            trustScore,
          };
        }
      }
    }

    elizaLogger.info(
      `Plugin manager action ${actionName} authorized: trust=${trustScore.toFixed(2)}, role=${requirements.requiredRole}`
    );

    return { allowed: true, trustScore };
  } catch (_error) {
    elizaLogger.error(`Trust validation _error for plugin manager action ${actionName}:`, error);
    return {
      allowed: false,
      reason: `Trust validation error: ${_error instanceof Error ? _error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Additional security validation for plugin operations
 */
async function validatePluginSecurityContext(
  runtime: IAgentRuntime,
  message: Memory,
  actionName: string
): Promise<{ allowed: boolean; reason?: string }> {
  try {
    const securityModule = runtime.getService('security-module');
    if (!securityModule) {
      return { allowed: true, reason: 'Security module not available' };
    }

    // Extract plugin name/path from message
    const messageText = message.content.text || '';
    const pluginName = extractPluginNameFromMessage(messageText);

    if (pluginName) {
      // Check for known malicious plugin patterns
      const maliciousPatterns = [
        /malware/i,
        /backdoor/i,
        /keylogger/i,
        /trojan/i,
        /virus/i,
        /rootkit/i,
        /spyware/i,
        /exploit/i,
      ];

      if (maliciousPatterns.some((pattern) => pattern.test(pluginName))) {
        return {
          allowed: false,
          reason: `Plugin name "${pluginName}" contains suspicious patterns`,
        };
      }

      // If loading/installing, validate source
      if (actionName.includes('LOAD') || actionName.includes('INSTALL')) {
        const sourceValidation = await (securityModule as any).validatePluginSource({
          pluginName,
          actionType: actionName,
          requestContext: message.content,
        });

        if (!sourceValidation.safe) {
          return {
            allowed: false,
            reason: `Plugin source validation failed: ${sourceValidation.reason}`,
          };
        }
      }
    }

    return { allowed: true };
  } catch (_error) {
    elizaLogger.error('Plugin security context validation error:', error);
    return {
      allowed: false,
      reason: `Plugin security validation error: ${_error instanceof Error ? _error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Extract plugin name from message text
 */
function extractPluginNameFromMessage(text: string): string | null {
  // Look for plugin names in various formats
  const patterns = [
    /@elizaos\/plugin-[\w-]+/g,
    /plugin-[\w-]+/g,
    /(?:load|install|publish|clone)\s+(?:the\s+)?([a-zA-Z0-9-_]+)(?:\s+plugin)?/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[0];
    }
  }

  return null;
}

/**
 * Record plugin manager action execution for trust tracking
 */
export async function recordPluginManagerAction(
  runtime: IAgentRuntime,
  message: Memory,
  actionName: string,
  success: boolean,
  details?: any
): Promise<void> {
  try {
    const trustService = runtime.getService('trust-engine');
    if (!trustService) {return;}

    const entityId = message.entityId;
    if (!entityId) {return;}

    // Calculate trust impact based on action type and outcome
    let trustChange = 0;
    if (success) {
      // Positive trust for successful actions
      if (PLUGIN_MANAGER_TRUST_REQUIREMENTS[actionName]?.requiredRole === 'ADMIN_ROLE') {
        trustChange = 0.03; // Higher boost for admin actions
      } else if (PLUGIN_MANAGER_TRUST_REQUIREMENTS[actionName]?.requiredRole === 'DEVELOPER_ROLE') {
        trustChange = 0.02; // Medium boost for dev actions
      } else {
        trustChange = 0.01; // Small boost for user actions
      }
    } else {
      // Negative trust for failed critical actions
      if (PLUGIN_MANAGER_TRUST_REQUIREMENTS[actionName]?.requiredRole === 'ADMIN_ROLE') {
        trustChange = -0.08; // Significant penalty for failed admin actions
      } else {
        trustChange = -0.03; // Smaller penalty for other failures
      }
    }

    await (trustService as any).updateTrust({
      entityId,
      change: trustChange,
      reason: `Plugin manager action: ${actionName} (${success ? 'success' : 'failure'})`,
      source: 'plugin-manager',
      evidence: {
        action: actionName,
        success,
        details,
        timestamp: new Date().toISOString(),
      },
    });

    elizaLogger.debug(
      `Recorded trust change ${trustChange} for plugin manager action ${actionName} (${success ? 'success' : 'failure'})`
    );
  } catch (_error) {
    elizaLogger.error('Failed to record plugin manager action trust impact:', error);
  }
}

/**
 * Wrap a plugin manager action with trust validation
 */
export function wrapPluginManagerActionWithTrust(
  action: Action,
  trustRequirements: { minTrustScore: number; requiredRole: string }
): Action {
  const originalHandler = action.handler;
  const originalValidate = action.validate;

  return {
    ...action,
    validate: async (runtime: IAgentRuntime, _message: Memory, _state?: State) => {
      // First run original validation
      if (originalValidate) {
        const originalValid = await originalValidate(runtime, _message, _state);
        if (!originalValid) {return false;}
      }

      // Then check trust requirements
      const trustCheck = await validatePluginManagerTrust(
        runtime,
        _message,
        action.name,
        trustRequirements
      );

      return trustCheck.allowed;
    },
    handler: async (
      runtime: IAgentRuntime,
      message: Memory,
      state: State | undefined,
      options?: any,
      callback?: HandlerCallback
    ) => {
      // Validate trust before execution
      const trustCheck = await validatePluginManagerTrust(
        runtime,
        message,
        action.name,
        trustRequirements
      );

      if (!trustCheck.allowed) {
        const errorMessage = `Access denied for plugin manager action '${action.name}': ${trustCheck.reason}`;
        elizaLogger.warn(errorMessage);

        if (callback) {
          callback({
            text: _errorMessage,
            content: {
              error: trustCheck.reason,
              requiredTrustScore: trustRequirements.minTrustScore,
              requiredRole: trustRequirements.requiredRole,
              currentTrustScore: trustCheck.trustScore,
            },
          });
        }
        return false;
      }

      try {
        // Execute original handler
        const result = await originalHandler(runtime, message, state, options, callback);

        // Record successful execution
        await recordPluginManagerAction(runtime, message, action.name, true, { result });

        return result;
      } catch (_error) {
        // Record failed execution
        await recordPluginManagerAction(runtime, message, action.name, false, {
          error: _error instanceof Error ? _error.message : 'Unknown error',
        });
        throw error;
      }
    },
  };
}

/**
 * Apply trust-based access control to all plugin manager actions
 */
export function wrapPluginManagerActionsWithTrust(actions: Action[]): Action[] {
  return actions.map((action) => {
    // Determine trust requirements based on action name
    let requirements: { minTrustScore: number; requiredRole: string } =
      PLUGIN_MANAGER_TRUST_REQUIREMENTS.SEARCH_PLUGIN; // Default to lowest requirement

    for (const [actionType, reqs] of Object.entries(PLUGIN_MANAGER_TRUST_REQUIREMENTS)) {
      if (action.name.toUpperCase() === actionType) {
        requirements = reqs;
        break;
      }
    }

    elizaLogger.info(
      `Wrapping plugin manager action '${action.name}' with trust requirements: ${requirements.requiredRole}, min trust: ${requirements.minTrustScore}`
    );

    return wrapPluginManagerActionWithTrust(action, requirements);
  });
}

/**
 * Enhanced validation for plugin publishing security
 */
export async function validatePluginPublishingSecurity(
  runtime: IAgentRuntime,
  message: Memory,
  pluginPath: string
): Promise<{ allowed: boolean; reason?: string }> {
  try {
    const securityModule = runtime.getService('security-module');
    if (!securityModule) {
      return { allowed: true, reason: 'Security module not available' };
    }

    // Scan plugin code for security threats
    const codeSecurityCheck = await (securityModule as any).scanPluginForThreats({
      pluginPath,
      entityId: message.entityId,
    });

    if (!codeSecurityCheck.safe) {
      return {
        allowed: false,
        reason: `Plugin security scan failed: ${codeSecurityCheck.threats.join(', ')}`,
      };
    }

    // Validate package.json for suspicious dependencies
    const dependencyCheck = await (securityModule as any).validatePluginDependencies({
      pluginPath,
    });

    if (!dependencyCheck.safe) {
      return {
        allowed: false,
        reason: `Plugin dependency scan failed: ${dependencyCheck.issues.join(', ')}`,
      };
    }

    return { allowed: true };
  } catch (_error) {
    elizaLogger.error('Plugin publishing security validation error:', error);
    return {
      allowed: false,
      reason: `Security validation error: ${_error instanceof Error ? _error.message : 'Unknown error'}`,
    };
  }
}
