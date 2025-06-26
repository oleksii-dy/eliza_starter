// @ts-nocheck
/**
 * Spell Definitions - Magic system with combat and utility spells
 * Based on RuneScape spell system with rune requirements
 */

import { SkillType } from '../skills/SkillDefinitions';

export enum SpellType {
  // Combat Spells
  WIND_STRIKE = 'wind_strike',
  WATER_STRIKE = 'water_strike',
  EARTH_STRIKE = 'earth_strike',
  FIRE_STRIKE = 'fire_strike',
  WIND_BOLT = 'wind_bolt',
  WATER_BOLT = 'water_bolt',
  EARTH_BOLT = 'earth_bolt',
  FIRE_BOLT = 'fire_bolt',
  WIND_BLAST = 'wind_blast',
  WATER_BLAST = 'water_blast',
  EARTH_BLAST = 'earth_blast',
  FIRE_BLAST = 'fire_blast',
  
  // Utility Spells
  LOW_LEVEL_ALCHEMY = 'low_level_alchemy',
  HIGH_LEVEL_ALCHEMY = 'high_level_alchemy',
  TELEKINETIC_GRAB = 'telekinetic_grab',
  
  // Teleport Spells
  LUMBRIDGE_TELEPORT = 'lumbridge_teleport',
  VARROCK_TELEPORT = 'varrock_teleport',
  FALADOR_TELEPORT = 'falador_teleport',
  CAMELOT_TELEPORT = 'camelot_teleport',
  
  // Enchant Spells
  ENCHANT_CROSSBOW_BOLT = 'enchant_crossbow_bolt',
  ENCHANT_SAPPHIRE = 'enchant_sapphire',
  ENCHANT_EMERALD = 'enchant_emerald',
  ENCHANT_RUBY = 'enchant_ruby',
  ENCHANT_DIAMOND = 'enchant_diamond',
  
  // Support Spells
  SUPERHEAT_ITEM = 'superheat_item',
  CHARGE_WATER_ORB = 'charge_water_orb',
  CHARGE_EARTH_ORB = 'charge_earth_orb',
  CHARGE_FIRE_ORB = 'charge_fire_orb',
  CHARGE_AIR_ORB = 'charge_air_orb',
}

export enum RuneType {
  AIR_RUNE = 556,
  WATER_RUNE = 555,
  EARTH_RUNE = 557,
  FIRE_RUNE = 554,
  MIND_RUNE = 558,
  CHAOS_RUNE = 562,
  DEATH_RUNE = 560,
  BLOOD_RUNE = 565,
  SOUL_RUNE = 566,
  ASTRAL_RUNE = 9075,
  NATURE_RUNE = 561,
  LAW_RUNE = 563,
  COSMIC_RUNE = 564,
  BODY_RUNE = 559,
}

export interface RuneRequirement {
  runeType: RuneType;
  quantity: number;
}

export interface SpellEffect {
  type: 'damage' | 'heal' | 'teleport' | 'alchemy' | 'enchant' | 'utility';
  damage?: {
    min: number;
    max: number;
    element?: 'air' | 'water' | 'earth' | 'fire';
  };
  heal?: {
    amount: number;
  };
  teleport?: {
    x: number;
    y: number;
    z: number;
    zoneName?: string;
  };
  alchemy?: {
    valueMultiplier: number; // e.g., 0.6 for low alch, 1.0 for high alch
  };
  enchant?: {
    targetItemId: number;
    resultItemId: number;
  };
  utility?: {
    description: string;
    effect: string;
  };
}

export interface SpellDefinition {
  type: SpellType;
  name: string;
  description: string;
  levelRequired: number;
  baseXP: number;
  
  // Rune costs
  runes: RuneRequirement[];
  
  // Spell effects
  effects: SpellEffect[];
  
  // Targeting
  targetType: 'self' | 'enemy' | 'item' | 'ground' | 'none';
  maxRange?: number; // tiles
  
