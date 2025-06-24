import { World, System, WorldOptions } from '../types';
import { RPGEntity } from '../rpg/entities/RPGEntity';
import { CombatSystem } from '../rpg/systems/CombatSystem';
import { InventorySystem } from '../rpg/systems/InventorySystem';
import { NPCSystem } from '../rpg/systems/NPCSystem';
import { LootSystem } from '../rpg/systems/LootSystem';
import { SpawningSystem } from '../rpg/systems/SpawningSystem';
import { SkillsSystem } from '../rpg/systems/SkillsSystem';
import { MovementSystem } from '../rpg/systems/MovementSystem';

// Create a minimal test world that supports RPG entities
export async function createTestWorld(options?: any): Promise<World> {
  const systems: System[] = [];
  const world = {
    // Core properties
    frame: 0,
    time: 0,
    accumulator: 0,
    systems,
    networkRate: 1/8,
    assetsUrl: 'http://localhost/assets',
    assetsDir: './assets',
    hot: new Set(),
    rig: { position: { x: 0, y: 0, z: 0 } },
    camera: { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0, w: 1 } },

    // Mock systems
    audio: {},
    controls: {},
    prefs: {},
    settings: {} as any,
    collections: {} as any,
    apps: {} as any,
    anchors: {} as any,
    scripts: {} as any,
    chat: {} as any,
    blueprints: {} as any,
    physics: {
      raycast(origin: any, direction: any, options?: any) {
        return null; // No collision by default
      },
      sphereCast() { return null; },
      overlapSphere() { return []; },
      sweep() { return null; },
      addActor() {},
      world: { gravity: { x: 0, y: -9.81, z: 0 } }
    } as any,
    stage: {} as any,

    // Entities system
    entities: {
      items: new Map(),
      players: new Map(),
      apps: new Map(),
      add(data: any, local?: boolean) {
        const entity = new RPGEntity(world as World, data.type || 'entity', data);
        this.items.set(entity.data.id, entity);
        if (data.type === 'player') {
          this.players.set(entity.data.id, entity);
        }
        return entity;
      },
      create(name: string, options?: any) {
        return this.add({ name, ...options });
      },
      destroyEntity(entityId: string) {
        const entity = this.items.get(entityId);
        if (entity) {
          entity.destroy();
          this.items.delete(entityId);
          this.players.delete(entityId);
        }
      },
      get(entityId: string) {
        return this.items.get(entityId) || null;
      },
      has(entityId: string) {
        return this.items.has(entityId);
      },
      remove(entityId: string) {
        this.destroyEntity(entityId);
      },
      set(entityId: string, entity: any) {
        this.items.set(entityId, entity);
      },
      getAll() {
        return Array.from(this.items.values());
      },
      getAllPlayers() {
        return Array.from(this.players.values());
      },
      getRemovedIds() {
        return [];
      },
      setHot(entity: any, hot: boolean) {},
      getLocalPlayer() { return null; },
      getPlayer(id: string) { return this.players.get(id) || null; }
    } as any,

    // Events system
    events: {
      handlers: new Map<string, Set<Function>>(),
      emit(event: string, data?: any) {
        const eventHandlers = this.handlers.get(event);
        if (eventHandlers) {
          eventHandlers.forEach(handler => handler(data));
        }
      },
      on(event: string, handler: Function) {
        if (!this.handlers.has(event)) {
          this.handlers.set(event, new Set());
        }
        this.handlers.get(event)!.add(handler);
      },
      off(event: string, handler?: Function) {
        if (handler) {
          this.handlers.get(event)?.delete(handler);
        } else {
          this.handlers.delete(event);
        }
      }
    } as any,

    // Methods
    register(key: string, SystemClass: any) {
      const system = new SystemClass(this);
      systems.push(system);
      (this as any)[key] = system;
      return system;
    },
    getSystem(name: string) {
      return (this as any)[name];
    },
    getSystemByType(constructor: any) {
      return systems.find(s => s instanceof constructor);
    },
    async init(options: WorldOptions) {
      // Register RPG systems
      this.register('combat', CombatSystem);
      this.register('inventory', InventorySystem);
      this.register('npc', NPCSystem);
      this.register('loot', LootSystem);
      this.register('spawning', SpawningSystem);
      this.register('skills', SkillsSystem);
      this.register('movement', MovementSystem);

      // Initialize all systems
      for (const system of systems) {
        if (system.init) {
          await system.init(options);
        }
      }
    },
    start() {
      for (const system of systems) {
        if (system.start) {
          system.start();
        }
      }
    },
    tick(time: number) {
      const deltaMs = 16; // 60fps
      const delta = deltaMs / 1000;

      this.frame++;
      this.time = time;

      // Update all systems
      for (const system of systems) {
        if (system.update) {
          system.update(delta);
        }
      }

      // Fixed update
      for (const system of systems) {
        if (system.fixedUpdate) {
          system.fixedUpdate(delta);
        }
      }
    },
    destroy() {
      for (const system of systems) {
        if (system.destroy) {
          system.destroy();
        }
      }
    },
    resolveURL(url: string) { return url; },
    setHot() {},
    setupMaterial() {},
    inject() {},

    // Helper methods for tests
    step() {
      this.tick(Date.now());
    },
    async run(ms: number) {
      const start = Date.now();
      while (Date.now() - start < ms) {
        this.step();
        await new Promise(resolve => setTimeout(resolve, 16));
      }
    },
    createTestPlayer(id: string) {
      return this.entities.add({
        id,
        type: 'player',
        name: `Player ${id}`,
        position: { x: 0, y: 0, z: 0 }
      });
    }
  } as any;

  // Add safe zones configuration to allow combat outside spawn
  (world as any).safeZones = [
    { type: 'circle', center: { x: 0, y: 0, z: 0 }, radius: 50 } // Small spawn area
  ];

  // Initialize the world
  await world.init({
    physics: false,
    renderer: 'headless',
    ...options
  });
  world.start();

  return world as World;
}

export async function runWorldFor(world: World, ms: number): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < ms) {
    world.tick(Date.now());
    await new Promise(resolve => setTimeout(resolve, 16));
  }
}

export async function runWorldUntil(world: World, condition: () => boolean, timeout = 5000): Promise<void> {
  const start = Date.now();
  while (!condition() && Date.now() - start < timeout) {
    world.tick(Date.now());
    await new Promise(resolve => setTimeout(resolve, 16));
  }
  if (!condition()) {
    throw new Error('Condition not met within timeout');
  }
}
