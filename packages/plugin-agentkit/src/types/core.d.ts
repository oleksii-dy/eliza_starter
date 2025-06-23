// Temporary type definitions until core module is properly built
// These are based on the actual core types but defined locally

export type UUID = `${string}-${string}-${string}-${string}-${string}`;

export interface Memory {
  id?: UUID;
  entityId: UUID;
  agentId?: UUID;
  createdAt?: number;
  content: Content;
  embedding?: number[];
  roomId: UUID;
  worldId?: UUID;
  unique?: boolean;
  similarity?: number;
  metadata?: any;
}

export interface Content {
  thought?: string;
  text?: string;
  actions?: string[];
  providers?: string[];
  source?: string;
  target?: string;
  url?: string;
  inReplyTo?: UUID;
  attachments?: any[];
  channelType?: string;
  [key: string]: unknown;
}

export interface State {
  values: { [key: string]: any };
  data: { [key: string]: any };
  text: string;
  [key: string]: any;
}

export type HandlerCallback = (response: Content, files?: any) => Promise<Memory[]>;

export type Handler = (
  runtime: IAgentRuntime,
  message: Memory,
  state?: State,
  options?: { [key: string]: unknown },
  callback?: HandlerCallback,
  responses?: Memory[]
) => Promise<any>;

export type Validator = (
  runtime: IAgentRuntime,
  message: Memory,
  state?: State
) => Promise<boolean>;

export interface Action {
  name: string;
  similes?: string[];
  description: string;
  examples?: ActionExample[][];
  handler: Handler;
  validate: Validator;
}

export interface ActionExample {
  name: string;
  content: {
    text: string;
    thought?: string;
    actions?: string[];
  };
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

export interface Character {
  id?: UUID;
  name: string;
  username?: string;
  system?: string;
  bio: string | string[];
  messageExamples?: any[][];
  postExamples?: string[];
  topics?: string[];
  knowledge?: any[];
  plugins?: string[];
  settings?: { [key: string]: any };
  secrets?: { [key: string]: string | boolean | number };
  style?: {
    all?: string[];
    chat?: string[];
    post?: string[];
  };
}

export interface Plugin {
  name: string;
  description: string;
  init?: (config: Record<string, string>, runtime: IAgentRuntime) => Promise<void>;
  config?: { [key: string]: any };
  services?: any[];
  actions?: Action[];
  providers?: Provider[];
  evaluators?: any[];
  adapter?: any;
  models?: { [key: string]: (...args: any[]) => Promise<any> };
  events?: any;
  routes?: Route[];
  tests?: TestSuite[];
}

export interface Route {
  path: string;
  type: string;
  name?: string;
  handler: (req: any, res: any, runtime: IAgentRuntime) => Promise<void>;
}

export interface TestSuite {
  name: string;
  tests: TestCase[];
}

export interface TestCase {
  name: string;
  fn: (runtime: IAgentRuntime) => Promise<void> | void;
}

export interface IAgentRuntime {
  agentId: UUID;
  character: Character;
  providers: Provider[];
  actions: Action[];
  evaluators: any[];
  plugins: Plugin[];
  services: Map<string, any>;
  events: Map<string, ((params: any) => Promise<void>)[]>;
  fetch?: typeof fetch | null;
  routes: Route[];

  getService<T = any>(service: string): T | null;
  composeState(
    message: Memory,
    includeList?: string[],
    onlyInclude?: boolean,
    skipCache?: boolean
  ): Promise<State>;
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
  ): Promise<any[] | null>;

  // Database methods
  db?: any;
  databaseAdapter?: { db: any };

  // Logging
  logger: {
    info: (...args: any[]) => void;
    error: (...args: any[]) => void;
    warn: (...args: any[]) => void;
    debug: (...args: any[]) => void;
  };

  [key: string]: any;
}

export type ServiceTypeName = string;

export abstract class Service {
  static serviceName: string;
  static serviceType?: ServiceTypeName;
  serviceName: string;
  abstract capabilityDescription: string;
  config?: any;
  runtime: IAgentRuntime;

  constructor(runtime: IAgentRuntime) {
    this.runtime = runtime;
    this.serviceName = (this.constructor as any).serviceName;
  }

  abstract stop(): Promise<void>;
  static async start(runtime: IAgentRuntime): Promise<Service> {
    throw new Error('Start method must be implemented');
  }
}

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

export const elizaLogger = {
  info: (...args: any[]) => console.log('[INFO]', ...args),
  error: (...args: any[]) => console.error('[ERROR]', ...args),
  warn: (...args: any[]) => console.warn('[WARN]', ...args),
  debug: (...args: any[]) => console.debug('[DEBUG]', ...args),
};

export const logger = elizaLogger;
