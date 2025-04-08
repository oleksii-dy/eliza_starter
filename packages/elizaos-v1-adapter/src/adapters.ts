/**
 * ElizaOS v1 to v2 Adapter
 *
 * This adapter provides compatibility between v1 plugin code and the v2 ElizaOS API.
 * It wraps the v2 runtime and exposes v1-compatible interfaces and methods.
 */

import {
  IAgentRuntime,
  Memory,
  State,
  Content,
  ModelType,
  UUID,
  Provider,
  ProviderResult,
  Action,
  Evaluator,
  Service,
  Handler,
  HandlerCallback,
  Validator,
} from '@elizaos/core-plugin-v2';

/**
 * Legacy imports that are mapped to v2 equivalents
 */
export enum ModelClass {
  SMALL = 'small',
  MEDIUM = 'medium',
  LARGE = 'large',
  EMBEDDING = 'embedding',
  IMAGE = 'image',
}

/**
 * Maps v1 ModelClass to v2 ModelType
 */
export const ModelClassToModelType = {
  [ModelClass.SMALL]: ModelType.TEXT_SMALL,
  [ModelClass.MEDIUM]: ModelType.TEXT_LARGE,
  [ModelClass.LARGE]: ModelType.TEXT_LARGE,
  [ModelClass.EMBEDDING]: ModelType.TEXT_EMBEDDING,
  [ModelClass.IMAGE]: ModelType.IMAGE,
};

/**
 * Legacy ServiceType enum for v1 compatibility
 */
export enum ServiceType {
  IMAGE_DESCRIPTION = 'image_description',
  TRANSCRIPTION = 'transcription',
  VIDEO = 'video',
  TEXT_GENERATION = 'text_generation',
  BROWSER = 'browser',
  SPEECH_GENERATION = 'speech_generation',
  PDF = 'pdf',
  INTIFACE = 'intiface',
  AWS_S3 = 'aws_s3',
  BUTTPLUG = 'buttplug',
  SLACK = 'slack',
  VERIFIABLE_LOGGING = 'verifiable_logging',
  IRYS = 'irys',
  TEE_LOG = 'tee_log',
  GOPLUS_SECURITY = 'goplus_security',
  WEB_SEARCH = 'web_search',
  EMAIL_AUTOMATION = 'email_automation',
  NKN_CLIENT_SERVICE = 'nkn_client_service',
}

/**
 * Maps v1 ServiceType to v2 ServiceType
 */
export const ServiceTypeMap = {
  [ServiceType.IMAGE_DESCRIPTION]: ModelType.IMAGE_DESCRIPTION,
  [ServiceType.TRANSCRIPTION]: 'transcription',
  [ServiceType.VIDEO]: 'video',
  [ServiceType.TEXT_GENERATION]: ModelType.TEXT_LARGE,
  [ServiceType.BROWSER]: 'browser',
  [ServiceType.SPEECH_GENERATION]: ModelType.TEXT_TO_SPEECH,
  [ServiceType.PDF]: 'pdf',
  [ServiceType.AWS_S3]: 'remote_files',
  [ServiceType.WEB_SEARCH]: 'web_search',
  // Add mappings for other service types as needed
};

/**
 * Legacy v1-style ICacheManager interface
 */
export interface ICacheManager {
  get<T = unknown>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T, options?: any): Promise<void>;
  delete(key: string): Promise<void>;
}

/**
 * Legacy v1-style IMemoryManager interface
 */
export interface IMemoryManager {
  tableName: string;

  addEmbeddingToMemory(memory: Memory): Promise<Memory>;

  getMemories(opts: {
    roomId: UUID;
    count?: number;
    unique?: boolean;
    start?: number;
    end?: number;
  }): Promise<Memory[]>;

  getMemoryById(id: UUID): Promise<Memory | null>;

  getMemoriesByRoomIds(params: { roomIds: UUID[]; limit?: number }): Promise<Memory[]>;

  searchMemoriesByEmbedding(
    embedding: number[],
    opts: {
      match_threshold?: number;
      count?: number;
      roomId: UUID;
      unique?: boolean;
    }
  ): Promise<Memory[]>;

  createMemory(memory: Memory, unique?: boolean): Promise<void>;

