/**
 * Hyperfy Type Definitions
 * ========================
 * Comprehensive type definitions for the Hyperfy plugin
 */

import type { UUID } from '@elizaos/core';
import * as THREE from 'three';

// Entity Types
export interface HyperfyPosition {
  x: number;
  y: number;
  z: number;
}

export interface HyperfyRotation {
  x: number;
  y: number;
  z: number;
  w: number;
}

export interface HyperfyScale {
  x: number;
  y: number;
  z: number;
}

export interface HyperfyTransform {
  position: HyperfyPosition;
  rotation: HyperfyRotation;
  scale: HyperfyScale;
}

export interface HyperfyEntityData {
  id: string;
  name: string;
  type?: string;
  blueprintId?: string;
  position?: number[];
  quaternion?: number[];
  scale?: number[];
  metadata?: Record<string, unknown>;
  pinned?: boolean;
  blueprint?: string;
}

export interface HyperfyEntity {
  data: HyperfyEntityData;
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
  scale: THREE.Vector3;
  moving?: boolean;
  isApp?: boolean;
  blueprint?: HyperfyBlueprint;
  transform?: {
    position: THREE.Vector3;
    quaternion: THREE.Quaternion;
    scale: THREE.Vector3;
  };
  addComponent?: (type: string, data: Record<string, unknown>) => void;
  removeComponent?: (type: string) => void;
  toJSON?: () => HyperfyEntityData;
  base?: {
    position: THREE.Vector3;
    quaternion: THREE.Quaternion;
    scale: THREE.Vector3;
  };
  root?: {
    position: THREE.Vector3;
    quaternion: THREE.Quaternion;
    scale: THREE.Vector3;
  };
  ctx?: {
    entity: HyperfyEntity;
  };
  _label?: string;
  destroy?: (sendUpdate?: boolean) => void;
  onUploaded?: () => void;
}

export interface HyperfyPlayer extends HyperfyEntity {
  data: HyperfyEntityData & {
    id: string;
    name: string;
    effect?: {
      emote?: string | null;
    };
  };
  moving: boolean;
  setSessionAvatar?: (url: string) => void;
  modify?: (changes: Partial<HyperfyEntityData>) => void;
}

// Blueprint Types
export interface HyperfyBlueprint {
  id: string;
  name: string;
  type?: string;
  description?: string;
  tags?: string[];
  image?: string;
  author?: string;
  url?: string;
  desc?: string;
  model?: string;
  script?: string;
  props?: Record<string, unknown>;
  preload?: boolean;
  public?: boolean;
  locked?: boolean;
  frozen?: boolean;
  disabled?: boolean;
  unique?: boolean;
}

// Chat Types
export interface HyperfyChatMessage {
  id: string;
  entityId: string;
  text: string;
  timestamp: number;
  from?: string;
  metadata?: Record<string, unknown>;
}

export interface HyperfyChat {
  msgs: HyperfyChatMessage[];
  listeners: ((msgs: HyperfyChatMessage[]) => void)[];
  add: (msg: HyperfyChatMessage, broadcast?: boolean) => void;
  subscribe: (callback: (msgs: HyperfyChatMessage[]) => void) => () => void;
}

// Network Types
export interface HyperfyNetwork {
  id: string;
  send: (event: string, data: Record<string, unknown>) => void;
  upload: (file: File) => Promise<void>;
  disconnect: () => Promise<void>;
  maxUploadSize: number;
}

// Control Types
export interface HyperfyControls {
  enabled: boolean;
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
  grounded: boolean;
  jumpPower: number;
  goto: (x: number, z: number, y?: number) => Promise<void>;
  jump: () => void;
  respawn: () => void;
  setPosition: (x: number, y: number, z: number) => void;
  setQuaternion: (x: number, y: number, z: number, w: number) => void;
  lookAt: (x: number, y: number, z: number) => void;
  stop: () => void;
  stopAllActions?: () => void;
  scrollDelta?: number;
  pointer?: { x: number; y: number };
  camera?: THREE.Camera;
  screen?: { width: number; height: number };
  followEntity?: (entityId: string) => void;
}

// Action Types
export interface HyperfyActions {
  enabled?: boolean;
  register?: (action: any) => void;
  unregister?: (action: any) => void;
  trigger?: (actionName: string, ...args: any[]) => void;
  currentNode?: HyperfyEntity;
  nodes?: HyperfyEntity[];
  getNearby?: (radius: number) => any[];
  execute?: (actionName: string, ...args: unknown[]) => void;
}

// Loader Types
export interface HyperfyLoader {
  load: (url: string) => Promise<HyperfyLoadResult>;
}

