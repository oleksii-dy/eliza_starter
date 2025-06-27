/**
 * RuneScape Hunter System Implementation
 * =====================================
 * Handles creature tracking, trap mechanics, and hunting rewards
 */

import { logger } from '@elizaos/core';
import type { HyperfySystem, HyperfyWorld, HyperfyEntity } from '../../types/hyperfy';
import type { StatsComponent } from '../types/stats';
import type { InventoryComponent } from '../types/inventory';
import type {
  HunterCreature,
  HunterLoot,
  CreatureLocation,
  GatheringAction,
  Tool
} from '../types/gathering';
import { GATHERING_CONSTANTS } from '../types/gathering';

export class HunterSystem implements HyperfySystem {
  name = 'HunterSystem';
  world: HyperfyWorld;
  enabled = true;

  // Hunter data
  private creatures: Map<string, HunterCreature> = new Map();
  private creatureInstances: Map<string, CreatureInstance> = new Map();
  private traps: Map<string, HunterTrap> = new Map();
  private activeActions: Map<string, GatheringAction> = new Map();
  private hunterTools: Map<number, Tool> = new Map();

  // Tick tracking
  private tickCounter = 0;
  private lastTickTime = 0;

  constructor(world: HyperfyWorld) {
    this.world = world;
    this.initializeHunterData();
    logger.info('[HunterSystem] Initialized RuneScape hunter mechanics');
  }

  async init(): Promise<void> {
    logger.info('[HunterSystem] Starting hunter system...');
    
    // Subscribe to hunter events
    this.world.events.on('rpg:start_hunting', this.handleStartHunting.bind(this));
    this.world.events.on('rpg:stop_hunting', this.handleStopHunting.bind(this));
    this.world.events.on('rpg:set_trap', this.handleSetTrap.bind(this));
    this.world.events.on('rpg:check_trap', this.handleCheckTrap.bind(this));
    this.world.events.on('rpg:hunt_creature', this.handleHuntCreature.bind(this));
    
    // Spawn initial creatures in the world
    this.spawnCreatures();
  }

  tick(delta: number): void {
    const now = Date.now();
    
    // Process hunter ticks (every 600ms like RuneScape)
    if (now - this.lastTickTime >= 600) {
      this.processHunterTick();
      this.lastTickTime = now;
      this.tickCounter++;
    }
    
    // Update hunting actions
    this.updateHuntingActions(delta);
    
    // Update creature movement
    this.updateCreatureMovement(now);
    
    // Update trap states
    this.updateTraps(now);
  }

  destroy(): void {
    this.world.events.off('rpg:start_hunting');
    this.world.events.off('rpg:stop_hunting');
    this.world.events.off('rpg:set_trap');
    this.world.events.off('rpg:check_trap');
    this.world.events.off('rpg:hunt_creature');
    logger.info('[HunterSystem] Hunter system destroyed');
  }

  /**
   * Set a trap for hunting
   */
  setTrap(playerId: string, creatureId: string, position: { x: number; y: number; z: number }): boolean {
    const player = this.world.entities.players.get(playerId);
    if (!player) {
      logger.warn(`[HunterSystem] Player ${playerId} not found`);
      return false;
    }

    const creature = this.creatures.get(creatureId);
    if (!creature) {
      logger.warn(`[HunterSystem] Creature ${creatureId} not found`);
      return false;
    }

    // Check hunter level requirement
    const stats = this.getPlayerStats(playerId);
    if (!stats || stats.hunter.level < creature.level) {
      logger.info(`[HunterSystem] Player ${playerId} needs hunter level ${creature.level}`);
      return false;
    }

    // Check if player has required items
    if (!this.playerHasRequiredItems(playerId, creature.requiredItems)) {
      logger.info(`[HunterSystem] Player ${playerId} missing required items for ${creature.name}`);
      return false;
    }

    // Create trap
    const trapId = `trap_${playerId}_${Date.now()}`;
    const trap: HunterTrap = {
      id: trapId,
      playerId,
      creatureId,
      position,
      setTime: Date.now(),
      lastCheck: Date.now(),
      state: 'empty',
      caughtCreature: null,
      collapseTime: Date.now() + (GATHERING_CONSTANTS.TRAP_DURATION * 1000),
    };

    this.traps.set(trapId, trap);

    // Consume required items
    this.consumeRequiredItems(playerId, creature.requiredItems);

    logger.info(`[HunterSystem] ${playerId} set trap for ${creature.name} at (${position.x}, ${position.y}, ${position.z})`);

    // Emit trap set event
    this.world.events.emit('rpg:trap_set', {
      playerId,
      trapId,
      creatureId,
      position,
    });

    return true;
  }

