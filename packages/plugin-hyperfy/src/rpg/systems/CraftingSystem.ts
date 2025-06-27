/**
 * RuneScape Crafting System Implementation
 * =======================================
 * Handles leather working, pottery, jewelry, spinning, and weaving
 */

import { logger } from '@elizaos/core';
import type { HyperfySystem, HyperfyWorld, HyperfyEntity } from '../../types/hyperfy';
import type { StatsComponent } from '../types/stats';
import type { InventoryComponent } from '../types/inventory';
import type {
  CraftingRecipe,
  ProductionAction,
  ProductionStation
} from '../types/production';
import { PRODUCTION_CONSTANTS } from '../types/production';

export class CraftingSystem implements HyperfySystem {
  name = 'CraftingSystem';
  world: HyperfyWorld;
  enabled = true;

  // Crafting data
  private craftingRecipes: Map<string, CraftingRecipe> = new Map();
  private activeActions: Map<string, ProductionAction> = new Map();
  private craftingStations: Map<string, CraftingStationInstance> = new Map();

  // Tick tracking
  private tickCounter = 0;
  private lastTickTime = 0;

  constructor(world: HyperfyWorld) {
    this.world = world;
    this.initializeCraftingData();
    logger.info('[CraftingSystem] Initialized RuneScape crafting mechanics');
  }

  async init(): Promise<void> {
    logger.info('[CraftingSystem] Starting crafting system...');
    
    // Subscribe to crafting events
    this.world.events.on('rpg:start_crafting', this.handleStartCrafting.bind(this));
    this.world.events.on('rpg:stop_crafting', this.handleStopCrafting.bind(this));
    this.world.events.on('rpg:craft_item', this.handleCraftItem.bind(this));
    this.world.events.on('rpg:tan_hide', this.handleTanHide.bind(this));
    this.world.events.on('rpg:spin_wool', this.handleSpinWool.bind(this));
    
    // Create crafting stations in the world
    this.spawnCraftingStations();
  }

  tick(delta: number): void {
    const now = Date.now();
    
    // Process crafting ticks (every 600ms like RuneScape)
    if (now - this.lastTickTime >= 600) {
      this.processCraftingTick();
      this.lastTickTime = now;
      this.tickCounter++;
    }
    
    // Update crafting actions
    this.updateCraftingActions(delta);
  }

  destroy(): void {
    this.world.events.off('rpg:start_crafting');
    this.world.events.off('rpg:stop_crafting');
    this.world.events.off('rpg:craft_item');
    this.world.events.off('rpg:tan_hide');
    this.world.events.off('rpg:spin_wool');
    logger.info('[CraftingSystem] Crafting system destroyed');
  }

  /**
   * Start crafting an item
   */
  startCrafting(playerId: string, recipeId: string, stationId: string, quantity: number = 1): boolean {
    const player = this.world.entities.players.get(playerId);
    if (!player) {
      logger.warn(`[CraftingSystem] Player ${playerId} not found`);
      return false;
    }

    const recipe = this.craftingRecipes.get(recipeId);
    if (!recipe) {
      logger.warn(`[CraftingSystem] Crafting recipe ${recipeId} not found`);
      return false;
    }

    const station = this.craftingStations.get(stationId);
    if (!station) {
      logger.warn(`[CraftingSystem] Crafting station ${stationId} not found`);
      return false;
    }

    if (station.inUse) {
      logger.info(`[CraftingSystem] Station ${stationId} is already in use`);
      return false;
    }

    // Check if station type matches recipe category
    if (!this.isValidStationForRecipe(station.type, recipe.category)) {
      logger.info(`[CraftingSystem] Cannot craft ${recipe.name} at ${station.type}`);
      return false;
    }

    // Check crafting level requirement
    const stats = this.getPlayerStats(playerId);
    if (!stats || stats.crafting.level < recipe.level) {
      logger.info(`[CraftingSystem] Player ${playerId} needs crafting level ${recipe.level}`);
      return false;
    }

    // Check if player has required materials
    if (!this.playerHasIngredients(playerId, recipe.ingredients, quantity)) {
      logger.info(`[CraftingSystem] Player ${playerId} missing ingredients for ${recipe.name}`);
      return false;
    }

    // Check if player has required tools
    if (recipe.requiredTools && !this.playerHasTools(playerId, recipe.requiredTools)) {
      logger.info(`[CraftingSystem] Player ${playerId} missing required tools for ${recipe.name}`);
      return false;
    }

    // Check if player already crafting
    if (this.activeActions.has(playerId)) {
      this.stopCrafting(playerId);
    }

    // Calculate crafting duration
    const baseDuration = this.calculateCraftingDuration(recipe, quantity);
    
    // Create crafting action
    const action: ProductionAction = {
      playerId,
      skill: 'crafting',
      recipeId,
      stationId,
      startTime: Date.now(),
      duration: baseDuration,
      quantity,
      completed: 0,
      itemsProduced: [],
      xpGained: 0,
      lastProduction: 0,
    };

    this.activeActions.set(playerId, action);
    station.inUse = true;
    station.userId = playerId;

    // Consume ingredients
    this.consumeIngredients(playerId, recipe.ingredients, quantity);

    logger.info(`[CraftingSystem] ${playerId} started crafting ${recipe.name} x${quantity} at ${station.type} (${(baseDuration/1000).toFixed(1)}s)`);

    // Emit crafting started event
    this.world.events.emit('rpg:crafting_started', {
      playerId,
      recipeId,
      stationId,
      stationType: station.type,
      quantity,
    });

    return true;
  }

