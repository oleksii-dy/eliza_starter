import {
  type IAgentRuntime,
  type UUID,
  logger,
  stringToUuid,
  type IIdentityManager,
  type IdentityProfile,
  type EntityContext,
  type EntityResolution,
  type VerificationProof,
  type VerificationResult,
  type MergeProposal,
  type any,
  type any,
  type any,
  type any,
  type ValidationResult,
} from '@elizaos/core';
import { EntityGraphManager } from '../managers/EntityGraphManager';
import { EntityResolutionManager } from '../managers/EntityResolutionManager';
import type { EntityProfile, EntitySearchResult } from '../types';

/**
 * Core Identity Provider that implements the IIdentityManager interface
 * Bridges between the core identity types and the Rolodex plugin's entity management
 */
export class CoreIdentityProvider implements IIdentityManager {
  constructor(
    private runtime: IAgentRuntime,
    private entityGraphService: EntityGraphManager,
    private entityResolutionService: EntityResolutionManager
  ) {}

  /**
   * Resolve an entity from an identifier with context
   */
  async resolveEntity(identifier: string, context: EntityContext): Promise<EntityResolution> {
    try {
      logger.debug('[CoreIdentityProvider] Resolving entity:', { identifier, context });

      // Try to resolve using the EntityResolutionManager
      const resolved = await this.entityResolutionService.resolveEntity(
        identifier,
        {
          roomId: context.metadata?.roomId,
          platformContext: {
            platform: context.source || 'unknown',
          },
        }
      );

      if (!resolved || resolved.length === 0) {
        return {
          success: false,
          entityId: null,
          confidence: 0,
          reason: 'No entity found matching identifier',
          metaproofData: {},
        };
      }

      // Get the best match
      const bestMatch = resolved[0];

      // Build reason from match factors
      const reason = bestMatch.matchFactors.length > 0 
        ? `Entity resolved successfully: ${bestMatch.matchFactors[0].evidence}`
        : 'Entity resolved successfully';

      // Convert to core format
      return {
        success: true,
        entityId: bestMatch.entityId,
        confidence: bestMatch.confidence || 0.8,
        reason,
        alternativeMatches: resolved.slice(1).map(alt => alt.entityId),
        metaproofData: {
          source: context.source,
          originalProfile: bestMatch,
          resolutionMethod: 'entity-resolution-service',
          allCandidates: resolved,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('[CoreIdentityProvider] Error resolving entity:', error);
      return {
        success: false,
        entityId: null,
        confidence: 0,
        reason: `Resolution failed: ${errorMessage}`,
        metaproofData: { error: errorMessage },
      };
    }
  }

  /**
   * Get complete identity profile for an entity
   */
  async getIdentityProfile(entityId: UUID): Promise<IdentityProfile | null> {
    try {
      // Get entity from EntityGraphManager
      const entity = await this.entityGraphService.trackEntity(
        entityId,
        'Profile lookup',
        { updateExisting: false }
      );

      if (!entity) {
        return null;
      }

      // Get relationships for this entity
      const relationships = await this.entityGraphService.getEntityRelationships(entityId);

      // Build platform identities from entity platforms data
      const platformIdentities: Record<string, any> = {};
      Object.entries(entity.platforms || {}).forEach(([platform, data]) => {
        if (typeof data === 'string') {
          platformIdentities[platform] = {
            platformId: data,
            valid: false,
            metaproofData: {},
            linkedAt: entity.createdAt,
          };
        } else if (typeof data === 'object' && data !== null) {
          platformIdentities[platform] = {
            platformId: (data as any).id || (data as any).username || platform,
            valid: (data as any).valid || false,
            metaproofData: data,
            linkedAt: (data as any).linkedAt || entity.createdAt,
          };
        }
      });

      // Convert to core IdentityProfile format
      const profile: IdentityProfile = {
        entityId,
        primaryName: entity.names[0] || 'Unknown',
        aliases: entity.names.slice(1),
        entityType: entity.proofType as any,
        trustScore: entity.trustScore || 0.5,
        verificationLevel: this.calculateVerificationLevel(entity),
        platformIdentities,
        relationships: relationships.map(rel => ({
          targetEntityId: rel.targetEntityId,
          proofType: rel.metadata?.proofType as string || 'unknown',
          strength: rel.metadata?.strength as number || 0.5,
          valid: rel.metadata?.valid === true,
          metaproofData: rel.metadata || {},
        })),
        metaproofData: {
          summary: entity.summary,
          tags: entity.tags,
          ...entity.metadata,
          lastUpdated: entity.updatedAt,
          internalProfile: entity,
        },
        createdAt: entity.createdAt,
        lastUpdated: entity.updatedAt,
      };

      return profile;
    } catch (error) {
      logger.error('[CoreIdentityProvider] Error getting identity profile:', error);
      return null;
    }
  }

  /**
   * Verify an identity using provided proof
   */
  async verifyIdentity(entityId: UUID, proof: VerificationProof): Promise<VerificationResult> {
    try {
      logger.info('[CoreIdentityProvider] Verifying identity:', { entityId, proofType: proof.proofType });

      const entity = await this.entityGraphService.trackEntity(
        entityId,
        'Identity verification',
        { updateExisting: false }
      );

      if (!entity) {
        return {
          success: false,
          valid: false,
          confidence: 0,
          reason: 'Entity not found',
          metaproofData: {},
        };
      }

      // Handle different proof types
      let verificationResult: { valid: boolean; confidence: number; reason: string; metaproofData: any };

      switch (proof.proofType) {
        case 'oauth':
          verificationResult = await this.verifyOAuthProof(entity, proof);
          break;
        case 'cryptographic':
          verificationResult = await this.verifyCryptographicProof(entity, proof);
          break;
        case 'behavioral':
          verificationResult = await this.verifyBehavioralProof(entity, proof);
          break;
        case 'social':
          verificationResult = await this.verifySocialProof(entity, proof);
          break;
        default:
          return {
            success: false,
            valid: false,
            confidence: 0,
            reason: `Unsupported proof proofType: ${proof.proofType}`,
            metaproofData: {},
          };
      }

      // Update entity verification status if successful
      if (verificationResult.valid) {
        await this.updateEntityVerification(entityId, proof, verificationResult);
      }

      return {
        success: true,
        valid: verificationResult.valid,
        confidence: verificationResult.confidence,
        reason: verificationResult.reason,
        metaproofData: verificationResult.metadata,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('[CoreIdentityProvider] Error verifying identity:', error);
      return {
        success: false,
        valid: false,
        confidence: 0,
        reason: `Verification failed: ${errorMessage}`,
        metaproofData: { error: errorMessage },
      };
    }
  }

  /**
   * Link a platform identity to an entity
   */
  async linkPlatformIdentity(
    entityId: UUID,
    platform: string,
    platformId: string,
    valid: boolean,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      logger.info('[CoreIdentityProvider] Linking platform identity:', {
        entityId,
        platform,
        platformId,
        verified,
      });

      const entity = await this.entityGraphService.trackEntity(
        entityId,
        `Linking ${platform} identity: ${platformId}`,
        { updateExisting: true }
      );

      if (!entity) {
        throw new Error(`Entity ${entityId} not found`);
      }

      // Update platform identities
      const updatedPlatforms = {
        ...entity.platforms,
        [platform]: {
          id: platformId,
          verified,
          linkedAt: new Date().toISOString(),
          ...metadata,
        },
      };

      // Update entity with new platform data
      await this.entityGraphService.batchUpdateEntities([
        {
          entityId,
          proofData: {
            platforms: updatedPlatforms,
            updatedAt: new Date().toISOString(),
          },
        },
      ]);

      // Record trust event for verified platforms
      if (verified) {
        await this.entityGraphService.updateTrust(entityId, {
          proofType: 'platform-verification',
          impact: 0.1,
          reason: `Verified ${platform} identity: ${platformId}`,
          metaproofData: { platform, platformId, ...metadata },
        });
      }

      logger.info('[CoreIdentityProvider] Platform identity linked successfully');
    } catch (error) {
      logger.error('[CoreIdentityProvider] Error linking platform identity:', error);
      throw error;
    }
  }

  /**
   * Find entities by platform identity
   */
  async findByPlatformIdentity(platform: string, platformId: string): Promise<IdentityProfile[]> {
    try {
      // Search entities using the EntityGraphManager
      const searchResults = await this.entityGraphService.searchEntities(
        `${platform} ${platformId}`,
        { limit: 50 }
      );

      const profiles: IdentityProfile[] = [];

      for (const result of searchResults) {
        const entity = result.entity;
        
        // Check if this entity has the specific platform identity
        const platformData = entity.platforms?.[platform];
        if (!platformData) continue;

        const entityPlatformId = typeof platformData === 'string' ? platformData : 
          platformData.id || platformData.username || platformData.handle;

        if (entityPlatformId === platformId) {
          const profile = await this.getIdentityProfile(entity.entityId);
          if (profile) {
            profiles.push(profile);
          }
        }
      }

      return profiles;
    } catch (error) {
      logger.error('[CoreIdentityProvider] Error finding by platform identity:', error);
      return [];
    }
  }

  /**
   * Propose merging multiple entities
   */
  async proposeEntityMerge(entities: UUID[]): Promise<MergeProposal> {
    try {
      logger.info('[CoreIdentityProvider] Proposing entity merge:', { entities });

      if (entities.length < 2) {
        throw new Error('At least 2 entities required for merge');
      }

      // Get all entity profiles
      const profiles: EntityProfile[] = [];
      for (const entityId of entities) {
        const entity = await this.entityGraphService.trackEntity(
          entityId,
          'Merge analysis',
          { updateExisting: false }
        );
        if (entity) {
          profiles.push(entity);
        }
      }

      if (profiles.length !== entities.length) {
        throw new Error('Some entities not found');
      }

      // Analyze merge feasibility using EntityResolutionManager
      const mergeAnalysis = await this.entityResolutionService.analyzeMergeCandidate(
        profiles[0],
        profiles.slice(1)
      );

      // Build merge proposal
      const proposal: MergeProposal = {
        id: stringToUuid(`merge-${Date.now()}`),
        entities,
        confidence: mergeAnalysis.confidence,
        reason: mergeAnalysis.reason,
        conflicts: mergeAnalysis.conflicts || [],
        suggestedPrimary: mergeAnalysis.suggestedPrimary || entities[0],
        mergeStrategy: mergeAnalysis.strategy || 'conservative',
        estimatedRisk: mergeAnalysis.risk || 'medium',
        metaproofData: {
          profiles,
          analysis: mergeAnalysis,
          createdAt: new Date().toISOString(),
        },
      };

      return proposal;
    } catch (error) {
      logger.error('[CoreIdentityProvider] Error proposing entity merge:', error);
      throw error;
    }
  }

  /**
   * Execute an approved entity merge
   */
  async executeEntityMerge(proposal: MergeProposal): Promise<any> {
    try {
      logger.info('[CoreIdentityProvider] Executing entity merge:', { proposalId: proposal.id });

      // Validate proposal is still current
      if (!proposal.entities || proposal.entities.length < 2) {
        throw new Error('Invalid merge proposal');
      }

      // Execute merge using EntityResolutionManager
      const mergeResult = await this.entityResolutionService.mergeEntities(
        proposal.suggestedPrimary,
        proposal.entities.filter(id => id !== proposal.suggestedPrimary),
        {
          strategy: proposal.mergeStrategy,
          preserveHistory: true,
          updateRelationships: true,
        }
      );

      if (!mergeResult.success) {
        return {
          success: false,
          primaryEntityId: proposal.suggestedPrimary,
          mergedEntityIds: [],
          conflicts: mergeResult.conflicts || [],
          rollbackData: null,
          metaproofData: { error: mergeResult.error },
        };
      }

      // Record trust events for successful merge
      await this.entityGraphService.updateTrust(proposal.suggestedPrimary, {
        proofType: 'entity-merge',
        impact: 0.05,
        reason: `Successfully merged ${proposal.entities.length} entities`,
        metaproofData: {
          mergedEntities: proposal.entities,
          mergeStrategy: proposal.mergeStrategy,
          proposalId: proposal.id,
        },
      });

      return {
        success: true,
        primaryEntityId: proposal.suggestedPrimary,
        mergedEntityIds: proposal.entities.filter(id => id !== proposal.suggestedPrimary),
        conflicts: [],
        rollbackData: mergeResult.rollbackData,
        metaproofData: {
          proposal,
          mergeResult,
          completedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      logger.error('[CoreIdentityProvider] Error executing entity merge:', error);
      throw error;
    }
  }

  /**
   * Get entity history
   */
  async getany(entityId: UUID): Promise<any> {
    try {
      // Get entity and relationships
      const entity = await this.entityGraphService.trackEntity(
        entityId,
        'History lookup',
        { updateExisting: false }
      );
      
      if (!entity) {
        throw new Error(`Entity ${entityId} not found`);
      }

      const relationships = await this.entityGraphService.getEntityRelationships(entityId);

      // Build history timeline (simplified for now)
      const events = [
        {
          timestamp: entity.createdAt,
          proofType: 'entity-created' as const,
          description: 'Entity created',
          metaproofData: { initialData: entity },
        },
      ];

      if (entity.updatedAt !== entity.createdAt) {
        events.push({
          timestamp: entity.updatedAt,
          proofType: 'entity-updated' as const,
          description: 'Entity updated',
          metaproofData: {},
        });
      }

      // Add relationship events
      relationships.forEach(rel => {
        if (rel.createdAt) {
          events.push({
            timestamp: rel.createdAt,
            proofType: 'relationship-created' as const,
            description: `Relationship created with ${rel.targetEntityId}`,
            metaproofData: { relationship: rel },
          });
        }
      });

      // Sort events by timestamp
      events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      return {
        entityId,
        events,
        metaproofData: {
          totalEvents: events.length,
          firstEvent: events[0]?.timestamp,
          lastEvent: events[events.length - 1]?.timestamp,
        },
      };
    } catch (error) {
      logger.error('[CoreIdentityProvider] Error getting entity history:', error);
      throw error;
    }
  }

  /**
   * Search entities by identity criteria
   */
  async searchEntitiesByIdentity(query: any): Promise<any[]> {
    try {
      logger.debug('[CoreIdentityProvider] Searching entities by identity:', query);

      // Build search query from identity criteria
      let searchText = '';
      if (query.name) searchText += query.name + ' ';
      if (query.platform && query.platformId) {
        searchText += `${query.platform} ${query.platformId} `;
      }
      if (query.alias) searchText += query.alias + ' ';

      const searchResults = await this.entityGraphService.searchEntities(
        searchText.trim(),
        {
          proofType: query.entityType,
          minTrust: query.minTrustScore,
          limit: query.limit || 20,
          offset: query.offset || 0,
        }
      );

      const results: any[] = [];

      for (const result of searchResults) {
        const profile = await this.getIdentityProfile(result.entity.entityId);
        if (profile) {
          // Apply additional filters
          if (query.verificationLevel && profile.verificationLevel !== query.verificationLevel) {
            continue;
          }

          if (query.platform && query.platformId) {
            const platformData = profile.platformIdentities[query.platform];
            if (!platformData || platformData.platformId !== query.platformId) {
              continue;
            }
          }

          results.push({
            profile,
            score: result.relevanceScore,
            matchReason: result.matchReason,
            metaproofData: {
              searchQuery: query,
              originalResult: result,
            },
          });
        }
      }

      return results;
    } catch (error) {
      logger.error('[CoreIdentityProvider] Error searching entities by identity:', error);
      return [];
    }
  }

  /**
   * Validate identity data structure
   */
  async validateIdentityData(proofData: any): Promise<ValidationResult> {
    try {
      const errors: string[] = [];
      const warnings: string[] = [];

      // Basic structure validation
      if (!data) {
        errors.push('Identity data is required');
        return { valid: false, errors, warnings };
      }

      // Check required fields
      if (!data.entityId) {
        errors.push('entityId is required');
      }

      if (!data.primaryName || typeof data.primaryName !== 'string') {
        errors.push('primaryName must be a non-empty string');
      }

      if (data.aliases && !Array.isArray(data.aliases)) {
        errors.push('aliases must be an array');
      }

      if (data.trustScore !== undefined) {
        if (typeof data.trustScore !== 'number' || data.trustScore < 0 || data.trustScore > 1) {
          errors.push('trustScore must be a number between 0 and 1');
        }
      }

      // Validate platform identities
      if (data.platformIdentities) {
        if (typeof data.platformIdentities !== 'object') {
          errors.push('platformIdentities must be an object');
        } else {
          Object.entries(data.platformIdentities).forEach(([platform, identity]: [string, any]) => {
            if (!identity.platformId) {
              warnings.push(`Platform ${platform} missing platformId`);
            }
          });
        }
      }

      // Validate relationships
      if (data.relationships && Array.isArray(data.relationships)) {
        data.relationships.forEach((rel: any, index: number) => {
          if (!rel.targetEntityId) {
            errors.push(`Relationship ${index} missing targetEntityId`);
          }
          if (!rel.proofType) {
            warnings.push(`Relationship ${index} missing type`);
          }
        });
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings,
      };
    } catch (error) {
      logger.error('[CoreIdentityProvider] Error validating identity proofData:', error);
      return {
        valid: false,
        errors: [`Validation failed: ${error.message}`],
        warnings: [],
      };
    }
  }

  // === Private Helper Methods ===

  private calculateVerificationLevel(entity: EntityProfile): 'unverified' | 'basic' | 'verified' | 'high_trust' {
    const verifiedPlatforms = Object.values(entity.platforms || {}).filter(
      (p: any) => p.valid === true
    ).length;
    
    const trustScore = entity.trustScore || 0.5;

    if (verifiedPlatforms >= 2 && trustScore >= 0.8) {
      return 'high_trust';
    } else if (verifiedPlatforms >= 1 && trustScore >= 0.6) {
      return 'verified';
    } else if (trustScore >= 0.4) {
      return 'basic';
    } else {
      return 'unverified';
    }
  }

  private async verifyOAuthProof(entity: EntityProfile, proof: VerificationProof): Promise<{
    valid: boolean;
    confidence: number;
    reason: string;
    metaproofData: any;
  }> {
    try {
      // Import and use the OAuth identity verifier
      const { OAuthIdentityVerifier } = await import('./OAuthIdentityVerifier');
      const oauthVerifier = new OAuthIdentityVerifier(
        this.runtime,
        this.entityGraphService,
        this.entityResolutionService
      );

      // Verify OAuth identity using the integrated verifier
      const result = await oauthVerifier.verifyOAuthIdentity(entity.entityId, proof);

      return {
        valid: result.valid,
        confidence: result.confidence,
        reason: result.reason,
        metaproofData: result.metadata,
      };
    } catch (error) {
      logger.error('[CoreIdentityProvider] OAuth verification failed:', error);
      return {
        valid: false,
        confidence: 0,
        reason: `OAuth verification error: ${error.message}`,
        metaproofData: { error: error.message },
      };
    }
  }

  private async verifyCryptographicProof(entity: EntityProfile, proof: VerificationProof): Promise<{
    valid: boolean;
    confidence: number;
    reason: string;
    metaproofData: any;
  }> {
    // Cryptographic verification (e.g., signature verification)
    return {
      valid: false,
      confidence: 0,
      reason: 'Cryptographic verification not yet implemented',
      metaproofData: {},
    };
  }

  private async verifyBehavioralProof(entity: EntityProfile, proof: VerificationProof): Promise<{
    valid: boolean;
    confidence: number;
    reason: string;
    metaproofData: any;
  }> {
    // Behavioral verification based on interaction patterns
    const { behaviorPattern, timeWindow } = proof.proofData;

    // Use EntityGraphManager to analyze recent behavior
    return {
      valid: false,
      confidence: 0,
      reason: 'Behavioral verification not yet implemented',
      metaproofData: { behaviorPattern, timeWindow },
    };
  }

  private async verifySocialProof(entity: EntityProfile, proof: VerificationProof): Promise<{
    valid: boolean;
    confidence: number;
    reason: string;
    metaproofData: any;
  }> {
    // Social proof verification (e.g., vouching by trusted entities)
    const { vouchingEntities, socialNetwork } = proof.proofData;

    return {
      valid: false,
      confidence: 0,
      reason: 'Social proof verification not yet implemented',
      metaproofData: { vouchingEntities, socialNetwork },
    };
  }

  private async updateEntityVerification(
    entityId: UUID,
    proof: VerificationProof,
    result: { valid: boolean; confidence: number; reason: string; metaproofData: any }
  ): Promise<void> {
    // Update entity with verification information
    await this.entityGraphService.updateTrust(entityId, {
      proofType: 'identity-verification',
      impact: result.confidence * 0.2, // Scale to trust impact
      reason: result.reason,
      metaproofData: {
        proofType: proof.proofType,
        valid: result.valid,
        confidence: result.confidence,
        ...result.metadata,
      },
    });

    // Link platform identity if OAuth verification
    if (proof.proofType === 'oauth' && result.valid && proof.proofData.platform) {
      await this.linkPlatformIdentity(
        entityId,
        proof.proofData.platform,
        proof.proofData.expectedUserId || proof.proofData.actualUserId,
        true,
        result.metadata
      );
    }
  }
}