  removeMemory(memoryId: UUID): Promise<void>;

  removeAllMemories(roomId: UUID): Promise<void>;

  countMemories(roomId: UUID, unique?: boolean): Promise<number>;
}

/**
 * Legacy v1-style IRAGKnowledgeManager interface
 */
export interface IRAGKnowledgeManager {
  tableName: string;

  getKnowledge(params: any): Promise<any[]>;
  createKnowledge(item: any): Promise<void>;
  removeKnowledge(id: UUID): Promise<void>;
  searchKnowledge(params: any): Promise<any[]>;
  clearKnowledge(shared?: boolean): Promise<void>;
}

/**
 * Adapter for v1-style ActionExample to v2
 */
export function adaptActionExample(example: any) {
  if (!example) return example;

  if (example.user) {
    return {
      ...example,
      name: example.user,
      user: undefined,
    };
  }
  return example;
}

/**
 * Adapter for v1-style Content to v2
 */
export function adaptContent(content: any): Content {
  if (!content) return { text: '' };

  const result: Content = { ...content };

  // Convert action to actions array if it exists
  if (content.action) {
    result.actions = Array.isArray(content.action) ? content.action : [content.action];
    delete result.action;
  }

  return result;
}

/**
 * Adapter for v1-style Memory to v2
 * Converts userId to entityId
 */
export function adaptMemory(memory: any): Memory {
  if (!memory) return memory;

  const result: Memory = { ...memory };

  // Convert userId to entityId if it exists
  if (memory.userId) {
    result.entityId = memory.userId;
    delete result.userId;
  }

  // Adapt content if needed
  if (memory.content) {
    result.content = adaptContent(memory.content);
  }

  return result;
}

/**
 * Adapter for v1-style Provider to v2
 */
export function adaptProvider(provider: any): Provider {
  if (!provider) return provider;

  return {
    name: provider.name || 'Adapted Provider',
    description: provider.description || 'Provider adapted from v1',
    get: async (runtime: IAgentRuntime, message: Memory, state: State) => {
      const result = await provider.get(runtime, message, state);

      // Convert to v2 ProviderResult format
      const providerResult: ProviderResult = {
        values: {},
        data: {},
        text: '',
      };

      if (typeof result === 'string') {
        providerResult.text = result;
      } else if (result && typeof result === 'object') {
        providerResult.values = result;
      }

      return providerResult;
    },
  };
}

/**
 * Adapter for v1-style Action to v2
 */
export function adaptAction(action: any): Action {
  if (!action) return action;

  return {
    ...action,
    // Adapt examples if they exist
    examples: action.examples
      ? action.examples.map((group: any[]) => group.map((example) => adaptActionExample(example)))
      : undefined,

    // Wrap handler to provide v1 compatibility
    handler: adaptHandler(action.handler),
  };
}

/**
 * Adapter for v1-style Evaluator to v2
 */
export function adaptEvaluator(evaluator: any): Evaluator {
  if (!evaluator) return evaluator;

  return {
    ...evaluator,
    // Handle examples which now use 'prompt' instead of 'context'
    examples: evaluator.examples
      ? evaluator.examples.map((example: any) => ({
          ...example,
          prompt: example.context || example.prompt,
        }))
      : [],

    // Wrap handler to provide v1 compatibility
    handler: adaptHandler(evaluator.handler),
  };
}

/**
 * Adapter for v1-style handler functions to v2
 * Handles the new 'responses' parameter
 */
export function adaptHandler(handler: Function): Handler {
  return async (runtime, message, state, options, callback, responses) => {
    // Create a runtime adapter to provide v1 methods
    const adaptedRuntime = new RuntimeAdapter(runtime);

    // Call the original handler with the adapted runtime
    // Note: v1 handlers don't have the 'responses' parameter
    return handler(adaptedRuntime, message, state, options, callback);
  };
}

/**
 * Adapter for v1-style validator functions to v2
 */
export function adaptValidator(validator: Function): Validator {
  return async (runtime, message, state) => {
    // Create a runtime adapter to provide v1 methods
    const adaptedRuntime = new RuntimeAdapter(runtime);

    // Call the original validator with the adapted runtime
    return validator(adaptedRuntime, message, state);
  };
}

