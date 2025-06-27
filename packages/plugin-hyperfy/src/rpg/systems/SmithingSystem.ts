/**
 * RuneScape Smithing System Implementation
 * =======================================
 * Handles ore smelting, bar creation, and equipment forging
 */

import { logger } from '@elizaos/core';
import type { HyperfySystem, HyperfyWorld, HyperfyEntity } from '../../types/hyperfy';
import type { StatsComponent } from '../types/stats';
import type { InventoryComponent } from '../types/inventory';
import type {
  SmithingRecipe,
  SmeltingRecipe,
  ProductionAction,
  ProductionConstants
} from '../types/production';

export class SmithingSystem implements HyperfySystem {
  name = 'SmithingSystem';
  world: HyperfyWorld;
  enabled = true;

  // Smithing data
  private smeltingRecipes: Map<string, SmeltingRecipe> = new Map();
  private smithingRecipes: Map<string, SmithingRecipe> = new Map();
  private activeActions: Map<string, ProductionAction> = new Map();
  private furnaces: Map<string, FurnaceInstance> = new Map();
  private anvils: Map<string, AnvilInstance> = new Map();

  // Tick tracking
  private tickCounter = 0;
  private lastTickTime = 0;

  constructor(world: HyperfyWorld) {
    this.world = world;
    this.initializeSmithingData();
    logger.info('[SmithingSystem] Initialized RuneScape smithing mechanics');
  }

  async init(): Promise<void> {
    logger.info('[SmithingSystem] Starting smithing system...');
    
    // Subscribe to smithing events
    this.world.events.on('rpg:start_smelting', this.handleStartSmelting.bind(this));
    this.world.events.on('rpg:start_smithing', this.handleStartSmithing.bind(this));
    this.world.events.on('rpg:stop_smithing', this.handleStopSmithing.bind(this));
    this.world.events.on('rpg:smelt_ore', this.handleSmeltOre.bind(this));
    this.world.events.on('rpg:smith_item', this.handleSmithItem.bind(this));
    
    // Create furnaces and anvils in the world
    this.spawnSmithingStations();
  }

  tick(delta: number): void {
    const now = Date.now();
    
    // Process smithing ticks (every 600ms like RuneScape)
    if (now - this.lastTickTime >= 600) {
      this.processSmithingTick();
      this.lastTickTime = now;
      this.tickCounter++;
    }
    
    // Update smithing actions
    this.updateSmithingActions(delta);
  }

  destroy(): void {
    this.world.events.off('rpg:start_smelting');
    this.world.events.off('rpg:start_smithing');
    this.world.events.off('rpg:stop_smithing');
    this.world.events.off('rpg:smelt_ore');
    this.world.events.off('rpg:smith_item');
    logger.info('[SmithingSystem] Smithing system destroyed');
  }