  /**
   * Check a trap for catches
   */
  checkTrap(playerId: string, trapId: string): boolean {
    const trap = this.traps.get(trapId);
    if (!trap) {
      logger.warn(`[HunterSystem] Trap ${trapId} not found`);
      return false;
    }

    if (trap.playerId !== playerId) {
      logger.warn(`[HunterSystem] Player ${playerId} doesn't own trap ${trapId}`);
      return false;
    }

    trap.lastCheck = Date.now();

    if (trap.state === 'caught') {
      // Harvest the catch
      this.harvestTrap(playerId, trap);
      return true;
    } else if (trap.state === 'collapsed') {
      // Remove collapsed trap
      this.removeTrap(trapId);
      logger.info(`[HunterSystem] ${playerId} removed collapsed trap`);
      return false;
    } else {
      logger.info(`[HunterSystem] ${playerId} checked empty trap ${trapId}`);
      return false;
    }
  }

  /**
   * Start active hunting (tracking creatures)
   */
  startHunting(playerId: string, creatureId: string): boolean {
    const player = this.world.entities.players.get(playerId);
    if (!player) {
      logger.warn(`[HunterSystem] Player ${playerId} not found`);
      return false;
    }

    const creature = this.creatures.get(creatureId);
    if (!creature) {
      logger.warn(`[HunterSystem] Creature ${creatureId} not found`);
      return false;
    }

    // Only allow tracking method for active hunting
    if (creature.method !== 'tracking') {
      logger.info(`[HunterSystem] ${creature.name} requires ${creature.method}, not tracking`);
      return false;
    }

    // Check hunter level requirement
    const stats = this.getPlayerStats(playerId);
    if (!stats || stats.hunter.level < creature.level) {
      logger.info(`[HunterSystem] Player ${playerId} needs hunter level ${creature.level}`);
      return false;
    }

    // Check if player already hunting
    if (this.activeActions.has(playerId)) {
      this.stopHunting(playerId);
    }

    // Calculate hunting duration
    const baseDuration = this.calculateHuntingDuration(stats.hunter.level, creature);
    
    // Create hunting action
    const action: GatheringAction = {
      playerId,
      skill: 'hunter',
      nodeId: creatureId, // Use creature ID as node ID for tracking
      startTime: Date.now(),
      duration: baseDuration,
      attempts: 0,
      itemsGained: [],
      xpGained: 0,
      successRate: this.calculateCatchRate(stats.hunter.level, creature),
      lastAttempt: 0,
    };

    this.activeActions.set(playerId, action);

    logger.info(`[HunterSystem] ${playerId} started tracking ${creature.name} (${(baseDuration/1000).toFixed(1)}s per attempt)`);

    // Emit hunting started event
    this.world.events.emit('rpg:hunting_started', {
      playerId,
      creatureId,
      catchRate: action.successRate,
    });

    return true;
  }

