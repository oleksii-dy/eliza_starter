import { World } from '../../core/World';
import type { System } from '../../types';
import { Events } from '../../core/systems/Events';
import { Entities } from '../../core/systems/Entities';
import { SpatialIndex } from '../../core/systems/SpatialIndex';
import { Terrain } from '../../core/systems/Terrain';
import { Time } from '../../core/systems/Time';
import { CombatSystem } from '../../rpg/systems/CombatSystem';
import { InventorySystem } from '../../rpg/systems/InventorySystem';
import { LootSystem } from '../../rpg/systems/LootSystem';
import { MovementSystem } from '../../rpg/systems/MovementSystem';
import { NPCSystem } from '../../rpg/systems/NPCSystem';
import { QuestSystem } from '../../rpg/systems/QuestSystem';
import { SkillsSystem } from '../../rpg/systems/SkillsSystem';
import { SpawningSystem } from '../../rpg/systems/SpawningSystem';

// Type aliases for backward compatibility with test files
export const EventSystem = Events;
export const EntitiesSystem = Entities;

interface MockConnection {
  send: (message: any) => void
  close: () => void
  readyState: number
}

/**
 * Test world for running RPG systems in tests
 */
export class TestWorld extends World {
  // Add system properties
  spatialIndex!: SpatialIndex;
  terrain!: Terrain;
  timeSystem!: Time;
  combat!: CombatSystem;
  inventory!: InventorySystem;
  loot!: LootSystem;
  movement!: MovementSystem;
  npc!: NPCSystem;
  quest!: QuestSystem;
  skills!: SkillsSystem;
  spawning!: SpawningSystem;

  private initialized: boolean = false;
  private cleanupCallbacks: (() => void)[] = [];

  constructor() {
    super();
    this.setupSystems();
  }

  /**
   * Set up all systems
   */
  private setupSystems(): void {
    // Register additional systems
    this.register('spatialIndex', SpatialIndex as any);
    this.register('terrain', Terrain as any);
    this.register('timeSystem', Time as any);
    this.register('combat', CombatSystem as any);
    this.register('inventory', InventorySystem as any);
    this.register('loot', LootSystem as any);
    this.register('movement', MovementSystem as any);
    this.register('npc', NPCSystem as any);
    this.register('quest', QuestSystem as any);
    this.register('skills', SkillsSystem as any);
    this.register('spawning', SpawningSystem as any);
  }

