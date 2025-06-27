/**
 * RuneScape Combat System Implementation
 * ======================================
 * Handles combat mechanics, damage calculation, and combat events
 */

import { logger } from '@elizaos/core';
import type { HyperfySystem, HyperfyWorld, HyperfyEntity } from '../../types/hyperfy';
import type { StatsComponent, SkillType } from '../types/stats';
import type { 
  CombatComponent, 
  CombatHit, 
  CombatEvent,
  WeaponType,
  AttackStyle,
  CombatStyle,
  CombatCalculations,
  HitSplat,
  COMBAT_CONSTANTS
} from '../types/combat';

export class CombatSystem implements HyperfySystem {
  name = 'CombatSystem';
  world: HyperfyWorld;
  enabled = true;

  // Combat state tracking
  private activeCombat: Map<string, CombatComponent> = new Map();
  private combatQueue: Map<string, number> = new Map(); // entityId -> next attack time
  private hitSplats: Map<string, HitSplat[]> = new Map(); // entityId -> hit splats
  
  // Combat tick counter (1 tick = 600ms in RuneScape)
  private tickCounter = 0;
  private lastTickTime = 0;

  constructor(world: HyperfyWorld) {
    this.world = world;
    logger.info('[CombatSystem] Initialized RuneScape combat mechanics');
  }

  async init(): Promise<void> {
    logger.info('[CombatSystem] Starting combat system...');
    
    // Subscribe to combat events
    this.world.events.on('rpg:attack', this.handleAttackRequest.bind(this));
    this.world.events.on('rpg:stop_combat', this.handleStopCombat.bind(this));
    this.world.events.on('rpg:special_attack', this.handleSpecialAttack.bind(this));
    
    // Start combat tick system
    this.startCombatTicks();
  }

  tick(delta: number): void {
    const now = Date.now();
    
    // Process combat ticks (every 600ms)
    if (now - this.lastTickTime >= COMBAT_CONSTANTS.TICK_DURATION) {
      this.processCombatTick();
      this.lastTickTime = now;
      this.tickCounter++;
    }
    
    // Update hit splats
    this.updateHitSplats(delta);
    
    // Check combat timeouts
    this.checkCombatTimeouts(now);
  }

  destroy(): void {
    this.world.events.off('rpg:attack');
    this.world.events.off('rpg:stop_combat');
    this.world.events.off('rpg:special_attack');
    logger.info('[CombatSystem] Combat system destroyed');
  }

  /**
   * Initiate combat between two entities
   */
  attack(attackerId: string, targetId: string, weaponType: WeaponType = 'melee'): boolean {
    const attacker = this.world.entities.players.get(attackerId) || this.world.entities.items.get(attackerId);
    const target = this.world.entities.players.get(targetId) || this.world.entities.items.get(targetId);

    if (!attacker || !target) {
      logger.warn(`[CombatSystem] Invalid entities for combat: ${attackerId} -> ${targetId}`);
      return false;
    }

    // Check if attack is valid
    if (!this.canAttack(attacker, target)) {
      return false;
    }

    // Get or create combat components
    let attackerCombat = this.getOrCreateCombatComponent(attackerId);
    let targetCombat = this.getOrCreateCombatComponent(targetId);

    // Set combat state
    attackerCombat.inCombat = true;
    attackerCombat.target = targetId;
    attackerCombat.combatTimer = 10; // 10 ticks = 6 seconds

    // Auto-retaliate for target
    if (targetCombat.autoRetaliate && !targetCombat.inCombat) {
      targetCombat.inCombat = true;
      targetCombat.target = attackerId;
      targetCombat.combatTimer = 10;
    }

    // Queue first attack if not already queued
    if (!this.combatQueue.has(attackerId)) {
      this.combatQueue.set(attackerId, this.tickCounter + 1); // Attack next tick
    }

    logger.info(`[CombatSystem] Combat initiated: ${attackerId} -> ${targetId}`);

    // Emit combat start event
    this.world.events.emit('rpg:combat_started', {
      attackerId,
      targetId,
      weaponType,
      timestamp: Date.now(),
    });

    return true;
  }