/**
 * Main adapter class that wraps the v2 runtime and provides v1-compatible interfaces
 */
export class RuntimeAdapter implements IAgentRuntime {
  // The wrapped v2 runtime
  private runtime: IAgentRuntime;

  // Memory manager cache for different tables
  private memoryManagers: Map<string, IMemoryManager> = new Map();

  /**
   * Create a new RuntimeAdapter wrapping a v2 runtime
   */
  constructor(runtime: IAgentRuntime) {
    this.runtime = runtime;

    // Expose all runtime properties directly
    Object.setPrototypeOf(this, runtime);
  }

  /**
   * Get or create a memory manager for the specified table
   */
  getMemoryManager(tableName: string): IMemoryManager {
    if (!this.memoryManagers.has(tableName)) {
      this.memoryManagers.set(tableName, this.createMemoryManager(tableName));
    }
    return this.memoryManagers.get(tableName)!;
  }

  /**
   * Create a new memory manager for the specified table
   */
  private createMemoryManager(tableName: string): IMemoryManager {
    return {
      tableName,

      // Implement each method to delegate to the v2 runtime
      addEmbeddingToMemory: async (memory: Memory) => {
        // Map userId to entityId if needed
        const adaptedMemory = adaptMemory(memory);
        return this.runtime.addEmbeddingToMemory(adaptedMemory);
      },

      getMemories: async (opts: {
        roomId: UUID;
        count?: number;
        unique?: boolean;
        start?: number;
        end?: number;
      }) => {
        return this.runtime.getMemories({
          ...opts,
          tableName,
        });
      },

      getMemoryById: async (id: UUID) => {
        return this.runtime.getMemoryById(id);
      },

      getMemoriesByRoomIds: async (params: { roomIds: UUID[]; limit?: number }) => {
        return this.runtime.getMemoriesByRoomIds({
          ...params,
          tableName,
        });
      },

      searchMemoriesByEmbedding: async (
        embedding: number[],
        opts: {
          match_threshold?: number;
          count?: number;
          roomId: UUID;
          unique?: boolean;
        }
      ) => {
        return this.runtime.searchMemories({
          ...opts,
          embedding,
          tableName,
        });
      },

      createMemory: async (memory: Memory, unique?: boolean) => {
        // Map userId to entityId if needed
        const adaptedMemory = adaptMemory(memory);
        await this.runtime.createMemory(adaptedMemory, tableName, unique);
        return;
      },

      removeMemory: async (memoryId: UUID) => {
        await this.runtime.deleteMemory(memoryId);
        return;
      },

      removeAllMemories: async (roomId: UUID) => {
        await this.runtime.deleteAllMemories(roomId, tableName);
        return;
      },

      countMemories: async (roomId: UUID, unique?: boolean) => {
        return this.runtime.countMemories(roomId, unique, tableName);
      },
    };
  }

  /**
   * Message manager property for v1 compatibility
   */
  get messageManager(): IMemoryManager {
    return this.getMemoryManager('message');
  }

  /**
   * Description manager property for v1 compatibility
   */
  get descriptionManager(): IMemoryManager {
    return this.getMemoryManager('description');
  }

  /**
   * Documents manager property for v1 compatibility
   */
  get documentsManager(): IMemoryManager {
    return this.getMemoryManager('document');
  }

  /**
   * Knowledge manager property for v1 compatibility
   */
  get knowledgeManager(): IMemoryManager {
    return this.getMemoryManager('knowledge');
  }

  /**
   * Lore manager property for v1 compatibility
   */
  get loreManager(): IMemoryManager {
    return this.getMemoryManager('lore');
  }

  /**
   * RAG knowledge manager property for v1 compatibility
   */
  get ragKnowledgeManager(): IRAGKnowledgeManager {
    return {
      tableName: 'knowledge',

      getKnowledge: async (params: any) => {
        return this.runtime.getKnowledge(params);
      },

      createKnowledge: async (item: any) => {
        await this.runtime.addKnowledge(item, {
          targetTokens: 500, // Default values, adjust as needed
          overlap: 50,
          modelContextSize: 8000,
        });
        return;
      },

      removeKnowledge: async (id: UUID) => {
        // Use deleteMemory if appropriate
        await this.runtime.deleteMemory(id);
        return;
      },

      searchKnowledge: async (params: any) => {
        // This would need a custom implementation based on v2 methods
        // For now, we're returning an empty array
        console.warn('v1-adapter: searchKnowledge not fully implemented');
        return [];
      },

      clearKnowledge: async (shared?: boolean) => {
        // This would need a custom implementation based on v2 methods
        console.warn('v1-adapter: clearKnowledge not fully implemented');
        return;
      },
    };
  }