  /**
   * Initialize all systems
   */
  async init(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Initialize with minimal options to avoid physics issues
      await super.init({
        physics: false, // Disable physics for tests
        renderer: 'headless',
        networkRate: 60,
        maxDeltaTime: 1 / 30,
        fixedDeltaTime: 1 / 60,
        assetsDir: './world/assets',
        assetsUrl: 'http://localhost/assets',
      });

      // Initialize systems that need async setup with timeout
      const initTimeout = (promise: Promise<any>, name: string) => {
        return Promise.race([
          promise,
          new Promise((_, reject) => setTimeout(() => reject(new Error(`${name} init timeout`)), 5000)),
        ]);
      };

      try {
        if (this.npc && typeof (this.npc as any).init === 'function') {
          await initTimeout((this.npc as any).init(), 'NPC System');
        }
      } catch (error) {
        console.warn('NPC system init failed:', error);
      }

      try {
        if (this.quest && typeof (this.quest as any).init === 'function') {
          await initTimeout((this.quest as any).init(), 'Quest System');
        }
      } catch (error) {
        console.warn('Quest system init failed:', error);
      }

      try {
        if (this.loot && typeof (this.loot as any).init === 'function') {
          await initTimeout((this.loot as any).init(), 'Loot System');
        }
      } catch (error) {
        console.warn('Loot system init failed:', error);
      }

      // Add mock network connection
      this.setupMockNetwork();

      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize TestWorld:', error);
      // Don't throw, allow tests to continue with partial initialization
      this.initialized = true;
    }
  }

  /**
   * Setup mock network for testing
   */
  private setupMockNetwork(): void {
    if (!this.network) {
      return;
    }

    const mockConnection: MockConnection = {
      send: (message: any) => {
        // Mock network send - emit events for testing
        this.events.emit('network:message', message);
      },
      close: () => {
        // Mock close
      },
      readyState: 1, // WebSocket.OPEN
    };

    // Add connection if method exists
    if (typeof (this.network as any).addConnection === 'function') {
      ;(this.network as any).addConnection('mock', mockConnection);
    }
  }

  /**
   * Run the world for a specified duration
   */
  async run(duration: number): Promise<void> {
    if (!this.initialized) {
      await this.init();
    }

    return new Promise(resolve => {
      const startTime = Date.now();

      // Use a simplified tick loop that won't hang
      const interval = setInterval(() => {
        const elapsed = Date.now() - startTime;

        try {
          // Use world's tick method with current time
          this.tick(Date.now());
        } catch (error) {
          console.warn('Error in world tick:', error);
        }

        if (elapsed >= duration) {
          clearInterval(interval);
          resolve();
        }
      }, 16);

      // Store for cleanup
      this.cleanupCallbacks.push(() => clearInterval(interval));

      // Safety timeout
      const safetyTimeout = setTimeout(() => {
        clearInterval(interval);
        resolve();
      }, duration + 1000);

      this.cleanupCallbacks.push(() => clearTimeout(safetyTimeout));
    });
  }

  /**
   * Step the world forward by one frame
   */
  step(_delta: number = 16): void {
    if (!this.initialized) {
      return;
    }

    try {
      // Use world's tick method
      this.tick(Date.now());
    } catch (error) {
      console.warn('Error in world step:', error);
    }
  }

  /**
   * Clean up the test world
   */
  cleanup(): void {
    try {
      // Run cleanup callbacks
      for (const callback of this.cleanupCallbacks) {
        try {
          callback();
        } catch (error) {
          console.warn('Error in cleanup callback:', error);
        }
      }
      this.cleanupCallbacks = [];

      // Call world's destroy method
      try {
        this.destroy();
      } catch (error) {
        console.warn('Error in world destroy:', error);
      }

      this.initialized = false;
    } catch (error) {
      console.warn('Error during cleanup:', error);
    }
  }

  /**
   * Create a test player entity
   */
  createTestPlayer(playerId: string = 'test_player'): any {
    if (!this.entities) {
      console.warn('Entities system not available');
      return null;
    }

    try {
      const player = this.entities.create(playerId);
      if (!player) {
        console.warn('Failed to create player entity');
        return null;
      }

      // Add player components
      player.addComponent('stats', {
        hitpoints: { current: 100, max: 100 },
        attack: { current: 10, max: 10 },
        strength: { current: 10, max: 10 },
        defence: { current: 10, max: 10 },
        speed: { current: 5, max: 5 },
        combatLevel: 1,
      });

      player.addComponent('inventory', {
        items: new Map(),
        capacity: 28,
        gold: 100,
      });

      player.addComponent('skills', {
        attack: { level: 1, experience: 0 },
        strength: { level: 1, experience: 0 },
        defence: { level: 1, experience: 0 },
        hitpoints: { level: 10, experience: 0 },
      });

      player.addComponent('combat', {
        inCombat: false,
        target: null,
        lastAttack: 0,
        attackCooldown: 4000,
        combatStyle: 'melee',
      });

      player.addComponent('movement', {
        position: { x: 0, y: 0, z: 0 },
        destination: null,
        moveSpeed: 10,
        isMoving: false,
        facingDirection: 0,
      });

      // Set entity position
      player.position = { x: 0, y: 0, z: 0 };

      return player;
    } catch (error) {
      console.error('Error creating test player:', error);
      return null;
    }
  }

  /**
   * Get system by name
   */
  override getSystem<T extends System>(name: string): T | undefined {
    switch (name) {
      case 'events':
        return this.events as unknown as T;
      case 'entities':
        return this.entities as unknown as T;
      case 'network':
        return this.network as unknown as T;
      case 'spatialIndex':
        return this.spatialIndex as unknown as T;
      case 'terrain':
        return this.terrain as unknown as T;
      case 'time':
        return this.timeSystem as unknown as T;
      case 'combat':
        return this.combat as unknown as T;
      case 'inventory':
        return this.inventory as unknown as T;
      case 'loot':
        return this.loot as unknown as T;
      case 'movement':
        return this.movement as unknown as T;
      case 'npc':
        return this.npc as unknown as T;
      case 'quest':
        return this.quest as unknown as T;
      case 'skills':
        return this.skills as unknown as T;
      case 'spawning':
        return this.spawning as unknown as T;
      default:
        return super.getSystem<T>(name);
    }
  }

  /**
   * Check if world is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}