  /**
   * Stop active hunting
   */
  stopHunting(playerId: string): boolean {
    const action = this.activeActions.get(playerId);
    if (!action) {
      return false;
    }

    // Remove from active actions
    this.activeActions.delete(playerId);

    logger.info(`[HunterSystem] ${playerId} stopped hunting`);

    // Emit hunting stopped event
    this.world.events.emit('rpg:hunting_stopped', {
      playerId,
      totalXP: action.xpGained,
      totalCatches: action.itemsGained.length,
    });

    return true;
  }

  /**
   * Process a hunting attempt (for tracking method)
   */
  private processHuntingAttempt(action: GatheringAction): void {
    const creature = this.creatures.get(action.nodeId);
    
    if (!creature) {
      this.stopHunting(action.playerId);
      return;
    }

    action.attempts++;

    // Check for successful catch
    const success = Math.random() < action.successRate;
    
    if (success) {
      // Grant primary loot
      this.grantLoot(action.playerId, creature.primaryLoot, 1);
      
      // Check secondary loot
      if (creature.secondaryLoot) {
        for (const loot of creature.secondaryLoot) {
          if (Math.random() < loot.chance) {
            const quantity = Math.floor(Math.random() * (loot.quantity.max - loot.quantity.min + 1)) + loot.quantity.min;
            this.grantLoot(action.playerId, loot.itemId, quantity);
          }
        }
      }
      
      // Grant XP
      this.grantHunterXP(action.playerId, creature.xp);
      action.xpGained += creature.xp;
      
      // Track items gained
      action.itemsGained.push({ itemId: creature.primaryLoot, quantity: 1 });

      logger.info(`[HunterSystem] ${action.playerId} caught ${creature.name} (${action.attempts} attempts)`);

      // Emit hunting success event
      this.world.events.emit('rpg:hunting_success', {
        playerId: action.playerId,
        creatureId: creature.id,
        primaryLoot: creature.primaryLoot,
        xpGained: creature.xp,
      });

      // Check if creature escapes (ends hunting session)
      if (Math.random() < creature.escapeChance) {
        logger.info(`[HunterSystem] ${creature.name} escaped from ${action.playerId}`);
        this.stopHunting(action.playerId);
        return;
      }
    }

    action.lastAttempt = Date.now();
  }

  /**
   * Harvest a caught trap
   */
  private harvestTrap(playerId: string, trap: HunterTrap): void {
    const creature = this.creatures.get(trap.creatureId);
    if (!creature) {
      logger.warn(`[HunterSystem] Creature ${trap.creatureId} not found for trap harvest`);
      return;
    }

    // Grant primary loot
    this.grantLoot(playerId, creature.primaryLoot, 1);
    
    // Check secondary loot
    if (creature.secondaryLoot) {
      for (const loot of creature.secondaryLoot) {
        if (Math.random() < loot.chance) {
          const quantity = Math.floor(Math.random() * (loot.quantity.max - loot.quantity.min + 1)) + loot.quantity.min;
          this.grantLoot(playerId, loot.itemId, quantity);
        }
      }
    }
    
    // Grant XP
    this.grantHunterXP(playerId, creature.xp);

    logger.info(`[HunterSystem] ${playerId} harvested ${creature.name} from trap ${trap.id}`);

    // Emit trap harvest event
    this.world.events.emit('rpg:trap_harvested', {
      playerId,
      trapId: trap.id,
      creatureId: creature.id,
      primaryLoot: creature.primaryLoot,
      xpGained: creature.xp,
    });

    // Remove the trap
    this.removeTrap(trap.id);
  }

  /**
   * Remove a trap from the world
   */
  private removeTrap(trapId: string): void {
    this.traps.delete(trapId);
    
    // Emit trap removed event
    this.world.events.emit('rpg:trap_removed', {
      trapId,
    });
  }

  /**
   * Calculate hunting duration for tracking
   */
  private calculateHuntingDuration(level: number, creature: HunterCreature): number {
    let baseDuration = GATHERING_CONSTANTS.BASE_HUNTER_TIME * 600; // Convert ticks to ms
    
    // Level affects hunting speed
    const levelBonus = Math.max(0, (level - creature.level) * 0.03);
    baseDuration *= (1 - levelBonus);
    
    // Add some randomness (±40%)
    const randomFactor = 0.6 + Math.random() * 0.8;
    baseDuration *= randomFactor;
    
    return Math.max(2000, baseDuration); // Minimum 2 seconds
  }

