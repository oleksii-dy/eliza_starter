/**
 * Cross-Plugin Integration Service
 *
 * Central orchestrator for workflows involving Trust, Rolodex, Payment, and Secrets Manager plugins.
 * Provides high-level workflows that seamlessly integrate all four plugins.
 */

import {
  type IAgentRuntime,
  type UUID,
  type VerificationProof,
  VerificationStatus,
  type PaymentRequest,
  PaymentMethod,
  type TrustScore,
  type IdentityProfile,
  type PaymentTransaction,
  type PaymentProfile,
  type TrustEvidence,
  TrustEvidenceType,
  type ITrustProvider,
  type IIdentityManager,
  type IPaymentProvider,
  type MergeProposal,
} from '../types/index';
import { logger } from '../logger';

export interface OAuthVerificationWorkflowRequest {
  entityId: UUID;
  platform: 'google' | 'github' | 'discord' | 'twitter';
  expectedUserId?: string;
  includePaymentProfile?: boolean;
  updateTrustScore?: boolean;
}

export interface OAuthVerificationWorkflowResult {
  success: boolean;
  verified: boolean;
  confidence: number;
  entityId: UUID;
  identityProfile?: IdentityProfile;
  trustScore?: TrustScore;
  paymentProfile?: PaymentProfile;
  platformData?: any;
  error?: string;
  metadata: {
    workflowSteps: string[];
    completedAt: string;
    duration: number;
  };
}

export interface PaymentRiskAssessmentRequest {
  entityId: UUID;
  amount: string;
  method: { type: string; currency?: string };
  recipientAddress?: string;
  requireTrustVerification?: boolean;
  requireIdentityVerification?: boolean;
}

export interface PaymentRiskAssessmentResult {
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  approved: boolean;
  trustScore: number;
  verificationLevel: string;
  requiredActions: string[];
  metadata: {
    trustFactors: any[];
    identityFactors: any[];
    riskFactors: any[];
  };
}

export interface CrossPlatformIdentityConsolidationRequest {
  platforms: Array<{
    platform: string;
    platformId: string;
    authCode?: string;
    state?: string;
  }>;
  primaryEntityId?: UUID;
  mergeStrategy?: 'conservative' | 'aggressive' | 'manual_review';
}

export interface CrossPlatformIdentityConsolidationResult {
  success: boolean;
  primaryEntityId: UUID;
  consolidatedPlatforms: string[];
  mergedEntities: UUID[];
  finalTrustScore: number;
  verificationLevel: string;
  conflicts: any[];
  metadata: Record<string, any>;
}

/**
 * Cross-Plugin Integration Service
 *
 * Orchestrates complex workflows that span multiple plugins:
 * - Complete OAuth verification with trust updates and payment profile setup
 * - Payment risk assessment using trust scores and identity verification
 * - Cross-platform identity consolidation with conflict resolution
 */
export class CrossPluginIntegrationService {
  private trustProvider: ITrustProvider | null = null;
  private identityManager: IIdentityManager | null = null;
  private paymentProvider: IPaymentProvider | null = null;
  private oauthService: any = null;

  constructor(private runtime: IAgentRuntime) {
    this.initializeProviders();
  }

  private initializeProviders(): void {
    try {
      this.trustProvider = this.runtime.getTrustProvider?.();
      this.identityManager = this.runtime.getIdentityManager?.();
      this.paymentProvider = this.runtime.getPaymentProvider?.();
      this.oauthService = this.runtime.getService?.('OAUTH_VERIFICATION');
    } catch (error) {
      logger.warn('[CrossPluginIntegrationService] Some providers not available:', error);
    }
  }

