/**
 * Cross-Plugin Workflow Actions
 *
 * High-level actions that orchestrate workflows across Trust, Rolodex, Payment, and Secrets Manager plugins.
 * These actions demonstrate the complete integration capabilities of the CrossPluginIntegrationService.
 */

import {
  type Action,
  type IAgentRuntime,
  type Memory,
  type State,
  type Handler,
  type Validator,
  type HandlerCallback,
  type UUID,
} from './types';
import { logger } from './logger';
import { CrossPluginIntegrationService } from './services/CrossPluginIntegrationService';

/**
 * OAuth Identity Verification Workflow Action
 *
 * Orchestrates complete OAuth verification including:
 * - OAuth authentication through Secrets Manager
 * - Identity verification through Rolodex
 * - Trust score updates through Trust plugin
 * - Payment profile initialization (optional)
 */
export const verifyOAuthIdentityWorkflowAction: Action = {
  name: 'VERIFY_OAUTH_IDENTITY_WORKFLOW',
  similes: ['VERIFY_IDENTITY', 'OAUTH_VERIFICATION', 'COMPLETE_VERIFICATION'],
  description: 'Complete OAuth identity verification workflow across all integrated plugins',

  validate: async (runtime: IAgentRuntime, message: Memory, state?: State): Promise<boolean> => {
    // Check if required services are available
    const hasOAuthService = !!runtime.getService?.('OAUTH_VERIFICATION');
    const hasIdentityManager = !!runtime.getIdentityManager?.();

    // Check if message contains verification request
    const text = message.content.text?.toLowerCase() || '';
    const hasVerificationKeywords = [
      'verify identity',
      'oauth verify',
      'verify account',
      'link account',
      'authenticate',
    ].some((keyword) => text.includes(keyword));

    return hasOAuthService && hasIdentityManager && hasVerificationKeywords;
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    options?: { [key: string]: unknown },
    callback?: HandlerCallback
  ) => {
    try {
      logger.info('[VerifyOAuthIdentityWorkflow] Starting OAuth verification workflow');

      // Initialize the integration service
      const integrationService = new CrossPluginIntegrationService(runtime);

      // Extract platform from message content
      const text = message.content.text?.toLowerCase() || '';
      let platform: 'google' | 'github' | 'discord' | 'twitter' = 'google';

      if (text.includes('github')) platform = 'github';
      else if (text.includes('discord')) platform = 'discord';
      else if (text.includes('twitter')) platform = 'twitter';

      // Execute the OAuth verification workflow
      const workflowResult = await integrationService.executeOAuthVerificationWorkflow({
        entityId: message.entityId,
        platform,
        updateTrustScore: true,
        includePaymentProfile: true,
      });

      if (workflowResult.success && workflowResult.verified) {
        const responseText =
          `✅ Successfully verified your ${platform} identity!\n\n` +
          `📊 Your trust score: ${workflowResult.trustScore?.overall.toFixed(2) || 'N/A'}\n` +
          `🔐 Verification status: ${workflowResult.identityProfile?.verificationStatus || 'verified'}\n` +
          `💰 Payment profile: ${workflowResult.paymentProfile ? 'Active' : 'Not initialized'}\n\n` +
          `This verification enhances your ability to:\n` +
          `• Make higher-value payments with reduced risk assessment\n` +
          `• Build stronger trust relationships\n` +
          `• Access verified-user features`;

        await callback?.({
          text: responseText,
          thought: `Successfully completed OAuth verification workflow for ${platform}`,
          actions: ['VERIFY_OAUTH_IDENTITY_WORKFLOW'],
        });
      } else {
        const errorText =
          `❌ OAuth verification failed: ${workflowResult.error || 'Unknown error'}\n\n` +
          `Please try again or contact support if the issue persists.`;

        await callback?.({
          text: errorText,
          thought: 'OAuth verification workflow failed',
          actions: ['VERIFY_OAUTH_IDENTITY_WORKFLOW'],
        });
      }

      return {
        text: workflowResult.success
          ? 'Verification completed successfully'
          : 'Verification failed',
        data: workflowResult,
      };
    } catch (error) {
      logger.error('[VerifyOAuthIdentityWorkflow] Workflow failed:', error);

      await callback?.({
        text: `❌ An error occurred during verification: ${error instanceof Error ? error.message : String(error)}\n\nPlease try again later.`,
        thought: 'OAuth verification workflow encountered an error',
      });

      throw error;
    }
  },

  examples: [
    [
      {
        name: '{{user}}',
        content: {
          text: 'I want to verify my Google account to build trust',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: '✅ Successfully verified your google identity!\n\n📊 Your trust score: 0.65\n🔐 Verification level: verified\n💰 Payment profile: Active',
          thought: 'Successfully completed OAuth verification workflow for google',
          actions: ['VERIFY_OAUTH_IDENTITY_WORKFLOW'],
        },
      },
    ],
    [
      {
        name: '{{user}}',
        content: {
          text: 'Can you verify my GitHub account for me?',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: '✅ Successfully verified your github identity!\n\n📊 Your trust score: 0.68\n🔐 Verification level: verified\n💰 Payment profile: Active',
          thought: 'Successfully completed OAuth verification workflow for github',
          actions: ['VERIFY_OAUTH_IDENTITY_WORKFLOW'],
        },
      },
    ],
  ],
};

