/**
 * RuneScape Inventory System Types
 * ================================
 * Complete type definitions for inventory, equipment, and item management
 */

export type ItemType = 
  | 'weapon' | 'armor' | 'consumable' | 'material' | 'quest' 
  | 'tool' | 'rune' | 'ammunition' | 'misc';

export type EquipmentSlot = 
  | 'head' | 'cape' | 'amulet' | 'weapon' | 'body' | 'shield' 
  | 'legs' | 'gloves' | 'boots' | 'ring' | 'ammo';

export type ItemRarity = 'common' | 'uncommon' | 'rare' | 'very_rare' | 'ultra_rare';

export interface ItemDefinition {
  id: number;
  name: string;
  examine: string;
  value: number; // GP value
  
  // Item properties
  stackable: boolean;
  noted: boolean;
  tradeable: boolean;
  equipable: boolean;
  edible: boolean;
  
  // Physical properties
  weight: number; // kg
  
  // Requirements
  requirements?: {
    skills?: Partial<Record<string, number>>;
    quests?: string[];
    other?: string[];
  };
  
  // Item type and category
  type: ItemType;
  category?: string;
  rarity: ItemRarity;
  
  // Equipment specific
  equipmentSlot?: EquipmentSlot;
  weaponType?: 'melee' | 'ranged' | 'magic';
  
  // Combat bonuses (for equipment)
  combatBonuses?: {
    attackStab: number;
    attackSlash: number;
    attackCrush: number;
    attackMagic: number;
    attackRanged: number;
    defenseStab: number;
    defenseSlash: number;
    defenseCrush: number;
    defenseMagic: number;
    defenseRanged: number;
    meleeStrength: number;
    rangedStrength: number;
    magicDamage: number;
    prayer: number;
  };
  
  // Special properties
  special?: {
    attackSpeed?: number; // For weapons
    healAmount?: number; // For food
    prayerRestore?: number; // For prayer items
    skillBoosts?: Partial<Record<string, number>>; // For potions
    degradable?: boolean; // For barrows, etc.
    charges?: number; // For charged items
  };
}

export interface ItemStack {
  itemId: number;
  quantity: number;
  noted: boolean;
  charges?: number; // For degradable items
}

export interface InventoryComponent {
  items: (ItemStack | null)[]; // 28 slots for standard inventory
  maxSlots: number;
  
  // Equipment slots
  equipment: {
    head: ItemStack | null;
    cape: ItemStack | null;
    amulet: ItemStack | null;
    weapon: ItemStack | null;
    body: ItemStack | null;
    shield: ItemStack | null;
    legs: ItemStack | null;
    gloves: ItemStack | null;
    boots: ItemStack | null;
    ring: ItemStack | null;
    ammo: ItemStack | null;
  };
  
  // Computed values
  totalWeight: number;
  usedSlots: number;
  freeSlots: number;
}

export interface BankComponent {
  items: Map<number, ItemStack>; // itemId -> ItemStack
  maxSlots: number;
  
  // Bank organization
  tabs: BankTab[];
  currentTab: number;
  
  // Search and filters
  searchFilter: string;
  noteMode: boolean; // True = withdraw noted, false = withdraw items
}

export interface BankTab {
  name: string;
  items: number[]; // Array of item IDs in this tab
  icon?: number; // Item ID to use as tab icon
}

export interface DropTable {
  id: string;
  name: string;
  
  // Always dropped items
  alwaysDrops: DropEntry[];
  
  // Main drop table
  mainDrops: DropEntry[];
  
  // Rare drop table access
  rareTableChance: number;
  
  // Conditional drops
  conditionalDrops?: ConditionalDrop[];
}

export interface DropEntry {
  itemId: number;
  minQuantity: number;
  maxQuantity: number;
  weight: number; // Drop weight (higher = more common)
  noted?: boolean;
  
  // Conditions
  requirements?: {
    slayerLevel?: number;
    questCompleted?: string[];
    skills?: Partial<Record<string, number>>;
  };
}

export interface ConditionalDrop {
  condition: DropCondition;
  drops: DropEntry[];
}

export interface DropCondition {
  type: 'quest' | 'skill_level' | 'item_worn' | 'location' | 'time';
  value: any;
  operator?: 'equal' | 'greater' | 'less' | 'contains';
}

export interface ItemTransaction {
  type: 'add' | 'remove' | 'move' | 'equip' | 'unequip';
  itemId: number;
  quantity: number;
  fromSlot?: number;
  toSlot?: number;
  noted?: boolean;
  timestamp: number;
  source?: string; // 'drop', 'shop', 'trade', 'quest', etc.
}

export interface ShopDefinition {
  id: string;
  name: string;
  type: 'general' | 'specialist' | 'player';
  
  // Shop inventory
  stock: ShopItem[];
  
  // Shop properties
  buyMultiplier: number; // Price multiplier when buying from shop
  sellMultiplier: number; // Price multiplier when selling to shop
  
  // Restrictions
  requirements?: {
    skills?: Partial<Record<string, number>>;
    quests?: string[];
    membership?: boolean;
  };
  
  // Restock mechanics
  restockTime: number; // Minutes between restocks
  lastRestock: number;
}

export interface ShopItem {
  itemId: number;
  stock: number; // Current stock amount
  maxStock: number; // Maximum stock
  price: number; // Override price (optional)
  restockAmount: number; // Amount restocked each cycle
}

// Constants
export const INVENTORY_CONSTANTS = {
  STANDARD_SLOTS: 28,
  MAX_BANK_SLOTS: 816, // F2P: 400, Members: 816
  MAX_STACK_SIZE: 2147483647, // Integer max
  EQUIPMENT_SLOTS: 11,
  BANK_TABS: 10,
  
  // Weight limits (affects run energy)
  WEIGHT_LIMIT_WALK: 64, // kg
  
  // Special slots
  COINS_ID: 995,
  NOTED_FLAG: 1000000, // Add to item ID for noted version
} as const;

// Utility interfaces
export interface InventoryOperationResult {
  success: boolean;
  error?: string;
  itemsAffected?: ItemStack[];
  slotsUsed?: number[];
}

export interface EquipmentRequirements {
  attack?: number;
  strength?: number;
  defence?: number;
  ranged?: number;
  magic?: number;
  prayer?: number;
  slayer?: number;
  
  // Quest requirements
  quests?: string[];
  
  // Other requirements
  membership?: boolean;
  special?: string[];
}

export interface ItemEffect {
  type: 'heal' | 'boost' | 'restore' | 'damage' | 'teleport' | 'other';
  value: number | string;
  duration?: number; // For temporary effects
  skills?: string[]; // Which skills are affected
}