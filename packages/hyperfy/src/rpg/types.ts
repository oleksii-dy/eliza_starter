/**
 * RPG System Types
 */

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface Quaternion {
  x: number;
  y: number;
  z: number;
  w: number;
}

// Combat Types
export enum CombatStyle {
  ACCURATE = 'accurate',
  AGGRESSIVE = 'aggressive',
  DEFENSIVE = 'defensive',
  CONTROLLED = 'controlled'
}

export enum AttackType {
  MELEE = 'melee',
  RANGED = 'ranged',
  MAGIC = 'magic'
}

export enum WeaponType {
  SWORD = 'sword',
  BOW = 'bow',
  STAFF = 'staff',
  DAGGER = 'dagger',
  AXE = 'axe',
  MACE = 'mace',
  SPEAR = 'spear',
  CROSSBOW = 'crossbow'
}

export enum EquipmentSlot {
  HEAD = 'head',
  BODY = 'body',
  LEGS = 'legs',
  FEET = 'feet',
  HANDS = 'hands',
  CAPE = 'cape',
  NECK = 'neck',
  RING = 'ring',
  WEAPON = 'weapon',
  SHIELD = 'shield',
  AMMUNITION = 'ammunition'
}

// NPC Types
export enum NPCType {
  GOBLIN = 'goblin',
  SKELETON = 'skeleton',
  GUARD = 'guard',
  MERCHANT = 'merchant',
  QUEST_GIVER = 'quest_giver',
  HILL_GIANT = 'hill_giant'
}

export enum NPCBehavior {
  PASSIVE = 'passive',
  AGGRESSIVE = 'aggressive',
  NEUTRAL = 'neutral',
  DEFENSIVE = 'defensive'
}

export enum NPCState {
  IDLE = 'idle',
  WANDERING = 'wandering',
  FOLLOWING = 'following',
  ATTACKING = 'attacking',
  FLEEING = 'fleeing',
  DEAD = 'dead'
}

// Spawning Types
export enum SpawnerType {
  SINGLE = 'single',
  MULTIPLE = 'multiple',
  AREA = 'area',
  RANDOM = 'random'
}

// Construction Types
export enum RoomType {
  PARLOUR = 'parlour',
  KITCHEN = 'kitchen',
  DINING_ROOM = 'dining_room',
  WORKSHOP = 'workshop',
  BEDROOM = 'bedroom',
  SKILL_HALL = 'skill_hall',
  GAMES_ROOM = 'games_room',
  COMBAT_ROOM = 'combat_room',
  QUEST_HALL = 'quest_hall',
  MENAGERIE = 'menagerie',
  STUDY = 'study',
  COSTUME_ROOM = 'costume_room',
  CHAPEL = 'chapel',
  PORTAL_CHAMBER = 'portal_chamber',
  FORMAL_GARDEN = 'formal_garden',
  THRONE_ROOM = 'throne_room',
  OUBLIETTE = 'oubliette',
  DUNGEON = 'dungeon',
  TREASURE_ROOM = 'treasure_room'
}

export enum HotspotType {
  CHAIR = 'chair',
  TABLE = 'table',
  BOOKSHELF = 'bookshelf',
  FIREPLACE = 'fireplace',
  BED = 'bed',
  WARDROBE = 'wardrobe',
  CARPET = 'carpet',
  DECORATION = 'decoration'
}

// Grand Exchange Types
export enum OfferType {
  BUY = 'buy',
  SELL = 'sell'
}

export enum OfferStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  PARTIAL = 'partial'
}

// Clan Types
export enum ClanRank {
  GUEST = 'guest',
  RECRUIT = 'recruit',
  CORPORAL = 'corporal',
  SERGEANT = 'sergeant',
  LIEUTENANT = 'lieutenant',
  CAPTAIN = 'captain',
  GENERAL = 'general',
  OWNER = 'owner'
}

// Minigame Types
export enum MinigameType {
  CASTLE_WARS = 'castle_wars',
  PEST_CONTROL = 'pest_control',
  BARBARIAN_ASSAULT = 'barbarian_assault',
  TROUBLE_BREWING = 'trouble_brewing',
  FISHING_TRAWLER = 'fishing_trawler'
}

export enum MinigameStatus {
  WAITING = 'waiting',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  ABORTED = 'aborted'
}

// Death System Types
export enum GravestoneTier {
  BASIC = 'basic',
  GRANITE = 'granite',
  MARBLE = 'marble',
  PREMIUM = 'premium'
}

// Component Interfaces
export interface Component {
  type: string;
  entity: any;
  data: any;
}

export interface StatsComponent extends Component {
  hitpoints: { current: number; max: number };
  attack: { level: number; xp: number };
  strength: { level: number; xp: number };
  defence: { level: number; xp: number };
  ranged: { level: number; xp: number };
  magic: { level: number; xp: number };
  prayer: { level: number; xp: number };
  combatLevel: number;
}

export interface CombatComponent extends Component {
  inCombat: boolean;
  target: any | null;
  lastAttackTime: number;
  attackSpeed: number;
  combatStyle: CombatStyle;
  autoRetaliate: boolean;
  hitSplatQueue: any[];
  animationQueue: any[];
  specialAttackEnergy: number;
  specialAttackActive: boolean;
  protectionPrayers: {
    melee: boolean;
    ranged: boolean;
    magic: boolean;
  };
}

export interface InventoryComponent extends Component {
  items: (InventoryItem | null)[];
  capacity: number;
}

export interface PlayerStats {
  hitpoints: { current: number; max: number };
  attack: { level: number; xp: number };
  strength: { level: number; xp: number };
  defence: { level: number; xp: number };
  ranged?: { level: number; xp: number };
  magic?: { level: number; xp: number };
  prayer?: { level: number; xp: number };
  combatLevel?: number;
}

export interface InventoryItem {
  itemId: number;
  itemType: string;
  quantity: number;
  stackable: boolean;
}

export interface BankAccount {
  accountNumber: string;
  balance: number;
  pin?: string;
}

export interface NPCDefinition {
  npcId: number;
  name: string;
  combatLevel: number;
  maxHitpoints: number;
  behavior: NPCBehavior;
  lootTable: number[];
  spawnPosition: Vector3;
  respawnTime: number;
  aggroRadius: number;
  wanderRadius: number;
}

export interface ItemDefinition {
  itemId: number;
  name: string;
  stackable: boolean;
  tradeable: boolean;
  equipSlot?: EquipmentSlot;
  value: number;
}

export interface TriggerZone {
  id: string;
  position: Vector3;
  size: Vector3;
  action?: string;
  data?: any;
}

export interface BuildingConfig {
  id: string;
  name: string;
  position: Vector3;
  size: Vector3;
  color: string;
  triggerZones?: TriggerZone[];
  interactionType?: 'bank' | 'shop' | 'building';
}

export interface VisualConfig {
  color?: string;
  size?: { width: number; height: number; depth: number };
  animation?: string;
}
