/**
 * RuneScape Gathering Skills Types
 * ================================
 * Complete type definitions for Mining, Fishing, Woodcutting, and Hunter
 */

export type GatheringSkill = 'mining' | 'fishing' | 'woodcutting' | 'hunter';

// Mining System Types
export interface MiningRock {
  id: string;
  name: string;
  oreId: number; // Item ID of the ore
  level: number; // Required mining level
  xp: number; // XP gained per ore
  respawnTime: number; // Time in seconds to respawn
  
  // Rock properties
  rockType: 'normal' | 'members' | 'special';
  maxHits?: number; // For some rocks that have limited hits
  
  // Location and spawning
  locations: RockLocation[];
  
  // Success rate calculation
  baseSuccessRate: number; // Base chance to get ore
  pickaxeMultiplier: boolean; // Whether pickaxe affects success rate
}

export interface RockLocation {
  worldId: string;
  position: { x: number; y: number; z: number };
  region: string; // e.g., "Lumbridge", "Varrock", "Al Kharid"
  area: string; // Specific area name
  members: boolean;
}

export interface MiningNode {
  id: string;
  rockId: string;
  position: { x: number; y: number; z: number };
  
  // State
  depleted: boolean;
  lastMined: number;
  respawnAt: number;
  
  // Visual state
  model: string; // 3D model reference
  texture: string; // Texture for different states
}

// Fishing System Types
export interface FishingSpot {
  id: string;
  name: string;
  fishTypes: FishType[];
  level: number; // Required fishing level
  
  // Tool requirements
  requiredTool: 'net' | 'rod' | 'harpoon' | 'cage' | 'bait';
  baitRequired?: number; // Item ID of required bait
  
  // Location
  locations: SpotLocation[];
  
  // Mechanics
  catchRate: number; // Base catch rate
  moveChance: number; // Chance spot moves after catch
  depleteChance: number; // Chance spot depletes temporarily
}

export interface FishType {
  itemId: number; // Fish item ID
  name: string;
  level: number; // Required level
  xp: number; // XP per fish
  weight: number; // Probability weight in the spot
  cookingLevel?: number; // Level needed to cook
  healAmount?: number; // HP healed when cooked
}

export interface SpotLocation {
  worldId: string;
  position: { x: number; y: number; z: number };
  region: string;
  waterType: 'river' | 'sea' | 'lake' | 'special';
  members: boolean;
}

// Woodcutting System Types
export interface Tree {
  id: string;
  name: string;
  logId: number; // Item ID of the log
  level: number; // Required woodcutting level
  xp: number; // XP per log
  
  // Tree properties
  treeType: 'normal' | 'fruit' | 'special';
  chopTime: number; // Base time to chop in ticks
  respawnTime: number; // Time to regrow
  
  // Special properties
  fruitId?: number; // For fruit trees
  specialDrops?: SpecialDrop[];
  
  // Locations
  locations: TreeLocation[];
}

export interface TreeLocation {
  worldId: string;
  position: { x: number; y: number; z: number };
  region: string;
  forestType: string;
  members: boolean;
  quantity: number; // Number of trees in this location
}

export interface TreeNode {
  id: string;
  treeId: string;
  position: { x: number; y: number; z: number };
  
  // State
  chopped: boolean;
  lastChopped: number;
  regrowAt: number;
  
  // Growth stage for fruit trees
  growthStage?: number;
  maxStage?: number;
}

// Hunter System Types
export interface HunterCreature {
  id: string;
  name: string;
  level: number; // Required hunter level
  xp: number; // XP per catch
  
  // Hunting method
  method: 'trap' | 'net' | 'pitfall' | 'falconry' | 'tracking';
  requiredItems: number[]; // Item IDs needed
  
  // Catch properties
  catchRate: number;
  escapeChance: number;
  
  // Rewards
  primaryLoot: number; // Main item ID
  secondaryLoot?: HunterLoot[];
  
