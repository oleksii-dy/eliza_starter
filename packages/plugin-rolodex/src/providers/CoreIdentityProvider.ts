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
  type EntityMergeResult,
  type EntityHistory,
  type IdentitySearchQuery,
  type IdentitySearchResult,
  type ValidationResult,
} from '@elizaos/core';
import { EntityGraphService } from '../services/EntityGraphService';
import { EntityResolutionService } from '../services/EntityResolutionService';
import type { EntityProfile, EntitySearchResult } from '../types';

/**
 * Core Identity Provider that implements the IIdentityManager interface
 * Bridges between the core identity types and the Rolodex plugin's entity management
 */
export class CoreIdentityProvider implements IIdentityManager {
  constructor(
    private runtime: IAgentRuntime,
    private entityGraphService: EntityGraphService,
    private entityResolutionService: EntityResolutionService
  ) {}

  /**
   * Resolve an entity from an identifier with context
   */
  async resolveEntity(identifier: string, context: EntityContext): Promise<EntityResolution> {
    try {
      logger.debug('[CoreIdentityProvider] Resolving entity:', { identifier, context });

      // Try to resolve using the EntityResolutionService
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
          metadata: {},
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
        metadata: {
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
        metadata: { error: errorMessage },
      };
    }
  }

  /**
   * Get complete identity profile for an entity
   */
  async getIdentityProfile(entityId: UUID): Promise<IdentityProfile | null> {
    try {
      // Get entity from EntityGraphService
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
            verified: false,
            metadata: {},
            linkedAt: entity.createdAt,
          };
        } else if (typeof data === 'object' && data !== null) {
          platformIdentities[platform] = {
            platformId: (data as any).id || (data as any).username || platform,
            verified: (data as any).verified || false,
            metadata: data,
            linkedAt: (data as any).linkedAt || entity.createdAt,
          };
        }
      });

      // Convert to core IdentityProfile format
      const profile: IdentityProfile = {
        entityId,
        primaryName: entity.names[0] || 'Unknown',
        aliases: entity.names.slice(1),
        entityType: entity.type as any,
        trustScore: entity.trustScore || 0.5,
        verificationLevel: this.calculateVerificationLevel(entity),
        platformIdentities,
        relationships: relationships.map(rel => ({
          targetEntityId: rel.targetEntityId,
          type: rel.metadata?.type as string || 'unknown',
          strength: rel.metadata?.strength as number || 0.5,
          verified: rel.metadata?.verified === true,
          metadata: rel.metadata || {},
        })),
        metadata: {
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
      logger.info('[CoreIdentityProvider] Verifying identity:', { entityId, proofType: proof.type });

      const entity = await this.entityGraphService.trackEntity(
        entityId,
        'Identity verification',
        { updateExisting: false }
      );

      if (!entity) {
        return {
          success: false,
          verified: false,
          confidence: 0,
          reason: 'Entity not found',
          metadata: {},
        };
      }

      // Handle different proof types
      let verificationResult: { verified: boolean; confidence: number; reason: string; metadata: any };

      switch (proof.type) {
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
            verified: false,
            confidence: 0,
            reason: `Unsupported proof type: ${proof.type}`,
            metadata: {},
          };
      }

      // Update entity verification status if successful
      if (verificationResult.verified) {
        await this.updateEntityVerification(entityId, proof, verificationResult);
      }

      return {
        success: true,
        verified: verificationResult.verified,
        confidence: verificationResult.confidence,
        reason: verificationResult.reason,
        metadata: verificationResult.metadata,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('[CoreIdentityProvider] Error verifying identity:', error);
      return {
        success: false,
        verified: false,
        confidence: 0,
        reason: `Verification failed: ${errorMessage}`,
        metadata: { error: errorMessage },
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
    verified: boolean,
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
          data: {
            platforms: updatedPlatforms,
            updatedAt: new Date().toISOString(),
          },
        },
      ]);

      // Record trust event for verified platforms
      if (verified) {
        await this.entityGraphService.updateTrust(entityId, {
          type: 'platform-verification',
          impact: 0.1,
          reason: `Verified ${platform} identity: ${platformId}`,
          metadata: { platform, platformId, ...metadata },
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
      // Search entities using the EntityGraphService
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

      // Analyze merge feasibility using EntityResolutionService
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
        metadata: {
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
  async executeEntityMerge(proposal: MergeProposal): Promise<EntityMergeResult> {
    try {
      logger.info('[CoreIdentityProvider] Executing entity merge:', { proposalId: proposal.id });

      // Validate proposal is still current
      if (!proposal.entities || proposal.entities.length < 2) {
        throw new Error('Invalid merge proposal');
      }

      // Execute merge using EntityResolutionService
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
          metadata: { error: mergeResult.error },
        };
      }

      // Record trust events for successful merge
      await this.entityGraphService.updateTrust(proposal.suggestedPrimary, {
        type: 'entity-merge',
        impact: 0.05,
        reason: `Successfully merged ${proposal.entities.length} entities`,
        metadata: {
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
        metadata: {
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
  async getEntityHistory(entityId: UUID): Promise<EntityHistory> {
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
          type: 'entity-created' as const,
          description: 'Entity created',
          metadata: { initialData: entity },
        },
      ];

      if (entity.updatedAt !== entity.createdAt) {
        events.push({
          timestamp: entity.updatedAt,
          type: 'entity-updated' as const,
          description: 'Entity updated',
          metadata: {},
        });
      }

      // Add relationship events
      relationships.forEach(rel => {
        if (rel.createdAt) {
          events.push({
            timestamp: rel.createdAt,
            type: 'relationship-created' as const,
            description: `Relationship created with ${rel.targetEntityId}`,
            metadata: { relationship: rel },
          });
        }
      });

      // Sort events by timestamp
      events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      return {
        entityId,
        events,
        metadata: {
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
  async searchEntitiesByIdentity(query: IdentitySearchQuery): Promise<IdentitySearchResult[]> {
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
          type: query.entityType,
          minTrust: query.minTrustScore,
          limit: query.limit || 20,
          offset: query.offset || 0,
        }
      );

      const results: IdentitySearchResult[] = [];

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
            metadata: {
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
  async validateIdentityData(data: any): Promise<ValidationResult> {
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
          if (!rel.type) {
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
      logger.error('[CoreIdentityProvider] Error validating identity data:', error);
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
      (p: any) => p.verified === true
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
    verified: boolean;
    confidence: number;
    reason: string;
    metadata: any;
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
        verified: result.verified,
        confidence: result.confidence,
        reason: result.reason,
        metadata: result.metadata,
      };
    } catch (error) {
      logger.error('[CoreIdentityProvider] OAuth verification failed:', error);
      return {
        verified: false,
        confidence: 0,
        reason: `OAuth verification error: ${error.message}`,
        metadata: { error: error.message },
      };
    }
  }

  private async verifyCryptographicProof(entity: EntityProfile, proof: VerificationProof): Promise<{
    verified: boolean;
    confidence: number;
    reason: string;
    metadata: any;
  }> {
    // Cryptographic verification (e.g., signature verification)
    return {
      verified: false,
      confidence: 0,
      reason: 'Cryptographic verification not yet implemented',
      metadata: {},
    };
  }

  private async verifyBehavioralProof(entity: EntityProfile, proof: VerificationProof): Promise<{
    verified: boolean;
    confidence: number;
    reason: string;
    metadata: any;
  }> {
    // Behavioral verification based on interaction patterns
    const { behaviorPattern, timeWindow } = proof.data;

    // Use EntityGraphService to analyze recent behavior
    return {
      verified: false,
      confidence: 0,
      reason: 'Behavioral verification not yet implemented',
      metadata: { behaviorPattern, timeWindow },
    };
  }

  private async verifySocialProof(entity: EntityProfile, proof: VerificationProof): Promise<{
    verified: boolean;
    confidence: number;
    reason: string;
    metadata: any;
  }> {
    // Social proof verification (e.g., vouching by trusted entities)
    const { vouchingEntities, socialNetwork } = proof.data;

    return {
      verified: false,
      confidence: 0,
      reason: 'Social proof verification not yet implemented',
      metadata: { vouchingEntities, socialNetwork },
    };
  }

  private async updateEntityVerification(
    entityId: UUID,
    proof: VerificationProof,
    result: { verified: boolean; confidence: number; reason: string; metadata: any }
  ): Promise<void> {
    // Update entity with verification information
    await this.entityGraphService.updateTrust(entityId, {
      type: 'identity-verification',
      impact: result.confidence * 0.2, // Scale to trust impact
      reason: result.reason,
      metadata: {
        proofType: proof.type,
        verified: result.verified,
        confidence: result.confidence,
        ...result.metadata,
      },
    });

    // Link platform identity if OAuth verification
    if (proof.type === 'oauth' && result.verified && proof.data.platform) {
      await this.linkPlatformIdentity(
        entityId,
        proof.data.platform,
        proof.data.expectedUserId || proof.data.actualUserId,
        true,
        result.metadata
      );
    }
  }
}