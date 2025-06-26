// @ts-nocheck
/**
 * Smithing System - Create weapons, armor, and tools from metal bars
 * Implements RuneScape-style smithing with furnaces, anvils, and progression
 */

import { System } from '../../../core/systems/System';
import type { World, Entity } from '../../../types';
import { SkillType } from '../skills/SkillDefinitions';

export enum MetalType {
  BRONZE = 'bronze',
  IRON = 'iron', 
  STEEL = 'steel',
  MITHRIL = 'mithril',
  ADAMANT = 'adamant',
  RUNE = 'rune',
  DRAGON = 'dragon'
}

export enum SmithingItem {
  // Weapons
  DAGGER = 'dagger',
  SWORD = 'sword',
  LONGSWORD = 'longsword',
  SCIMITAR = 'scimitar',
  MACE = 'mace',
  AXE = 'axe',
  BATTLEAXE = 'battleaxe',
  
  // Armor
  HELMET = 'helmet',
  PLATEBODY = 'platebody',
  PLATELEGS = 'platelegs',
  BOOTS = 'boots',
  GLOVES = 'gloves',
  SHIELD = 'shield',
  
  // Tools
  PICKAXE = 'pickaxe',
  HATCHET = 'hatchet',
  
  // Arrowtips
  ARROWTIPS = 'arrowtips'
}

export interface SmithingRecipe {
  id: string;
  name: string;
  metal: MetalType;
  item: SmithingItem;
  levelRequired: number;
  barsRequired: number;
  experience: number;
  resultItemId: string;
  resultQuantity: number;
}

export interface SmeltingRecipe {
  id: string;
  name: string;
  levelRequired: number;
  primaryOre: string;
  primaryQuantity: number;
  secondaryOre?: string;
  secondaryQuantity?: number;
  coalRequired: number;
  experience: number;
  resultItemId: string;
  resultQuantity: number;
  successRate: number; // For iron and above
}

export interface SmithingComponent {
  type: 'smithing';
  activeSmithing?: {
    recipeId: string;
    startTime: number;
    duration: number;
    quantity: number;
    completed: number;
  };
  nearAnvil: boolean;
  nearFurnace: boolean;
}

export class SmithingSystem extends System {
  private smithingRecipes: Map<string, SmithingRecipe> = new Map();
  private smeltingRecipes: Map<string, SmeltingRecipe> = new Map();
  private activeSmithing: Map<string, any> = new Map();

  constructor(world: World) {
    super(world);
    this.initializeRecipes();
  }

  async initialize(): Promise<void> {
    console.log('[SmithingSystem] Initializing...');
    
    // Listen for smithing events
    this.world.events.on('player:joined', this.handlePlayerJoined.bind(this));
    this.world.events.on('smithing:start_smithing', this.handleStartSmithing.bind(this));
    this.world.events.on('smithing:start_smelting', this.handleStartSmelting.bind(this));
    this.world.events.on('smithing:anvil_interaction', this.handleAnvilInteraction.bind(this));
    this.world.events.on('smithing:furnace_interaction', this.handleFurnaceInteraction.bind(this));
    
    console.log('[SmithingSystem] Initialized with smithing and smelting recipes');
  }

