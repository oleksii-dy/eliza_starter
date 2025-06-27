/**
 * RuneScape Cooking System Implementation
 * =====================================
 * Handles food preparation, burn mechanics, and cooking methods
 */

import { logger } from '@elizaos/core';
import type { HyperfySystem, HyperfyWorld, HyperfyEntity } from '../../types/hyperfy';
import type { StatsComponent } from '../types/stats';
import type { InventoryComponent } from '../types/inventory';
import type {
  CookingRecipe,
  ProductionAction,
  ProductionStation
} from '../types/production';
import { PRODUCTION_CONSTANTS } from '../types/production';

export class CookingSystem implements HyperfySystem {
  name = 'CookingSystem';
  world: HyperfyWorld;
  enabled = true;

  // Cooking data
  private cookingRecipes: Map<string, CookingRecipe> = new Map();
  private activeActions: Map<string, ProductionAction> = new Map();
  private ranges: Map<string, CookingStationInstance> = new Map();
  private fires: Map<string, CookingStationInstance> = new Map();

  // Tick tracking
  private tickCounter = 0;
  private lastTickTime = 0;

  constructor(world: HyperfyWorld) {
    this.world = world;
    this.initializeCookingData();
    logger.info('[CookingSystem] Initialized RuneScape cooking mechanics');
  }

  async init(): Promise<void> {
    logger.info('[CookingSystem] Starting cooking system...');
    
    // Subscribe to cooking events
    this.world.events.on('rpg:start_cooking', this.handleStartCooking.bind(this));
    this.world.events.on('rpg:stop_cooking', this.handleStopCooking.bind(this));
    this.world.events.on('rpg:cook_food', this.handleCookFood.bind(this));
    this.world.events.on('rpg:light_fire', this.handleLightFire.bind(this));
    
    // Create cooking stations in the world
    this.spawnCookingStations();
  }

  tick(delta: number): void {
    const now = Date.now();
    
    // Process cooking ticks (every 600ms like RuneScape)
    if (now - this.lastTickTime >= 600) {
      this.processCookingTick();
      this.lastTickTime = now;
      this.tickCounter++;
    }
    
    // Update cooking actions
    this.updateCookingActions(delta);
  }

  destroy(): void {
    this.world.events.off('rpg:start_cooking');
    this.world.events.off('rpg:stop_cooking');
    this.world.events.off('rpg:cook_food');
    this.world.events.off('rpg:light_fire');
    logger.info('[CookingSystem] Cooking system destroyed');
  }

