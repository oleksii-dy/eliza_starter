// @ts-nocheck
/**
 * Boss Definitions - RuneScape-style boss encounters
 * Defines boss stats, mechanics, phases, and rewards
 */

import { SkillType } from '../skills/SkillDefinitions'

export enum BossDifficulty {
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard',
  MASTER = 'master',
  GRANDMASTER = 'grandmaster',
}

export enum BossType {
  SINGLE = 'single', // Solo boss fight
  GROUP = 'group', // Group boss fight
  RAID = 'raid', // Large group raid boss
}

export enum BossPhaseType {
  NORMAL = 'normal',
  TRANSITION = 'transition',
  SPECIAL = 'special',
  ENRAGE = 'enrage',
}

export enum BossAttackType {
  MELEE = 'melee',
  RANGED = 'ranged',
  MAGIC = 'magic',
  SPECIAL = 'special',
  AOE = 'aoe',
  DOT = 'dot', // Damage over time
}

export interface BossAttack {
  id: string
  name: string
  type: BossAttackType
  damage: { min: number; max: number }
  accuracy: number // Hit chance modifier
  cooldown: number // Milliseconds between uses
  range: number // Attack range
  description: string

  // Special effects
  effects?: {
    type: 'stun' | 'poison' | 'drain' | 'teleport' | 'heal' | 'buff' | 'debuff'
    duration?: number
    value?: number
    target?: 'self' | 'player' | 'all_players'
  }[]

  // Animation and visual
  animation?: string
  projectile?: string
  soundEffect?: string

  // Requirements
  requiresPhase?: number
  requiresHealthBelow?: number
  requiresPlayerCount?: number
}

export interface BossPhase {
  id: number
  name: string
  type: BossPhaseType
  healthPercent: number // Phase starts when boss reaches this HP %
  description: string

  // Phase properties
  duration?: number // Max duration in milliseconds
  invulnerable?: boolean // Boss cannot take damage
  attackSpeedModifier: number // Multiplier for attack speed
  damageModifier: number // Multiplier for damage dealt

  // Available attacks in this phase
  availableAttacks: string[] // Attack IDs
  specialMechanics?: string[] // Special phase mechanics

  // Phase transition
  transitionTo?: number // Next phase ID
  transitionCondition?: 'health' | 'time' | 'players_defeated' | 'custom'
}

export interface BossReward {
  type: 'item' | 'coins' | 'experience'
  itemId?: string
  quantity: { min: number; max: number }
  experience?: { [skill in SkillType]?: number }
  dropRate: number // 0-1 probability
  requiresKill?: boolean // Must deal killing blow

  // Conditions
  minDamage?: number // Minimum damage dealt to boss
  solo?: boolean // Only for solo kills
  groupSize?: { min?: number; max?: number }
}

export interface BossRequirement {
  type: 'level' | 'skill' | 'quest' | 'item' | 'kc' // kc = kill count
  combatLevel?: number
  skillType?: SkillType
  skillLevel?: number
  questId?: string
  itemId?: string
  quantity?: number
  killCount?: number // Previous kills of this boss
  bosses?: string[] // Other bosses that must be defeated
}

export interface BossDefinition {
  id: string
  name: string
  description: string
  lore: string
  difficulty: BossDifficulty
  type: BossType

  // Combat stats
  hitpoints: number
  combatLevel: number
  attackLevel: number
  strengthLevel: number
  defenceLevel: number
  magicLevel: number
  rangedLevel: number

  // Defensive stats
  attackBonus: number
  strengthBonus: number
  defenceBonus: number
  magicBonus: number
  rangedBonus: number
  magicDefence: number
  rangedDefence: number

  // Resistances (0-1, where 1 = immune)
  resistances: {
    melee: number
    ranged: number
    magic: number
    poison: number
    stun: number
  }

  // Boss mechanics
  attacks: BossAttack[]
  phases: BossPhase[]
  respawnTime: number // Milliseconds until respawn
  maxPlayers: number // Maximum players in encounter
  minPlayers: number // Minimum players to start
  timeLimit: number // Fight duration limit in milliseconds

  // Requirements and access
  requirements: BossRequirement[]
  location: string
  instanceBased: boolean // Creates private instance per group

  // Rewards
  rewards: BossReward[]
  guaranteedRewards: BossReward[] // Always dropped

