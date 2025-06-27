/**
 * Cooking System - Food preparation with burn chances and stat restoration
 * Implements RuneScape-style cooking with fires, ranges, and burning mechanics
 */

import { System } from '../../../core/systems/System'
import type { World, Entity } from '../../../types'
import { SkillType } from '../skills/SkillDefinitions'

export enum FoodType {
  // Fish
  SHRIMP = 'shrimp',
  SARDINE = 'sardine',
  TROUT = 'trout',
  SALMON = 'salmon',
  TUNA = 'tuna',
  LOBSTER = 'lobster',
  SWORDFISH = 'swordfish',
  SHARK = 'shark',

  // Meat
  RAW_CHICKEN = 'raw_chicken',
  RAW_BEEF = 'raw_beef',
  RAW_BEAR_MEAT = 'raw_bear_meat',

  // Bread & Baking
  BREAD_DOUGH = 'bread_dough',
  CAKE_MIXTURE = 'cake_mixture',
  PIE_SHELL = 'pie_shell',

  // Stews & Complex
  STEW = 'stew',
  CURRY = 'curry',
  PIZZA_BASE = 'pizza_base',
}

export enum CookingMethod {
  FIRE = 'fire',
  RANGE = 'range',
  OVEN = 'oven',
}

export interface CookingRecipe {
  id: string
  name: string
  rawItemId: number
  cookedItemId: number
  burntItemId: number
  levelRequired: number
  experience: number
  cookingTime: number // milliseconds
  baseSuccessRate: number // at required level
  maxSuccessRate: number // at high level
  successRateIncrease: number // per level above required
  preferredMethod: CookingMethod
  canUseFire: boolean
  canUseRange: boolean
  canUseOven: boolean
  healAmount: number // for cooked food
}

export interface CookingComponent {
  type: 'cooking'
  activeCooking?: {
    recipeId: string
    startTime: number
    duration: number
    quantity: number
    completed: number
    cookingMethod: CookingMethod
  }
  nearFire: boolean
  nearRange: boolean
  nearOven: boolean
}

export class CookingSystem extends System {
  private cookingRecipes: Map<string, CookingRecipe> = new Map()
  private activeCooking: Map<string, any> = new Map()

  constructor(world: World) {
    super(world)
    this.initializeRecipes()
  }

  async init(_options: any): Promise<void> {
    console.log('[CookingSystem] Initializing...')

    // Listen for cooking events
    this.world.events.on('player:joined', this.handlePlayerJoined.bind(this))
    this.world.events.on('cooking:start_cooking', this.handleStartCooking.bind(this))
    this.world.events.on('cooking:fire_interaction', this.handleFireInteraction.bind(this))
    this.world.events.on('cooking:range_interaction', this.handleRangeInteraction.bind(this))
    this.world.events.on('cooking:oven_interaction', this.handleOvenInteraction.bind(this))

    console.log('[CookingSystem] Initialized with cooking recipes')
  }

  // Keep backwards compatibility
  async initialize(): Promise<void> {
    return this.init({})
  }

