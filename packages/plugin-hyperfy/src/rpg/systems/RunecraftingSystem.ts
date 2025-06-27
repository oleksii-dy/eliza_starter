/**
 * RuneScape Runecrafting System Implementation
 * ==========================================
 * Handles rune creation at altars, essence binding, and talisman management
 */

import { logger } from '@elizaos/core';
import type { HyperfySystem, HyperfyWorld, HyperfyEntity } from '../../types/hyperfy';
import type { StatsComponent } from '../types/stats';
import type { InventoryComponent } from '../types/inventory';
import type {
  RunecraftingRecipe,
  ProductionAction
} from '../types/production';
import { PRODUCTION_CONSTANTS } from '../types/production';

export class RunecraftingSystem implements HyperfySystem {
  name = 'RunecraftingSystem';
  world: HyperfyWorld;
  enabled = true;

  // Runecrafting data
  private runecraftingRecipes: Map<string, RunecraftingRecipe> = new Map();
  private activeActions: Map<string, ProductionAction> = new Map();

  // Altar locations for tracking travel distance/time
  private altarLocations: Map<string, { x: number, y: number, z: number }> = new Map();

  // Tick tracking
  private tickCounter = 0;
  private lastTickTime = 0;

  constructor(world: HyperfyWorld) {
    this.world = world;
    this.initializeRunecraftingData();
    logger.info('[RunecraftingSystem] Initialized RuneScape runecrafting mechanics');
  }

  async init(): Promise<void> {
    logger.info('[RunecraftingSystem] Starting runecrafting system...');
    
    // Subscribe to runecrafting events
    this.world.events.on('rpg:start_runecrafting', this.handleStartRunecrafting.bind(this));
    this.world.events.on('rpg:stop_runecrafting', this.handleStopRunecrafting.bind(this));
    this.world.events.on('rpg:craft_runes', this.handleCraftRunes.bind(this));
    this.world.events.on('rpg:enter_altar', this.handleEnterAltar.bind(this));
    this.world.events.on('rpg:exit_altar', this.handleExitAltar.bind(this));
  }

  tick(delta: number): void {
    const now = Date.now();
    
    // Process runecrafting ticks (every 600ms like RuneScape)
    if (now - this.lastTickTime >= 600) {
      this.processRunecraftingTick();
      this.lastTickTime = now;
      this.tickCounter++;
    }
    
    // Update runecrafting actions
    this.updateRunecraftingActions(delta);
  }

  destroy(): void {
    this.world.events.off('rpg:start_runecrafting');
    this.world.events.off('rpg:stop_runecrafting');
    this.world.events.off('rpg:craft_runes');
    this.world.events.off('rpg:enter_altar');
    this.world.events.off('rpg:exit_altar');
    logger.info('[RunecraftingSystem] Runecrafting system destroyed');
  }

  /**
   * Start runecrafting at an altar
   */
  startRunecrafting(playerId: string, recipeId: string, quantity: number = 1): boolean {
    const player = this.world.entities.players.get(playerId);
    if (!player) {
      logger.warn(`[RunecraftingSystem] Player ${playerId} not found`);
      return false;
    }

    const recipe = this.runecraftingRecipes.get(recipeId);
    if (!recipe) {
      logger.warn(`[RunecraftingSystem] Runecrafting recipe ${recipeId} not found`);
      return false;
    }

    // Check runecrafting level requirement
    const stats = this.getPlayerStats(playerId);
    if (!stats || stats.runecrafting.level < recipe.level) {
      logger.info(`[RunecraftingSystem] Player ${playerId} needs runecrafting level ${recipe.level}`);
      return false;
    }

    // Check if player has required essence
    if (!this.playerHasEssence(playerId, recipe.essenceType, quantity)) {
      logger.info(`[RunecraftingSystem] Player ${playerId} missing essence for ${recipe.name}`);
      return false;
    }

    // Check if player has required talisman (if any)
    if (recipe.requiredTalisman && !this.playerHasTalisman(playerId, recipe.requiredTalisman)) {
      logger.info(`[RunecraftingSystem] Player ${playerId} missing talisman for ${recipe.name}`);
      return false;
    }

    // Check if player already runecrafting
    if (this.activeActions.has(playerId)) {
      this.stopRunecrafting(playerId);
    }

    // Calculate runecrafting duration
    const baseDuration = this.calculateRunecraftingDuration(recipe, quantity);
    
    // Create runecrafting action
    const action: ProductionAction = {
      playerId,
      skill: 'runecrafting',
      recipeId,
      startTime: Date.now(),
      duration: baseDuration,
      quantity,
      completed: 0,
      itemsProduced: [],
      xpGained: 0,
      lastProduction: 0,
    };

    this.activeActions.set(playerId, action);

    // Consume essence (but not talisman - it's reusable)
    this.consumeEssence(playerId, recipe.essenceType, quantity);

    logger.info(`[RunecraftingSystem] ${playerId} started crafting ${recipe.name} x${quantity} (${(baseDuration/1000).toFixed(1)}s)`);

    // Emit runecrafting started event
    this.world.events.emit('rpg:runecrafting_started', {
      playerId,
      recipeId,
      quantity,
    });

    return true;
  }

