/**
 * RuneScape Fletching System Implementation
 * ========================================
 * Handles bow making, arrow crafting, bolt creation, and dart fletching
 */

import { logger } from '@elizaos/core';
import type { HyperfySystem, HyperfyWorld, HyperfyEntity } from '../../types/hyperfy';
import type { StatsComponent } from '../types/stats';
import type { InventoryComponent } from '../types/inventory';
import type {
  FletchingRecipe,
  ProductionAction,
  ProductionStation
} from '../types/production';
import { PRODUCTION_CONSTANTS } from '../types/production';

export class FletchingSystem implements HyperfySystem {
  name = 'FletchingSystem';
  world: HyperfyWorld;
  enabled = true;

  // Fletching data
  private fletchingRecipes: Map<string, FletchingRecipe> = new Map();
  private activeActions: Map<string, ProductionAction> = new Map();

  // Tick tracking
  private tickCounter = 0;
  private lastTickTime = 0;

  constructor(world: HyperfyWorld) {
    this.world = world;
    this.initializeFletchingData();
    logger.info('[FletchingSystem] Initialized RuneScape fletching mechanics');
  }

  async init(): Promise<void> {
    logger.info('[FletchingSystem] Starting fletching system...');
    
    // Subscribe to fletching events
    this.world.events.on('rpg:start_fletching', this.handleStartFletching.bind(this));
    this.world.events.on('rpg:stop_fletching', this.handleStopFletching.bind(this));
    this.world.events.on('rpg:fletch_item', this.handleFletchItem.bind(this));
    this.world.events.on('rpg:cut_bow', this.handleCutBow.bind(this));
    this.world.events.on('rpg:string_bow', this.handleStringBow.bind(this));
    this.world.events.on('rpg:make_arrows', this.handleMakeArrows.bind(this));
  }

  tick(delta: number): void {
    const now = Date.now();
    
    // Process fletching ticks (every 600ms like RuneScape)
    if (now - this.lastTickTime >= 600) {
      this.processFletchingTick();
      this.lastTickTime = now;
      this.tickCounter++;
    }
    
    // Update fletching actions
    this.updateFletchingActions(delta);
  }

  destroy(): void {
    this.world.events.off('rpg:start_fletching');
    this.world.events.off('rpg:stop_fletching');
    this.world.events.off('rpg:fletch_item');
    this.world.events.off('rpg:cut_bow');
    this.world.events.off('rpg:string_bow');
    this.world.events.off('rpg:make_arrows');
    logger.info('[FletchingSystem] Fletching system destroyed');
  }

