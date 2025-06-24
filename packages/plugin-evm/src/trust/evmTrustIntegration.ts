import {
  type Action,
  type IAgentRuntime,
  type Memory,
  type State,
  type HandlerCallback,
  elizaLogger,
} from '@elizaos/core';

type EVMActionName =
  | 'EVM_TRANSFER_TOKENS'
  | 'EVM_BRIDGE_TOKENS'
  | 'EVM_SWAP_TOKENS'
  | 'GOV_PROPOSE'
  | 'GOV_VOTE'
  | 'GOV_QUEUE'
  | 'GOV_EXECUTE'
  | 'GET_BALANCE'
  | 'CHECK_ALLOWANCE';

/**
 * Trust levels required for different EVM operations
 * ADMIN_ROLE: Critical smart contract and high-value operations
 * FINANCE_ROLE: Standard financial operations with medium trust
 * USER_ROLE: Basic operations and queries
 */
export const EVM_TRUST_REQUIREMENTS = {
  // Critical financial operations requiring ADMIN_ROLE
  EVM_TRANSFER_TOKENS: { minTrustScore: 0.8, requiredRole: 'ADMIN_ROLE', maxValueUSD: null },
  EVM_BRIDGE_TOKENS: { minTrustScore: 0.9, requiredRole: 'ADMIN_ROLE', maxValueUSD: null },

  // Standard trading operations requiring FINANCE_ROLE
  EVM_SWAP_TOKENS: { minTrustScore: 0.6, requiredRole: 'FINANCE_ROLE', maxValueUSD: 10000 },

  // Governance operations requiring ADMIN_ROLE
  GOV_PROPOSE: { minTrustScore: 0.9, requiredRole: 'ADMIN_ROLE', maxValueUSD: null },
  GOV_VOTE: { minTrustScore: 0.7, requiredRole: 'FINANCE_ROLE', maxValueUSD: null },
  GOV_QUEUE: { minTrustScore: 0.9, requiredRole: 'ADMIN_ROLE', maxValueUSD: null },
  GOV_EXECUTE: { minTrustScore: 0.95, requiredRole: 'ADMIN_ROLE', maxValueUSD: null },

  // Read-only operations requiring USER_ROLE
  GET_BALANCE: { minTrustScore: 0.3, requiredRole: 'USER_ROLE', maxValueUSD: 0 },
  CHECK_ALLOWANCE: { minTrustScore: 0.3, requiredRole: 'USER_ROLE', maxValueUSD: 0 },
} as const;

/**
 * Enhanced trust validation for EVM smart contract operations
 */
export async function validateEVMTrust(
  runtime: IAgentRuntime,
  message: Memory,
  actionName: string,
  requirements: { minTrustScore: number; requiredRole: string; maxValueUSD: number | null },
  transactionDetails?: {
    amount?: number;
    tokenSymbol?: string;
    recipient?: string;
    contractAddress?: string;
    functionName?: string;
    chainId?: number;
    estimatedGas?: string;
  },
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
        `EVM action ${actionName} rejected: insufficient trust score ${trustScore} < ${requirements.minTrustScore}`,
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
        `EVM action ${actionName} rejected: insufficient role permissions for ${requirements.requiredRole}`,
      );
      return {
        allowed: false,
        reason: `Insufficient role permissions (requires ${requirements.requiredRole})`,
        trustScore,
      };
    }

    // Enhanced security checks for smart contract operations
    if (
      requirements.requiredRole === 'ADMIN_ROLE' ||
      requirements.requiredRole === 'FINANCE_ROLE'
    ) {
      const securityModule = runtime.getService('security-module');
      if (securityModule) {
        const securityCheck = await (securityModule as any).validateSmartContractOperation({
          entityId,
          action: actionName,
          context: message.content,
          requiredPermissions: [requirements.requiredRole],
          transactionDetails,
        });

        if (!securityCheck.allowed) {
          elizaLogger.warn(`EVM smart contract action ${actionName} blocked by security module`);
          return {
            allowed: false,
            reason: securityCheck.reason || 'Security validation failed',
            trustScore,
          };
        }
      }

      // Smart contract specific validations
      if (transactionDetails?.contractAddress) {
        const contractValidation = await validateSmartContractSecurity(
          runtime,
          transactionDetails.contractAddress,
          transactionDetails.functionName,
          entityId,
        );
        if (!contractValidation.allowed) {
          return {
            allowed: false,
            reason: contractValidation.reason,
            trustScore,
          };
        }
      }

      // Amount-based validation for financial operations
      if (transactionDetails && requirements.maxValueUSD !== null) {
        const amountCheck = await validateTransactionValue(
          runtime,
          transactionDetails,
          requirements.maxValueUSD,
          trustScore,
        );
        if (!amountCheck.allowed) {
          return {
            allowed: false,
            reason: amountCheck.reason,
            trustScore,
          };
        }
      }

      // High-value transaction additional validation
      if (transactionDetails?.amount) {
        const highValueCheck = await validateHighValueEVMTransaction(
          runtime,
          message,
          transactionDetails,
          trustScore,
        );
        if (!highValueCheck.allowed) {
          return {
            allowed: false,
            reason: highValueCheck.reason,
            trustScore,
          };
        }
      }
    }

    elizaLogger.info(
      `EVM action ${actionName} authorized: trust=${trustScore.toFixed(2)}, role=${requirements.requiredRole}`,
      transactionDetails &&
        `chain=${transactionDetails.chainId}, contract=${transactionDetails.contractAddress}`,
    );

    return { allowed: true, trustScore };
  } catch (error) {
    elizaLogger.error(`Trust validation error for EVM action ${actionName}:`, error);
    return { allowed: false, reason: `Trust validation error: ${(error as Error).message}` };
  }
}

