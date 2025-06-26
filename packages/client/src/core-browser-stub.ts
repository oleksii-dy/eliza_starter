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
    [key: string]: any;
  };
  [key: string]: any;
}

export interface Character {
  id?: UUID;
  name?: string;
  [key: string]: any;
}

export interface Memory {
  id?: UUID;
  content?: Content;
  [key: string]: any;
}

export interface Content {
  text?: string;
  type?: string;
  [key: string]: any;
}

export interface Room {
  id?: UUID;
  [key: string]: any;
}

export interface Media {
  id?: UUID;
  url?: string;
  contentType?: string;
  [key: string]: any;
}

export interface IAgentRuntime {
  agentId?: UUID;
  [key: string]: any;
}

// Utility functions
export function validateUuid(value: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

export function getContentTypeFromMimeType(mimeType: string): ContentType {
  if (mimeType.startsWith('image/')) return ContentType.IMAGE;
  if (mimeType.startsWith('video/')) return ContentType.VIDEO;
  if (mimeType.startsWith('audio/')) return ContentType.AUDIO;
  if (mimeType.startsWith('text/')) return ContentType.TEXT;
  return ContentType.FILE;
}

// Logger stub
export const elizaLogger = {
  info: (...args: any[]) => console.info('[eliza]', ...args),
  warn: (...args: any[]) => console.warn('[eliza]', ...args),
  error: (...args: any[]) => console.error('[eliza]', ...args),
  debug: (...args: any[]) => console.debug('[eliza]', ...args),
  log: (...args: any[]) => console.log('[eliza]', ...args),
};