  // Metadata
  killCount?: boolean // Tracks player kill counts
  fastestKill?: boolean // Tracks fastest kill times
  category: string // Boss category (e.g., 'God Wars', 'Slayer', 'Raids')
  releaseDate?: string
}

// Core RuneScape-style boss definitions
export const BOSS_DEFINITIONS: { [key: string]: BossDefinition } = {
  giant_spider: {
    id: 'giant_spider',
    name: 'Giant Spider',
    description: 'A massive spider lurking in the depths of the dungeon.',
    lore: 'This enormous arachnid has grown to incredible size feeding on unwary adventurers. Its venom is deadly, and its webs can trap even the most agile fighters.',
    difficulty: BossDifficulty.EASY,
    type: BossType.SINGLE,

    // Combat stats
    hitpoints: 500,
    combatLevel: 45,
    attackLevel: 40,
    strengthLevel: 35,
    defenceLevel: 30,
    magicLevel: 1,
    rangedLevel: 25,

    // Defensive stats
    attackBonus: 35,
    strengthBonus: 30,
    defenceBonus: 25,
    magicBonus: 0,
    rangedBonus: 15,
    magicDefence: 5,
    rangedDefence: 20,

    resistances: {
      melee: 0.1,
      ranged: 0.0,
      magic: 0.2,
      poison: 0.8,
      stun: 0.3,
    },

    attacks: [
      {
        id: 'bite',
        name: 'Venomous Bite',
        type: BossAttackType.MELEE,
        damage: { min: 8, max: 15 },
        accuracy: 0.8,
        cooldown: 3000,
        range: 1,
        description: 'A poisonous bite that deals damage over time',
        effects: [
          {
            type: 'poison',
            duration: 30000,
            value: 2,
            target: 'player',
          },
        ],
        animation: 'spider_bite',
        soundEffect: 'spider_hiss',
      },
      {
        id: 'web_shot',
        name: 'Web Shot',
        type: BossAttackType.RANGED,
        damage: { min: 5, max: 10 },
        accuracy: 0.9,
        cooldown: 8000,
        range: 5,
        description: 'Shoots a web that immobilizes the target',
        effects: [
          {
            type: 'stun',
            duration: 5000,
            target: 'player',
          },
        ],
        projectile: 'spider_web',
        soundEffect: 'web_shot',
      },
      {
        id: 'leg_sweep',
        name: 'Leg Sweep',
        type: BossAttackType.AOE,
        damage: { min: 6, max: 12 },
        accuracy: 0.7,
        cooldown: 12000,
        range: 2,
        description: 'Sweeps with multiple legs, hitting nearby players',
        animation: 'spider_sweep',
        requiresHealthBelow: 50,
      },
    ],

    phases: [
      {
        id: 1,
        name: 'Aggressive Phase',
        type: BossPhaseType.NORMAL,
        healthPercent: 100,
        description: 'The spider attacks normally',
        attackSpeedModifier: 1.0,
        damageModifier: 1.0,
        availableAttacks: ['bite', 'web_shot'],
      },
      {
        id: 2,
        name: 'Enraged Phase',
        type: BossPhaseType.ENRAGE,
        healthPercent: 25,
        description: 'The spider becomes frenzied and more dangerous',
        attackSpeedModifier: 1.5,
        damageModifier: 1.3,
        availableAttacks: ['bite', 'web_shot', 'leg_sweep'],
      },
    ],

    respawnTime: 300000, // 5 minutes
    maxPlayers: 3,
    minPlayers: 1,
    timeLimit: 600000, // 10 minutes

    requirements: [
      {
        type: 'level',
        combatLevel: 30,
      },
    ],

    location: 'spider_cave',
    instanceBased: false,

    rewards: [
      {
        type: 'item',
        itemId: 'spider_fang',
        quantity: { min: 1, max: 2 },
        dropRate: 0.3,
      },
      {
        type: 'item',
        itemId: 'spider_silk',
        quantity: { min: 2, max: 5 },
        dropRate: 0.6,
      },
      {
        type: 'coins',
        quantity: { min: 500, max: 1500 },
        dropRate: 1.0,
      },
    ],

    guaranteedRewards: [
      {
        type: 'experience',
        quantity: { min: 100, max: 200 },
        experience: {
          [SkillType.ATTACK]: 50,
          [SkillType.STRENGTH]: 50,
          [SkillType.DEFENCE]: 25,
        },
        dropRate: 1.0,
      },
    ],

    killCount: true,
    fastestKill: true,
    category: 'Dungeon Bosses',
  },

  fire_giant_king: {
    id: 'fire_giant_king',
    name: 'Fire Giant King',
    description: 'The mighty ruler of all fire giants, wielding devastating flame magic.',
    lore: 'Once a mortal king, he was transformed by ancient fire magic into a being of pure elemental fury. His rage burns eternal, and his domain is a realm of molten rock and searing heat.',
    difficulty: BossDifficulty.MEDIUM,
    type: BossType.SINGLE,

    hitpoints: 1500,
    combatLevel: 85,
    attackLevel: 75,
    strengthLevel: 80,
    defenceLevel: 70,
    magicLevel: 85,
    rangedLevel: 40,

    attackBonus: 65,
    strengthBonus: 70,
    defenceBonus: 60,
    magicBonus: 80,
    rangedBonus: 20,
    magicDefence: 45,
    rangedDefence: 30,

    resistances: {
      melee: 0.2,
      ranged: 0.1,
      magic: -0.2, // Weak to magic
      poison: 0.9,
      stun: 0.5,
    },

    attacks: [
      {
        id: 'flame_sword',
        name: 'Flame Sword',
        type: BossAttackType.MELEE,
        damage: { min: 15, max: 25 },
        accuracy: 0.8,
        cooldown: 4000,
        range: 2,
        description: 'A burning sword strike that ignites the target',
        effects: [
          {
            type: 'dot',
            duration: 15000,
            value: 3,
            target: 'player',
          },
        ],
        animation: 'flame_slash',
      },
      {
        id: 'fireball',
        name: 'Fireball',
        type: BossAttackType.MAGIC,
        damage: { min: 20, max: 35 },
        accuracy: 0.9,
        cooldown: 6000,
        range: 8,
        description: 'Hurls a massive fireball at the target',
        projectile: 'fireball',
        soundEffect: 'fireball_cast',
      },
      {
        id: 'flame_wave',
        name: 'Flame Wave',
        type: BossAttackType.AOE,
        damage: { min: 12, max: 20 },
        accuracy: 0.85,
        cooldown: 15000,
        range: 5,
        description: 'Sends a wave of fire in all directions',
        animation: 'flame_wave',
        requiresPhase: 2,
      },
      {
        id: 'inferno',
        name: 'Inferno',
        type: BossAttackType.SPECIAL,
        damage: { min: 25, max: 45 },
        accuracy: 1.0,
        cooldown: 30000,
        range: 10,
        description: 'Devastating area attack that hits all players',
        effects: [
          {
            type: 'dot',
            duration: 20000,
            value: 5,
            target: 'all_players',
          },
        ],
        requiresHealthBelow: 30,
        animation: 'inferno',
      },
    ],

    phases: [
      {
        id: 1,
        name: 'Warrior Phase',
        type: BossPhaseType.NORMAL,
        healthPercent: 100,
        description: 'Focuses on melee and single-target attacks',
        attackSpeedModifier: 1.0,
        damageModifier: 1.0,
        availableAttacks: ['flame_sword', 'fireball'],
      },
      {
        id: 2,
        name: 'Mage Phase',
        type: BossPhaseType.NORMAL,
        healthPercent: 60,
        description: 'Becomes more magical, using area attacks',
        attackSpeedModifier: 0.8,
        damageModifier: 1.2,
        availableAttacks: ['fireball', 'flame_wave'],
      },
      {
        id: 3,
        name: 'Inferno Phase',
        type: BossPhaseType.ENRAGE,
        healthPercent: 20,
        description: 'Unleashes his full power in desperation',
        attackSpeedModifier: 1.3,
        damageModifier: 1.5,
        availableAttacks: ['flame_sword', 'fireball', 'flame_wave', 'inferno'],
      },
    ],

    respawnTime: 900000, // 15 minutes
    maxPlayers: 5,
    minPlayers: 1,
    timeLimit: 1200000, // 20 minutes

    requirements: [
      {
        type: 'level',
        combatLevel: 60,
      },
      {
        type: 'skill',
        skillType: SkillType.FIREMAKING,
        skillLevel: 40,
      },
    ],

    location: 'fire_giant_stronghold',
    instanceBased: true,

    rewards: [
      {
        type: 'item',
        itemId: 'fire_rune',
        quantity: { min: 50, max: 100 },
        dropRate: 0.8,
      },
      {
        type: 'item',
        itemId: 'fire_giant_sword',
        quantity: { min: 1, max: 1 },
        dropRate: 0.1,
        requiresKill: true,
      },
      {
        type: 'item',
        itemId: 'flame_crystal',
        quantity: { min: 1, max: 3 },
        dropRate: 0.4,
      },
      {
        type: 'coins',
        quantity: { min: 2000, max: 5000 },
        dropRate: 1.0,
      },
    ],

    guaranteedRewards: [
      {
        type: 'experience',
        quantity: { min: 300, max: 500 },
        experience: {
          [SkillType.ATTACK]: 150,
          [SkillType.STRENGTH]: 150,
          [SkillType.DEFENCE]: 100,
          [SkillType.MAGIC]: 200,
        },
        dropRate: 1.0,
      },
    ],

    killCount: true,
    fastestKill: true,
    category: 'Elemental Bosses',
  },

  ancient_dragon: {
    id: 'ancient_dragon',
    name: 'Ancient Dragon',
    description: 'An ancient wyrm of immense power, master of all elements.',
    lore: 'This primordial dragon has existed since the dawn of time. Its scales are harder than adamant, its breath can melt mountains, and its magic rivals that of the gods themselves.',
    difficulty: BossDifficulty.MASTER,
    type: BossType.GROUP,

    hitpoints: 5000,
    combatLevel: 200,
    attackLevel: 150,
    strengthLevel: 160,
    defenceLevel: 140,
    magicLevel: 180,
    rangedLevel: 120,

    attackBonus: 120,
    strengthBonus: 140,
    defenceBonus: 100,
    magicBonus: 150,
    rangedBonus: 80,
    magicDefence: 80,
    rangedDefence: 60,

    resistances: {
      melee: 0.3,
      ranged: 0.2,
      magic: 0.1,
      poison: 1.0,
      stun: 0.8,
    },

    attacks: [
      {
        id: 'dragon_claw',
        name: 'Dragon Claw',
        type: BossAttackType.MELEE,
        damage: { min: 30, max: 50 },
        accuracy: 0.9,
        cooldown: 5000,
        range: 3,
        description: 'Massive claw strike that can hit multiple targets',
        animation: 'dragon_claw',
      },
      {
        id: 'fire_breath',
        name: 'Fire Breath',
        type: BossAttackType.MAGIC,
        damage: { min: 25, max: 40 },
        accuracy: 0.95,
        cooldown: 8000,
        range: 6,
        description: 'Devastating fire breath in a cone',
        effects: [
          {
            type: 'dot',
            duration: 20000,
            value: 4,
            target: 'player',
          },
        ],
        animation: 'fire_breath',
      },
      {
        id: 'ice_storm',
        name: 'Ice Storm',
        type: BossAttackType.AOE,
        damage: { min: 20, max: 35 },
        accuracy: 0.9,
        cooldown: 12000,
        range: 8,
        description: 'Summons an ice storm over the battlefield',
        effects: [
          {
            type: 'stun',
            duration: 3000,
            target: 'all_players',
          },
        ],
        requiresPhase: 2,
      },
      {
        id: 'dragon_roar',
        name: 'Dragon Roar',
        type: BossAttackType.SPECIAL,
        damage: { min: 0, max: 0 },
        accuracy: 1.0,
        cooldown: 20000,
        range: 10,
        description: 'Terrifying roar that weakens all players',
        effects: [
          {
            type: 'debuff',
            duration: 30000,
            value: 0.8, // 20% damage reduction
            target: 'all_players',
          },
        ],
      },
      {
        id: 'elemental_fury',
        name: 'Elemental Fury',
        type: BossAttackType.SPECIAL,
        damage: { min: 40, max: 70 },
        accuracy: 1.0,
        cooldown: 45000,
        range: 12,
        description: 'Ultimate attack combining all elements',
        requiresHealthBelow: 25,
        animation: 'elemental_fury',
      },
    ],

    phases: [
      {
        id: 1,
        name: 'Awakening',
        type: BossPhaseType.NORMAL,
        healthPercent: 100,
        description: 'The dragon tests the challengers',
        attackSpeedModifier: 0.8,
        damageModifier: 0.9,
        availableAttacks: ['dragon_claw', 'fire_breath'],
      },
      {
        id: 2,
        name: 'Elemental Mastery',
        type: BossPhaseType.NORMAL,
        healthPercent: 70,
        description: 'The dragon begins using elemental magic',
        attackSpeedModifier: 1.0,
        damageModifier: 1.1,
        availableAttacks: ['dragon_claw', 'fire_breath', 'ice_storm', 'dragon_roar'],
      },
      {
        id: 3,
        name: 'Ancient Fury',
        type: BossPhaseType.ENRAGE,
        healthPercent: 30,
        description: 'The dragon unleashes its full ancient power',
        attackSpeedModifier: 1.3,
        damageModifier: 1.4,
        availableAttacks: ['dragon_claw', 'fire_breath', 'ice_storm', 'dragon_roar', 'elemental_fury'],
      },
    ],

    respawnTime: 3600000, // 1 hour
    maxPlayers: 8,
    minPlayers: 3,
    timeLimit: 1800000, // 30 minutes

    requirements: [
      {
        type: 'level',
        combatLevel: 100,
      },
      {
        type: 'quest',
        questId: 'dragon_slayer',
      },
      {
        type: 'skill',
        skillType: SkillType.SLAYER,
        skillLevel: 75,
      },
    ],

    location: 'ancient_dragon_lair',
    instanceBased: true,

    rewards: [
      {
        type: 'item',
        itemId: 'dragon_scale',
        quantity: { min: 3, max: 8 },
        dropRate: 0.9,
      },
      {
        type: 'item',
        itemId: 'dragon_sword',
        quantity: { min: 1, max: 1 },
        dropRate: 0.05,
        requiresKill: true,
      },
      {
        type: 'item',
        itemId: 'ancient_rune',
        quantity: { min: 1, max: 2 },
        dropRate: 0.3,
      },
      {
        type: 'item',
        itemId: 'dragon_bones',
        quantity: { min: 5, max: 10 },
        dropRate: 1.0,
      },
      {
        type: 'coins',
        quantity: { min: 10000, max: 25000 },
        dropRate: 1.0,
      },
    ],

    guaranteedRewards: [
      {
        type: 'experience',
        quantity: { min: 1000, max: 2000 },
        experience: {
          [SkillType.ATTACK]: 400,
          [SkillType.STRENGTH]: 400,
          [SkillType.DEFENCE]: 300,
          [SkillType.MAGIC]: 500,
          [SkillType.SLAYER]: 600,
        },
        dropRate: 1.0,
      },
    ],

    killCount: true,
    fastestKill: true,
    category: 'Dragon Bosses',
  },
}

