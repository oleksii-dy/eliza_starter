/**
 * Local implementation of Hyperfy world creation for Node.js
 * This replaces the import from '../hyperfy/src/core/createNodeClientWorld.js'
 */

import * as THREE from 'three';
import type {
  HyperfyWorld,
  HyperfyEntity,
  HyperfyPlayer,
  HyperfyChatMessage,
  HyperfyBlueprint,
  HyperfyWorldConfig,
  HyperfyControls,
  HyperfyActions,
  SettingsChangeEvent
} from '../../types/hyperfy';

export function createNodeClientWorld(): HyperfyWorld {
  const eventHandlers = new Map<string, Set<(data: Record<string, unknown>) => void>>();
  const chatListeners: ((msgs: HyperfyChatMessage[]) => void)[] = [];
  const chatMessages: HyperfyChatMessage[] = [];

  const world: HyperfyWorld = {
    entities: {
      player: null,
      players: new Map(),
      items: new Map(),
      add: (entity: HyperfyEntity) => {
        if (entity.data?.id) {
          world.entities.items.set(entity.data.id, entity);
        }
      },
      remove: (entityId: string) => {
        world.entities.items.delete(entityId);
      },
      getPlayer: (id: string) => {
        return world.entities.players.get(id) || null;
      }
    },
    network: {
      id: '',
      send: (event: string, data: Record<string, unknown>) => {
        console.log(`[Network] Sending ${event}:`, data);
      },
      upload: async (file: File) => {
        console.log(`[Network] Uploading file: ${file.name}`);
        // Simulate upload
        return Promise.resolve();
      },
      disconnect: async () => {
        console.log('[Network] Disconnecting...');
        world.events.emit('disconnect', { reason: 'Manual disconnect' });
        return Promise.resolve();
      },
      maxUploadSize: 100 // MB
    },
    chat: {
      msgs: chatMessages,
      listeners: chatListeners,
      add: (msg: HyperfyChatMessage, broadcast?: boolean) => {
        chatMessages.push(msg);
        if (chatMessages.length > 50) {
          chatMessages.shift();
        }
        chatListeners.forEach(cb => cb(chatMessages));
        world.events.emit('chat', { message: msg });
        if (broadcast) {
          world.network.send('chatAdded', { message: msg });
        }
      },
      subscribe: (callback: (msgs: HyperfyChatMessage[]) => void) => {
        chatListeners.push(callback);
        return () => {
          const idx = chatListeners.indexOf(callback);
          if (idx > -1) chatListeners.splice(idx, 1);
        };
      }
    },
    controls: null,
    loader: null,
    stage: {
      scene: new THREE.Scene(),
      environment: undefined,
      background: undefined
    },
    camera: null,
    rig: null,
    livekit: null,
    events: {
      emit: (event: string, data: Record<string, unknown>) => {
        const handlers = eventHandlers.get(event);
        if (handlers) {
          handlers.forEach(handler => handler(data));
        }
      },
      on: (event: string, handler: (data: Record<string, unknown>) => void) => {
        if (!eventHandlers.has(event)) {
          eventHandlers.set(event, new Set());
        }
        eventHandlers.get(event)!.add(handler);
      },
      off: (event: string) => {
        eventHandlers.delete(event);
      }
    },
    blueprints: {
      add: (blueprint: HyperfyBlueprint) => {
        console.log('[Blueprints] Adding blueprint:', blueprint);
      }
    },
    settings: {
      on: (event: string, handler: (data: SettingsChangeEvent) => void) => {
        console.log(`[Settings] Registered handler for ${event}`);
      },
      model: {}
    },
    systems: []
    actions: {
      execute: (actionName: string, ...args: unknown[]) => {
        console.log(`[Actions] Executing ${actionName}`, args);
      },
      getNearby: (radius: number = 10) => {
        // Return entities within radius
        const nearbyEntities: HyperfyEntity[] = [];
        world.entities.items.forEach(entity => {
          nearbyEntities.push(entity);
        });
        return nearbyEntities;
      }
    },
    init: async (config: HyperfyWorldConfig) => {
      console.log('[World] Initializing with config:', config);
      world.assetsUrl = config.assetsUrl || 'https://assets.hyperfy.io/';
      world.network.id = `network-${Date.now()}`;
      
      // Simulate connection
      setTimeout(() => {
        world.events.emit('connect', { worldId: 'test-world' });
      }, 100);
      
      return Promise.resolve();
    },
    destroy: () => {
      console.log('[World] Destroying world...');
      eventHandlers.clear();
      chatListeners.length = 0;
      chatMessages.length = 0;
    },
    on: (event: string, handler: (data: Record<string, unknown>) => void) => {
      world.events.on(event, handler);
    },
    off: (event: string) => {
      world.events.off(event);
    }
  };

  return world;
} 