/**
 * Payment Risk Assessment Workflow Action
 *
 * Comprehensive risk assessment using data from all plugins:
 * - Trust scores from Trust plugin
 * - Identity verification from Rolodex
 * - Payment history from Payment plugin
 * - Real-time behavioral analysis
 */
export const assessPaymentRiskWorkflowAction: Action = {
  name: 'ASSESS_PAYMENT_RISK_WORKFLOW',
  similes: ['CHECK_PAYMENT_RISK', 'EVALUATE_PAYMENT', 'RISK_ASSESSMENT'],
  description: 'Comprehensive payment risk assessment using all available trust and identity data',

  validate: async (runtime: IAgentRuntime, message: Memory, state?: State): Promise<boolean> => {
    const text = message.content.text?.toLowerCase() || '';
    const hasPaymentKeywords = [
      'risk assessment',
      'payment risk',
      'check payment',
      'evaluate payment',
      'safe to pay',
      'payment safety',
    ].some((keyword) => text.includes(keyword));

    return hasPaymentKeywords;
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    options?: { [key: string]: unknown },
    callback?: HandlerCallback
  ) => {
    try {
      logger.info('[AssessPaymentRiskWorkflow] Starting payment risk assessment');

      const integrationService = new CrossPluginIntegrationService(runtime);

      // Extract payment details from message
      const text = message.content.text || '';
      const amountMatch = text.match(/\$?(\d+(?:\.\d+)?)/);
      const amount = amountMatch ? amountMatch[1] : '100';

      // Determine payment method
      let method = { type: 'crypto', currency: 'ETH' };
      if (text.includes('bitcoin') || text.includes('btc')) {
        method = { type: 'crypto', currency: 'BTC' };
      } else if (text.includes('solana') || text.includes('sol')) {
        method = { type: 'crypto', currency: 'SOL' };
      }

      // Perform comprehensive risk assessment
      const riskResult = await integrationService.assessPaymentRisk({
        entityId: message.entityId,
        amount,
        method,
        requireTrustVerification: true,
        requireIdentityVerification: true,
      });

      // Format response based on risk level
      let riskEmoji = '✅';
      let riskColor = 'LOW';
      if (riskResult.riskLevel === 'medium') {
        riskEmoji = '⚠️';
        riskColor = 'MEDIUM';
      } else if (riskResult.riskLevel === 'high') {
        riskEmoji = '🚨';
        riskColor = 'HIGH';
      } else if (riskResult.riskLevel === 'critical') {
        riskEmoji = '🛑';
        riskColor = 'CRITICAL';
      }

      const responseText =
        `${riskEmoji} Payment Risk Assessment Complete\n\n` +
        `💰 Amount: $${amount} (${method.currency})\n` +
        `📊 Risk Level: ${riskColor}\n` +
        `🔐 Trust Score: ${riskResult.trustScore.toFixed(2)}\n` +
        `✅ Verification: ${riskResult.verificationLevel}\n` +
        `📋 Approval: ${riskResult.approved ? 'APPROVED' : 'REQUIRES ACTION'}\n\n` +
        (riskResult.requiredActions.length > 0
          ? `📝 Required Actions:\n${riskResult.requiredActions.map((action) => `• ${action}`).join('\n')}\n\n`
          : '') +
        `🛡️ This assessment considers your trust score, identity verification status, and transaction history.`;

      await callback?.({
        text: responseText,
        thought: `Completed payment risk assessment: ${riskResult.riskLevel} risk level`,
        actions: ['ASSESS_PAYMENT_RISK_WORKFLOW'],
      });

      return {
        text: `Payment risk assessment completed: ${riskResult.riskLevel} risk`,
        data: riskResult,
      };
    } catch (error) {
      logger.error('[AssessPaymentRiskWorkflow] Assessment failed:', error);

      await callback?.({
        text: `❌ Unable to assess payment risk: ${error instanceof Error ? error.message : String(error)}\n\nPlease ensure your identity is verified and try again.`,
        thought: 'Payment risk assessment workflow failed',
      });

      throw error;
    }
  },

  examples: [
    [
      {
        name: '{{user}}',
        content: {
          text: 'Can you check the payment risk for a $500 ETH transaction?',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: '✅ Payment Risk Assessment Complete\n\n💰 Amount: $500 (ETH)\n📊 Risk Level: LOW\n🔐 Trust Score: 0.75\n✅ Verification: verified\n📋 Approval: APPROVED',
          thought: 'Completed payment risk assessment: low risk level',
          actions: ['ASSESS_PAYMENT_RISK_WORKFLOW'],
        },
      },
    ],
  ],
};