  // Cooldown and cast time
  castTime: number; // milliseconds
  cooldown?: number; // milliseconds
  
  // Combat only
  combatOnly?: boolean;
  
  // Animation and visual effects
  animation?: string;
  projectile?: {
    speed: number;
    model: string;
    color: string;
  };
}

export const SPELL_DEFINITIONS: Record<SpellType, SpellDefinition> = {
  // Strike Spells (Level 1-13)
  [SpellType.WIND_STRIKE]: {
    type: SpellType.WIND_STRIKE,
    name: 'Wind Strike',
    description: 'A basic air spell',
    levelRequired: 1,
    baseXP: 5.5,
    runes: [
      { runeType: RuneType.AIR_RUNE, quantity: 1 },
      { runeType: RuneType.MIND_RUNE, quantity: 1 }
    ],
    effects: [
      {
        type: 'damage',
        damage: { min: 0, max: 2, element: 'air' }
      }
    ],
    targetType: 'enemy',
    maxRange: 10,
    castTime: 1800,
    combatOnly: true,
    projectile: {
      speed: 8,
      model: 'wind_strike',
      color: '#87CEEB'
    }
  },
  
  [SpellType.WATER_STRIKE]: {
    type: SpellType.WATER_STRIKE,
    name: 'Water Strike',
    description: 'A basic water spell',
    levelRequired: 5,
    baseXP: 7.5,
    runes: [
      { runeType: RuneType.WATER_RUNE, quantity: 1 },
      { runeType: RuneType.AIR_RUNE, quantity: 1 },
      { runeType: RuneType.MIND_RUNE, quantity: 1 }
    ],
    effects: [
      {
        type: 'damage',
        damage: { min: 0, max: 4, element: 'water' }
      }
    ],
    targetType: 'enemy',
    maxRange: 10,
    castTime: 1800,
    combatOnly: true,
    projectile: {
      speed: 8,
      model: 'water_strike',
      color: '#4169E1'
    }
  },
  
  [SpellType.EARTH_STRIKE]: {
    type: SpellType.EARTH_STRIKE,
    name: 'Earth Strike',
    description: 'A basic earth spell',
    levelRequired: 9,
    baseXP: 9.5,
    runes: [
      { runeType: RuneType.EARTH_RUNE, quantity: 2 },
      { runeType: RuneType.AIR_RUNE, quantity: 1 },
      { runeType: RuneType.MIND_RUNE, quantity: 1 }
    ],
    effects: [
      {
        type: 'damage',
        damage: { min: 0, max: 6, element: 'earth' }
      }
    ],
    targetType: 'enemy',
    maxRange: 10,
    castTime: 1800,
    combatOnly: true,
    projectile: {
      speed: 8,
      model: 'earth_strike',
      color: '#8B4513'
    }
  },
  
  [SpellType.FIRE_STRIKE]: {
    type: SpellType.FIRE_STRIKE,
    name: 'Fire Strike',
    description: 'A basic fire spell',
    levelRequired: 13,
    baseXP: 11.5,
    runes: [
      { runeType: RuneType.FIRE_RUNE, quantity: 3 },
      { runeType: RuneType.AIR_RUNE, quantity: 2 },
      { runeType: RuneType.MIND_RUNE, quantity: 1 }
    ],
    effects: [
      {
        type: 'damage',
        damage: { min: 0, max: 8, element: 'fire' }
      }
    ],
    targetType: 'enemy',
    maxRange: 10,
    castTime: 1800,
    combatOnly: true,
    projectile: {
      speed: 8,
      model: 'fire_strike',
      color: '#FF4500'
    }
  },
  
  // Bolt Spells (Level 17-29)
  [SpellType.WIND_BOLT]: {
    type: SpellType.WIND_BOLT,
    name: 'Wind Bolt',
    description: 'A moderate air spell',
    levelRequired: 17,
    baseXP: 13.5,
    runes: [
      { runeType: RuneType.AIR_RUNE, quantity: 2 },
      { runeType: RuneType.CHAOS_RUNE, quantity: 1 }
    ],
    effects: [
      {
        type: 'damage',
        damage: { min: 0, max: 9, element: 'air' }
      }
    ],
    targetType: 'enemy',
    maxRange: 10,
    castTime: 1800,
    combatOnly: true,
    projectile: {
      speed: 10,
      model: 'wind_bolt',
      color: '#87CEEB'
    }
  },
  
  [SpellType.WATER_BOLT]: {
    type: SpellType.WATER_BOLT,
    name: 'Water Bolt',
    description: 'A moderate water spell',
    levelRequired: 23,
    baseXP: 16.5,
    runes: [
      { runeType: RuneType.WATER_RUNE, quantity: 2 },
      { runeType: RuneType.AIR_RUNE, quantity: 2 },
      { runeType: RuneType.CHAOS_RUNE, quantity: 1 }
    ],
    effects: [
      {
        type: 'damage',
        damage: { min: 0, max: 10, element: 'water' }
      }
    ],
    targetType: 'enemy',
    maxRange: 10,
    castTime: 1800,
    combatOnly: true,
    projectile: {
      speed: 10,
      model: 'water_bolt',
      color: '#4169E1'
    }
  },
  
  [SpellType.EARTH_BOLT]: {
    type: SpellType.EARTH_BOLT,
    name: 'Earth Bolt',
    description: 'A moderate earth spell',
    levelRequired: 29,
    baseXP: 19.5,
    runes: [
      { runeType: RuneType.EARTH_RUNE, quantity: 3 },
      { runeType: RuneType.AIR_RUNE, quantity: 2 },
      { runeType: RuneType.CHAOS_RUNE, quantity: 1 }
    ],
    effects: [
      {
        type: 'damage',
        damage: { min: 0, max: 11, element: 'earth' }
      }
    ],
    targetType: 'enemy',
    maxRange: 10,
    castTime: 1800,
    combatOnly: true,
    projectile: {
      speed: 10,
      model: 'earth_bolt',
      color: '#8B4513'
    }
  },
  
  [SpellType.FIRE_BOLT]: {
    type: SpellType.FIRE_BOLT,
    name: 'Fire Bolt',
    description: 'A moderate fire spell',
    levelRequired: 35,
    baseXP: 22.5,
    runes: [
      { runeType: RuneType.FIRE_RUNE, quantity: 4 },
      { runeType: RuneType.AIR_RUNE, quantity: 3 },
      { runeType: RuneType.CHAOS_RUNE, quantity: 1 }
    ],
    effects: [
      {
        type: 'damage',
        damage: { min: 0, max: 12, element: 'fire' }
      }
    ],
    targetType: 'enemy',
    maxRange: 10,
    castTime: 1800,
    combatOnly: true,
    projectile: {
      speed: 10,
      model: 'fire_bolt',
      color: '#FF4500'
    }
  },
  
  // Blast Spells (Level 41-59)
  [SpellType.WIND_BLAST]: {
    type: SpellType.WIND_BLAST,
    name: 'Wind Blast',
    description: 'A powerful air spell',
    levelRequired: 41,
    baseXP: 25.5,
    runes: [
      { runeType: RuneType.AIR_RUNE, quantity: 3 },
      { runeType: RuneType.DEATH_RUNE, quantity: 1 }
    ],
    effects: [
      {
        type: 'damage',
        damage: { min: 0, max: 13, element: 'air' }
      }
    ],
    targetType: 'enemy',
    maxRange: 10,
    castTime: 1800,
    combatOnly: true,
    projectile: {
      speed: 12,
      model: 'wind_blast',
      color: '#87CEEB'
    }
  },
  
  [SpellType.WATER_BLAST]: {
    type: SpellType.WATER_BLAST,
    name: 'Water Blast',
    description: 'A powerful water spell',
    levelRequired: 47,
    baseXP: 28.5,
    runes: [
      { runeType: RuneType.WATER_RUNE, quantity: 3 },
      { runeType: RuneType.AIR_RUNE, quantity: 3 },
      { runeType: RuneType.DEATH_RUNE, quantity: 1 }
    ],
    effects: [
      {
        type: 'damage',
        damage: { min: 0, max: 14, element: 'water' }
      }
    ],
    targetType: 'enemy',
    maxRange: 10,
    castTime: 1800,
    combatOnly: true,
    projectile: {
      speed: 12,
      model: 'water_blast',
      color: '#4169E1'
    }
  },
  
  [SpellType.EARTH_BLAST]: {
    type: SpellType.EARTH_BLAST,
    name: 'Earth Blast',
    description: 'A powerful earth spell',
    levelRequired: 53,
    baseXP: 31.5,
    runes: [
      { runeType: RuneType.EARTH_RUNE, quantity: 4 },
      { runeType: RuneType.AIR_RUNE, quantity: 3 },
      { runeType: RuneType.DEATH_RUNE, quantity: 1 }
    ],
    effects: [
      {
        type: 'damage',
        damage: { min: 0, max: 15, element: 'earth' }
      }
    ],
    targetType: 'enemy',
    maxRange: 10,
    castTime: 1800,
    combatOnly: true,
    projectile: {
      speed: 12,
      model: 'earth_blast',
      color: '#8B4513'
    }
  },
  
  [SpellType.FIRE_BLAST]: {
    type: SpellType.FIRE_BLAST,
    name: 'Fire Blast',
    description: 'A powerful fire spell',
    levelRequired: 59,
    baseXP: 34.5,
    runes: [
      { runeType: RuneType.FIRE_RUNE, quantity: 5 },
      { runeType: RuneType.AIR_RUNE, quantity: 4 },
      { runeType: RuneType.DEATH_RUNE, quantity: 1 }
    ],
    effects: [
      {
        type: 'damage',
        damage: { min: 0, max: 16, element: 'fire' }
      }
    ],
    targetType: 'enemy',
    maxRange: 10,
    castTime: 1800,
    combatOnly: true,
    projectile: {
      speed: 12,
      model: 'fire_blast',
      color: '#FF4500'
    }
  },
  
  // Utility Spells
  [SpellType.LOW_LEVEL_ALCHEMY]: {
    type: SpellType.LOW_LEVEL_ALCHEMY,
    name: 'Low Level Alchemy',
    description: 'Converts items into coins',
    levelRequired: 21,
    baseXP: 31,
    runes: [
      { runeType: RuneType.FIRE_RUNE, quantity: 3 },
      { runeType: RuneType.NATURE_RUNE, quantity: 1 }
    ],
    effects: [
      {
        type: 'alchemy',
        alchemy: { valueMultiplier: 0.6 }
      }
    ],
    targetType: 'item',
    castTime: 2400,
    combatOnly: false
  },
  
  [SpellType.HIGH_LEVEL_ALCHEMY]: {
    type: SpellType.HIGH_LEVEL_ALCHEMY,
    name: 'High Level Alchemy',
    description: 'Converts items into more coins',
    levelRequired: 55,
    baseXP: 65,
    runes: [
      { runeType: RuneType.FIRE_RUNE, quantity: 5 },
      { runeType: RuneType.NATURE_RUNE, quantity: 1 }
    ],
    effects: [
      {
        type: 'alchemy',
        alchemy: { valueMultiplier: 1.0 }
      }
    ],
    targetType: 'item',
    castTime: 2400,
    combatOnly: false
  },
  
  [SpellType.TELEKINETIC_GRAB]: {
    type: SpellType.TELEKINETIC_GRAB,
    name: 'Telekinetic Grab',
    description: 'Grabs an item from a distance',
    levelRequired: 33,
    baseXP: 43,
    runes: [
      { runeType: RuneType.AIR_RUNE, quantity: 1 },
      { runeType: RuneType.LAW_RUNE, quantity: 1 }
    ],
    effects: [
      {
        type: 'utility',
        utility: {
          description: 'Grabs distant items',
          effect: 'telekinetic_grab'
        }
      }
    ],
    targetType: 'ground',
    maxRange: 15,
    castTime: 1800,
    combatOnly: false
  },
  
  // Teleport Spells
  [SpellType.LUMBRIDGE_TELEPORT]: {
    type: SpellType.LUMBRIDGE_TELEPORT,
    name: 'Lumbridge Teleport',
    description: 'Teleports you to Lumbridge',
    levelRequired: 31,
    baseXP: 41,
    runes: [
      { runeType: RuneType.AIR_RUNE, quantity: 3 },
      { runeType: RuneType.EARTH_RUNE, quantity: 1 },
      { runeType: RuneType.LAW_RUNE, quantity: 1 }
    ],
    effects: [
      {
        type: 'teleport',
        teleport: { x: 0, y: 0, z: 0, zoneName: 'lumbridge' }
      }
    ],
    targetType: 'self',
    castTime: 3000,
    combatOnly: false
  },
  
  [SpellType.VARROCK_TELEPORT]: {
    type: SpellType.VARROCK_TELEPORT,
    name: 'Varrock Teleport',
    description: 'Teleports you to Varrock',
    levelRequired: 25,
    baseXP: 35,
    runes: [
      { runeType: RuneType.AIR_RUNE, quantity: 3 },
      { runeType: RuneType.FIRE_RUNE, quantity: 1 },
      { runeType: RuneType.LAW_RUNE, quantity: 1 }
    ],
    effects: [
      {
        type: 'teleport',
        teleport: { x: 100, y: 0, z: 0, zoneName: 'varrock' }
      }
    ],
    targetType: 'self',
    castTime: 3000,
    combatOnly: false
  },
  
  [SpellType.FALADOR_TELEPORT]: {
    type: SpellType.FALADOR_TELEPORT,
    name: 'Falador Teleport',
    description: 'Teleports you to Falador',
    levelRequired: 37,
    baseXP: 47,
    runes: [
      { runeType: RuneType.AIR_RUNE, quantity: 3 },
      { runeType: RuneType.WATER_RUNE, quantity: 1 },
      { runeType: RuneType.LAW_RUNE, quantity: 1 }
    ],
    effects: [
      {
        type: 'teleport',
        teleport: { x: -100, y: 0, z: 0, zoneName: 'falador' }
      }
    ],
    targetType: 'self',
    castTime: 3000,
    combatOnly: false
  },
  
  [SpellType.CAMELOT_TELEPORT]: {
    type: SpellType.CAMELOT_TELEPORT,
    name: 'Camelot Teleport',
    description: 'Teleports you to Camelot',
    levelRequired: 45,
    baseXP: 55.5,
    runes: [
      { runeType: RuneType.AIR_RUNE, quantity: 5 },
      { runeType: RuneType.LAW_RUNE, quantity: 1 }
    ],
    effects: [
      {
        type: 'teleport',
        teleport: { x: 0, y: 0, z: 100, zoneName: 'camelot' }
      }
    ],
    targetType: 'self',
    castTime: 3000,
    combatOnly: false
  },
  
  // Enchant Spells
  [SpellType.ENCHANT_SAPPHIRE]: {
    type: SpellType.ENCHANT_SAPPHIRE,
    name: 'Enchant Sapphire',
    description: 'Enchants sapphire jewelry',
    levelRequired: 7,
    baseXP: 17.5,
    runes: [
      { runeType: RuneType.WATER_RUNE, quantity: 1 },
      { runeType: RuneType.COSMIC_RUNE, quantity: 1 }
    ],
    effects: [
      {
        type: 'enchant',
        enchant: { targetItemId: 1637, resultItemId: 2550 } // Ring of recoil
      }
    ],
    targetType: 'item',
    castTime: 2400,
    combatOnly: false
  },
  
  [SpellType.ENCHANT_EMERALD]: {
    type: SpellType.ENCHANT_EMERALD,
    name: 'Enchant Emerald',
    description: 'Enchants emerald jewelry',
    levelRequired: 27,
    baseXP: 37,
    runes: [
      { runeType: RuneType.AIR_RUNE, quantity: 3 },
      { runeType: RuneType.COSMIC_RUNE, quantity: 1 }
    ],
    effects: [
      {
        type: 'enchant',
        enchant: { targetItemId: 1639, resultItemId: 2552 } // Ring of dueling
      }
    ],
    targetType: 'item',
    castTime: 2400,
    combatOnly: false
  },
  
  [SpellType.ENCHANT_RUBY]: {
    type: SpellType.ENCHANT_RUBY,
    name: 'Enchant Ruby',
    description: 'Enchants ruby jewelry',
    levelRequired: 49,
    baseXP: 59,
    runes: [
      { runeType: RuneType.FIRE_RUNE, quantity: 5 },
      { runeType: RuneType.COSMIC_RUNE, quantity: 1 }
    ],
    effects: [
      {
        type: 'enchant',
        enchant: { targetItemId: 1641, resultItemId: 2568 } // Ring of forging
      }
    ],
    targetType: 'item',
    castTime: 2400,
    combatOnly: false
  },
  
  [SpellType.ENCHANT_DIAMOND]: {
    type: SpellType.ENCHANT_DIAMOND,
    name: 'Enchant Diamond',
    description: 'Enchants diamond jewelry',
    levelRequired: 57,
    baseXP: 67,
    runes: [
      { runeType: RuneType.EARTH_RUNE, quantity: 10 },
      { runeType: RuneType.COSMIC_RUNE, quantity: 1 }
    ],
    effects: [
      {
        type: 'enchant',
        enchant: { targetItemId: 1643, resultItemId: 2570 } // Ring of life
      }
    ],
    targetType: 'item',
    castTime: 2400,
    combatOnly: false
  },
  
  // Support Spells
  [SpellType.SUPERHEAT_ITEM]: {
    type: SpellType.SUPERHEAT_ITEM,
    name: 'Superheat Item',
    description: 'Smelts ores without a furnace',
    levelRequired: 43,
    baseXP: 53,
    runes: [
      { runeType: RuneType.FIRE_RUNE, quantity: 4 },
      { runeType: RuneType.NATURE_RUNE, quantity: 1 }
    ],
    effects: [
      {
        type: 'utility',
        utility: {
          description: 'Smelts ores instantly',
          effect: 'superheat'
        }
      }
    ],
    targetType: 'item',
    castTime: 1800,
    combatOnly: false
  }
};