  /**
   * Process a single combat attack
   */
  private processAttack(attackerId: string): void {
    const attackerCombat = this.activeCombat.get(attackerId);
    if (!attackerCombat || !attackerCombat.target) return;

    const attacker = this.world.entities.players.get(attackerId) || this.world.entities.items.get(attackerId);
    const target = this.world.entities.players.get(attackerCombat.target) || this.world.entities.items.get(attackerCombat.target);

    if (!attacker || !target) {
      this.stopCombat(attackerId);
      return;
    }

    // Get stats
    const attackerStats = this.getEntityStats(attacker);
    const targetStats = this.getEntityStats(target);

    if (!attackerStats || !targetStats) {
      logger.warn(`[CombatSystem] Missing stats for combat entities`);
      return;
    }

    // Calculate hit
    const hit = this.calculateHit(attackerStats, targetStats, attackerCombat, 'melee');

    // Apply damage if hit
    if (hit.hit && hit.damage > 0) {
      this.applyDamage(attackerCombat.target, hit.damage, attackerId);
      
      // Grant combat XP
      this.grantCombatXP(attackerId, hit.damage, hit.weaponType);
    }

    // Add hit splat
    this.addHitSplat(attackerCombat.target, {
      damage: hit.damage,
      type: hit.hit ? 'normal' : 'normal',
      timestamp: Date.now(),
      displayDuration: 2000,
    });

    // Queue next attack
    const attackSpeed = this.getAttackSpeed(attacker);
    this.combatQueue.set(attackerId, this.tickCounter + attackSpeed);

    // Emit combat hit event
    this.world.events.emit('rpg:combat_hit', hit);

    logger.info(`[CombatSystem] ${attackerId} ${hit.hit ? 'hit' : 'missed'} ${attackerCombat.target} for ${hit.damage} damage`);
  }

  /**
   * Calculate hit using RuneScape combat formula
   */
  private calculateHit(
    attackerStats: StatsComponent,
    targetStats: StatsComponent,
    attackerCombat: CombatComponent,
    weaponType: WeaponType
  ): CombatHit {
    // Get relevant skill levels based on weapon type
    const attackSkill = this.getAttackSkill(weaponType);
    const defenseSkill = 'defence' as SkillType;

    // Calculate effective levels
    const effectiveAttackLevel = this.calculateEffectiveLevel(
      attackerStats[attackSkill].level,
      attackerStats[attackSkill].bonus,
      0, // Prayer bonus (simplified for POC)
      attackerCombat.combatStyle
    );

    const effectiveDefenseLevel = this.calculateEffectiveLevel(
      targetStats[defenseSkill].level,
      targetStats[defenseSkill].bonus,
      0, // Prayer bonus
      'defensive'
    );

    // Get equipment bonuses
    const attackBonus = this.getAttackBonus(attackerStats, weaponType);
    const defenseBonus = this.getDefenseBonus(targetStats, weaponType);

    // Calculate attack and defense rolls
    const attackRoll = effectiveAttackLevel * (attackBonus + 64);
    const defenseRoll = effectiveDefenseLevel * (defenseBonus + 64);

    // Calculate hit chance
    let hitChance: number;
    if (attackRoll > defenseRoll) {
      hitChance = 1 - (defenseRoll + 2) / (2 * (attackRoll + 1));
    } else {
      hitChance = attackRoll / (2 * (defenseRoll + 1));
    }

    const hit = Math.random() < hitChance;

    // Calculate damage if hit
    let damage = 0;
    if (hit) {
      const maxHit = this.calculateMaxHit(attackerStats, weaponType, attackerCombat.combatStyle);
      damage = Math.floor(Math.random() * (maxHit + 1));
    }

    const calculations: CombatCalculations = {
      effectiveAttackLevel,
      attackBonus,
      attackRoll,
      effectiveDefenseLevel,
      defenseBonus,
      defenseRoll,
      hitChance,
      effectiveStrengthLevel: effectiveAttackLevel, // Simplified
      strengthBonus: this.getStrengthBonus(attackerStats, weaponType),
      maxHit: hit ? this.calculateMaxHit(attackerStats, weaponType, attackerCombat.combatStyle) : 0,
      actualDamage: damage,
    };

    return {
      attackerId: '', // Will be set by caller
      targetId: '', // Will be set by caller
      damage,
      weaponType,
      attackStyle: this.getAttackStyle(weaponType),
      combatStyle: attackerCombat.combatStyle,
      hit,
      critical: false, // TODO: Implement critical hits
      timestamp: Date.now(),
      calculations,
    };
  }

  /**
   * Calculate effective level for combat
   */
  private calculateEffectiveLevel(
    baseLevel: number,
    equipmentBonus: number,
    prayerBonus: number,
    combatStyle: CombatStyle
  ): number {
    let effective = baseLevel;

    // Combat style bonuses
    switch (combatStyle) {
      case 'accurate':
        effective += 3;
        break;
      case 'aggressive':
        effective += 3;
        break;
      case 'defensive':
        effective += 3;
        break;
      case 'controlled':
        effective += 1;
        break;
    }

    effective += prayerBonus;
    effective += Math.floor(equipmentBonus / 8); // Equipment bonus contribution

    return effective;
  }