  /**
   * Cache manager property for v1 compatibility
   */
  get cacheManager(): ICacheManager {
    return {
      get: async <T>(key: string): Promise<T | undefined> => {
        return this.runtime.getCache<T>(key);
      },

      set: async <T>(key: string, value: T, options?: any): Promise<void> => {
        await this.runtime.setCache(key, value);
        return;
      },

      delete: async (key: string): Promise<void> => {
        await this.runtime.deleteCache(key);
        return;
      },
    };
  }

  /**
   * Compose state method for v1 compatibility
   */
  composeState(message: Memory, additionalKeys?: { [key: string]: unknown }): Promise<State> {
    // Adapt message if needed
    const adaptedMessage = adaptMemory(message);

    // Create a filterList to get only the keys needed for v1 state
    // We'll customize the response after getting the state
    return this.runtime.composeState(adaptedMessage).then((state) => {
      // Enhance state with v1-compatible fields
      this.enhanceStateWithV1Fields(state, adaptedMessage, additionalKeys);
      return state;
    });
  }

  /**
   * Enhance a v2 state with v1-compatible fields
   */
  private async enhanceStateWithV1Fields(
    state: State,
    message: Memory,
    additionalKeys?: { [key: string]: unknown }
  ): Promise<void> {
    // Add userId from entityId
    state.userId = message.entityId;

    // Add agentId
    state.agentId = this.runtime.agentId;

    // Add roomId
    state.roomId = message.roomId;

    // Add bio from state.values
    state.bio = state.values.bio || '';

    // Add lore from state.values
    state.lore = state.values.lore || '';

    // Add message directions from state.values
    state.messageDirections = state.values.messageDirections || '';

    // Add post directions from state.values
    state.postDirections = state.values.postDirections || '';

    // Add agent name from state.values
    state.agentName = state.values.agentName || '';

    // Add sender name from state.values
    state.senderName = state.values.senderName || '';

    // Add actors from state.values
    state.actors = state.values.actors || '';

    // Add actors data from state.data
    state.actorsData = state.data.actorsData || [];

    // Add goals from state.values
    state.goals = state.values.goals || '';

    // Add goals data from state.data
    state.goalsData = state.data.goalsData || [];

    // Add recent messages from state.values
    state.recentMessages = state.values.recentMessages || '';

    // Add recent messages data from state.data
    state.recentMessagesData = state.data.recentMessagesData || [];

    // Add action names from state.values
    state.actionNames = state.values.actionNames || '';

    // Add actions from state.values
    state.actions = state.values.actions || '';

    // Add actions data from state.data
    state.actionsData = state.data.actionsData || [];

    // Add action examples from state.values
    state.actionExamples = state.values.actionExamples || '';

    // Add providers from state.values
    state.providers = state.values.providers || '';

    // Add response data from state.data
    state.responseData = state.data.responseData || {};

    // Add recent interactions data from state.data
    state.recentInteractionsData = state.data.recentInteractionsData || [];

    // Add recent interactions from state.values
    state.recentInteractions = state.values.recentInteractions || '';

    // Add formatted conversation from state.values
    state.formattedConversation = state.values.formattedConversation || '';

    // Add knowledge from state.values
    state.knowledge = state.values.knowledge || '';

    // Add knowledge data from state.data
    state.knowledgeData = state.data.knowledgeData || [];

    // Add RAG knowledge data from state.data
    state.ragKnowledgeData = state.data.ragKnowledgeData || [];

    // Add additional keys if provided
    if (additionalKeys) {
      Object.assign(state, additionalKeys);
    }
  }