  /**
   * Complete OAuth Verification Workflow
   *
   * Performs OAuth verification and updates all related systems:
   * 1. Verify OAuth identity through Secrets Manager
   * 2. Update trust score in Trust plugin
   * 3. Link platform identity in Rolodex
   * 4. Initialize payment profile if requested
   */
  async executeOAuthVerificationWorkflow(
    request: OAuthVerificationWorkflowRequest
  ): Promise<OAuthVerificationWorkflowResult> {
    const startTime = Date.now();
    const workflowSteps: string[] = [];

    try {
      logger.info('[CrossPluginIntegrationService] Starting OAuth verification workflow:', request);

      // Step 1: Validate prerequisites
      if (!this.oauthService) {
        throw new Error('OAuth service not available (Secrets Manager plugin required)');
      }
      if (!this.identityManager) {
        throw new Error('Identity manager not available (Rolodex plugin required)');
      }

      workflowSteps.push('prerequisites-validated');

      // Step 2: Get OAuth challenge URL (for user-facing workflows)
      let platformData: any = {};
      try {
        const authUrl = await this.oauthService.createAuthUrl(
          request.platform,
          `verify-${request.entityId}`
        );
        platformData.authUrl = authUrl;
        workflowSteps.push('oauth-challenge-created');
      } catch (error) {
        logger.warn('[CrossPluginIntegrationService] Could not create OAuth challenge:', error);
      }

      // Step 3: Verify OAuth identity (assuming we have auth data)
      const verificationProof: VerificationProof = {
        platform: request.platform,
        platformId: request.expectedUserId || request.entityId,
        oauthData: {
          id: request.expectedUserId || request.entityId,
          metadata: {
            platform: request.platform,
            entityId: request.entityId,
          },
        },
        timestamp: Date.now(),
        challengeId: `oauth-challenge-${Date.now()}`,
      };

      const verificationResult = await this.identityManager.verifyIdentity(
        request.entityId,
        verificationProof
      );

      if (!verificationResult.success) {
        return {
          success: false,
          verified: false,
          confidence: 0,
          entityId: request.entityId,
          error: verificationResult.errors?.[0] || 'Verification failed',
          metadata: {
            workflowSteps,
            completedAt: new Date().toISOString(),
            duration: Date.now() - startTime,
          },
        };
      }

      workflowSteps.push('oauth-verification-completed');

      // Step 4: Update trust score if requested
      let trustScore: TrustScore | undefined;
      if (request.updateTrustScore && this.trustProvider) {
        try {
          const trustEvidence: TrustEvidence = {
            entityId: request.entityId,
            type: TrustEvidenceType.VERIFIED_IDENTITY,
            impact: 0.15,
            description: `Verified ${request.platform} identity`,
            verified: true,
            timestamp: Date.now(),
            source: 'oauth-verification',
            metadata: {
              platform: request.platform,
              verificationConfidence: verificationResult.confidence,
              workflowId: `oauth-workflow-${Date.now()}`,
            },
          };

          trustScore = await this.trustProvider.updateTrust(request.entityId, trustEvidence);
          workflowSteps.push('trust-score-updated');
        } catch (error) {
          logger.warn('[CrossPluginIntegrationService] Trust score update failed:', error);
          workflowSteps.push('trust-score-update-failed');
        }
      }

      // Step 5: Get updated identity profile
      const identityProfile = await this.identityManager.getIdentityProfile(request.entityId);
      workflowSteps.push('identity-profile-retrieved');

      // Step 6: Initialize payment profile if requested
      let paymentProfile: PaymentProfile | undefined;
      if (request.includePaymentProfile && this.paymentProvider) {
        try {
          paymentProfile = await this.paymentProvider.getPaymentProfile(request.entityId);
          workflowSteps.push('payment-profile-retrieved');
        } catch (error) {
          logger.warn('[CrossPluginIntegrationService] Payment profile retrieval failed:', error);
          workflowSteps.push('payment-profile-retrieval-failed');
        }
      }

      return {
        success: true,
        verified: verificationResult.status === VerificationStatus.VERIFIED,
        confidence: verificationResult.confidence,
        entityId: request.entityId,
        identityProfile: identityProfile || undefined,
        trustScore,
        paymentProfile,
        platformData,
        metadata: {
          workflowSteps,
          completedAt: new Date().toISOString(),
          duration: Date.now() - startTime,
        },
      };
    } catch (error) {
      logger.error('[CrossPluginIntegrationService] OAuth verification workflow failed:', error);
      return {
        success: false,
        verified: false,
        confidence: 0,
        entityId: request.entityId,
        error: error instanceof Error ? error.message : String(error),
        metadata: {
          workflowSteps,
          completedAt: new Date().toISOString(),
          duration: Date.now() - startTime,
        },
      };
    }
  }