  private initializeRecipes(): void {
    // Initialize smelting recipes
    this.addSmeltingRecipe({
      id: 'bronze_bar',
      name: 'Bronze Bar',
      levelRequired: 1,
      primaryOre: 'copper_ore',
      primaryQuantity: 1,
      secondaryOre: 'tin_ore',
      secondaryQuantity: 1,
      coalRequired: 0,
      experience: 6.2,
      resultItemId: 'bronze_bar',
      resultQuantity: 1,
      successRate: 1.0
    });

    this.addSmeltingRecipe({
      id: 'iron_bar',
      name: 'Iron Bar',
      levelRequired: 15,
      primaryOre: 'iron_ore',
      primaryQuantity: 1,
      coalRequired: 0,
      experience: 12.5,
      resultItemId: 'iron_bar',
      resultQuantity: 1,
      successRate: 0.5 // 50% success rate for iron
    });

    this.addSmeltingRecipe({
      id: 'steel_bar',
      name: 'Steel Bar',
      levelRequired: 30,
      primaryOre: 'iron_ore',
      primaryQuantity: 1,
      coalRequired: 2,
      experience: 17.5,
      resultItemId: 'steel_bar',
      resultQuantity: 1,
      successRate: 1.0
    });

    this.addSmeltingRecipe({
      id: 'mithril_bar',
      name: 'Mithril Bar',
      levelRequired: 50,
      primaryOre: 'mithril_ore',
      primaryQuantity: 1,
      coalRequired: 4,
      experience: 30,
      resultItemId: 'mithril_bar',
      resultQuantity: 1,
      successRate: 1.0
    });

    this.addSmeltingRecipe({
      id: 'adamant_bar',
      name: 'Adamant Bar',
      levelRequired: 70,
      primaryOre: 'adamant_ore',
      primaryQuantity: 1,
      coalRequired: 6,
      experience: 37.5,
      resultItemId: 'adamant_bar',
      resultQuantity: 1,
      successRate: 1.0
    });

    this.addSmeltingRecipe({
      id: 'rune_bar',
      name: 'Rune Bar',
      levelRequired: 85,
      primaryOre: 'runite_ore',
      primaryQuantity: 1,
      coalRequired: 8,
      experience: 50,
      resultItemId: 'rune_bar',
      resultQuantity: 1,
      successRate: 1.0
    });

    // Initialize smithing recipes for each metal type
    this.initializeMetalRecipes(MetalType.BRONZE, 1, 'bronze_bar');
    this.initializeMetalRecipes(MetalType.IRON, 15, 'iron_bar');
    this.initializeMetalRecipes(MetalType.STEEL, 30, 'steel_bar');
    this.initializeMetalRecipes(MetalType.MITHRIL, 50, 'mithril_bar');
    this.initializeMetalRecipes(MetalType.ADAMANT, 70, 'adamant_bar');
    this.initializeMetalRecipes(MetalType.RUNE, 85, 'rune_bar');
  }

  private initializeMetalRecipes(metal: MetalType, baseLevel: number, barItemId: string): void {
    const recipes = [
      { item: SmithingItem.DAGGER, level: baseLevel, bars: 1, xp: 12.5, qty: 1 },
      { item: SmithingItem.AXE, level: baseLevel, bars: 1, xp: 12.5, qty: 1 },
      { item: SmithingItem.MACE, level: baseLevel + 2, bars: 1, xp: 12.5, qty: 1 },
      { item: SmithingItem.SWORD, level: baseLevel + 4, bars: 1, xp: 12.5, qty: 1 },
      { item: SmithingItem.SCIMITAR, level: baseLevel + 5, bars: 2, xp: 25, qty: 1 },
      { item: SmithingItem.LONGSWORD, level: baseLevel + 6, bars: 2, xp: 25, qty: 1 },
      { item: SmithingItem.BATTLEAXE, level: baseLevel + 10, bars: 3, xp: 37.5, qty: 1 },
      
      { item: SmithingItem.HELMET, level: baseLevel + 7, bars: 1, xp: 12.5, qty: 1 },
      { item: SmithingItem.SHIELD, level: baseLevel + 8, bars: 2, xp: 25, qty: 1 },
      { item: SmithingItem.BOOTS, level: baseLevel + 9, bars: 1, xp: 12.5, qty: 1 },
      { item: SmithingItem.GLOVES, level: baseLevel + 11, bars: 1, xp: 12.5, qty: 1 },
      { item: SmithingItem.PLATELEGS, level: baseLevel + 16, bars: 3, xp: 37.5, qty: 1 },
      { item: SmithingItem.PLATEBODY, level: baseLevel + 18, bars: 5, xp: 62.5, qty: 1 },
      
      { item: SmithingItem.PICKAXE, level: baseLevel + 1, bars: 2, xp: 25, qty: 1 },
      { item: SmithingItem.HATCHET, level: baseLevel + 1, bars: 1, xp: 12.5, qty: 1 },
      { item: SmithingItem.ARROWTIPS, level: baseLevel, bars: 1, xp: 12.5, qty: 15 }
    ];

    for (const recipe of recipes) {
      const id = `${metal}_${recipe.item}`;
      this.addSmithingRecipe({
        id,
        name: `${this.capitalize(metal)} ${this.capitalize(recipe.item)}`,
        metal,
        item: recipe.item,
        levelRequired: recipe.level,
        barsRequired: recipe.bars,
        experience: recipe.xp,
        resultItemId: id,
        resultQuantity: recipe.qty
      });
    }
  }

  private addSmeltingRecipe(recipe: SmeltingRecipe): void {
    this.smeltingRecipes.set(recipe.id, recipe);
  }

  private addSmithingRecipe(recipe: SmithingRecipe): void {
    this.smithingRecipes.set(recipe.id, recipe);
  }

  private handlePlayerJoined(data: any): void {
    const { entityId } = data;
    this.createSmithingComponent(entityId);
  }