  /**
   * Calculate catch rate for hunting
   */
  private calculateCatchRate(level: number, creature: HunterCreature): number {
    let catchRate = creature.catchRate;
    
    // Level bonus
    const levelBonus = Math.max(0, (level - creature.level) * 0.02);
    catchRate += levelBonus;
    
    return Math.min(0.8, Math.max(0.05, catchRate)); // Clamp between 5% and 80%
  }

  /**
   * Check if player has required items
   */
  private playerHasRequiredItems(playerId: string, requiredItems: number[]): boolean {
    const inventory = this.getPlayerInventory(playerId);
    if (!inventory) return false;

    for (const itemId of requiredItems) {
      const hasItem = inventory.items.some(item => item?.itemId === itemId && item.quantity > 0);
      if (!hasItem) {
        return false;
      }
    }

    return true;
  }

  /**
   * Consume required items from inventory
   */
  private consumeRequiredItems(playerId: string, requiredItems: number[]): void {
    for (const itemId of requiredItems) {
      this.world.events.emit('rpg:remove_item', {
        playerId,
        itemId,
        quantity: 1,
      });
    }
  }

  /**
   * Grant loot to player
   */
  private grantLoot(playerId: string, itemId: number, quantity: number): void {
    this.world.events.emit('rpg:add_item', {
      playerId,
      itemId,
      quantity,
      noted: false,
    });
  }

  /**
   * Grant hunter XP
   */
  private grantHunterXP(playerId: string, amount: number): void {
    this.world.events.emit('rpg:xp_gain', {
      playerId,
      skill: 'hunter',
      amount,
      source: 'hunting',
    });
  }

  /**
   * Update active hunting actions
   */
  private updateHuntingActions(delta: number): void {
    const now = Date.now();
    
    for (const action of this.activeActions.values()) {
      // Check if it's time for next hunting attempt
      if (now - action.lastAttempt >= action.duration) {
        this.processHuntingAttempt(action);
      }
    }
  }

  /**
   * Update creature movement and behavior
   */
  private updateCreatureMovement(now: number): void {
    for (const instance of this.creatureInstances.values()) {
      if (now - instance.lastMove >= GATHERING_CONSTANTS.CREATURE_ROAM_TIME * 1000) {
        // Move creature within roam radius
        const creature = this.creatures.get(instance.creatureId);
        if (creature) {
          const angle = Math.random() * 2 * Math.PI;
          const distance = Math.random() * creature.roamRadius;
          
          instance.currentPosition.x = instance.spawnPosition.x + Math.cos(angle) * distance;
          instance.currentPosition.z = instance.spawnPosition.z + Math.sin(angle) * distance;
          instance.lastMove = now;
        }
      }
    }
  }

  /**
   * Update trap states and check for catches
   */
  private updateTraps(now: number): void {
    for (const trap of this.traps.values()) {
      if (trap.state === 'empty') {
        // Check if trap should collapse
        if (now >= trap.collapseTime) {
          trap.state = 'collapsed';
          logger.info(`[HunterSystem] Trap ${trap.id} collapsed`);
          continue;
        }

        // Check for creature catches
        const creature = this.creatures.get(trap.creatureId);
        if (creature && this.checkTrapCatch(trap, creature)) {
          trap.state = 'caught';
          trap.caughtCreature = trap.creatureId;
          
          logger.info(`[HunterSystem] Trap ${trap.id} caught ${creature.name}`);

          // Emit trap catch event
          this.world.events.emit('rpg:trap_caught', {
            trapId: trap.id,
            playerId: trap.playerId,
            creatureId: creature.id,
          });
        }
      }
    }
  }