  /**
   * Start cooking food
   */
  startCooking(playerId: string, recipeId: string, stationId: string, stationType: 'range' | 'fire', quantity: number = 1): boolean {
    const player = this.world.entities.players.get(playerId);
    if (!player) {
      logger.warn(`[CookingSystem] Player ${playerId} not found`);
      return false;
    }

    const recipe = this.cookingRecipes.get(recipeId);
    if (!recipe) {
      logger.warn(`[CookingSystem] Cooking recipe ${recipeId} not found`);
      return false;
    }

    if (!recipe.methods.includes(stationType)) {
      logger.info(`[CookingSystem] Recipe ${recipeId} cannot be cooked on ${stationType}`);
      return false;
    }

    const station = stationType === 'range' ? this.ranges.get(stationId) : this.fires.get(stationId);
    if (!station) {
      logger.warn(`[CookingSystem] ${stationType} ${stationId} not found`);
      return false;
    }

    if (station.inUse) {
      logger.info(`[CookingSystem] ${stationType} ${stationId} is already in use`);
      return false;
    }

    // Check cooking level requirement
    const stats = this.getPlayerStats(playerId);
    if (!stats || stats.cooking.level < recipe.level) {
      logger.info(`[CookingSystem] Player ${playerId} needs cooking level ${recipe.level}`);
      return false;
    }

    // Check if player has raw food
    if (!this.playerHasRawFood(playerId, recipe.rawItem, quantity)) {
      logger.info(`[CookingSystem] Player ${playerId} missing raw food for ${recipe.name}`);
      return false;
    }

    // Check if player already cooking
    if (this.activeActions.has(playerId)) {
      this.stopCooking(playerId);
    }

    // Calculate cooking duration
    const baseDuration = this.calculateCookingDuration(recipe, quantity);
    
    // Create cooking action
    const action: ProductionAction = {
      playerId,
      skill: 'cooking',
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

    // Consume raw food
    this.consumeRawFood(playerId, recipe.rawItem, quantity);

    logger.info(`[CookingSystem] ${playerId} started cooking ${recipe.name} x${quantity} on ${stationType} (${(baseDuration/1000).toFixed(1)}s)`);

    // Emit cooking started event
    this.world.events.emit('rpg:cooking_started', {
      playerId,
      recipeId,
      stationId,
      stationType,
      quantity,
    });

    return true;
  }

  /**
   * Stop cooking
   */
  stopCooking(playerId: string): boolean {
    const action = this.activeActions.get(playerId);
    if (!action) {
      return false;
    }

    // Free up the station
    const range = this.ranges.get(action.stationId);
    const fire = this.fires.get(action.stationId);
    
    if (range) {
      range.inUse = false;
      range.userId = null;
    }
    
    if (fire) {
      fire.inUse = false;
      fire.userId = null;
    }

    // Remove from active actions
    this.activeActions.delete(playerId);

    logger.info(`[CookingSystem] ${playerId} stopped cooking`);

    // Emit cooking stopped event
    this.world.events.emit('rpg:cooking_stopped', {
      playerId,
      totalXP: action.xpGained,
      totalItems: action.itemsProduced.length,
    });

    return true;
  }

  /**
   * Process a cooking production cycle
   */
  private processCookingProduction(action: ProductionAction): void {
    const recipe = this.cookingRecipes.get(action.recipeId);
    
    if (!recipe) {
      this.stopCooking(action.playerId);
      return;
    }

    if (action.completed >= action.quantity) {
      this.stopCooking(action.playerId);
      return;
    }

    // Calculate burn chance
    const burnChance = this.calculateBurnChance(action.playerId, recipe);
    const isBurnt = Math.random() < burnChance;

    let producedItemId: number;
    let xpGained: number;

    if (isBurnt) {
      // Food is burnt
      producedItemId = recipe.burntItem;
      xpGained = 0; // No XP for burnt food
      
      logger.info(`[CookingSystem] ${action.playerId} burnt ${recipe.name} (${(burnChance * 100).toFixed(1)}% chance)`);
    } else {
      // Food cooked successfully
      producedItemId = recipe.cookedItem;
      xpGained = recipe.xp;
      
      // Grant XP
      this.grantCookingXP(action.playerId, xpGained);
      action.xpGained += xpGained;
      
      logger.info(`[CookingSystem] ${action.playerId} successfully cooked ${recipe.name}`);
    }

    // Produce the item
    this.produceFood(action.playerId, producedItemId, 1);
    
    // Track items produced
    action.itemsProduced.push({ itemId: producedItemId, quantity: 1 });
    action.completed++;

    // Emit production event
    this.world.events.emit('rpg:cooking_result', {
      playerId: action.playerId,
      recipeId: recipe.id,
      itemId: producedItemId,
      xpGained,
      burnt: isBurnt,
      burnChance: burnChance * 100,
      completed: action.completed,
      total: action.quantity,
    });

    action.lastProduction = Date.now();

    // Check if all items completed
    if (action.completed >= action.quantity) {
      this.stopCooking(action.playerId);
    }
  }

  /**
   * Calculate burn chance based on player level and recipe
   */
  private calculateBurnChance(playerId: string, recipe: CookingRecipe): number {
    const stats = this.getPlayerStats(playerId);
    if (!stats) return PRODUCTION_CONSTANTS.MAX_BURN_CHANCE;

    const playerLevel = stats.cooking.level;
    const recipeLevel = recipe.level;
    const burnLevel = recipe.burnLevel;

    // Base burn chance decreases as player level increases past recipe requirement
    let burnChance = PRODUCTION_CONSTANTS.MAX_BURN_CHANCE;

    if (playerLevel >= burnLevel) {
      // At burn level, burn chance drops significantly
      burnChance = PRODUCTION_CONSTANTS.MIN_BURN_CHANCE;
    } else if (playerLevel > recipeLevel) {
      // Reduce burn chance by 2% per level above requirement
      const levelDifference = playerLevel - recipeLevel;
      burnChance = Math.max(
        PRODUCTION_CONSTANTS.MIN_BURN_CHANCE,
        PRODUCTION_CONSTANTS.MAX_BURN_CHANCE - (levelDifference * PRODUCTION_CONSTANTS.BURN_REDUCTION_PER_LEVEL)
      );
    }

    return Math.min(PRODUCTION_CONSTANTS.MAX_BURN_CHANCE, Math.max(PRODUCTION_CONSTANTS.MIN_BURN_CHANCE, burnChance));
  }

  /**
   * Calculate cooking duration
   */
  private calculateCookingDuration(recipe: CookingRecipe, quantity: number): number {
    const baseTime = PRODUCTION_CONSTANTS.BASE_COOKING_TIME;
    const totalDuration = baseTime * quantity;
    return Math.max(1000, totalDuration);
  }

  /**
   * Check if player has raw food
   */
  private playerHasRawFood(playerId: string, rawItemId: number, quantity: number): boolean {
    const inventory = this.getPlayerInventory(playerId);
    if (!inventory) return false;

    const available = this.getItemQuantity(inventory, rawItemId);
    return available >= quantity;
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
   * Consume raw food from inventory
   */
  private consumeRawFood(playerId: string, rawItemId: number, quantity: number): void {
    this.world.events.emit('rpg:remove_item', {
      playerId,
      itemId: rawItemId,
      quantity,
    });
  }

  /**
   * Produce cooked food and add to inventory
   */
  private produceFood(playerId: string, itemId: number, quantity: number): void {
    this.world.events.emit('rpg:add_item', {
      playerId,
      itemId,
      quantity,
      noted: false,
    });
  }

  /**
   * Grant cooking XP
   */
  private grantCookingXP(playerId: string, amount: number): void {
    this.world.events.emit('rpg:xp_gain', {
      playerId,
      skill: 'cooking',
      amount,
      source: 'cooking',
    });
  }

  /**
   * Update active cooking actions
   */
  private updateCookingActions(delta: number): void {
    const now = Date.now();
    
    for (const action of this.activeActions.values()) {
      // Check if it's time for next production
      const timePerItem = action.duration / action.quantity;
      const timeSinceStart = now - action.startTime;
      const expectedCompleted = Math.floor(timeSinceStart / timePerItem);
      
      if (expectedCompleted > action.completed && action.completed < action.quantity) {
        this.processCookingProduction(action);
      }
    }
  }

  /**
   * Process cooking tick
   */
  private processCookingTick(): void {
    // Handle any tick-based cooking mechanics
    // Could be used for fire fuel consumption, etc.
  }

  /**
   * Create cooking stations in the world
   */
  private spawnCookingStations(): void {
    // Create ranges
    const rangeLocations = [
      { id: 'range_1', position: { x: 110, y: 0, z: 0 } },
      { id: 'range_2', position: { x: 115, y: 0, z: 5 } },
    ];

    rangeLocations.forEach(location => {
      const range: CookingStationInstance = {
        id: location.id,
        type: 'range',
        position: location.position,
        inUse: false,
        userId: null,
        model: 'range_model',
        fuelLevel: 100, // Ranges don't need fuel but keep for consistency
      };
      
      this.ranges.set(location.id, range);
    });

    // Create fires
    const fireLocations = [
      { id: 'fire_1', position: { x: 120, y: 0, z: 0 } },
      { id: 'fire_2', position: { x: 125, y: 0, z: 5 } },
    ];

    fireLocations.forEach(location => {
      const fire: CookingStationInstance = {
        id: location.id,
        type: 'fire',
        position: location.position,
        inUse: false,
        userId: null,
        model: 'fire_model',
        fuelLevel: 100, // Fires could burn out over time
      };
      
      this.fires.set(location.id, fire);
    });

    logger.info(`[CookingSystem] Spawned ${rangeLocations.length} ranges and ${fireLocations.length} fires`);
  }

  /**
   * Initialize cooking data
   */
  private initializeCookingData(): void {
    // Initialize cooking recipes
    const cookingRecipes: CookingRecipe[] = [
      {
        id: 'shrimps',
        name: 'Shrimps',
        level: 1,
        xp: 30,
        rawItem: 317, // Raw shrimps
        cookedItem: 315, // Shrimps
        burntItem: 7954, // Burnt shrimps
        burnLevel: 34, // Level where burn chance becomes minimal
        healAmount: 3,
        methods: ['fire', 'range'],
      },
      {
        id: 'sardine',
        name: 'Sardine',
        level: 1,
        xp: 40,
        rawItem: 327, // Raw sardine
        cookedItem: 325, // Sardine
        burntItem: 369, // Burnt fish
        burnLevel: 38,
        healAmount: 4,
        methods: ['fire', 'range'],
      },
      {
        id: 'herring',
        name: 'Herring',
        level: 5,
        xp: 50,
        rawItem: 345, // Raw herring
        cookedItem: 347, // Herring
        burntItem: 357, // Burnt fish
        burnLevel: 41,
        healAmount: 5,
        methods: ['fire', 'range'],
      },
      {
        id: 'anchovies',
        name: 'Anchovies',
        level: 1,
        xp: 30,
        rawItem: 321, // Raw anchovies
        cookedItem: 319, // Anchovies
        burntItem: 323, // Burnt fish
        burnLevel: 34,
        healAmount: 1,
        methods: ['fire', 'range'],
      },
      {
        id: 'mackerel',
        name: 'Mackerel',
        level: 10,
        xp: 60,
        rawItem: 353, // Raw mackerel
        cookedItem: 355, // Mackerel
        burntItem: 357, // Burnt fish
        burnLevel: 45,
        healAmount: 6,
        methods: ['fire', 'range'],
      },
      {
        id: 'trout',
        name: 'Trout',
        level: 15,
        xp: 70,
        rawItem: 335, // Raw trout
        cookedItem: 333, // Trout
        burntItem: 343, // Burnt fish
        burnLevel: 50,
        healAmount: 7,
        methods: ['fire', 'range'],
      },
      {
        id: 'cod',
        name: 'Cod',
        level: 18,
        xp: 75,
        rawItem: 341, // Raw cod
        cookedItem: 339, // Cod
        burntItem: 343, // Burnt fish
        burnLevel: 52,
        healAmount: 7,
        methods: ['fire', 'range'],
      },
      {
        id: 'pike',
        name: 'Pike',
        level: 20,
        xp: 80,
        rawItem: 349, // Raw pike
        cookedItem: 351, // Pike
        burntItem: 343, // Burnt fish
        burnLevel: 54,
        healAmount: 8,
        methods: ['fire', 'range'],
      },
      {
        id: 'salmon',
        name: 'Salmon',
        level: 25,
        xp: 90,
        rawItem: 331, // Raw salmon
        cookedItem: 329, // Salmon
        burntItem: 343, // Burnt fish
        burnLevel: 58,
        healAmount: 9,
        methods: ['fire', 'range'],
      },
      {
        id: 'tuna',
        name: 'Tuna',
        level: 30,
        xp: 100,
        rawItem: 359, // Raw tuna
        cookedItem: 361, // Tuna
        burntItem: 367, // Burnt fish
        burnLevel: 63,
        healAmount: 10,
        methods: ['fire', 'range'],
      },
      {
        id: 'lobster',
        name: 'Lobster',
        level: 40,
        xp: 120,
        rawItem: 377, // Raw lobster
        cookedItem: 379, // Lobster
        burntItem: 381, // Burnt lobster
        burnLevel: 74,
        healAmount: 12,
        methods: ['fire', 'range'],
      },
      {
        id: 'bass',
        name: 'Bass',
        level: 43,
        xp: 116,
        rawItem: 363, // Raw bass
        cookedItem: 365, // Bass
        burntItem: 367, // Burnt fish
        burnLevel: 76,
        healAmount: 13,
        methods: ['fire', 'range'],
      },
      {
        id: 'swordfish',
        name: 'Swordfish',
        level: 45,
        xp: 140,
        rawItem: 371, // Raw swordfish
        cookedItem: 373, // Swordfish
        burntItem: 375, // Burnt swordfish
        burnLevel: 81,
        healAmount: 14,
        methods: ['fire', 'range'],
      },
      {
        id: 'monkfish',
        name: 'Monkfish',
        level: 62,
        xp: 150,
        rawItem: 7944, // Raw monkfish
        cookedItem: 7946, // Monkfish
        burntItem: 7948, // Burnt monkfish
        burnLevel: 92,
        healAmount: 16,
        methods: ['fire', 'range'],
      },
      {
        id: 'shark',
        name: 'Shark',
        level: 80,
        xp: 210,
        rawItem: 383, // Raw shark
        cookedItem: 385, // Shark
        burntItem: 387, // Burnt shark
        burnLevel: 99, // Never stops burning completely
        healAmount: 20,
        methods: ['fire', 'range'],
      },
    ];

    cookingRecipes.forEach(recipe => {
      this.cookingRecipes.set(recipe.id, recipe);
    });

    logger.info(`[CookingSystem] Loaded ${cookingRecipes.length} cooking recipes`);
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
  private handleStartCooking(event: any): void {
    const { playerId, recipeId, stationId, stationType, quantity } = event;
    this.startCooking(playerId, recipeId, stationId, stationType, quantity || 1);
  }

  private handleStopCooking(event: any): void {
    const { playerId } = event;
    this.stopCooking(playerId);
  }

  private handleCookFood(event: any): void {
    const { playerId, foodType, method } = event;
    // Find nearest available station of the specified method
    const stations = method === 'range' ? this.ranges : this.fires;
    for (const [stationId, station] of stations.entries()) {
      if (!station.inUse) {
        this.startCooking(playerId, foodType, stationId, method, 1);
        break;
      }
    }
  }

  private handleLightFire(event: any): void {
    const { playerId, position } = event;
    // Create temporary fire (could be implemented for fire-making skill)
    logger.info(`[CookingSystem] ${playerId} lit a fire at position ${JSON.stringify(position)}`);
  }

  // Public API
  getCookingRecipes(): Map<string, CookingRecipe> {
    return new Map(this.cookingRecipes);
  }

  getRanges(): Map<string, CookingStationInstance> {
    return new Map(this.ranges);
  }

  getFires(): Map<string, CookingStationInstance> {
    return new Map(this.fires);
  }

  getActiveActions(): Map<string, ProductionAction> {
    return new Map(this.activeActions);
  }

  isPlayerCooking(playerId: string): boolean {
    return this.activeActions.has(playerId);
  }

  // Validation methods for actions
  canCookFood(playerId: string, recipeId: string, method: 'fire' | 'range'): { canCook: boolean, reason?: string } {
    const recipe = this.cookingRecipes.get(recipeId);
    if (!recipe) {
      return { canCook: false, reason: `Unknown recipe: ${recipeId}` };
    }

    if (!recipe.methods.includes(method)) {
      return { canCook: false, reason: `Cannot cook ${recipe.name} on ${method}` };
    }

    const stats = this.getPlayerStats(playerId);
    if (!stats || stats.cooking.level < recipe.level) {
      return { canCook: false, reason: `Need cooking level ${recipe.level}` };
    }

    if (!this.playerHasRawFood(playerId, recipe.rawItem, 1)) {
      return { canCook: false, reason: 'Missing raw food' };
    }

    const stations = method === 'range' ? this.ranges : this.fires;
    const availableStation = Array.from(stations.values()).find(s => !s.inUse);
    if (!availableStation) {
      return { canCook: false, reason: `No available ${method}s` };
    }

    return { canCook: true };
  }

  getBurnChance(playerId: string, recipeId: string): number {
    const recipe = this.cookingRecipes.get(recipeId);
    if (!recipe) return 100;

    return this.calculateBurnChance(playerId, recipe) * 100;
  }

  getFoodHealAmount(cookedItemId: number): number {
    for (const recipe of this.cookingRecipes.values()) {
      if (recipe.cookedItem === cookedItemId) {
        return recipe.healAmount;
      }
    }
    return 0;
  }
}

interface CookingStationInstance {
  id: string;
  type: 'range' | 'fire';
  position: { x: number; y: number; z: number };
  inUse: boolean;
  userId: string | null;
  model: string;
  fuelLevel?: number; // For fires that can burn out
}