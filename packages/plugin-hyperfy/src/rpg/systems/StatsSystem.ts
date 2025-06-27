/**
 * RuneScape Stats System Implementation
 * ====================================
 * Handles all 23 skill progression, XP calculations, and level management
 */

import { logger } from '@elizaos/core';
import type { HyperfySystem, HyperfyWorld } from '../../types/hyperfy';
import type { 
  StatsComponent, 
  SkillType, 
  XPGainEvent, 
  LevelUpEvent,
  XP_CONSTANTS 
} from '../types/stats';

export class StatsSystem implements HyperfySystem {
  name = 'StatsSystem';
  world: HyperfyWorld;
  enabled = true;

  // XP table for levels 1-99 (RuneScape formula)
  private xpTable: number[] = [];
  
  // Event tracking
  private xpGainEvents: XPGainEvent[] = [];
  private levelUpEvents: LevelUpEvent[] = [];

  constructor(world: HyperfyWorld) {
    this.world = world;
    this.generateXPTable();
    logger.info('[StatsSystem] Initialized with RuneScape XP formulas');
  }

  async init(): Promise<void> {
    logger.info('[StatsSystem] Starting stats system...');
    // Subscribe to world events for XP gains
    this.world.events.on('rpg:xp_gain', this.handleXPGain.bind(this));
    this.world.events.on('rpg:combat_hit', this.handleCombatXP.bind(this));
  }

  tick(delta: number): void {
    // Process any queued XP events or stat updates
    this.processQueuedEvents();
  }

  destroy(): void {
    this.world.events.off('rpg:xp_gain');
    this.world.events.off('rpg:combat_hit');
    logger.info('[StatsSystem] Stats system destroyed');
  }

  /**
   * Generate RuneScape XP table using official formula:
   * XP = floor(sum(floor(x + 300 * 2^(x/7))) / 4) for x=1 to level-1
   */
  private generateXPTable(): void {
    this.xpTable = [0, 0]; // Levels 0 and 1 require 0 XP

    for (let level = 2; level <= 99; level++) {
      let points = 0;
      
      // Sum from x=1 to level-1
      for (let x = 1; x < level; x++) {
        points += Math.floor(x + 300 * Math.pow(2, x / 7));
      }
      
      // Divide by 4 and floor the result
      this.xpTable[level] = Math.floor(points / 4);
    }

    logger.info(`[StatsSystem] Generated XP table: Level 99 requires ${this.xpTable[99].toLocaleString()} XP`);
  }

  /**
   * Get XP required for a specific level
   */
  getXPForLevel(level: number): number {
    if (level < 1 || level > 99) return 0;
    return this.xpTable[level];
  }

  /**
   * Get level for a specific XP amount
   */
  getLevelForXP(xp: number): number {
    for (let level = 1; level <= 99; level++) {
      if (xp < this.xpTable[level]) {
        return level - 1;
      }
    }
    return 99;
  }

  /**
   * Create initial stats for a new player
   */
  createInitialStats(): StatsComponent {
    const initialSkill = (startLevel: number = 1): any => ({
      level: startLevel,
      xp: startLevel === 10 ? this.getXPForLevel(10) : 0,
      bonus: 0,
    });

    return {
      // Combat Skills
      hitpoints: { 
        ...initialSkill(10), 
        current: 100, 
        max: 100 
      },
      attack: initialSkill(),
      strength: initialSkill(),
      defence: initialSkill(),
      ranged: initialSkill(),
      magic: initialSkill(),
      prayer: { 
        ...initialSkill(), 
        points: 0, 
        maxPoints: 0 
      },

      // Production Skills
      cooking: initialSkill(),
      crafting: initialSkill(),
      fletching: initialSkill(),
      herblore: initialSkill(),
      runecrafting: initialSkill(),
      smithing: initialSkill(),

      // Gathering Skills
      mining: initialSkill(),
      fishing: initialSkill(),
      woodcutting: initialSkill(),

      // Utility Skills
      agility: initialSkill(),
      construction: initialSkill(),
      firemaking: initialSkill(),
      slayer: initialSkill(),
      thieving: initialSkill(),
      farming: initialSkill(),
      hunter: initialSkill(),

      // Combat bonuses (from equipment)
      combatBonuses: {
        attackStab: 0,
        attackSlash: 0,
        attackCrush: 0,
        attackMagic: 0,
        attackRanged: 0,
        defenseStab: 0,
        defenseSlash: 0,
        defenseCrush: 0,
        defenseMagic: 0,
        defenseRanged: 0,
        meleeStrength: 0,
        rangedStrength: 0,
        magicDamage: 0,
        prayerBonus: 0,
      },

      // Computed values
      combatLevel: 3,
      totalLevel: 32, // Sum of all starting levels
      totalXP: this.getXPForLevel(10), // Just hitpoints XP
    };
  }

