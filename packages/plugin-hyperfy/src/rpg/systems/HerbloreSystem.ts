/**
 * RuneScape Herblore System Implementation
 * =======================================
 * Handles herb cleaning, potion making, and potion effects
 */

import { logger } from '@elizaos/core';
import type { HyperfySystem, HyperfyWorld, HyperfyEntity } from '../../types/hyperfy';
import type { StatsComponent } from '../types/stats';
import type { InventoryComponent } from '../types/inventory';
import type {
  HerbloreRecipe,
  ProductionAction,
  PotionEffect
} from '../types/production';
import { PRODUCTION_CONSTANTS } from '../types/production';

export class HerbloreSystem implements HyperfySystem {
  name = 'HerbloreSystem';
  world: HyperfyWorld;
  enabled = true;

  // Herblore data
  private herbloreRecipes: Map<string, HerbloreRecipe> = new Map();
  private activeActions: Map<string, ProductionAction> = new Map();
  private activePotionEffects: Map<string, PotionEffectInstance[]> = new Map();

  // Tick tracking
  private tickCounter = 0;
  private lastTickTime = 0;

  constructor(world: HyperfyWorld) {
    this.world = world;
    this.initializeHerbloreData();
    logger.info('[HerbloreSystem] Initialized RuneScape herblore mechanics');
  }

  async init(): Promise<void> {
    logger.info('[HerbloreSystem] Starting herblore system...');
    
    // Subscribe to herblore events
    this.world.events.on('rpg:start_herblore', this.handleStartHerblore.bind(this));
    this.world.events.on('rpg:stop_herblore', this.handleStopHerblore.bind(this));
    this.world.events.on('rpg:make_potion', this.handleMakePotion.bind(this));
    this.world.events.on('rpg:drink_potion', this.handleDrinkPotion.bind(this));
    this.world.events.on('rpg:clean_herbs', this.handleCleanHerbs.bind(this));
  }

  tick(delta: number): void {
    const now = Date.now();
    
    // Process herblore ticks (every 600ms like RuneScape)
    if (now - this.lastTickTime >= 600) {
      this.processHerbloreTick();
      this.lastTickTime = now;
      this.tickCounter++;
    }
    
    // Update herblore actions
    this.updateHerbloreActions(delta);
    
    // Update potion effects
    this.updatePotionEffects(now);
  }

  destroy(): void {
    this.world.events.off('rpg:start_herblore');
    this.world.events.off('rpg:stop_herblore');
    this.world.events.off('rpg:make_potion');
    this.world.events.off('rpg:drink_potion');
    this.world.events.off('rpg:clean_herbs');
    logger.info('[HerbloreSystem] Herblore system destroyed');
  }

