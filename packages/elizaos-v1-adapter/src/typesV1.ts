/**
 * ElizaOS v1 Type Definitions
 *
 * This file contains the legacy v1 types used by the v1-to-v2 adapter package.
 * All types are suffixed with "V1" to avoid confusion with v2 types.
 */

import type { Readable } from 'stream';

/**
 * Represents a UUID string in the format "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
 */
export type UUIDV1 = `${string}-${string}-${string}-${string}-${string}`;

/**
 * Represents the content of a message or communication in v1
 */
export interface ContentV1 {
  /** The main text content */
  text: string;

  /** Optional action associated with the message */
  action?: string;

  /** Optional source/origin of the content */
  source?: string;

  /** URL of the original message/post (e.g. tweet URL, Discord message link) */
  url?: string;

  /** UUID of parent message if this is a reply/thread */
  inReplyTo?: UUIDV1;

  /** Array of media attachments */
  attachments?: MediaV1[];

  /** Additional dynamic properties */
  [key: string]: unknown;
}

/**
 * Example content with associated user for demonstration purposes
 */
export interface ActionExampleV1 {
  /** User associated with the example */
  user: string;

  /** Content of the example */
  content: ContentV1;
}

/**
 * Example conversation content with user ID
 */
export interface ConversationExampleV1 {
  /** UUID of user in conversation */
  userId: UUIDV1;

  /** Content of the conversation */
  content: ContentV1;
}

/**
 * Represents an actor/participant in a conversation
 */
export interface ActorV1 {
  /** Display name */
  name: string;

  /** Username/handle */
  username: string;

  /** Additional profile details */
  details: {
    /** Short profile tagline */
    tagline: string;

    /** Longer profile summary */
    summary: string;

    /** Favorite quote */
    quote: string;
  };

  /** Unique identifier */
  id: UUIDV1;
}

/**
 * Represents a single objective within a goal
 */
export interface ObjectiveV1 {
  /** Optional unique identifier */
  id?: string;

  /** Description of what needs to be achieved */
  description: string;

  /** Whether objective is completed */
  completed: boolean;
}

/**
 * Status enum for goals
 */
export enum GoalStatusV1 {
  DONE = 'DONE',
  FAILED = 'FAILED',
  IN_PROGRESS = 'IN_PROGRESS',
}

/**
 * Represents a high-level goal composed of objectives
 */
export interface GoalV1 {
  /** Optional unique identifier */
  id?: UUIDV1;

  /** Room ID where goal exists */
  roomId: UUIDV1;

  /** User ID of goal owner */
  userId: UUIDV1;

  /** Name/title of the goal */
  name: string;

  /** Current status */
  status: GoalStatusV1;

  /** Component objectives */
  objectives: ObjectiveV1[];
}

/**
 * Model size/type classification
 */
export enum ModelClassV1 {
  SMALL = 'small',
  MEDIUM = 'medium',
  LARGE = 'large',
  EMBEDDING = 'embedding',
  IMAGE = 'image',
}

/**
 * Model settings
 */
export type ModelSettingsV1 = {
  /** Model name */
  name: string;

  /** Maximum input tokens */
  maxInputTokens: number;

  /** Maximum output tokens */
  maxOutputTokens: number;

  /** Optional frequency penalty */
  frequency_penalty?: number;

  /** Optional presence penalty */
  presence_penalty?: number;

  /** Optional repetition penalty */
  repetition_penalty?: number;

  /** Stop sequences */
  stop: string[];

  /** Temperature setting */
  temperature: number;

  /** Optional telemetry configuration (experimental) */
  experimental_telemetry?: TelemetrySettingsV1;
};

/** Image model settings */
export type ImageModelSettingsV1 = {
  name: string;
  steps?: number;
};

/** Embedding model settings */
export type EmbeddingModelSettingsV1 = {
  name: string;
  dimensions?: number;
};

/**
 * Configuration for an AI model
 */
export type ModelV1 = {
  /** Optional API endpoint */
  endpoint?: string;

  /** Model names by size class */
  model: {
    [ModelClassV1.SMALL]?: ModelSettingsV1;
    [ModelClassV1.MEDIUM]?: ModelSettingsV1;
    [ModelClassV1.LARGE]?: ModelSettingsV1;
    [ModelClassV1.EMBEDDING]?: EmbeddingModelSettingsV1;
    [ModelClassV1.IMAGE]?: ImageModelSettingsV1;
  };
};

/**
 * Available model providers
 */
export enum ModelProviderNameV1 {
  OPENAI = 'openai',
  ETERNALAI = 'eternalai',
  ANTHROPIC = 'anthropic',
  GROK = 'grok',
  GROQ = 'groq',
  LLAMACLOUD = 'llama_cloud',
  TOGETHER = 'together',
  LLAMALOCAL = 'llama_local',
  LMSTUDIO = 'lmstudio',
  GOOGLE = 'google',
  MISTRAL = 'mistral',
  CLAUDE_VERTEX = 'claude_vertex',
  REDPILL = 'redpill',
  OPENROUTER = 'openrouter',
  OLLAMA = 'ollama',
  HEURIST = 'heurist',
  GALADRIEL = 'galadriel',
  FAL = 'falai',
  GAIANET = 'gaianet',
  ALI_BAILIAN = 'ali_bailian',
  VOLENGINE = 'volengine',
  NANOGPT = 'nanogpt',
  HYPERBOLIC = 'hyperbolic',
  VENICE = 'venice',
  NVIDIA = 'nvidia',
  NINETEEN_AI = 'nineteen_ai',
  AKASH_CHAT_API = 'akash_chat_api',
  LIVEPEER = 'livepeer',
  LETZAI = 'letzai',
  DEEPSEEK = 'deepseek',
  INFERA = 'infera',
  BEDROCK = 'bedrock',
  ATOMA = 'atoma',
  SECRETAI = 'secret_ai',
  NEARAI = 'nearai',
}