/**
 * Validate smart contract security
 */
async function validateSmartContractSecurity(
  runtime: IAgentRuntime,
  contractAddress: string,
  functionName?: string,
  entityId?: string,
): Promise<{ allowed: boolean; reason?: string }> {
  try {
    const securityModule = runtime.getService('security-module');
    if (!securityModule) {
      return { allowed: true, reason: 'Security module not available' };
    }

    // Check contract against known malicious contracts
    const contractCheck = await (securityModule as any).validateContractAddress({
      contractAddress,
      chainId: undefined, // Could be extracted from context
    });

    if (!contractCheck.safe) {
      return {
        allowed: false,
        reason: `Contract ${contractAddress} flagged as unsafe: ${contractCheck.reason}`,
      };
    }

    // Check function call if specified
    if (functionName) {
      const functionCheck = await (securityModule as any).validateContractFunction({
        contractAddress,
        functionName,
        caller: entityId,
      });

      if (!functionCheck.allowed) {
        return {
          allowed: false,
          reason: `Function ${functionName} on contract ${contractAddress} not allowed: ${functionCheck.reason}`,
        };
      }
    }

    return { allowed: true };
  } catch (error) {
    elizaLogger.error('Smart contract security validation error:', error);
    return {
      allowed: false,
      reason: `Contract security validation error: ${(error as Error).message}`,
    };
  }
}

/**
 * Validate transaction value against trust-based limits
 */
async function validateTransactionValue(
  runtime: IAgentRuntime,
  transactionDetails: { amount?: number; tokenSymbol?: string; chainId?: number },
  maxAllowedValue: number,
  trustScore: number,
): Promise<{ allowed: boolean; reason?: string }> {
  try {
    if (!transactionDetails.amount) {
      return { allowed: true }; // No amount to validate
    }

    // Get price oracle service to convert to USD equivalent
    const priceOracle = runtime.getService('price-oracle');
    let usdValue = transactionDetails.amount;

    if (priceOracle && transactionDetails.tokenSymbol) {
      try {
        const tokenPrice = await (priceOracle as any).getTokenPrice(
          transactionDetails.tokenSymbol,
          transactionDetails.chainId,
        );
        usdValue = transactionDetails.amount * tokenPrice;
      } catch (error) {
        elizaLogger.warn(
          `Could not get price for ${transactionDetails.tokenSymbol}, using raw amount`,
        );
      }
    }

    // Dynamic limits based on trust score
    const adjustedLimit = maxAllowedValue * (1 + trustScore * 2); // Higher trust = much higher limits

    if (usdValue > adjustedLimit) {
      return {
        allowed: false,
        reason: `Transaction value ($${usdValue.toFixed(2)}) exceeds limit ($${adjustedLimit.toFixed(2)}) for trust level ${trustScore.toFixed(2)}`,
      };
    }

    return { allowed: true };
  } catch (error) {
    elizaLogger.error('Error validating transaction value:', error);
    return { allowed: false, reason: `Value validation error: ${(error as Error).message}` };
  }
}

/**
 * Additional validation for high-value EVM transactions
 */
