import { type Action, type IAgentRuntime, type Memory, type State, logger } from "../types/core.d";
import { TrustMiddleware } from "@elizaos/plugin-trust";
import type { CustodialWalletService } from "../services/CustodialWalletService";

/**
 * Trust requirements for different types of financial operations
 */
export const FINANCIAL_TRUST_REQUIREMENTS = {
    // Low-risk operations
    "get_balance": 20,
    "get_wallet_details": 20,
    "list_custodial_wallets": 20,
    "read_contract": 20,
    
    // Medium-risk operations
    "transfer": 60,
    "swap": 60,
    "mint_nft": 50,
    "create_custodial_wallet": 40,
    "add_wallet_controller": 70,
    
    // High-risk operations
    "trade": 80,
    "supply": 80,
    "borrow": 80,
    "stake_eth": 80,
    "bridge_funds": 90,
    "transfer_wallet_ownership": 90,
    
    // Critical operations
    "deploy_nft": 95,
    "deploy_token": 95,
    "invoke_contract": 85,
} as const;

/**
 * Enhanced trust validation for custodial wallet operations
 */
export class AgentKitTrustValidator {
    /**
     * Validate trust level for custodial wallet operations
     */
    static async validateCustodialWalletAccess(
        runtime: IAgentRuntime,
        message: Memory,
        walletId: string,
        operation: 'view' | 'transfer' | 'admin'
    ): Promise<{ allowed: boolean; reason?: string; trustLevel?: number }> {
        try {
            const custodialService = runtime.getService<CustodialWalletService>("custodial-wallet");
            if (!custodialService) {
                return { allowed: false, reason: "Custodial wallet service not available" };
            }

            // Check if user has basic permission to the wallet
            const hasPermission = custodialService.hasPermission(
                walletId as any,
                message.entityId,
                operation
            );

            if (!hasPermission) {
                return { 
                    allowed: false, 
                    reason: `Insufficient permissions for ${operation} operation on wallet ${walletId}` 
                };
            }

            // Check trust level using plugin-trust if available
            const trustService = runtime.getService('trust-engine');
            if (trustService) {
                const trustEngine = (trustService as any).trustEngine;
                if (trustEngine) {
                    const trustProfile = await trustEngine.calculateTrust(message.entityId, {
                        evaluatorId: runtime.agentId,
                        roomId: message.roomId,
                    });

                    const wallet = await custodialService.getWallet(walletId as any);
                    const requiredTrust = wallet?.metadata?.trustLevel || 30;

                    if (trustProfile.overallTrust < requiredTrust) {
                        return {
                            allowed: false,
                            reason: `Insufficient trust level: ${trustProfile.overallTrust.toFixed(1)} < ${requiredTrust}`,
                            trustLevel: trustProfile.overallTrust
                        };
                    }

                    return { 
                        allowed: true, 
                        trustLevel: trustProfile.overallTrust 
                    };
                }
            }

            // SECURE FALLBACK: Require minimum trust level when trust service unavailable
            logger.warn("[AgentKitTrustValidator] Trust service unavailable - requiring minimum trust level");
            return { 
                allowed: false, 
                reason: "Trust service unavailable - access denied for security" 
            };

        } catch (error) {
            logger.error("[AgentKitTrustValidator] Error validating custodial wallet access:", error);
            return { allowed: false, reason: "Error validating access" };
        }
    }

    /**
     * Get trust requirement for a financial operation
     */
    static getTrustRequirement(actionName: string, amount?: number, tokenType?: string): number {
        // Base requirement from the action name
        let baseRequirement = FINANCIAL_TRUST_REQUIREMENTS[actionName as keyof typeof FINANCIAL_TRUST_REQUIREMENTS] || 50;

        // Adjust based on amount (if provided)
        if (amount !== undefined) {
            if (amount > 10000) { // Large amounts
                baseRequirement += 20;
            } else if (amount > 1000) { // Medium amounts
                baseRequirement += 10;
            } else if (amount > 100) { // Small amounts
                baseRequirement += 5;
            }
        }

        // Adjust based on token type
        if (tokenType) {
            const highRiskTokens = ['ETH', 'BTC', 'USDC', 'WETH'];
            if (highRiskTokens.includes(tokenType.toUpperCase())) {
                baseRequirement += 10;
            }
        }

        return Math.min(baseRequirement, 100); // Cap at 100
    }
}

/**
 * Wrap AgentKit actions with trust-based access control
 */