/**
 * Model configurations by provider
 */
export type ModelsV1 = {
  [key in ModelProviderNameV1]?: ModelV1;
};

/**
 * Represents the current state/context of a conversation
 */
export interface StateV1 {
  /** ID of user who sent current message */
  userId?: UUIDV1;

  /** ID of agent in conversation */
  agentId?: UUIDV1;

  /** Agent's biography */
  bio: string;

  /** Agent's background lore */
  lore: string;

  /** Message handling directions */
  messageDirections: string;

  /** Post handling directions */
  postDirections: string;

  /** Current room/conversation ID */
  roomId: UUIDV1;

  /** Optional agent name */
  agentName?: string;

  /** Optional message sender name */
  senderName?: string;

  /** String representation of conversation actors */
  actors: string;

  /** Optional array of actor objects */
  actorsData?: ActorV1[];

  /** Optional string representation of goals */
  goals?: string;

  /** Optional array of goal objects */
  goalsData?: GoalV1[];

  /** Recent message history as string */
  recentMessages: string;

  /** Recent message objects */
  recentMessagesData: MemoryV1[];

  /** Optional valid action names */
  actionNames?: string;

  /** Optional action descriptions */
  actions?: string;

  /** Optional action objects */
  actionsData?: ActionV1[];

  /** Optional action examples */
  actionExamples?: string;

  /** Optional provider descriptions */
  providers?: string;

  /** Optional response content */
  responseData?: ContentV1;

  /** Optional recent interaction objects */
  recentInteractionsData?: MemoryV1[];

  /** Optional recent interactions string */
  recentInteractions?: string;

  /** Optional formatted conversation */
  formattedConversation?: string;

  /** Optional formatted knowledge */
  knowledge?: string;

  /** Optional knowledge data */
  knowledgeData?: KnowledgeItemV1[];

  /** Optional knowledge data */
  ragKnowledgeData?: RAGKnowledgeItemV1[];

  /** Additional dynamic properties */
  [key: string]: unknown;
}

/**
 * Represents a stored memory/message
 */
export interface MemoryV1 {
  /** Optional unique identifier */
  id?: UUIDV1;

  /** Associated user ID */
  userId: UUIDV1;

  /** Associated agent ID */
  agentId: UUIDV1;

  /** Optional creation timestamp */
  createdAt?: number;

  /** Memory content */
  content: ContentV1;

  /** Optional embedding vector */
  embedding?: number[];

  /** Associated room ID */
  roomId: UUIDV1;

  /** Whether memory is unique */
  unique?: boolean;

  /** Embedding similarity score */
  similarity?: number;
}

/**
 * Example message for demonstration
 */
export interface MessageExampleV1 {
  /** Associated user */
  user: string;

  /** Message content */
  content: ContentV1;
}

/**
 * Handler function type for processing messages
 */
export type HandlerV1 = (
  runtime: IAgentRuntimeV1,
  message: MemoryV1,
  state?: StateV1,
  options?: { [key: string]: unknown },
  callback?: HandlerCallbackV1
) => Promise<unknown>;

/**
 * Callback function type for handlers
 */
export type HandlerCallbackV1 = (response: ContentV1, files?: any) => Promise<MemoryV1[]>;

/**
 * Validator function type for actions/evaluators
 */
export type ValidatorV1 = (
  runtime: IAgentRuntimeV1,
  message: MemoryV1,
  state?: StateV1
) => Promise<boolean>;

/**
 * Represents an action the agent can perform
 */
export interface ActionV1 {
  /** Similar action descriptions */
  similes: string[];

  /** Detailed description */
  description: string;

  /** Example usages */
  examples: ActionExampleV1[][];

  /** Handler function */
  handler: HandlerV1;

  /** Action name */
  name: string;

  /** Validation function */
  validate: ValidatorV1;

  /** Whether to suppress the initial message when this action is used */
  suppressInitialMessage?: boolean;
}

/**
 * Example for evaluating agent behavior
 */
export interface EvaluationExampleV1 {
  /** Evaluation context */
  context: string;

  /** Example messages */
  messages: Array<ActionExampleV1>;

  /** Expected outcome */
  outcome: string;
}

/**
 * Evaluator for assessing agent responses
 */
export interface EvaluatorV1 {
  /** Whether to always run */
  alwaysRun?: boolean;

  /** Detailed description */
  description: string;

  /** Similar evaluator descriptions */
  similes: string[];

  /** Example evaluations */
  examples: EvaluationExampleV1[];

  /** Handler function */
  handler: HandlerV1;

  /** Evaluator name */
  name: string;

  /** Validation function */
  validate: ValidatorV1;
}