  public createSmithingComponent(entityId: string): SmithingComponent | null {
    const entity = this.world.getEntityById(entityId);
    if (!entity) return null;

    const smithingComponent: SmithingComponent = {
      type: 'smithing',
      nearAnvil: false,
      nearFurnace: false
    };

    entity.addComponent(smithingComponent);
    return smithingComponent;
  }

  private handleStartSmithing(data: any): void {
    const { playerId, recipeId, quantity } = data;
    this.startSmithing(playerId, recipeId, quantity || 1);
  }

  private handleStartSmelting(data: any): void {
    const { playerId, recipeId, quantity } = data;
    this.startSmelting(playerId, recipeId, quantity || 1);
  }

  private handleAnvilInteraction(data: any): void {
    const { playerId } = data;
    
    const entity = this.world.getEntityById(playerId);
    if (!entity) return;

    const smithing = entity.getComponent('smithing') as SmithingComponent;
    if (smithing) {
      smithing.nearAnvil = true;
    }

    // Show smithing interface
    this.world.events.emit('smithing:show_interface', {
      playerId,
      type: 'smithing',
      availableRecipes: this.getAvailableSmithingRecipes(playerId)
    });
  }

  private handleFurnaceInteraction(data: any): void {
    const { playerId } = data;
    
    const entity = this.world.getEntityById(playerId);
    if (!entity) return;

    const smithing = entity.getComponent('smithing') as SmithingComponent;
    if (smithing) {
      smithing.nearFurnace = true;
    }

    // Show smelting interface
    this.world.events.emit('smithing:show_interface', {
      playerId,
      type: 'smelting',
      availableRecipes: this.getAvailableSmeltingRecipes(playerId)
    });
  }

  public startSmelting(playerId: string, recipeId: string, quantity: number): boolean {
    const entity = this.world.getEntityById(playerId);
    const recipe = this.smeltingRecipes.get(recipeId);
    
    if (!entity || !recipe) return false;

    const smithing = entity.getComponent('smithing') as SmithingComponent;
    if (!smithing || !smithing.nearFurnace) {
      this.world.events.emit('smithing:error', {
        playerId,
        message: 'You need to be near a furnace to smelt ores.'
      });
      return false;
    }

    // Check smithing level
    const skillsSystem = this.world.systems.find(s => s.constructor.name === 'EnhancedSkillsSystem');
    const smithingLevel = skillsSystem ? (skillsSystem as any).getSkillLevel(playerId, SkillType.SMITHING) : 1;
    
    if (smithingLevel < recipe.levelRequired) {
      this.world.events.emit('smithing:error', {
        playerId,
        message: `You need level ${recipe.levelRequired} Smithing to smelt ${recipe.name}.`
      });
      return false;
    }

    // Check inventory for ores
    if (!this.hasRequiredOres(playerId, recipe, quantity)) {
      this.world.events.emit('smithing:error', {
        playerId,
        message: 'You do not have the required ores.'
      });
      return false;
    }

    // Start smelting process
    const smeltingTime = 4000; // 4 seconds per bar
    smithing.activeSmithing = {
      recipeId,
      startTime: Date.now(),
      duration: smeltingTime,
      quantity,
      completed: 0
    };

    this.world.events.emit('smithing:smelting_started', {
      playerId,
      recipeId,
      recipeName: recipe.name,
      quantity,
      duration: smeltingTime
    });

    // Schedule completion
    this.scheduleSmelting(playerId, recipe, quantity);
    return true;
  }

  private scheduleSmelting(playerId: string, recipe: SmeltingRecipe, totalQuantity: number): void {
    const smeltOne = () => {
      const entity = this.world.getEntityById(playerId);
      if (!entity) return;

      const smithing = entity.getComponent('smithing') as SmithingComponent;
      if (!smithing || !smithing.activeSmithing) return;

      // Check success rate
      const success = Math.random() < recipe.successRate;
      
      if (success) {
        // Consume ores
        this.consumeOres(playerId, recipe, 1);
        
        // Give result
        const inventorySystem = this.world.systems.find(s => s.constructor.name === 'InventorySystem');
        if (inventorySystem) {
          (inventorySystem as any).addItem(playerId, recipe.resultItemId, recipe.resultQuantity);
        }

        // Award experience
        const skillsSystem = this.world.systems.find(s => s.constructor.name === 'EnhancedSkillsSystem');
        if (skillsSystem) {
          (skillsSystem as any).addExperience(playerId, SkillType.SMITHING, recipe.experience);
        }

        this.world.events.emit('smithing:smelting_success', {
          playerId,
          recipeName: recipe.name,
          itemId: recipe.resultItemId,
          quantity: recipe.resultQuantity,
          experience: recipe.experience
        });
      } else {
        // Consume ores but no result (iron smelting failure)
        this.consumeOres(playerId, recipe, 1);
        
        this.world.events.emit('smithing:smelting_failed', {
          playerId,
          recipeName: recipe.name
        });
      }

      smithing.activeSmithing.completed++;

      // Continue if more to smelt
      if (smithing.activeSmithing.completed < totalQuantity) {
        setTimeout(smeltOne, recipe.id === 'bronze_bar' ? 2000 : 4000);
      } else {
        // Finished
        smithing.activeSmithing = undefined;
        this.world.events.emit('smithing:smelting_completed', {
          playerId,
          recipeName: recipe.name,
          totalCompleted: smithing.activeSmithing?.completed || 0
        });
      }
    };

    // Start first smelt
    setTimeout(smeltOne, recipe.id === 'bronze_bar' ? 2000 : 4000);
  }

