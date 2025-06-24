import type { UUID } from './primitives';

/**
 * Trust scoring dimensions with individual scores
 */
export interface TrustDimensions {
  reliability: number; // 0-100: Consistency and promise-keeping
  competence: number; // 0-100: Task performance ability
  integrity: number; // 0-100: Ethical behavior
  benevolence: number; // 0-100: Good intentions
  transparency: number; // 0-100: Communication openness
}

/**
 * Overall trust score for an entity
 */
export interface TrustScore {
  entityId: UUID;
  dimensions: TrustDimensions;
  overall: number; // 0-100: Weighted average of dimensions
  confidence: number; // 0-100: Confidence in the score based on evidence
  lastUpdated: number; // Timestamp of last update
  evidenceCount: number; // Number of evidence pieces contributing to score
}

/**
 * Evidence that affects trust scoring
 */
export interface TrustEvidence {
  id?: UUID;
  entityId: UUID;
  type: TrustEvidenceType;
  impact: number; // -100 to 100: Impact on trust score
  description: string; // Human-readable description
  metadata?: Record<string, any>; // Additional context
  verified: boolean; // Whether evidence is verified
  timestamp: number; // When evidence was recorded
  source: string; // Source of evidence (action, evaluator, etc.)
}

/**
 * Types of trust evidence
 */
export enum TrustEvidenceType {
  // Positive evidence
  PROMISE_KEPT = 'PROMISE_KEPT',
  HELPFUL_ACTION = 'HELPFUL_ACTION',
  VERIFIED_IDENTITY = 'VERIFIED_IDENTITY',
  SUCCESSFUL_PAYMENT = 'SUCCESSFUL_PAYMENT',
  POSITIVE_FEEDBACK = 'POSITIVE_FEEDBACK',

  // Negative evidence
  PROMISE_BROKEN = 'PROMISE_BROKEN',
  HARMFUL_ACTION = 'HARMFUL_ACTION',
  SECURITY_VIOLATION = 'SECURITY_VIOLATION',
  FAILED_PAYMENT = 'FAILED_PAYMENT',
  NEGATIVE_FEEDBACK = 'NEGATIVE_FEEDBACK',

  // Neutral evidence
  IDENTITY_CHANGE = 'IDENTITY_CHANGE',
  ROLE_CHANGE = 'ROLE_CHANGE',
  INTERACTION = 'INTERACTION',
}

/**
 * Trust requirements for actions or resources
 */
export interface TrustRequirements {
  minimumTrust: number; // 0-100: Minimum overall trust score
  requiredDimensions?: Partial<TrustDimensions>; // Specific dimension requirements
  evidenceCount?: number; // Minimum evidence count
  recentActivity?: number; // Days of recent activity required
  verifiedIdentity?: boolean; // Whether verified identity is required
}

/**
 * Result of trust evaluation
 */
export interface TrustDecision {
  entityId: UUID;
  meets: boolean; // Whether entity meets trust requirements
  score: TrustScore; // Current trust score
  requirements: TrustRequirements; // Requirements that were checked
  gaps?: string[]; // Areas where requirements are not met
  recommendations?: string[]; // Suggestions for improvement
}

/**
 * Threat assessment levels
 */
export enum ThreatLevel {
  NONE = 'NONE',
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

/**
 * Security threat assessment
 */
export interface ThreatAssessment {
  entityId: UUID;
  level: ThreatLevel;
  threats: string[]; // Identified threats
  confidence: number; // 0-100: Confidence in assessment
  recommendations: string[]; // Security recommendations
  timestamp: number;
}

/**
 * Access decision for permissions
 */
export interface AccessDecision {
  granted: boolean; // Whether access is granted
  reason: string; // Explanation for decision
  trustScore?: TrustScore; // Trust score used in decision
  requirements?: TrustRequirements; // Requirements that were checked
  expires?: number; // When decision expires (timestamp)
  restrictions?: string[]; // Any restrictions on access
}

/**
 * Core trust provider interface that plugins can implement
 */
export interface ITrustProvider {
  /**
   * Get trust score for an entity
   */
  getTrustScore(entityId: UUID): Promise<TrustScore>;

  /**
   * Update trust score with new evidence
   */
  updateTrust(entityId: UUID, evidence: TrustEvidence): Promise<TrustScore>;

  /**
   * Check if entity meets trust requirements
   */
  evaluateTrustRequirements(
    entityId: UUID,
    requirements: TrustRequirements
  ): Promise<TrustDecision>;

  /**
   * Check permission for specific action/resource
   */
  checkPermission(entityId: UUID, action: string, resource?: string): Promise<AccessDecision>;

  /**
   * Assess threat level for entity and content
   */
  evaluateThreatLevel(entityId: UUID, content?: string): Promise<ThreatAssessment>;

  /**
   * Record trust-related activity
   */
  recordActivity(
    entityId: UUID,
    activity: string,
    result: 'success' | 'failure',
    metadata?: Record<string, any>
  ): Promise<void>;
}

/**
 * Trust context for evaluations
 */
export interface TrustContext {
  entityId: UUID;
  action?: string;
  resource?: string;
  metadata?: Record<string, any>;
  timestamp: number;
}

/**
 * Trust history entry
 */
export interface TrustHistoryEntry {
  id: UUID;
  entityId: UUID;
  evidence: TrustEvidence;
  previousScore?: TrustScore;
  newScore: TrustScore;
  timestamp: number;
}