/**
 * Provider for external data/services
 */
export interface ProviderV1 {
  /** Data retrieval function */
  get: (runtime: IAgentRuntimeV1, message: MemoryV1, state?: StateV1) => Promise<any>;
}

/**
 * Represents a relationship between users
 */
export interface RelationshipV1 {
  /** Unique identifier */
  id: UUIDV1;

  /** First user ID */
  userA: UUIDV1;

  /** Second user ID */
  userB: UUIDV1;

  /** Primary user ID */
  userId: UUIDV1;

  /** Associated room ID */
  roomId: UUIDV1;

  /** Relationship status */
  status: string;

  /** Optional creation timestamp */
  createdAt?: string;
}

/**
 * Represents a user account
 */
export interface AccountV1 {
  /** Unique identifier */
  id: UUIDV1;

  /** Display name */
  name: string;

  /** Username */
  username: string;

  /** Optional additional details */
  details?: { [key: string]: any };

  /** Optional email */
  email?: string;

  /** Optional avatar URL */
  avatarUrl?: string;
}

/**
 * Room participant with account details
 */
export interface ParticipantV1 {
  /** Unique identifier */
  id: UUIDV1;

  /** Associated account */
  account: AccountV1;
}

/**
 * Represents a conversation room
 */
export interface RoomV1 {
  /** Unique identifier */
  id: UUIDV1;

  /** Room participants */
  participants: ParticipantV1[];
}

/**
 * Represents a media attachment
 */
export interface MediaV1 {
  /** Unique identifier */
  id: string;

  /** Media URL */
  url: string;

  /** Media title */
  title: string;

  /** Media source */
  source: string;

  /** Media description */
  description: string;

  /** Text content */
  text: string;

  /** Content type */
  contentType?: string;
}

/**
 * Client instance
 */
export interface ClientInstanceV1 {
  /** Stop client connection */
  stop: (runtime: IAgentRuntimeV1) => Promise<unknown>;
}

/**
 * Client interface for platform connections
 */
export interface ClientV1 {
  /** Client name */
  name: string;

  /** Client configuration */
  config?: { [key: string]: any };

  /** Start client connection */
  start: (runtime: IAgentRuntimeV1) => Promise<ClientInstanceV1>;
}

/**
 * Database adapter initialization
 */
export interface AdapterV1 {
  /** Initialize the adapter */
  init: (runtime: IAgentRuntimeV1) => IDatabaseAdapterV1 & IDatabaseCacheAdapterV1;
}

/**
 * Plugin for extending agent functionality
 */
export interface PluginV1 {
  /** Plugin name */
  name: string;

  /** Plugin npm name */
  npmName?: string;

  /** Plugin configuration */
  config?: { [key: string]: any };

  /** Plugin description */
  description: string;

  /** Optional actions */
  actions?: ActionV1[];

  /** Optional providers */
  providers?: ProviderV1[];

  /** Optional evaluators */
  evaluators?: EvaluatorV1[];

  /** Optional services */
  serviceV1s?: ServiceV1[];

  /** Optional clients */
  clients?: ClientV1[];

  /** Optional adapters */
  adapters?: AdapterV1[];

  /** Optional post character processor handler */
  handlePostCharacterLoaded?: (char: CharacterV1) => Promise<CharacterV1>;
}

export interface IAgentConfigV1 {
  [key: string]: string;
}

export interface TelemetrySettingsV1 {
  /**
   * Enable or disable telemetry. Disabled by default while experimental.
   */
  isEnabled?: boolean;
  /**
   * Enable or disable input recording. Enabled by default.
   *
   * You might want to disable input recording to avoid recording sensitive
   * information, to reduce data transfers, or to increase performance.
   */
  recordInputs?: boolean;
  /**
   * Enable or disable output recording. Enabled by default.
   *
   * You might want to disable output recording to avoid recording sensitive
   * information, to reduce data transfers, or to increase performance.
   */
  recordOutputs?: boolean;
  /**
   * Identifier for this function. Used to group telemetry data by function.
   */
  functionId?: string;
}

export interface ModelConfigurationV1 {
  temperature?: number;
  maxOutputTokens?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  maxInputTokens?: number;
  experimental_telemetry?: TelemetrySettingsV1;
}

export type TemplateTypeV1 = string | ((options: { state: StateV1 }) => string);

/**
 * Configuration for an agent character
 */
export interface CharacterV1 {
  /** Optional unique identifier */
  id?: UUIDV1;

  /** Character name */
  name: string;

  /** Optional username */
  username?: string;

  /** Optional email */
  email?: string;

  /** Optional system prompt */
  system?: string;

  /** Model provider to use */
  modelProvider: ModelProviderNameV1;

  /** Image model provider to use, if different from modelProvider */
  imageModelProvider?: ModelProviderNameV1;

  /** Image Vision model provider to use, if different from modelProvider */
  imageVisionModelProvider?: ModelProviderNameV1;

  /** Optional model endpoint override */
  modelEndpointOverride?: string;