  private initializeRecipes(): void {
    // Fish cooking recipes
    this.addCookingRecipe({
      id: 'cook_shrimp',
      name: 'Cooked Shrimp',
      rawItemId: 317, // Raw Shrimp
      cookedItemId: 315, // Shrimps (cooked)
      burntItemId: 323, // Burnt Shrimp
      levelRequired: 1,
      experience: 30,
      cookingTime: 3000,
      baseSuccessRate: 0.5,
      maxSuccessRate: 0.99,
      successRateIncrease: 0.02,
      preferredMethod: CookingMethod.FIRE,
      canUseFire: true,
      canUseRange: true,
      canUseOven: false,
      healAmount: 3,
    })

    this.addCookingRecipe({
      id: 'cook_sardine',
      name: 'Cooked Sardine',
      rawItemId: 327, // Raw Sardine
      cookedItemId: 325, // Sardine (cooked)
      burntItemId: 369, // Burnt Sardine
      levelRequired: 5,
      experience: 40,
      cookingTime: 3000,
      baseSuccessRate: 0.45,
      maxSuccessRate: 0.99,
      successRateIncrease: 0.025,
      preferredMethod: CookingMethod.FIRE,
      canUseFire: true,
      canUseRange: true,
      canUseOven: false,
      healAmount: 4,
    })

    this.addCookingRecipe({
      id: 'cook_trout',
      name: 'Cooked Trout',
      rawItemId: 335, // Raw Trout
      cookedItemId: 333, // Trout (cooked)
      burntItemId: 343, // Burnt Trout
      levelRequired: 15,
      experience: 70,
      cookingTime: 3500,
      baseSuccessRate: 0.4,
      maxSuccessRate: 0.98,
      successRateIncrease: 0.02,
      preferredMethod: CookingMethod.FIRE,
      canUseFire: true,
      canUseRange: true,
      canUseOven: false,
      healAmount: 7,
    })

    this.addCookingRecipe({
      id: 'cook_salmon',
      name: 'Cooked Salmon',
      rawItemId: 341, // Raw Salmon (need to add to ItemRegistry)
      cookedItemId: 339, // Cooked Salmon (need to add to ItemRegistry)
      burntItemId: 347, // Burnt Salmon (need to add to ItemRegistry)
      levelRequired: 25,
      experience: 90,
      cookingTime: 3500,
      baseSuccessRate: 0.35,
      maxSuccessRate: 0.98,
      successRateIncrease: 0.02,
      preferredMethod: CookingMethod.FIRE,
      canUseFire: true,
      canUseRange: true,
      canUseOven: false,
      healAmount: 9,
    })

    this.addCookingRecipe({
      id: 'cook_tuna',
      name: 'Cooked Tuna',
      rawItemId: 359, // Raw Tuna (need to add to ItemRegistry)
      cookedItemId: 361, // Cooked Tuna (need to add to ItemRegistry)
      burntItemId: 367, // Burnt Tuna (need to add to ItemRegistry)
      levelRequired: 30,
      experience: 100,
      cookingTime: 4000,
      baseSuccessRate: 0.3,
      maxSuccessRate: 0.97,
      successRateIncrease: 0.015,
      preferredMethod: CookingMethod.RANGE,
      canUseFire: true,
      canUseRange: true,
      canUseOven: false,
      healAmount: 10,
    })

    this.addCookingRecipe({
      id: 'cook_lobster',
      name: 'Cooked Lobster',
      rawItemId: 377, // Raw Lobster (need to add to ItemRegistry)
      cookedItemId: 379, // Cooked Lobster (need to add to ItemRegistry)
      burntItemId: 381, // Burnt Lobster (need to add to ItemRegistry)
      levelRequired: 40,
      experience: 120,
      cookingTime: 4500,
      baseSuccessRate: 0.25,
      maxSuccessRate: 0.96,
      successRateIncrease: 0.015,
      preferredMethod: CookingMethod.RANGE,
      canUseFire: true,
      canUseRange: true,
      canUseOven: false,
      healAmount: 12,
    })

    this.addCookingRecipe({
      id: 'cook_swordfish',
      name: 'Cooked Swordfish',
      rawItemId: 371, // Raw Swordfish (need to add to ItemRegistry)
      cookedItemId: 373, // Cooked Swordfish (need to add to ItemRegistry)
      burntItemId: 375, // Burnt Swordfish (need to add to ItemRegistry)
      levelRequired: 45,
      experience: 140,
      cookingTime: 5000,
      baseSuccessRate: 0.2,
      maxSuccessRate: 0.95,
      successRateIncrease: 0.01,
      preferredMethod: CookingMethod.RANGE,
      canUseFire: true,
      canUseRange: true,
      canUseOven: false,
      healAmount: 14,
    })

    this.addCookingRecipe({
      id: 'cook_shark',
      name: 'Cooked Shark',
      rawItemId: 383, // Raw Shark (need to add to ItemRegistry)
      cookedItemId: 385, // Cooked Shark (need to add to ItemRegistry)
      burntItemId: 387, // Burnt Shark (need to add to ItemRegistry)
      levelRequired: 80,
      experience: 210,
      cookingTime: 6000,
      baseSuccessRate: 0.15,
      maxSuccessRate: 0.94,
      successRateIncrease: 0.008,
      preferredMethod: CookingMethod.RANGE,
      canUseFire: false,
      canUseRange: true,
      canUseOven: false,
      healAmount: 20,
    })

    // Meat cooking recipes
    this.addCookingRecipe({
      id: 'cook_chicken',
      name: 'Cooked Chicken',
      rawItemId: 2138, // Raw Chicken (need to add to ItemRegistry)
      cookedItemId: 2140, // Cooked Chicken (need to add to ItemRegistry)
      burntItemId: 2142, // Burnt Chicken (need to add to ItemRegistry)
      levelRequired: 1,
      experience: 30,
      cookingTime: 3000,
      baseSuccessRate: 0.6,
      maxSuccessRate: 0.99,
      successRateIncrease: 0.02,
      preferredMethod: CookingMethod.FIRE,
      canUseFire: true,
      canUseRange: true,
      canUseOven: true,
      healAmount: 3,
    })

    this.addCookingRecipe({
      id: 'cook_beef',
      name: 'Cooked Beef',
      rawItemId: 2132, // Raw Beef (need to add to ItemRegistry)
      cookedItemId: 2134, // Cooked Beef (need to add to ItemRegistry)
      burntItemId: 2146, // Burnt Beef (need to add to ItemRegistry)
      levelRequired: 1,
      experience: 30,
      cookingTime: 3000,
      baseSuccessRate: 0.6,
      maxSuccessRate: 0.99,
      successRateIncrease: 0.02,
      preferredMethod: CookingMethod.FIRE,
      canUseFire: true,
      canUseRange: true,
      canUseOven: true,
      healAmount: 3,
    })

    // Bread and baking recipes
    this.addCookingRecipe({
      id: 'bake_bread',
      name: 'Bread',
      rawItemId: 2307, // Bread Dough (need to add to ItemRegistry)
      cookedItemId: 2309, // Bread (need to add to ItemRegistry)
      burntItemId: 2311, // Burnt Bread (need to add to ItemRegistry)
      levelRequired: 1,
      experience: 40,
      cookingTime: 4000,
      baseSuccessRate: 0.7,
      maxSuccessRate: 0.99,
      successRateIncrease: 0.015,
      preferredMethod: CookingMethod.OVEN,
      canUseFire: false,
      canUseRange: false,
      canUseOven: true,
      healAmount: 5,
    })

    this.addCookingRecipe({
      id: 'bake_cake',
      name: 'Cake',
      rawItemId: 1889, // Cake Mixture (need to add to ItemRegistry)
      cookedItemId: 1891, // Cake (need to add to ItemRegistry)
      burntItemId: 1893, // Burnt Cake (need to add to ItemRegistry)
      levelRequired: 40,
      experience: 180,
      cookingTime: 6000,
      baseSuccessRate: 0.4,
      maxSuccessRate: 0.95,
      successRateIncrease: 0.01,
      preferredMethod: CookingMethod.OVEN,
      canUseFire: false,
      canUseRange: false,
      canUseOven: true,
      healAmount: 12,
    })

    // Complex recipes
    this.addCookingRecipe({
      id: 'cook_stew',
      name: 'Stew',
      rawItemId: 2003, // Stew Ingredients (need to add to ItemRegistry)
      cookedItemId: 2005, // Stew (need to add to ItemRegistry)
      burntItemId: 2007, // Burnt Stew (need to add to ItemRegistry)
      levelRequired: 25,
      experience: 117,
      cookingTime: 8000,
      baseSuccessRate: 0.5,
      maxSuccessRate: 0.97,
      successRateIncrease: 0.012,
      preferredMethod: CookingMethod.RANGE,
      canUseFire: true,
      canUseRange: true,
      canUseOven: false,
      healAmount: 11,
    })
  }

