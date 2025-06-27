/**
 * RuneScape Fishing System Implementation
 * =====================================
 * Handles fishing mechanics, fish catching, and spot management
 */

import { logger } from '@elizaos/core';
import type { HyperfySystem, HyperfyWorld, HyperfyEntity } from '../../types/hyperfy';
import type { StatsComponent } from '../types/stats';
import type { InventoryComponent } from '../types/inventory';
import type {
  FishingSpot,
  FishType,
  SpotLocation,
  GatheringAction,
  Tool
} from '../types/gathering';
import { GATHERING_CONSTANTS } from '../types/gathering';

export class FishingSystem implements HyperfySystem {
  name = 'FishingSystem';
  world: HyperfyWorld;
  enabled = true;

  // Fishing data
  private fishingSpots: Map<string, FishingSpot> = new Map();
  private spotInstances: Map<string, FishingSpotInstance> = new Map();
  private activeActions: Map<string, GatheringAction> = new Map();
  private fishingTools: Map<number, Tool> = new Map();

  // Tick tracking
  private tickCounter = 0;
  private lastTickTime = 0;

  constructor(world: HyperfyWorld) {
    this.world = world;
    this.initializeFishingData();
    logger.info('[FishingSystem] Initialized RuneScape fishing mechanics');
  }

  async init(): Promise<void> {
    logger.info('[FishingSystem] Starting fishing system...');
    
    // Subscribe to fishing events
    this.world.events.on('rpg:start_fishing', this.handleStartFishing.bind(this));
    this.world.events.on('rpg:stop_fishing', this.handleStopFishing.bind(this));
    this.world.events.on('rpg:fish_spot', this.handleFishSpot.bind(this));
    
    // Create initial fishing spots in the world
    this.spawnFishingSpots();
  }

  tick(delta: number): void {
    const now = Date.now();
    
    // Process fishing ticks (every 600ms like RuneScape)
    if (now - this.lastTickTime >= 600) {
      this.processFishingTick();
      this.lastTickTime = now;
      this.tickCounter++;
    }
    
    // Update fishing actions
    this.updateFishingActions(delta);
    
    // Check for spot movements and respawns
    this.updateFishingSpots(now);
  }

  destroy(): void {
    this.world.events.off('rpg:start_fishing');
    this.world.events.off('rpg:stop_fishing');
    this.world.events.off('rpg:fish_spot');
    logger.info('[FishingSystem] Fishing system destroyed');
  }

  /**
   * Start fishing at a spot
   */
  startFishing(playerId: string, spotInstanceId: string): boolean {
    const player = this.world.entities.players.get(playerId);
    if (!player) {
      logger.warn(`[FishingSystem] Player ${playerId} not found`);
      return false;
    }

    const spotInstance = this.spotInstances.get(spotInstanceId);
    if (!spotInstance) {
      logger.warn(`[FishingSystem] Fishing spot ${spotInstanceId} not found`);
      return false;
    }

    if (spotInstance.depleted) {
      logger.info(`[FishingSystem] Spot ${spotInstanceId} is depleted`);
      return false;
    }

    const spot = this.fishingSpots.get(spotInstance.spotId);
    if (!spot) {
      logger.warn(`[FishingSystem] Spot definition ${spotInstance.spotId} not found`);
      return false;
    }

    // Check fishing level requirement
    const stats = this.getPlayerStats(playerId);
    if (!stats || stats.fishing.level < spot.level) {
      logger.info(`[FishingSystem] Player ${playerId} needs fishing level ${spot.level}`);
      return false;
    }

    // Check if player already fishing
    if (this.activeActions.has(playerId)) {
      this.stopFishing(playerId);
    }

    // Get player's fishing tool
    const tool = this.getPlayerFishingTool(playerId, spot.requiredTool);
    if (!tool) {
      logger.info(`[FishingSystem] Player ${playerId} needs ${spot.requiredTool} to fish here`);
      return false;
    }

    // Check for bait if required
    if (spot.baitRequired && !this.playerHasBait(playerId, spot.baitRequired)) {
      logger.info(`[FishingSystem] Player ${playerId} needs bait for this spot`);
      return false;
    }

    // Calculate fishing duration
    const baseDuration = this.calculateFishingDuration(stats.fishing.level, spot, tool);
    
    // Create fishing action
    const action: GatheringAction = {
      playerId,
      skill: 'fishing',
      nodeId: spotInstanceId,
      tool,
      startTime: Date.now(),
      duration: baseDuration,
      attempts: 0,
      itemsGained: [],
      xpGained: 0,
      successRate: this.calculateCatchRate(stats.fishing.level, spot, tool),
      lastAttempt: 0,
    };

    this.activeActions.set(playerId, action);

    // Add player to spot's active fishers
    if (!spotInstance.activeFishers) {
      (spotInstance as any).activeFishers = [];
    }
    (spotInstance as any).activeFishers.push(playerId);

    logger.info(`[FishingSystem] ${playerId} started fishing at ${spot.name} (${(baseDuration/1000).toFixed(1)}s per attempt)`);

    // Emit fishing started event
    this.world.events.emit('rpg:fishing_started', {
      playerId,
      spotId: spot.id,
      instanceId: spotInstanceId,
      catchRate: action.successRate,
    });

    return true;
  }