  /**
   * Update recent message state method for v1 compatibility
   */
  updateRecentMessageState(state: State): Promise<State> {
    // Forward to runtime.composeState with the existing state
    // and enhance with v1 fields
    return this.runtime
      .composeState({
        entityId: (state.userId as UUID) || (state.values?.entityId as UUID),
        roomId: state.roomId as UUID,
        content: { text: '' },
      })
      .then((newState) => {
        this.enhanceStateWithV1Fields(newState, {
          entityId: (state.userId as UUID) || (state.values?.entityId as UUID),
          roomId: state.roomId as UUID,
          content: { text: '' },
        } as Memory);
        return newState;
      });
  }

  /**
   * Ensure connection method for v1 compatibility
   */
  ensureConnection(
    userId: UUID,
    roomId: UUID,
    userName?: string,
    userScreenName?: string,
    source?: string
  ): Promise<void> {
    return this.runtime.ensureConnection({
      entityId: userId,
      roomId: roomId,
      userName: userName,
      name: userScreenName,
      source: source,
      type: 'DM', // Default channel type
    });
  }

  /**
   * Process actions method for v1 compatibility
   */
  processActions(
    message: Memory,
    responses: Memory[],
    state?: State,
    callback?: HandlerCallback
  ): Promise<void> {
    // Adapt message if needed
    const adaptedMessage = adaptMemory(message);

    return this.runtime.processActions(adaptedMessage, responses, state, callback);
  }

  /**
   * Evaluate method for v1 compatibility
   */
  evaluate(
    message: Memory,
    state?: State,
    didRespond?: boolean,
    callback?: HandlerCallback
  ): Promise<string[] | null> {
    // Adapt message if needed
    const adaptedMessage = adaptMemory(message);

    return this.runtime.evaluate(adaptedMessage, state, didRespond, callback).then((evaluators) => {
      if (!evaluators) return null;
      // Return evaluator names for v1 compatibility
      return evaluators.map((e) => e.name);
    });
  }

  /**
   * Register action method for v1 compatibility
   */
  registerAction(action: any): void {
    // Adapt action if needed
    const adaptedAction = adaptAction(action);

    this.runtime.registerAction(adaptedAction);
  }

  /**
   * Get service method for v1 compatibility
   */
  getService<T extends Service>(serviceType: ServiceType | string): T | null {
    // Map v1 service type to v2 if needed
    const mappedType = ServiceTypeMap[serviceType as ServiceType] || serviceType;

    return this.runtime.getService<T>(mappedType);
  }

  /**
   * Legacy generate text helper for v1 compatibility
   */
  async generateText(
    prompt: string,
    modelClass: ModelClass = ModelClass.LARGE,
    temperature: number = 0.7,
    maxTokens: number = 500,
    stopSequences: string[] = []
  ): Promise<string> {
    // Map v1 model class to v2 model type
    const modelType = ModelClassToModelType[modelClass];

    return this.runtime.useModel(modelType, {
      runtime: this.runtime,
      prompt,
      temperature,
      maxTokens,
      stopSequences,
    });
  }

  /**
   * Legacy generate object helper for v1 compatibility
   */
  async generateObject<T = any>(
    prompt: string,
    schema?: any,
    modelClass: ModelClass = ModelClass.LARGE,
    temperature: number = 0.2,
    maxTokens: number = 1000,
    stopSequences: string[] = []
  ): Promise<T> {
    return this.runtime.useModel(ModelType.OBJECT_SMALL, {
      runtime: this.runtime,
      prompt,
      schema,
      temperature,
      stopSequences,
    });
  }

  /**
   * Legacy generate object deprecated helper for v1 compatibility
   */
  async generateObjectDeprecated<T = any>(
    context: string,
    schema?: any,
    modelClass: ModelClass = ModelClass.LARGE,
    temperature: number = 0.2,
    maxTokens: number = 1000,
    stopSequences: string[] = []
  ): Promise<T> {
    return this.generateObject<T>(
      context,
      schema,
      modelClass,
      temperature,
      maxTokens,
      stopSequences
    );
  }

  /**
   * Legacy generate image helper for v1 compatibility
   */
  async generateImage(
    prompt: string,
    size: string = '1024x1024',
    count: number = 1
  ): Promise<{ url: string }[]> {
    return this.runtime.useModel(ModelType.IMAGE, {
      runtime: this.runtime,
      prompt,
      size,
      count,
    });
  }