  /**
   * Start smelting ore into bars
   */
  startSmelting(playerId: string, recipeId: string, furnaceId: string, quantity: number = 1): boolean {
    const player = this.world.entities.players.get(playerId);
    if (!player) {
      logger.warn(`[SmithingSystem] Player ${playerId} not found`);
      return false;
    }

    const recipe = this.smeltingRecipes.get(recipeId);
    if (!recipe) {
      logger.warn(`[SmithingSystem] Smelting recipe ${recipeId} not found`);
      return false;
    }

    const furnace = this.furnaces.get(furnaceId);
    if (!furnace) {
      logger.warn(`[SmithingSystem] Furnace ${furnaceId} not found`);
      return false;
    }

    if (furnace.inUse) {
      logger.info(`[SmithingSystem] Furnace ${furnaceId} is already in use`);
      return false;
    }

    // Check smithing level requirement
    const stats = this.getPlayerStats(playerId);
    if (!stats || stats.smithing.level < recipe.level) {
      logger.info(`[SmithingSystem] Player ${playerId} needs smithing level ${recipe.level}`);
      return false;
    }

    // Check if player has required materials
    if (!this.playerHasIngredients(playerId, recipe.ingredients, quantity)) {
      logger.info(`[SmithingSystem] Player ${playerId} missing ingredients for ${recipe.name}`);
      return false;
    }

    // Check if player already smithing
    if (this.activeActions.has(playerId)) {
      this.stopSmithing(playerId);
    }

    // Calculate smelting duration
    const baseDuration = this.calculateSmithingDuration(recipe, quantity);
    
    // Create smelting action
    const action: ProductionAction = {
      playerId,
      skill: 'smithing',
      recipeId,
      stationId: furnaceId,
      startTime: Date.now(),
      duration: baseDuration,
      quantity,
      completed: 0,
      itemsProduced: [],
      xpGained: 0,
      lastProduction: 0,
    };

    this.activeActions.set(playerId, action);
    furnace.inUse = true;
    furnace.userId = playerId;

    // Consume ingredients
    this.consumeIngredients(playerId, recipe.ingredients, quantity);

    logger.info(`[SmithingSystem] ${playerId} started smelting ${recipe.name} x${quantity} (${(baseDuration/1000).toFixed(1)}s)`);

    // Emit smelting started event
    this.world.events.emit('rpg:smelting_started', {
      playerId,
      recipeId,
      furnaceId,
      quantity,
    });

    return true;
  }

  /**
   * Start smithing items at anvil
   */
  startSmithing(playerId: string, recipeId: string, anvilId: string, quantity: number = 1): boolean {
    const player = this.world.entities.players.get(playerId);
    if (!player) {
      logger.warn(`[SmithingSystem] Player ${playerId} not found`);
      return false;
    }

    const recipe = this.smithingRecipes.get(recipeId);
    if (!recipe) {
      logger.warn(`[SmithingSystem] Smithing recipe ${recipeId} not found`);
      return false;
    }

    const anvil = this.anvils.get(anvilId);
    if (!anvil) {
      logger.warn(`[SmithingSystem] Anvil ${anvilId} not found`);
      return false;
    }

    if (anvil.inUse) {
      logger.info(`[SmithingSystem] Anvil ${anvilId} is already in use`);
      return false;
    }

    // Check smithing level requirement
    const stats = this.getPlayerStats(playerId);
    if (!stats || stats.smithing.level < recipe.level) {
      logger.info(`[SmithingSystem] Player ${playerId} needs smithing level ${recipe.level}`);
      return false;
    }

    // Check if player has required materials and hammer
    if (!this.playerHasIngredients(playerId, recipe.ingredients, quantity)) {
      logger.info(`[SmithingSystem] Player ${playerId} missing ingredients for ${recipe.name}`);
      return false;
    }

    if (!this.playerHasHammer(playerId)) {
      logger.info(`[SmithingSystem] Player ${playerId} needs a hammer to smith`);
      return false;
    }

    // Check if player already smithing
    if (this.activeActions.has(playerId)) {
      this.stopSmithing(playerId);
    }

    // Calculate smithing duration
    const baseDuration = this.calculateSmithingDuration(recipe, quantity);
    
    // Create smithing action
    const action: ProductionAction = {
      playerId,
      skill: 'smithing',
      recipeId,
      stationId: anvilId,
      startTime: Date.now(),
      duration: baseDuration,
      quantity,
      completed: 0,
      itemsProduced: [],
      xpGained: 0,
      lastProduction: 0,
    };

    this.activeActions.set(playerId, action);
    anvil.inUse = true;
    anvil.userId = playerId;

    // Consume ingredients
    this.consumeIngredients(playerId, recipe.ingredients, quantity);

    logger.info(`[SmithingSystem] ${playerId} started smithing ${recipe.name} x${quantity} (${(baseDuration/1000).toFixed(1)}s)`);

    // Emit smithing started event
    this.world.events.emit('rpg:smithing_started', {
      playerId,
      recipeId,
      anvilId,
      quantity,
    });

    return true;
  }