  /**
   * Stop fishing
   */
  stopFishing(playerId: string): boolean {
    const action = this.activeActions.get(playerId);
    if (!action) {
      return false;
    }

    // Remove from active actions
    this.activeActions.delete(playerId);

    // Remove from spot's active fishers
    const spotInstance = this.spotInstances.get(action.nodeId);
    if (spotInstance && (spotInstance as any).activeFishers) {
      const fishers = (spotInstance as any).activeFishers as string[];
      const index = fishers.indexOf(playerId);
      if (index > -1) {
        fishers.splice(index, 1);
      }
    }

    logger.info(`[FishingSystem] ${playerId} stopped fishing`);

    // Emit fishing stopped event
    this.world.events.emit('rpg:fishing_stopped', {
      playerId,
      totalXP: action.xpGained,
      totalFish: action.itemsGained.length,
    });

    return true;
  }

  /**
   * Process a fishing attempt
   */
  private processFishingAttempt(action: GatheringAction): void {
    const spotInstance = this.spotInstances.get(action.nodeId);
    const spot = this.fishingSpots.get(spotInstance?.spotId || '');
    
    if (!spotInstance || !spot || spotInstance.depleted) {
      this.stopFishing(action.playerId);
      return;
    }

    action.attempts++;

    // Check for catch
    const success = Math.random() < action.successRate;
    
    if (success) {
      // Determine which fish was caught
      const fishCaught = this.selectFishType(spot, this.getPlayerStats(action.playerId)!.fishing.level);
      
      if (fishCaught) {
        // Grant fish
        this.grantFish(action.playerId, fishCaught);
        
        // Grant XP
        this.grantFishingXP(action.playerId, fishCaught.xp);
        action.xpGained += fishCaught.xp;
        
        // Track items gained
        action.itemsGained.push({ itemId: fishCaught.itemId, quantity: 1 });

        // Use bait if required
        if (spot.baitRequired) {
          this.consumeBait(action.playerId, spot.baitRequired);
        }

        // Check if spot should move or deplete
        if (Math.random() < spot.moveChance) {
          this.moveSpot(spotInstance, spot);
        } else if (Math.random() < spot.depleteChance) {
          this.depleteSpot(spotInstance, spot);
        }

        logger.info(`[FishingSystem] ${action.playerId} caught ${fishCaught.name} (${action.attempts} attempts)`);

        // Emit fishing success event
        this.world.events.emit('rpg:fishing_success', {
          playerId: action.playerId,
          spotId: spot.id,
          fishId: fishCaught.itemId,
          fishName: fishCaught.name,
          xpGained: fishCaught.xp,
        });
      }
    }

    action.lastAttempt = Date.now();
  }

  /**
   * Select which fish type to catch based on spot and level
   */
  private selectFishType(spot: FishingSpot, playerLevel: number): FishType | null {
    // Filter fish that player can catch
    const availableFish = spot.fishTypes.filter(fish => playerLevel >= fish.level);
    
    if (availableFish.length === 0) {
      return null;
    }

    // Calculate total weight
    const totalWeight = availableFish.reduce((sum, fish) => sum + fish.weight, 0);
    
    // Random selection based on weight
    let random = Math.random() * totalWeight;
    
    for (const fish of availableFish) {
      random -= fish.weight;
      if (random <= 0) {
        return fish;
      }
    }

    return availableFish[availableFish.length - 1]; // Fallback
  }