  /** Optional prompt templates */
  templates?: {
    goalsTemplate?: TemplateTypeV1;
    factsTemplate?: TemplateTypeV1;
    messageHandlerTemplate?: TemplateTypeV1;
    shouldRespondTemplate?: TemplateTypeV1;
    continueMessageHandlerTemplate?: TemplateTypeV1;
    evaluationTemplate?: TemplateTypeV1;
    twitterSearchTemplate?: TemplateTypeV1;
    twitterActionTemplate?: TemplateTypeV1;
    twitterPostTemplate?: TemplateTypeV1;
    twitterMessageHandlerTemplate?: TemplateTypeV1;
    twitterShouldRespondTemplate?: TemplateTypeV1;
    twitterVoiceHandlerTemplate?: TemplateTypeV1;
    instagramPostTemplate?: TemplateTypeV1;
    instagramMessageHandlerTemplate?: TemplateTypeV1;
    instagramShouldRespondTemplate?: TemplateTypeV1;
    farcasterPostTemplate?: TemplateTypeV1;
    lensPostTemplate?: TemplateTypeV1;
    farcasterMessageHandlerTemplate?: TemplateTypeV1;
    lensMessageHandlerTemplate?: TemplateTypeV1;
    farcasterShouldRespondTemplate?: TemplateTypeV1;
    lensShouldRespondTemplate?: TemplateTypeV1;
    telegramMessageHandlerTemplate?: TemplateTypeV1;
    telegramShouldRespondTemplate?: TemplateTypeV1;
    telegramAutoPostTemplate?: string;
    telegramPinnedMessageTemplate?: string;
    discordAutoPostTemplate?: string;
    discordAnnouncementHypeTemplate?: string;
    discordVoiceHandlerTemplate?: TemplateTypeV1;
    discordShouldRespondTemplate?: TemplateTypeV1;
    discordMessageHandlerTemplate?: TemplateTypeV1;
    slackMessageHandlerTemplate?: TemplateTypeV1;
    slackShouldRespondTemplate?: TemplateTypeV1;
    jeeterPostTemplate?: string;
    jeeterSearchTemplate?: string;
    jeeterInteractionTemplate?: string;
    jeeterMessageHandlerTemplate?: string;
    jeeterShouldRespondTemplate?: string;
    devaPostTemplate?: string;
  };

  /** Character biography */
  bio: string | string[];

  /** Character background lore */
  lore: string[];

  /** Example messages */
  messageExamples: MessageExampleV1[][];

  /** Example posts */
  postExamples: string[];

  /** Known topics */
  topics: string[];

  /** Character traits */
  adjectives: string[];

  /** Optional knowledge base */
  knowledge?: (
    | string
    | { path: string; shared?: boolean }
    | { directory: string; shared?: boolean }
  )[];

  /** Available plugins */
  plugins: PluginV1[];

  /** Character Processor Plugins */
  postProcessors?: Pick<PluginV1, 'name' | 'description' | 'handlePostCharacterLoaded'>[];

  /** Optional configuration */
  settings?: {
    secrets?: { [key: string]: string };
    intiface?: boolean;
    imageSettings?: {
      steps?: number;
      width?: number;
      height?: number;
      cfgScale?: number;
      negativePrompt?: string;
      numIterations?: number;
      guidanceScale?: number;
      seed?: number;
      modelId?: string;
      jobId?: string;
      count?: number;
      stylePreset?: string;
      hideWatermark?: boolean;
      safeMode?: boolean;
    };
    voice?: {
      model?: string; // For VITS
      url?: string; // Legacy VITS support
      elevenlabs?: {
        // New structured ElevenLabs config
        voiceId: string;
        model?: string;
        stability?: string;
        similarityBoost?: string;
        style?: string;
        useSpeakerBoost?: string;
      };
    };
    model?: string;
    modelConfig?: ModelConfigurationV1;
    embeddingModel?: string;
    chains?: {
      evm?: any[];
      solana?: any[];
      [key: string]: any[];
    };
    transcription?: TranscriptionProviderV1;
    ragKnowledge?: boolean;
  };

  /** Optional client-specific config */
  clientConfig?: {
    discord?: {
      shouldIgnoreBotMessages?: boolean;
      shouldIgnoreDirectMessages?: boolean;
      shouldRespondOnlyToMentions?: boolean;
      messageSimilarityThreshold?: number;
      isPartOfTeam?: boolean;
      teamAgentIds?: string[];
      teamLeaderId?: string;
      teamMemberInterestKeywords?: string[];
      allowedChannelIds?: string[];
      autoPost?: {
        enabled?: boolean;
        monitorTime?: number;
        inactivityThreshold?: number;
        mainChannelId?: string;
        announcementChannelIds?: string[];
        minTimeBetweenPosts?: number;
      };
    };
    telegram?: {
      shouldIgnoreBotMessages?: boolean;
      shouldIgnoreDirectMessages?: boolean;
      shouldRespondOnlyToMentions?: boolean;
      shouldOnlyJoinInAllowedGroups?: boolean;
      allowedGroupIds?: string[];
      messageSimilarityThreshold?: number;
      isPartOfTeam?: boolean;
      teamAgentIds?: string[];
      teamLeaderId?: string;
      teamMemberInterestKeywords?: string[];
      autoPost?: {
        enabled?: boolean;
        monitorTime?: number;
        inactivityThreshold?: number;
        mainChannelId?: string;
        pinnedMessagesGroups?: string[];
        minTimeBetweenPosts?: number;
      };
    };
    slack?: {
      shouldIgnoreBotMessages?: boolean;
      shouldIgnoreDirectMessages?: boolean;
    };
    gitbook?: {
      keywords?: {
        projectTerms?: string[];
        generalQueries?: string[];
      };
      documentTriggers?: string[];
    };
  };