  // Behavior
  roamRadius: number; // How far creature moves
  spawnLocations: CreatureLocation[];
}

export interface HunterLoot {
  itemId: number;
  quantity: { min: number; max: number };
  chance: number; // 0-1 probability
}

export interface CreatureLocation {
  worldId: string;
  position: { x: number; y: number; z: number };
  region: string;
  habitat: string;
  members: boolean;
  spawnCount: number; // How many spawn here
}

// Shared Types
export interface SpecialDrop {
  itemId: number;
  chance: number; // 1 in X chance
  quantity: { min: number; max: number };
  levelRequirement?: number;
}

export interface Tool {
  itemId: number;
  name: string;
  skill: GatheringSkill;
  level: number; // Level requirement
  
  // Efficiency
  speedMultiplier: number; // How much faster gathering is
  successBonus: number; // Bonus to success rate
  
  // Special properties
  special?: {
    alwaysSuccess?: boolean; // Dragon pickaxe special, etc.
    bonusXp?: number; // Extra XP percentage
    extraYield?: number; // Chance for extra resources
  };
}

export interface GatheringAction {
  playerId: string;
  skill: GatheringSkill;
  nodeId: string; // ID of the resource node
  tool?: Tool;
  
  // Action state
  startTime: number;
  duration: number; // How long the action takes
  attempts: number; // Number of gathering attempts
  
  // Results
  itemsGained: { itemId: number; quantity: number }[];
  xpGained: number;
  
  // Success tracking
  successRate: number;
  lastAttempt: number;
}

export interface ResourceNode {
  id: string;
  type: 'mining' | 'fishing' | 'woodcutting' | 'hunter';
  resourceId: string; // References the specific resource
  position: { x: number; y: number; z: number };
  
  // State management
  depleted: boolean;
  respawnTime: number;
  lastHarvested: number;
  
  // Visual representation
  model: string;
  currentState: 'available' | 'depleted' | 'respawning';
  
  // Activity tracking
  activeHarvesters: string[]; // Player IDs currently using this node
  harvestCount: number; // Total times harvested
}

// Gathering Constants
export const GATHERING_CONSTANTS = {
  // Base gathering times (in ticks, 1 tick = 0.6s)
  BASE_MINING_TIME: 4,
  BASE_FISHING_TIME: 5,
  BASE_WOODCUTTING_TIME: 3,
  BASE_HUNTER_TIME: 10,
  
  // Success rate calculations
  LEVEL_SUCCESS_BONUS: 0.01, // 1% per level above requirement
  TOOL_SUCCESS_BONUS: 0.1, // 10% bonus for having proper tool
  
  // XP multipliers
  BASE_XP_MULTIPLIER: 1.0,
  BONUS_XP_MULTIPLIER: 1.1, // For special events/tools
  
  // Respawn timers (in seconds)
  COPPER_RESPAWN: 3,
  IRON_RESPAWN: 6,
  COAL_RESPAWN: 42,
  MITHRIL_RESPAWN: 120,
  ADAMANT_RESPAWN: 240,
  RUNITE_RESPAWN: 720,
  
  // Tree respawn times
  NORMAL_TREE_RESPAWN: 30,
  OAK_RESPAWN: 45,
  WILLOW_RESPAWN: 60,
  MAPLE_RESPAWN: 90,
  YEW_RESPAWN: 120,
  MAGIC_RESPAWN: 300,
  
  // Fishing spot mechanics
  SPOT_MOVE_CHANCE: 0.1, // 10% chance spot moves after catch
  SPOT_DEPLETE_TIME: 180, // 3 minutes to respawn
  
  // Hunter mechanics
  TRAP_DURATION: 60, // 1 minute before trap needs checking
  CREATURE_ROAM_TIME: 30, // 30 seconds between movements
  
} as const;

export interface GatheringSystemConfig {
  enableRandomEvents: boolean;
  xpMultiplier: number;
  respawnMultiplier: number;
  enableSpecialDrops: boolean;
  maxSimultaneousActions: number;
}