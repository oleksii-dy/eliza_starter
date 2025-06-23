// Type declarations for missing @elizaos/core exports
// This file provides compatibility for outdated imports

declare module '@elizaos/core' {
  export type UUID = string;

  export interface Memory {
    id?: UUID;
    entityId: UUID;
    agentId?: UUID;
    roomId: UUID;
    content: Content;
    createdAt?: number;
    embedding?: number[];
    worldId?: UUID;
    unique?: boolean;
    similarity?: number;
    metadata?: any;
  }

  export interface Content {
    text?: string;
    thought?: string;
    actions?: string[];
    providers?: string[];
    source?: string;
    target?: string;
    url?: string;
    inReplyTo?: UUID;
    attachments?: any[];
    [key: string]: unknown;
  }

  export interface State {
    values: { [key: string]: any };
    data: { [key: string]: any };
    text: string;
    [key: string]: any;
  }

  export interface IAgentRuntime {
    agentId: UUID;
    character: any;
    providers: Provider[];
    actions: Action[];
    evaluators: any[];
    plugins: any[];
    services: Map<string, any>;
    events: Map<string, any>;
    fetch?: typeof fetch | null;
    routes: any[];
    getService<T>(service: string): T | null;
    composeState(
      message: Memory,
      includeList?: string[],
      onlyInclude?: boolean,
      skipCache?: boolean
    ): Promise<State>;
    useModel<T>(modelType: string, params: any): Promise<T>;
    processActions(
      message: Memory,
      responses: Memory[],
      state?: State,
      callback?: HandlerCallback
    ): Promise<void>;
    evaluate(
      message: Memory,
      state?: State,
      didRespond?: boolean,
      callback?: HandlerCallback,
      responses?: Memory[]
    ): Promise<any>;
    createMemory(memory: Partial<Memory>, tableName?: string): Promise<Memory>;
    getMemories(params: any): Promise<Memory[]>;
    ensureRoomExists(room: any): Promise<void>;
    updateState(key: string, value: any): Promise<boolean>;
    messageManager: any;
    db: any;
    logger: any;
    getSetting(key: string): string | undefined;
    registerService(service: any): void;
    ensureConnection(params: any): Promise<boolean>;
    emitEvent(eventType: string, data: any): Promise<void>;
    addEmbeddingToMemory(memory: Memory): Promise<void>;
    getParticipantUserState(roomId: UUID, userId: UUID): Promise<any>;
    getRoom(roomId: UUID): Promise<any>;
    getEntityById(entityId: UUID): Promise<Entity | null>;
    createEntity(entity: Partial<Entity>): Promise<Entity>;
    updateEntity(entity: Partial<Entity>): Promise<Entity>;
  }

  export type AgentRuntime = IAgentRuntime;

  export interface Action {
    name: string;
    similes?: string[];
    description: string;
    examples?: ActionExample[][];
    handler: Handler;
    validate: Validator;
    effects?: {
      provides: string[];
      requires: string[];
      modifies: string[];
    };
    estimateCost?: (params: any) => number;
  }

  export interface ActionExample {
    name: string;
    content: Content;
  }

  export interface Provider {
    name: string;
    description?: string;
    dynamic?: boolean;
    position?: number;
    private?: boolean;
    get: (runtime: IAgentRuntime, message: Memory, state: State) => Promise<ProviderResult>;
  }

  export interface ProviderResult {
    values?: { [key: string]: any };
    data?: { [key: string]: any };
    text?: string;
  }

  export interface Plugin {
    name: string;
    description: string;
    init?: (config: Record<string, string>, runtime: IAgentRuntime) => Promise<void>;
    config?: { [key: string]: any };
    services?: any[];
    componentTypes?: any[];
    actions?: Action[];
    providers?: Provider[];
    evaluators?: any[];
    adapter?: any;
    models?: { [key: string]: (...args: any[]) => Promise<any> };
    events?: any;
    routes?: any[];
    tests?: any[];
    dependencies?: string[];
    testDependencies?: string[];
    priority?: number;
    schema?: any;
  }

  export type Handler = (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    options?: { [key: string]: unknown },
    callback?: HandlerCallback,
    responses?: Memory[]
  ) => Promise<any>;

  export type HandlerCallback = (response: Content, files?: any) => Promise<Memory[]>;

  export type Validator = (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State
  ) => Promise<boolean>;

  export interface Entity {
    id?: UUID;
    names: string[];
    metadata?: any;
    agentId: UUID;
    components?: any[];
  }

  export interface Service {
    serviceName: string;
    capabilityDescription: string;
    config?: any;
    stop(): Promise<void>;
    runtime?: IAgentRuntime;
  }