  /** Writing style guides */
  style: {
    all: string[];
    chat: string[];
    post: string[];
  };

  /** Optional Twitter profile */
  twitterProfile?: {
    id: string;
    username: string;
    screenName: string;
    bio: string;
    nicknames?: string[];
  };

  /** Optional Instagram profile */
  instagramProfile?: {
    id: string;
    username: string;
    bio: string;
    nicknames?: string[];
  };

  /** Optional SimsAI profile */
  simsaiProfile?: {
    id: string;
    username: string;
    screenName: string;
    bio: string;
  };

  /** Optional NFT prompt */
  nft?: {
    prompt: string;
  };

  /**Optional Parent characters to inherit information from */
  extends?: string[];

  twitterSpaces?: TwitterSpaceDecisionOptionsV1;
}

export interface TwitterSpaceDecisionOptionsV1 {
  maxSpeakers?: number;
  topics?: string[];
  typicalDurationMinutes?: number;
  idleKickTimeoutMs?: number;
  minIntervalBetweenSpacesMinutes?: number;
  businessHoursOnly?: boolean;
  randomChance?: number;
  enableIdleMonitor?: boolean;
  enableSttTts?: boolean;
  enableRecording?: boolean;
  voiceId?: string;
  sttLanguage?: string;
  speakerMaxDurationMs?: number;
}

/**
 * Interface for database operations
 */
export interface IDatabaseAdapterV1 {
  /** Database instance */
  db: any;

  /** Optional initialization */
  init(): Promise<void>;

  /** Close database connection */
  close(): Promise<void>;

  /** Get account by ID */
  getAccountById(userId: UUIDV1): Promise<AccountV1 | null>;

  /** Create new account */
  createAccount(account: AccountV1): Promise<boolean>;

  /** Get memories matching criteria */
  getMemories(params: {
    roomId: UUIDV1;
    count?: number;
    unique?: boolean;
    tableName: string;
    agentId: UUIDV1;
    start?: number;
    end?: number;
  }): Promise<MemoryV1[]>;

  getMemoryById(id: UUIDV1): Promise<MemoryV1 | null>;

  getMemoriesByIds(ids: UUIDV1[], tableName?: string): Promise<MemoryV1[]>;

  getMemoriesByRoomIds(params: {
    tableName: string;
    agentId: UUIDV1;
    roomIds: UUIDV1[];
    limit?: number;
  }): Promise<MemoryV1[]>;

  getCachedEmbeddings(params: {
    query_table_name: string;
    query_threshold: number;
    query_input: string;
    query_field_name: string;
    query_field_sub_name: string;
    query_match_count: number;
  }): Promise<{ embedding: number[]; levenshtein_score: number }[]>;

  log(params: {
    body: { [key: string]: unknown };
    userId: UUIDV1;
    roomId: UUIDV1;
    type: string;
  }): Promise<void>;

  getActorDetails(params: { roomId: UUIDV1 }): Promise<ActorV1[]>;

  searchMemories(params: {
    tableName: string;
    agentId: UUIDV1;
    roomId: UUIDV1;
    embedding: number[];
    match_threshold: number;
    match_count: number;
    unique: boolean;
  }): Promise<MemoryV1[]>;

  updateGoalStatus(params: { goalId: UUIDV1; status: GoalStatusV1 }): Promise<void>;

  searchMemoriesByEmbedding(
    embedding: number[],
    params: {
      match_threshold?: number;
      count?: number;
      roomId?: UUIDV1;
      agentId?: UUIDV1;
      unique?: boolean;
      tableName: string;
    }
  ): Promise<MemoryV1[]>;

  createMemory(memory: MemoryV1, tableName: string, unique?: boolean): Promise<void>;

  removeMemory(memoryId: UUIDV1, tableName: string): Promise<void>;

  removeAllMemories(roomId: UUIDV1, tableName: string): Promise<void>;

  countMemories(roomId: UUIDV1, unique?: boolean, tableName?: string): Promise<number>;

  getGoals(params: {
    agentId: UUIDV1;
    roomId: UUIDV1;
    userId?: UUIDV1 | null;
    onlyInProgress?: boolean;
    count?: number;
  }): Promise<GoalV1[]>;

  updateGoal(goal: GoalV1): Promise<void>;

  createGoal(goal: GoalV1): Promise<void>;

  removeGoal(goalId: UUIDV1): Promise<void>;

  removeAllGoals(roomId: UUIDV1): Promise<void>;

  getRoom(roomId: UUIDV1): Promise<UUIDV1 | null>;

  createRoom(roomId?: UUIDV1): Promise<UUIDV1>;

  removeRoom(roomId: UUIDV1): Promise<void>;

  getRoomsForParticipant(userId: UUIDV1): Promise<UUIDV1[]>;

  getRoomsForParticipants(userIds: UUIDV1[]): Promise<UUIDV1[]>;

  addParticipant(userId: UUIDV1, roomId: UUIDV1): Promise<boolean>;

  removeParticipant(userId: UUIDV1, roomId: UUIDV1): Promise<boolean>;