  private addCookingRecipe(recipe: CookingRecipe): void {
    this.cookingRecipes.set(recipe.id, recipe)
  }

  private handlePlayerJoined(data: any): void {
    const { entityId } = data
    this.createCookingComponent(entityId)
  }

  public createCookingComponent(entityId: string): CookingComponent | null {
    const entity = this.world.getEntityById(entityId)
    if (!entity) {
      return null
    }

    const cookingComponent: CookingComponent = {
      type: 'cooking',
      nearFire: false,
      nearRange: false,
      nearOven: false,
    }

    entity.addComponent('cooking', cookingComponent)
    return cookingComponent
  }

  private handleStartCooking(data: any): void {
    const { playerId, recipeId, quantity, cookingMethod } = data
    this.startCooking(playerId, recipeId, quantity || 1, cookingMethod)
  }

  private handleFireInteraction(data: any): void {
    const { playerId } = data

    const entity = this.world.getEntityById(playerId)
    if (!entity) {
      return
    }

    const cooking = entity.getComponent('cooking') as CookingComponent
    if (cooking) {
      cooking.nearFire = true
    }

    // Show cooking interface
    this.world.events.emit('cooking:show_interface', {
      playerId,
      type: 'fire',
      availableRecipes: this.getAvailableCookingRecipes(playerId, CookingMethod.FIRE),
    })
  }