async function validateHighValueEVMTransaction(
  runtime: IAgentRuntime,
  message: Memory,
  transactionDetails: {
    amount?: number;
    recipient?: string;
    tokenSymbol?: string;
    chainId?: number;
    contractAddress?: string;
  },
  trustScore: number,
): Promise<{ allowed: boolean; reason?: string }> {
  try {
    const VERY_HIGH_VALUE_THRESHOLD = 50000; // $50k USD

    if (!transactionDetails.amount) {
      return { allowed: true };
    }

    // Convert to USD if possible
    const priceOracle = runtime.getService('price-oracle');
    let usdValue = transactionDetails.amount;

    if (priceOracle && transactionDetails.tokenSymbol) {
      try {
        const tokenPrice = await (priceOracle as any).getTokenPrice(
          transactionDetails.tokenSymbol,
          transactionDetails.chainId,
        );
        usdValue = transactionDetails.amount * tokenPrice;
      } catch (error) {
        // Continue with raw amount if price unavailable
      }
    }

    if (usdValue > VERY_HIGH_VALUE_THRESHOLD) {
      // Very high-value transactions require maximum trust
      if (trustScore < 0.95) {
        return {
          allowed: false,
          reason: `Very high-value EVM transaction ($${usdValue.toFixed(2)}) requires trust score ≥ 0.95 (current: ${trustScore.toFixed(2)})`,
        };
      }

      // Check if recipient is trusted (for transfers)
      const securityModule = runtime.getService('security-module');
      if (securityModule && transactionDetails.recipient) {
        const recipientCheck = await (securityModule as any).validateEVMRecipient({
          entityId: message.entityId,
          recipientAddress: transactionDetails.recipient,
          chainId: transactionDetails.chainId,
          amount: usdValue,
        });

        if (!recipientCheck.trusted) {
          return {
            allowed: false,
            reason:
              'Very high-value transaction to untrusted recipient requires additional verification',
          };
        }
      }

      // Additional gas limit validation for high-value transactions
      if (transactionDetails.contractAddress) {
        const gasLimitCheck = await validateGasLimits(runtime, transactionDetails);
        if (!gasLimitCheck.allowed) {
          return {
            allowed: false,
            reason: gasLimitCheck.reason,
          };
        }
      }
    }

    return { allowed: true };
  } catch (error) {
    elizaLogger.error('Error validating high-value EVM transaction:', error);
    return {
      allowed: false,
      reason: `High-value transaction validation error: ${(error as Error).message}`,
    };
  }
}

/**
 * Validate gas limits for smart contract interactions
 */
async function validateGasLimits(
  runtime: IAgentRuntime,
  transactionDetails: { estimatedGas?: string; contractAddress?: string },
): Promise<{ allowed: boolean; reason?: string }> {
  try {
    if (!transactionDetails.estimatedGas) {
      return { allowed: true }; // No gas limit to validate
    }

    const gasLimit = parseInt(transactionDetails.estimatedGas);
    const SUSPICIOUS_GAS_LIMIT = 10000000; // 10M gas - unusually high

    if (gasLimit > SUSPICIOUS_GAS_LIMIT) {
      return {
        allowed: false,
        reason: `Suspiciously high gas limit (${gasLimit}) detected for contract interaction`,
      };
    }

    return { allowed: true };
  } catch (error) {
    elizaLogger.error('Error validating gas limits:', error);
    return { allowed: false, reason: `Gas limit validation error: ${(error as Error).message}` };
  }
}

/**
 * Record EVM action execution for trust tracking
 */
export async function recordEVMAction(
  runtime: IAgentRuntime,
  message: Memory,
  actionName: string,
  success: boolean,
  details?: any,
): Promise<void> {
  try {
    const trustService = runtime.getService('trust-engine');
    if (!trustService) {
      return;
    }

    const entityId = message.entityId;
    if (!entityId) {
      return;
    }

    // Calculate trust impact based on action type and outcome
    let trustChange = 0;
    if (success) {
      // Positive trust for successful actions
      if ((EVM_TRUST_REQUIREMENTS as any)[actionName]?.requiredRole === 'ADMIN_ROLE') {
        trustChange = 0.06; // Significant boost for admin smart contract actions
      } else if ((EVM_TRUST_REQUIREMENTS as any)[actionName]?.requiredRole === 'FINANCE_ROLE') {
        trustChange = 0.04; // Good boost for finance actions
      } else {
        trustChange = 0.02; // Medium boost for other actions
      }
    } else {
      // Negative trust for failed critical actions
      if ((EVM_TRUST_REQUIREMENTS as any)[actionName]?.requiredRole === 'ADMIN_ROLE') {
        trustChange = -0.12; // Significant penalty for failed admin actions
      } else if ((EVM_TRUST_REQUIREMENTS as any)[actionName]?.requiredRole === 'FINANCE_ROLE') {
        trustChange = -0.08; // Medium penalty for failed finance actions
      } else {
        trustChange = -0.04; // Small penalty for other failures
      }
    }

    await (trustService as any).updateTrust({
      entityId,
      change: trustChange,
      reason: `EVM action: ${actionName} (${success ? 'success' : 'failure'})`,
      source: 'evm-plugin',
      evidence: {
        action: actionName,
        success,
        details,
        timestamp: new Date().toISOString(),
      },
    });

    elizaLogger.debug(
      `Recorded trust change ${trustChange} for EVM action ${actionName} (${success ? 'success' : 'failure'})`,
    );
  } catch (error) {
    elizaLogger.error('Failed to record EVM action trust impact:', error);
  }
}