  getParticipantsForAccount(userId: UUIDV1): Promise<ParticipantV1[]>;

  getParticipantsForRoom(roomId: UUIDV1): Promise<UUIDV1[]>;

  getParticipantUserState(roomId: UUIDV1, userId: UUIDV1): Promise<'FOLLOWED' | 'MUTED' | null>;

  setParticipantUserState(
    roomId: UUIDV1,
    userId: UUIDV1,
    state: 'FOLLOWED' | 'MUTED' | null
  ): Promise<void>;

  createRelationship(params: { userA: UUIDV1; userB: UUIDV1 }): Promise<boolean>;

  getRelationship(params: { userA: UUIDV1; userB: UUIDV1 }): Promise<RelationshipV1 | null>;

  getRelationships(params: { userId: UUIDV1 }): Promise<RelationshipV1[]>;

  getKnowledge(params: {
    id?: UUIDV1;
    agentId: UUIDV1;
    limit?: number;
    query?: string;
    conversationContext?: string;
  }): Promise<RAGKnowledgeItemV1[]>;

  searchKnowledge(params: {
    agentId: UUIDV1;
    embedding: Float32Array;
    match_threshold: number;
    match_count: number;
    searchText?: string;
  }): Promise<RAGKnowledgeItemV1[]>;

  createKnowledge(knowledge: RAGKnowledgeItemV1): Promise<void>;
  removeKnowledge(id: UUIDV1): Promise<void>;
  clearKnowledge(agentId: UUIDV1, shared?: boolean): Promise<void>;
}

export interface IDatabaseCacheAdapterV1 {
  getCache(params: { agentId: UUIDV1; key: string }): Promise<string | undefined>;

  setCache(params: { agentId: UUIDV1; key: string; value: string }): Promise<boolean>;

  deleteCache(params: { agentId: UUIDV1; key: string }): Promise<boolean>;
}

export interface IMemoryManagerV1 {
  runtime: IAgentRuntimeV1;
  tableName: string;
  constructor: Function;

  addEmbeddingToMemory(memory: MemoryV1): Promise<MemoryV1>;

  getMemories(opts: {
    roomId: UUIDV1;
    count?: number;
    unique?: boolean;
    start?: number;
    end?: number;
  }): Promise<MemoryV1[]>;

  getCachedEmbeddings(
    content: string
  ): Promise<{ embedding: number[]; levenshtein_score: number }[]>;

  getMemoryById(id: UUIDV1): Promise<MemoryV1 | null>;
  getMemoriesByRoomIds(params: { roomIds: UUIDV1[]; limit?: number }): Promise<MemoryV1[]>;
  searchMemoriesByEmbedding(
    embedding: number[],
    opts: {
      match_threshold?: number;
      count?: number;
      roomId: UUIDV1;
      unique?: boolean;
    }
  ): Promise<MemoryV1[]>;

  createMemory(memory: MemoryV1, unique?: boolean): Promise<void>;

  removeMemory(memoryId: UUIDV1): Promise<void>;

  removeAllMemories(roomId: UUIDV1): Promise<void>;

  countMemories(roomId: UUIDV1, unique?: boolean): Promise<number>;
}

export interface IRAGKnowledgeManagerV1 {
  runtime: IAgentRuntimeV1;
  tableName: string;

  getKnowledge(params: {
    query?: string;
    id?: UUIDV1;
    limit?: number;
    conversationContext?: string;
    agentId?: UUIDV1;
  }): Promise<RAGKnowledgeItemV1[]>;
  createKnowledge(item: RAGKnowledgeItemV1): Promise<void>;
  removeKnowledge(id: UUIDV1): Promise<void>;
  searchKnowledge(params: {
    agentId: UUIDV1;
    embedding: Float32Array | number[];
    match_threshold?: number;
    match_count?: number;
    searchText?: string;
  }): Promise<RAGKnowledgeItemV1[]>;
  clearKnowledge(shared?: boolean): Promise<void>;
  processFile(file: {
    path: string;
    content: string;
    type: 'pdf' | 'md' | 'txt';
    isShared: boolean;
  }): Promise<void>;
  cleanupDeletedKnowledgeFiles(): Promise<void>;
  generateScopedId(path: string, isShared: boolean): UUIDV1;
}

export interface CacheOptionsV1 {
  expires?: number;
}

export enum CacheStoreV1 {
  REDIS = 'redis',
  DATABASE = 'database',
  FILESYSTEM = 'filesystem',
}

export interface ICacheManagerV1 {
  get<T = unknown>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T, options?: CacheOptionsV1): Promise<void>;
  delete(key: string): Promise<void>;
}

export abstract class ServiceV1 {
  private static instance: ServiceV1 | null = null;

  static get serviceType(): ServiceTypeV1 {
    throw new Error('Service must implement static serviceType getter');
  }

  public static getInstance<T extends ServiceV1>(): T {
    if (!ServiceV1.instance) {
      ServiceV1.instance = new (this as any)();
    }
    return ServiceV1.instance as T;
  }

  get serviceType(): ServiceTypeV1 {
    return (this.constructor as typeof ServiceV1).serviceType;
  }

  // Add abstract initialize method that must be implemented by derived classes
  abstract initialize(runtime: IAgentRuntimeV1): Promise<void>;
}