  /**
   * Start fletching an item
   */
  startFletching(playerId: string, recipeId: string, quantity: number = 1): boolean {
    const player = this.world.entities.players.get(playerId);
    if (!player) {
      logger.warn(`[FletchingSystem] Player ${playerId} not found`);
      return false;
    }

    const recipe = this.fletchingRecipes.get(recipeId);
    if (!recipe) {
      logger.warn(`[FletchingSystem] Fletching recipe ${recipeId} not found`);
      return false;
    }

    // Check fletching level requirement
    const stats = this.getPlayerStats(playerId);
    if (!stats || stats.fletching.level < recipe.level) {
      logger.info(`[FletchingSystem] Player ${playerId} needs fletching level ${recipe.level}`);
      return false;
    }

    // Check if player has primary material
    if (!this.playerHasPrimaryMaterial(playerId, recipe.primaryItem, quantity)) {
      logger.info(`[FletchingSystem] Player ${playerId} missing primary material for ${recipe.name}`);
      return false;
    }

    // Check if player has secondary material (if required)
    if (recipe.secondaryItem && !this.playerHasSecondaryMaterial(playerId, recipe.secondaryItem, quantity)) {
      logger.info(`[FletchingSystem] Player ${playerId} missing secondary material for ${recipe.name}`);
      return false;
    }

    // Check if player has required tools
    if (!this.playerHasTools(playerId, recipe.requiredTools)) {
      logger.info(`[FletchingSystem] Player ${playerId} missing required tools for ${recipe.name}`);
      return false;
    }

    // Check if player already fletching
    if (this.activeActions.has(playerId)) {
      this.stopFletching(playerId);
    }

    // Calculate fletching duration
    const baseDuration = this.calculateFletchingDuration(recipe, quantity);
    
    // Create fletching action
    const action: ProductionAction = {
      playerId,
      skill: 'fletching',
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

    // Consume materials
    this.consumePrimaryMaterial(playerId, recipe.primaryItem, quantity);
    if (recipe.secondaryItem) {
      this.consumeSecondaryMaterial(playerId, recipe.secondaryItem, quantity);
    }

    logger.info(`[FletchingSystem] ${playerId} started fletching ${recipe.name} x${quantity} (${(baseDuration/1000).toFixed(1)}s)`);

    // Emit fletching started event
    this.world.events.emit('rpg:fletching_started', {
      playerId,
      recipeId,
      quantity,
    });

    return true;
  }

  /**
   * Stop fletching
   */
  stopFletching(playerId: string): boolean {
    const action = this.activeActions.get(playerId);
    if (!action) {
      return false;
    }

    // Remove from active actions
    this.activeActions.delete(playerId);

    logger.info(`[FletchingSystem] ${playerId} stopped fletching`);

    // Emit fletching stopped event
    this.world.events.emit('rpg:fletching_stopped', {
      playerId,
      totalXP: action.xpGained,
      totalItems: action.itemsProduced.length,
    });

    return true;
  }

  /**
   * Process a fletching production cycle
   */
  private processFletchingProduction(action: ProductionAction): void {
    const recipe = this.fletchingRecipes.get(action.recipeId);
    
    if (!recipe) {
      this.stopFletching(action.playerId);
      return;
    }

    if (action.completed >= action.quantity) {
      this.stopFletching(action.playerId);
      return;
    }

    // Fletching rarely fails in RuneScape
    const successChance = this.calculateSuccessChance(action.playerId, recipe);
    const isSuccess = Math.random() < successChance;

    let producedItemId: number;
    let producedQuantity: number;
    let xpGained: number;

    if (isSuccess) {
      // Fletching successful
      producedItemId = recipe.outputItem;
      producedQuantity = recipe.outputQuantity;
      xpGained = recipe.xp;
      
      // Grant XP
      this.grantFletchingXP(action.playerId, xpGained);
      action.xpGained += xpGained;
      
      logger.info(`[FletchingSystem] ${action.playerId} successfully fletched ${recipe.name}`);
    } else {
      // Fletching failed (very rare)
      producedItemId = 0; // No item produced
      producedQuantity = 0;
      xpGained = Math.floor(recipe.xp * 0.1); // Small XP for attempting
      
      if (xpGained > 0) {
        this.grantFletchingXP(action.playerId, xpGained);
        action.xpGained += xpGained;
      }
      
      logger.info(`[FletchingSystem] ${action.playerId} failed to fletch ${recipe.name} (${((1-successChance) * 100).toFixed(1)}% failure chance)`);
    }

    // Produce the item if successful
    if (producedItemId > 0) {
      this.produceItem(action.playerId, producedItemId, producedQuantity);
      action.itemsProduced.push({ itemId: producedItemId, quantity: producedQuantity });
    }
    
    action.completed++;

    // Emit production event
    this.world.events.emit('rpg:fletching_result', {
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
      this.stopFletching(action.playerId);
    }
  }

  /**
   * Calculate success chance based on player level and recipe
   */
  private calculateSuccessChance(playerId: string, recipe: FletchingRecipe): number {
    const stats = this.getPlayerStats(playerId);
    if (!stats) return PRODUCTION_CONSTANTS.BASE_SUCCESS_RATE;

    const playerLevel = stats.fletching.level;
    const recipeLevel = recipe.level;

    // Base success rate (fletching is generally very reliable)
    let successChance = Math.max(PRODUCTION_CONSTANTS.BASE_SUCCESS_RATE, 0.95);

    // Increase success chance based on level difference
    if (playerLevel > recipeLevel) {
      const levelDifference = playerLevel - recipeLevel;
      successChance = Math.min(1.0, successChance + (levelDifference * PRODUCTION_CONSTANTS.LEVEL_SUCCESS_BONUS));
    }

    // Complex items (crossbow bolts, darts) have slightly lower success rates
    if (recipe.category === 'bolts' || recipe.category === 'darts') {
      successChance *= 0.98; // 2% reduction for complex fletching
    }

    return Math.max(0.9, Math.min(1.0, successChance)); // Between 90% and 100%
  }

  /**
   * Calculate fletching duration
   */
  private calculateFletchingDuration(recipe: FletchingRecipe, quantity: number): number {
    const baseTime = PRODUCTION_CONSTANTS.BASE_FLETCHING_TIME;
    
    // Different categories have different speeds
    const speedMultipliers: Record<string, number> = {
      'bows': 1.2, // Slower for bows
      'arrows': 0.8, // Faster for arrows (made in batches)
      'bolts': 1.0, // Normal speed
      'darts': 0.9, // Slightly faster
    };
    
    const multiplier = speedMultipliers[recipe.category] || 1.0;
    const totalDuration = baseTime * quantity * multiplier;
    
    return Math.max(1000, totalDuration);
  }

  /**
   * Check if player has primary material
   */
  private playerHasPrimaryMaterial(playerId: string, primaryItemId: number, quantity: number): boolean {
    const inventory = this.getPlayerInventory(playerId);
    if (!inventory) return false;

    const available = this.getItemQuantity(inventory, primaryItemId);
    return available >= quantity;
  }

  /**
   * Check if player has secondary material
   */
  private playerHasSecondaryMaterial(playerId: string, secondaryItemId: number, quantity: number): boolean {
    const inventory = this.getPlayerInventory(playerId);
    if (!inventory) return false;

    const available = this.getItemQuantity(inventory, secondaryItemId);
    return available >= quantity;
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
   * Consume primary material from inventory
   */
  private consumePrimaryMaterial(playerId: string, primaryItemId: number, quantity: number): void {
    this.world.events.emit('rpg:remove_item', {
      playerId,
      itemId: primaryItemId,
      quantity,
    });
  }

  /**
   * Consume secondary material from inventory
   */
  private consumeSecondaryMaterial(playerId: string, secondaryItemId: number, quantity: number): void {
    this.world.events.emit('rpg:remove_item', {
      playerId,
      itemId: secondaryItemId,
      quantity,
    });
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
   * Grant fletching XP
   */
  private grantFletchingXP(playerId: string, amount: number): void {
    this.world.events.emit('rpg:xp_gain', {
      playerId,
      skill: 'fletching',
      amount,
      source: 'fletching',
    });
  }

  /**
   * Update active fletching actions
   */
  private updateFletchingActions(delta: number): void {
    const now = Date.now();
    
    for (const action of this.activeActions.values()) {
      // Check if it's time for next production
      const timePerItem = action.duration / action.quantity;
      const timeSinceStart = now - action.startTime;
      const expectedCompleted = Math.floor(timeSinceStart / timePerItem);
      
      if (expectedCompleted > action.completed && action.completed < action.quantity) {
        this.processFletchingProduction(action);
      }
    }
  }

  /**
   * Process fletching tick
   */
  private processFletchingTick(): void {
    // Handle any tick-based fletching mechanics
  }

  /**
   * Initialize fletching data
   */
  private initializeFletchingData(): void {
    // Initialize fletching recipes
    const fletchingRecipes: FletchingRecipe[] = [
      // Shortbows (unstrung)
      {
        id: 'shortbow_u',
        name: 'Shortbow (u)',
        level: 5,
        xp: 5,
        primaryItem: 1511, // Logs
        outputItem: 50, // Shortbow (u)
        outputQuantity: 1,
        requiredTools: [946], // Knife
        category: 'bows',
      },
      {
        id: 'oak_shortbow_u',
        name: 'Oak shortbow (u)',
        level: 20,
        xp: 16.5,
        primaryItem: 1521, // Oak logs
        outputItem: 54, // Oak shortbow (u)
        outputQuantity: 1,
        requiredTools: [946], // Knife
        category: 'bows',
      },
      {
        id: 'willow_shortbow_u',
        name: 'Willow shortbow (u)',
        level: 35,
        xp: 33.25,
        primaryItem: 1519, // Willow logs
        outputItem: 60, // Willow shortbow (u)
        outputQuantity: 1,
        requiredTools: [946], // Knife
        category: 'bows',
      },
      {
        id: 'maple_shortbow_u',
        name: 'Maple shortbow (u)',
        level: 50,
        xp: 50,
        primaryItem: 1517, // Maple logs
        outputItem: 64, // Maple shortbow (u)
        outputQuantity: 1,
        requiredTools: [946], // Knife
        category: 'bows',
      },
      {
        id: 'yew_shortbow_u',
        name: 'Yew shortbow (u)',
        level: 65,
        xp: 67.5,
        primaryItem: 1515, // Yew logs
        outputItem: 68, // Yew shortbow (u)
        outputQuantity: 1,
        requiredTools: [946], // Knife
        category: 'bows',
      },
      {
        id: 'magic_shortbow_u',
        name: 'Magic shortbow (u)',
        level: 80,
        xp: 83.25,
        primaryItem: 1513, // Magic logs
        outputItem: 72, // Magic shortbow (u)
        outputQuantity: 1,
        requiredTools: [946], // Knife
        category: 'bows',
      },

      // Longbows (unstrung)
      {
        id: 'longbow_u',
        name: 'Longbow (u)',
        level: 10,
        xp: 10,
        primaryItem: 1511, // Logs
        outputItem: 48, // Longbow (u)
        outputQuantity: 1,
        requiredTools: [946], // Knife
        category: 'bows',
      },
      {
        id: 'oak_longbow_u',
        name: 'Oak longbow (u)',
        level: 25,
        xp: 25,
        primaryItem: 1521, // Oak logs
        outputItem: 56, // Oak longbow (u)
        outputQuantity: 1,
        requiredTools: [946], // Knife
        category: 'bows',
      },
      {
        id: 'willow_longbow_u',
        name: 'Willow longbow (u)',
        level: 40,
        xp: 41.5,
        primaryItem: 1519, // Willow logs
        outputItem: 58, // Willow longbow (u)
        outputQuantity: 1,
        requiredTools: [946], // Knife
        category: 'bows',
      },
      {
        id: 'maple_longbow_u',
        name: 'Maple longbow (u)',
        level: 55,
        xp: 58.25,
        primaryItem: 1517, // Maple logs
        outputItem: 62, // Maple longbow (u)
        outputQuantity: 1,
        requiredTools: [946], // Knife
        category: 'bows',
      },
      {
        id: 'yew_longbow_u',
        name: 'Yew longbow (u)',
        level: 70,
        xp: 75,
        primaryItem: 1515, // Yew logs
        outputItem: 66, // Yew longbow (u)
        outputQuantity: 1,
        requiredTools: [946], // Knife
        category: 'bows',
      },
      {
        id: 'magic_longbow_u',
        name: 'Magic longbow (u)',
        level: 85,
        xp: 91.5,
        primaryItem: 1513, // Magic logs
        outputItem: 70, // Magic longbow (u)
        outputQuantity: 1,
        requiredTools: [946], // Knife
        category: 'bows',
      },

      // Strung bows
      {
        id: 'shortbow',
        name: 'Shortbow',
        level: 5,
        xp: 5,
        primaryItem: 50, // Shortbow (u)
        secondaryItem: 1777, // Bow string
        outputItem: 841, // Shortbow
        outputQuantity: 1,
        requiredTools: [],
        category: 'bows',
      },
      {
        id: 'oak_shortbow',
        name: 'Oak shortbow',
        level: 20,
        xp: 16.5,
        primaryItem: 54, // Oak shortbow (u)
        secondaryItem: 1777, // Bow string
        outputItem: 843, // Oak shortbow
        outputQuantity: 1,
        requiredTools: [],
        category: 'bows',
      },
      {
        id: 'willow_shortbow',
        name: 'Willow shortbow',
        level: 35,
        xp: 33.25,
        primaryItem: 60, // Willow shortbow (u)
        secondaryItem: 1777, // Bow string
        outputItem: 849, // Willow shortbow
        outputQuantity: 1,
        requiredTools: [],
        category: 'bows',
      },

      // Arrows
      {
        id: 'headless_arrows',
        name: 'Headless arrows',
        level: 1,
        xp: 1,
        primaryItem: 52, // Arrow shaft
        secondaryItem: 314, // Feather
        outputItem: 53, // Headless arrow
        outputQuantity: 1,
        requiredTools: [],
        category: 'arrows',
      },
      {
        id: 'bronze_arrows',
        name: 'Bronze arrows',
        level: 1,
        xp: 1.3,
        primaryItem: 53, // Headless arrow
        secondaryItem: 39, // Bronze arrowheads
        outputItem: 882, // Bronze arrow
        outputQuantity: 1,
        requiredTools: [],
        category: 'arrows',
      },
      {
        id: 'iron_arrows',
        name: 'Iron arrows',
        level: 15,
        xp: 2.5,
        primaryItem: 53, // Headless arrow
        secondaryItem: 40, // Iron arrowheads
        outputItem: 884, // Iron arrow
        outputQuantity: 1,
        requiredTools: [],
        category: 'arrows',
      },
      {
        id: 'steel_arrows',
        name: 'Steel arrows',
        level: 30,
        xp: 5,
        primaryItem: 53, // Headless arrow
        secondaryItem: 41, // Steel arrowheads
        outputItem: 886, // Steel arrow
        outputQuantity: 1,
        requiredTools: [],
        category: 'arrows',
      },
      {
        id: 'mithril_arrows',
        name: 'Mithril arrows',
        level: 45,
        xp: 7.5,
        primaryItem: 53, // Headless arrow
        secondaryItem: 42, // Mithril arrowheads
        outputItem: 888, // Mithril arrow
        outputQuantity: 1,
        requiredTools: [],
        category: 'arrows',
      },
      {
        id: 'adamant_arrows',
        name: 'Adamant arrows',
        level: 60,
        xp: 10,
        primaryItem: 53, // Headless arrow
        secondaryItem: 43, // Adamant arrowheads
        outputItem: 890, // Adamant arrow
        outputQuantity: 1,
        requiredTools: [],
        category: 'arrows',
      },
      {
        id: 'rune_arrows',
        name: 'Rune arrows',
        level: 75,
        xp: 12.5,
        primaryItem: 53, // Headless arrow
        secondaryItem: 44, // Rune arrowheads
        outputItem: 892, // Rune arrow
        outputQuantity: 1,
        requiredTools: [],
        category: 'arrows',
      },

      // Crossbow bolts
      {
        id: 'bronze_bolts',
        name: 'Bronze bolts',
        level: 9,
        xp: 0.5,
        primaryItem: 9375, // Bronze bolt (unf)
        secondaryItem: 314, // Feather
        outputItem: 877, // Bronze bolts
        outputQuantity: 1,
        requiredTools: [],
        category: 'bolts',
      },
      {
        id: 'iron_bolts',
        name: 'Iron bolts',
        level: 39,
        xp: 1.5,
        primaryItem: 9377, // Iron bolt (unf)
        secondaryItem: 314, // Feather
        outputItem: 9140, // Iron bolts
        outputQuantity: 1,
        requiredTools: [],
        category: 'bolts',
      },
      {
        id: 'steel_bolts',
        name: 'Steel bolts',
        level: 46,
        xp: 3.5,
        primaryItem: 9378, // Steel bolt (unf)
        secondaryItem: 314, // Feather
        outputItem: 9141, // Steel bolts
        outputQuantity: 1,
        requiredTools: [],
        category: 'bolts',
      },

      // Darts
      {
        id: 'bronze_darts',
        name: 'Bronze darts',
        level: 10,
        xp: 1.8,
        primaryItem: 819, // Bronze dart tip
        secondaryItem: 314, // Feather
        outputItem: 806, // Bronze dart
        outputQuantity: 1,
        requiredTools: [],
        category: 'darts',
      },
      {
        id: 'iron_darts',
        name: 'Iron darts',
        level: 22,
        xp: 3.8,
        primaryItem: 820, // Iron dart tip
        secondaryItem: 314, // Feather
        outputItem: 807, // Iron dart
        outputQuantity: 1,
        requiredTools: [],
        category: 'darts',
      },
      {
        id: 'steel_darts',
        name: 'Steel darts',
        level: 37,
        xp: 7.5,
        primaryItem: 821, // Steel dart tip
        secondaryItem: 314, // Feather
        outputItem: 808, // Steel dart
        outputQuantity: 1,
        requiredTools: [],
        category: 'darts',
      },
    ];

    fletchingRecipes.forEach(recipe => {
      this.fletchingRecipes.set(recipe.id, recipe);
    });

    logger.info(`[FletchingSystem] Loaded ${fletchingRecipes.length} fletching recipes`);
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
  private handleStartFletching(event: any): void {
    const { playerId, recipeId, quantity } = event;
    this.startFletching(playerId, recipeId, quantity || 1);
  }

  private handleStopFletching(event: any): void {
    const { playerId } = event;
    this.stopFletching(playerId);
  }

  private handleFletchItem(event: any): void {
    const { playerId, itemType } = event;
    this.startFletching(playerId, itemType, 1);
  }

  private handleCutBow(event: any): void {
    const { playerId, bowType } = event;
    // Cut unstrung bow from logs
    this.startFletching(playerId, `${bowType}_u`, 1);
  }

  private handleStringBow(event: any): void {
    const { playerId, bowType } = event;
    // String a bow (unstrung → strung)
    this.startFletching(playerId, bowType, 1);
  }

  private handleMakeArrows(event: any): void {
    const { playerId, arrowType, quantity } = event;
    this.startFletching(playerId, arrowType, quantity || 10); // Arrows usually made in batches
  }

  // Public API
  getFletchingRecipes(): Map<string, FletchingRecipe> {
    return new Map(this.fletchingRecipes);
  }

  getActiveActions(): Map<string, ProductionAction> {
    return new Map(this.activeActions);
  }

  isPlayerFletching(playerId: string): boolean {
    return this.activeActions.has(playerId);
  }

  // Validation methods for actions
  canFletchItem(playerId: string, recipeId: string): { canFletch: boolean, reason?: string } {
    const recipe = this.fletchingRecipes.get(recipeId);
    if (!recipe) {
      return { canFletch: false, reason: `Unknown recipe: ${recipeId}` };
    }

    const stats = this.getPlayerStats(playerId);
    if (!stats || stats.fletching.level < recipe.level) {
      return { canFletch: false, reason: `Need fletching level ${recipe.level}` };
    }

    if (!this.playerHasPrimaryMaterial(playerId, recipe.primaryItem, 1)) {
      return { canFletch: false, reason: 'Missing primary material' };
    }

    if (recipe.secondaryItem && !this.playerHasSecondaryMaterial(playerId, recipe.secondaryItem, 1)) {
      return { canFletch: false, reason: 'Missing secondary material' };
    }

    if (recipe.requiredTools.length > 0 && !this.playerHasTools(playerId, recipe.requiredTools)) {
      return { canFletch: false, reason: 'Missing required tools' };
    }

    return { canFletch: true };
  }

  getRecipesByCategory(category: string): FletchingRecipe[] {
    return Array.from(this.fletchingRecipes.values()).filter(recipe => recipe.category === category);
  }

  getSuccessChance(playerId: string, recipeId: string): number {
    const recipe = this.fletchingRecipes.get(recipeId);
    if (!recipe) return 0;

    return this.calculateSuccessChance(playerId, recipe) * 100;
  }
}