export interface HyperfyLoadResult {
  gltf?: any; // GLTF object from Three.js
  emoteFactory?: any;
  error?: Error;
}

// Stage Types
export interface HyperfyStage {
  scene: THREE.Scene;
  environment?: THREE.Texture;
  background?: THREE.Color | THREE.Texture;
}

// Settings Types
export interface HyperfySettings {
  on: (event: string, handler: (data: SettingsChangeEvent) => void) => void;
  model: Record<string, unknown>;
}

export interface SettingsChangeEvent {
  key: string;
  value: unknown;
  prev: unknown;
}

// Event Types
export interface HyperfyEvents {
  emit: (event: string, data: Record<string, unknown>) => void;
  on: (event: string, handler: (data: Record<string, unknown>) => void) => void;
  off: (event: string) => void;
}

// World Types
export interface HyperfyWorld {
  entities: {
    player: HyperfyPlayer | null;
    players: Map<string, HyperfyPlayer>;
    items: Map<string, HyperfyEntity>;
    add: (entity: HyperfyEntity) => void;
    remove: (entityId: string) => void;
    getPlayer: (id: string) => HyperfyPlayer | null;
  };
  network: HyperfyNetwork;
  chat: HyperfyChat;
  controls: HyperfyControls | null;
  loader: HyperfyLoader | null;
  stage: HyperfyStage;
  camera: THREE.PerspectiveCamera | null;
  rig: THREE.Object3D | null;
  livekit: any | null; // Optional LiveKit integration
  events: HyperfyEvents;
  blueprints: {
    add: (blueprint: HyperfyBlueprint) => void;
  };
  settings: HyperfySettings;
  systems: HyperfySystem[];
  actions: HyperfyActions;
  assetsUrl?: string;
  init: (config: HyperfyWorldConfig) => Promise<void>;
  destroy: () => void;
  on: (event: string, handler: (data: Record<string, unknown>) => void) => void;
  off: (event: string) => void;
}

export interface HyperfyWorldConfig {
  wsUrl?: string;
  assetsUrl?: string;
  token?: string;
  metadata?: Record<string, unknown>;
}

// System Types
export interface HyperfySystem {
  name?: string;
  world: any; // Allow any world type for compatibility with existing systems
  init?: () => void | Promise<void>;
  tick?: (delta: number) => void;
  destroy?: () => void;
  enabled?: boolean;
}

// Manager Return Types
export interface EmoteUploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

export interface BuildOperationResult {
  success: boolean;
  entity?: HyperfyEntity;
  error?: string;
}

export interface NavigationResult {
  success: boolean;
  reachedTarget?: boolean;
  error?: string;
}

// Voice Types
export interface VoiceStreamData {
  audio: Buffer;
  sampleRate: number;
  channels: number;
}

// Puppeteer Screenshot Types
export interface ScreenshotOptions {
  width?: number;
  height?: number;
  format?: 'png' | 'jpeg';
  quality?: number;
}

export interface ScreenshotResult {
  data: string; // base64 encoded image
  width: number;
  height: number;
  format: string;
}

// Export utility type guards
export function isHyperfyEntity(obj: unknown): obj is HyperfyEntity {
  return obj !== null && 
    typeof obj === 'object' && 
    'data' in obj &&
    typeof (obj as any).data === 'object' &&
    'id' in (obj as any).data;
}

export function isHyperfyPlayer(entity: HyperfyEntity): entity is HyperfyPlayer {
  return 'moving' in entity && 
    entity.data.id !== undefined &&
    entity.data.name !== undefined;
}

export function isHyperfyChatMessage(obj: unknown): obj is HyperfyChatMessage {
  return obj !== null &&
    typeof obj === 'object' &&
    'id' in obj &&
    'text' in obj &&
    'timestamp' in obj;
}

export interface HyperfyBlueprints {
  items: Map<string, HyperfyBlueprint>;
  get: (id: string) => HyperfyBlueprint | undefined;
  add: (blueprint: HyperfyBlueprint, isOwned?: boolean) => string;
  remove: (id: string) => void;
  clear: () => void;
}

export interface HyperfyEntities {
  items: Map<string, HyperfyEntity>;
  player?: HyperfyEntity;
  players: Map<string, HyperfyPlayer>;
  get: (id: string) => HyperfyEntity | undefined;
  add: (data: HyperfyEntityData, isOwned?: boolean) => HyperfyEntity;
  remove: (id: string) => void;
  clear: () => void;
  update: (id: string, data: Partial<HyperfyEntityData>) => void;
} 