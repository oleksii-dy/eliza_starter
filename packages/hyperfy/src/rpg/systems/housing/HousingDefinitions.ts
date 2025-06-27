/**
 * Housing Definitions - RuneScape-style Player-Owned House construction
 * Defines rooms, furniture, decorations, and building materials
 */

import { SkillType } from '../skills/SkillDefinitions'

export enum RoomType {
  GARDEN = 'garden',
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
  TREASURE_ROOM = 'treasure_room',
}

export enum FurnitureCategory {
  CHAIRS = 'chairs',
  TABLES = 'tables',
  DECORATION = 'decoration',
  LIGHTING = 'lighting',
  STORAGE = 'storage',
  FUNCTIONAL = 'functional',
  COMBAT = 'combat',
  SKILL = 'skill',
  MAGIC = 'magic',
  TROPHY = 'trophy',
}

export enum HouseStyle {
  BASIC_WOOD = 'basic_wood',
  BASIC_STONE = 'basic_stone',
  WHITEWASHED_STONE = 'whitewashed_stone',
  FREMENNIK_WOOD = 'fremennik_wood',
  TROPICAL_WOOD = 'tropical_wood',
  FANCY_STONE = 'fancy_stone',
  DARKMEYER = 'darkmeyer',
}

export interface BuildingRequirement {
  skillType: SkillType
  level: number
  materials: { itemId: string; quantity: number }[]
  cost?: number // Butler service cost
}

export interface FurnitureDefinition {
  id: string
  name: string
  description: string
  category: FurnitureCategory
  allowedRooms: RoomType[]
  requirements: BuildingRequirement

  // Functionality
  interactions?: string[] // What players can do with this furniture
  storage?: {
    capacity: number
    allowedItems?: string[] // Specific items or categories
  }
  teleports?: string[] // Portal destinations

  // Appearance
  modelId?: string
  placementSize: { width: number; height: number }
  rotatable: boolean

  // Special properties
  provides?: string[] // Buffs, services, or features this furniture provides
  experience: number // XP gained when building
}

export interface RoomDefinition {
  id: RoomType
  name: string
  description: string
  requirements: BuildingRequirement

  // Room properties
  size: { width: number; height: number }
  maxFurniture: number
  allowedFurniture: FurnitureCategory[]
  specialFeatures?: string[]

  // Upgrade path
  upgradeFrom?: RoomType
  upgradeTo?: RoomType[]
}

export interface HouseStyleDefinition {
  id: HouseStyle
  name: string
  description: string
  requirements: BuildingRequirement

  // Style properties
  exteriorModel: string
  interiorTextures: string[]
  cost: number

  // Unlocks
  unlocks?: string[]
}