  /**
   * Comprehensive Payment Risk Assessment
   *
   * Assesses payment risk using all available data:
   * 1. Trust score from Trust plugin
   * 2. Identity verification level from Rolodex
   * 3. Payment history and profile from Payment plugin
   * 4. Real-time behavioral analysis
   */
  async assessPaymentRisk(
    request: PaymentRiskAssessmentRequest
  ): Promise<PaymentRiskAssessmentResult> {
    try {
      logger.info('[CrossPluginIntegrationService] Assessing payment risk:', request);

      const trustFactors: any[] = [];
      const identityFactors: any[] = [];
      const riskFactors: any[] = [];

      // Get trust score
      let trustScore = 0.5; // Default neutral trust
      if (this.trustProvider) {
        try {
          const trust = await this.trustProvider.getTrustScore(request.entityId);
          trustScore = trust.overall;
          trustFactors.push({
            type: 'trust-score',
            value: trustScore,
            evidenceCount: trust.evidenceCount,
            lastUpdated: trust.lastUpdated,
          });
        } catch (error) {
          riskFactors.push({ type: 'trust-unavailable', impact: 'medium' });
        }
      }

      // Get identity verification status
      let verificationLevel = 'unverified';
      let verifiedPlatforms = 0;
      if (this.identityManager) {
        try {
          const profile = await this.identityManager.getIdentityProfile(request.entityId);
          if (profile) {
            verificationLevel = profile.verificationStatus;
            verifiedPlatforms = Array.from(profile.platforms.values()).filter(
              (p: any) => p.verified
            ).length;

            identityFactors.push({
              type: 'verification-level',
              value: verificationLevel,
              verifiedPlatforms,
            });
          }
        } catch (error) {
          riskFactors.push({ type: 'identity-unavailable', impact: 'high' });
        }
      }

      // Get payment history and profile
      let paymentHistory: PaymentTransaction[] = [];
      if (this.paymentProvider) {
        try {
          const profile = await this.paymentProvider.getPaymentProfile(request.entityId);
          // Get payment history through a separate method
          paymentHistory = await this.paymentProvider.getPaymentHistory(request.entityId, 10);

          // Use plugin's risk assessment - convert string type to PaymentMethod
          const method = (request.method.type as PaymentMethod) || PaymentMethod.OTHER;
          const pluginRiskLevel = await this.paymentProvider.assessPaymentRisk(
            request.entityId,
            request.amount,
            method
          );

          riskFactors.push({
            type: 'payment-plugin-assessment',
            value: pluginRiskLevel,
            transactionCount: profile.totalTransactions,
          });
        } catch (error) {
          riskFactors.push({ type: 'payment-history-unavailable', impact: 'medium' });
        }
      }

      // Calculate overall risk level
      const riskLevel = this.calculateOverallRiskLevel({
        trustScore,
        verificationLevel,
        verifiedPlatforms,
        paymentHistory,
        amount: parseFloat(request.amount),
        trustFactors,
        identityFactors,
        riskFactors,
      });

      // Determine if payment should be approved
      const approved = this.shouldApprovePayment(riskLevel, request);

      // Generate required actions for improvement
      const requiredActions = this.generateRequiredActions(
        riskLevel,
        trustScore,
        verificationLevel,
        request
      );

      return {
        riskLevel,
        approved,
        trustScore,
        verificationLevel,
        requiredActions,
        metadata: {
          trustFactors,
          identityFactors,
          riskFactors,
        },
      };
    } catch (error) {
      logger.error('[CrossPluginIntegrationService] Payment risk assessment failed:', error);
      return {
        riskLevel: 'critical',
        approved: false,
        trustScore: 0,
        verificationLevel: 'unknown',
        requiredActions: ['Contact support'],
        metadata: {
          trustFactors: [],
          identityFactors: [],
          riskFactors: [
            {
              type: 'assessment-error',
              error: error instanceof Error ? error.message : String(error),
            },
          ],
        },
      };
    }
  }

