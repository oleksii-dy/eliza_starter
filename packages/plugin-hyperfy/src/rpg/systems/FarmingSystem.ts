/**
 * RuneScape Farming System Implementation
 * ======================================
 * Handles crop planting, growth cycles, harvesting, and farm management
 */

import { logger } from '@elizaos/core';
import type { HyperfySystem, HyperfyWorld, HyperfyEntity } from '../../types/hyperfy';
import type { StatsComponent } from '../types/stats';
import type { InventoryComponent } from '../types/inventory';

export class FarmingSystem implements HyperfySystem {
  name = 'FarmingSystem';
  world: HyperfyWorld;
  enabled = true;

  // Farming data
  private farmingPatches: Map<string, FarmPatch> = new Map();
  private farmingSeeds: Map<string, FarmingSeed> = new Map();
  private playerPlots: Map<string, Map<string, PlantedCrop>> = new Map();
  private plantProducts: Map<string, PlantProduct> = new Map();

  // Active farming actions
  private activeFarmingActions: Map<string, FarmingAction> = new Map();

  // Growth cycle tracking
  private lastGrowthTick = 0;
  private growthTickInterval = 60000; // 1 minute in real time = 1 farming tick

  // Tick tracking
  private tickCounter = 0;
  private lastTickTime = 0;

  constructor(world: HyperfyWorld) {
    this.world = world;
    this.initializeFarmingData();
    logger.info('[FarmingSystem] Initialized RuneScape farming mechanics');
  }

  async init(): Promise<void> {
    logger.info('[FarmingSystem] Starting farming system...');
    
    // Subscribe to farming events
    this.world.events.on('rpg:plant_seed', this.handlePlantSeed.bind(this));
    this.world.events.on('rpg:harvest_crop', this.handleHarvestCrop.bind(this));
    this.world.events.on('rpg:clear_patch', this.handleClearPatch.bind(this));
    this.world.events.on('rpg:check_patch', this.handleCheckPatch.bind(this));
    this.world.events.on('rpg:water_crop', this.handleWaterCrop.bind(this));
    this.world.events.on('rpg:compost_patch', this.handleCompostPatch.bind(this));
  }

  tick(delta: number): void {
    const now = Date.now();
    
    // Process farming ticks (every 600ms like RuneScape)
    if (now - this.lastTickTime >= 600) {
      this.processFarmingTick();
      this.lastTickTime = now;
      this.tickCounter++;
    }
    
    // Process growth cycles (every minute)
    if (now - this.lastGrowthTick >= this.growthTickInterval) {
      this.processGrowthCycle();
      this.lastGrowthTick = now;
    }
    
    // Update farming actions
    this.updateFarmingActions(delta);
  }

  destroy(): void {
    this.world.events.off('rpg:plant_seed');
    this.world.events.off('rpg:harvest_crop');
    this.world.events.off('rpg:clear_patch');
    this.world.events.off('rpg:check_patch');
    this.world.events.off('rpg:water_crop');
    this.world.events.off('rpg:compost_patch');
    logger.info('[FarmingSystem] Farming system destroyed');
  }

  /**
   * Plant a seed in a farming patch
   */
  plantSeed(playerId: string, patchId: string, seedId: string): boolean {
    const player = this.world.entities.players.get(playerId);
    if (!player) {
      logger.warn(`[FarmingSystem] Player ${playerId} not found`);
      return false;
    }

    const patch = this.farmingPatches.get(patchId);
    if (!patch) {
      logger.warn(`[FarmingSystem] Farming patch ${patchId} not found`);
      return false;
    }

    const seed = this.farmingSeeds.get(seedId);
    if (!seed) {
      logger.warn(`[FarmingSystem] Farming seed ${seedId} not found`);
      return false;
    }

    // Check farming level requirement
    const stats = this.getPlayerStats(playerId);
    if (!stats || stats.farming.level < seed.levelRequired) {
      logger.info(`[FarmingSystem] Player ${playerId} needs farming level ${seed.levelRequired}`);
      return false;
    }

    // Check patch type compatibility
    if (patch.type !== seed.patchType) {
      logger.info(`[FarmingSystem] Seed ${seedId} cannot be planted in ${patch.type} patch`);
      return false;
    }

    // Check if patch is already occupied
    const playerPlots = this.getPlayerPlots(playerId);
    if (playerPlots.has(patchId)) {
      logger.info(`[FarmingSystem] Patch ${patchId} already has a crop planted`);
      return false;
    }

    // Check if player has the seed
    if (!this.playerHasItem(playerId, seed.itemId, 1)) {
      logger.info(`[FarmingSystem] Player ${playerId} doesn't have ${seed.name}`);
      return false;
    }

    // Check for required tools
    if (!this.playerHasFarmingTool(playerId, 'seed_dibber')) {
      logger.info(`[FarmingSystem] Player ${playerId} needs a seed dibber`);
      return false;
    }

    // Consume seed
    this.world.events.emit('rpg:remove_item', {
      playerId,
      itemId: seed.itemId,
      quantity: 1,
    });

    // Create planted crop
    const plantedCrop: PlantedCrop = {
      playerId,
      patchId,
      seedId,
      plantedTime: Date.now(),
      currentStage: 0,
      maxStage: seed.growthStages,
      waterLevel: 0,
      compostLevel: 0,
      diseased: false,
      dead: false,
      protected: patch.protectedByNPC || false,
      lastWatered: 0,
      lastComposted: 0,
    };

    playerPlots.set(patchId, plantedCrop);

    logger.info(`[FarmingSystem] ${playerId} planted ${seed.name} in ${patch.name}`);

    // Grant planting XP
    this.grantFarmingXP(playerId, seed.plantingXP);

    // Emit planting event
    this.world.events.emit('rpg:seed_planted', {
      playerId,
      patchId,
      patchName: patch.name,
      seedId,
      seedName: seed.name,
      xpGained: seed.plantingXP,
      growthTime: seed.growthTime,
    });

    return true;
  }