  /**
   * Calculate fishing duration based on level and equipment
   */
  private calculateFishingDuration(level: number, spot: FishingSpot, tool?: Tool): number {
    let baseDuration = GATHERING_CONSTANTS.BASE_FISHING_TIME * 600; // Convert ticks to ms
    
    // Level affects fishing speed
    const levelBonus = Math.max(0, (level - spot.level) * 0.05);
    baseDuration *= (1 - levelBonus);
    
    // Tool affects fishing speed
    if (tool) {
      baseDuration *= (1 / tool.speedMultiplier);
    }
    
    // Add some randomness (±30%)
    const randomFactor = 0.7 + Math.random() * 0.6;
    baseDuration *= randomFactor;
    
    return Math.max(1500, baseDuration); // Minimum 1.5 seconds
  }

  /**
   * Calculate catch rate for fishing
   */
  private calculateCatchRate(level: number, spot: FishingSpot, tool?: Tool): number {
    let catchRate = spot.catchRate;
    
    // Level bonus
    const levelBonus = Math.max(0, (level - spot.level) * GATHERING_CONSTANTS.LEVEL_SUCCESS_BONUS);
    catchRate += levelBonus;
    
    // Tool bonus
    if (tool) {
      catchRate += GATHERING_CONSTANTS.TOOL_SUCCESS_BONUS;
      catchRate += tool.successBonus;
    }
    
    return Math.min(0.95, Math.max(0.05, catchRate)); // Clamp between 5% and 95%
  }

  /**
   * Move a fishing spot to a new location
   */
  private moveSpot(spotInstance: FishingSpotInstance, spot: FishingSpot): void {
    // Stop all fishers at this spot
    const fishers = (spotInstance as any).activeFishers as string[] || [];
    fishers.forEach(playerId => {
      this.stopFishing(playerId);
    });

    // Move to new position (simplified - just shift slightly)
    spotInstance.position.x += (Math.random() - 0.5) * 10;
    spotInstance.position.z += (Math.random() - 0.5) * 10;
    
    logger.info(`[FishingSystem] Fishing spot ${spot.name} moved to new location`);

    // Emit spot moved event
    this.world.events.emit('rpg:fishing_spot_moved', {
      instanceId: spotInstance.id,
      spotId: spot.id,
      newPosition: spotInstance.position,
    });
  }

  /**
   * Deplete a fishing spot temporarily
   */
  private depleteSpot(spotInstance: FishingSpotInstance, spot: FishingSpot): void {
    spotInstance.depleted = true;
    spotInstance.lastFished = Date.now();
    spotInstance.respawnAt = Date.now() + (GATHERING_CONSTANTS.SPOT_DEPLETE_TIME * 1000);
    
    // Stop all fishers at this spot
    const fishers = (spotInstance as any).activeFishers as string[] || [];
    fishers.forEach(playerId => {
      this.stopFishing(playerId);
    });
    
    logger.info(`[FishingSystem] Fishing spot ${spot.name} depleted, respawning in ${GATHERING_CONSTANTS.SPOT_DEPLETE_TIME}s`);

    // Emit spot depleted event
    this.world.events.emit('rpg:fishing_spot_depleted', {
      instanceId: spotInstance.id,
      spotId: spot.id,
      respawnAt: spotInstance.respawnAt,
    });
  }

  /**
   * Grant fish to player
   */
  private grantFish(playerId: string, fish: FishType): void {
    // Emit event to add item to inventory
    this.world.events.emit('rpg:add_item', {
      playerId,
      itemId: fish.itemId,
      quantity: 1,
      noted: false,
    });
  }

  /**
   * Grant fishing XP
   */
  private grantFishingXP(playerId: string, amount: number): void {
    this.world.events.emit('rpg:xp_gain', {
      playerId,
      skill: 'fishing',
      amount,
      source: 'fishing',
    });
  }

  /**
   * Check if player has required bait
   */
  private playerHasBait(playerId: string, baitId: number): boolean {
    const inventory = this.getPlayerInventory(playerId);
    if (!inventory) return false;

    return inventory.items.some(item => item?.itemId === baitId && item.quantity > 0);
  }

  /**
   * Consume bait from player inventory
   */
  private consumeBait(playerId: string, baitId: number): void {
    this.world.events.emit('rpg:remove_item', {
      playerId,
      itemId: baitId,
      quantity: 1,
    });
  }