  /**
   * Stop runecrafting
   */
  stopRunecrafting(playerId: string): boolean {
    const action = this.activeActions.get(playerId);
    if (!action) {
      return false;
    }

    // Remove from active actions
    this.activeActions.delete(playerId);

    logger.info(`[RunecraftingSystem] ${playerId} stopped runecrafting`);

    // Emit runecrafting stopped event
    this.world.events.emit('rpg:runecrafting_stopped', {
      playerId,
      totalXP: action.xpGained,
      totalItems: action.itemsProduced.length,
    });

    return true;
  }

  /**
   * Process a runecrafting production cycle
   */
  private processRunecraftingProduction(action: ProductionAction): void {
    const recipe = this.runecraftingRecipes.get(action.recipeId);
    
    if (!recipe) {
      this.stopRunecrafting(action.playerId);
      return;
    }

    if (action.completed >= action.quantity) {
      this.stopRunecrafting(action.playerId);
      return;
    }

    // Calculate success chance (runecrafting is always successful)
    const successChance = 1.0; // Always succeed
    const isSuccess = true;

    let producedItemId: number;
    let xpGained: number;
    let quantityProduced: number;

    // Calculate quantity multiplier based on level
    const stats = this.getPlayerStats(action.playerId);
    const playerLevel = stats ? stats.runecrafting.level : 1;
    quantityProduced = this.calculateRuneQuantity(playerLevel, recipe);

    producedItemId = recipe.outputItem;
    xpGained = recipe.xp;
    
    // Grant XP
    this.grantRunecraftingXP(action.playerId, xpGained);
    action.xpGained += xpGained;
    
    logger.info(`[RunecraftingSystem] ${action.playerId} successfully crafted ${quantityProduced} ${recipe.name}`);

    // Produce the runes
    this.produceRunes(action.playerId, producedItemId, quantityProduced);
    action.itemsProduced.push({ itemId: producedItemId, quantity: quantityProduced });
    action.completed++;

    // Emit production event
    this.world.events.emit('rpg:runecrafting_result', {
      playerId: action.playerId,
      recipeId: recipe.id,
      itemId: producedItemId,
      quantity: quantityProduced,
      xpGained,
      success: isSuccess,
      completed: action.completed,
      total: action.quantity,
    });

    action.lastProduction = Date.now();

    // Check if all items completed
    if (action.completed >= action.quantity) {
      this.stopRunecrafting(action.playerId);
    }
  }

  /**
   * Calculate how many runes are produced based on level
   */
  private calculateRuneQuantity(playerLevel: number, recipe: RunecraftingRecipe): number {
    let quantity = 1;
    
    // Multiple runes at higher levels (like in RuneScape)
    if (recipe.multipleRuneLevels) {
      for (const [level, mult] of recipe.multipleRuneLevels) {
        if (playerLevel >= level) {
          quantity = mult;
        }
      }
    }
    
    return quantity;
  }

  /**
   * Calculate runecrafting duration
   */
  private calculateRunecraftingDuration(recipe: RunecraftingRecipe, quantity: number): number {
    const baseTime = PRODUCTION_CONSTANTS.BASE_RUNECRAFTING_TIME || 2000; // 2 seconds
    const totalDuration = baseTime * quantity;
    return Math.max(1000, totalDuration);
  }

  /**
   * Check if player has essence
   */
  private playerHasEssence(playerId: string, essenceType: string, quantity: number): boolean {
    const essenceIds: Record<string, number> = {
      'pure': 7936, // Pure essence
      'rune': 1436, // Rune essence
    };
    
    const essenceId = essenceIds[essenceType];
    if (!essenceId) return false;
    
    return this.playerHasItem(playerId, essenceId, quantity);
  }