  /**
   * Harvest a mature crop
   */
  harvestCrop(playerId: string, patchId: string): boolean {
    const player = this.world.entities.players.get(playerId);
    if (!player) {
      logger.warn(`[FarmingSystem] Player ${playerId} not found`);
      return false;
    }

    const patch = this.farmingPatches.get(patchId);
    if (!patch) {
      logger.warn(`[FarmingSystem] Farming patch ${patchId} not found`);
      return false;
    }

    const playerPlots = this.getPlayerPlots(playerId);
    const crop = playerPlots.get(patchId);
    if (!crop) {
      logger.info(`[FarmingSystem] No crop planted in patch ${patchId}`);
      return false;
    }

    const seed = this.farmingSeeds.get(crop.seedId);
    if (!seed) {
      logger.warn(`[FarmingSystem] Seed ${crop.seedId} not found`);
      return false;
    }

    // Check if crop is mature
    if (crop.currentStage < crop.maxStage) {
      logger.info(`[FarmingSystem] Crop is not ready for harvest (stage ${crop.currentStage}/${crop.maxStage})`);
      return false;
    }

    // Check if crop is dead
    if (crop.dead) {
      logger.info(`[FarmingSystem] Crop is dead and cannot be harvested`);
      return false;
    }

    // Calculate harvest yield
    const baseYield = seed.harvestYield;
    const bonusYield = this.calculateBonusYield(crop, seed);
    const totalYield = baseYield + bonusYield;

    // Give harvested products
    for (let i = 0; i < totalYield; i++) {
      this.world.events.emit('rpg:add_item', {
        playerId,
        itemId: seed.productId,
        quantity: 1,
        noted: false,
      });
    }

    // Grant harvesting XP
    const harvestXP = seed.harvestXP * totalYield;
    this.grantFarmingXP(playerId, harvestXP);

    logger.info(`[FarmingSystem] ${playerId} harvested ${totalYield} ${seed.name} from ${patch.name} (${harvestXP} XP)`);

    // Remove crop from patch
    playerPlots.delete(patchId);

    // Emit harvest event
    this.world.events.emit('rpg:crop_harvested', {
      playerId,
      patchId,
      patchName: patch.name,
      seedId: crop.seedId,
      seedName: seed.name,
      productId: seed.productId,
      yield: totalYield,
      xpGained: harvestXP,
    });

    return true;
  }

  /**
   * Clear a patch (remove dead crops, weeds, etc.)
   */
  clearPatch(playerId: string, patchId: string): boolean {
    const player = this.world.entities.players.get(playerId);
    if (!player) {
      logger.warn(`[FarmingSystem] Player ${playerId} not found`);
      return false;
    }

    const patch = this.farmingPatches.get(patchId);
    if (!patch) {
      logger.warn(`[FarmingSystem] Farming patch ${patchId} not found`);
      return false;
    }

    // Check for required tools
    if (!this.playerHasFarmingTool(playerId, 'spade')) {
      logger.info(`[FarmingSystem] Player ${playerId} needs a spade`);
      return false;
    }

    const playerPlots = this.getPlayerPlots(playerId);
    const crop = playerPlots.get(patchId);

    if (crop) {
      // Remove crop
      playerPlots.delete(patchId);
      
      logger.info(`[FarmingSystem] ${playerId} cleared patch ${patch.name}`);

      // Emit clear event
      this.world.events.emit('rpg:patch_cleared', {
        playerId,
        patchId,
        patchName: patch.name,
      });
    } else {
      logger.info(`[FarmingSystem] Patch ${patchId} is already clear`);
    }

    return true;
  }

  /**
   * Water a crop to improve growth
   */
  waterCrop(playerId: string, patchId: string): boolean {
    const player = this.world.entities.players.get(playerId);
    if (!player) {
      logger.warn(`[FarmingSystem] Player ${playerId} not found`);
      return false;
    }

    const patch = this.farmingPatches.get(patchId);
    if (!patch) {
      logger.warn(`[FarmingSystem] Farming patch ${patchId} not found`);
      return false;
    }

    const playerPlots = this.getPlayerPlots(playerId);
    const crop = playerPlots.get(patchId);
    if (!crop) {
      logger.info(`[FarmingSystem] No crop planted in patch ${patchId}`);
      return false;
    }

    // Check for watering can
    if (!this.playerHasFarmingTool(playerId, 'watering_can')) {
      logger.info(`[FarmingSystem] Player ${playerId} needs a watering can`);
      return false;
    }

    // Check if crop is already well watered
    if (crop.waterLevel >= 3) {
      logger.info(`[FarmingSystem] Crop is already well watered`);
      return false;
    }

    // Water the crop
    crop.waterLevel = Math.min(3, crop.waterLevel + 1);
    crop.lastWatered = Date.now();

    logger.info(`[FarmingSystem] ${playerId} watered crop in ${patch.name} (water level: ${crop.waterLevel})`);

    // Emit watering event
    this.world.events.emit('rpg:crop_watered', {
      playerId,
      patchId,
      patchName: patch.name,
      waterLevel: crop.waterLevel,
    });

    return true;
  }

