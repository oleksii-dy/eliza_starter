/**
 * RuneScape RPG Stats System Types
 * =================================
 * Complete type definitions for all 23 RuneScape skills and combat mechanics
 */

// Skill Types
export type SkillType =
  // Combat Skills (7)
  | 'attack'
  | 'strength'
  | 'defence'
  | 'hitpoints'
  | 'ranged'
  | 'prayer'
  | 'magic'
  // Production/Artisan Skills (6)
  | 'cooking'
  | 'crafting'
  | 'fletching'
  | 'herblore'
  | 'runecrafting'
  | 'smithing'
  // Gathering Skills (3)
  | 'mining'
  | 'fishing'
  | 'woodcutting'
  // Utility/Support Skills (7)
  | 'agility'
  | 'construction'
  | 'firemaking'
  | 'slayer'
  | 'thieving'
  | 'farming'
  | 'hunter';

export interface SkillData {
  level: number;
  xp: number;
  bonus: number; // Equipment bonuses
}

export interface CombatBonuses {
  // Attack bonuses
  attackStab: number;
  attackSlash: number;
  attackCrush: number;
  attackMagic: number;
  attackRanged: number;

  // Defence bonuses
  defenseStab: number;
  defenseSlash: number;
  defenseCrush: number;
  defenseMagic: number;
  defenseRanged: number;

  // Strength bonuses
  meleeStrength: number;
  rangedStrength: number;
  magicDamage: number;
  prayerBonus: number;
}

export interface StatsComponent {
  // Combat Stats
  hitpoints: SkillData & { current: number; max: number };
  attack: SkillData;
  strength: SkillData;
  defence: SkillData;
  ranged: SkillData;
  magic: SkillData;
  prayer: SkillData & { points: number; maxPoints: number };

  // Production Skills
  cooking: SkillData;
  crafting: SkillData;
  fletching: SkillData;
  herblore: SkillData;
  runecrafting: SkillData;
  smithing: SkillData;

  // Gathering Skills
  mining: SkillData;
  fishing: SkillData;
  woodcutting: SkillData;

  // Utility Skills
  agility: SkillData;
  construction: SkillData;
  firemaking: SkillData;
  slayer: SkillData;
  thieving: SkillData;
  farming: SkillData;
  hunter: SkillData;

  // Combat Bonuses (from equipment)
  combatBonuses: CombatBonuses;

  // Computed values
  combatLevel: number;
  totalLevel: number;
  totalXP: number;
}

export interface XPGainEvent {
  skill: SkillType;
  amount: number;
  source?: string;
  timestamp: number;
}

export interface LevelUpEvent {
  skill: SkillType;
  oldLevel: number;
  newLevel: number;
  timestamp: number;
}

// RuneScape XP Formula Constants
export const XP_CONSTANTS = {
  MAX_LEVEL: 99,
  MIN_LEVEL: 1,
  HITPOINTS_START_LEVEL: 10,
  COMBAT_MODIFIER: 0.25,
  MELEE_MODIFIER: 0.325,
  RANGE_MAGIC_MODIFIER: 0.325,
  RANGE_MAGIC_MULTIPLIER: 1.5,
} as const;

// Combat formulas
export interface CombatFormulas {
  calculateCombatLevel(stats: StatsComponent): number;
  calculateMaxHit(attackerStats: StatsComponent, weaponType: 'melee' | 'ranged' | 'magic'): number;
  calculateAccuracy(
    attackerStats: StatsComponent,
    targetStats: StatsComponent,
    attackType: string
  ): number;
  getXPForLevel(level: number): number;
  getLevelForXP(xp: number): number;
}