  /**
   * Check if player has talisman
   */
  private playerHasTalisman(playerId: string, talismanId: number): boolean {
    return this.playerHasItem(playerId, talismanId, 1);
  }

  /**
   * Check if player has specific item
   */
  private playerHasItem(playerId: string, itemId: number, quantity: number): boolean {
    const inventory = this.getPlayerInventory(playerId);
    if (!inventory) return false;

    const available = this.getItemQuantity(inventory, itemId);
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
   * Consume essence from inventory
   */
  private consumeEssence(playerId: string, essenceType: string, quantity: number): void {
    const essenceIds: Record<string, number> = {
      'pure': 7936, // Pure essence
      'rune': 1436, // Rune essence
    };
    
    const essenceId = essenceIds[essenceType];
    if (essenceId) {
      this.world.events.emit('rpg:remove_item', {
        playerId,
        itemId: essenceId,
        quantity,
      });
    }
  }

  /**
   * Produce runes and add to inventory
   */
  private produceRunes(playerId: string, runeId: number, quantity: number): void {
    this.world.events.emit('rpg:add_item', {
      playerId,
      itemId: runeId,
      quantity,
      noted: false,
    });
  }

  /**
   * Grant runecrafting XP
   */
  private grantRunecraftingXP(playerId: string, amount: number): void {
    this.world.events.emit('rpg:xp_gain', {
      playerId,
      skill: 'runecrafting',
      amount,
      source: 'runecrafting',
    });
  }

  /**
   * Update active runecrafting actions
   */
  private updateRunecraftingActions(delta: number): void {
    const now = Date.now();
    
    for (const action of this.activeActions.values()) {
      // Check if it's time for next production
      const timePerItem = action.duration / action.quantity;
      const timeSinceStart = now - action.startTime;
      const expectedCompleted = Math.floor(timeSinceStart / timePerItem);
      
      if (expectedCompleted > action.completed && action.completed < action.quantity) {
        this.processRunecraftingProduction(action);
      }
    }
  }

  /**
   * Process runecrafting tick
   */
  private processRunecraftingTick(): void {
    // Handle any tick-based runecrafting mechanics
  }

  /**
   * Initialize runecrafting data
   */
  private initializeRunecraftingData(): void {
    // Initialize runecrafting recipes
    const runecraftingRecipes: RunecraftingRecipe[] = [
      // Air runes
      {
        id: 'air_runes',
        name: 'Air runes',
        level: 1,
        xp: 5,
        essenceType: 'rune',
        outputItem: 556, // Air rune
        requiredTalisman: 1438, // Air talisman
        altarId: 'air_altar',
        multipleRuneLevels: [
          [11, 2], [22, 3], [33, 4], [44, 5], [55, 6], [66, 7], [77, 8], [88, 9], [99, 10]
        ],
      },
      
      // Mind runes
      {
        id: 'mind_runes',
        name: 'Mind runes',
        level: 2,
        xp: 5.5,
        essenceType: 'rune',
        outputItem: 558, // Mind rune
        requiredTalisman: 1448, // Mind talisman
        altarId: 'mind_altar',
        multipleRuneLevels: [
          [14, 2], [28, 3], [42, 4], [56, 5], [70, 6], [84, 7], [98, 8]
        ],
      },
      
      // Water runes
      {
        id: 'water_runes',
        name: 'Water runes',
        level: 5,
        xp: 6,
        essenceType: 'rune',
        outputItem: 555, // Water rune
        requiredTalisman: 1444, // Water talisman
        altarId: 'water_altar',
        multipleRuneLevels: [
          [19, 2], [38, 3], [57, 4], [76, 5], [95, 6]
        ],
      },
      
      // Earth runes
      {
        id: 'earth_runes',
        name: 'Earth runes',
        level: 9,
        xp: 6.5,
        essenceType: 'rune',
        outputItem: 557, // Earth rune
        requiredTalisman: 1440, // Earth talisman
        altarId: 'earth_altar',
        multipleRuneLevels: [
          [26, 2], [52, 3], [78, 4]
        ],
      },
      
      // Fire runes
      {
        id: 'fire_runes',
        name: 'Fire runes',
        level: 14,
        xp: 7,
        essenceType: 'rune',
        outputItem: 554, // Fire rune
        requiredTalisman: 1442, // Fire talisman
        altarId: 'fire_altar',
        multipleRuneLevels: [
          [35, 2], [70, 3]
        ],
      },
      
      // Body runes
      {
        id: 'body_runes',
        name: 'Body runes',
        level: 20,
        xp: 7.5,
        essenceType: 'rune',
        outputItem: 559, // Body rune
        requiredTalisman: 1446, // Body talisman
        altarId: 'body_altar',
        multipleRuneLevels: [
          [46, 2], [92, 3]
        ],
      },
      
      // Cosmic runes (requires pure essence)
      {
        id: 'cosmic_runes',
        name: 'Cosmic runes',
        level: 27,
        xp: 8,
        essenceType: 'pure',
        outputItem: 564, // Cosmic rune
        requiredTalisman: 1454, // Cosmic talisman
        altarId: 'cosmic_altar',
        multipleRuneLevels: [
          [59, 2]
        ],
      },
      
      // Chaos runes (requires pure essence)
      {
        id: 'chaos_runes',
        name: 'Chaos runes',
        level: 35,
        xp: 8.5,
        essenceType: 'pure',
        outputItem: 562, // Chaos rune
        requiredTalisman: 1452, // Chaos talisman
        altarId: 'chaos_altar',
        multipleRuneLevels: [
          [74, 2]
        ],
      },
      
      // Nature runes (requires pure essence)
      {
        id: 'nature_runes',
        name: 'Nature runes',
        level: 44,
        xp: 9,
        essenceType: 'pure',
        outputItem: 561, // Nature rune
        requiredTalisman: 1462, // Nature talisman
        altarId: 'nature_altar',
        multipleRuneLevels: [
          [91, 2]
        ],
      },
      
      // Law runes (requires pure essence)
      {
        id: 'law_runes',
        name: 'Law runes',
        level: 54,
        xp: 9.5,
        essenceType: 'pure',
        outputItem: 563, // Law rune
        requiredTalisman: 1458, // Law talisman
        altarId: 'law_altar',
        multipleRuneLevels: [], // Always 1 law rune
      },
      
      // Death runes (requires pure essence)
      {
        id: 'death_runes',
        name: 'Death runes',
        level: 65,
        xp: 10,
        essenceType: 'pure',
        outputItem: 560, // Death rune
        requiredTalisman: 1456, // Death talisman
        altarId: 'death_altar',
        multipleRuneLevels: [], // Always 1 death rune
      },
      
      // Blood runes (requires pure essence, special altar mechanics)
      {
        id: 'blood_runes',
        name: 'Blood runes',
        level: 77,
        xp: 23.8,
        essenceType: 'pure',
        outputItem: 565, // Blood rune
        altarId: 'blood_altar',
        multipleRuneLevels: [], // Always 1 blood rune, but different mechanics
      },
      
      // Soul runes (requires pure essence, special altar mechanics)
      {
        id: 'soul_runes',
        name: 'Soul runes',
        level: 90,
        xp: 29.7,
        essenceType: 'pure',
        outputItem: 566, // Soul rune
        altarId: 'soul_altar',
        multipleRuneLevels: [], // Always 1 soul rune, but different mechanics
      },
      
      // Wrath runes (requires pure essence, special altar mechanics)
      {
        id: 'wrath_runes',
        name: 'Wrath runes',
        level: 95,
        xp: 8,
        essenceType: 'pure',
        outputItem: 21880, // Wrath rune
        altarId: 'wrath_altar',
        multipleRuneLevels: [], // Always 1 wrath rune
      },
    ];

    runecraftingRecipes.forEach(recipe => {
      this.runecraftingRecipes.set(recipe.id, recipe);
    });

    // Initialize altar locations (for travel mechanics)
    this.initializeAltarLocations();

    logger.info(`[RunecraftingSystem] Loaded ${runecraftingRecipes.length} runecrafting recipes`);
  }

  /**
   * Initialize altar locations
   */
  private initializeAltarLocations(): void {
    this.altarLocations.set('air_altar', { x: 2841, y: 4829, z: 0 });
    this.altarLocations.set('mind_altar', { x: 2793, y: 4828, z: 0 });
    this.altarLocations.set('water_altar', { x: 2716, y: 4836, z: 0 });
    this.altarLocations.set('earth_altar', { x: 2655, y: 4830, z: 0 });
    this.altarLocations.set('fire_altar', { x: 2584, y: 4839, z: 0 });
    this.altarLocations.set('body_altar', { x: 2521, y: 4834, z: 0 });
    this.altarLocations.set('cosmic_altar', { x: 2142, y: 4833, z: 0 });
    this.altarLocations.set('chaos_altar', { x: 2281, y: 4837, z: 0 });
    this.altarLocations.set('nature_altar', { x: 2400, y: 4835, z: 0 });
    this.altarLocations.set('law_altar', { x: 2464, y: 4818, z: 0 });
    this.altarLocations.set('death_altar', { x: 2208, y: 4830, z: 0 });
    this.altarLocations.set('blood_altar', { x: 1715, y: 3827, z: 0 });
    this.altarLocations.set('soul_altar', { x: 1816, y: 3855, z: 0 });
    this.altarLocations.set('wrath_altar', { x: 2445, y: 10147, z: 0 });
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
  private handleStartRunecrafting(event: any): void {
    const { playerId, recipeId, quantity } = event;
    this.startRunecrafting(playerId, recipeId, quantity || 1);
  }

  private handleStopRunecrafting(event: any): void {
    const { playerId } = event;
    this.stopRunecrafting(playerId);
  }

  private handleCraftRunes(event: any): void {
    const { playerId, runeType } = event;
    this.startRunecrafting(playerId, runeType, 1);
  }

  private handleEnterAltar(event: any): void {
    const { playerId, altarId } = event;
    logger.info(`[RunecraftingSystem] ${playerId} entered ${altarId}`);
    
    // Emit altar entered event for location tracking
    this.world.events.emit('rpg:altar_entered', {
      playerId,
      altarId,
      location: this.altarLocations.get(altarId),
    });
  }

  private handleExitAltar(event: any): void {
    const { playerId, altarId } = event;
    logger.info(`[RunecraftingSystem] ${playerId} exited ${altarId}`);
    
    // Emit altar exited event
    this.world.events.emit('rpg:altar_exited', {
      playerId,
      altarId,
    });
  }

  // Public API
  getRunecraftingRecipes(): Map<string, RunecraftingRecipe> {
    return new Map(this.runecraftingRecipes);
  }

  getActiveActions(): Map<string, ProductionAction> {
    return new Map(this.activeActions);
  }

  isPlayerRunecrafting(playerId: string): boolean {
    return this.activeActions.has(playerId);
  }

  getAltarLocations(): Map<string, { x: number, y: number, z: number }> {
    return new Map(this.altarLocations);
  }

  // Validation methods for actions
  canCraftRunes(playerId: string, recipeId: string): { canCraft: boolean, reason?: string } {
    const recipe = this.runecraftingRecipes.get(recipeId);
    if (!recipe) {
      return { canCraft: false, reason: `Unknown recipe: ${recipeId}` };
    }

    const stats = this.getPlayerStats(playerId);
    if (!stats || stats.runecrafting.level < recipe.level) {
      return { canCraft: false, reason: `Need runecrafting level ${recipe.level}` };
    }

    if (!this.playerHasEssence(playerId, recipe.essenceType, 1)) {
      const essenceType = recipe.essenceType === 'pure' ? 'pure essence' : 'rune essence';
      return { canCraft: false, reason: `Missing ${essenceType}` };
    }

    if (recipe.requiredTalisman && !this.playerHasTalisman(playerId, recipe.requiredTalisman)) {
      return { canCraft: false, reason: 'Missing required talisman' };
    }

    return { canCraft: true };
  }

  getRecipesByEssenceType(essenceType: string): RunecraftingRecipe[] {
    return Array.from(this.runecraftingRecipes.values()).filter(recipe => recipe.essenceType === essenceType);
  }

  getRecipesByLevel(minLevel: number, maxLevel: number): RunecraftingRecipe[] {
    return Array.from(this.runecraftingRecipes.values()).filter(
      recipe => recipe.level >= minLevel && recipe.level <= maxLevel
    );
  }

  getRuneQuantityAtLevel(playerId: string, recipeId: string): number {
    const recipe = this.runecraftingRecipes.get(recipeId);
    if (!recipe) return 0;

    const stats = this.getPlayerStats(playerId);
    if (!stats) return 1;

    return this.calculateRuneQuantity(stats.runecrafting.level, recipe);
  }
}