// Helper functions
export function getSpellsByLevel(level: number): SpellDefinition[] {
  return Object.values(SPELL_DEFINITIONS).filter(spell => spell.levelRequired <= level);
}

export function getCombatSpells(): SpellDefinition[] {
  return Object.values(SPELL_DEFINITIONS).filter(spell => spell.combatOnly);
}

export function getUtilitySpells(): SpellDefinition[] {
  return Object.values(SPELL_DEFINITIONS).filter(spell => !spell.combatOnly);
}

export function canCastSpell(spell: SpellDefinition, playerLevel: number, inventory: any[]): boolean {
  if (playerLevel < spell.levelRequired) return false;
  
  // Check rune requirements
  for (const rune of spell.runes) {
    const runeCount = inventory.filter(item => item && item.itemId === rune.runeType).length;
    if (runeCount < rune.quantity) return false;
  }
  
  return true;
}

export function calculateSpellDamage(spell: SpellDefinition, magicLevel: number): number {
  if (!spell.effects[0]?.damage) return 0;
  
  const { min, max } = spell.effects[0].damage;
  const baseDamage = Math.floor(Math.random() * (max - min + 1)) + min;
  
  // Magic level bonus (simplified)
  const levelBonus = Math.floor(magicLevel / 10);
  
  return Math.max(0, baseDamage + levelBonus);
}