  /**
   * Check if a creature is caught in a trap
   */
  private checkTrapCatch(trap: HunterTrap, creature: HunterCreature): boolean {
    // Find nearby creature instances
    const nearbyCreatures = Array.from(this.creatureInstances.values()).filter(instance => {
      if (instance.creatureId !== creature.id) return false;
      
      const distance = Math.sqrt(
        Math.pow(instance.currentPosition.x - trap.position.x, 2) +
        Math.pow(instance.currentPosition.z - trap.position.z, 2)
      );
      
      return distance <= 5; // Within 5 units of trap
    });

    if (nearbyCreatures.length === 0) return false;

    // Check catch rate
    return Math.random() < creature.catchRate;
  }

  /**
   * Process hunter tick
   */
  private processHunterTick(): void {
    // Handle any tick-based hunter mechanics
    // Update trap states, creature behavior, etc.
  }

  /**
   * Spawn creature instances in the world
   */
  private spawnCreatures(): void {
    // Create basic creature instances for testing
    const spawnData = [
      { creatureId: 'rabbit', position: { x: 70, y: 0, z: 0 }, count: 3 },
      { creatureId: 'bird', position: { x: 75, y: 0, z: 5 }, count: 2 },
      { creatureId: 'chinchompa', position: { x: 80, y: 0, z: 10 }, count: 2 },
      { creatureId: 'red_salamander', position: { x: 85, y: 0, z: 15 }, count: 1 },
    ];

    let instanceId = 0;
    spawnData.forEach(spawn => {
      for (let i = 0; i < spawn.count; i++) {
        const instance: CreatureInstance = {
          id: `creature_${instanceId++}`,
          creatureId: spawn.creatureId,
          spawnPosition: { ...spawn.position },
          currentPosition: { ...spawn.position },
          lastMove: Date.now(),
          state: 'roaming',
        };
        
        this.creatureInstances.set(instance.id, instance);
      }
    });

    logger.info(`[HunterSystem] Spawned ${instanceId} creature instances`);
  }

  /**
   * Initialize hunter data
   */
  private initializeHunterData(): void {
    // Initialize huntable creatures
    const creatures: HunterCreature[] = [
      {
        id: 'rabbit',
        name: 'Rabbit',
        level: 1,
        xp: 25,
        method: 'trap',
        requiredItems: [10006], // Rabbit snare
        catchRate: 0.7,
        escapeChance: 0.1,
        primaryLoot: 526, // Bones
        secondaryLoot: [
          {
            itemId: 958, // Raw rabbit
            quantity: { min: 1, max: 1 },
            chance: 0.8,
          }
        ],
        roamRadius: 10,
        spawnLocations: [],
      },
      {
        id: 'bird',
        name: 'Bird',
        level: 1,
        xp: 25,
        method: 'trap',
        requiredItems: [10006], // Bird snare
        catchRate: 0.6,
        escapeChance: 0.15,
        primaryLoot: 526, // Bones
        secondaryLoot: [
          {
            itemId: 313, // Feather
            quantity: { min: 5, max: 15 },
            chance: 0.9,
          },
          {
            itemId: 11237, // Bird nest
            quantity: { min: 1, max: 1 },
            chance: 0.05,
          }
        ],
        roamRadius: 15,
        spawnLocations: [],
      },
      {
        id: 'chinchompa',
        name: 'Chinchompa',
        level: 53,
        xp: 198,
        method: 'trap',
        requiredItems: [10008], // Box trap
        catchRate: 0.4,
        escapeChance: 0.3,
        primaryLoot: 10033, // Chinchompa
        roamRadius: 8,
        spawnLocations: [],
      },
      {
        id: 'red_salamander',
        name: 'Red salamander',
        level: 59,
        xp: 224,
        method: 'net',
        requiredItems: [303, 954], // Small fishing net, rope
        catchRate: 0.35,
        escapeChance: 0.25,
        primaryLoot: 10149, // Red salamander
        roamRadius: 6,
        spawnLocations: [],
      },
      {
        id: 'kebbits',
        name: 'Kebbits',
        level: 23,
        xp: 123,
        method: 'tracking',
        requiredItems: [],
        catchRate: 0.5,
        escapeChance: 0.4,
        primaryLoot: 10117, // Kebbit spike
        secondaryLoot: [
          {
            itemId: 10121, // Kebbit claws
            quantity: { min: 1, max: 3 },
            chance: 0.6,
          }
        ],
        roamRadius: 20,
        spawnLocations: [],
      },
    ];

    creatures.forEach(creature => {
      this.creatures.set(creature.id, creature);
    });

    // Initialize hunter tools
    const tools: Tool[] = [
      {
        itemId: 10006, // Bird snare
        name: 'Bird snare',
        skill: 'hunter',
        level: 1,
        speedMultiplier: 1.0,
        successBonus: 0,
      },
      {
        itemId: 10008, // Box trap
        name: 'Box trap',
        skill: 'hunter',
        level: 27,
        speedMultiplier: 1.0,
        successBonus: 0.1,
      },
      {
        itemId: 10009, // Net trap
        name: 'Net trap',
        skill: 'hunter',
        level: 45,
        speedMultiplier: 1.0,
        successBonus: 0.15,
      },
    ];

    tools.forEach(tool => {
      this.hunterTools.set(tool.itemId, tool);
    });

    logger.info(`[HunterSystem] Loaded ${creatures.length} creatures and ${tools.length} hunter tools`);
  }

