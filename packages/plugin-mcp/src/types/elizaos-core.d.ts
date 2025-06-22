declare module "@elizaos/core" {
  export interface IAgentRuntime {
    agentId: string;
    character: any;
    getSetting(key: string): string | undefined;
    getService(name: string): any;
    useModel(modelType: string, params: any): Promise<any>;
    generateText(params: any): Promise<string>;
    messageManager: any;
    composeState(message: Memory, providers?: string[], dynamic?: boolean): Promise<State>;
    updateState(state: State): Promise<void>;
    actions: Action[];
    providers: Provider[];
    evaluators: any[];
    routes?: Route[];
    createComponent(component: any): Promise<void>;
    getComponents(query: any): Promise<any[]>;
    updateComponent(component: any): Promise<void>;
    db: any;
    logger: {
      info: (...args: any[]) => void;
      warn: (...args: any[]) => void;
      error: (...args: any[]) => void;
      debug: (...args: any[]) => void;
      trace?: (...args: any[]) => void;
    };
    addEmbeddingToMemory(memory: Partial<Memory>): Promise<Memory>;
    createMemory(memory: Memory, tableName?: string, unique?: boolean): Promise<void>;
  }

  export interface Memory {
    id?: string;
    entityId: string;
    roomId: string;
    agentId?: string;
    worldId?: string;
    content: Content;
    createdAt?: number;
    embedding?: number[];
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
    inReplyTo?: string;
    attachments?: any[];
    channelType?: string;
    [key: string]: any;
  }

  export interface State {
    values: { [key: string]: any };
    data: { [key: string]: any };
    text: string;
    [key: string]: any;
  }

  export interface Action {
    name: string;
    similes?: string[];
    description: string;
    examples?: any[][];
    handler: Handler;
    validate: Validator;
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

  export type Handler = (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    options?: { [key: string]: any },
    callback?: HandlerCallback,
    responses?: Memory[]
  ) => Promise<any>;

  export type Validator = (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State
  ) => Promise<boolean>;

  export type HandlerCallback = (response: Content, files?: any) => Promise<Memory[]>;

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
    tests?: any[];
  }

  export interface Route {
    method?: string;
    type?: string;
    path: string;
    public?: boolean;
    name?: string;
    handler: (req: any, res: any, runtime: IAgentRuntime) => Promise<any>;
  }

  export abstract class Service {
    static serviceName: string;
    static serviceType?: string;
    serviceName: string;
    abstract capabilityDescription: string;
    config?: any;
    protected runtime: IAgentRuntime;

    constructor(runtime: IAgentRuntime);
    abstract stop(): Promise<void>;
    static async start(runtime: IAgentRuntime): Promise<Service>;
  }

  export const logger: {
    info: (...args: any[]) => void;
    warn: (...args: any[]) => void;
    error: (...args: any[]) => void;
    debug: (...args: any[]) => void;
  };

  export function composePromptFromState(params: { state: State; template: string }): string;
  
  // Additional types
  export interface TestSuite {
    name: string;
    tests: TestCase[];
  }
  
  export interface TestCase {
    name: string;
    fn: (runtime: IAgentRuntime) => Promise<void> | void;
  }
  
  export interface Scenario {
    id: string;
    name: string;
    description: string;
    category: string;
    tags: string[];
    actors: any[];
    verification: any;
    setup?: any;
    execution?: any;
  }
  
  export enum ContentType {
    TEXT = "text",
    IMAGE = "image",
    VIDEO = "video",
    AUDIO = "audio",
    FILE = "file",
    DOCUMENT = "document",
  }
  
  export interface Media {
    type: ContentType;
    url: string;
    title?: string;
    description?: string;
    contentType?: string;
    id?: string;
    source?: string;
    text?: string;
  }
  
  export function createUniqueUuid(runtime?: IAgentRuntime, entityId?: string): string;
  
  export const ModelType: {
    TEXT_SMALL: string;
    TEXT_LARGE: string;
    TEXT_EMBEDDING: string;
    TEXT_TOKENIZER_ENCODE: string;
    TEXT_TOKENIZER_DECODE: string;
    TEXT_REASONING_SMALL: string;
    TEXT_REASONING_LARGE: string;
    TEXT_COMPLETION: string;
    IMAGE: string;
    IMAGE_DESCRIPTION: string;
    TRANSCRIPTION: string;
    TEXT_TO_SPEECH: string;
    AUDIO: string;
    VIDEO: string;
    OBJECT_SMALL: string;
    OBJECT_LARGE: string;
  };
} 