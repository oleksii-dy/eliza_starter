import {
  logger,
} from '@elizaos/core';

import {
  type IAgentRuntime,
  type UUID,
  asUUID,
  type VerificationProof,
  type VerificationResult,
} from '@elizaos/core';
import { EntityGraphManager } from '../managers/EntityGraphManager';
import { EntityResolutionManager } from '../managers/EntityResolutionManager';

/**
 * OAuth Identity Verifier that integrates Secrets Manager OAuth with Rolodex entities
 * Handles OAuth verification and platform identity linking
 */
export class OAuthIdentityVerifier {
  constructor(
    private runtime: IAgentRuntime,
    private entityGraphService: EntityGraphManager,
    private entityResolutionService: EntityResolutionManager
  ) {}

  /**
   * Verify OAuth identity and link to entity
   */
  async verifyOAuthIdentity(entityId: UUID, proof: VerificationProof): Promise<VerificationResult> {
    try {
      logger.info('[OAuthIdentityVerifier] Starting OAuth verification:', { entityId, platform: proof.proofData.platform });

      // Get OAuth service from Secrets Manager
      const oauthService = this.runtime.getService('OAUTH_VERIFICATION') as any;
      if (!oauthService) {
        return {
          success: false,
          isVerified: false,
          confidence: 0,
          reason: 'OAuth service not available',
          metadata: { error: 'OAuth service not found' },
        };
      }

      const { platform, token, expectedUserId } = proof.proofData;

      // Validate platform is supported
      if (!oauthService.isProviderAvailable(platform)) {
        return {
          success: false,
          isVerified: false,
          confidence: 0,
          reason: `OAuth provider '${platform}' not available`,
          metadata: { availableProviders: oauthService.getAvailableProviders() },
        };
      }

      // For OAuth verification, we need to handle the callback flow
      // This assumes the token is actually an authorization code from the callback
      let userProfile;
      try {
        if (proof.proofData.state && proof.proofData.authCode) {
          // Handle OAuth callback
          userProfile = await oauthService.handleCallback(platform, proof.proofData.authCode, proof.proofData.state);
        } else {
          return {
            success: false,
            isVerified: false,
            confidence: 0,
            reason: 'OAuth verification requires authorization code and state',
            metadata: { 
              hint: 'Use createOAuthChallenge to start OAuth flow',
              availableProviders: oauthService.getAvailableProviders(),
            },
          };
        }
      } catch (error) {
        logger.error('[OAuthIdentityVerifier] OAuth callback handling failed:', error);
        return {
          success: false,
          isVerified: false,
          confidence: 0,
          reason: `OAuth verification failed: ${error.message}`,
          metadata: { error: error.message },
        };
      }

      // Verify the user profile matches expected criteria
      if (expectedUserId && userProfile.id !== expectedUserId) {
        return {
          success: false,
          isVerified: false,
          confidence: 0,
          reason: 'OAuth user ID does not match expected user',
          metadata: { 
            expected: expectedUserId, 
            actual: userProfile.id,
            platform,
          },
        };
      }

      // Link the verified identity to the entity
      await this.linkVerifiedIdentity(entityId, platform, userProfile);

      // Update trust score for verified platform
      await this.entityGraphService.updateTrust(entityId, {
        type: 'oauth-verification',
        impact: 0.15, // Significant trust boost for OAuth verification
        reason: `Verified ${platform} identity: ${userProfile.name} (${userProfile.email})`,
        metadata: {
          platform,
          verifiedId: userProfile.id,
          verifiedEmail: userProfile.email,
          verifiedName: userProfile.name,
          verifiedAt: userProfile.verifiedAt,
        },
      });

      // Check for potential entity merges based on verified identity
      await this.checkForEntityMerges(entityId, platform, userProfile);

      logger.info('[OAuthIdentityVerifier] OAuth verification successful:', {
        entityId,
        platform,
        verifiedId: userProfile.id,
        verifiedEmail: userProfile.email,
      });

      return {
        success: true,
        isVerified: true,
        confidence: 0.95, // High confidence for OAuth verification
        reason: `Successfully verified ${platform} identity`,
        metadata: {
          platform,
          verifiedProfile: {
            id: userProfile.id,
            email: userProfile.email,
            name: userProfile.name,
            picture: userProfile.picture,
          },
          verifiedAt: userProfile.verifiedAt,
          trustBoost: 0.15,
        },
      };
    } catch (error) {
      logger.error('[OAuthIdentityVerifier] OAuth verification error:', error);
      return {
        success: false,
        isVerified: false,
        confidence: 0,
        reason: `Verification failed: ${error.message}`,
        metadata: { error: error.message },
      };
    }
  }

