import {
  type Action,
  type IAgentRuntime,
  type Memory,
  type State,
  type HandlerCallback,
  elizaLogger,
} from '@elizaos/core';

/**
 * Trust levels required for different AgentKit operations
 * Enhanced for multi-agent coordination scenarios
 */
export const AGENTKIT_TRUST_REQUIREMENTS = {
  // Financial operations requiring high trust
  TRANSFER: { minTrustScore: 0.8, requiredRole: 'FINANCE_ROLE', requiresCoordination: true },
  CDP_TRADE: { minTrustScore: 0.7, requiredRole: 'FINANCE_ROLE', requiresCoordination: true },
  CDP_COMPOUND_SUPPLY: { minTrustScore: 0.6, requiredRole: 'FINANCE_ROLE', requiresCoordination: false },
  CDP_COMPOUND_BORROW: { minTrustScore: 0.7, requiredRole: 'FINANCE_ROLE', requiresCoordination: true },
  CDP_WRAP_ETH: { minTrustScore: 0.5, requiredRole: 'FINANCE_ROLE', requiresCoordination: false },
  CDP_ACROSS_BRIDGE: { minTrustScore: 0.8, requiredRole: 'FINANCE_ROLE', requiresCoordination: true },
  
  // Social operations requiring medium trust
  POST_TWEET: { minTrustScore: 0.4, requiredRole: 'USER_ROLE', requiresCoordination: false },
  POST_CAST: { minTrustScore: 0.4, requiredRole: 'USER_ROLE', requiresCoordination: false },
  
  // Data operations requiring low trust
  GET_BALANCE: { minTrustScore: 0.2, requiredRole: 'USER_ROLE', requiresCoordination: false },
  PYTH_FETCH_PRICE: { minTrustScore: 0.2, requiredRole: 'USER_ROLE', requiresCoordination: false },
  
  // NFT operations requiring medium trust
  CDP_MINT_NFT: { minTrustScore: 0.5, requiredRole: 'USER_ROLE', requiresCoordination: false },
  
  // Custodial wallet operations requiring highest trust
  CREATE_CUSTODIAL_WALLET: { minTrustScore: 0.9, requiredRole: 'ADMIN_ROLE', requiresCoordination: true },
  EXPORT_CUSTODIAL_WALLET: { minTrustScore: 0.95, requiredRole: 'ADMIN_ROLE', requiresCoordination: true },
  LIST_CUSTODIAL_ADDRESSES: { minTrustScore: 0.7, requiredRole: 'FINANCE_ROLE', requiresCoordination: false },
  
  // Multi-agent coordination actions
  COORDINATE_AGENT_ACTION: { minTrustScore: 0.8, requiredRole: 'ADMIN_ROLE', requiresCoordination: true },
  CROSS_AGENT_COMMUNICATION: { minTrustScore: 0.6, requiredRole: 'USER_ROLE', requiresCoordination: false },
} as const;

/**
 * Enhanced trust validation for AgentKit multi-agent coordination
 */