  private handleRangeInteraction(data: any): void {
    const { playerId } = data

    const entity = this.world.getEntityById(playerId)
    if (!entity) {
      return
    }

    const cooking = entity.getComponent('cooking') as CookingComponent
    if (cooking) {
      cooking.nearRange = true
    }

    // Show cooking interface
    this.world.events.emit('cooking:show_interface', {
      playerId,
      type: 'range',
      availableRecipes: this.getAvailableCookingRecipes(playerId, CookingMethod.RANGE),
    })
  }

  private handleOvenInteraction(data: any): void {
    const { playerId } = data

    const entity = this.world.getEntityById(playerId)
    if (!entity) {
      return
    }

    const cooking = entity.getComponent('cooking') as CookingComponent
    if (cooking) {
      cooking.nearOven = true
    }

    // Show cooking interface
    this.world.events.emit('cooking:show_interface', {
      playerId,
      type: 'oven',
      availableRecipes: this.getAvailableCookingRecipes(playerId, CookingMethod.OVEN),
    })
  }

  public startCooking(playerId: string, recipeId: string, quantity: number, cookingMethod: CookingMethod): boolean {
    const entity = this.world.getEntityById(playerId)
    const recipe = this.cookingRecipes.get(recipeId)

    if (!entity) {
      return false
    }
    
    if (!recipe) {
      return false
    }

    const cooking = entity.getComponent('cooking') as CookingComponent
    if (!cooking) {
      this.world.events.emit('cooking:error', {
        playerId,
        message: 'Cooking component not found.',
      })
      return false
    }

    // Check if near appropriate cooking station
    const canCook = this.canUseCookingMethod(cooking, recipe, cookingMethod)
    if (!canCook.allowed) {
      this.world.events.emit('cooking:error', {
        playerId,
        message: canCook.reason,
      })
      return false
    }

    // Check cooking level
    const skillsSystem = this.world.systems.find(s => s.constructor.name === 'EnhancedSkillsSystem')
    const cookingLevel = skillsSystem ? (skillsSystem as any).getSkillLevel(playerId, SkillType.COOKING) : 1

    if (cookingLevel < recipe.levelRequired) {
      this.world.events.emit('cooking:error', {
        playerId,
        message: `You need level ${recipe.levelRequired} Cooking to cook ${recipe.name}.`,
      })
      return false
    }

    // Check inventory for raw ingredients
    if (!this.hasRequiredIngredients(playerId, recipe, quantity)) {
      // Get item name from inventory system
      const inventorySystem = this.world.systems.find(s => s.constructor.name === 'InventorySystem')
      let itemName = `${recipe.rawItemId}` // Fallback to ID
      
      if (inventorySystem) {
        const itemDef = (inventorySystem as any).itemRegistry?.get(recipe.rawItemId)
        if (itemDef) {
          itemName = itemDef.name
        }
      }
      
      this.world.events.emit('cooking:error', {
        playerId,
        message: `You need ${quantity} ${itemName} to cook.`,
      })
      return false
    }

    // Start cooking process
    cooking.activeCooking = {
      recipeId,
      startTime: Date.now(),
      duration: recipe.cookingTime,
      quantity,
      completed: 0,
      cookingMethod,
    }

    this.world.events.emit('cooking:cooking_started', {
      playerId,
      recipeId,
      recipeName: recipe.name,
      quantity,
      cookingMethod,
      duration: recipe.cookingTime,
    })

    // Schedule completion
    this.scheduleCooking(playerId, recipe, quantity, cookingMethod)
    return true
  }