  /**
   * Legacy compose context helper for v1 compatibility
   */
  async composeContext(state: State, template: string): Promise<string> {
    // Simple template substitution from state
    let result = template;

    // Handle v1 state field substitutions
    for (const key in state) {
      const value = state[key];
      if (typeof value === 'string') {
        const regex = new RegExp(`{{${key}}}`, 'g');
        result = result.replace(regex, value);
      }
    }

    // Handle v2 state field substitutions
    for (const key in state.values) {
      const value = state.values[key];
      if (typeof value === 'string') {
        const regex = new RegExp(`{{${key}}}`, 'g');
        result = result.replace(regex, value);
      }
    }

    return result;
  }

  /**
   * Helper to convert a string to a UUID (v1 compatibility)
   */
  stringToUuid(str: string): UUID {
    // This is a simplistic implementation - v1 might have had a more sophisticated one
    // Convert string to a valid UUID format
    const hash = Array.from(str)
      .reduce((acc, char) => (acc << 5) - acc + char.charCodeAt(0), 0)
      .toString(16)
      .slice(0, 8);

    return `${hash}-0000-0000-0000-000000000000` as UUID;
  }

  // All other methods are delegated to the wrapped runtime directly
  // This happens through the prototype chain
}

/**
 * Helper to compose a v1-compatible plugin from v2
 */
export function adaptPluginToV1(v2Plugin: any): any {
  return {
    ...v2Plugin,

    // Adapt actions if any
    actions: v2Plugin.actions?.map(adaptAction),

    // Adapt evaluators if any
    evaluators: v2Plugin.evaluators?.map(adaptEvaluator),

    // Adapt providers if any
    providers: v2Plugin.providers?.map(adaptProvider),

    // Convert services to v1 format if any
    services: v2Plugin.services?.map((ServiceClass: any) => {
      // Instantiate the service
      const service = new ServiceClass();
      return service;
    }),

    // Convert adapter if any
    adapters: v2Plugin.adapter
      ? [
          {
            init: (runtime: IAgentRuntime) => v2Plugin.adapter,
          },
        ]
      : undefined,

    // Add handlePostCharacterLoaded if events include CHARACTER_LOADED
    handlePostCharacterLoaded: v2Plugin.events?.CHARACTER_LOADED
      ? async (char: any) => {
          // Call the first CHARACTER_LOADED event handler
          if (v2Plugin.events.CHARACTER_LOADED[0]) {
            await v2Plugin.events.CHARACTER_LOADED[0]({ character: char });
          }
          return char;
        }
      : undefined,
  };
}

/**
 * Helper to compose a v2-compatible plugin from v1
 */