  /**
   * Stop smithing
   */
  stopSmithing(playerId: string): boolean {
    const action = this.activeActions.get(playerId);
    if (!action) {
      return false;
    }

    // Free up the station
    const furnace = this.furnaces.get(action.stationId);
    const anvil = this.anvils.get(action.stationId);
    
    if (furnace) {
      furnace.inUse = false;
      furnace.userId = null;
    }
    
    if (anvil) {
      anvil.inUse = false;
      anvil.userId = null;
    }

    // Remove from active actions
    this.activeActions.delete(playerId);

    logger.info(`[SmithingSystem] ${playerId} stopped smithing`);

    // Emit smithing stopped event
    this.world.events.emit('rpg:smithing_stopped', {
      playerId,
      totalXP: action.xpGained,
      totalItems: action.itemsProduced.length,
    });

    return true;
  }

  /**
   * Process a smithing production cycle
   */
  private processSmithingProduction(action: ProductionAction): void {
    const recipe = this.smeltingRecipes.get(action.recipeId) || this.smithingRecipes.get(action.recipeId);
    
    if (!recipe) {
      this.stopSmithing(action.playerId);
      return;
    }

    if (action.completed >= action.quantity) {
      this.stopSmithing(action.playerId);
      return;
    }

    // Produce one item
    this.produceItem(action.playerId, recipe);
    
    // Grant XP
    this.grantSmithingXP(action.playerId, recipe.xp);
    action.xpGained += recipe.xp;
    
    // Track items produced
    action.itemsProduced.push({ itemId: recipe.outputItem, quantity: recipe.outputQuantity });
    action.completed++;

    logger.info(`[SmithingSystem] ${action.playerId} produced ${recipe.name} (${action.completed}/${action.quantity})`);

    // Emit production success event
    this.world.events.emit('rpg:smithing_success', {
      playerId: action.playerId,
      recipeId: recipe.id,
      itemId: recipe.outputItem,
      xpGained: recipe.xp,
      completed: action.completed,
      total: action.quantity,
    });

    action.lastProduction = Date.now();

    // Check if all items completed
    if (action.completed >= action.quantity) {
      this.stopSmithing(action.playerId);
    }
  }