export interface IAgentRuntimeV1 {
  // Properties
  agentId: UUIDV1;
  serverUrl: string;
  databaseAdapter: IDatabaseAdapterV1;
  token: string | null;
  modelProvider: ModelProviderNameV1;
  imageModelProvider: ModelProviderNameV1;
  imageVisionModelProvider: ModelProviderNameV1;
  character: CharacterV1;
  providers: ProviderV1[];
  actions: ActionV1[];
  evaluators: EvaluatorV1[];
  plugins: PluginV1[];

  fetch?: typeof fetch | null;

  messageManager: IMemoryManagerV1;
  descriptionManager: IMemoryManagerV1;
  documentsManager: IMemoryManagerV1;
  knowledgeManager: IMemoryManagerV1;
  ragKnowledgeManager: IRAGKnowledgeManagerV1;
  loreManager: IMemoryManagerV1;

  cacheManager: ICacheManagerV1;

  services: Map<ServiceTypeV1, ServiceV1>;
  clients: ClientInstanceV1[];

  // verifiableInferenceAdapter?: IVerifiableInferenceAdapterV1 | null;

  initialize(): Promise<void>;

  registerMemoryManager(manager: IMemoryManagerV1): void;

  getMemoryManager(name: string): IMemoryManagerV1 | null;

  getService<T extends ServiceV1>(service: ServiceTypeV1): T | null;

  registerService(service: ServiceV1): void;

  getSetting(key: string): string | null;

  // Methods
  getConversationLength(): number;

  processActions(
    message: MemoryV1,
    responses: MemoryV1[],
    state?: StateV1,
    callback?: HandlerCallbackV1
  ): Promise<void>;

  evaluate(
    message: MemoryV1,
    state?: StateV1,
    didRespond?: boolean,
    callback?: HandlerCallbackV1
  ): Promise<string[] | null>;

  ensureParticipantExists(userId: UUIDV1, roomId: UUIDV1): Promise<void>;

  ensureUserExists(
    userId: UUIDV1,
    userName: string | null,
    name: string | null,
    source: string | null
  ): Promise<void>;

  registerAction(action: ActionV1): void;

  ensureConnection(
    userId: UUIDV1,
    roomId: UUIDV1,
    userName?: string,
    userScreenName?: string,
    source?: string
  ): Promise<void>;

  ensureParticipantInRoom(userId: UUIDV1, roomId: UUIDV1): Promise<void>;

  ensureRoomExists(roomId: UUIDV1): Promise<void>;

  composeState(message: MemoryV1, additionalKeys?: { [key: string]: unknown }): Promise<StateV1>;

  updateRecentMessageState(state: StateV1): Promise<StateV1>;
}

export interface IImageDescriptionServiceV1 extends ServiceV1 {
  describeImage(imageUrl: string): Promise<{ title: string; description: string }>;
}

export interface ITranscriptionServiceV1 extends ServiceV1 {
  transcribeAttachment(audioBuffer: ArrayBuffer): Promise<string | null>;
  transcribeAttachmentLocally(audioBuffer: ArrayBuffer): Promise<string | null>;
  transcribe(audioBuffer: ArrayBuffer): Promise<string | null>;
  transcribeLocally(audioBuffer: ArrayBuffer): Promise<string | null>;
}

export interface IVideoServiceV1 extends ServiceV1 {
  isVideoUrl(url: string): boolean;
  fetchVideoInfo(url: string): Promise<MediaV1>;
  downloadVideo(videoInfo: MediaV1): Promise<string>;
  processVideo(url: string, runtime: IAgentRuntimeV1): Promise<MediaV1>;
}

export interface ITextGenerationServiceV1 extends ServiceV1 {
  initializeModel(): Promise<void>;
  queueMessageCompletion(
    context: string,
    temperature: number,
    stop: string[],
    frequency_penalty: number,
    presence_penalty: number,
    max_tokens: number
  ): Promise<any>;
  queueTextCompletion(
    context: string,
    temperature: number,
    stop: string[],
    frequency_penalty: number,
    presence_penalty: number,
    max_tokens: number
  ): Promise<string>;
  getEmbeddingResponse(input: string): Promise<number[] | undefined>;
}

export interface IBrowserServiceV1 extends ServiceV1 {
  closeBrowser(): Promise<void>;
  getPageContent(
    url: string,
    runtime: IAgentRuntimeV1
  ): Promise<{ title: string; description: string; bodyContent: string }>;
}

export interface ISpeechServiceV1 extends ServiceV1 {
  getInstance(): ISpeechServiceV1;
  generate(runtime: IAgentRuntimeV1, text: string): Promise<Readable>;
}

export interface IPdfServiceV1 extends ServiceV1 {
  getInstance(): IPdfServiceV1;
  convertPdfToText(pdfBuffer: Buffer): Promise<string>;
}

export interface IAwsS3ServiceV1 extends ServiceV1 {
  uploadFile(
    imagePath: string,
    subDirectory: string,
    useSignedUrl: boolean,
    expiresIn: number
  ): Promise<{
    success: boolean;
    url?: string;
    error?: string;
  }>;
  generateSignedUrl(fileName: string, expiresIn: number): Promise<string>;
}

export interface UploadIrysResultV1 {
  success: boolean;
  url?: string;
  error?: string;
  data?: any;
}