export function adaptPluginToV2(v1Plugin: any): any {
  return {
    name: v1Plugin.name,
    description: v1Plugin.description,

    // Adapt init method
    init: async (config: any, runtime: IAgentRuntime) => {
      // Create a runtime adapter
      const adaptedRuntime = new RuntimeAdapter(runtime);

      // Initialize adapters if any
      if (v1Plugin.adapters) {
        for (const adapter of v1Plugin.adapters) {
          if (adapter.init) {
            const adapterInstance = adapter.init(adaptedRuntime);
            if (adapterInstance) {
              runtime.registerDatabaseAdapter(adapterInstance);
            }
          }
        }
      }

      // Initialize clients if any (convert to services)
      if (v1Plugin.clients) {
        for (const client of v1Plugin.clients) {
          if (client.start) {
            try {
              const clientInstance = await client.start(adaptedRuntime);
              if (clientInstance) {
                // Store client instance for stop method
                if (!v1Plugin._clientInstances) {
                  v1Plugin._clientInstances = [];
                }
                v1Plugin._clientInstances.push(clientInstance);
              }
            } catch (err) {
              console.error(`Error starting client ${client.name}:`, err);
            }
          }
        }
      }

      // Return the config
      return config;
    },

    // Adapt stop method for client cleanup
    stop: async (runtime: IAgentRuntime) => {
      // Stop clients if any
      if (v1Plugin._clientInstances) {
        for (const clientInstance of v1Plugin._clientInstances) {
          if (clientInstance.stop) {
            try {
              await clientInstance.stop(runtime);
            } catch (err) {
              console.error(`Error stopping client:`, err);
            }
          }
        }
        v1Plugin._clientInstances = [];
      }
    },

    // Adapt config
    config: v1Plugin.config,

    // Adapt services - convert from instances to classes
    services: v1Plugin.services?.map((service: any) => {
      // Create a service class that extends the v2 Service
      const ServiceClass = class extends Service {
        static serviceType = service.serviceType;
        capabilityDescription = service.name || 'Legacy service';

        async stop() {
          // Call legacy stop method if available
          if (service.stop) {
            await service.stop(this.runtime);
          }
        }

        static async start(runtime: IAgentRuntime) {
          // Create a new instance
          const instance = new ServiceClass(runtime);

          // Call legacy initialize method if available
          if (service.initialize) {
            await service.initialize(runtime);
          }

          return instance;
        }
      };

      return ServiceClass;
    }),

    // Adapt actions
    actions: v1Plugin.actions?.map(adaptAction),

    // Adapt evaluators
    evaluators: v1Plugin.evaluators?.map(adaptEvaluator),

    // Adapt providers
    providers: v1Plugin.providers?.map(adaptProvider),

    // Add events for CHARACTER_LOADED if handlePostCharacterLoaded exists
    events: v1Plugin.handlePostCharacterLoaded
      ? {
          CHARACTER_LOADED: [
            async ({ character }: any) => {
              // Call legacy handler
              return v1Plugin.handlePostCharacterLoaded(character);
            },
          ],
        }
      : {},

    // Add adapter if any
    adapter: v1Plugin.adapters?.[0]?.init
      ? v1Plugin.adapters[0].init(new RuntimeAdapter({}))
      : undefined,
  };
}

/**
 * Helper to adapt a v1 action
 */
export function adaptV1Action(action: any): any {
  // Create adapted action with v2 structure
  return adaptAction(action);
}

/**
 * Helper to adapt a v1 evaluator
 */
export function adaptV1Evaluator(evaluator: any): any {
  // Create adapted evaluator with v2 structure
  return adaptEvaluator(evaluator);
}

/**
 * Helper to adapt a v1 provider
 */
export function adaptV1Provider(provider: any): any {
  // Create adapted provider with v2 structure
  return adaptProvider(provider);
}

/**
 * Helper function to create compound templates in v1 style
 */
export function composePromptFromState(state: State, template: string): string {
  // Simple implementation of string template substitution
  let result = template;

  // Process state fields (both v1 and v2 formats)
  const allValues = {
    ...state,
    ...state.values,
  };

  // Replace all template variables
  for (const key in allValues) {
    const value = allValues[key];
    if (typeof value === 'string') {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, value);
    }
  }

  return result;
}

/**
 * Helper function to generate message responses (v1 style)
 */
export async function generateMessageResponse(
  runtime: IAgentRuntime,
  prompt: string,
  temperature: number = 0.7
): Promise<any> {
  const adapter = new RuntimeAdapter(runtime);
  return adapter.generateObject(prompt, undefined, ModelClass.LARGE, temperature);
}

/**
 * Helper function to determine if the agent should respond (v1 style)
 */
export async function generateShouldRespond(
  runtime: IAgentRuntime,
  prompt: string
): Promise<boolean> {
  const adapter = new RuntimeAdapter(runtime);
  const result = await adapter.generateObject(
    prompt,
    {
      type: 'object',
      properties: {
        shouldRespond: { type: 'boolean' },
      },
      required: ['shouldRespond'],
    },
    ModelClass.LARGE,
    0.1
  );

  return result?.shouldRespond === true;
}

/**
 * Helper function to generate a true/false response (v1 style)
 */
export async function generateTrueOrFalse(
  runtime: IAgentRuntime,
  prompt: string
): Promise<boolean> {
  const adapter = new RuntimeAdapter(runtime);
  const result = await adapter.generateObject(
    prompt,
    {
      type: 'object',
      properties: {
        result: { type: 'boolean' },
      },
      required: ['result'],
    },
    ModelClass.LARGE,
    0.1
  );

  return result?.result === true;
}

/**
 * Export legacy API mapping for complete backwards compatibility
 */
export {
  ModelClass as ModelProviderName, // For imports that need ModelProviderName
};