  /**
   * Grant XP to a player and handle level ups
   */
  grantXP(playerId: string, skill: SkillType, amount: number, source?: string): void {
    const player = this.world.entities.players.get(playerId);
    if (!player) {
      logger.warn(`[StatsSystem] Player ${playerId} not found for XP grant`);
      return;
    }

    // Get or create stats component
    let stats = this.getPlayerStats(playerId);
    if (!stats) {
      stats = this.createInitialStats();
      this.setPlayerStats(playerId, stats);
    }

    const skillData = stats[skill];
    const oldLevel = skillData.level;
    const oldXP = skillData.xp;

    // Add XP
    skillData.xp += amount;

    // Check for level up
    const newLevel = this.getLevelForXP(skillData.xp);
    if (newLevel > oldLevel) {
      skillData.level = newLevel;
      this.handleLevelUp(playerId, skill, oldLevel, newLevel, stats);
    }

    // Update computed stats
    this.updateComputedStats(stats);

    // Emit XP gain event
    const xpEvent: XPGainEvent = {
      skill,
      amount,
      source,
      timestamp: Date.now(),
    };

    this.world.events.emit('rpg:xp_gained', {
      playerId,
      skill,
      amount,
      oldXP,
      newXP: skillData.xp,
      oldLevel,
      newLevel,
      source,
    });

    logger.info(`[StatsSystem] ${playerId} gained ${amount} ${skill} XP (${skillData.xp}/${this.getXPForLevel(newLevel + 1)})`);
  }

  /**
   * Handle level up events
   */
  private handleLevelUp(
    playerId: string, 
    skill: SkillType, 
    oldLevel: number, 
    newLevel: number,
    stats: StatsComponent
  ): void {
    // Special handling for hitpoints
    if (skill === 'hitpoints') {
      const hpIncrease = (newLevel - oldLevel) * 10;
      stats.hitpoints.max += hpIncrease;
      stats.hitpoints.current = stats.hitpoints.max; // Full heal on level up
    }

    // Special handling for prayer
    if (skill === 'prayer') {
      const prayerIncrease = Math.floor((newLevel - oldLevel) * 2.5);
      stats.prayer.maxPoints += prayerIncrease;
      stats.prayer.points = stats.prayer.maxPoints; // Full restore on level up
    }

    // Emit level up event
    const levelUpEvent: LevelUpEvent = {
      skill,
      oldLevel,
      newLevel,
      timestamp: Date.now(),
    };

    this.world.events.emit('rpg:level_up', {
      playerId,
      skill,
      oldLevel,
      newLevel,
      unlockedFeatures: this.getUnlockedFeatures(skill, newLevel),
    });

    logger.info(`[StatsSystem] 🎉 ${playerId} leveled up ${skill}: ${oldLevel} → ${newLevel}`);
  }

  /**
   * Calculate RuneScape combat level
   */
  calculateCombatLevel(stats: StatsComponent): number {
    const base = 0.25 * (
      stats.defence.level + 
      stats.hitpoints.level + 
      Math.floor(stats.prayer.level / 2)
    );

    const melee = 0.325 * (stats.attack.level + stats.strength.level);
    const range = 0.325 * Math.floor(stats.ranged.level * 1.5);
    const magic = 0.325 * Math.floor(stats.magic.level * 1.5);

    return Math.floor(base + Math.max(melee, range, magic));
  }