// Room Definitions
export const ROOM_DEFINITIONS: { [key in RoomType]: RoomDefinition } = {
  [RoomType.GARDEN]: {
    id: RoomType.GARDEN,
    name: 'Garden',
    description: 'A basic outdoor space for your house entrance and decorations.',
    requirements: {
      skillType: SkillType.CONSTRUCTION,
      level: 1,
      materials: [
        { itemId: 'plank', quantity: 10 },
        { itemId: 'nails', quantity: 40 },
      ],
    },
    size: { width: 8, height: 8 },
    maxFurniture: 12,
    allowedFurniture: [FurnitureCategory.DECORATION, FurnitureCategory.LIGHTING],
    specialFeatures: ['house_entrance', 'pet_access'],
  },

  [RoomType.PARLOUR]: {
    id: RoomType.PARLOUR,
    name: 'Parlour',
    description: 'A comfortable sitting room for relaxation and socializing.',
    requirements: {
      skillType: SkillType.CONSTRUCTION,
      level: 1,
      materials: [
        { itemId: 'plank', quantity: 15 },
        { itemId: 'nails', quantity: 60 },
      ],
    },
    size: { width: 6, height: 6 },
    maxFurniture: 8,
    allowedFurniture: [
      FurnitureCategory.CHAIRS,
      FurnitureCategory.TABLES,
      FurnitureCategory.DECORATION,
      FurnitureCategory.LIGHTING,
    ],
  },

  [RoomType.KITCHEN]: {
    id: RoomType.KITCHEN,
    name: 'Kitchen',
    description: 'A cooking area with ranges, larders, and food preparation equipment.',
    requirements: {
      skillType: SkillType.CONSTRUCTION,
      level: 5,
      materials: [
        { itemId: 'plank', quantity: 20 },
        { itemId: 'steel_bar', quantity: 5 },
        { itemId: 'nails', quantity: 80 },
      ],
    },
    size: { width: 6, height: 6 },
    maxFurniture: 10,
    allowedFurniture: [FurnitureCategory.FUNCTIONAL, FurnitureCategory.STORAGE, FurnitureCategory.LIGHTING],
    specialFeatures: ['cooking_bonus'],
  },

  [RoomType.DINING_ROOM]: {
    id: RoomType.DINING_ROOM,
    name: 'Dining Room',
    description: 'An elegant space for formal meals and entertaining guests.',
    requirements: {
      skillType: SkillType.CONSTRUCTION,
      level: 10,
      materials: [
        { itemId: 'oak_plank', quantity: 15 },
        { itemId: 'nails', quantity: 60 },
        { itemId: 'bolt_of_cloth', quantity: 3 },
      ],
    },
    size: { width: 7, height: 7 },
    maxFurniture: 12,
    allowedFurniture: [
      FurnitureCategory.TABLES,
      FurnitureCategory.CHAIRS,
      FurnitureCategory.DECORATION,
      FurnitureCategory.LIGHTING,
    ],
    specialFeatures: ['food_healing_bonus'],
  },

  [RoomType.WORKSHOP]: {
    id: RoomType.WORKSHOP,
    name: 'Workshop',
    description: 'A crafting space with tools and workbenches for various skills.',
    requirements: {
      skillType: SkillType.CONSTRUCTION,
      level: 15,
      materials: [
        { itemId: 'oak_plank', quantity: 25 },
        { itemId: 'steel_bar', quantity: 10 },
        { itemId: 'nails', quantity: 100 },
      ],
    },
    size: { width: 8, height: 6 },
    maxFurniture: 15,
    allowedFurniture: [FurnitureCategory.SKILL, FurnitureCategory.STORAGE, FurnitureCategory.FUNCTIONAL],
    specialFeatures: ['crafting_bonus', 'smithing_access'],
  },

  [RoomType.BEDROOM]: {
    id: RoomType.BEDROOM,
    name: 'Bedroom',
    description: 'A private sleeping area with beds and personal storage.',
    requirements: {
      skillType: SkillType.CONSTRUCTION,
      level: 20,
      materials: [
        { itemId: 'oak_plank', quantity: 20 },
        { itemId: 'soft_clay', quantity: 5 },
        { itemId: 'bolt_of_cloth', quantity: 8 },
      ],
    },
    size: { width: 6, height: 6 },
    maxFurniture: 8,
    allowedFurniture: [FurnitureCategory.STORAGE, FurnitureCategory.DECORATION, FurnitureCategory.LIGHTING],
    specialFeatures: ['rest_bonus', 'costume_storage'],
  },

  [RoomType.SKILL_HALL]: {
    id: RoomType.SKILL_HALL,
    name: 'Skill Hall',
    description: 'A dedicated training area for combat and skill practice.',
    requirements: {
      skillType: SkillType.CONSTRUCTION,
      level: 25,
      materials: [
        { itemId: 'teak_plank', quantity: 20 },
        { itemId: 'steel_bar', quantity: 15 },
        { itemId: 'nails', quantity: 80 },
      ],
    },
    size: { width: 9, height: 9 },
    maxFurniture: 20,
    allowedFurniture: [FurnitureCategory.SKILL, FurnitureCategory.COMBAT, FurnitureCategory.TROPHY],
    specialFeatures: ['skill_training_bonus'],
  },

  [RoomType.GAMES_ROOM]: {
    id: RoomType.GAMES_ROOM,
    name: 'Games Room',
    description: 'An entertainment area with games and recreational activities.',
    requirements: {
      skillType: SkillType.CONSTRUCTION,
      level: 30,
      materials: [
        { itemId: 'teak_plank', quantity: 25 },
        { itemId: 'marble_block', quantity: 2 },
        { itemId: 'gold_leaf', quantity: 1 },
      ],
    },
    size: { width: 8, height: 8 },
    maxFurniture: 12,
    allowedFurniture: [FurnitureCategory.FUNCTIONAL, FurnitureCategory.DECORATION],
    specialFeatures: ['minigames', 'social_activities'],
  },

  [RoomType.COMBAT_ROOM]: {
    id: RoomType.COMBAT_ROOM,
    name: 'Combat Room',
    description: 'A training facility for combat skills with dummies and equipment.',
    requirements: {
      skillType: SkillType.CONSTRUCTION,
      level: 32,
      materials: [
        { itemId: 'teak_plank', quantity: 30 },
        { itemId: 'steel_bar', quantity: 20 },
        { itemId: 'leather', quantity: 10 },
      ],
    },
    size: { width: 9, height: 7 },
    maxFurniture: 15,
    allowedFurniture: [FurnitureCategory.COMBAT, FurnitureCategory.STORAGE],
    specialFeatures: ['combat_training', 'weapon_storage'],
  },

  [RoomType.QUEST_HALL]: {
    id: RoomType.QUEST_HALL,
    name: 'Quest Hall',
    description: 'A hall displaying quest achievements and trophies.',
    requirements: {
      skillType: SkillType.CONSTRUCTION,
      level: 35,
      materials: [
        { itemId: 'teak_plank', quantity: 35 },
        { itemId: 'marble_block', quantity: 5 },
        { itemId: 'gold_leaf', quantity: 2 },
      ],
    },
    size: { width: 9, height: 9 },
    maxFurniture: 25,
    allowedFurniture: [FurnitureCategory.TROPHY, FurnitureCategory.DECORATION],
    specialFeatures: ['quest_tracking', 'achievement_display'],
  },

  [RoomType.MENAGERIE]: {
    id: RoomType.MENAGERIE,
    name: 'Menagerie',
    description: 'A habitat for pets and creatures to roam freely.',
    requirements: {
      skillType: SkillType.CONSTRUCTION,
      level: 37,
      materials: [
        { itemId: 'teak_plank', quantity: 30 },
        { itemId: 'steel_bar', quantity: 10 },
        { itemId: 'pet_food', quantity: 20 },
      ],
    },
    size: { width: 8, height: 8 },
    maxFurniture: 10,
    allowedFurniture: [FurnitureCategory.FUNCTIONAL, FurnitureCategory.DECORATION],
    specialFeatures: ['pet_happiness_bonus', 'pet_interaction'],
  },

  [RoomType.STUDY]: {
    id: RoomType.STUDY,
    name: 'Study',
    description: 'A scholarly room for reading, research, and magical studies.',
    requirements: {
      skillType: SkillType.CONSTRUCTION,
      level: 40,
      materials: [
        { itemId: 'mahogany_plank', quantity: 20 },
        { itemId: 'marble_block', quantity: 3 },
        { itemId: 'gold_leaf', quantity: 2 },
      ],
    },
    size: { width: 7, height: 7 },
    maxFurniture: 12,
    allowedFurniture: [FurnitureCategory.STORAGE, FurnitureCategory.MAGIC, FurnitureCategory.LIGHTING],
    specialFeatures: ['magic_bonus', 'spell_research'],
  },

  [RoomType.COSTUME_ROOM]: {
    id: RoomType.COSTUME_ROOM,
    name: 'Costume Room',
    description: 'Storage for special outfits, armor sets, and cosmetic items.',
    requirements: {
      skillType: SkillType.CONSTRUCTION,
      level: 42,
      materials: [
        { itemId: 'mahogany_plank', quantity: 25 },
        { itemId: 'marble_block', quantity: 4 },
        { itemId: 'bolt_of_cloth', quantity: 15 },
      ],
    },
    size: { width: 8, height: 6 },
    maxFurniture: 18,
    allowedFurniture: [FurnitureCategory.STORAGE],
    specialFeatures: ['costume_storage', 'outfit_management'],
  },

  [RoomType.CHAPEL]: {
    id: RoomType.CHAPEL,
    name: 'Chapel',
    description: 'A sacred space for prayer and spiritual activities.',
    requirements: {
      skillType: SkillType.CONSTRUCTION,
      level: 45,
      materials: [
        { itemId: 'mahogany_plank', quantity: 30 },
        { itemId: 'marble_block', quantity: 10 },
        { itemId: 'gold_leaf', quantity: 5 },
      ],
    },
    size: { width: 8, height: 8 },
    maxFurniture: 15,
    allowedFurniture: [FurnitureCategory.DECORATION, FurnitureCategory.LIGHTING, FurnitureCategory.MAGIC],
    specialFeatures: ['prayer_bonus', 'altar_access'],
  },

  [RoomType.PORTAL_CHAMBER]: {
    id: RoomType.PORTAL_CHAMBER,
    name: 'Portal Chamber',
    description: 'A magical room with teleportation portals to various locations.',
    requirements: {
      skillType: SkillType.CONSTRUCTION,
      level: 50,
      materials: [
        { itemId: 'mahogany_plank', quantity: 40 },
        { itemId: 'marble_block', quantity: 8 },
        { itemId: 'magic_stone', quantity: 3 },
      ],
    },
    size: { width: 9, height: 7 },
    maxFurniture: 12,
    allowedFurniture: [FurnitureCategory.MAGIC],
    specialFeatures: ['teleportation', 'portal_network'],
  },

  [RoomType.FORMAL_GARDEN]: {
    id: RoomType.FORMAL_GARDEN,
    name: 'Formal Garden',
    description: 'An elegant outdoor space with fountains and ornate decorations.',
    requirements: {
      skillType: SkillType.CONSTRUCTION,
      level: 55,
      materials: [
        { itemId: 'limestone_brick', quantity: 50 },
        { itemId: 'marble_block', quantity: 15 },
        { itemId: 'gold_leaf', quantity: 8 },
      ],
    },
    size: { width: 10, height: 10 },
    maxFurniture: 20,
    allowedFurniture: [FurnitureCategory.DECORATION, FurnitureCategory.LIGHTING],
    specialFeatures: ['prestige_bonus', 'formal_entertaining'],
  },

  [RoomType.THRONE_ROOM]: {
    id: RoomType.THRONE_ROOM,
    name: 'Throne Room',
    description: 'A majestic hall demonstrating wealth and power.',
    requirements: {
      skillType: SkillType.CONSTRUCTION,
      level: 60,
      materials: [
        { itemId: 'mahogany_plank', quantity: 50 },
        { itemId: 'marble_block', quantity: 20 },
        { itemId: 'gold_leaf', quantity: 15 },
      ],
      cost: 150000,
    },
    size: { width: 11, height: 11 },
    maxFurniture: 30,
    allowedFurniture: [FurnitureCategory.DECORATION, FurnitureCategory.TROPHY, FurnitureCategory.LIGHTING],
    specialFeatures: ['prestige_display', 'royal_treatment'],
  },

  [RoomType.OUBLIETTE]: {
    id: RoomType.OUBLIETTE,
    name: 'Oubliette',
    description: 'A hidden prison cell beneath your house.',
    requirements: {
      skillType: SkillType.CONSTRUCTION,
      level: 65,
      materials: [
        { itemId: 'limestone_brick', quantity: 30 },
        { itemId: 'steel_bar', quantity: 25 },
        { itemId: 'rope', quantity: 10 },
      ],
    },
    size: { width: 5, height: 5 },
    maxFurniture: 8,
    allowedFurniture: [FurnitureCategory.FUNCTIONAL, FurnitureCategory.DECORATION],
    specialFeatures: ['prisoner_holding', 'torture_chamber'],
  },

  [RoomType.DUNGEON]: {
    id: RoomType.DUNGEON,
    name: 'Dungeon',
    description: 'A underground complex for dangerous activities.',
    requirements: {
      skillType: SkillType.CONSTRUCTION,
      level: 70,
      materials: [
        { itemId: 'limestone_brick', quantity: 60 },
        { itemId: 'steel_bar', quantity: 40 },
        { itemId: 'rope', quantity: 20 },
      ],
    },
    size: { width: 12, height: 8 },
    maxFurniture: 25,
    allowedFurniture: [FurnitureCategory.COMBAT, FurnitureCategory.FUNCTIONAL, FurnitureCategory.STORAGE],
    specialFeatures: ['monster_spawning', 'dangerous_activities'],
  },

  [RoomType.TREASURE_ROOM]: {
    id: RoomType.TREASURE_ROOM,
    name: 'Treasure Room',
    description: 'A secured vault for displaying and storing valuable items.',
    requirements: {
      skillType: SkillType.CONSTRUCTION,
      level: 75,
      materials: [
        { itemId: 'mahogany_plank', quantity: 60 },
        { itemId: 'marble_block', quantity: 25 },
        { itemId: 'gold_leaf', quantity: 20 },
      ],
      cost: 250000,
    },
    size: { width: 9, height: 9 },
    maxFurniture: 20,
    allowedFurniture: [FurnitureCategory.STORAGE, FurnitureCategory.TROPHY, FurnitureCategory.DECORATION],
    specialFeatures: ['valuable_storage', 'wealth_display'],
  },
}