  private canUseCookingMethod(
    cooking: CookingComponent,
    recipe: CookingRecipe,
    method: CookingMethod
  ): { allowed: boolean; reason?: string } {
    switch (method) {
      case CookingMethod.FIRE:
        if (!recipe.canUseFire) {
          return { allowed: false, reason: 'This recipe cannot be cooked on a fire.' }
        }
        if (!cooking.nearFire) {
          return { allowed: false, reason: 'You need to be near a fire to cook this.' }
        }
        break
      case CookingMethod.RANGE:
        if (!recipe.canUseRange) {
          return { allowed: false, reason: 'This recipe cannot be cooked on a range.' }
        }
        if (!cooking.nearRange) {
          return { allowed: false, reason: 'You need to be near a range to cook this.' }
        }
        break
      case CookingMethod.OVEN:
        if (!recipe.canUseOven) {
          return { allowed: false, reason: 'This recipe cannot be baked in an oven.' }
        }
        if (!cooking.nearOven) {
          return { allowed: false, reason: 'You need to be near an oven to bake this.' }
        }
        break
    }
    return { allowed: true }
  }

  private scheduleCooking(
    playerId: string,
    recipe: CookingRecipe,
    totalQuantity: number,
    cookingMethod: CookingMethod
  ): void {
    const cookOne = () => {
      const entity = this.world.getEntityById(playerId)
      if (!entity) {
        return
      }

      const cooking = entity.getComponent('cooking') as CookingComponent
      if (!cooking || !cooking.activeCooking) {
        return
      }

      // Calculate success rate based on level
      const skillsSystem = this.world.systems.find(s => s.constructor.name === 'EnhancedSkillsSystem')
      const cookingLevel = skillsSystem ? (skillsSystem as any).getSkillLevel(playerId, SkillType.COOKING) : 1

      const levelsAboveRequired = Math.max(0, cookingLevel - recipe.levelRequired)
      let successRate = recipe.baseSuccessRate + levelsAboveRequired * recipe.successRateIncrease
      successRate = Math.min(successRate, recipe.maxSuccessRate)

      // Range bonus (less likely to burn)
      if (cookingMethod === CookingMethod.RANGE) {
        successRate += 0.05
      }

      // Oven bonus for baking
      if (cookingMethod === CookingMethod.OVEN) {
        successRate += 0.03
      }

      const success = Math.random() < successRate

      // Consume raw ingredient
      this.consumeIngredients(playerId, recipe, 1)

      const inventorySystem = this.world.systems.find(s => s.constructor.name === 'InventorySystem')

      if (success) {
        // Give cooked item
        if (inventorySystem) {
          ;(inventorySystem as any).addItem(playerId, recipe.cookedItemId, 1)
        }

        // Award experience
        if (skillsSystem) {
          ;(skillsSystem as any).addExperience(playerId, SkillType.COOKING, recipe.experience)
        }

        this.world.events.emit('cooking:cooking_success', {
          playerId,
          recipeName: recipe.name,
          itemId: recipe.cookedItemId,
          experience: recipe.experience,
          cookingMethod,
        })
      } else {
        // Give burnt item
        if (inventorySystem) {
          ;(inventorySystem as any).addItem(playerId, recipe.burntItemId, 1)
        }

        this.world.events.emit('cooking:cooking_burnt', {
          playerId,
          recipeName: recipe.name,
          burntItemId: recipe.burntItemId,
          cookingMethod,
        })
      }

      cooking.activeCooking.completed++

      // Continue if more to cook
      if (cooking.activeCooking.completed < totalQuantity) {
        setTimeout(cookOne, recipe.cookingTime)
      } else {
        // Finished
        cooking.activeCooking = undefined
        this.world.events.emit('cooking:cooking_completed', {
          playerId,
          recipeName: recipe.name,
          totalCompleted: cooking.activeCooking?.completed || 0,
        })
      }
    }

    // Start first cook
    setTimeout(cookOne, recipe.cookingTime)
  }

  private hasRequiredIngredients(playerId: string, recipe: CookingRecipe, quantity: number): boolean {
    const inventorySystem = this.world.systems.find(s => s.constructor.name === 'InventorySystem')
    if (!inventorySystem) {
      return false
    }
    
    const itemQuantity = (inventorySystem as any).getItemQuantity(playerId, recipe.rawItemId)
    return itemQuantity >= quantity
  }

