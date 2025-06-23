/**
 * Core type definitions and re-exports
 * This file centralizes all type imports from @elizaos/core and provides
 * local definitions for any types that may be missing or renamed.
 */

// Try to import what's available from @elizaos/core
import { logger, Service, ModelType, stringToUuid, ChannelType } from '@elizaos/core';

// Re-export what we successfully imported
export { logger, Service, ModelType, stringToUuid, ChannelType };

// Define UUID type locally
export type UUID = `${string}-${string}-${string}-${string}-${string}`;

// Define IAgentRuntime interface locally
export interface IAgentRuntime {
  agentId: UUID;
  getService(name: string): Service | null;
  getMemories(params: { roomId?: UUID; tableName?: string; count?: number; unique?: boolean }): Promise<Memory[]>;
  getEntitiesForRoom(roomId: UUID): Promise<Entity[]>;
  getEntityById(entityId: UUID): Promise<Entity | null>;
  getEntitiesByIds(entityIds: UUID[]): Promise<Entity[]>;
  getRoom(roomId: UUID): Promise<Room | null>;
  getRooms(worldId: UUID): Promise<Room[]>;
  getRoomsForParticipant(entityId: UUID): Promise<UUID[]>;
  getRelationships(params: { entityId?: UUID; sourceEntityId?: UUID; targetEntityId?: UUID }): Promise<Relationship[]>;
  createRelationship(relationship: Partial<Relationship>): Promise<Relationship>;
  updateRelationship(relationship: Relationship): Promise<Relationship>;
  getComponents(roomId: UUID, worldId: UUID, agentId: UUID): Promise<Component[]>;
  getComponent(entityId: UUID, type: string, worldId: UUID, sourceEntityId?: UUID): Promise<Component | null>;
  createComponent(component: Partial<Component>): Promise<Component>;
  updateComponent(component: Component): Promise<Component>;
  createEntity(entity: Partial<Entity>): Promise<Entity>;
  updateEntity(entity: Entity): Promise<Entity>;
  useModel(model: typeof ModelType[keyof typeof ModelType], params: { prompt?: string; messages?: any[] }): Promise<string>;
  getCache<T>(key: string): Promise<T | null>;
  setCache<T>(key: string, value: T): Promise<void>;
  getConversationLength(): number;
  messageManager: { createMemory(memory: Memory): Promise<void> };
  character: Character;
}

// Define Memory interface
export interface Memory {
  id?: UUID;
  entityId: UUID;
  agentId: UUID;
  content: Content;
  roomId: UUID;
  createdAt?: number;
}

// Define Content interface
export interface Content {
  text?: string;
  action?: string;
  source?: string;
  metadata?: Record<string, any>;
  [key: string]: any;
}

// Define State interface
export interface State {
  values?: Record<string, any>;
  data?: Record<string, any>;
  text?: string;
  roomId?: UUID;
  [key: string]: any;
}

// Define Entity interface
export interface Entity {
  id?: UUID;
  agentId: UUID;
  names: string[];
  metadata?: Record<string, any>;
}

// Define Room interface
export interface Room {
  id: UUID;
  worldId: UUID;
  name?: string;
  metadata?: Record<string, any>;
}

// Define Relationship interface
export interface Relationship {
  id?: UUID;
  sourceEntityId: UUID;
  targetEntityId: UUID;
  tags?: string[];
  metadata?: Record<string, any>;
  strength?: number;
  relationshipType?: string;
  createdAt?: number;
}

// Define Component interface
export interface Component {
  id: UUID;
  entityId: UUID;
  worldId: UUID;
  type: string;
  data: any;
  agentId: UUID;
  roomId: UUID;
  sourceEntityId?: UUID;
  createdAt: number;
}

// Define World interface
export interface World {
  id: UUID;
  name: string;
  metadata?: Record<string, any>;
}

// Define Task interface
export interface Task {
  id: UUID;
  name: string;
  description?: string;
  metadata?: TaskMetadata;
}

// Define Character interface
export interface Character {
  name: string;
  templates?: {
    reflectionTemplate?: string;
    [key: string]: string | undefined;
  };
  [key: string]: any;
}

// Define Action interface
export interface Action {
  name: string;
  description: string;
  similes?: string[];
  examples?: ActionExample[][];
  validate: Validator;
  handler: Handler;
}

// Define Provider interface
export interface Provider {
  name: string;
  description?: string;
  get: (runtime: IAgentRuntime, state?: State) => Promise<ProviderResult>;
}

// Define Evaluator interface
export interface Evaluator {
  name: string;
  description: string;
  similes?: string[];
  examples?: EvaluationExample[];
  validate: Validator;
  handler: Handler;
}

// Define Plugin interface
export interface Plugin {
  name: string;
  description?: string;
  actions?: Action[];
  providers?: Provider[];
  evaluators?: Evaluator[];
  services?: Service[];
}

// Define Handler type
export type Handler = (
  runtime: IAgentRuntime,
  message: Memory,
  state?: State,
  options?: any,
  callback?: HandlerCallback
) => Promise<ActionResult>;

// Define HandlerCallback type
export type HandlerCallback = (response: any) => Promise<void> | void;

// Define Validator type
export type Validator = (
  runtime: IAgentRuntime,
  message: Memory,
  state?: State
) => Promise<boolean>;

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
  user?: string;
  name?: string;
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