/**
 * Extract transaction details from message or state
 */
export function extractEVMTransactionDetails(
  message: Memory,
  state?: State,
):
  | {
      amount?: number;
      tokenSymbol?: string;
      recipient?: string;
      contractAddress?: string;
      functionName?: string;
      chainId?: number;
      estimatedGas?: string;
    }
  | undefined {
  try {
    const messageText = message.content.text?.toLowerCase() || '';

    // Extract amount
    const amountMatch = messageText.match(/(\d+(?:\.\d+)?)\s*(eth|usdc|btc|dai|usdt|\$|\w+)/i);
    const amount = amountMatch ? parseFloat(amountMatch[1]) : undefined;

    // Extract token symbol
    const tokenMatch = messageText.match(/\b(eth|usdc|btc|dai|usdt|\w+)\b/i);
    const tokenSymbol = tokenMatch ? tokenMatch[1].toUpperCase() : undefined;

    // Extract recipient address
    const addressMatch = messageText.match(/0x[a-fA-F0-9]{40}/);
    const recipient = addressMatch ? addressMatch[0] : undefined;

    // Extract contract address (different pattern to distinguish from recipient)
    const contractMatch = messageText.match(/contract[:\s]+0x[a-fA-F0-9]{40}/i);
    const contractAddress = contractMatch ? contractMatch[0].split(/[:\s]+/)[1] : undefined;

    // Extract chain ID or name
    let chainId: number | undefined;
    if (messageText.includes('ethereum') || messageText.includes('mainnet')) {
      chainId = 1;
    } else if (messageText.includes('polygon')) {
      chainId = 137;
    } else if (messageText.includes('arbitrum')) {
      chainId = 42161;
    } else if (messageText.includes('optimism')) {
      chainId = 10;
    } else if (messageText.includes('base')) {
      chainId = 8453;
    }

    return {
      amount,
      tokenSymbol,
      recipient,
      contractAddress,
      chainId,
    };
  } catch (error) {
    elizaLogger.error('Error extracting EVM transaction details:', error);
    return undefined;
  }
}

/**
 * Wrap an EVM action with trust validation
 */
export function wrapEVMActionWithTrust(
  action: Action,
  trustRequirements: { minTrustScore: number; requiredRole: string; maxValueUSD: number | null },
): Action {
  const originalHandler = action.handler;
  const originalValidate = action.validate;

  return {
    ...action,
    validate: async (runtime: IAgentRuntime, message: Memory, state?: State) => {
      // First run original validation
      if (originalValidate) {
        const originalValid = await originalValidate(runtime, message, state);
        if (!originalValid) {
          return false;
        }
      }

      // Extract transaction details for validation
      const transactionDetails = extractEVMTransactionDetails(message, state);

      // Then check trust requirements
      const trustCheck = await validateEVMTrust(
        runtime,
        message,
        action.name,
        trustRequirements,
        transactionDetails,
      );

      return trustCheck.allowed;
    },
    handler: async (
      runtime: IAgentRuntime,
      message: Memory,
      state: State | undefined,
      options?: any,
      callback?: HandlerCallback,
    ) => {
      // Extract transaction details for validation
      const transactionDetails = extractEVMTransactionDetails(message, state);

      // Validate trust before execution
      const trustCheck = await validateEVMTrust(
        runtime,
        message,
        action.name,
        trustRequirements,
        transactionDetails,
      );

      if (!trustCheck.allowed) {
        const errorMessage = `Access denied for EVM action '${action.name}': ${trustCheck.reason}`;
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
        await recordEVMAction(runtime, message, action.name, true, { result, transactionDetails });

        return result;
      } catch (error) {
        // Record failed execution
        await recordEVMAction(runtime, message, action.name, false, {
          error: (error as Error).message,
          transactionDetails,
        });
        throw error;
      }
    },
  };
}

/**
 * Apply trust-based access control to all EVM actions
 */
export function wrapEVMActionsWithTrust(actions: Action[]): Action[] {
  return actions.map((action) => {
    // Get requirements for this action
    const actionName = action.name as EVMActionName;
    const reqs = EVM_TRUST_REQUIREMENTS[actionName];

    if (!reqs) {
      // If no specific requirements, use default minimal requirements
      return action;
    }

    const requirements = {
      minTrustScore: reqs.minTrustScore,
      requiredRole: reqs.requiredRole,
      maxValueUSD: reqs.maxValueUSD,
    };

    return wrapEVMActionWithTrust(action, requirements);
  });
}