  /**
   * Get player's fishing tool
   */
  private getPlayerFishingTool(playerId: string, requiredType: string): Tool | undefined {
    const inventory = this.getPlayerInventory(playerId);
    if (!inventory) return undefined;

    // Check equipped weapon first
    if (inventory.equipment.weapon) {
      const weaponId = inventory.equipment.weapon.itemId;
      const weapon = this.fishingTools.get(weaponId);
      if (weapon && this.toolMatchesType(weapon, requiredType)) {
        return weapon;
      }
    }

    // Check inventory for fishing tools
    for (const item of inventory.items) {
      if (item) {
        const tool = this.fishingTools.get(item.itemId);
        if (tool && this.toolMatchesType(tool, requiredType)) {
          return tool;
        }
      }
    }

    return undefined;
  }

  /**
   * Check if tool matches required type
   */
  private toolMatchesType(tool: Tool, requiredType: string): boolean {
    // Map tool names to required types
    const typeMap: Record<string, string[]> = {
      'net': ['small fishing net', 'big fishing net'],
      'rod': ['fly fishing rod', 'fishing rod'],
      'harpoon': ['harpoon'],
      'cage': ['lobster pot', 'crab cage'],
      'bait': ['fishing rod'], // Rod with bait
    };

    const validTypes = typeMap[requiredType] || [];
    return validTypes.some(type => tool.name.toLowerCase().includes(type));
  }

  /**
   * Update active fishing actions
   */
  private updateFishingActions(delta: number): void {
    const now = Date.now();
    
    for (const action of this.activeActions.values()) {
      // Check if it's time for next fishing attempt
      if (now - action.lastAttempt >= action.duration) {
        this.processFishingAttempt(action);
      }
    }
  }

  /**
   * Update fishing spots (movement, respawning)
   */
  private updateFishingSpots(now: number): void {
    for (const spotInstance of this.spotInstances.values()) {
      if (spotInstance.depleted && now >= spotInstance.respawnAt) {
        // Respawn the spot
        spotInstance.depleted = false;
        spotInstance.lastFished = 0;
        spotInstance.respawnAt = 0;
        
        const spot = this.fishingSpots.get(spotInstance.spotId);
        logger.info(`[FishingSystem] Fishing spot ${spot?.name} respawned at instance ${spotInstance.id}`);

        // Emit spot respawned event
        this.world.events.emit('rpg:fishing_spot_respawned', {
          instanceId: spotInstance.id,
          spotId: spotInstance.spotId,
        });
      }
    }
  }

  /**
   * Process fishing tick
   */
  private processFishingTick(): void {
    // Handle any tick-based fishing mechanics
    // Update spot conditions, check for special events, etc.
  }

  /**
   * Create fishing spot instances in the world
   */
  private spawnFishingSpots(): void {
    // Create basic fishing spots for testing
    const basicSpots = [
      { spotId: 'shrimp_spot', position: { x: 20, y: 0, z: 0 } },
      { spotId: 'trout_spot', position: { x: 25, y: 0, z: 5 } },
      { spotId: 'salmon_spot', position: { x: 30, y: 0, z: 10 } },
      { spotId: 'lobster_spot', position: { x: 35, y: 0, z: 15 } },
    ];

    basicSpots.forEach((spotData, index) => {
      const instanceId = `fishing_spot_${index}`;
      const spotInstance: FishingSpotInstance = {
        id: instanceId,
        spotId: spotData.spotId,
        position: spotData.position,
        depleted: false,
        lastFished: 0,
        respawnAt: 0,
        model: `fishing_spot_${spotData.spotId}`,
        waterType: index < 3 ? 'river' : 'sea',
      };
      
      this.spotInstances.set(instanceId, spotInstance);
      
      // TODO: Create actual 3D entity in Hyperfy world
      // This would involve creating a 3D model and placing it in the world
    });

    logger.info(`[FishingSystem] Spawned ${basicSpots.length} fishing spots`);
  }

