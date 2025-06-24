import type { IAgentRuntime, Role, UUID, World } from '@elizaos/core';
import { vi } from 'vitest';

export function createMockRuntime(overrides: Partial<IAgentRuntime> = {}): IAgentRuntime {
  const registeredServices = new Map<string, any>();
  const worlds = new Map<string, any>();
  const components = new Map<string, any[]>();
  const settings = new Map<string, any>([
    ['ENCRYPTION_SALT', 'test-salt-12345'],
    ['NGROK_AUTH_TOKEN', 'test-ngrok-token'],
    ['ENCRYPTION_KEY', 'test-encryption-key-32-characters-long'],
  ]);

  const runtime = {
    agentId: 'agent-123' as UUID,
    character: {
      settings: {
        secrets: {},
      },
    },
    plugins: [],
    getSetting: vi.fn((key: string) => {
      return settings.get(key) || null;
    }),
    setSetting: vi.fn((key: string, value: any) => {
      settings.set(key, value);
      if (key.startsWith('ENV_')) {
        if (!runtime.character.settings) {
          runtime.character.settings = {};
        }
        if (!runtime.character.settings.secrets) {
          runtime.character.settings.secrets = {};
        }
        runtime.character.settings.secrets[key] = value;
      }
    }),
    settings: {
      ENCRYPTION_SALT: 'test-salt-12345',
      NGROK_AUTH_TOKEN: 'test-ngrok-token',
      ENCRYPTION_KEY: 'test-encryption-key-32-characters-long',
    },
    db: {
      createWorld: vi.fn(async (world: any) => {
        worlds.set(world.id, world);
        return world;
      }),
      updateWorld: vi.fn(async (world: any) => {
        worlds.set(world.id, world);
        return world;
      }),
      getWorld: vi.fn(async (id: any) => worlds.get(id) || null),
      getWorlds: vi.fn(async (agentId: any) =>
        Array.from(worlds.values()).filter((w: any) => w.agentId === agentId)
      ),
      getComponents: vi.fn(async (entityId: any) => components.get(entityId) || []),
      createComponent: vi.fn(async (component: any) => {
        const entityComponents = components.get(component.entityId) || [];
        entityComponents.push(component);
        components.set(component.entityId, entityComponents);
        return component;
      }),
      updateComponent: vi.fn(async (component: any) => {
        const entityComponents = components.get(component.entityId) || [];
        const index = entityComponents.findIndex((c: any) => c.id === component.id);
        if (index >= 0) {
          entityComponents[index] = component;
        }
        return component;
      }),
      deleteComponent: vi.fn(async (id: any) => {
        for (const [entityId, entityComponents] of components.entries()) {
          const index = entityComponents.findIndex((c: any) => c.id === id);
          if (index >= 0) {
            entityComponents.splice(index, 1);
            if (entityComponents.length === 0) {
              components.delete(entityId);
            }
            return true;
          }
        }
        return false;
      }),
    },
    getService: vi.fn((type: string) => registeredServices.get(type) || null),
    registerService: vi.fn(async (ServiceClass: any) => {
      const identifier = ServiceClass.serviceName || ServiceClass.serviceType;
      let instance;

      if (identifier === 'SECRETS' && ServiceClass.start) {
        // For EnhancedSecretManager, use the static start method
        instance = await ServiceClass.start(runtime);
      } else if (identifier === 'SECRET_FORMS' && ServiceClass.prototype.initialize) {
        // For SecretFormService, create instance and initialize it
        instance = new ServiceClass(runtime);
        if (instance.initialize) {
          await instance.initialize();
        }
      } else {
        // For other services, just create instance
        instance = new ServiceClass(runtime);
      }

      registeredServices.set(identifier, instance);
      return Promise.resolve();
    }) as any,
    // Add getComponents and other methods to runtime directly (not just db)
    getComponents: vi.fn(async (entityId: any) => components.get(entityId) || []),
    createComponent: vi.fn(async (component: any) => {
      const entityComponents = components.get(component.entityId) || [];
      entityComponents.push(component);
      components.set(component.entityId, entityComponents);
      return component;
    }),
    updateComponent: vi.fn(async (component: any) => {
      const entityComponents = components.get(component.entityId) || [];
      const index = entityComponents.findIndex((c: any) => c.id === component.id);
      if (index >= 0) {
        entityComponents[index] = component;
      }
      return component;
    }),
    getWorld: vi.fn(async (id: any) => worlds.get(id) || null),
    updateWorld: vi.fn(async (world: any) => {
      worlds.set(world.id, world);
      return world;
    }),
    ...overrides,
  } as any;

  return runtime;
}
