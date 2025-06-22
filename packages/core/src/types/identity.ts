import type { UUID } from './primitives';
import type { TrustScore } from './trust';

/**
 * Platform identity information
 */
export interface PlatformIdentity {
  platform: string; // 'discord', 'twitter', 'github', etc.
  platformId: string; // Platform-specific user ID
  username?: string; // Platform username/handle
  displayName?: string; // Platform display name
  avatarUrl?: string; // Profile picture URL
  verified: boolean; // Whether identity is verified via OAuth
  verifiedAt?: number; // Timestamp of verification
  metadata?: Record<string, any>; // Platform-specific data
}

/**
 * Verification proof from OAuth flow
 */
export interface VerificationProof {
  platform: string;
  platformId: string;
  oauthData: OAuthUserProfile;
  timestamp: number;
  challengeId: string;
  accessToken?: string; // For ongoing verification
  refreshToken?: string; // For token refresh
}

/**
 * OAuth user profile data
 */
export interface OAuthUserProfile {
  id: string;
  username?: string;
  displayName?: string;
  email?: string;
  avatarUrl?: string;
  verified?: boolean;
  metadata?: Record<string, any>;
}

/**
 * Verification status for an identity
 */
export enum VerificationStatus {
  UNVERIFIED = 'UNVERIFIED', // No verification attempted
  PENDING = 'PENDING', // Verification in progress
  VERIFIED = 'VERIFIED', // Successfully verified
  FAILED = 'FAILED', // Verification failed
  EXPIRED = 'EXPIRED', // Verification expired
  REVOKED = 'REVOKED', // Verification revoked
}

/**
 * Result of identity verification
 */
export interface VerificationResult {
  success: boolean;
  status: VerificationStatus;
  platform: string;
  platformId: string;
  confidence: number; // 0-100: Confidence in verification
  evidence?: VerificationProof;
  errors?: string[];
  metadata?: Record<string, any>;
}

/**
 * Complete identity profile for an entity
 */
export interface IdentityProfile {
  entityId: UUID;
  primaryName: string; // Primary display name
  aliases: string[]; // All known names/aliases
  platforms: Map<string, PlatformIdentity>; // Platform identities
  verificationStatus: VerificationStatus; // Overall verification status
  lastVerified?: number; // Last verification timestamp
  trustScore?: TrustScore; // Associated trust score
  metadata: Record<string, any>; // Additional identity data
  createdAt: number;
  updatedAt: number;
}

/**
 * Cross-platform identity link
 */
export interface IdentityLink {
  id: UUID;
  sourceEntityId: UUID;
  targetEntityId: UUID;
  linkType: IdentityLinkType;
  confidence: number; // 0-100: Confidence in the link
  evidence: string[]; // Evidence for the link
  verified: boolean; // Whether link is verified
  createdAt: number;
  metadata?: Record<string, any>;
}

/**
 * Types of identity links
 */
export enum IdentityLinkType {
  SAME_PERSON = 'SAME_PERSON', // Verified same person
  LIKELY_SAME = 'LIKELY_SAME', // High confidence same person
  POSSIBLE_SAME = 'POSSIBLE_SAME', // Low confidence same person
  RELATED = 'RELATED', // Related but different people
  DUPLICATE = 'DUPLICATE', // Duplicate entries to merge
}

/**
 * Entity merge proposal
 */
export interface MergeProposal {
  id: UUID;
  sourceEntities: UUID[]; // Entities to merge
  targetEntityId?: UUID; // Target entity (if existing)
  confidence: number; // 0-100: Confidence in merge
  conflicts: MergeConflict[]; // Data conflicts
  autoMergeable: boolean; // Whether can be auto-merged
  rationale: string; // Why entities should be merged
  createdAt: number;
}

/**
 * Data conflict in merge proposal
 */
export interface MergeConflict {
  field: string; // Conflicting field
  values: any[]; // Different values
  resolution?: 'prefer_first' | 'prefer_verified' | 'combine' | 'manual';
  confidence?: number; // Confidence in resolution
}

/**
 * Context for entity resolution
 */
export interface EntityContext {
  roomId?: UUID;
  worldId?: UUID;
  source: string; // Where entity was mentioned
  messageContent?: string; // Content for context
  timestamp: number;
  metadata?: Record<string, any>;
}

/**
 * Entity resolution result
 */
export interface EntityResolution {
  entityId?: UUID; // Resolved entity ID
  confidence: number; // 0-100: Confidence in resolution
  alternatives: EntityMatch[]; // Alternative matches
  created: boolean; // Whether new entity was created
  merged: boolean; // Whether entities were merged
  reasoning: string; // Explanation for resolution
}

/**
 * Entity match candidate
 */
export interface EntityMatch {
  entityId: UUID;
  confidence: number; // 0-100: Match confidence
  reasons: string[]; // Why this is a match
  profile: IdentityProfile;
}

/**
 * Core identity manager interface that plugins can implement
 */
export interface IIdentityManager {
  /**
   * Resolve entity from identifier and context
   */
  resolveEntity(identifier: string, context: EntityContext): Promise<EntityResolution>;

  /**
   * Get identity profile for entity
   */
  getIdentityProfile(entityId: UUID): Promise<IdentityProfile | null>;

  /**
   * Verify identity using OAuth proof
   */
  verifyIdentity(entityId: UUID, proof: VerificationProof): Promise<VerificationResult>;

  /**
   * Link platform identity to entity
   */
  linkPlatformIdentity(
    entityId: UUID, 
    platform: string, 
    platformId: string, 
    verified: boolean,
    metadata?: Record<string, any>
  ): Promise<void>;

  /**
   * Find entities by platform identity
   */
  findByPlatformIdentity(platform: string, platformId: string): Promise<IdentityProfile[]>;

  /**
   * Propose entity merge based on identity analysis
   */
  proposeEntityMerge(entities: UUID[]): Promise<MergeProposal>;

  /**
   * Execute entity merge
   */
  executeMerge(proposal: MergeProposal): Promise<UUID>; // Returns merged entity ID

  /**
   * Search entities by name or identifier
   */
  searchEntities(query: string, context?: EntityContext): Promise<EntityMatch[]>;

  /**
   * Get identity links for entity
   */
  getIdentityLinks(entityId: UUID): Promise<IdentityLink[]>;

  /**
   * Create identity link between entities
   */
  createIdentityLink(
    sourceEntityId: UUID,
    targetEntityId: UUID,
    linkType: IdentityLinkType,
    confidence: number,
    evidence: string[]
  ): Promise<IdentityLink>;
}

/**
 * Identity verification challenge
 */
export interface IdentityChallenge {
  id: UUID;
  entityId?: UUID; // Entity being verified (if known)
  platform: string; // Platform to verify
  state: string; // OAuth state parameter
  codeVerifier?: string; // PKCE code verifier
  redirectUri: string; // OAuth redirect URI
  expiresAt: number; // Challenge expiration
  metadata?: Record<string, any>;
}

/**
 * Platform verification configuration
 */
export interface PlatformVerificationConfig {
  platform: string;
  clientId: string;
  clientSecret: string;
  scopes: string[];
  authUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
  enabled: boolean;
}

/**
 * Identity synchronization status
 */
export interface IdentitySyncStatus {
  entityId: UUID;
  platform: string;
  lastSyncAt: number;
  nextSyncAt?: number;
  status: 'success' | 'error' | 'pending';
  errors?: string[];
  changes?: string[]; // What changed in last sync
}