  /**
   * Calculate maximum hit for weapon type
   */
  private calculateMaxHit(stats: StatsComponent, weaponType: WeaponType, combatStyle: CombatStyle): number {
    let baseLevel: number;
    let strengthBonus: number;

    switch (weaponType) {
      case 'melee':
        baseLevel = stats.strength.level;
        strengthBonus = stats.combatBonuses.meleeStrength;
        break;
      case 'ranged':
        baseLevel = stats.ranged.level;
        strengthBonus = stats.combatBonuses.rangedStrength;
        break;
      case 'magic':
        baseLevel = stats.magic.level;
        strengthBonus = stats.combatBonuses.magicDamage;
        break;
      default:
        return 1;
    }

    // Calculate effective strength level
    const effectiveStrength = this.calculateEffectiveLevel(baseLevel, 0, 0, combatStyle);

    // Max hit formula: floor(0.5 + effectiveStrength * (strengthBonus + 64) / 640)
    const maxHit = Math.floor(0.5 + effectiveStrength * (strengthBonus + 64) / 640);

    return Math.max(1, maxHit);
  }

  /**
   * Apply damage to target
   */
  private applyDamage(targetId: string, damage: number, attackerId: string): void {
    const target = this.world.entities.players.get(targetId) || this.world.entities.items.get(targetId);
    if (!target) return;

    const stats = this.getEntityStats(target);
    if (!stats) return;

    // Apply damage
    stats.hitpoints.current = Math.max(0, stats.hitpoints.current - damage);

    // Check for death
    if (stats.hitpoints.current === 0) {
      this.handleDeath(targetId, attackerId);
    }

    // Update entity stats
    this.setEntityStats(target, stats);
  }

  /**
   * Handle entity death
   */
  private handleDeath(deadEntityId: string, killerId: string): void {
    // Stop combat for dead entity
    this.stopCombat(deadEntityId);

    // Emit death event
    this.world.events.emit('rpg:entity_death', {
      deadEntityId,
      killerId,
      timestamp: Date.now(),
    });

    logger.info(`[CombatSystem] ${deadEntityId} was killed by ${killerId}`);
  }

  /**
   * Grant combat XP based on damage dealt
   */
  private grantCombatXP(attackerId: string, damage: number, weaponType: WeaponType): void {
    const xpMultiplier = 4; // RuneScape standard

    // Emit XP gain events
    switch (weaponType) {
      case 'melee':
        this.world.events.emit('rpg:xp_gain', { playerId: attackerId, skill: 'attack', amount: damage * xpMultiplier, source: 'combat' });
        this.world.events.emit('rpg:xp_gain', { playerId: attackerId, skill: 'strength', amount: damage * xpMultiplier, source: 'combat' });
        this.world.events.emit('rpg:xp_gain', { playerId: attackerId, skill: 'defence', amount: damage * 1.33, source: 'combat' });
        break;
      case 'ranged':
        this.world.events.emit('rpg:xp_gain', { playerId: attackerId, skill: 'ranged', amount: damage * xpMultiplier, source: 'combat' });
        this.world.events.emit('rpg:xp_gain', { playerId: attackerId, skill: 'defence', amount: damage * 1.33, source: 'combat' });
        break;
      case 'magic':
        this.world.events.emit('rpg:xp_gain', { playerId: attackerId, skill: 'magic', amount: damage * 2, source: 'combat' });
        this.world.events.emit('rpg:xp_gain', { playerId: attackerId, skill: 'defence', amount: damage * 1.33, source: 'combat' });
        break;
    }

    // Always grant hitpoints XP
    this.world.events.emit('rpg:xp_gain', { playerId: attackerId, skill: 'hitpoints', amount: damage * 1.33, source: 'combat' });
  }

  /**
   * Process combat tick (every 600ms)
   */
  private processCombatTick(): void {
    // Process queued attacks
    for (const [entityId, attackTick] of this.combatQueue.entries()) {
      if (this.tickCounter >= attackTick) {
        this.processAttack(entityId);
        this.combatQueue.delete(entityId);
      }
    }

    // Decrease combat timers
    for (const [entityId, combat] of this.activeCombat.entries()) {
      if (combat.combatTimer > 0) {
        combat.combatTimer--;
        if (combat.combatTimer === 0) {
          this.stopCombat(entityId);
        }
      }
    }

    // Regenerate special attack energy
    this.regenerateSpecialAttack();
  }

  /**
   * Stop combat for an entity
   */
  private stopCombat(entityId: string): void {
    const combat = this.activeCombat.get(entityId);
    if (!combat) return;

    combat.inCombat = false;
    combat.target = null;
    combat.combatTimer = 0;

    // Remove from combat queue
    this.combatQueue.delete(entityId);

    logger.info(`[CombatSystem] ${entityId} stopped combat`);
  }