// Furniture Definitions (Sample - would have many more in full implementation)
export const FURNITURE_DEFINITIONS: { [key: string]: FurnitureDefinition } = {
  crude_chair: {
    id: 'crude_chair',
    name: 'Crude Chair',
    description: 'A basic wooden chair made from rough planks.',
    category: FurnitureCategory.CHAIRS,
    allowedRooms: [RoomType.PARLOUR, RoomType.DINING_ROOM, RoomType.KITCHEN],
    requirements: {
      skillType: SkillType.CONSTRUCTION,
      level: 1,
      materials: [
        { itemId: 'plank', quantity: 2 },
        { itemId: 'nails', quantity: 8 },
      ],
    },
    interactions: ['sit'],
    placementSize: { width: 1, height: 1 },
    rotatable: true,
    experience: 17,
  },

  oak_chair: {
    id: 'oak_chair',
    name: 'Oak Chair',
    description: 'A comfortable chair made from quality oak wood.',
    category: FurnitureCategory.CHAIRS,
    allowedRooms: [RoomType.PARLOUR, RoomType.DINING_ROOM, RoomType.STUDY],
    requirements: {
      skillType: SkillType.CONSTRUCTION,
      level: 19,
      materials: [
        { itemId: 'oak_plank', quantity: 2 },
        { itemId: 'nails', quantity: 8 },
      ],
    },
    interactions: ['sit'],
    placementSize: { width: 1, height: 1 },
    rotatable: true,
    provides: ['comfort_bonus'],
    experience: 60,
  },

  cooking_range: {
    id: 'cooking_range',
    name: 'Cooking Range',
    description: 'A kitchen range for cooking food with reduced burn chance.',
    category: FurnitureCategory.FUNCTIONAL,
    allowedRooms: [RoomType.KITCHEN],
    requirements: {
      skillType: SkillType.CONSTRUCTION,
      level: 5,
      materials: [
        { itemId: 'steel_bar', quantity: 4 },
        { itemId: 'plank', quantity: 4 },
        { itemId: 'soft_clay', quantity: 2 },
      ],
    },
    interactions: ['cook'],
    placementSize: { width: 2, height: 1 },
    rotatable: true,
    provides: ['cooking_bonus', 'reduced_burn_chance'],
    experience: 40,
  },

  oak_dining_table: {
    id: 'oak_dining_table',
    name: 'Oak Dining Table',
    description: 'An elegant dining table that seats multiple people.',
    category: FurnitureCategory.TABLES,
    allowedRooms: [RoomType.DINING_ROOM, RoomType.PARLOUR],
    requirements: {
      skillType: SkillType.CONSTRUCTION,
      level: 22,
      materials: [
        { itemId: 'oak_plank', quantity: 4 },
        { itemId: 'nails', quantity: 16 },
        { itemId: 'bolt_of_cloth', quantity: 2 },
      ],
    },
    interactions: ['dine'],
    placementSize: { width: 3, height: 2 },
    rotatable: true,
    provides: ['dining_bonus'],
    experience: 115,
  },

  weapon_rack: {
    id: 'weapon_rack',
    name: 'Weapon Rack',
    description: 'A display rack for storing and showing off weapons.',
    category: FurnitureCategory.STORAGE,
    allowedRooms: [RoomType.COMBAT_ROOM, RoomType.QUEST_HALL, RoomType.SKILL_HALL],
    requirements: {
      skillType: SkillType.CONSTRUCTION,
      level: 34,
      materials: [
        { itemId: 'teak_plank', quantity: 4 },
        { itemId: 'steel_bar', quantity: 2 },
        { itemId: 'nails', quantity: 16 },
      ],
    },
    interactions: ['store_weapon', 'display_weapon'],
    storage: {
      capacity: 6,
      allowedItems: ['weapons'],
    },
    placementSize: { width: 2, height: 1 },
    rotatable: true,
    experience: 145,
  },

  altar: {
    id: 'altar',
    name: 'Altar',
    description: 'A sacred altar for prayer and bone offering.',
    category: FurnitureCategory.MAGIC,
    allowedRooms: [RoomType.CHAPEL],
    requirements: {
      skillType: SkillType.CONSTRUCTION,
      level: 45,
      materials: [
        { itemId: 'marble_block', quantity: 6 },
        { itemId: 'gold_leaf', quantity: 2 },
        { itemId: 'limestone_brick', quantity: 10 },
      ],
    },
    interactions: ['pray', 'offer_bones'],
    placementSize: { width: 2, height: 2 },
    rotatable: false,
    provides: ['prayer_bonus', 'prayer_experience_bonus'],
    experience: 406,
  },

  varrock_portal: {
    id: 'varrock_portal',
    name: 'Varrock Portal',
    description: 'A magical portal providing teleportation to Varrock.',
    category: FurnitureCategory.MAGIC,
    allowedRooms: [RoomType.PORTAL_CHAMBER],
    requirements: {
      skillType: SkillType.CONSTRUCTION,
      level: 50,
      materials: [
        { itemId: 'mahogany_plank', quantity: 10 },
        { itemId: 'marble_block', quantity: 3 },
        { itemId: 'law_rune', quantity: 100 },
      ],
    },
    interactions: ['teleport'],
    teleports: ['varrock'],
    placementSize: { width: 2, height: 2 },
    rotatable: false,
    provides: ['varrock_teleport'],
    experience: 200,
  },

  gilded_throne: {
    id: 'gilded_throne',
    name: 'Gilded Throne',
    description: 'An opulent throne displaying ultimate wealth and power.',
    category: FurnitureCategory.DECORATION,
    allowedRooms: [RoomType.THRONE_ROOM],
    requirements: {
      skillType: SkillType.CONSTRUCTION,
      level: 81,
      materials: [
        { itemId: 'mahogany_plank', quantity: 5 },
        { itemId: 'marble_block', quantity: 2 },
        { itemId: 'gold_leaf', quantity: 8 },
      ],
      cost: 500000,
    },
    interactions: ['sit'],
    placementSize: { width: 2, height: 2 },
    rotatable: true,
    provides: ['prestige_bonus', 'royal_status'],
    experience: 1760,
  },
}