export async function validateAgentKitTrust(
  runtime: IAgentRuntime,
  message: Memory,
  actionName: string,
  requirements: { 
    minTrustScore: number; 
    requiredRole: string; 
    requiresCoordination: boolean;
  },
  coordinationContext?: {
    otherAgents?: string[];
    coordinationType?: 'sequential' | 'parallel' | 'consensus';
    riskLevel?: 'low' | 'medium' | 'high';
  }
): Promise<{ allowed: boolean; reason?: string; trustScore?: number }> {
  try {
    // Get trust service
    const trustService = runtime.getService('trust-engine');
    if (!trustService) {
      elizaLogger.warn('Trust service not available - denying action for security');
      return { allowed: false, reason: 'Trust service unavailable - access denied for security' };
    }

    // Get role service
    const roleService = runtime.getService('role-manager');
    if (!roleService) {
      elizaLogger.warn('Role service not available - denying action for security');
      return { allowed: false, reason: 'Role service unavailable - access denied for security' };
    }

    const entityId = message.entityId;
    if (!entityId) {
      return { allowed: false, reason: 'No entity ID available for trust validation' };
    }

    // Check trust score using trust service interface
    let trustScore = 0; // Default to no trust (deny by default)
    try {
        // The trust service from plugin-trust doesn't have these methods on the base Service type
        // We need to handle this more gracefully
        const trustServiceAny = trustService as any;
        if (trustServiceAny.evaluate && typeof trustServiceAny.evaluate === 'function') {
            const trustResult = await trustServiceAny.evaluate(runtime, { entityId, roomId: "" } as any, {} as any);
        if (trustResult && typeof trustResult.score === 'number') {
            trustScore = trustResult.score;
            }
        } else {
            elizaLogger.warn(`[AgentKitTrustValidator] Trust service does not have evaluate method`);
        }
    } catch (error) {
        elizaLogger.warn(`[AgentKitTrustValidator] Trust score evaluation failed: ${error instanceof Error ? error.message : String(error)}`);
        // Use default score and continue (which will deny access)
    }

    if (trustScore < requirements.minTrustScore) {
      elizaLogger.warn(
        `AgentKit action ${actionName} rejected: insufficient trust score ${trustScore} < ${requirements.minTrustScore}`
      );
      return {
        allowed: false,
        reason: `Insufficient trust score (${trustScore.toFixed(2)} < ${requirements.minTrustScore})`,
        trustScore,
      };
    }

    // Check role authorization using trust/role service interface
    let hasRole = false;
    try {
        // Try to get role information from trust service
        const roleResult = await runtime.composeState({ entityId } as any);
        hasRole = roleResult?.values?.userRole === requirements.requiredRole;
    } catch (error) {
        elizaLogger.warn(`[AgentKitTrustValidator] Role check failed: ${error instanceof Error ? error.message : String(error)}`);
        // Default to denying access
        hasRole = false;
    }

    if (!hasRole) {
      elizaLogger.warn(
        `AgentKit action ${actionName} rejected: insufficient role permissions for ${requirements.requiredRole}`
      );
      return {
        allowed: false,
        reason: `Insufficient role permissions (requires ${requirements.requiredRole})`,
        trustScore,
      };
    }

    // Enhanced validation for coordination-required actions
    if (requirements.requiresCoordination && coordinationContext) {
      const coordinationCheck = await validateMultiAgentCoordination(
        runtime,
        message,
        actionName,
        coordinationContext,
        trustScore
      );

      if (!coordinationCheck.allowed) {
        return {
          allowed: false,
          reason: coordinationCheck.reason,
          trustScore,
        };
      }
    }

    // Additional security checks for high-risk operations
    if (requirements.requiredRole === 'ADMIN_ROLE' || requirements.requiredRole === 'FINANCE_ROLE') {
      const securityModule = runtime.getService('security-module');
      if (securityModule) {
        const securityModuleAny = securityModule as any;
        if (securityModuleAny.validateFinancialOperation && typeof securityModuleAny.validateFinancialOperation === 'function') {
            const securityCheck = await securityModuleAny.validateFinancialOperation({
          entityId,
          action: actionName,
          context: message.content,
          requiredPermissions: [requirements.requiredRole],
          coordinationContext,
        });

        if (!securityCheck.allowed) {
          elizaLogger.warn(`AgentKit financial action ${actionName} blocked by security module`);
          return {
            allowed: false,
            reason: securityCheck.reason || 'Security validation failed',
            trustScore,
          };
            }
        }
      }
    }

    elizaLogger.info(
      `AgentKit action ${actionName} authorized: trust=${trustScore.toFixed(2)}, role=${requirements.requiredRole}`,
      requirements.requiresCoordination && `coordination=${coordinationContext?.coordinationType}`
    );

    return { allowed: true, trustScore };
  } catch (error) {
    elizaLogger.error("[AgentKitTrustValidator] Trust validation error:", error);
    return { allowed: false, reason: `Trust validation error: ${error instanceof Error ? error.message : String(error)}` };
  }
}

