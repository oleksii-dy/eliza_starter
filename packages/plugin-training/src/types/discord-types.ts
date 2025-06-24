/**
 * Discord conversation extraction types
 */

export interface DiscordMessage {
  id: string;
  type: number;
  content: string;
  channel_id: string;
  author: {
    id: string;
    username: string;
    discriminator: string;
    global_name?: string;
    avatar?: string;
    bot?: boolean;
  };
  timestamp: string;
  edited_timestamp?: string;
  flags?: number;
  components?: any[];
  attachments?: DiscordAttachment[];
  embeds?: any[];
  mentions?: DiscordUser[];
  mention_roles?: string[];
  pinned?: boolean;
  mention_everyone?: boolean;
  tts?: boolean;
  thread?: {
    id: string;
    name: string;
    parent_id: string;
  };
  referenced_message?: {
    id: string;
    channel_id: string;
    author: DiscordUser;
    content: string;
  };
  message_reference?: {
    channel_id: string;
    guild_id?: string;
    message_id?: string;
  };
}

export interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  global_name?: string;
  avatar?: string;
  bot?: boolean;
  system?: boolean;
  public_flags?: number;
}

export interface DiscordAttachment {
  id: string;
  filename: string;
  size: number;
  url: string;
  proxy_url: string;
  content_type?: string;
  width?: number;
  height?: number;
}

export interface DiscordChannel {
  id: string;
  type: number;
  guild_id?: string;
  position?: number;
  name?: string;
  topic?: string;
  nsfw?: boolean;
  parent_id?: string;
  permission_overwrites?: any[];
  thread_metadata?: {
    archived: boolean;
    auto_archive_duration: number;
    archive_timestamp: string;
    locked: boolean;
  };
}

export interface ConversationThread {
  id: string;
  messages: DiscordMessage[];
  participants: string[];
  channelId: string;
  channelName?: string;
  threadName?: string;
  startTime: string;
  endTime: string;
  messageCount: number;
  averageGapMinutes: number;
  topics?: string[];
  qualityScore: number;
}

export interface TrackedUser {
  userId: string;
  username: string;
  displayName: string;
  discriminator: string;
  messageCount: number;
  conversationCount: number;
  averageMessageLength: number;
  conversationFrequency: number; // messages per day
  firstSeen: string;
  lastSeen: string;
  personalityProfile?: PersonalityProfile;
  relationships?: UserRelationship[];
  channelActivity: Record<string, number>;
  timeActivity: Record<string, number>; // hour of day activity
}

export interface PersonalityProfile {
  communicationStyle: string[];
  preferredTopics: string[];
  commonPhrases: string[];
  responsePatterns: ResponsePattern[];
  emotionalTone: 'casual' | 'formal' | 'friendly' | 'technical' | 'humorous';
  engagementLevel: 'high' | 'medium' | 'low';
  helpfulness: number; // 0-1 score
  leadership: number; // 0-1 score
  expertise: string[];
}

export interface ResponsePattern {
  trigger: string; // what triggers this response type
  pattern: string; // common response pattern
  frequency: number; // how often this pattern occurs
  examples: string[];
}

export interface UserRelationship {
  targetUserId: string;
  targetUsername: string;
  relationshipType: 'frequent_interaction' | 'mentions_often' | 'responds_to' | 'collaborative';
  interactionCount: number;
  positiveInteractions: number;
  lastInteraction: string;
  topics: string[];
}

export interface ConversationContext {
  threadId: string;
  messages: DiscordMessage[];
  targetMessage: DiscordMessage;
  targetUser: TrackedUser;
  contextWindow: number;
  previousSpeakers: string[];
  topicContext?: string;
  channelContext?: string;
}

export interface InstructionExample {
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  metadata: {
    userId: string;
    username: string;
    conversationId: string;
    messageId: string;
    timestamp: string;
    channelId: string;
    channelName?: string;
    qualityScore: number;
    contextLength: number;
  };
}

export interface ExtractionConfig {
  // Repository settings
  repoPath: string;
  outputDir: string;

  // Conversation filtering
  minMessages: number;
  maxGapHours: number;
  minConversationLength: number;

  // User filtering
  minUserMessages: number;
  topUserCount: number;
  excludeBots: boolean;
  excludeSystemMessages: boolean;

  // Content filtering
  minContentLength: number;
  maxContentLength: number;
  excludeUrls: boolean;
  excludeAttachmentOnly: boolean;

  // Quality settings
  minQualityScore: number;
  requireMultipleSpeakers: boolean;

  // Privacy settings
  anonymizeUsers: boolean;
  excludeSensitiveChannels: string[];
}

export interface GenerationConfig {
  // Training data settings
  examplesPerUser: number;
  contextWindow: number;
  maxExamples: number;

  // Template settings
  includeSystemPrompt: boolean;
  personalityInSystem: boolean;
  includeChannelContext: boolean;
  includeTimeContext: boolean;

  // Quality control
  minQualityScore: number;
  balanceUserExamples: boolean;
  diversifyContexts: boolean;

  // Output settings
  outputFormat: 'jsonl' | 'json';
  splitRatio: [number, number, number]; // train, validation, test
  shuffleData: boolean;
}

export interface ExtractionStats {
  totalMessages: number;
  filteredMessages: number;
  totalConversations: number;
  qualityConversations: number;
  totalUsers: number;
  trackedUsers: number;
  channelsCovered: number;
  dateRange: {
    earliest: string;
    latest: string;
  };
  averageConversationLength: number;
  averageQualityScore: number;
}

export interface GenerationStats {
  totalExamples: number;
  usersIncluded: number;
  averageContextLength: number;
  averageQualityScore: number;
  topicDistribution: Record<string, number>;
  channelDistribution: Record<string, number>;
  userDistribution: Record<string, number>;
}