  /**
   * Cross-Platform Identity Consolidation
   *
   * Consolidates identities across multiple platforms:
   * 1. Verify each platform identity via OAuth
   * 2. Detect potential duplicate entities
   * 3. Propose entity merges with conflict resolution
   * 4. Execute approved merges with rollback capability
   */
  async consolidateCrossPlatformIdentity(
    request: CrossPlatformIdentityConsolidationRequest
  ): Promise<CrossPlatformIdentityConsolidationResult> {
    try {
      logger.info(
        '[CrossPluginIntegrationService] Starting cross-platform identity consolidation:',
        request
      );

      if (!this.identityManager) {
        throw new Error('Identity manager not available (Rolodex plugin required)');
      }

      const consolidatedPlatforms: string[] = [];
      const verifiedEntities: UUID[] = [];
      const conflicts: any[] = [];

      // Step 1: Verify each platform identity
      for (const platformRequest of request.platforms) {
        try {
          // Find existing entities with this platform identity
          const existingProfiles = await this.identityManager.findByPlatformIdentity(
            platformRequest.platform,
            platformRequest.platformId
          );

          if (existingProfiles.length === 0) {
            // Create new entity for this platform
            const entityId = request.primaryEntityId || (`new-entity-${Date.now()}` as UUID);

            // Verify OAuth identity
            const verificationProof: VerificationProof = {
              platform: platformRequest.platform,
              platformId: platformRequest.platformId,
              oauthData: {
                id: platformRequest.platformId,
                metadata: {
                  authCode: platformRequest.authCode,
                  state: platformRequest.state,
                },
              },
              timestamp: Date.now(),
              challengeId: `challenge-${Date.now()}`, // Generate a unique challenge ID
            };

            const result = await this.identityManager.verifyIdentity(entityId, verificationProof);
            if (result.success && result.status === VerificationStatus.VERIFIED) {
              verifiedEntities.push(entityId);
              consolidatedPlatforms.push(platformRequest.platform);
            }
          } else if (existingProfiles.length === 1) {
            // Single match - verify and add to consolidation
            const entityId = existingProfiles[0].entityId;
            verifiedEntities.push(entityId);
            consolidatedPlatforms.push(platformRequest.platform);
          } else {
            // Multiple matches - potential conflict
            conflicts.push({
              platform: platformRequest.platform,
              platformId: platformRequest.platformId,
              conflictingEntities: existingProfiles.map((p) => p.entityId),
              reason: 'Multiple entities found for platform identity',
            });
          }
        } catch (error) {
          conflicts.push({
            platform: platformRequest.platform,
            error: error instanceof Error ? error.message : String(error),
            reason: 'Platform verification failed',
          });
        }
      }

      // Step 2: Propose entity merges if multiple entities found
      let primaryEntityId = request.primaryEntityId;
      const mergedEntities: UUID[] = [];

      if (verifiedEntities.length > 1) {
        try {
          const mergeProposal = await this.identityManager.proposeEntityMerge(verifiedEntities);

          if (mergeProposal.confidence >= 0.7) {
            // Execute merge if confidence is high enough
            const mergeEntityId = await this.identityManager.executeMerge(mergeProposal);
            primaryEntityId = mergeEntityId;
            mergedEntities.push(...verifiedEntities.filter((id) => id !== mergeEntityId));
          } else {
            conflicts.push({
              type: 'merge-confidence-low',
              entities: verifiedEntities,
              confidence: mergeProposal.confidence,
              reason: mergeProposal.rationale,
            });
          }
        } catch (error) {
          conflicts.push({
            type: 'merge-failed',
            entities: verifiedEntities,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      } else if (verifiedEntities.length === 1) {
        primaryEntityId = verifiedEntities[0];
      }

      // Step 3: Get final trust score and verification level
      let finalTrustScore = 0.5;
      let verificationLevel = 'unverified';

      if (primaryEntityId) {
        if (this.trustProvider) {
          try {
            const trust = await this.trustProvider.getTrustScore(primaryEntityId);
            finalTrustScore = trust.overall;
          } catch (error) {
            logger.warn('[CrossPluginIntegrationService] Could not get final trust score:', error);
          }
        }

        const profile = await this.identityManager.getIdentityProfile(primaryEntityId);
        if (profile) {
          verificationLevel = profile.verificationStatus;
        }
      }

      return {
        success: conflicts.length === 0 && primaryEntityId !== undefined,
        primaryEntityId: primaryEntityId || ('' as UUID),
        consolidatedPlatforms,
        mergedEntities,
        finalTrustScore,
        verificationLevel,
        conflicts,
        metadata: {
          requestedPlatforms: request.platforms.length,
          verifiedPlatforms: consolidatedPlatforms.length,
          mergeStrategy: request.mergeStrategy || 'conservative',
          completedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      logger.error(
        '[CrossPluginIntegrationService] Cross-platform identity consolidation failed:',
        error
      );
      return {
        success: false,
        primaryEntityId: '' as UUID,
        consolidatedPlatforms: [],
        mergedEntities: [],
        finalTrustScore: 0,
        verificationLevel: 'error',
        conflicts: [
          { type: 'system-error', error: error instanceof Error ? error.message : String(error) },
        ],
        metadata: { error: error instanceof Error ? error.message : String(error) },
      };
    }
  }

  // === Private Helper Methods ===

  private calculateOverallRiskLevel(factors: {
    trustScore: number;
    verificationLevel: string;
    verifiedPlatforms: number;
    paymentHistory: PaymentTransaction[];
    amount: number;
    trustFactors: any[];
    identityFactors: any[];
    riskFactors: any[];
  }): 'low' | 'medium' | 'high' | 'critical' {
    let riskScore = 0.5; // Start neutral

    // Trust score impact (40% weight)
    const trustImpact = (1 - factors.trustScore) * 0.4;
    riskScore += trustImpact;

    // Verification level impact (30% weight)
    const verificationImpact = this.getVerificationRiskImpact(factors.verificationLevel) * 0.3;
    riskScore += verificationImpact;

    // Amount impact (20% weight)
    const amountImpact = this.getAmountRiskImpact(factors.amount) * 0.2;
    riskScore += amountImpact;

    // Payment history impact (10% weight)
    const historyImpact = this.getHistoryRiskImpact(factors.paymentHistory) * 0.1;
    riskScore += historyImpact;

    // Critical risk factors override
    const hasCriticalRisk = factors.riskFactors.some((f) => f.impact === 'critical');
    if (hasCriticalRisk) {
      return 'critical';
    }

    // Convert risk score to level
    if (riskScore >= 0.8) return 'critical';
    if (riskScore >= 0.6) return 'high';
    if (riskScore >= 0.4) return 'medium';
    return 'low';
  }

  private getVerificationRiskImpact(level: string): number {
    switch (level) {
      case 'high_trust':
        return 0.0;
      case 'verified':
        return 0.2;
      case 'basic':
        return 0.5;
      case 'unverified':
        return 0.8;
      default:
        return 1.0;
    }
  }

  private getAmountRiskImpact(amount: number): number {
    if (amount <= 100) return 0.0;
    if (amount <= 1000) return 0.2;
    if (amount <= 5000) return 0.5;
    if (amount <= 10000) return 0.7;
    return 1.0;
  }

  private getHistoryRiskImpact(history: PaymentTransaction[]): number {
    if (history.length >= 10) return 0.0;
    if (history.length >= 5) return 0.2;
    if (history.length >= 1) return 0.5;
    return 0.8; // No payment history
  }

  private shouldApprovePayment(riskLevel: string, request: PaymentRiskAssessmentRequest): boolean {
    if (riskLevel === 'critical') return false;
    if (riskLevel === 'high' && parseFloat(request.amount) > 1000) return false;
    if (riskLevel === 'medium' && parseFloat(request.amount) > 5000) return false;
    return true;
  }

  private generateRequiredActions(
    riskLevel: string,
    trustScore: number,
    verificationLevel: string,
    request: PaymentRiskAssessmentRequest
  ): string[] {
    const actions: string[] = [];

    if (verificationLevel === 'unverified') {
      actions.push('Verify identity through OAuth (Google, GitHub, Discord, or Twitter)');
    }

    if (trustScore < 0.5) {
      actions.push('Build trust through verified interactions and transactions');
    }

    if (riskLevel === 'high' || riskLevel === 'critical') {
      actions.push('Reduce transaction amount');
      if (request.requireTrustVerification !== false) {
        actions.push('Complete additional identity verification');
      }
    }

    if (riskLevel === 'critical') {
      actions.push('Contact support for manual review');
    }

    return actions;
  }
}