/**
 * Validate multi-agent coordination requirements
 */
async function validateMultiAgentCoordination(
  runtime: IAgentRuntime,
  message: Memory,
  actionName: string,
  coordinationContext: {
    otherAgents?: string[];
    coordinationType?: 'sequential' | 'parallel' | 'consensus';
    riskLevel?: 'low' | 'medium' | 'high';
  },
  initiatorTrustScore: number
): Promise<{ allowed: boolean; reason?: string }> {
  try {
    const trustService = runtime.getService('trust-engine');
    if (!trustService) {
      return { allowed: true, reason: 'Trust service not available for coordination validation' };
    }

    // Validate other agents' trust scores
    if (coordinationContext.otherAgents) {
      for (const agentId of coordinationContext.otherAgents) {
        // Get trust score for coordinating agent
        let agentTrustScore = 50; // Default score
        try {
            const trustServiceAny = trustService as any;
            if (trustServiceAny.evaluate && typeof trustServiceAny.evaluate === 'function') {
                const agentTrustResult = await trustServiceAny.evaluate(runtime, { entityId: agentId, roomId: "" } as any, {} as any);
            if (agentTrustResult && typeof agentTrustResult.score === 'number') {
                agentTrustScore = agentTrustResult.score;
                }
            }
        } catch (error) {
            elizaLogger.warn(`[AgentKitTrustValidator] Failed to get trust score for agent ${agentId}: ${error instanceof Error ? error.message : String(error)}`);
        }
        
        // Other agents must have at least 80% of initiator's trust score
        const requiredAgentTrust = initiatorTrustScore * 0.8;
        
        if (agentTrustScore < requiredAgentTrust) {
          return {
            allowed: false,
            reason: `Coordinating agent ${agentId} has insufficient trust score (${agentTrustScore.toFixed(2)} < ${requiredAgentTrust.toFixed(2)})`,
          };
        }
      }
    }

    // Additional validation based on coordination type
    switch (coordinationContext.coordinationType) {
      case 'consensus':
        // Consensus operations require higher trust from all participants
        if (initiatorTrustScore < 0.8) {
          return {
            allowed: false,
            reason: 'Consensus coordination requires trust score ≥ 0.8',
          };
        }
        break;
        
      case 'parallel':
        // Parallel operations with high risk require additional validation
        if (coordinationContext.riskLevel === 'high' && initiatorTrustScore < 0.9) {
          return {
            allowed: false,
            reason: 'High-risk parallel coordination requires trust score ≥ 0.9',
          };
        }
        break;
        
      case 'sequential':
        // Sequential operations are generally safer but still need validation
        if (coordinationContext.riskLevel === 'high' && initiatorTrustScore < 0.85) {
          return {
            allowed: false,
            reason: 'High-risk sequential coordination requires trust score ≥ 0.85',
          };
        }
        break;
    }

    return { allowed: true };
  } catch (error) {
    elizaLogger.error("[AgentKitTrustValidator] Coordination validation error:", error);
    return { allowed: false, reason: `Coordination validation error: ${error instanceof Error ? error.message : String(error)}` };
  }
}

/**
 * Record AgentKit action execution for trust tracking
 */