export function wrapAgentKitActionsWithTrust(actions: Action[]): Action[] {
    return actions.map(action => {
        // Only wrap financial actions
        if (!isFinancialAction(action.name)) {
            return action;
        }

        const trustRequirement = AgentKitTrustValidator.getTrustRequirement(action.name);
        
        logger.info(`[AgentKitTrust] Wrapping action ${action.name} with trust requirement ${trustRequirement}`);
        
        return TrustMiddleware.wrapAction(action, trustRequirement);
    });
}

/**
 * Wrap custodial wallet actions with enhanced trust validation
 */
export function wrapCustodialWalletActions(actions: Action[]): Action[] {
    return actions.map(action => {
        const originalValidate = action.validate;
        const originalHandler = action.handler;

        return {
            ...action,
            validate: async (runtime: IAgentRuntime, message: Memory, state?: State) => {
                // Run original validation first
                if (originalValidate) {
                    const valid = await originalValidate(runtime, message, state);
                    if (!valid) {
                        return false;
                    }
                }

                // Enhanced validation for custodial wallet operations
                if (action.name.includes('CUSTODIAL_WALLET') || action.name.includes('WALLET')) {
                    const text = message.content.text || "";
                    const walletMatch = text.match(/wallet\s+([a-zA-Z0-9-]+)/i);
                    
                    if (walletMatch) {
                        const walletId = walletMatch[1];
                        const operation = action.name.includes('TRANSFER_OWNERSHIP') ? 'admin' :
                                        action.name.includes('ADD_CONTROLLER') ? 'admin' :
                                        action.name.includes('LIST') ? 'view' : 'transfer';

                        const validation = await AgentKitTrustValidator.validateCustodialWalletAccess(
                            runtime, message, walletId, operation
                        );

                        if (!validation.allowed) {
                            logger.warn(`[CustodialWalletTrust] Access denied for ${action.name}: ${validation.reason}`);
                            return false;
                        }
                    }
                }

                return true;
            },

            handler: originalHandler
        };
    });
}

/**
 * Check if an action is financial in nature
 */
function isFinancialAction(actionName: string): boolean {
    const financialKeywords = [
        'transfer', 'swap', 'trade', 'supply', 'borrow', 'stake', 
        'bridge', 'deploy', 'mint', 'invoke', 'balance'
    ];
    
    return financialKeywords.some(keyword => 
        actionName.toLowerCase().includes(keyword)
    );
}

/**
 * Middleware for validating high-value transactions
 */
export class HighValueTransactionValidator {
    private static readonly HIGH_VALUE_THRESHOLD = 1000; // USD equivalent
    private static readonly CRITICAL_VALUE_THRESHOLD = 10000; // USD equivalent

    static async validateTransactionValue(
        runtime: IAgentRuntime,
        message: Memory,
        amount: number,
        tokenSymbol: string
    ): Promise<{ allowed: boolean; reason?: string; requiresApproval?: boolean }> {
        try {
            // Get approximate USD value (simplified - in production would use price oracle)
            const usdValue = await this.getApproximateUSDValue(amount, tokenSymbol);

            if (usdValue >= this.CRITICAL_VALUE_THRESHOLD) {
                return {
                    allowed: false,
                    reason: `Transaction value $${usdValue.toFixed(2)} exceeds critical threshold`,
                    requiresApproval: true
                };
            }

            if (usdValue >= this.HIGH_VALUE_THRESHOLD) {
                // Require elevated trust for high-value transactions
                const trustService = runtime.getService('trust-engine');
                if (trustService) {
                    const trustEngine = (trustService as any).trustEngine;
                    if (trustEngine) {
                        const trustProfile = await trustEngine.calculateTrust(message.entityId, {
                            evaluatorId: runtime.agentId,
                            roomId: message.roomId,
                        });

                        const requiredTrust = 85; // High trust for high-value transactions
                        if (trustProfile.overallTrust < requiredTrust) {
                            return {
                                allowed: false,
                                reason: `High-value transaction requires trust level ${requiredTrust}, current: ${trustProfile.overallTrust.toFixed(1)}`
                            };
                        }
                    }
                }
            }

            return { allowed: true };

        } catch (error) {
            logger.error("[HighValueTransactionValidator] Error validating transaction:", error);
            return { allowed: false, reason: "Error validating transaction value" };
        }
    }

    private static async getApproximateUSDValue(amount: number, tokenSymbol: string): Promise<number> {
        // Simplified price mapping - in production would use real price feeds
        const priceMap: Record<string, number> = {
            'ETH': 2000,
            'BTC': 45000,
            'USDC': 1,
            'USDT': 1,
            'WETH': 2000,
            'DAI': 1,
        };

        const price = priceMap[tokenSymbol.toUpperCase()] || 1;
        return amount * price;
    }
}