  /**
   * Stop crafting
   */
  stopCrafting(playerId: string): boolean {
    const action = this.activeActions.get(playerId);
    if (!action) {
      return false;
    }

    // Free up the station
    const station = this.craftingStations.get(action.stationId);
    if (station) {
      station.inUse = false;
      station.userId = null;
    }

    // Remove from active actions
    this.activeActions.delete(playerId);

    logger.info(`[CraftingSystem] ${playerId} stopped crafting`);

    // Emit crafting stopped event
    this.world.events.emit('rpg:crafting_stopped', {
      playerId,
      totalXP: action.xpGained,
      totalItems: action.itemsProduced.length,
    });

    return true;
  }

  /**
   * Process a crafting production cycle
   */
  private processCraftingProduction(action: ProductionAction): void {
    const recipe = this.craftingRecipes.get(action.recipeId);
    
    if (!recipe) {
      this.stopCrafting(action.playerId);
      return;
    }

    if (action.completed >= action.quantity) {
      this.stopCrafting(action.playerId);
      return;
    }

    // Calculate success chance (crafting rarely fails completely)
    const successChance = this.calculateSuccessChance(action.playerId, recipe);
    const isSuccess = Math.random() < successChance;

    let producedItemId: number;
    let producedQuantity: number;
    let xpGained: number;

    if (isSuccess) {
      // Crafting successful
      producedItemId = recipe.outputItem;
      producedQuantity = recipe.outputQuantity;
      xpGained = recipe.xp;
      
      // Grant XP
      this.grantCraftingXP(action.playerId, xpGained);
      action.xpGained += xpGained;
      
      logger.info(`[CraftingSystem] ${action.playerId} successfully crafted ${recipe.name}`);
    } else {
      // Crafting failed (rare, but possible for complex items)
      // In RuneScape, most crafting succeeds but some complex items can fail
      producedItemId = 0; // No item produced
      producedQuantity = 0;
      xpGained = Math.floor(recipe.xp * 0.1); // Small XP for attempting
      
      if (xpGained > 0) {
        this.grantCraftingXP(action.playerId, xpGained);
        action.xpGained += xpGained;
      }
      
      logger.info(`[CraftingSystem] ${action.playerId} failed to craft ${recipe.name} (${((1-successChance) * 100).toFixed(1)}% failure chance)`);
    }

    // Produce the item if successful
    if (producedItemId > 0) {
      this.produceItem(action.playerId, producedItemId, producedQuantity);
      action.itemsProduced.push({ itemId: producedItemId, quantity: producedQuantity });
    }
    
    action.completed++;

    // Emit production event
    this.world.events.emit('rpg:crafting_result', {
      playerId: action.playerId,
      recipeId: recipe.id,
      itemId: producedItemId,
      quantity: producedQuantity,
      xpGained,
      success: isSuccess,
      successChance: successChance * 100,
      completed: action.completed,
      total: action.quantity,
    });

    action.lastProduction = Date.now();

    // Check if all items completed
    if (action.completed >= action.quantity) {
      this.stopCrafting(action.playerId);
    }
  }