export async function recordAgentKitAction(
  runtime: IAgentRuntime,
  message: Memory,
  actionName: string,
  success: boolean,
  details?: any
): Promise<void> {
  try {
    const trustService = runtime.getService('trust-engine');
    if (!trustService) return;

    const entityId = message.entityId;
    if (!entityId) return;

    // Calculate trust impact based on action type and outcome
    let trustChange = 0;
    if (success) {
      // Positive trust for successful actions
      if (AGENTKIT_TRUST_REQUIREMENTS[actionName]?.requiredRole === 'ADMIN_ROLE') {
        trustChange = 0.04; // Good boost for admin actions
      } else if (AGENTKIT_TRUST_REQUIREMENTS[actionName]?.requiredRole === 'FINANCE_ROLE') {
        trustChange = 0.03; // Medium boost for finance actions
      } else {
        trustChange = 0.01; // Small boost for other actions
      }

      // Additional boost for successful coordination
      if (AGENTKIT_TRUST_REQUIREMENTS[actionName]?.requiresCoordination) {
        trustChange += 0.02;
      }
    } else {
      // Negative trust for failed critical actions
      if (AGENTKIT_TRUST_REQUIREMENTS[actionName]?.requiredRole === 'ADMIN_ROLE') {
        trustChange = -0.08; // Significant penalty for failed admin actions
      } else if (AGENTKIT_TRUST_REQUIREMENTS[actionName]?.requiredRole === 'FINANCE_ROLE') {
        trustChange = -0.05; // Medium penalty for failed finance actions
      } else {
        trustChange = -0.02; // Small penalty for other failures
      }

      // Additional penalty for failed coordination
      if (AGENTKIT_TRUST_REQUIREMENTS[actionName]?.requiresCoordination) {
        trustChange -= 0.03;
      }
    }

    await (trustService as any).updateTrust({
      entityId,
      change: trustChange,
      reason: `AgentKit action: ${actionName} (${success ? 'success' : 'failure'})`,
      source: 'agentkit-plugin',
      evidence: {
        action: actionName,
        success,
        details,
        timestamp: new Date().toISOString(),
      },
    });

    elizaLogger.debug(
      `Recorded trust change ${trustChange} for AgentKit action ${actionName} (${success ? 'success' : 'failure'})`
    );
  } catch (error) {
    elizaLogger.error('Failed to record AgentKit action trust impact:', error);
  }
}

/**
 * Extract coordination context from message
 */
export function extractCoordinationContext(message: Memory, state?: State): {
  otherAgents?: string[];
  coordinationType?: 'sequential' | 'parallel' | 'consensus';
  riskLevel?: 'low' | 'medium' | 'high';
} | undefined {
  try {
    const messageText = message.content.text?.toLowerCase() || '';
    
    // Extract coordination type
    let coordinationType: 'sequential' | 'parallel' | 'consensus' | undefined;
    if (messageText.includes('consensus') || messageText.includes('agree')) {
      coordinationType = 'consensus';
    } else if (messageText.includes('parallel') || messageText.includes('together')) {
      coordinationType = 'parallel';
    } else if (messageText.includes('sequence') || messageText.includes('then')) {
      coordinationType = 'sequential';
    }

    // Extract risk level
    let riskLevel: 'low' | 'medium' | 'high' | undefined;
    if (messageText.includes('high risk') || messageText.includes('dangerous')) {
      riskLevel = 'high';
    } else if (messageText.includes('medium risk') || messageText.includes('careful')) {
      riskLevel = 'medium';
    } else if (messageText.includes('low risk') || messageText.includes('safe')) {
      riskLevel = 'low';
    }

    // Extract other agents (simplified - would need more sophisticated parsing)
    const agentMentions = messageText.match(/@(\w+)/g);
    const otherAgents = agentMentions?.map(mention => mention.slice(1));

    return {
      otherAgents,
      coordinationType,
      riskLevel,
    };
  } catch (error) {
    elizaLogger.error('Error extracting coordination context:', error);
    return undefined;
  }
}

/**
 * Wrap an AgentKit action with trust validation
 */