// Helper functions
export function getBossDefinition(bossId: string): BossDefinition | null {
  return BOSS_DEFINITIONS[bossId] || null
}

export function getBossesByDifficulty(difficulty: BossDifficulty): BossDefinition[] {
  return Object.values(BOSS_DEFINITIONS).filter(boss => boss.difficulty === difficulty)
}

export function getBossesByType(type: BossType): BossDefinition[] {
  return Object.values(BOSS_DEFINITIONS).filter(boss => boss.type === type)
}

export function getBossesByCategory(category: string): BossDefinition[] {
  return Object.values(BOSS_DEFINITIONS).filter(boss => boss.category === category)
}

export function canPlayerFightBoss(
  playerId: string,
  bossId: string,
  getCombatLevel: (playerId: string) => number,
  getSkillLevel: (playerId: string, skill: SkillType) => number,
  isQuestCompleted: (playerId: string, questId: string) => boolean,
  hasItem: (playerId: string, itemId: string, quantity: number) => boolean,
  getBossKillCount: (playerId: string, bossId: string) => number
): boolean {
  const boss = getBossDefinition(bossId)
  if (!boss) {
    return false
  }

  for (const requirement of boss.requirements) {
    switch (requirement.type) {
      case 'level':
        if (requirement.combatLevel && getCombatLevel(playerId) < requirement.combatLevel) {
          return false
        }
        break
      case 'skill':
        if (requirement.skillType && requirement.skillLevel) {
          if (getSkillLevel(playerId, requirement.skillType) < requirement.skillLevel) {
            return false
          }
        }
        break
      case 'quest':
        if (requirement.questId && !isQuestCompleted(playerId, requirement.questId)) {
          return false
        }
        break
      case 'item':
        if (requirement.itemId && requirement.quantity) {
          if (!hasItem(playerId, requirement.itemId, requirement.quantity)) {
            return false
          }
        }
        break
      case 'kc':
        if (requirement.killCount && getBossKillCount(playerId, bossId) < requirement.killCount) {
          return false
        }
        break
    }
  }

  return true
}