// House Style Definitions
export const HOUSE_STYLE_DEFINITIONS: { [key in HouseStyle]: HouseStyleDefinition } = {
  [HouseStyle.BASIC_WOOD]: {
    id: HouseStyle.BASIC_WOOD,
    name: 'Basic Wood',
    description: 'A simple wooden house style available to all players.',
    requirements: {
      skillType: SkillType.CONSTRUCTION,
      level: 1,
      materials: [],
    },
    exteriorModel: 'basic_wood_house',
    interiorTextures: ['wood_floor', 'wood_wall'],
    cost: 0,
  },

  [HouseStyle.BASIC_STONE]: {
    id: HouseStyle.BASIC_STONE,
    name: 'Basic Stone',
    description: 'A sturdy stone house style with improved durability.',
    requirements: {
      skillType: SkillType.CONSTRUCTION,
      level: 10,
      materials: [{ itemId: 'limestone_brick', quantity: 100 }],
    },
    exteriorModel: 'basic_stone_house',
    interiorTextures: ['stone_floor', 'stone_wall'],
    cost: 5000,
  },

  [HouseStyle.WHITEWASHED_STONE]: {
    id: HouseStyle.WHITEWASHED_STONE,
    name: 'Whitewashed Stone',
    description: 'An elegant whitewashed stone house with refined appearance.',
    requirements: {
      skillType: SkillType.CONSTRUCTION,
      level: 20,
      materials: [
        { itemId: 'limestone_brick', quantity: 200 },
        { itemId: 'white_paint', quantity: 10 },
      ],
    },
    exteriorModel: 'whitewashed_stone_house',
    interiorTextures: ['marble_floor', 'white_wall'],
    cost: 15000,
  },

  [HouseStyle.FREMENNIK_WOOD]: {
    id: HouseStyle.FREMENNIK_WOOD,
    name: 'Fremennik Wood',
    description: 'A northern-style wooden house with carved decorations.',
    requirements: {
      skillType: SkillType.CONSTRUCTION,
      level: 30,
      materials: [
        { itemId: 'oak_plank', quantity: 150 },
        { itemId: 'arctic_pine_logs', quantity: 50 },
      ],
    },
    exteriorModel: 'fremennik_house',
    interiorTextures: ['pine_floor', 'carved_wall'],
    cost: 25000,
    unlocks: ['fremennik_decorations'],
  },

  [HouseStyle.TROPICAL_WOOD]: {
    id: HouseStyle.TROPICAL_WOOD,
    name: 'Tropical Wood',
    description: 'An exotic house style using tropical hardwoods.',
    requirements: {
      skillType: SkillType.CONSTRUCTION,
      level: 40,
      materials: [
        { itemId: 'teak_plank', quantity: 150 },
        { itemId: 'mahogany_plank', quantity: 100 },
      ],
    },
    exteriorModel: 'tropical_house',
    interiorTextures: ['bamboo_floor', 'teak_wall'],
    cost: 50000,
    unlocks: ['tropical_decorations'],
  },

  [HouseStyle.FANCY_STONE]: {
    id: HouseStyle.FANCY_STONE,
    name: 'Fancy Stone',
    description: 'A luxurious stone mansion with ornate details.',
    requirements: {
      skillType: SkillType.CONSTRUCTION,
      level: 50,
      materials: [
        { itemId: 'marble_block', quantity: 100 },
        { itemId: 'gold_leaf', quantity: 20 },
      ],
    },
    exteriorModel: 'fancy_stone_house',
    interiorTextures: ['marble_floor', 'ornate_wall'],
    cost: 100000,
    unlocks: ['luxury_decorations'],
  },

  [HouseStyle.DARKMEYER]: {
    id: HouseStyle.DARKMEYER,
    name: 'Darkmeyer',
    description: 'A gothic castle style inspired by vampyre architecture.',
    requirements: {
      skillType: SkillType.CONSTRUCTION,
      level: 70,
      materials: [
        { itemId: 'darkmeyer_stone', quantity: 200 },
        { itemId: 'blood_essence', quantity: 50 },
      ],
    },
    exteriorModel: 'darkmeyer_castle',
    interiorTextures: ['dark_stone_floor', 'gothic_wall'],
    cost: 250000,
    unlocks: ['gothic_decorations', 'vampyre_furniture'],
  },
}

