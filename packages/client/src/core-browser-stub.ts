// Browser-compatible stub for @elizaos/core
// This file provides types and minimal implementations needed by the client library

export type UUID = `${string}-${string}-${string}-${string}-${string}`;

// Enums and constants
export enum AgentStatus {
  RUNNING = 'RUNNING',
  STOPPED = 'STOPPED',
  PAUSED = 'PAUSED',
  ERROR = 'ERROR',
}

export enum ChannelType {
  SELF = 'SELF',
  DM = 'DM',
  GROUP = 'GROUP',
  FEED = 'FEED',
  THREAD = 'THREAD',
}

export enum ContentType {
  TEXT = 'text',
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  FILE = 'file',
}

export const SOCKET_MESSAGE_TYPE = {
  MESSAGE: 'message',
  USER_JOINED: 'user_joined',
  USER_LEFT: 'user_left',
  TYPING: 'typing',
  ERROR: 'error',
};

// Interfaces
export interface Agent {
  id?: UUID;
  name?: string;
  settings?: {
    avatar?: string | null;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface Character {
  id?: UUID;
  name?: string;
  [key: string]: unknown;
}

export interface Memory {
  id?: UUID;
  content?: Content;
  [key: string]: unknown;
}

export interface Content {
  text?: string;
  type?: string;
  [key: string]: unknown;
}

export interface Room {
  id?: UUID;
  [key: string]: unknown;
}

export interface Media {
  id?: UUID;
  url?: string;
  contentType?: string;
  [key: string]: unknown;
}

export interface IAgentRuntime {
  agentId?: UUID;
  [key: string]: unknown;
}

// Utility functions
export function validateUuid(value: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

export function getContentTypeFromMimeType(mimeType: string): ContentType {
  if (mimeType.startsWith('image/')) {return ContentType.IMAGE;}
  if (mimeType.startsWith('video/')) {return ContentType.VIDEO;}
  if (mimeType.startsWith('audio/')) {return ContentType.AUDIO;}
  if (mimeType.startsWith('text/')) {return ContentType.TEXT;}
  return ContentType.FILE;
}

// Logger stub
export const elizaLogger = {
  info: (...args: unknown[]) => console.info('[eliza]', ...args),
  warn: (...args: unknown[]) => console.warn('[eliza]', ...args),
  error: (...args: unknown[]) => console.error('[eliza]', ...args),
  debug: (...args: unknown[]) => console.debug('[eliza]', ...args),
  log: (...args: unknown[]) => console.log('[eliza]', ...args),
};