  /**
   * Apply compost to improve crop yield
   */
  compostPatch(playerId: string, patchId: string, compostType: string): boolean {
    const player = this.world.entities.players.get(playerId);
    if (!player) {
      logger.warn(`[FarmingSystem] Player ${playerId} not found`);
      return false;
    }

    const patch = this.farmingPatches.get(patchId);
    if (!patch) {
      logger.warn(`[FarmingSystem] Farming patch ${patchId} not found`);
      return false;
    }

    const playerPlots = this.getPlayerPlots(playerId);
    const crop = playerPlots.get(patchId);

    // Check compost type and item
    let compostItemId: number;
    let compostLevel: number;
    
    switch (compostType) {
      case 'compost':
        compostItemId = 6032;
        compostLevel = 1;
        break;
      case 'supercompost':
        compostItemId = 6034;
        compostLevel = 2;
        break;
      case 'ultracompost':
        compostItemId = 21483;
        compostLevel = 3;
        break;
      default:
        logger.warn(`[FarmingSystem] Unknown compost type: ${compostType}`);
        return false;
    }

    // Check if player has compost
    if (!this.playerHasItem(playerId, compostItemId, 1)) {
      logger.info(`[FarmingSystem] Player ${playerId} doesn't have ${compostType}`);
      return false;
    }

    // Consume compost
    this.world.events.emit('rpg:remove_item', {
      playerId,
      itemId: compostItemId,
      quantity: 1,
    });

    if (crop) {
      // Apply to existing crop
      crop.compostLevel = Math.max(crop.compostLevel, compostLevel);
      crop.lastComposted = Date.now();
    } else {
      // Apply to empty patch (will benefit next crop)
      // Store patch compost state
    }

    logger.info(`[FarmingSystem] ${playerId} applied ${compostType} to ${patch.name}`);

    // Emit composting event
    this.world.events.emit('rpg:patch_composted', {
      playerId,
      patchId,
      patchName: patch.name,
      compostType,
      compostLevel,
    });

    return true;
  }

  /**
   * Process growth cycles for all planted crops
   */
  private processGrowthCycle(): void {
    for (const [playerId, plots] of this.playerPlots.entries()) {
      for (const [patchId, crop] of plots.entries()) {
        if (crop.dead) continue;

        const seed = this.farmingSeeds.get(crop.seedId);
        if (!seed) continue;

        // Check if diseased crop dies (every cycle)
        if (crop.diseased && Math.random() < 0.1) {
          crop.dead = true;
          
          this.world.events.emit('rpg:crop_died', {
            playerId,
            patchId,
            stage: crop.currentStage,
          });
          continue;
        }

        // Check if crop should grow
        const timeSincePlanted = Date.now() - crop.plantedTime;
        const stageTime = seed.growthTime / seed.growthStages;
        const expectedStage = Math.floor(timeSincePlanted / stageTime);

        if (expectedStage > crop.currentStage && crop.currentStage < crop.maxStage) {
          // Grow to next stage
          crop.currentStage = Math.min(crop.maxStage, expectedStage);

          // Check for disease
          if (!crop.protected && Math.random() < this.calculateDiseaseChance(crop)) {
            crop.diseased = true;
            
            this.world.events.emit('rpg:crop_diseased', {
              playerId,
              patchId,
              stage: crop.currentStage,
            });
          }

          // Emit growth event
          this.world.events.emit('rpg:crop_grew', {
            playerId,
            patchId,
            stage: crop.currentStage,
            maxStage: crop.maxStage,
            isReady: crop.currentStage >= crop.maxStage,
          });
        }

        // Reduce water level over time
        if (crop.waterLevel > 0 && Date.now() - crop.lastWatered > 1800000) { // 30 minutes
          crop.waterLevel = Math.max(0, crop.waterLevel - 1);
        }
      }
    }
  }

  /**
   * Calculate disease chance for a crop
   */
  private calculateDiseaseChance(crop: PlantedCrop): number {
    let baseChance = 0.1; // 10% base chance

    // Compost reduces disease chance
    if (crop.compostLevel > 0) {
      baseChance *= (1 - crop.compostLevel * 0.2); // 20% reduction per compost level
    }

    // Watering reduces disease chance
    if (crop.waterLevel > 0) {
      baseChance *= (1 - crop.waterLevel * 0.1); // 10% reduction per water level
    }

    return Math.max(0.01, baseChance); // Minimum 1% chance
  }

