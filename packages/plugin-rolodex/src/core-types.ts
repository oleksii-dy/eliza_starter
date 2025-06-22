/**
 * Core type definitions and re-exports
 * This file centralizes all type imports from @elizaos/core and provides
 * local definitions for any types that may be missing or renamed.
 */

// Define UUID type locally
export type UUID = `${string}-${string}-${string}-${string}-${string}`;

// Re-export all needed types from @elizaos/core
export { 
  logger, 
  Service, 
  ModelType, 
  stringToUuid, 
  ChannelType,
  type IAgentRuntime,
  type Memory,
  type State,
  type Entity,
  type Room,
  type Relationship,
  type Component,
  type World,
  type Task,
  type Character,
  type Action,
  type Provider,
  type Evaluator,
  type Plugin,
  type Handler,
  type HandlerCallback,
  type Validator,
  type Content
} from '@elizaos/core';

// Additional imports we need from core
import { Service as ServiceClass, ChannelType as ChannelTypeEnum } from '@elizaos/core';
import type { IAgentRuntime, Memory, State, Entity } from '@elizaos/core';

// Define locally since not exported from core
export function asUUID(str: string): UUID {
  return str as UUID;
}

// Define ServiceType locally
export const ServiceType = {
  UNKNOWN: 'UNKNOWN',
  TRANSCRIPTION: 'transcription',
  VIDEO: 'video',
  BROWSER: 'browser',
  PDF: 'pdf',
  REMOTE_FILES: 'aws_s3',
  WEB_SEARCH: 'web_search',
  EMAIL: 'email',
  TEE: 'tee',
  TASK: 'task',
  WALLET: 'wallet',
  LP_POOL: 'lp_pool',
  TOKEN_DATA: 'token_data',
  TUNNEL: 'tunnel',
} as const;

export type ServiceTypeName = keyof typeof ServiceType | string;

// Define types that appear to be missing or renamed in @elizaos/core

// Metadata type
export type Metadata = Record<string, unknown>;

// ActionExample type
export interface ActionExample {
  user: string;
  content: { text: string; action?: string };
}

// ProviderResult type
export interface ProviderResult {
  values?: { [key: string]: any };
  data?: { [key: string]: any };
  text?: string;
}

// EvaluationExample type
export interface EvaluationExample {
  prompt?: string;
  context?: string;
  messages: { user?: string; name?: string; content: { text: string } }[];
  outcome: string;
}

// ActionResult type
export interface ActionResult {
  values?: { [key: string]: any };
  data?: { [key: string]: any };
  text?: string;
}

// TestSuite type
export interface TestSuite {
  name: string;
  description?: string;
  tests: TestCase[];
}

// TestCase type
export interface TestCase {
  name: string;
  fn: (runtime: IAgentRuntime) => Promise<void> | void;
}

// TaskMetadata type
export type TaskMetadata = {
  updateInterval?: number;
  options?: {
    name: string;
    description: string;
  }[];
  [key: string]: unknown;
};

// Identity-related types for CoreIdentityProvider
export interface IIdentityManager {
  resolveEntity(context: EntityContext): Promise<EntityResolution>;
  verifyIdentity(entityId: UUID, platform: string, data: any): Promise<VerificationResult>;
  mergeEntities(proposal: MergeProposal): Promise<EntityMergeResult>;
  updatePlatformIdentity(entityId: UUID, platform: string, data: any): Promise<ValidationResult>;
  removePlatformIdentity(entityId: UUID, platform: string): Promise<ValidationResult>;
  searchEntities(query: IdentitySearchQuery): Promise<IdentitySearchResult[]>;
  getEntityHistory(entityId: UUID): Promise<EntityHistory>;
  validateEntity(profile: Partial<IdentityProfile>): Promise<ValidationResult>;
  requestVerification?(entityId: UUID, platform: string): Promise<VerificationResult>;
}

export interface IdentityProfile {
  entityId: UUID;
  name: string;
  platforms: { [platform: string]: any };
  metadata?: Record<string, any>;
}

export interface EntityContext {
  allowCreate?: boolean;
  trustScore?: number;
  metadata?: Record<string, any>;
}

export interface EntityResolution {
  entityId: UUID;
  confidence: number;
  reason: string;
  alternativeMatches?: UUID[];
  metadata?: Record<string, any>;
}

export interface VerificationProof {
  platform: string;
  verified: boolean;
  verifiedAt?: string;
  proof?: any;
  data?: any;
  metadata?: Record<string, any>;
}

export interface VerificationResult {
  success?: boolean;
  verified: boolean;
  confidence?: number;
  platform?: string;
  entityId?: UUID;
  proof?: VerificationProof;
  reason?: string;
  metadata?: Record<string, any>;
}

export interface MergeProposal {
  primaryEntityId: UUID;
  secondaryEntityId: UUID;
  reason: string;
  confidence: number;
  metadata?: Record<string, any>;
}

export interface EntityMergeResult {
  success: boolean;
  mergedEntityId: UUID;
  mergedData: any;
  metadata?: Record<string, any>;
}

export interface EntityHistory {
  entityId: UUID;
  events: any[];
  metadata?: Record<string, any>;
}

export interface IdentitySearchQuery {
  query: string;
  platforms?: string[];
  limit?: number;
  offset?: number;
}

export interface IdentitySearchResult {
  entityId: UUID;
  score: number;
  matches: any[];
}

export interface ValidationResult {
  valid: boolean;
  errors?: string[];
  warnings?: string[];
}

// Additional utility functions not exported from core
export function parseKeyValueXml(xml: string): Record<string, string> {
  const result: Record<string, string> = {};
  const regex = /<(\w+)>(.*?)<\/\1>/g;
  let match;
  while ((match = regex.exec(xml)) !== null) {
    result[match[1]] = match[2];
  }
  return result;
}

export function composePromptFromState(template: string, state: any): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return state.values?.[key] || state.data?.[key] || match;
  });
}

export function composePrompt(params: { state: any; template: string }): string {
  const { state, template } = params;
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return state[key] || state.values?.[key] || state.data?.[key] || match;
  });
}

// Helper function for finding entities by name (since it's not exported from core)
export async function findEntityByName(
  runtime: IAgentRuntime,
  message: Memory,
  state?: State
): Promise<Entity | null> {
  const entityName = message.content.text?.toLowerCase() || '';
  const entities = await runtime.getEntitiesForRoom(message.roomId);

  return (
    entities.find((entity) =>
      entity.names.some((name) => name.toLowerCase().includes(entityName))
    ) || null
  );
}