  public startSmithing(playerId: string, recipeId: string, quantity: number): boolean {
    const entity = this.world.getEntityById(playerId);
    const recipe = this.smithingRecipes.get(recipeId);
    
    if (!entity || !recipe) return false;

    const smithing = entity.getComponent('smithing') as SmithingComponent;
    if (!smithing || !smithing.nearAnvil) {
      this.world.events.emit('smithing:error', {
        playerId,
        message: 'You need to be near an anvil to smith items.'
      });
      return false;
    }

    // Check smithing level
    const skillsSystem = this.world.systems.find(s => s.constructor.name === 'EnhancedSkillsSystem');
    const smithingLevel = skillsSystem ? (skillsSystem as any).getSkillLevel(playerId, SkillType.SMITHING) : 1;
    
    if (smithingLevel < recipe.levelRequired) {
      this.world.events.emit('smithing:error', {
        playerId,
        message: `You need level ${recipe.levelRequired} Smithing to make ${recipe.name}.`
      });
      return false;
    }

    // Check inventory for bars
    if (!this.hasRequiredBars(playerId, recipe, quantity)) {
      this.world.events.emit('smithing:error', {
        playerId,
        message: `You need ${recipe.barsRequired * quantity} ${recipe.metal} bars.`
      });
      return false;
    }

    // Start smithing process
    const smithingTime = 3000; // 3 seconds per item
    smithing.activeSmithing = {
      recipeId,
      startTime: Date.now(),
      duration: smithingTime,
      quantity,
      completed: 0
    };

    this.world.events.emit('smithing:smithing_started', {
      playerId,
      recipeId,
      recipeName: recipe.name,
      quantity,
      duration: smithingTime
    });

    // Schedule completion
    this.scheduleSmithing(playerId, recipe, quantity);
    return true;
  }

  private scheduleSmithing(playerId: string, recipe: SmithingRecipe, totalQuantity: number): void {
    const smithOne = () => {
      const entity = this.world.getEntityById(playerId);
      if (!entity) return;

      const smithing = entity.getComponent('smithing') as SmithingComponent;
      if (!smithing || !smithing.activeSmithing) return;

      // Consume bars
      this.consumeBars(playerId, recipe, 1);
      
      // Give result
      const inventorySystem = this.world.systems.find(s => s.constructor.name === 'InventorySystem');
      if (inventorySystem) {
        (inventorySystem as any).addItem(playerId, recipe.resultItemId, recipe.resultQuantity);
      }

      // Award experience
      const skillsSystem = this.world.systems.find(s => s.constructor.name === 'EnhancedSkillsSystem');
      if (skillsSystem) {
        (skillsSystem as any).addExperience(playerId, SkillType.SMITHING, recipe.experience);
      }

      this.world.events.emit('smithing:smithing_success', {
        playerId,
        recipeName: recipe.name,
        itemId: recipe.resultItemId,
        quantity: recipe.resultQuantity,
        experience: recipe.experience
      });

      smithing.activeSmithing.completed++;

      // Continue if more to smith
      if (smithing.activeSmithing.completed < totalQuantity) {
        setTimeout(smithOne, 3000);
      } else {
        // Finished
        smithing.activeSmithing = undefined;
        this.world.events.emit('smithing:smithing_completed', {
          playerId,
          recipeName: recipe.name,
          totalCompleted: smithing.activeSmithing?.completed || 0
        });
      }
    };

    // Start first smith
    setTimeout(smithOne, 3000);
  }