  /**
   * Initialize fishing data
   */
  private initializeFishingData(): void {
    // Initialize fishing spots
    const spots: FishingSpot[] = [
      {
        id: 'shrimp_spot',
        name: 'Shrimp fishing spot',
        fishTypes: [
          {
            itemId: 317, // Raw shrimps
            name: 'Raw shrimps',
            level: 1,
            xp: 10,
            weight: 1.0,
            cookingLevel: 1,
            healAmount: 3,
          }
        ],
        level: 1,
        requiredTool: 'net',
        locations: [],
        catchRate: 0.8,
        moveChance: 0.05,
        depleteChance: 0.02,
      },
      {
        id: 'trout_spot',
        name: 'Trout fishing spot',
        fishTypes: [
          {
            itemId: 335, // Raw trout
            name: 'Raw trout',
            level: 20,
            xp: 50,
            weight: 1.0,
            cookingLevel: 15,
            healAmount: 7,
          }
        ],
        level: 20,
        requiredTool: 'rod',
        baitRequired: 313, // Fishing bait
        locations: [],
        catchRate: 0.6,
        moveChance: 0.08,
        depleteChance: 0.03,
      },
      {
        id: 'salmon_spot',
        name: 'Salmon fishing spot',
        fishTypes: [
          {
            itemId: 331, // Raw salmon
            name: 'Raw salmon',
            level: 30,
            xp: 70,
            weight: 1.0,
            cookingLevel: 25,
            healAmount: 9,
          }
        ],
        level: 30,
        requiredTool: 'rod',
        baitRequired: 313, // Fishing bait
        locations: [],
        catchRate: 0.5,
        moveChance: 0.1,
        depleteChance: 0.04,
      },
      {
        id: 'lobster_spot',
        name: 'Lobster fishing spot',
        fishTypes: [
          {
            itemId: 377, // Raw lobster
            name: 'Raw lobster',
            level: 40,
            xp: 90,
            weight: 1.0,
            cookingLevel: 40,
            healAmount: 12,
          }
        ],
        level: 40,
        requiredTool: 'cage',
        locations: [],
        catchRate: 0.4,
        moveChance: 0.12,
        depleteChance: 0.06,
      },
    ];

    spots.forEach(spot => {
      this.fishingSpots.set(spot.id, spot);
    });

    // Initialize fishing tools
    const tools: Tool[] = [
      {
        itemId: 303, // Small fishing net
        name: 'Small fishing net',
        skill: 'fishing',
        level: 1,
        speedMultiplier: 1.0,
        successBonus: 0,
      },
      {
        itemId: 305, // Big fishing net
        name: 'Big fishing net',
        skill: 'fishing',
        level: 16,
        speedMultiplier: 1.2,
        successBonus: 0.05,
      },
      {
        itemId: 307, // Fishing rod
        name: 'Fishing rod',
        skill: 'fishing',
        level: 5,
        speedMultiplier: 1.0,
        successBonus: 0,
      },
      {
        itemId: 309, // Fly fishing rod
        name: 'Fly fishing rod',
        skill: 'fishing',
        level: 20,
        speedMultiplier: 1.3,
        successBonus: 0.1,
      },
      {
        itemId: 311, // Harpoon
        name: 'Harpoon',
        skill: 'fishing',
        level: 35,
        speedMultiplier: 1.1,
        successBonus: 0.05,
      },
      {
        itemId: 301, // Lobster pot
        name: 'Lobster pot',
        skill: 'fishing',
        level: 40,
        speedMultiplier: 1.0,
        successBonus: 0,
      },
    ];

    tools.forEach(tool => {
      this.fishingTools.set(tool.itemId, tool);
    });

    logger.info(`[FishingSystem] Loaded ${spots.length} fishing spots and ${tools.length} fishing tools`);
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
  private handleStartFishing(event: any): void {
    const { playerId, spotInstanceId } = event;
    this.startFishing(playerId, spotInstanceId);
  }

  private handleStopFishing(event: any): void {
    const { playerId } = event;
    this.stopFishing(playerId);
  }

  private handleFishSpot(event: any): void {
    const { playerId, spotId } = event;
    // Find nearest spot instance of this type
    for (const [instanceId, spotInstance] of this.spotInstances.entries()) {
      if (spotInstance.spotId === spotId && !spotInstance.depleted) {
        this.startFishing(playerId, instanceId);
        break;
      }
    }
  }

  // Public API
  getFishingSpots(): Map<string, FishingSpot> {
    return new Map(this.fishingSpots);
  }

  getSpotInstances(): Map<string, FishingSpotInstance> {
    return new Map(this.spotInstances);
  }

  getActiveActions(): Map<string, GatheringAction> {
    return new Map(this.activeActions);
  }

  isPlayerFishing(playerId: string): boolean {
    return this.activeActions.has(playerId);
  }
}

interface FishingSpotInstance {
  id: string;
  spotId: string;
  position: { x: number; y: number; z: number };
  
  // State
  depleted: boolean;
  lastFished: number;
  respawnAt: number;
  
  // Visual state
  model: string;
  waterType: 'river' | 'sea' | 'lake' | 'special';
}