// Helper functions
export function getRoomDefinition(roomType: RoomType): RoomDefinition | null {
  return ROOM_DEFINITIONS[roomType] || null
}

export function getFurnitureDefinition(furnitureId: string): FurnitureDefinition | null {
  return FURNITURE_DEFINITIONS[furnitureId] || null
}

export function getHouseStyleDefinition(style: HouseStyle): HouseStyleDefinition | null {
  return HOUSE_STYLE_DEFINITIONS[style] || null
}

export function getFurnitureByCategory(category: FurnitureCategory): FurnitureDefinition[] {
  return Object.values(FURNITURE_DEFINITIONS).filter(furniture => furniture.category === category)
}

export function getFurnitureForRoom(roomType: RoomType): FurnitureDefinition[] {
  return Object.values(FURNITURE_DEFINITIONS).filter(furniture => furniture.allowedRooms.includes(roomType))
}

export function canPlayerBuildRoom(
  playerId: string,
  roomType: RoomType,
  getSkillLevel: (playerId: string, skill: SkillType) => number,
  hasItems: (playerId: string, itemId: string, quantity: number) => boolean
): boolean {
  const roomDef = getRoomDefinition(roomType)
  if (!roomDef) {
    return false
  }

  // Check construction level
  if (getSkillLevel(playerId, roomDef.requirements.skillType) < roomDef.requirements.level) {
    return false
  }

  // Check materials
  for (const material of roomDef.requirements.materials) {
    if (!hasItems(playerId, material.itemId, material.quantity)) {
      return false
    }
  }

  return true
}

export function canPlayerBuildFurniture(
  playerId: string,
  furnitureId: string,
  getSkillLevel: (playerId: string, skill: SkillType) => number,
  hasItems: (playerId: string, itemId: string, quantity: number) => boolean
): boolean {
  const furnitureDef = getFurnitureDefinition(furnitureId)
  if (!furnitureDef) {
    return false
  }

  // Check construction level
  if (getSkillLevel(playerId, furnitureDef.requirements.skillType) < furnitureDef.requirements.level) {
    return false
  }

  // Check materials
  for (const material of furnitureDef.requirements.materials) {
    if (!hasItems(playerId, material.itemId, material.quantity)) {
      return false
    }
  }

  return true
}
