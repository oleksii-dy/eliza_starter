/**
 * RuneScape Combat System Types
 * =============================
 * Complete type definitions for RuneScape combat mechanics
 */

export type WeaponType = 'melee' | 'ranged' | 'magic';
export type AttackStyle = 'stab' | 'slash' | 'crush' | 'magic' | 'ranged';
export type CombatStyle = 'accurate' | 'aggressive' | 'defensive' | 'controlled' | 'rapid' | 'longrange';

export interface CombatComponent {
  inCombat: boolean;
  target: string | null; // Entity ID
  lastAttackTime: number;
  attackSpeed: number; // Ticks between attacks (1 tick = 0.6 seconds)
  combatStyle: CombatStyle;
  autoRetaliate: boolean;
  
  // Combat state
  hitSplatQueue: HitSplat[];
  animationQueue: CombatAnimation[];
  
  // Special attack
  specialAttackEnergy: number; // 0-100
  specialAttackActive: boolean;
  
  // Protection prayers
  protectionPrayers: {
    melee: boolean;
    ranged: boolean;
    magic: boolean;
  };
  
  // Combat timers
  combatTimer: number; // Ticks until out of combat
  stunTimer: number;
  poisonTimer: number;
  freezeTimer: number;
}

export interface HitSplat {
  damage: number;
  type: 'normal' | 'max' | 'poison' | 'disease' | 'heal';
  timestamp: number;
  displayDuration: number;
}

export interface CombatAnimation {
  type: 'attack' | 'defend' | 'death' | 'special';
  weaponType: WeaponType;
  duration: number;
  timestamp: number;
}

export interface WeaponStats {
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
  attackSpeed: number; // Ticks between attacks
  attackRange: number; // Combat range in tiles
}

export interface CombatCalculations {
  // Attack roll calculation
  effectiveAttackLevel: number;
  attackBonus: number;
  attackRoll: number;
  
  // Defense roll calculation
  effectiveDefenseLevel: number;
  defenseBonus: number;
  defenseRoll: number;
  
  // Hit chance
  hitChance: number;
  
  // Damage calculation
  effectiveStrengthLevel: number;
  strengthBonus: number;
  maxHit: number;
  actualDamage: number;
}

export interface CombatHit {
  attackerId: string;
  targetId: string;
  damage: number;
  weaponType: WeaponType;
  attackStyle: AttackStyle;
  combatStyle: CombatStyle;
  hit: boolean; // true if hit, false if miss
  critical: boolean;
  timestamp: number;
  calculations: CombatCalculations;
}

export interface CombatEvent {
  type: 'attack' | 'hit' | 'death' | 'heal' | 'special_attack';
  attackerId?: string;
  targetId?: string;
  damage?: number;
  weapon?: string;
  timestamp: number;
  data?: Record<string, any>;
}

// Prayer types and effects
export interface Prayer {
  id: string;
  name: string;
  level: number;
  drainRate: number; // Points per minute
  effects: PrayerEffects;
}

export interface PrayerEffects {
  attackBonus: number;
  strengthBonus: number;
  defenseBonus: number;
  rangedBonus: number;
  magicBonus: number;
  protectFromMelee: boolean;
  protectFromRanged: boolean;
  protectFromMagic: boolean;
  healOverTime: number;
  other?: Record<string, any>;
}

// Special attacks
export interface SpecialAttack {
  id: string;
  name: string;
  energyCost: number; // 25, 50, 60, 100
  weaponType: WeaponType;
  effects: SpecialAttackEffects;
}

export interface SpecialAttackEffects {
  damageMultiplier: number;
  accuracyMultiplier: number;
  guaranteedHit: boolean;
  additionalEffects: {
    stun?: number; // Duration in ticks
    poison?: number; // Damage per tick
    drain?: { stat: string; amount: number }[];
    heal?: number;
    teleport?: boolean;
  };
}

// Combat formulas and constants
export const COMBAT_CONSTANTS = {
  TICK_DURATION: 600, // milliseconds
  BASE_ATTACK_SPEED: 4, // ticks
  COMBAT_TIMEOUT: 10, // seconds
  MAX_COMBAT_DISTANCE: 1, // tiles for melee
  RANGED_MAX_DISTANCE: 10, // tiles for ranged
  SPECIAL_ATTACK_REGEN: 30, // seconds per 10% energy
} as const;

export interface CombatFormulas {
  calculateEffectiveLevel(baseLevel: number, bonus: number, prayerBonus: number, combatStyle: CombatStyle): number;
  calculateAttackRoll(effectiveLevel: number, equipmentBonus: number): number;
  calculateDefenseRoll(effectiveLevel: number, equipmentBonus: number): number;
  calculateHitChance(attackRoll: number, defenseRoll: number): number;
  calculateMaxHit(effectiveStrength: number, strengthBonus: number): number;
  calculateDamage(maxHit: number): number;
}