  /**
   * Calculate bonus yield from crop conditions
   */
  private calculateBonusYield(crop: PlantedCrop, seed: FarmingSeed): number {
    let bonusYield = 0;

    // Compost increases yield
    bonusYield += crop.compostLevel * 0.5;

    // Good watering increases yield
    if (crop.waterLevel >= 2) {
      bonusYield += 0.5;
    }

    // Random variation
    bonusYield += Math.random() * 2;

    return Math.floor(bonusYield);
  }

  /**
   * Check if player has required farming tool
   */
  private playerHasFarmingTool(playerId: string, toolType: string): boolean {
    const inventory = this.getPlayerInventory(playerId);
    if (!inventory) return false;

    let requiredItemIds: number[] = [];

    switch (toolType) {
      case 'spade':
        requiredItemIds = [952]; // Spade
        break;
      case 'seed_dibber':
        requiredItemIds = [5343]; // Seed dibber
        break;
      case 'watering_can':
        requiredItemIds = [5331, 5333, 5334, 5335, 5336, 5337, 5338, 5339]; // Watering cans
        break;
      case 'rake':
        requiredItemIds = [5341]; // Rake
        break;
      default:
        return false;
    }

    // Check inventory and equipment
    for (const itemId of requiredItemIds) {
      // Check inventory
      for (const item of inventory.items) {
        if (item && item.itemId === itemId) {
          return true;
        }
      }
      
      // Check equipment
      for (const slot of Object.values(inventory.equipment)) {
        if (slot && slot.itemId === itemId) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Check if player has specific item
   */
  private playerHasItem(playerId: string, itemId: number, quantity: number): boolean {
    const inventory = this.getPlayerInventory(playerId);
    if (!inventory) return false;

    let totalQuantity = 0;
    for (const item of inventory.items) {
      if (item && item.itemId === itemId) {
        totalQuantity += item.quantity;
      }
    }

    return totalQuantity >= quantity;
  }

  /**
   * Get or initialize player plots
   */
  private getPlayerPlots(playerId: string): Map<string, PlantedCrop> {
    if (!this.playerPlots.has(playerId)) {
      this.playerPlots.set(playerId, new Map());
    }
    return this.playerPlots.get(playerId)!;
  }

  /**
   * Update active farming actions
   */
  private updateFarmingActions(delta: number): void {
    const now = Date.now();
    
    for (const [playerId, action] of this.activeFarmingActions.entries()) {
      if (now - action.startTime >= action.duration) {
        // Complete farming action
        this.completeFarmingAction(playerId);
      }
    }
  }

  /**
   * Complete farming action
   */
  private completeFarmingAction(playerId: string): void {
    const action = this.activeFarmingActions.get(playerId);
    if (!action) return;

    // Handle action completion based on type
    switch (action.type) {
      case 'plant':
        // Planting is instantaneous, no completion needed
        break;
      case 'harvest':
        // Harvesting is instantaneous, no completion needed
        break;
      case 'clear':
        // Clearing is instantaneous, no completion needed
        break;
    }

    this.activeFarmingActions.delete(playerId);
  }

  /**
   * Process farming tick
   */
  private processFarmingTick(): void {
    // Handle any tick-based farming mechanics
  }

  /**
   * Grant farming XP
   */
  private grantFarmingXP(playerId: string, amount: number): void {
    this.world.events.emit('rpg:xp_gain', {
      playerId,
      skill: 'farming',
      amount,
      source: 'farming',
    });
  }

  /**
   * Initialize farming data
   */
  private initializeFarmingData(): void {
    // Initialize farming patches
    this.initializeFarmingPatches();
    
    // Initialize farming seeds
    this.initializeFarmingSeeds();
    
    // Initialize plant products
    this.initializePlantProducts();

    logger.info(`[FarmingSystem] Loaded ${this.farmingPatches.size} farming patches, ${this.farmingSeeds.size} seeds, ${this.plantProducts.size} products`);
  }

  /**
   * Initialize farming patches
   */
  private initializeFarmingPatches(): void {
    const patches: FarmPatch[] = [
      // Allotment patches
      {
        id: 'falador_allotment_north',
        name: 'Falador Allotment (North)',
        type: 'allotment',
        location: 'Falador',
        position: { x: 3054, y: 3311, z: 0 },
        protectedByNPC: false,
      },
      {
        id: 'falador_allotment_south',
        name: 'Falador Allotment (South)',
        type: 'allotment',
        location: 'Falador',
        position: { x: 3054, y: 3308, z: 0 },
        protectedByNPC: false,
      },
      {
        id: 'catherby_allotment_north',
        name: 'Catherby Allotment (North)',
        type: 'allotment',
        location: 'Catherby',
        position: { x: 2813, y: 3465, z: 0 },
        protectedByNPC: false,
      },
      {
        id: 'catherby_allotment_south',
        name: 'Catherby Allotment (South)',
        type: 'allotment',
        location: 'Catherby',
        position: { x: 2813, y: 3462, z: 0 },
        protectedByNPC: false,
      },

      // Flower patches
      {
        id: 'falador_flower',
        name: 'Falador Flower Patch',
        type: 'flower',
        location: 'Falador',
        position: { x: 3054, y: 3307, z: 0 },
        protectedByNPC: false,
      },
      {
        id: 'catherby_flower',
        name: 'Catherby Flower Patch',
        type: 'flower',
        location: 'Catherby',
        position: { x: 2813, y: 3460, z: 0 },
        protectedByNPC: false,
      },

      // Herb patches
      {
        id: 'falador_herb',
        name: 'Falador Herb Patch',
        type: 'herb',
        location: 'Falador',
        position: { x: 3058, y: 3311, z: 0 },
        protectedByNPC: false,
      },
      {
        id: 'catherby_herb',
        name: 'Catherby Herb Patch',
        type: 'herb',
        location: 'Catherby',
        position: { x: 2815, y: 3462, z: 0 },
        protectedByNPC: false,
      },
      {
        id: 'ardougne_herb',
        name: 'Ardougne Herb Patch',
        type: 'herb',
        location: 'Ardougne',
        position: { x: 2670, y: 3374, z: 0 },
        protectedByNPC: false,
      },
      {
        id: 'canifis_herb',
        name: 'Canifis Herb Patch',
        type: 'herb',
        location: 'Canifis',
        position: { x: 3605, y: 3529, z: 0 },
        protectedByNPC: false,
      },

      // Tree patches
      {
        id: 'lumbridge_tree',
        name: 'Lumbridge Tree Patch',
        type: 'tree',
        location: 'Lumbridge',
        position: { x: 3192, y: 3230, z: 0 },
        protectedByNPC: false,
      },
      {
        id: 'falador_tree',
        name: 'Falador Tree Patch',
        type: 'tree',
        location: 'Falador',
        position: { x: 3003, y: 3372, z: 0 },
        protectedByNPC: false,
      },
      {
        id: 'taverley_tree',
        name: 'Taverley Tree Patch',
        type: 'tree',
        location: 'Taverley',
        position: { x: 2934, y: 3435, z: 0 },
        protectedByNPC: false,
      },
      {
        id: 'varrock_tree',
        name: 'Varrock Tree Patch',
        type: 'tree',
        location: 'Varrock',
        position: { x: 3228, y: 3458, z: 0 },
        protectedByNPC: false,
      },

      // Fruit tree patches
      {
        id: 'gnome_stronghold_fruit',
        name: 'Tree Gnome Stronghold Fruit Tree',
        type: 'fruit_tree',
        location: 'Tree Gnome Stronghold',
        position: { x: 2489, y: 3178, z: 0 },
        protectedByNPC: true,
      },
      {
        id: 'catherby_fruit',
        name: 'Catherby Fruit Tree',
        type: 'fruit_tree',
        location: 'Catherby',
        position: { x: 2859, y: 3433, z: 0 },
        protectedByNPC: true,
      },
      {
        id: 'brimhaven_fruit',
        name: 'Brimhaven Fruit Tree',
        type: 'fruit_tree',
        location: 'Brimhaven',
        position: { x: 2765, y: 3212, z: 0 },
        protectedByNPC: true,
      },

      // Special patches
      {
        id: 'trollheim_herb',
        name: 'Trollheim Herb Patch',
        type: 'herb',
        location: 'Trollheim',
        position: { x: 2826, y: 3694, z: 0 },
        protectedByNPC: true,
      },
    ];

    patches.forEach(patch => {
      this.farmingPatches.set(patch.id, patch);
    });
  }

  /**
   * Initialize farming seeds
   */
  private initializeFarmingSeeds(): void {
    const seeds: FarmingSeed[] = [
      // Allotment seeds
      {
        id: 'potato_seed',
        name: 'Potato seed',
        itemId: 5318,
        productId: 1942, // Potato
        patchType: 'allotment',
        levelRequired: 1,
        plantingXP: 8,
        harvestXP: 9,
        growthTime: 2400000, // 40 minutes
        growthStages: 4,
        harvestYield: 3,
      },
      {
        id: 'onion_seed',
        name: 'Onion seed',
        itemId: 5319,
        productId: 1957, // Onion
        patchType: 'allotment',
        levelRequired: 5,
        plantingXP: 9.5,
        harvestXP: 10.5,
        growthTime: 2400000, // 40 minutes
        growthStages: 4,
        harvestYield: 3,
      },
      {
        id: 'cabbage_seed',
        name: 'Cabbage seed',
        itemId: 5324,
        productId: 1965, // Cabbage
        patchType: 'allotment',
        levelRequired: 7,
        plantingXP: 10,
        harvestXP: 11.5,
        growthTime: 2400000, // 40 minutes
        growthStages: 4,
        harvestYield: 3,
      },
      {
        id: 'tomato_seed',
        name: 'Tomato seed',
        itemId: 5322,
        productId: 1982, // Tomato
        patchType: 'allotment',
        levelRequired: 12,
        plantingXP: 12.5,
        harvestXP: 14,
        growthTime: 2400000, // 40 minutes
        growthStages: 4,
        harvestYield: 3,
      },
      {
        id: 'sweetcorn_seed',
        name: 'Sweetcorn seed',
        itemId: 5320,
        productId: 5986, // Sweetcorn
        patchType: 'allotment',
        levelRequired: 20,
        plantingXP: 17,
        harvestXP: 19,
        growthTime: 3600000, // 60 minutes
        growthStages: 5,
        harvestYield: 3,
      },
      {
        id: 'strawberry_seed',
        name: 'Strawberry seed',
        itemId: 5323,
        productId: 5504, // Strawberry
        patchType: 'allotment',
        levelRequired: 31,
        plantingXP: 26,
        harvestXP: 29,
        growthTime: 3600000, // 60 minutes
        growthStages: 5,
        harvestYield: 4,
      },
      {
        id: 'watermelon_seed',
        name: 'Watermelon seed',
        itemId: 5321,
        productId: 5982, // Watermelon
        patchType: 'allotment',
        levelRequired: 47,
        plantingXP: 48.5,
        harvestXP: 54.5,
        growthTime: 4800000, // 80 minutes
        growthStages: 6,
        harvestYield: 4,
      },

      // Flower seeds
      {
        id: 'marigold_seed',
        name: 'Marigold seed',
        itemId: 5096,
        productId: 6010, // Marigold
        patchType: 'flower',
        levelRequired: 2,
        plantingXP: 8.5,
        harvestXP: 47,
        growthTime: 1200000, // 20 minutes
        growthStages: 4,
        harvestYield: 1,
      },
      {
        id: 'rosemary_seed',
        name: 'Rosemary seed',
        itemId: 5097,
        productId: 6014, // Rosemary
        patchType: 'flower',
        levelRequired: 11,
        plantingXP: 12,
        harvestXP: 66.5,
        growthTime: 1200000, // 20 minutes
        growthStages: 4,
        harvestYield: 1,
      },

      // Herb seeds
      {
        id: 'guam_seed',
        name: 'Guam seed',
        itemId: 5291,
        productId: 199, // Grimy guam
        patchType: 'herb',
        levelRequired: 9,
        plantingXP: 11,
        harvestXP: 12.5,
        growthTime: 4800000, // 80 minutes
        growthStages: 4,
        harvestYield: 3,
      },
      {
        id: 'marrentill_seed',
        name: 'Marrentill seed',
        itemId: 5292,
        productId: 201, // Grimy marrentill
        patchType: 'herb',
        levelRequired: 14,
        plantingXP: 13.5,
        harvestXP: 15,
        growthTime: 4800000, // 80 minutes
        growthStages: 4,
        harvestYield: 3,
      },
      {
        id: 'tarromin_seed',
        name: 'Tarromin seed',
        itemId: 5293,
        productId: 203, // Grimy tarromin
        patchType: 'herb',
        levelRequired: 19,
        plantingXP: 16,
        harvestXP: 18,
        growthTime: 4800000, // 80 minutes
        growthStages: 4,
        harvestYield: 3,
      },
      {
        id: 'harralander_seed',
        name: 'Harralander seed',
        itemId: 5294,
        productId: 205, // Grimy harralander
        patchType: 'herb',
        levelRequired: 26,
        plantingXP: 21.5,
        harvestXP: 24,
        growthTime: 4800000, // 80 minutes
        growthStages: 4,
        harvestYield: 3,
      },
      {
        id: 'ranarr_seed',
        name: 'Ranarr seed',
        itemId: 5295,
        productId: 207, // Grimy ranarr
        patchType: 'herb',
        levelRequired: 32,
        plantingXP: 27,
        harvestXP: 30.5,
        growthTime: 4800000, // 80 minutes
        growthStages: 4,
        harvestYield: 3,
      },
      {
        id: 'snapdragon_seed',
        name: 'Snapdragon seed',
        itemId: 5300,
        productId: 3051, // Grimy snapdragon
        patchType: 'herb',
        levelRequired: 62,
        plantingXP: 61.5,
        harvestXP: 87.5,
        growthTime: 4800000, // 80 minutes
        growthStages: 4,
        harvestYield: 3,
      },
      {
        id: 'torstol_seed',
        name: 'Torstol seed',
        itemId: 5304,
        productId: 219, // Grimy torstol
        patchType: 'herb',
        levelRequired: 85,
        plantingXP: 79,
        harvestXP: 199.5,
        growthTime: 4800000, // 80 minutes
        growthStages: 4,
        harvestYield: 3,
      },

      // Tree seeds
      {
        id: 'oak_sapling',
        name: 'Oak sapling',
        itemId: 5370,
        productId: 1521, // Oak logs
        patchType: 'tree',
        levelRequired: 15,
        plantingXP: 14,
        harvestXP: 467.3,
        growthTime: 9600000, // 160 minutes
        growthStages: 4,
        harvestYield: 15,
      },
      {
        id: 'willow_sapling',
        name: 'Willow sapling',
        itemId: 5371,
        productId: 1519, // Willow logs
        patchType: 'tree',
        levelRequired: 30,
        plantingXP: 25,
        harvestXP: 1456.5,
        growthTime: 19200000, // 320 minutes
        growthStages: 6,
        harvestYield: 25,
      },
      {
        id: 'maple_sapling',
        name: 'Maple sapling',
        itemId: 5372,
        productId: 1517, // Maple logs
        patchType: 'tree',
        levelRequired: 45,
        plantingXP: 45,
        harvestXP: 3403.4,
        growthTime: 33600000, // 560 minutes
        growthStages: 7,
        harvestYield: 35,
      },
      {
        id: 'yew_sapling',
        name: 'Yew sapling',
        itemId: 5373,
        productId: 1515, // Yew logs
        patchType: 'tree',
        levelRequired: 60,
        plantingXP: 81,
        harvestXP: 7069.9,
        growthTime: 48000000, // 800 minutes
        growthStages: 8,
        harvestYield: 45,
      },

      // Fruit tree seeds
      {
        id: 'apple_sapling',
        name: 'Apple sapling',
        itemId: 5496,
        productId: 1955, // Cooking apple
        patchType: 'fruit_tree',
        levelRequired: 27,
        plantingXP: 22,
        harvestXP: 1199.5,
        growthTime: 48000000, // 800 minutes
        growthStages: 6,
        harvestYield: 6,
      },
      {
        id: 'banana_sapling',
        name: 'Banana sapling',
        itemId: 5497,
        productId: 1963, // Banana
        patchType: 'fruit_tree',
        levelRequired: 33,
        plantingXP: 28,
        harvestXP: 1750.5,
        growthTime: 48000000, // 800 minutes
        growthStages: 6,
        harvestYield: 6,
      },
      {
        id: 'orange_sapling',
        name: 'Orange sapling',
        itemId: 5498,
        productId: 2108, // Orange
        patchType: 'fruit_tree',
        levelRequired: 39,
        plantingXP: 35.5,
        harvestXP: 2470.2,
        growthTime: 48000000, // 800 minutes
        growthStages: 6,
        harvestYield: 6,
      },
      {
        id: 'palm_sapling',
        name: 'Palm sapling',
        itemId: 5501,
        productId: 5972, // Coconut
        patchType: 'fruit_tree',
        levelRequired: 68,
        plantingXP: 110.5,
        harvestXP: 10150,
        growthTime: 48000000, // 800 minutes
        growthStages: 6,
        harvestYield: 6,
      },
    ];

    seeds.forEach(seed => {
      this.farmingSeeds.set(seed.id, seed);
    });
  }

  /**
   * Initialize plant products
   */
  private initializePlantProducts(): void {
    const products: PlantProduct[] = [
      // Allotment products
      { id: 'potato', name: 'Potato', itemId: 1942, category: 'vegetable' },
      { id: 'onion', name: 'Onion', itemId: 1957, category: 'vegetable' },
      { id: 'cabbage', name: 'Cabbage', itemId: 1965, category: 'vegetable' },
      { id: 'tomato', name: 'Tomato', itemId: 1982, category: 'vegetable' },
      { id: 'sweetcorn', name: 'Sweetcorn', itemId: 5986, category: 'vegetable' },
      { id: 'strawberry', name: 'Strawberry', itemId: 5504, category: 'fruit' },
      { id: 'watermelon', name: 'Watermelon', itemId: 5982, category: 'fruit' },

      // Flower products
      { id: 'marigold', name: 'Marigold', itemId: 6010, category: 'flower' },
      { id: 'rosemary', name: 'Rosemary', itemId: 6014, category: 'flower' },

      // Herb products
      { id: 'grimy_guam', name: 'Grimy guam', itemId: 199, category: 'herb' },
      { id: 'grimy_marrentill', name: 'Grimy marrentill', itemId: 201, category: 'herb' },
      { id: 'grimy_tarromin', name: 'Grimy tarromin', itemId: 203, category: 'herb' },
      { id: 'grimy_harralander', name: 'Grimy harralander', itemId: 205, category: 'herb' },
      { id: 'grimy_ranarr', name: 'Grimy ranarr', itemId: 207, category: 'herb' },
      { id: 'grimy_snapdragon', name: 'Grimy snapdragon', itemId: 3051, category: 'herb' },
      { id: 'grimy_torstol', name: 'Grimy torstol', itemId: 219, category: 'herb' },

      // Tree products
      { id: 'oak_logs', name: 'Oak logs', itemId: 1521, category: 'logs' },
      { id: 'willow_logs', name: 'Willow logs', itemId: 1519, category: 'logs' },
      { id: 'maple_logs', name: 'Maple logs', itemId: 1517, category: 'logs' },
      { id: 'yew_logs', name: 'Yew logs', itemId: 1515, category: 'logs' },

      // Fruit tree products
      { id: 'cooking_apple', name: 'Cooking apple', itemId: 1955, category: 'fruit' },
      { id: 'banana', name: 'Banana', itemId: 1963, category: 'fruit' },
      { id: 'orange', name: 'Orange', itemId: 2108, category: 'fruit' },
      { id: 'coconut', name: 'Coconut', itemId: 5972, category: 'fruit' },
    ];

    products.forEach(product => {
      this.plantProducts.set(product.id, product);
    });
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
  private handlePlantSeed(event: any): void {
    const { playerId, patchId, seedId } = event;
    this.plantSeed(playerId, patchId, seedId);
  }

  private handleHarvestCrop(event: any): void {
    const { playerId, patchId } = event;
    this.harvestCrop(playerId, patchId);
  }

  private handleClearPatch(event: any): void {
    const { playerId, patchId } = event;
    this.clearPatch(playerId, patchId);
  }

  private handleCheckPatch(event: any): void {
    const { playerId, patchId } = event;
    // Implementation for checking patch status
  }

  private handleWaterCrop(event: any): void {
    const { playerId, patchId } = event;
    this.waterCrop(playerId, patchId);
  }

  private handleCompostPatch(event: any): void {
    const { playerId, patchId, compostType } = event;
    this.compostPatch(playerId, patchId, compostType);
  }

  // Public API
  getFarmingPatches(): Map<string, FarmPatch> {
    return new Map(this.farmingPatches);
  }

  getFarmingSeeds(): Map<string, FarmingSeed> {
    return new Map(this.farmingSeeds);
  }

  getPlantProducts(): Map<string, PlantProduct> {
    return new Map(this.plantProducts);
  }

  getPlayerCrops(playerId: string): Map<string, PlantedCrop> {
    return this.getPlayerPlots(playerId);
  }

  // Validation methods for actions
  canPlantSeed(playerId: string, patchId: string, seedId: string): { canPlant: boolean, reason?: string } {
    const patch = this.farmingPatches.get(patchId);
    if (!patch) {
      return { canPlant: false, reason: `Unknown patch: ${patchId}` };
    }

    const seed = this.farmingSeeds.get(seedId);
    if (!seed) {
      return { canPlant: false, reason: `Unknown seed: ${seedId}` };
    }

    const stats = this.getPlayerStats(playerId);
    if (!stats || stats.farming.level < seed.levelRequired) {
      return { canPlant: false, reason: `Need farming level ${seed.levelRequired}` };
    }

    if (patch.type !== seed.patchType) {
      return { canPlant: false, reason: `Cannot plant ${seed.name} in ${patch.type} patch` };
    }

    const playerPlots = this.getPlayerPlots(playerId);
    if (playerPlots.has(patchId)) {
      return { canPlant: false, reason: 'Patch already occupied' };
    }

    if (!this.playerHasItem(playerId, seed.itemId, 1)) {
      return { canPlant: false, reason: `Need ${seed.name}` };
    }

    if (!this.playerHasFarmingTool(playerId, 'seed_dibber')) {
      return { canPlant: false, reason: 'Need seed dibber' };
    }

    return { canPlant: true };
  }

  canHarvestCrop(playerId: string, patchId: string): { canHarvest: boolean, reason?: string } {
    const patch = this.farmingPatches.get(patchId);
    if (!patch) {
      return { canHarvest: false, reason: `Unknown patch: ${patchId}` };
    }

    const playerPlots = this.getPlayerPlots(playerId);
    const crop = playerPlots.get(patchId);
    if (!crop) {
      return { canHarvest: false, reason: 'No crop planted' };
    }

    if (crop.dead) {
      return { canHarvest: false, reason: 'Crop is dead' };
    }

    if (crop.currentStage < crop.maxStage) {
      return { canHarvest: false, reason: 'Crop not ready for harvest' };
    }

    return { canHarvest: true };
  }

  canClearPatch(playerId: string, patchId: string): { canClear: boolean, reason?: string } {
    const patch = this.farmingPatches.get(patchId);
    if (!patch) {
      return { canClear: false, reason: `Unknown patch: ${patchId}` };
    }

    if (!this.playerHasFarmingTool(playerId, 'spade')) {
      return { canClear: false, reason: 'Need spade' };
    }

    return { canClear: true };
  }

  getPatchesByType(patchType: string): FarmPatch[] {
    return Array.from(this.farmingPatches.values()).filter(
      patch => patch.type === patchType
    );
  }

  getSeedsByLevel(minLevel: number, maxLevel: number = 99): FarmingSeed[] {
    return Array.from(this.farmingSeeds.values()).filter(
      seed => seed.levelRequired >= minLevel && seed.levelRequired <= maxLevel
    );
  }
}

// Type definitions
interface FarmPatch {
  id: string;
  name: string;
  type: 'allotment' | 'flower' | 'herb' | 'tree' | 'fruit_tree' | 'bush' | 'hops' | 'cactus';
  location: string;
  position: { x: number; y: number; z: number };
  protectedByNPC: boolean;
}

interface FarmingSeed {
  id: string;
  name: string;
  itemId: number;
  productId: number;
  patchType: string;
  levelRequired: number;
  plantingXP: number;
  harvestXP: number;
  growthTime: number; // milliseconds
  growthStages: number;
  harvestYield: number;
}

interface PlantedCrop {
  playerId: string;
  patchId: string;
  seedId: string;
  plantedTime: number;
  currentStage: number;
  maxStage: number;
  waterLevel: number; // 0-3
  compostLevel: number; // 0-3
  diseased: boolean;
  dead: boolean;
  protected: boolean;
  lastWatered: number;
  lastComposted: number;
}

interface PlantProduct {
  id: string;
  name: string;
  itemId: number;
  category: 'vegetable' | 'fruit' | 'flower' | 'herb' | 'logs';
}

interface FarmingAction {
  playerId: string;
  type: 'plant' | 'harvest' | 'clear' | 'water' | 'compost';
  patchId: string;
  startTime: number;
  duration: number;
}