  /**
   * Calculate smithing duration
   */
  private calculateSmithingDuration(recipe: SmeltingRecipe | SmithingRecipe, quantity: number): number {
    // Base duration per item (in milliseconds)
    const baseTime = 3000; // 3 seconds per item
    
    // More complex items take longer
    const complexityMultiplier = recipe.ingredients.length * 0.2 + 1;
    
    const totalDuration = baseTime * quantity * complexityMultiplier;
    
    return Math.max(1000, totalDuration); // Minimum 1 second
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
   * Check if player has a hammer
   */
  private playerHasHammer(playerId: string): boolean {
    const inventory = this.getPlayerInventory(playerId);
    if (!inventory) return false;

    // Hammer item IDs
    const hammerIds = [2347]; // Hammer

    return inventory.items.some(item => 
      item && hammerIds.includes(item.itemId) && item.quantity > 0
    );
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
  private produceItem(playerId: string, recipe: SmeltingRecipe | SmithingRecipe): void {
    this.world.events.emit('rpg:add_item', {
      playerId,
      itemId: recipe.outputItem,
      quantity: recipe.outputQuantity,
      noted: false,
    });
  }

  /**
   * Grant smithing XP
   */
  private grantSmithingXP(playerId: string, amount: number): void {
    this.world.events.emit('rpg:xp_gain', {
      playerId,
      skill: 'smithing',
      amount,
      source: 'smithing',
    });
  }

  /**
   * Update active smithing actions
   */
  private updateSmithingActions(delta: number): void {
    const now = Date.now();
    
    for (const action of this.activeActions.values()) {
      // Check if it's time for next production
      const timePerItem = action.duration / action.quantity;
      const timeSinceStart = now - action.startTime;
      const expectedCompleted = Math.floor(timeSinceStart / timePerItem);
      
      if (expectedCompleted > action.completed && action.completed < action.quantity) {
        this.processSmithingProduction(action);
      }
    }
  }

  /**
   * Process smithing tick
   */
  private processSmithingTick(): void {
    // Handle any tick-based smithing mechanics
  }

  /**
   * Create furnaces and anvils in the world
   */
  private spawnSmithingStations(): void {
    // Create furnaces
    const furnaceLocations = [
      { id: 'furnace_1', position: { x: 90, y: 0, z: 0 } },
      { id: 'furnace_2', position: { x: 95, y: 0, z: 5 } },
    ];

    furnaceLocations.forEach(location => {
      const furnace: FurnaceInstance = {
        id: location.id,
        position: location.position,
        inUse: false,
        userId: null,
        model: 'furnace_model',
      };
      
      this.furnaces.set(location.id, furnace);
    });

    // Create anvils
    const anvilLocations = [
      { id: 'anvil_1', position: { x: 100, y: 0, z: 0 } },
      { id: 'anvil_2', position: { x: 105, y: 0, z: 5 } },
    ];

    anvilLocations.forEach(location => {
      const anvil: AnvilInstance = {
        id: location.id,
        position: location.position,
        inUse: false,
        userId: null,
        model: 'anvil_model',
      };
      
      this.anvils.set(location.id, anvil);
    });

    logger.info(`[SmithingSystem] Spawned ${furnaceLocations.length} furnaces and ${anvilLocations.length} anvils`);
  }

  /**
   * Initialize smithing data
   */
  private initializeSmithingData(): void {
    // Initialize smelting recipes (ore -> bars)
    const smeltingRecipes: SmeltingRecipe[] = [
      {
        id: 'bronze_bar',
        name: 'Bronze bar',
        level: 1,
        xp: 6.25,
        ingredients: [
          { itemId: 436, quantity: 1 }, // Copper ore
          { itemId: 438, quantity: 1 }, // Tin ore
        ],
        outputItem: 2349, // Bronze bar
        outputQuantity: 1,
        category: 'smelting',
      },
      {
        id: 'iron_bar',
        name: 'Iron bar',
        level: 15,
        xp: 12.5,
        ingredients: [
          { itemId: 440, quantity: 1 }, // Iron ore
        ],
        outputItem: 2351, // Iron bar
        outputQuantity: 1,
        category: 'smelting',
      },
      {
        id: 'steel_bar',
        name: 'Steel bar',
        level: 30,
        xp: 17.5,
        ingredients: [
          { itemId: 440, quantity: 1 }, // Iron ore
          { itemId: 453, quantity: 2 }, // Coal
        ],
        outputItem: 2353, // Steel bar
        outputQuantity: 1,
        category: 'smelting',
      },
      {
        id: 'mithril_bar',
        name: 'Mithril bar',
        level: 50,
        xp: 30,
        ingredients: [
          { itemId: 447, quantity: 1 }, // Mithril ore
          { itemId: 453, quantity: 4 }, // Coal
        ],
        outputItem: 2359, // Mithril bar
        outputQuantity: 1,
        category: 'smelting',
      },
      {
        id: 'adamant_bar',
        name: 'Adamantite bar',
        level: 70,
        xp: 37.5,
        ingredients: [
          { itemId: 449, quantity: 1 }, // Adamantite ore
          { itemId: 453, quantity: 6 }, // Coal
        ],
        outputItem: 2361, // Adamantite bar
        outputQuantity: 1,
        category: 'smelting',
      },
      {
        id: 'rune_bar',
        name: 'Runite bar',
        level: 85,
        xp: 50,
        ingredients: [
          { itemId: 451, quantity: 1 }, // Runite ore
          { itemId: 453, quantity: 8 }, // Coal
        ],
        outputItem: 2363, // Runite bar
        outputQuantity: 1,
        category: 'smelting',
      },
    ];

    smeltingRecipes.forEach(recipe => {
      this.smeltingRecipes.set(recipe.id, recipe);
    });

    // Initialize smithing recipes (bars -> equipment)
    const smithingRecipes: SmithingRecipe[] = [
      // Bronze equipment
      {
        id: 'bronze_dagger',
        name: 'Bronze dagger',
        level: 1,
        xp: 12.5,
        ingredients: [
          { itemId: 2349, quantity: 1 }, // Bronze bar
        ],
        outputItem: 1205, // Bronze dagger
        outputQuantity: 1,
        category: 'weapons',
      },
      {
        id: 'bronze_sword',
        name: 'Bronze sword',
        level: 4,
        xp: 12.5,
        ingredients: [
          { itemId: 2349, quantity: 1 }, // Bronze bar
        ],
        outputItem: 1277, // Bronze sword
        outputQuantity: 1,
        category: 'weapons',
      },
      {
        id: 'bronze_full_helm',
        name: 'Bronze full helm',
        level: 7,
        xp: 25,
        ingredients: [
          { itemId: 2349, quantity: 2 }, // Bronze bar
        ],
        outputItem: 1155, // Bronze full helm
        outputQuantity: 1,
        category: 'armour',
      },
      // Iron equipment
      {
        id: 'iron_dagger',
        name: 'Iron dagger',
        level: 15,
        xp: 25,
        ingredients: [
          { itemId: 2351, quantity: 1 }, // Iron bar
        ],
        outputItem: 1203, // Iron dagger
        outputQuantity: 1,
        category: 'weapons',
      },
      {
        id: 'iron_sword',
        name: 'Iron sword',
        level: 19,
        xp: 25,
        ingredients: [
          { itemId: 2351, quantity: 1 }, // Iron bar
        ],
        outputItem: 1279, // Iron sword
        outputQuantity: 1,
        category: 'weapons',
      },
      // Steel equipment
      {
        id: 'steel_dagger',
        name: 'Steel dagger',
        level: 30,
        xp: 37.5,
        ingredients: [
          { itemId: 2353, quantity: 1 }, // Steel bar
        ],
        outputItem: 1207, // Steel dagger
        outputQuantity: 1,
        category: 'weapons',
      },
      {
        id: 'steel_sword',
        name: 'Steel sword',
        level: 34,
        xp: 37.5,
        ingredients: [
          { itemId: 2353, quantity: 1 }, // Steel bar
        ],
        outputItem: 1281, // Steel sword
        outputQuantity: 1,
        category: 'weapons',
      },
      // Mithril equipment
      {
        id: 'mithril_dagger',
        name: 'Mithril dagger',
        level: 50,
        xp: 50,
        ingredients: [
          { itemId: 2359, quantity: 1 }, // Mithril bar
        ],
        outputItem: 1209, // Mithril dagger
        outputQuantity: 1,
        category: 'weapons',
      },
      // Adamant equipment
      {
        id: 'adamant_dagger',
        name: 'Adamant dagger',
        level: 70,
        xp: 62.5,
        ingredients: [
          { itemId: 2361, quantity: 1 }, // Adamantite bar
        ],
        outputItem: 1211, // Adamant dagger
        outputQuantity: 1,
        category: 'weapons',
      },
      // Rune equipment
      {
        id: 'rune_dagger',
        name: 'Rune dagger',
        level: 85,
        xp: 75,
        ingredients: [
          { itemId: 2363, quantity: 1 }, // Runite bar
        ],
        outputItem: 1213, // Rune dagger
        outputQuantity: 1,
        category: 'weapons',
      },
    ];

    smithingRecipes.forEach(recipe => {
      this.smithingRecipes.set(recipe.id, recipe);
    });

    logger.info(`[SmithingSystem] Loaded ${smeltingRecipes.length} smelting recipes and ${smithingRecipes.length} smithing recipes`);
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
  private handleStartSmelting(event: any): void {
    const { playerId, recipeId, furnaceId, quantity } = event;
    this.startSmelting(playerId, recipeId, furnaceId, quantity || 1);
  }

  private handleStartSmithing(event: any): void {
    const { playerId, recipeId, anvilId, quantity } = event;
    this.startSmithing(playerId, recipeId, anvilId, quantity || 1);
  }

  private handleStopSmithing(event: any): void {
    const { playerId } = event;
    this.stopSmithing(playerId);
  }

  private handleSmeltOre(event: any): void {
    const { playerId, barType } = event;
    // Find nearest available furnace
    for (const [furnaceId, furnace] of this.furnaces.entries()) {
      if (!furnace.inUse) {
        this.startSmelting(playerId, `${barType}_bar`, furnaceId, 1);
        break;
      }
    }
  }

  private handleSmithItem(event: any): void {
    const { playerId, itemType } = event;
    // Find nearest available anvil
    for (const [anvilId, anvil] of this.anvils.entries()) {
      if (!anvil.inUse) {
        this.startSmithing(playerId, itemType, anvilId, 1);
        break;
      }
    }
  }

  // Public API
  getSmeltingRecipes(): Map<string, SmeltingRecipe> {
    return new Map(this.smeltingRecipes);
  }

  getSmithingRecipes(): Map<string, SmithingRecipe> {
    return new Map(this.smithingRecipes);
  }

  getFurnaces(): Map<string, FurnaceInstance> {
    return new Map(this.furnaces);
  }

  getAnvils(): Map<string, AnvilInstance> {
    return new Map(this.anvils);
  }

  getActiveActions(): Map<string, ProductionAction> {
    return new Map(this.activeActions);
  }

  isPlayerSmithing(playerId: string): boolean {
    return this.activeActions.has(playerId);
  }

  // Validation methods for actions
  canSmeltBar(playerId: string, barType: string): { canSmelt: boolean, reason?: string } {
    const recipe = this.smeltingRecipes.get(`${barType}_bar`);
    if (!recipe) {
      return { canSmelt: false, reason: `Unknown bar type: ${barType}` };
    }

    const stats = this.getPlayerStats(playerId);
    if (!stats || stats.smithing.level < recipe.level) {
      return { canSmelt: false, reason: `Need smithing level ${recipe.level}` };
    }

    if (!this.playerHasIngredients(playerId, recipe.ingredients, 1)) {
      return { canSmelt: false, reason: 'Missing required ores' };
    }

    const availableFurnace = Array.from(this.furnaces.values()).find(f => !f.inUse);
    if (!availableFurnace) {
      return { canSmelt: false, reason: 'No available furnaces' };
    }

    return { canSmelt: true };
  }

  canSmithItem(playerId: string, itemType: string): { canSmith: boolean, reason?: string } {
    const recipe = this.smithingRecipes.get(itemType);
    if (!recipe) {
      return { canSmith: false, reason: `Unknown item type: ${itemType}` };
    }

    const stats = this.getPlayerStats(playerId);
    if (!stats || stats.smithing.level < recipe.level) {
      return { canSmith: false, reason: `Need smithing level ${recipe.level}` };
    }

    if (!this.playerHasIngredients(playerId, recipe.ingredients, 1)) {
      return { canSmith: false, reason: 'Missing required bars' };
    }

    if (!this.playerHasHammer(playerId)) {
      return { canSmith: false, reason: 'Need a hammer' };
    }

    const availableAnvil = Array.from(this.anvils.values()).find(a => !a.inUse);
    if (!availableAnvil) {
      return { canSmith: false, reason: 'No available anvils' };
    }

    return { canSmith: true };
  }
}

interface FurnaceInstance {
  id: string;
  position: { x: number; y: number; z: number };
  inUse: boolean;
  userId: string | null;
  model: string;
}

interface AnvilInstance {
  id: string;
  position: { x: number; y: number; z: number };
  inUse: boolean;
  userId: string | null;
  model: string;
}