  private hasRequiredOres(playerId: string, recipe: SmeltingRecipe, quantity: number): boolean {
    const inventorySystem = this.world.systems.find(s => s.constructor.name === 'InventorySystem');
    if (!inventorySystem) return false;

    const hasItem = (itemId: string, requiredQty: number) => {
      return (inventorySystem as any).getItemQuantity(playerId, itemId) >= requiredQty;
    };

    const totalPrimary = recipe.primaryQuantity * quantity;
    const totalSecondary = recipe.secondaryQuantity ? recipe.secondaryQuantity * quantity : 0;
    const totalCoal = recipe.coalRequired * quantity;

    if (!hasItem(recipe.primaryOre, totalPrimary)) return false;
    if (recipe.secondaryOre && !hasItem(recipe.secondaryOre, totalSecondary)) return false;
    if (recipe.coalRequired > 0 && !hasItem('coal', totalCoal)) return false;

    return true;
  }

  private hasRequiredBars(playerId: string, recipe: SmithingRecipe, quantity: number): boolean {
    const inventorySystem = this.world.systems.find(s => s.constructor.name === 'InventorySystem');
    if (!inventorySystem) return false;

    const barItemId = `${recipe.metal}_bar`;
    const requiredBars = recipe.barsRequired * quantity;
    
    return (inventorySystem as any).getItemQuantity(playerId, barItemId) >= requiredBars;
  }

  private consumeOres(playerId: string, recipe: SmeltingRecipe, quantity: number): void {
    const inventorySystem = this.world.systems.find(s => s.constructor.name === 'InventorySystem');
    if (!inventorySystem) return;

    (inventorySystem as any).removeItem(playerId, recipe.primaryOre, recipe.primaryQuantity * quantity);
    
    if (recipe.secondaryOre) {
      (inventorySystem as any).removeItem(playerId, recipe.secondaryOre, recipe.secondaryQuantity! * quantity);
    }
    
    if (recipe.coalRequired > 0) {
      (inventorySystem as any).removeItem(playerId, 'coal', recipe.coalRequired * quantity);
    }
  }

  private consumeBars(playerId: string, recipe: SmithingRecipe, quantity: number): void {
    const inventorySystem = this.world.systems.find(s => s.constructor.name === 'InventorySystem');
    if (!inventorySystem) return;

    const barItemId = `${recipe.metal}_bar`;
    (inventorySystem as any).removeItem(playerId, barItemId, recipe.barsRequired * quantity);
  }

  private getAvailableSmeltingRecipes(playerId: string): SmeltingRecipe[] {
    const skillsSystem = this.world.systems.find(s => s.constructor.name === 'EnhancedSkillsSystem');
    const smithingLevel = skillsSystem ? (skillsSystem as any).getSkillLevel(playerId, SkillType.SMITHING) : 1;

    return Array.from(this.smeltingRecipes.values())
      .filter(recipe => recipe.levelRequired <= smithingLevel)
      .sort((a, b) => a.levelRequired - b.levelRequired);
  }

  private getAvailableSmithingRecipes(playerId: string): SmithingRecipe[] {
    const skillsSystem = this.world.systems.find(s => s.constructor.name === 'EnhancedSkillsSystem');
    const smithingLevel = skillsSystem ? (skillsSystem as any).getSkillLevel(playerId, SkillType.SMITHING) : 1;

    return Array.from(this.smithingRecipes.values())
      .filter(recipe => recipe.levelRequired <= smithingLevel)
      .sort((a, b) => a.levelRequired - b.levelRequired);
  }

  public getSmithingComponent(entityId: string): SmithingComponent | null {
    const entity = this.world.getEntityById(entityId);
    return entity ? entity.getComponent('smithing') as SmithingComponent : null;
  }

  public isNearAnvil(entityId: string): boolean {
    const smithing = this.getSmithingComponent(entityId);
    return smithing ? smithing.nearAnvil : false;
  }

  public isNearFurnace(entityId: string): boolean {
    const smithing = this.getSmithingComponent(entityId);
    return smithing ? smithing.nearFurnace : false;
  }

  public getAllSmeltingRecipes(): SmeltingRecipe[] {
    return Array.from(this.smeltingRecipes.values());
  }

  public getAllSmithingRecipes(): SmithingRecipe[] {
    return Array.from(this.smithingRecipes.values());
  }

  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  update(deltaTime: number): void {
    // Update active smithing progress
    for (const [playerId, smithingData] of this.activeSmithing) {
      // Progress updates are handled by the scheduled timeouts
    }
  }

  serialize(): any {
    return {
      activeSmithing: Object.fromEntries(this.activeSmithing)
    };
  }

  deserialize(data: any): void {
    if (data.activeSmithing) {
      this.activeSmithing = new Map(Object.entries(data.activeSmithing));
    }
  }
}