  /**
   * Calculate success chance based on player level and recipe complexity
   */
  private calculateSuccessChance(playerId: string, recipe: CraftingRecipe): number {
    const stats = this.getPlayerStats(playerId);
    if (!stats) return PRODUCTION_CONSTANTS.BASE_SUCCESS_RATE;

    const playerLevel = stats.crafting.level;
    const recipeLevel = recipe.level;

    // Base success rate
    let successChance = PRODUCTION_CONSTANTS.BASE_SUCCESS_RATE;

    // Increase success chance based on level difference
    if (playerLevel > recipeLevel) {
      const levelDifference = playerLevel - recipeLevel;
      successChance = Math.min(1.0, successChance + (levelDifference * PRODUCTION_CONSTANTS.LEVEL_SUCCESS_BONUS));
    }

    // Complex recipes (jewelry, glassblowing) have slightly lower success rates
    if (recipe.category === 'jewelry' || recipe.category === 'glassblowing') {
      successChance *= 0.95; // 5% reduction for complex crafting
    }

    return Math.max(0.5, Math.min(1.0, successChance)); // Between 50% and 100%
  }

  /**
   * Check if station type is valid for recipe category
   */
  private isValidStationForRecipe(stationType: string, category: string): boolean {
    const validCombinations: Record<string, string[]> = {
      'tanning_vat': ['leather'],
      'pottery_wheel': ['pottery'],
      'furnace_jewelry': ['jewelry'],
      'spinning_wheel': ['spinning'],
      'loom': ['weaving'],
      'crafting_table': ['leather', 'pottery', 'jewelry'], // General crafting
    };

    return validCombinations[stationType]?.includes(category) || false;
  }

  /**
   * Calculate crafting duration
   */
  private calculateCraftingDuration(recipe: CraftingRecipe, quantity: number): number {
    const baseTime = PRODUCTION_CONSTANTS.BASE_CRAFTING_TIME;
    
    // More complex categories take longer
    const complexityMultipliers: Record<string, number> = {
      'leather': 1.0,
      'pottery': 1.2,
      'jewelry': 1.5,
      'spinning': 0.8,
      'weaving': 1.3,
      'glassblowing': 1.4,
    };
    
    const multiplier = complexityMultipliers[recipe.category] || 1.0;
    const totalDuration = baseTime * quantity * multiplier;
    
    return Math.max(1000, totalDuration);
  }