  // Helper methods
  private getPlayerStats(playerId: string): StatsComponent | null {
    const player = this.world.entities.players.get(playerId);
    return (player?.data as any)?.stats || null;
  }

  private getPlayerInventory(playerId: string): InventoryComponent | null {
    const player = this.world.entities.players.get(playerId);
    return (player?.data as any)?.inventory || null;
  }

  // Event handlers
  private handleStartHunting(event: any): void {
    const { playerId, creatureId } = event;
    this.startHunting(playerId, creatureId);
  }

  private handleStopHunting(event: any): void {
    const { playerId } = event;
    this.stopHunting(playerId);
  }

  private handleSetTrap(event: any): void {
    const { playerId, creatureId, position } = event;
    this.setTrap(playerId, creatureId, position);
  }

  private handleCheckTrap(event: any): void {
    const { playerId, trapId } = event;
    this.checkTrap(playerId, trapId);
  }

  private handleHuntCreature(event: any): void {
    const { playerId, creatureId } = event;
    this.startHunting(playerId, creatureId);
  }

  // Public API
  getCreatures(): Map<string, HunterCreature> {
    return new Map(this.creatures);
  }

  getCreatureInstances(): Map<string, CreatureInstance> {
    return new Map(this.creatureInstances);
  }

  getTraps(): Map<string, HunterTrap> {
    return new Map(this.traps);
  }

  getActiveActions(): Map<string, GatheringAction> {
    return new Map(this.activeActions);
  }

  isPlayerHunting(playerId: string): boolean {
    return this.activeActions.has(playerId);
  }

  getPlayerTraps(playerId: string): HunterTrap[] {
    return Array.from(this.traps.values()).filter(trap => trap.playerId === playerId);
  }
}

interface CreatureInstance {
  id: string;
  creatureId: string;
  spawnPosition: { x: number; y: number; z: number };
  currentPosition: { x: number; y: number; z: number };
  lastMove: number;
  state: 'roaming' | 'trapped' | 'fleeing';
}

interface HunterTrap {
  id: string;
  playerId: string;
  creatureId: string;
  position: { x: number; y: number; z: number };
  setTime: number;
  lastCheck: number;
  state: 'empty' | 'caught' | 'collapsed';
  caughtCreature: string | null;
  collapseTime: number;
}