  export abstract class Service {
    static serviceName: string;
    static serviceType?: string;
    serviceName: string;
    abstract capabilityDescription: string;
    config?: any;
    runtime?: IAgentRuntime;

    abstract stop(): Promise<void>;
    static async start(runtime: IAgentRuntime): Promise<any>;
  }

  export interface TestSuite {
    name: string;
    tests: TestCase[];
  }

  export interface TestCase {
    name: string;
    fn: (runtime: IAgentRuntime) => Promise<void> | void;
  }

  export interface MessagePayload {
    entityId: UUID;
    roomId: UUID;
    content: Content;
    runtime?: IAgentRuntime;
    message?: Memory;
    callback?: HandlerCallback;
    onComplete?: () => void;
  }

  export interface MessageReceivedHandlerParams {
    runtime: IAgentRuntime;
    payload: MessagePayload;
    message?: Memory;
    callback?: HandlerCallback;
    onComplete?: () => void;
  }

  export interface EventHandler {
    name: string;
    handler: (params: any) => Promise<void>;
  }

  export enum EventType {
    MESSAGE_RECEIVED = 'MESSAGE_RECEIVED',
    MESSAGE_SENT = 'MESSAGE_SENT',
    ENTITY_JOINED = 'ENTITY_JOINED',
    ENTITY_LEFT = 'ENTITY_LEFT',
    WORLD_JOINED = 'WORLD_JOINED',
    WORLD_LEFT = 'WORLD_LEFT',
    ROOM_JOINED = 'ROOM_JOINED',
    ROOM_LEFT = 'ROOM_LEFT',
    RUN_STARTED = 'RUN_STARTED',
    RUN_ENDED = 'RUN_ENDED',
    RUN_TIMEOUT = 'RUN_TIMEOUT',
  }

  export enum ModelType {
    TEXT_SMALL = 'TEXT_SMALL',
    TEXT_LARGE = 'TEXT_LARGE',
    TEXT_EMBEDDING = 'TEXT_EMBEDDING',
    TEXT_TOKENIZER_ENCODE = 'TEXT_TOKENIZER_ENCODE',
    TEXT_TOKENIZER_DECODE = 'TEXT_TOKENIZER_DECODE',
    TEXT_REASONING_SMALL = 'REASONING_SMALL',
    TEXT_REASONING_LARGE = 'REASONING_LARGE',
    TEXT_COMPLETION = 'TEXT_COMPLETION',
    IMAGE = 'IMAGE',
    IMAGE_DESCRIPTION = 'IMAGE_DESCRIPTION',
    TRANSCRIPTION = 'TRANSCRIPTION',
    TEXT_TO_SPEECH = 'TEXT_TO_SPEECH',
    AUDIO = 'AUDIO',
    VIDEO = 'VIDEO',
    OBJECT_SMALL = 'OBJECT_SMALL',
    OBJECT_LARGE = 'OBJECT_LARGE',
  }

  export enum ChannelType {
    SELF = 'SELF',
    DM = 'DM',
    GROUP = 'GROUP',
    VOICE_DM = 'VOICE_DM',
    VOICE_GROUP = 'VOICE_GROUP',
    FEED = 'FEED',
    THREAD = 'THREAD',
    WORLD = 'WORLD',
    FORUM = 'FORUM',
    API = 'API',
  }

  export enum ServiceType {
    UNKNOWN = 'UNKNOWN',
    TRANSCRIPTION = 'transcription',
    VIDEO = 'video',
    BROWSER = 'browser',
    PDF = 'pdf',
    REMOTE_FILES = 'aws_s3',
    WEB_SEARCH = 'web_search',
    EMAIL = 'email',
    TEE = 'tee',
    TASK = 'task',
    WALLET = 'wallet',
    LP_POOL = 'lp_pool',
    TOKEN_DATA = 'token_data',
    TUNNEL = 'tunnel',
  }

  // Utility functions
  export function createUniqueUuid(runtime: IAgentRuntime, seed?: string): UUID;
  export function asUUID(id: string): UUID;
  export function composePromptFromState(
    params: { state: State; template: string } | State
  ): string;
  export function parseKeyValueXml(xml: string): any;
  export function truncateToCompleteSentence(text: string, maxLength?: number): string;
  export function addHeader(content: string, header: string): string;
  export function composeActionExamples(actions: Action[]): string;
  export function formatActionNames(actions: Action[]): string;
  export function formatTimestamp(timestamp: number): string;
  export function getEntityDetails(entity: Entity): string;
  export const logger: any;
}