  /**
   * Check if player has required ingredients
   */
  private playerHasIngredients(playerId: string, ingredients: Array<{itemId: number, quantity: number}>, multiplier: number = 1): boolean {
    const inventory = this.getPlayerInventory(playerId);
    if (!inventory) return false;

    for (const ingredient of ingredients) {
      const required = ingredient.quantity * multiplier;
      const available = this.getItemQuantity(inventory, ingredient.itemId);
      
      if (available < required) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check if player has required tools
   */
  private playerHasTools(playerId: string, requiredTools: number[]): boolean {
    const inventory = this.getPlayerInventory(playerId);
    if (!inventory) return false;

    for (const toolId of requiredTools) {
      const hasTools = inventory.items.some(item => 
        item && item.itemId === toolId && item.quantity > 0
      );
      
      if (!hasTools) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get quantity of specific item in inventory
   */
  private getItemQuantity(inventory: InventoryComponent, itemId: number): number {
    let total = 0;
    
    for (const item of inventory.items) {
      if (item && item.itemId === itemId) {
        total += item.quantity;
      }
    }
    
    return total;
  }

  /**
   * Consume ingredients from inventory
   */
  private consumeIngredients(playerId: string, ingredients: Array<{itemId: number, quantity: number}>, multiplier: number = 1): void {
    for (const ingredient of ingredients) {
      const required = ingredient.quantity * multiplier;
      
      this.world.events.emit('rpg:remove_item', {
        playerId,
        itemId: ingredient.itemId,
        quantity: required,
      });
    }
  }

  /**
   * Produce item and add to inventory
   */
  private produceItem(playerId: string, itemId: number, quantity: number): void {
    this.world.events.emit('rpg:add_item', {
      playerId,
      itemId,
      quantity,
      noted: false,
    });
  }

  /**
   * Grant crafting XP
   */
  private grantCraftingXP(playerId: string, amount: number): void {
    this.world.events.emit('rpg:xp_gain', {
      playerId,
      skill: 'crafting',
      amount,
      source: 'crafting',
    });
  }

  /**
   * Update active crafting actions
   */
  private updateCraftingActions(delta: number): void {
    const now = Date.now();
    
    for (const action of this.activeActions.values()) {
      // Check if it's time for next production
      const timePerItem = action.duration / action.quantity;
      const timeSinceStart = now - action.startTime;
      const expectedCompleted = Math.floor(timeSinceStart / timePerItem);
      
      if (expectedCompleted > action.completed && action.completed < action.quantity) {
        this.processCraftingProduction(action);
      }
    }
  }

  /**
   * Process crafting tick
   */
  private processCraftingTick(): void {
    // Handle any tick-based crafting mechanics
  }

  /**
   * Create crafting stations in the world
   */
  private spawnCraftingStations(): void {
    // Create various crafting stations
    const stationConfigs = [
      { id: 'tanning_vat_1', type: 'tanning_vat', position: { x: 130, y: 0, z: 0 }, model: 'tanning_vat_model' },
      { id: 'pottery_wheel_1', type: 'pottery_wheel', position: { x: 135, y: 0, z: 0 }, model: 'pottery_wheel_model' },
      { id: 'furnace_jewelry_1', type: 'furnace_jewelry', position: { x: 140, y: 0, z: 0 }, model: 'furnace_model' },
      { id: 'spinning_wheel_1', type: 'spinning_wheel', position: { x: 145, y: 0, z: 0 }, model: 'spinning_wheel_model' },
      { id: 'spinning_wheel_2', type: 'spinning_wheel', position: { x: 150, y: 0, z: 0 }, model: 'spinning_wheel_model' },
      { id: 'loom_1', type: 'loom', position: { x: 155, y: 0, z: 0 }, model: 'loom_model' },
      { id: 'crafting_table_1', type: 'crafting_table', position: { x: 160, y: 0, z: 0 }, model: 'crafting_table_model' },
      { id: 'crafting_table_2', type: 'crafting_table', position: { x: 165, y: 0, z: 0 }, model: 'crafting_table_model' },
    ];

    stationConfigs.forEach(config => {
      const station: CraftingStationInstance = {
        id: config.id,
        type: config.type,
        position: config.position,
        inUse: false,
        userId: null,
        model: config.model,
      };
      
      this.craftingStations.set(config.id, station);
    });

    logger.info(`[CraftingSystem] Spawned ${stationConfigs.length} crafting stations`);
  }

  /**
   * Initialize crafting data
   */
  private initializeCraftingData(): void {
    // Initialize crafting recipes
    const craftingRecipes: CraftingRecipe[] = [
      // Leather crafting
      {
        id: 'leather_gloves',
        name: 'Leather gloves',
        level: 1,
        xp: 13.8,
        ingredients: [
          { itemId: 1741, quantity: 1 }, // Leather
        ],
        outputItem: 1059, // Leather gloves
        outputQuantity: 1,
        requiredTools: [1733], // Needle
        category: 'leather',
      },
      {
        id: 'leather_boots',
        name: 'Leather boots',
        level: 7,
        xp: 16.25,
        ingredients: [
          { itemId: 1741, quantity: 1 }, // Leather
        ],
        outputItem: 1061, // Leather boots
        outputQuantity: 1,
        requiredTools: [1733], // Needle
        category: 'leather',
      },
      {
        id: 'leather_cowl',
        name: 'Leather cowl',
        level: 9,
        xp: 18.5,
        ingredients: [
          { itemId: 1741, quantity: 1 }, // Leather
        ],
        outputItem: 1167, // Leather cowl
        outputQuantity: 1,
        requiredTools: [1733], // Needle
        category: 'leather',
      },
      {
        id: 'leather_vambraces',
        name: 'Leather vambraces',
        level: 11,
        xp: 22,
        ingredients: [
          { itemId: 1741, quantity: 1 }, // Leather
        ],
        outputItem: 1063, // Leather vambraces
        outputQuantity: 1,
        requiredTools: [1733], // Needle
        category: 'leather',
      },
      {
        id: 'leather_body',
        name: 'Leather body',
        level: 14,
        xp: 25,
        ingredients: [
          { itemId: 1741, quantity: 1 }, // Leather
        ],
        outputItem: 1129, // Leather body
        outputQuantity: 1,
        requiredTools: [1733], // Needle
        category: 'leather',
      },
      {
        id: 'leather_chaps',
        name: 'Leather chaps',
        level: 18,
        xp: 27,
        ingredients: [
          { itemId: 1741, quantity: 1 }, // Leather
        ],
        outputItem: 1095, // Leather chaps
        outputQuantity: 1,
        requiredTools: [1733], // Needle
        category: 'leather',
      },

      // Pottery
      {
        id: 'pot',
        name: 'Pot',
        level: 1,
        xp: 6.25,
        ingredients: [
          { itemId: 434, quantity: 1 }, // Soft clay
        ],
        outputItem: 1931, // Pot
        outputQuantity: 1,
        category: 'pottery',
      },
      {
        id: 'pie_dish',
        name: 'Pie dish',
        level: 7,
        xp: 15,
        ingredients: [
          { itemId: 434, quantity: 1 }, // Soft clay
        ],
        outputItem: 2313, // Pie dish
        outputQuantity: 1,
        category: 'pottery',
      },
      {
        id: 'bowl',
        name: 'Bowl',
        level: 8,
        xp: 18,
        ingredients: [
          { itemId: 434, quantity: 1 }, // Soft clay
        ],
        outputItem: 1923, // Bowl
        outputQuantity: 1,
        category: 'pottery',
      },

      // Jewelry
      {
        id: 'gold_ring',
        name: 'Gold ring',
        level: 5,
        xp: 15,
        ingredients: [
          { itemId: 2357, quantity: 1 }, // Gold bar
        ],
        outputItem: 1635, // Gold ring
        outputQuantity: 1,
        requiredTools: [1592], // Ring mould
        category: 'jewelry',
      },
      {
        id: 'sapphire_ring',
        name: 'Sapphire ring',
        level: 20,
        xp: 40,
        ingredients: [
          { itemId: 2357, quantity: 1 }, // Gold bar
          { itemId: 1607, quantity: 1 }, // Sapphire
        ],
        outputItem: 1637, // Sapphire ring
        outputQuantity: 1,
        requiredTools: [1592], // Ring mould
        category: 'jewelry',
      },
      {
        id: 'emerald_ring',
        name: 'Emerald ring',
        level: 27,
        xp: 55,
        ingredients: [
          { itemId: 2357, quantity: 1 }, // Gold bar
          { itemId: 1605, quantity: 1 }, // Emerald
        ],
        outputItem: 1639, // Emerald ring
        outputQuantity: 1,
        requiredTools: [1592], // Ring mould
        category: 'jewelry',
      },
      {
        id: 'ruby_ring',
        name: 'Ruby ring',
        level: 34,
        xp: 70,
        ingredients: [
          { itemId: 2357, quantity: 1 }, // Gold bar
          { itemId: 1603, quantity: 1 }, // Ruby
        ],
        outputItem: 1641, // Ruby ring
        outputQuantity: 1,
        requiredTools: [1592], // Ring mould
        category: 'jewelry',
      },
      {
        id: 'diamond_ring',
        name: 'Diamond ring',
        level: 43,
        xp: 85,
        ingredients: [
          { itemId: 2357, quantity: 1 }, // Gold bar
          { itemId: 1601, quantity: 1 }, // Diamond
        ],
        outputItem: 1643, // Diamond ring
        outputQuantity: 1,
        requiredTools: [1592], // Ring mould
        category: 'jewelry',
      },

      // Spinning
      {
        id: 'ball_of_wool',
        name: 'Ball of wool',
        level: 1,
        xp: 2.5,
        ingredients: [
          { itemId: 1737, quantity: 1 }, // Wool
        ],
        outputItem: 1759, // Ball of wool
        outputQuantity: 1,
        category: 'spinning',
      },
      {
        id: 'bow_string',
        name: 'Bow string',
        level: 10,
        xp: 15,
        ingredients: [
          { itemId: 1779, quantity: 1 }, // Flax
        ],
        outputItem: 1777, // Bow string
        outputQuantity: 1,
        category: 'spinning',
      },

      // Weaving
      {
        id: 'strip_of_cloth',
        name: 'Strip of cloth',
        level: 10,
        xp: 12,
        ingredients: [
          { itemId: 1759, quantity: 4 }, // Ball of wool
        ],
        outputItem: 3224, // Strip of cloth
        outputQuantity: 1,
        category: 'weaving',
      },
      {
        id: 'empty_sack',
        name: 'Empty sack',
        level: 21,
        xp: 38,
        ingredients: [
          { itemId: 5931, quantity: 4 }, // Jute fibre
        ],
        outputItem: 5418, // Empty sack
        outputQuantity: 1,
        category: 'weaving',
      },

      // Glassblowing
      {
        id: 'beer_glass',
        name: 'Beer glass',
        level: 1,
        xp: 17.5,
        ingredients: [
          { itemId: 1775, quantity: 1 }, // Molten glass
        ],
        outputItem: 1919, // Beer glass
        outputQuantity: 1,
        requiredTools: [1785], // Glassblowing pipe
        category: 'glassblowing',
      },
      {
        id: 'vial',
        name: 'Vial',
        level: 33,
        xp: 35,
        ingredients: [
          { itemId: 1775, quantity: 1 }, // Molten glass
        ],
        outputItem: 229, // Vial
        outputQuantity: 1,
        requiredTools: [1785], // Glassblowing pipe
        category: 'glassblowing',
      },
    ];

    craftingRecipes.forEach(recipe => {
      this.craftingRecipes.set(recipe.id, recipe);
    });

    logger.info(`[CraftingSystem] Loaded ${craftingRecipes.length} crafting recipes`);
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
  private handleStartCrafting(event: any): void {
    const { playerId, recipeId, stationId, quantity } = event;
    this.startCrafting(playerId, recipeId, stationId, quantity || 1);
  }

  private handleStopCrafting(event: any): void {
    const { playerId } = event;
    this.stopCrafting(playerId);
  }

  private handleCraftItem(event: any): void {
    const { playerId, itemType, category } = event;
    // Find nearest available station for the category
    for (const [stationId, station] of this.craftingStations.entries()) {
      if (!station.inUse && this.isValidStationForRecipe(station.type, category)) {
        this.startCrafting(playerId, itemType, stationId, 1);
        break;
      }
    }
  }

  private handleTanHide(event: any): void {
    const { playerId, hideType } = event;
    // Find tanning vat
    for (const [stationId, station] of this.craftingStations.entries()) {
      if (!station.inUse && station.type === 'tanning_vat') {
        // This would handle hide tanning (converting raw hides to leather)
        logger.info(`[CraftingSystem] ${playerId} tanning ${hideType} at ${stationId}`);
        break;
      }
    }
  }

  private handleSpinWool(event: any): void {
    const { playerId } = event;
    // Find spinning wheel for wool spinning
    for (const [stationId, station] of this.craftingStations.entries()) {
      if (!station.inUse && station.type === 'spinning_wheel') {
        this.startCrafting(playerId, 'ball_of_wool', stationId, 1);
        break;
      }
    }
  }

  // Public API
  getCraftingRecipes(): Map<string, CraftingRecipe> {
    return new Map(this.craftingRecipes);
  }

  getCraftingStations(): Map<string, CraftingStationInstance> {
    return new Map(this.craftingStations);
  }

  getActiveActions(): Map<string, ProductionAction> {
    return new Map(this.activeActions);
  }

  isPlayerCrafting(playerId: string): boolean {
    return this.activeActions.has(playerId);
  }

  // Validation methods for actions
  canCraftItem(playerId: string, recipeId: string): { canCraft: boolean, reason?: string } {
    const recipe = this.craftingRecipes.get(recipeId);
    if (!recipe) {
      return { canCraft: false, reason: `Unknown recipe: ${recipeId}` };
    }

    const stats = this.getPlayerStats(playerId);
    if (!stats || stats.crafting.level < recipe.level) {
      return { canCraft: false, reason: `Need crafting level ${recipe.level}` };
    }

    if (!this.playerHasIngredients(playerId, recipe.ingredients, 1)) {
      return { canCraft: false, reason: 'Missing required materials' };
    }

    if (recipe.requiredTools && !this.playerHasTools(playerId, recipe.requiredTools)) {
      return { canCraft: false, reason: 'Missing required tools' };
    }

    // Check for available station
    const availableStation = Array.from(this.craftingStations.values()).find(s => 
      !s.inUse && this.isValidStationForRecipe(s.type, recipe.category)
    );
    if (!availableStation) {
      return { canCraft: false, reason: `No available ${recipe.category} stations` };
    }

    return { canCraft: true };
  }

  getRecipesByCategory(category: string): CraftingRecipe[] {
    return Array.from(this.craftingRecipes.values()).filter(recipe => recipe.category === category);
  }

  getSuccessChance(playerId: string, recipeId: string): number {
    const recipe = this.craftingRecipes.get(recipeId);
    if (!recipe) return 0;

    return this.calculateSuccessChance(playerId, recipe) * 100;
  }
}

interface CraftingStationInstance {
  id: string;
  type: string;
  position: { x: number; y: number; z: number };
  inUse: boolean;
  userId: string | null;
  model: string;
}