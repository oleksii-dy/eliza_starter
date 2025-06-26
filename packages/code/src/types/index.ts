// Type definitions for the Claude CLI

export interface SessionData {
  id: string;
  startTime: Date;
  cwd: string;
  metrics: SessionMetrics;
}

export interface SessionMetrics {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
  totalCost: number;
  duration: number;
}

export interface AuthConfig {
  apiKey?: string;
  authToken?: string;
  baseURL?: string;
  timeout?: number;
}

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
}

export interface StreamEvent {
  type: 'message_start' | 'content_block_start' | 'content_block_delta' | 'content_block_stop' | 'message_stop';
  message?: any;
  delta?: any;
  usage?: any;
}

export interface CLIOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
  verbose?: boolean;
  debug?: boolean;
  apiKey?: string;
  nonInteractive?: boolean;
}

export interface OAuthConfig {
  clientId: string;
  clientSecret?: string;
  redirectUri: string;
  scope: string[];
}

export interface ToolUse {
  id: string;
  name: string;
  input: any;
}

export interface MarkdownOptions {
  wrap?: boolean;
  width?: number;
  indent?: number;
} 