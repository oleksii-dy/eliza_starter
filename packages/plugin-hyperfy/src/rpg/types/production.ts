/**
 * RuneScape Production Skills Types
 * ================================
 * Complete type definitions for Smithing, Cooking, Crafting, Fletching, Herblore, and Runecrafting
 */

export type ProductionSkill = 'smithing' | 'cooking' | 'crafting' | 'fletching' | 'herblore' | 'runecrafting';

// Smithing System Types
export interface SmeltingRecipe {
  id: string;
  name: string;
  level: number; // Required smithing level
  xp: number; // XP gained per item
  
  // Ingredients
  ingredients: Array<{
    itemId: number;
    quantity: number;
  }>;
  
  // Output
  outputItem: number; // Item ID of produced item
  outputQuantity: number;
  
  // Categories
  category: 'smelting';
}

export interface SmithingRecipe {
  id: string;
  name: string;
  level: number; // Required smithing level
  xp: number; // XP gained per item
  
  // Ingredients (usually bars)
  ingredients: Array<{
    itemId: number;
    quantity: number;
  }>;
  
  // Output
  outputItem: number; // Item ID of produced item
  outputQuantity: number;
  
  // Categories
  category: 'weapons' | 'armour' | 'tools' | 'ammunition';
}

// Cooking System Types
export interface CookingRecipe {
  id: string;
  name: string;
  level: number; // Required cooking level
  xp: number; // XP gained per item
  
  // Raw ingredient
  rawItem: number; // Raw food item ID
  
  // Output
  cookedItem: number; // Cooked food item ID
  burntItem: number; // Burnt food item ID
  
  // Cooking properties
  burnLevel: number; // Level where burning becomes less likely
  healAmount: number; // HP healed when eaten
  
  // Cooking methods
  methods: Array<'fire' | 'range' | 'furnace'>;
}

// Crafting System Types
export interface CraftingRecipe {
  id: string;
  name: string;
  level: number; // Required crafting level
  xp: number; // XP gained per item
  
  // Ingredients
  ingredients: Array<{
    itemId: number;
    quantity: number;
  }>;
  
  // Output
  outputItem: number;
  outputQuantity: number;
  
  // Tools required
  requiredTools?: number[]; // Item IDs of required tools
  
  // Categories
  category: 'leather' | 'pottery' | 'jewelry' | 'spinning' | 'weaving' | 'glassblowing';
}

// Fletching System Types
export interface FletchingRecipe {
  id: string;
  name: string;
  level: number; // Required fletching level
  xp: number; // XP gained per item
  
  // Primary material
  primaryItem: number; // Log, bow string, etc.
  
  // Secondary material (optional)
  secondaryItem?: number; // Arrow heads, bow string, etc.
  
  // Output
  outputItem: number;
  outputQuantity: number;
  
  // Tools required
  requiredTools: number[]; // Usually knife, chisel
  
  // Categories
  category: 'bows' | 'arrows' | 'bolts' | 'darts';
}

// Herblore System Types
export interface HerbloreRecipe {
  id: string;
  name: string;
  level: number; // Required herblore level
  xp: number; // XP gained per item
  
  // Primary ingredient (clean herb)
  primaryHerb: number;
  
  // Secondary ingredient
  secondaryIngredient: number;
  
  // Output
  outputItem: number; // Finished potion
  
  // Potion properties
  effect: PotionEffect;
  duration: number; // Effect duration in seconds
  
  // Categories
  category: 'attack' | 'strength' | 'defence' | 'ranging' | 'magic' | 'prayer' | 'skill' | 'combat' | 'antipoison' | 'restore';
}

export interface PotionEffect {
  type: 'boost' | 'restore' | 'protect' | 'cure';
  skill?: string; // Skill affected (for boosts)
  amount: number; // Boost/restore amount
  percentage?: boolean; // If boost is percentage-based
}

// Runecrafting System Types
export interface RunecraftingRecipe {
  id: string;
  name: string;
  level: number; // Required runecrafting level
  xp: number; // XP gained per rune
  
  // Requirements
  essenceType: 'rune' | 'pure'; // Type of essence required
  altarId: string; // Altar identifier
  
  // Output
  outputItem: number; // Rune item ID
  
  // Multiple rune levels (level -> quantity mapping)
  multipleRuneLevels?: Array<[number, number]>; // [level, quantity] pairs
  
  // Special requirements
  requiredTalisman?: number; // Required talisman item ID
  accessRequirement?: string; // Special access requirements
}

// Shared Production Types
export interface ProductionAction {
  playerId: string;
  skill: ProductionSkill;
  recipeId: string;
  stationId?: string; // Furnace, range, altar, etc.
  
  // Action state
  startTime: number;
  duration: number; // Total duration for all items
  quantity: number; // Number of items to produce
  completed: number; // Number completed so far
  
  // Results
  itemsProduced: Array<{ itemId: number; quantity: number }>;
  xpGained: number;
  
  // Progress tracking
  lastProduction: number; // Time of last item produced
}

export interface ProductionStation {
  id: string;
  type: 'furnace' | 'anvil' | 'range' | 'potter_wheel' | 'spinning_wheel' | 'loom' | 'altar';
  position: { x: number; y: number; z: number };
  inUse: boolean;
  userId: string | null;
  
  // Special properties
  fuelLevel?: number; // For ranges and furnaces
  fuelType?: number; // Item ID of fuel being used
}

// Production Constants
export const PRODUCTION_CONSTANTS = {
  // Base production times (in milliseconds)
  BASE_SMELTING_TIME: 3000,
  BASE_SMITHING_TIME: 2500,
  BASE_COOKING_TIME: 2000,
  BASE_CRAFTING_TIME: 3000,
  BASE_FLETCHING_TIME: 1500,
  BASE_HERBLORE_TIME: 2000,
  BASE_RUNECRAFTING_TIME: 4000,
  
  // XP multipliers
  PRODUCTION_XP_MULTIPLIER: 1.0,
  BONUS_XP_MULTIPLIER: 1.1,
  
  // Burn rates (cooking)
  BURN_REDUCTION_PER_LEVEL: 0.02, // 2% per level above requirement
  MIN_BURN_CHANCE: 0.01, // 1% minimum burn chance
  MAX_BURN_CHANCE: 0.5, // 50% maximum burn chance
  
  // Production batch sizes
  MAX_BATCH_SIZE: 28, // Maximum items per batch (inventory limit)
  
  // Success rates
  BASE_SUCCESS_RATE: 0.8,
  LEVEL_SUCCESS_BONUS: 0.01, // 1% per level above requirement
  
} as const;

export interface ProductionSystemConfig {
  enableBatching: boolean;
  xpMultiplier: number;
  productionSpeedMultiplier: number;
  enableBurning: boolean; // For cooking
  enableFailures: boolean; // For other skills
}