export function wrapAgentKitActionWithTrust(
  action: Action,
  trustRequirements: { 
    minTrustScore: number; 
    requiredRole: string; 
    requiresCoordination: boolean;
  }
): Action {
  const originalHandler = action.handler;
  const originalValidate = action.validate;

  return {
    ...action,
    validate: async (runtime: IAgentRuntime, message: Memory, state?: State) => {
      // First run original validation
      if (originalValidate) {
        const originalValid = await originalValidate(runtime, message, state);
        if (!originalValid) return false;
      }

      // Extract coordination context if needed
      const coordinationContext = trustRequirements.requiresCoordination 
        ? extractCoordinationContext(message, state)
        : undefined;

      // Then check trust requirements
      const trustCheck = await validateAgentKitTrust(
        runtime,
        message,
        action.name,
        trustRequirements,
        coordinationContext
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
      // Extract coordination context if needed
      const coordinationContext = trustRequirements.requiresCoordination 
        ? extractCoordinationContext(message, state)
        : undefined;

      // Validate trust before execution
      const trustCheck = await validateAgentKitTrust(
        runtime,
        message,
        action.name,
        trustRequirements,
        coordinationContext
      );

      if (!trustCheck.allowed) {
        const errorMessage = `Access denied for AgentKit action '${action.name}': ${trustCheck.reason}`;
        elizaLogger.warn(errorMessage);
        
        if (callback) {
          callback({
            text: errorMessage,
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
        await recordAgentKitAction(runtime, message, action.name, true, { result, coordinationContext });
        
        return result;
      } catch (error) {
        // Record failed execution
        await recordAgentKitAction(runtime, message, action.name, false, { 
            error: error instanceof Error ? error.message : String(error), 
            coordinationContext 
        });
        throw error;
      }
    },
  };
}

/**
 * Apply trust-based access control to AgentKit actions
 */
export function wrapAgentKitActionsWithTrust(actions: Action[]): Action[] {
  return actions.map((action) => {
    // Determine trust requirements based on action name
    let requirements: { minTrustScore: number; requiredRole: string; requiresCoordination: boolean } = AGENTKIT_TRUST_REQUIREMENTS.GET_BALANCE; // Default to lowest requirement
    
    for (const [actionType, reqs] of Object.entries(AGENTKIT_TRUST_REQUIREMENTS)) {
      if (action.name.toUpperCase().includes(actionType) || 
          action.similes?.some(simile => simile.toUpperCase().includes(actionType))) {
        requirements = reqs;
        break;
      }
    }

    elizaLogger.info(
      `Wrapping AgentKit action '${action.name}' with trust requirements: ${requirements.requiredRole}, min trust: ${requirements.minTrustScore}, coordination: ${requirements.requiresCoordination}`
    );

    return wrapAgentKitActionWithTrust(action, requirements);
  });
}

/**
 * Enhanced validation for custodial wallet operations
 */
export async function validateCustodialWalletSecurity(
  runtime: IAgentRuntime,
  message: Memory,
  operationType: 'create' | 'export' | 'list'
): Promise<{ allowed: boolean; reason?: string }> {
  try {
    const securityModule = runtime.getService('security-module');
    if (!securityModule) {
      elizaLogger.warn('Security module not available for custodial wallet validation');
      return { allowed: true };
    }

    const securityModuleAny = securityModule as any;
    if (securityModuleAny.validateWalletOperation && typeof securityModuleAny.validateWalletOperation === 'function') {
        const walletSecurityCheck = await securityModuleAny.validateWalletOperation({
      entityId: message.entityId,
      operationType,
      context: message.content,
    });

    if (!walletSecurityCheck.allowed) {
      return {
        allowed: false,
        reason: `Custodial wallet ${operationType} blocked: ${walletSecurityCheck.reason}`,
      };
        }
    }

    return { allowed: true };
  } catch (error) {
    elizaLogger.error("[AgentKitTrustValidator] Wallet security validation error:", error);
    return { allowed: false, reason: `Wallet security validation error: ${error instanceof Error ? error.message : String(error)}` };
  }
}