/**
 * Cross-Platform Identity Consolidation Workflow Action
 *
 * Consolidates identities across multiple platforms:
 * - Verifies multiple OAuth identities
 * - Detects potential duplicate entities
 * - Proposes and executes entity merges
 * - Maintains trust scores across consolidation
 */
export const consolidateIdentityWorkflowAction: Action = {
  name: 'CONSOLIDATE_IDENTITY_WORKFLOW',
  similes: ['MERGE_IDENTITIES', 'CONSOLIDATE_ACCOUNTS', 'LINK_PLATFORMS'],
  description:
    'Consolidate multiple platform identities into a unified profile with conflict resolution',

  validate: async (runtime: IAgentRuntime, message: Memory, state?: State): Promise<boolean> => {
    const text = message.content.text?.toLowerCase() || '';
    const hasConsolidationKeywords = [
      'consolidate identity',
      'merge accounts',
      'link platforms',
      'combine identities',
      'unify profile',
    ].some((keyword) => text.includes(keyword));

    return hasConsolidationKeywords && !!runtime.getIdentityManager?.();
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    options?: { [key: string]: unknown },
    callback?: HandlerCallback
  ) => {
    try {
      logger.info('[ConsolidateIdentityWorkflow] Starting cross-platform identity consolidation');

      const integrationService = new CrossPluginIntegrationService(runtime);

      // For demonstration, consolidate common platforms
      const platforms = [
        { platform: 'google', platformId: 'user-google-id' },
        { platform: 'github', platformId: 'user-github-id' },
        { platform: 'discord', platformId: 'user-discord-id' },
      ];

      const consolidationResult = await integrationService.consolidateCrossPlatformIdentity({
        platforms,
        primaryEntityId: message.entityId,
        mergeStrategy: 'conservative',
      });

      if (consolidationResult.success) {
        const responseText =
          `✅ Identity Consolidation Complete!\n\n` +
          `👤 Primary Entity: ${consolidationResult.primaryEntityId}\n` +
          `🔗 Consolidated Platforms: ${consolidationResult.consolidatedPlatforms.join(', ')}\n` +
          `📊 Final Trust Score: ${consolidationResult.finalTrustScore.toFixed(2)}\n` +
          `🔐 Verification Level: ${consolidationResult.verificationLevel}\n` +
          (consolidationResult.mergedEntities.length > 0
            ? `🔄 Merged Entities: ${consolidationResult.mergedEntities.length}\n`
            : '') +
          (consolidationResult.conflicts.length > 0
            ? `⚠️ Conflicts Detected: ${consolidationResult.conflicts.length} (manual review required)\n`
            : '') +
          `\n🎉 Your unified identity profile is now active across all platforms!`;

        await callback?.({
          text: responseText,
          thought: 'Successfully consolidated cross-platform identity',
          actions: ['CONSOLIDATE_IDENTITY_WORKFLOW'],
        });
      } else {
        const conflictText =
          consolidationResult.conflicts.length > 0
            ? `\n\n⚠️ Conflicts detected:\n${consolidationResult.conflicts.map((c) => `• ${c.reason || 'Unknown conflict'}`).join('\n')}`
            : '';

        await callback?.({
          text: `❌ Identity consolidation encountered issues${conflictText}\n\nPlease resolve conflicts manually or contact support.`,
          thought: 'Identity consolidation workflow had conflicts',
          actions: ['CONSOLIDATE_IDENTITY_WORKFLOW'],
        });
      }

      return {
        text: consolidationResult.success
          ? 'Identity consolidation completed'
          : 'Consolidation had conflicts',
        data: consolidationResult,
      };
    } catch (error) {
      logger.error('[ConsolidateIdentityWorkflow] Consolidation failed:', error);

      await callback?.({
        text: `❌ Identity consolidation failed: ${error instanceof Error ? error.message : String(error)}\n\nPlease ensure all platforms are properly linked and try again.`,
        thought: 'Identity consolidation workflow failed',
      });

      throw error;
    }
  },

  examples: [
    [
      {
        name: '{{user}}',
        content: {
          text: 'Can you consolidate my Google, GitHub, and Discord identities?',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: '✅ Identity Consolidation Complete!\n\n👤 Primary Entity: user-entity-123\n🔗 Consolidated Platforms: google, github, discord\n📊 Final Trust Score: 0.82\n🔐 Verification Level: high_trust',
          thought: 'Successfully consolidated cross-platform identity',
          actions: ['CONSOLIDATE_IDENTITY_WORKFLOW'],
        },
      },
    ],
  ],
};

// Export all workflow actions
export const workflowActions: Action[] = [
  verifyOAuthIdentityWorkflowAction,
  assessPaymentRiskWorkflowAction,
  consolidateIdentityWorkflowAction,
];