  /**
   * Start making potions
   */
  startHerblore(playerId: string, recipeId: string, quantity: number = 1): boolean {
    const player = this.world.entities.players.get(playerId);
    if (!player) {
      logger.warn(`[HerbloreSystem] Player ${playerId} not found`);
      return false;
    }

    const recipe = this.herbloreRecipes.get(recipeId);
    if (!recipe) {
      logger.warn(`[HerbloreSystem] Herblore recipe ${recipeId} not found`);
      return false;
    }

    // Check herblore level requirement
    const stats = this.getPlayerStats(playerId);
    if (!stats || stats.herblore.level < recipe.level) {
      logger.info(`[HerbloreSystem] Player ${playerId} needs herblore level ${recipe.level}`);
      return false;
    }

    // Check if player has required materials
    if (!this.playerHasHerb(playerId, recipe.primaryHerb, quantity)) {
      logger.info(`[HerbloreSystem] Player ${playerId} missing primary herb for ${recipe.name}`);
      return false;
    }

    if (!this.playerHasSecondaryIngredient(playerId, recipe.secondaryIngredient, quantity)) {
      logger.info(`[HerbloreSystem] Player ${playerId} missing secondary ingredient for ${recipe.name}`);
      return false;
    }

    // Check if player has vials of water
    if (!this.playerHasVials(playerId, quantity)) {
      logger.info(`[HerbloreSystem] Player ${playerId} missing vials of water for ${recipe.name}`);
      return false;
    }

    // Check if player already making potions
    if (this.activeActions.has(playerId)) {
      this.stopHerblore(playerId);
    }

    // Calculate herblore duration
    const baseDuration = this.calculateHerbloreDuration(recipe, quantity);
    
    // Create herblore action
    const action: ProductionAction = {
      playerId,
      skill: 'herblore',
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
    this.consumeHerb(playerId, recipe.primaryHerb, quantity);
    this.consumeSecondaryIngredient(playerId, recipe.secondaryIngredient, quantity);
    this.consumeVials(playerId, quantity);

    logger.info(`[HerbloreSystem] ${playerId} started making ${recipe.name} x${quantity} (${(baseDuration/1000).toFixed(1)}s)`);

    // Emit herblore started event
    this.world.events.emit('rpg:herblore_started', {
      playerId,
      recipeId,
      quantity,
    });

    return true;
  }

  /**
   * Stop making potions
   */
  stopHerblore(playerId: string): boolean {
    const action = this.activeActions.get(playerId);
    if (!action) {
      return false;
    }

    // Remove from active actions
    this.activeActions.delete(playerId);

    logger.info(`[HerbloreSystem] ${playerId} stopped making potions`);

    // Emit herblore stopped event
    this.world.events.emit('rpg:herblore_stopped', {
      playerId,
      totalXP: action.xpGained,
      totalItems: action.itemsProduced.length,
    });

    return true;
  }

  /**
   * Drink a potion to apply effects
   */
  drinkPotion(playerId: string, potionId: number): boolean {
    const player = this.world.entities.players.get(playerId);
    if (!player) {
      logger.warn(`[HerbloreSystem] Player ${playerId} not found`);
      return false;
    }

    // Find the recipe for this potion
    const recipe = Array.from(this.herbloreRecipes.values()).find(r => r.outputItem === potionId);
    if (!recipe) {
      logger.warn(`[HerbloreSystem] No recipe found for potion ${potionId}`);
      return false;
    }

    // Check if player has the potion
    if (!this.playerHasPotion(playerId, potionId)) {
      logger.info(`[HerbloreSystem] Player ${playerId} doesn't have potion ${potionId}`);
      return false;
    }

    // Remove the potion from inventory
    this.world.events.emit('rpg:remove_item', {
      playerId,
      itemId: potionId,
      quantity: 1,
    });

    // Add empty vial back
    this.world.events.emit('rpg:add_item', {
      playerId,
      itemId: 229, // Empty vial
      quantity: 1,
      noted: false,
    });

    // Apply potion effect
    this.applyPotionEffect(playerId, recipe);

    logger.info(`[HerbloreSystem] ${playerId} drank ${recipe.name}`);

    // Emit potion consumed event
    this.world.events.emit('rpg:potion_consumed', {
      playerId,
      potionId,
      effect: recipe.effect,
      duration: recipe.duration,
    });

    return true;
  }

  /**
   * Clean grimy herbs
   */
  cleanHerbs(playerId: string, grimyHerbId: number, quantity: number = 1): boolean {
    const player = this.world.entities.players.get(playerId);
    if (!player) {
      logger.warn(`[HerbloreSystem] Player ${playerId} not found`);
      return false;
    }

    // Check if player has grimy herbs
    if (!this.playerHasItem(playerId, grimyHerbId, quantity)) {
      logger.info(`[HerbloreSystem] Player ${playerId} doesn't have enough grimy herbs`);
      return false;
    }

    // Get clean herb ID (add 1 to grimy herb ID for simplicity)
    const cleanHerbId = grimyHerbId + 1;

    // Remove grimy herbs
    this.world.events.emit('rpg:remove_item', {
      playerId,
      itemId: grimyHerbId,
      quantity,
    });

    // Add clean herbs
    this.world.events.emit('rpg:add_item', {
      playerId,
      itemId: cleanHerbId,
      quantity,
      noted: false,
    });

    // Grant small XP for cleaning herbs
    const xpPerHerb = 2.5;
    this.grantHerbloreXP(playerId, xpPerHerb * quantity);

    logger.info(`[HerbloreSystem] ${playerId} cleaned ${quantity} herbs`);

    // Emit herb cleaning event
    this.world.events.emit('rpg:herbs_cleaned', {
      playerId,
      grimyHerbId,
      cleanHerbId,
      quantity,
      xpGained: xpPerHerb * quantity,
    });

    return true;
  }

  /**
   * Process a herblore production cycle
   */
  private processHerbloreProduction(action: ProductionAction): void {
    const recipe = this.herbloreRecipes.get(action.recipeId);
    
    if (!recipe) {
      this.stopHerblore(action.playerId);
      return;
    }

    if (action.completed >= action.quantity) {
      this.stopHerblore(action.playerId);
      return;
    }

    // Calculate success chance (herblore has very high success rate)
    const successChance = this.calculateSuccessChance(action.playerId, recipe);
    const isSuccess = Math.random() < successChance;

    let producedItemId: number;
    let xpGained: number;

    if (isSuccess) {
      // Potion making successful
      producedItemId = recipe.outputItem;
      xpGained = recipe.xp;
      
      // Grant XP
      this.grantHerbloreXP(action.playerId, xpGained);
      action.xpGained += xpGained;
      
      logger.info(`[HerbloreSystem] ${action.playerId} successfully made ${recipe.name}`);
    } else {
      // Potion making failed (very rare, produces barbarian herblore)
      producedItemId = 97; // Barbarian herblore (failed potion)
      xpGained = Math.floor(recipe.xp * 0.1); // Small XP for attempting
      
      if (xpGained > 0) {
        this.grantHerbloreXP(action.playerId, xpGained);
        action.xpGained += xpGained;
      }
      
      logger.info(`[HerbloreSystem] ${action.playerId} failed to make ${recipe.name} (${((1-successChance) * 100).toFixed(1)}% failure chance)`);
    }

    // Produce the item
    this.producePotion(action.playerId, producedItemId, 1);
    action.itemsProduced.push({ itemId: producedItemId, quantity: 1 });
    action.completed++;

    // Emit production event
    this.world.events.emit('rpg:herblore_result', {
      playerId: action.playerId,
      recipeId: recipe.id,
      itemId: producedItemId,
      xpGained,
      success: isSuccess,
      successChance: successChance * 100,
      completed: action.completed,
      total: action.quantity,
    });

    action.lastProduction = Date.now();

    // Check if all items completed
    if (action.completed >= action.quantity) {
      this.stopHerblore(action.playerId);
    }
  }

  /**
   * Apply potion effect to player
   */
  private applyPotionEffect(playerId: string, recipe: HerbloreRecipe): void {
    const effect = recipe.effect;
    const duration = recipe.duration * 1000; // Convert to milliseconds
    const endTime = Date.now() + duration;

    const potionEffect: PotionEffectInstance = {
      playerId,
      effect,
      endTime,
      applied: false,
    };

    // Get existing effects for player
    const playerEffects = this.activePotionEffects.get(playerId) || [];
    
    // Remove existing effects of the same type
    const filteredEffects = playerEffects.filter(e => 
      !(e.effect.type === effect.type && e.effect.skill === effect.skill)
    );

    // Add new effect
    filteredEffects.push(potionEffect);
    this.activePotionEffects.set(playerId, filteredEffects);

    // Apply the effect immediately
    this.applyEffectToPlayer(potionEffect);
  }

  /**
   * Apply effect stats to player
   */
  private applyEffectToPlayer(potionEffect: PotionEffectInstance): void {
    if (potionEffect.applied) return;

    const effect = potionEffect.effect;
    const playerId = potionEffect.playerId;

    if (effect.type === 'boost' && effect.skill) {
      // Apply stat boost
      this.world.events.emit('rpg:stat_boost', {
        playerId,
        skill: effect.skill,
        amount: effect.amount,
        percentage: effect.percentage || false,
        duration: potionEffect.endTime - Date.now(),
      });

      logger.info(`[HerbloreSystem] Applied ${effect.skill} boost of ${effect.amount} to ${playerId}`);
    } else if (effect.type === 'restore' && effect.skill) {
      // Apply stat restoration
      this.world.events.emit('rpg:stat_restore', {
        playerId,
        skill: effect.skill,
        amount: effect.amount,
      });

      logger.info(`[HerbloreSystem] Restored ${effect.skill} by ${effect.amount} for ${playerId}`);
    }

    potionEffect.applied = true;
  }

  /**
   * Update active potion effects
   */
  private updatePotionEffects(currentTime: number): void {
    for (const [playerId, effects] of this.activePotionEffects.entries()) {
      const activeEffects = effects.filter(effect => {
        if (currentTime >= effect.endTime) {
          // Effect has expired
          this.removeEffectFromPlayer(effect);
          return false;
        }
        return true;
      });

      if (activeEffects.length === 0) {
        this.activePotionEffects.delete(playerId);
      } else {
        this.activePotionEffects.set(playerId, activeEffects);
      }
    }
  }

  /**
   * Remove effect from player
   */
  private removeEffectFromPlayer(potionEffect: PotionEffectInstance): void {
    const effect = potionEffect.effect;
    const playerId = potionEffect.playerId;

    if (effect.type === 'boost' && effect.skill) {
      // Remove stat boost
      this.world.events.emit('rpg:stat_boost_end', {
        playerId,
        skill: effect.skill,
        amount: effect.amount,
      });

      logger.info(`[HerbloreSystem] Removed ${effect.skill} boost from ${playerId}`);
    }
  }

  /**
   * Calculate success chance based on player level and recipe
   */
  private calculateSuccessChance(playerId: string, recipe: HerbloreRecipe): number {
    const stats = this.getPlayerStats(playerId);
    if (!stats) return PRODUCTION_CONSTANTS.BASE_SUCCESS_RATE;

    const playerLevel = stats.herblore.level;
    const recipeLevel = recipe.level;

    // Base success rate (herblore is generally very reliable)
    let successChance = Math.max(PRODUCTION_CONSTANTS.BASE_SUCCESS_RATE, 0.98);

    // Increase success chance based on level difference
    if (playerLevel > recipeLevel) {
      const levelDifference = playerLevel - recipeLevel;
      successChance = Math.min(1.0, successChance + (levelDifference * PRODUCTION_CONSTANTS.LEVEL_SUCCESS_BONUS));
    }

    return Math.max(0.95, Math.min(1.0, successChance)); // Between 95% and 100%
  }

  /**
   * Calculate herblore duration
   */
  private calculateHerbloreDuration(recipe: HerbloreRecipe, quantity: number): number {
    const baseTime = PRODUCTION_CONSTANTS.BASE_HERBLORE_TIME;
    const totalDuration = baseTime * quantity;
    return Math.max(1000, totalDuration);
  }

  /**
   * Check if player has herb
   */
  private playerHasHerb(playerId: string, herbId: number, quantity: number): boolean {
    return this.playerHasItem(playerId, herbId, quantity);
  }

  /**
   * Check if player has secondary ingredient
   */
  private playerHasSecondaryIngredient(playerId: string, ingredientId: number, quantity: number): boolean {
    return this.playerHasItem(playerId, ingredientId, quantity);
  }

  /**
   * Check if player has vials of water
   */
  private playerHasVials(playerId: string, quantity: number): boolean {
    return this.playerHasItem(playerId, 227, quantity); // Vial of water
  }

  /**
   * Check if player has potion
   */
  private playerHasPotion(playerId: string, potionId: number): boolean {
    return this.playerHasItem(playerId, potionId, 1);
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
   * Consume herb from inventory
   */
  private consumeHerb(playerId: string, herbId: number, quantity: number): void {
    this.world.events.emit('rpg:remove_item', {
      playerId,
      itemId: herbId,
      quantity,
    });
  }

  /**
   * Consume secondary ingredient from inventory
   */
  private consumeSecondaryIngredient(playerId: string, ingredientId: number, quantity: number): void {
    this.world.events.emit('rpg:remove_item', {
      playerId,
      itemId: ingredientId,
      quantity,
    });
  }

  /**
   * Consume vials of water from inventory
   */
  private consumeVials(playerId: string, quantity: number): void {
    this.world.events.emit('rpg:remove_item', {
      playerId,
      itemId: 227, // Vial of water
      quantity,
    });
  }

  /**
   * Produce potion and add to inventory
   */
  private producePotion(playerId: string, potionId: number, quantity: number): void {
    this.world.events.emit('rpg:add_item', {
      playerId,
      itemId: potionId,
      quantity,
      noted: false,
    });
  }

  /**
   * Grant herblore XP
   */
  private grantHerbloreXP(playerId: string, amount: number): void {
    this.world.events.emit('rpg:xp_gain', {
      playerId,
      skill: 'herblore',
      amount,
      source: 'herblore',
    });
  }

  /**
   * Update active herblore actions
   */
  private updateHerbloreActions(delta: number): void {
    const now = Date.now();
    
    for (const action of this.activeActions.values()) {
      // Check if it's time for next production
      const timePerItem = action.duration / action.quantity;
      const timeSinceStart = now - action.startTime;
      const expectedCompleted = Math.floor(timeSinceStart / timePerItem);
      
      if (expectedCompleted > action.completed && action.completed < action.quantity) {
        this.processHerbloreProduction(action);
      }
    }
  }

  /**
   * Process herblore tick
   */
  private processHerbloreTick(): void {
    // Handle any tick-based herblore mechanics
  }

  /**
   * Initialize herblore data
   */
  private initializeHerbloreData(): void {
    // Initialize herblore recipes
    const herbloreRecipes: HerbloreRecipe[] = [
      // Attack potions
      {
        id: 'attack_potion',
        name: 'Attack potion',
        level: 3,
        xp: 25,
        primaryHerb: 200, // Guam leaf (clean)
        secondaryIngredient: 221, // Eye of newt
        outputItem: 2428, // Attack potion(3)
        effect: {
          type: 'boost',
          skill: 'attack',
          amount: 3,
          percentage: true, // 3% boost
        },
        duration: 300, // 5 minutes
        category: 'attack',
      },
      
      // Antipoison
      {
        id: 'antipoison',
        name: 'Antipoison',
        level: 5,
        xp: 37.5,
        primaryHerb: 202, // Marrentill (clean)
        secondaryIngredient: 235, // Unicorn horn dust
        outputItem: 2446, // Antipoison(3)
        effect: {
          type: 'protect',
          amount: 1,
        },
        duration: 600, // 10 minutes
        category: 'antipoison',
      },
      
      // Strength potions
      {
        id: 'strength_potion',
        name: 'Strength potion',
        level: 12,
        xp: 50,
        primaryHerb: 204, // Tarromin (clean)
        secondaryIngredient: 225, // Limpwurt root
        outputItem: 113, // Strength potion(3)
        effect: {
          type: 'boost',
          skill: 'strength',
          amount: 3,
          percentage: true, // 3% boost
        },
        duration: 300, // 5 minutes
        category: 'strength',
      },
      
      // Energy potions
      {
        id: 'energy_potion',
        name: 'Energy potion',
        level: 26,
        xp: 62.5,
        primaryHerb: 206, // Harralander (clean)
        secondaryIngredient: 1980, // Chocolate dust
        outputItem: 3010, // Energy potion(3)
        effect: {
          type: 'restore',
          skill: 'energy',
          amount: 20,
          percentage: true, // 20% energy restore
        },
        duration: 0, // Instant effect
        category: 'restore',
      },
      
      // Defence potions
      {
        id: 'defence_potion',
        name: 'Defence potion',
        level: 30,
        xp: 75,
        primaryHerb: 208, // Ranarr weed (clean)
        secondaryIngredient: 239, // White berries
        outputItem: 2432, // Defence potion(3)
        effect: {
          type: 'boost',
          skill: 'defence',
          amount: 3,
          percentage: true, // 3% boost
        },
        duration: 300, // 5 minutes
        category: 'defence',
      },
      
      // Prayer potions
      {
        id: 'prayer_potion',
        name: 'Prayer potion',
        level: 38,
        xp: 87.5,
        primaryHerb: 208, // Ranarr weed (clean)
        secondaryIngredient: 231, // Snape grass
        outputItem: 2434, // Prayer potion(3)
        effect: {
          type: 'restore',
          skill: 'prayer',
          amount: 25,
          percentage: true, // 25% prayer restore
        },
        duration: 0, // Instant effect
        category: 'prayer',
      },
      
      // Super attack
      {
        id: 'super_attack',
        name: 'Super attack',
        level: 45,
        xp: 100,
        primaryHerb: 210, // Irit leaf (clean)
        secondaryIngredient: 221, // Eye of newt
        outputItem: 2436, // Super attack(3)
        effect: {
          type: 'boost',
          skill: 'attack',
          amount: 5,
          percentage: true, // 5% boost
        },
        duration: 300, // 5 minutes
        category: 'attack',
      },
      
      // Super strength
      {
        id: 'super_strength',
        name: 'Super strength',
        level: 55,
        xp: 125,
        primaryHerb: 212, // Kwuarm (clean)
        secondaryIngredient: 225, // Limpwurt root
        outputItem: 2440, // Super strength(3)
        effect: {
          type: 'boost',
          skill: 'strength',
          amount: 5,
          percentage: true, // 5% boost
        },
        duration: 300, // 5 minutes
        category: 'strength',
      },
      
      // Super defence
      {
        id: 'super_defence',
        name: 'Super defence',
        level: 66,
        xp: 150,
        primaryHerb: 214, // Cadantine (clean)
        secondaryIngredient: 239, // White berries
        outputItem: 2442, // Super defence(3)
        effect: {
          type: 'boost',
          skill: 'defence',
          amount: 5,
          percentage: true, // 5% boost
        },
        duration: 300, // 5 minutes
        category: 'defence',
      },
      
      // Ranging potion
      {
        id: 'ranging_potion',
        name: 'Ranging potion',
        level: 72,
        xp: 162.5,
        primaryHerb: 216, // Dwarf weed (clean)
        secondaryIngredient: 245, // Wine of zamorak
        outputItem: 2444, // Ranging potion(3)
        effect: {
          type: 'boost',
          skill: 'ranged',
          amount: 4,
          percentage: true, // 4% boost
        },
        duration: 300, // 5 minutes
        category: 'ranging',
      },
      
      // Magic potion
      {
        id: 'magic_potion',
        name: 'Magic potion',
        level: 76,
        xp: 172.5,
        primaryHerb: 218, // Lantadyme (clean)
        secondaryIngredient: 3138, // Potato cactus
        outputItem: 3040, // Magic potion(3)
        effect: {
          type: 'boost',
          skill: 'magic',
          amount: 4,
        },
        duration: 300, // 5 minutes
        category: 'magic',
      },
    ];

    herbloreRecipes.forEach(recipe => {
      this.herbloreRecipes.set(recipe.id, recipe);
    });

    logger.info(`[HerbloreSystem] Loaded ${herbloreRecipes.length} herblore recipes`);
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
  private handleStartHerblore(event: any): void {
    const { playerId, recipeId, quantity } = event;
    this.startHerblore(playerId, recipeId, quantity || 1);
  }

  private handleStopHerblore(event: any): void {
    const { playerId } = event;
    this.stopHerblore(playerId);
  }

  private handleMakePotion(event: any): void {
    const { playerId, potionType } = event;
    this.startHerblore(playerId, potionType, 1);
  }

  private handleDrinkPotion(event: any): void {
    const { playerId, potionId } = event;
    this.drinkPotion(playerId, potionId);
  }

  private handleCleanHerbs(event: any): void {
    const { playerId, grimyHerbId, quantity } = event;
    this.cleanHerbs(playerId, grimyHerbId, quantity || 1);
  }

  // Public API
  getHerbloreRecipes(): Map<string, HerbloreRecipe> {
    return new Map(this.herbloreRecipes);
  }

  getActiveActions(): Map<string, ProductionAction> {
    return new Map(this.activeActions);
  }

  getActivePotionEffects(): Map<string, PotionEffectInstance[]> {
    return new Map(this.activePotionEffects);
  }

  isPlayerMakingPotions(playerId: string): boolean {
    return this.activeActions.has(playerId);
  }

  // Validation methods for actions
  canMakePotion(playerId: string, recipeId: string): { canMake: boolean, reason?: string } {
    const recipe = this.herbloreRecipes.get(recipeId);
    if (!recipe) {
      return { canMake: false, reason: `Unknown recipe: ${recipeId}` };
    }

    const stats = this.getPlayerStats(playerId);
    if (!stats || stats.herblore.level < recipe.level) {
      return { canMake: false, reason: `Need herblore level ${recipe.level}` };
    }

    if (!this.playerHasHerb(playerId, recipe.primaryHerb, 1)) {
      return { canMake: false, reason: 'Missing clean herbs' };
    }

    if (!this.playerHasSecondaryIngredient(playerId, recipe.secondaryIngredient, 1)) {
      return { canMake: false, reason: 'Missing secondary ingredient' };
    }

    if (!this.playerHasVials(playerId, 1)) {
      return { canMake: false, reason: 'Missing vials of water' };
    }

    return { canMake: true };
  }

  getRecipesByCategory(category: string): HerbloreRecipe[] {
    return Array.from(this.herbloreRecipes.values()).filter(recipe => recipe.category === category);
  }

  getSuccessChance(playerId: string, recipeId: string): number {
    const recipe = this.herbloreRecipes.get(recipeId);
    if (!recipe) return 0;

    return this.calculateSuccessChance(playerId, recipe) * 100;
  }

  getPlayerEffects(playerId: string): PotionEffectInstance[] {
    return this.activePotionEffects.get(playerId) || [];
  }
}

interface PotionEffectInstance {
  playerId: string;
  effect: PotionEffect;
  endTime: number;
  applied: boolean;
}