  private consumeIngredients(playerId: string, recipe: CookingRecipe, quantity: number): void {
    const inventorySystem = this.world.systems.find(s => s.constructor.name === 'InventorySystem')
    if (!inventorySystem) {
      return
    }

    ;(inventorySystem as any).removeItemById(playerId, recipe.rawItemId, quantity)
  }

  private getAvailableCookingRecipes(playerId: string, cookingMethod: CookingMethod): CookingRecipe[] {
    const skillsSystem = this.world.systems.find(s => s.constructor.name === 'EnhancedSkillsSystem')
    const cookingLevel = skillsSystem ? (skillsSystem as any).getSkillLevel(playerId, SkillType.COOKING) : 1

    return Array.from(this.cookingRecipes.values())
      .filter(recipe => {
        // Check level requirement
        if (recipe.levelRequired > cookingLevel) {
          return false
        }

        // Check cooking method compatibility
        switch (cookingMethod) {
          case CookingMethod.FIRE:
            return recipe.canUseFire
          case CookingMethod.RANGE:
            return recipe.canUseRange
          case CookingMethod.OVEN:
            return recipe.canUseOven
          default:
            return false
        }
      })
      .sort((a, b) => a.levelRequired - b.levelRequired)
  }

  public getCookingComponent(entityId: string): CookingComponent | null {
    const entity = this.world.getEntityById(entityId)
    return entity ? (entity.getComponent('cooking') as CookingComponent) : null
  }

  public isNearFire(entityId: string): boolean {
    const cooking = this.getCookingComponent(entityId)
    return cooking ? cooking.nearFire : false
  }

  public isNearRange(entityId: string): boolean {
    const cooking = this.getCookingComponent(entityId)
    return cooking ? cooking.nearRange : false
  }

  public isNearOven(entityId: string): boolean {
    const cooking = this.getCookingComponent(entityId)
    return cooking ? cooking.nearOven : false
  }

  public getAllCookingRecipes(): CookingRecipe[] {
    return Array.from(this.cookingRecipes.values())
  }

  public getCookingRecipe(recipeId: string): CookingRecipe | null {
    return this.cookingRecipes.get(recipeId) || null
  }

  public calculateSuccessRate(playerId: string, recipeId: string, cookingMethod: CookingMethod): number {
    const recipe = this.cookingRecipes.get(recipeId)
    if (!recipe) {
      return 0
    }

    const skillsSystem = this.world.systems.find(s => s.constructor.name === 'EnhancedSkillsSystem')
    const cookingLevel = skillsSystem ? (skillsSystem as any).getSkillLevel(playerId, SkillType.COOKING) : 1

    console.log(`[CookingSystem] calculateSuccessRate: playerId=${playerId}, recipeId=${recipeId}, cookingLevel=${cookingLevel}, baseRate=${recipe.baseSuccessRate}, levelRequired=${recipe.levelRequired}`)

    const levelsAboveRequired = Math.max(0, cookingLevel - recipe.levelRequired)
    let successRate = recipe.baseSuccessRate + levelsAboveRequired * recipe.successRateIncrease
    successRate = Math.min(successRate, recipe.maxSuccessRate)

    console.log(`[CookingSystem] levelsAboveRequired=${levelsAboveRequired}, successRate before bonuses=${successRate}`)

    // Apply cooking method bonuses
    if (cookingMethod === CookingMethod.RANGE) {
      successRate += 0.05
    } else if (cookingMethod === CookingMethod.OVEN) {
      successRate += 0.03
    }

    const finalRate = Math.min(successRate, 1.0)
    console.log(`[CookingSystem] finalRate=${finalRate}`)
    return finalRate
  }

  update(deltaTime: number): void {
    // Update active cooking progress
    for (const [playerId, cookingData] of this.activeCooking) {
      // Progress updates are handled by the scheduled timeouts
    }
  }

  serialize(): any {
    return {
      activeCooking: Object.fromEntries(this.activeCooking),
    }
  }

  deserialize(data: any): void {
    if (data.activeCooking) {
      this.activeCooking = new Map(Object.entries(data.activeCooking))
    }
  }
}