export interface DataIrysFetchedFromGQLV1 {
  success: boolean;
  data: any;
  error?: string;
}

export interface GraphQLTagV1 {
  name: string;
  values: any[];
}

export enum IrysMessageTypeV1 {
  REQUEST = 'REQUEST',
  DATA_STORAGE = 'DATA_STORAGE',
  REQUEST_RESPONSE = 'REQUEST_RESPONSE',
}

export enum IrysDataTypeV1 {
  FILE = 'FILE',
  IMAGE = 'IMAGE',
  OTHER = 'OTHER',
}

export interface IrysTimestampV1 {
  from: number;
  to: number;
}

export interface IIrysServiceV1 extends ServiceV1 {
  getDataFromAnAgent(
    agentsWalletPublicKeys: string[],
    tags: GraphQLTagV1[],
    timestamp: IrysTimestampV1
  ): Promise<DataIrysFetchedFromGQLV1>;
  workerUploadDataOnIrys(
    data: any,
    dataType: IrysDataTypeV1,
    messageType: IrysMessageTypeV1,
    serviceCategory: string[],
    protocol: string[],
    validationThreshold: number[],
    minimumProviders: number[],
    testProvider: boolean[],
    reputation: number[]
  ): Promise<UploadIrysResultV1>;
  providerUploadDataOnIrys(
    data: any,
    dataType: IrysDataTypeV1,
    serviceCategory: string[],
    protocol: string[]
  ): Promise<UploadIrysResultV1>;
}

export interface ITeeLogServiceV1 extends ServiceV1 {
  getInstance(): ITeeLogServiceV1;
  log(
    agentId: string,
    roomId: string,
    userId: string,
    type: string,
    content: string
  ): Promise<boolean>;
}

export enum ServiceTypeV1 {
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

export enum LoggingLevelV1 {
  DEBUG = 'debug',
  VERBOSE = 'verbose',
  NONE = 'none',
}

export interface KnowledgeItemV1 {
  id: UUIDV1;
  content: ContentV1;
}

export interface RAGKnowledgeItemV1 {
  id: UUIDV1;
  agentId: UUIDV1;
  content: {
    text: string;
    metadata?: {
      isMain?: boolean;
      isChunk?: boolean;
      originalId?: UUIDV1;
      chunkIndex?: number;
      source?: string;
      type?: string;
      isShared?: boolean;
      [key: string]: unknown;
    };
  };
  embedding?: Float32Array;
  createdAt?: number;
  similarity?: number;
  score?: number;
}

export interface ActionResponseV1 {
  like: boolean;
  retweet: boolean;
  quote?: boolean;
  reply?: boolean;
}

export interface ISlackServiceV1 extends ServiceV1 {
  client: any;
}

export enum TokenizerTypeV1 {
  Auto = 'auto',
  TikToken = 'tiktoken',
}

export enum TranscriptionProviderV1 {
  OpenAI = 'openai',
  Deepgram = 'deepgram',
  Local = 'local',
}

export enum ActionTimelineTypeV1 {
  ForYou = 'foryou',
  Following = 'following',
}

export enum KnowledgeScopeV1 {
  SHARED = 'shared',
  PRIVATE = 'private',
}

export enum CacheKeyPrefixV1 {
  KNOWLEDGE = 'knowledge',
}

export interface DirectoryItemV1 {
  directory: string;
  shared?: boolean;
}

export interface ChunkRowV1 {
  id: string;
  // Add other properties if needed
}

/**
 * Generation utility functions
 */

/**
 * Generate text with a large model
 */
export function generateText(
  runtime: IAgentRuntimeV1,
  prompt: string,
  temperature: number = 0.7,
  maxTokens: number = 500,
  stop: string[] = []
): Promise<string> {
  if (!runtime.messageManager) {
    throw new Error('Runtime message manager not initialized');
  }

  const service = runtime.getService<ITextGenerationServiceV1>(ServiceTypeV1.TEXT_GENERATION);
  if (!service) {
    throw new Error('Text generation service not available');
  }

  return service.queueTextCompletion(prompt, temperature, stop, 0, 0, maxTokens);
}

/**
 * Generate an object with a large model
 */
export function generateObject<T>(
  runtime: IAgentRuntimeV1,
  prompt: string,
  schema?: any,
  temperature: number = 0.2
): Promise<T> {
  // Simplified implementation - in real code this would use a schema and parsing
  return generateText(runtime, prompt, temperature).then((text) => {
    try {
      // Extract JSON from text response if present
      const jsonMatch =
        text.match(/```json\n([\s\S]*?)\n```/) ||
        text.match(/```\n([\s\S]*?)\n```/) ||
        text.match(/\{[\s\S]*\}/);

      const jsonText = jsonMatch ? jsonMatch[1] || jsonMatch[0] : text;
      return JSON.parse(jsonText) as T;
    } catch (e) {
      console.error('Failed to parse JSON from response:', e);
      throw new Error('Failed to generate valid object');
    }
  });
}

/**
 * Compose context for templates
 */
export function composeContext(state: StateV1, template: string): string {
  // Simple template substitution from state
  let result = template;

  // Handle state field substitutions
  for (const key in state) {
    const value = state[key];
    if (typeof value === 'string') {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, value);
    }
  }

  return result;
}