  /**
   * Update computed stats (combat level, total level, etc.)
   */
  private updateComputedStats(stats: StatsComponent): void {
    // Calculate combat level
    stats.combatLevel = this.calculateCombatLevel(stats);

    // Calculate total level
    stats.totalLevel = Object.keys(stats)
      .filter(key => typeof stats[key as SkillType] === 'object' && 'level' in stats[key as SkillType])
      .reduce((total, skill) => total + (stats[skill as SkillType] as any).level, 0);

    // Calculate total XP
    stats.totalXP = Object.keys(stats)
      .filter(key => typeof stats[key as SkillType] === 'object' && 'xp' in stats[key as SkillType])
      .reduce((total, skill) => total + (stats[skill as SkillType] as any).xp, 0);
  }

  /**
   * Get features unlocked at a specific level
   */
  private getUnlockedFeatures(skill: SkillType, level: number): string[] {
    const unlocks: string[] = [];
    
    // Add skill-specific unlocks based on level
    // This would be expanded with actual RuneScape unlock data
    if (level >= 5) unlocks.push(`${skill}_basic_equipment`);
    if (level >= 10) unlocks.push(`${skill}_intermediate_content`);
    if (level >= 20) unlocks.push(`${skill}_advanced_equipment`);
    if (level >= 40) unlocks.push(`${skill}_special_abilities`);
    if (level >= 60) unlocks.push(`${skill}_endgame_content`);

    return unlocks;
  }

  /**
   * Handle XP gain from events
   */
  private handleXPGain(event: any): void {
    const { playerId, skill, amount, source } = event;
    this.grantXP(playerId, skill, amount, source);
  }

  /**
   * Handle XP from combat hits
   */
  private handleCombatXP(event: any): void {
    const { attackerId, damage, weaponType } = event;
    
    // Grant combat XP based on damage dealt
    if (weaponType === 'melee') {
      this.grantXP(attackerId, 'attack', Math.floor(damage * 4), 'combat');
      this.grantXP(attackerId, 'strength', Math.floor(damage * 4), 'combat');
      this.grantXP(attackerId, 'defence', Math.floor(damage * 1.33), 'combat');
    } else if (weaponType === 'ranged') {
      this.grantXP(attackerId, 'ranged', Math.floor(damage * 4), 'combat');
      this.grantXP(attackerId, 'defence', Math.floor(damage * 1.33), 'combat');
    } else if (weaponType === 'magic') {
      this.grantXP(attackerId, 'magic', Math.floor(damage * 2), 'combat');
      this.grantXP(attackerId, 'defence', Math.floor(damage * 1.33), 'combat');
    }

    // Always grant hitpoints XP
    this.grantXP(attackerId, 'hitpoints', Math.floor(damage * 1.33), 'combat');
  }

  /**
   * Process queued events (for performance)
   */
  private processQueuedEvents(): void {
    // Process any batched XP events
    // This could be optimized for performance with large numbers of events
  }

  /**
   * Get player stats component
   */
  getPlayerStats(playerId: string): StatsComponent | null {
    const player = this.world.entities.players.get(playerId);
    return player?.data?.stats || null;
  }

  /**
   * Set player stats component
   */
  setPlayerStats(playerId: string, stats: StatsComponent): void {
    const player = this.world.entities.players.get(playerId);
    if (player) {
      if (!player.data) player.data = {};
      (player.data as any).stats = stats;
    }
  }

  /**
   * Get skill level for requirements checking
   */
  getSkillLevel(playerId: string, skill: SkillType): number {
    const stats = this.getPlayerStats(playerId);
    return stats?.[skill]?.level || 1;
  }

  /**
   * Check if player meets skill requirements
   */
  meetsRequirements(playerId: string, requirements: Partial<Record<SkillType, number>>): boolean {
    const stats = this.getPlayerStats(playerId);
    if (!stats) return false;

    for (const [skill, requiredLevel] of Object.entries(requirements)) {
      const playerLevel = stats[skill as SkillType]?.level || 1;
      if (playerLevel < requiredLevel) {
        return false;
      }
    }

    return true;
  }
}