  /**
   * Create OAuth verification challenge
   */
  async createOAuthChallenge(entityId: UUID, platform: string): Promise<{
    challengeUrl: string;
    state: string;
    expiresAt: number;
  }> {
    try {
      const oauthService = this.runtime.getService('OAUTH_VERIFICATION') as any;
      if (!oauthService) {
        throw new Error('OAuth service not available');
      }

      // Create challenge using the entity ID as user identifier
      const challenge = await oauthService.createVerificationChallenge(entityId, platform);

      logger.info('[OAuthIdentityVerifier] Created OAuth challenge:', {
        entityId,
        platform,
        challengeId: challenge.id,
        expiresAt: challenge.expiresAt,
      });

      return {
        challengeUrl: challenge.challenge,
        state: challenge.state,
        expiresAt: challenge.expiresAt,
      };
    } catch (error) {
      logger.error('[OAuthIdentityVerifier] Error creating OAuth challenge:', error);
      throw error;
    }
  }

  /**
   * Get available OAuth providers
   */
  getAvailableProviders(): string[] {
    try {
      const oauthService = this.runtime.getService('OAUTH_VERIFICATION') as any;
      if (!oauthService) {
        return [];
      }
      return oauthService.getAvailableProviders();
    } catch (error) {
      logger.warn('[OAuthIdentityVerifier] Could not get OAuth providers:', error);
      return [];
    }
  }

  /**
   * Find entities by verified OAuth identity
   */
  async findEntitiesByOAuthIdentity(platform: string, platformId: string): Promise<UUID[]> {
    try {
      // Search entities that have this platform identity verified
      const searchResults = await this.entityGraphService.searchEntities(
        `${platform} ${platformId}`,
        { limit: 50 }
      );

      const matchingEntities: UUID[] = [];

      for (const result of searchResults) {
        const entity = result.entity;
        const platformData = entity.platforms?.[platform];
        
        if (platformData?.verified && (
          platformData.id === platformId ||
          platformData.userId === platformId ||
          platformData.username === platformId
        )) {
          matchingEntities.push(entity.entityId);
        }
      }

      return matchingEntities;
    } catch (error) {
      logger.error('[OAuthIdentityVerifier] Error finding entities by OAuth identity:', error);
      return [];
    }
  }

  // === Private Helper Methods ===

  private async linkVerifiedIdentity(entityId: UUID, platform: string, userProfile: any): Promise<void> {
    try {
      // Get current entity
      const entity = await this.entityGraphService.trackEntity(
        entityId,
        'OAuth identity verification',
        { updateExisting: true }
      );

      if (!entity) {
        throw new Error(`Entity ${entityId} not found`);
      }

      // Update platform identity with verification
      const updatedPlatforms = {
        ...entity.platforms,
        [platform]: {
          id: userProfile.id,
          userId: userProfile.id,
          email: userProfile.email,
          name: userProfile.name,
          username: userProfile.name,
          picture: userProfile.picture,
          isVerified: true,
          verifiedAt: userProfile.verifiedAt,
          verificationMethod: 'oauth',
          linkedAt: new Date().toISOString(),
        },
      };

      // Update entity with verified platform data
      await this.entityGraphService.batchUpdateEntities([
        {
          entityId,
          data: {
            platforms: updatedPlatforms,
            updatedAt: new Date().toISOString(),
          },
        },
      ]);

      logger.info('[OAuthIdentityVerifier] Linked verified identity:', {
        entityId,
        platform,
        verifiedId: userProfile.id,
        verifiedEmail: userProfile.email,
      });
    } catch (error) {
      logger.error('[OAuthIdentityVerifier] Error linking verified identity:', error);
      throw error;
    }
  }

  private async checkForEntityMerges(entityId: UUID, platform: string, userProfile: any): Promise<void> {
    try {
      // Find other entities with the same verified platform identity
      const duplicateEntities = await this.findEntitiesByOAuthIdentity(platform, userProfile.id);
      
      // Remove current entity from duplicates
      const otherEntities = duplicateEntities.filter(id => id !== entityId);

      if (otherEntities.length > 0) {
        logger.info('[OAuthIdentityVerifier] Found potential entity duplicates for merge:', {
          currentEntity: entityId,
          duplicateEntities: otherEntities,
          platform,
          verifiedId: userProfile.id,
        });

        // For now, just log the potential merge
        // In a full implementation, you might want to:
        // 1. Create a merge proposal
        // 2. Notify administrators
        // 3. Auto-merge with high confidence
        // 4. Create a task for manual review

        // Record the potential merge in entity metadata
        const entity = await this.entityGraphService.trackEntity(
          entityId,
          'Potential merge detected',
          { updateExisting: true }
        );

        if (entity) {
          const updatedMetadata = {
            ...entity.metadata,
            potentialMerges: [
              ...(entity.metadata?.potentialMerges || []),
              {
                reason: 'oauth-identity-match',
                platform,
                verifiedId: userProfile.id,
                duplicateEntities: otherEntities,
                detectedAt: new Date().toISOString(),
              },
            ],
          };

          await this.entityGraphService.batchUpdateEntities([
            {
              entityId,
              data: {
                metadata: updatedMetadata,
                updatedAt: new Date().toISOString(),
              },
            },
          ]);
        }
      }
    } catch (error) {
      logger.warn('[OAuthIdentityVerifier] Error checking for entity merges:', error);
      // Don't throw, this is not critical to the verification process
    }
  }
}