  /**
   * Helper methods
   */
  private getOrCreateCombatComponent(entityId: string): CombatComponent {
    if (!this.activeCombat.has(entityId)) {
      this.activeCombat.set(entityId, {
        inCombat: false,
        target: null,
        lastAttackTime: 0,
        attackSpeed: 4,
        combatStyle: 'accurate',
        autoRetaliate: true,
        hitSplatQueue: [],
        animationQueue: [],
        specialAttackEnergy: 100,
        specialAttackActive: false,
        protectionPrayers: {
          melee: false,
          ranged: false,
          magic: false,
        },
        combatTimer: 0,
        stunTimer: 0,
        poisonTimer: 0,
        freezeTimer: 0,
      });
    }
    return this.activeCombat.get(entityId)!;
  }

  private canAttack(attacker: HyperfyEntity, target: HyperfyEntity): boolean {
    // Basic validation - can be expanded
    return attacker !== target;
  }

  private getEntityStats(entity: HyperfyEntity): StatsComponent | null {
    return (entity.data as any)?.stats || null;
  }

  private setEntityStats(entity: HyperfyEntity, stats: StatsComponent): void {
    if (!entity.data) entity.data = {};
    (entity.data as any).stats = stats;
  }

  private getAttackSkill(weaponType: WeaponType): SkillType {
    switch (weaponType) {
      case 'melee': return 'attack';
      case 'ranged': return 'ranged';
      case 'magic': return 'magic';
      default: return 'attack';
    }
  }

  private getAttackStyle(weaponType: WeaponType): AttackStyle {
    switch (weaponType) {
      case 'melee': return 'slash';
      case 'ranged': return 'ranged';
      case 'magic': return 'magic';
      default: return 'slash';
    }
  }

  private getAttackBonus(stats: StatsComponent, weaponType: WeaponType): number {
    switch (weaponType) {
      case 'melee': return stats.combatBonuses.attackSlash;
      case 'ranged': return stats.combatBonuses.attackRanged;
      case 'magic': return stats.combatBonuses.attackMagic;
      default: return 0;
    }
  }

  private getDefenseBonus(stats: StatsComponent, weaponType: WeaponType): number {
    switch (weaponType) {
      case 'melee': return stats.combatBonuses.defenseSlash;
      case 'ranged': return stats.combatBonuses.defenseRanged;
      case 'magic': return stats.combatBonuses.defenseMagic;
      default: return 0;
    }
  }

  private getStrengthBonus(stats: StatsComponent, weaponType: WeaponType): number {
    switch (weaponType) {
      case 'melee': return stats.combatBonuses.meleeStrength;
      case 'ranged': return stats.combatBonuses.rangedStrength;
      case 'magic': return stats.combatBonuses.magicDamage;
      default: return 0;
    }
  }

  private getAttackSpeed(entity: HyperfyEntity): number {
    // Default attack speed (can be enhanced with weapon data)
    return 4; // ticks
  }

  private addHitSplat(entityId: string, hitSplat: HitSplat): void {
    if (!this.hitSplats.has(entityId)) {
      this.hitSplats.set(entityId, []);
    }
    this.hitSplats.get(entityId)!.push(hitSplat);
  }

  private updateHitSplats(delta: number): void {
    const now = Date.now();
    for (const [entityId, splats] of this.hitSplats.entries()) {
      // Remove expired hit splats
      this.hitSplats.set(entityId, splats.filter(splat => 
        now - splat.timestamp < splat.displayDuration
      ));
    }
  }

  private checkCombatTimeouts(now: number): void {
    // Remove expired combat states
    for (const [entityId, combat] of this.activeCombat.entries()) {
      if (!combat.inCombat && combat.combatTimer === 0) {
        this.activeCombat.delete(entityId);
      }
    }
  }

  private regenerateSpecialAttack(): void {
    // Regenerate 10% special attack energy every 30 seconds (50 ticks)
    if (this.tickCounter % 50 === 0) {
      for (const combat of this.activeCombat.values()) {
        if (combat.specialAttackEnergy < 100) {
          combat.specialAttackEnergy = Math.min(100, combat.specialAttackEnergy + 10);
        }
      }
    }
  }

  private startCombatTicks(): void {
    this.lastTickTime = Date.now();
  }

  // Event handlers
  private handleAttackRequest(event: any): void {
    const { attackerId, targetId, weaponType } = event;
    this.attack(attackerId, targetId, weaponType);
  }

  private handleStopCombat(event: any): void {
    const { entityId } = event;
    this.stopCombat(entityId);
  }

  private handleSpecialAttack(event: any): void {
    // TODO: Implement special attacks
    logger.info('[CombatSystem] Special attack requested (not yet implemented)');
  }
}