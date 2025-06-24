import { System } from '../../core/systems/System';
import type { World } from '../../types';
import {
  RPGEntity,
  StatsComponent,
  CombatComponent,
  SkillType
} from '../types';

export interface Prayer {
  id: string;
  name: string;
  level: number;
  drainRate: number; // Points per minute
  effects: PrayerEffect[];
  overhead?: boolean; // Protection prayers show overhead icon
  category: PrayerCategory;
}

export enum PrayerCategory {
  COMBAT = 'combat',
  SKILL = 'skill',
  PROTECTION = 'protection',
  OTHER = 'other'
}

export interface PrayerEffect {
  type: 'stat_boost' | 'damage_reduction' | 'protection' | 'other';
  stat?: string;
  modifier?: number; // Percentage boost/reduction
  value?: any;
}

export interface ActivePrayer {
  prayerId: string;
  startTime: number;
  overhead?: boolean;
}

export class PrayerSystem extends System {
  private prayers: Map<string, Prayer> = new Map();
  private activePrayers: Map<string, Set<string>> = new Map(); // entityId -> Set of prayer IDs
  private prayerDrainTimers: Map<string, number> = new Map();

  // Configuration
  private readonly PRAYER_TICK_RATE = 600; // milliseconds (game tick)
  private readonly BASE_DRAIN_RESISTANCE = 120; // Base time in seconds per prayer point

  private originalStats: Map<string, any> = new Map();

  constructor(world: World) {
    super(world);
    this.registerDefaultPrayers();
  }

  /**
   * Register default prayers
   */
  private registerDefaultPrayers(): void {
    // Tier 1 prayers
    this.registerPrayer({
      id: 'thick_skin',
      name: 'Thick Skin',
      level: 1,
      drainRate: 3,
      category: PrayerCategory.COMBAT,
      effects: [{
        type: 'stat_boost',
        stat: 'defense',
        modifier: 5 // +5% defense
      }]
    });

    this.registerPrayer({
      id: 'burst_of_strength',
      name: 'Burst of Strength',
      level: 4,
      drainRate: 3,
      category: PrayerCategory.COMBAT,
      effects: [{
        type: 'stat_boost',
        stat: 'strength',
        modifier: 5 // +5% strength
      }]
    });

    this.registerPrayer({
      id: 'clarity_of_thought',
      name: 'Clarity of Thought',
      level: 7,
      drainRate: 3,
      category: PrayerCategory.COMBAT,
      effects: [{
        type: 'stat_boost',
        stat: 'attack',
        modifier: 5 // +5% attack
      }]
    });

    // Tier 2 prayers
    this.registerPrayer({
      id: 'rock_skin',
      name: 'Rock Skin',
      level: 10,
      drainRate: 6,
      category: PrayerCategory.COMBAT,
      effects: [{
        type: 'stat_boost',
        stat: 'defense',
        modifier: 10 // +10% defense
      }]
    });

    this.registerPrayer({
      id: 'superhuman_strength',
      name: 'Superhuman Strength',
      level: 13,
      drainRate: 6,
      category: PrayerCategory.COMBAT,
      effects: [{
        type: 'stat_boost',
        stat: 'strength',
        modifier: 10 // +10% strength
      }]
    });

    this.registerPrayer({
      id: 'improved_reflexes',
      name: 'Improved Reflexes',
      level: 16,
      drainRate: 6,
      category: PrayerCategory.COMBAT,
      effects: [{
        type: 'stat_boost',
        stat: 'attack',
        modifier: 10 // +10% attack
      }]
    });

    // Protection prayers
    this.registerPrayer({
      id: 'protect_from_magic',
      name: 'Protect from Magic',
      level: 37,
      drainRate: 12,
      overhead: true,
      category: PrayerCategory.PROTECTION,
      effects: [{
        type: 'protection',
        stat: 'magic',
        modifier: 100 // 100% protection from NPCs, 40% from players
      }]
    });

    this.registerPrayer({
      id: 'protect_from_missiles',
      name: 'Protect from Missiles',
      level: 40,
      drainRate: 12,
      overhead: true,
      category: PrayerCategory.PROTECTION,
      effects: [{
        type: 'protection',
        stat: 'ranged',
        modifier: 100 // 100% protection from NPCs, 40% from players
      }]
    });

    this.registerPrayer({
      id: 'protect_from_melee',
      name: 'Protect from Melee',
      level: 43,
      drainRate: 12,
      overhead: true,
      category: PrayerCategory.PROTECTION,
      effects: [{
        type: 'protection',
        stat: 'melee',
        modifier: 100 // 100% protection from NPCs, 40% from players
      }]
    });

    // Higher tier prayers
    this.registerPrayer({
      id: 'eagle_eye',
      name: 'Eagle Eye',
      level: 44,
      drainRate: 12,
      category: PrayerCategory.COMBAT,
      effects: [{
        type: 'stat_boost',
        stat: 'ranged',
        modifier: 15 // +15% ranged
      }]
    });

    this.registerPrayer({
      id: 'mystic_might',
      name: 'Mystic Might',
      level: 45,
      drainRate: 12,
      category: PrayerCategory.COMBAT,
      effects: [{
        type: 'stat_boost',
        stat: 'magic',
        modifier: 15 // +15% magic
      }]
    });

    this.registerPrayer({
      id: 'steel_skin',
      name: 'Steel Skin',
      level: 28,
      drainRate: 12,
      category: PrayerCategory.COMBAT,
      effects: [{
        type: 'stat_boost',
        stat: 'defense',
        modifier: 15 // +15% defense
      }]
    });

    this.registerPrayer({
      id: 'ultimate_strength',
      name: 'Ultimate Strength',
      level: 31,
      drainRate: 12,
      category: PrayerCategory.COMBAT,
      effects: [{
        type: 'stat_boost',
        stat: 'strength',
        modifier: 15 // +15% strength
      }]
    });

    this.registerPrayer({
      id: 'incredible_reflexes',
      name: 'Incredible Reflexes',
      level: 34,
      drainRate: 12,
      category: PrayerCategory.COMBAT,
      effects: [{
        type: 'stat_boost',
        stat: 'attack',
        modifier: 15 // +15% attack
      }]
    });

    this.registerPrayer({
      id: 'piety',
      name: 'Piety',
      level: 70,
      drainRate: 24,
      category: PrayerCategory.COMBAT,
      effects: [
        {
          type: 'stat_boost',
          stat: 'attack',
          modifier: 20 // +20% attack
        },
        {
          type: 'stat_boost',
          stat: 'strength',
          modifier: 23 // +23% strength
        },
        {
          type: 'stat_boost',
          stat: 'defense',
          modifier: 25 // +25% defense
        }
      ]
    });
  }

  /**
   * Register a prayer
   */
  public registerPrayer(prayer: Prayer): void {
    this.prayers.set(prayer.id, prayer);
  }

  /**
   * Activate prayer for entity
   */
  public activatePrayer(entityId: string, prayerId: string): boolean {
    const entity = this.world.entities.get(entityId);
    if (!entity) {return false;}

    const stats = entity.getComponent<StatsComponent>('stats');
    if (!stats) {return false;}

    const prayer = this.prayers.get(prayerId);
    if (!prayer) {return false;}

    // Check prayer level requirement
    if (stats.prayer.level < prayer.level) {
      this.sendMessage(entityId, `You need level ${prayer.level} Prayer to use ${prayer.name}.`);
      return false;
    }

    // Check if player has prayer points
    if (stats.prayer.points <= 0) {
      this.sendMessage(entityId, 'You have run out of Prayer points.');
      return false;
    }

    // Get or create active prayers set
    let entityPrayers = this.activePrayers.get(entityId);
    if (!entityPrayers) {
      entityPrayers = new Set();
      this.activePrayers.set(entityId, entityPrayers);
    }

    // Deactivate conflicting prayers
    this.deactivateConflictingPrayers(entityId, prayer);

    // Activate prayer
    entityPrayers.add(prayerId);

    // Apply prayer effects
    this.applyPrayerEffects(entity, prayer);

    // Update combat component for protection prayers
    if (prayer.overhead) {
      const combat = entity.getComponent<CombatComponent>('combat');
      if (combat) {
        this.updateProtectionPrayers(combat, prayer, true);
      }
    }

    // Emit event
    this.world.events.emit('prayer:activated', {
      entityId,
      prayerId,
      prayerName: prayer.name
    });

    return true;
  }

  /**
   * Deactivate prayer
   */
  public deactivatePrayer(entityId: string, prayerId: string): boolean {
    const entityPrayers = this.activePrayers.get(entityId);
    if (!entityPrayers || !entityPrayers.has(prayerId)) {
      return false;
    }

    const entity = this.world.entities.get(entityId);
    if (!entity) {return false;}

    const prayer = this.prayers.get(prayerId);
    if (!prayer) {return false;}

    // Remove prayer
    entityPrayers.delete(prayerId);

    // Remove prayer effects
    this.removePrayerEffects(entity, prayer);

    // Update combat component for protection prayers
    if (prayer.overhead) {
      const combat = entity.getComponent<CombatComponent>('combat');
      if (combat) {
        this.updateProtectionPrayers(combat, prayer, false);
      }
    }

    // Emit event
    this.world.events.emit('prayer:deactivated', {
      entityId,
      prayerId,
      prayerName: prayer.name
    });

    return true;
  }

  /**
   * Deactivate all prayers
   */
  public deactivateAllPrayers(entityId: string): void {
    const entityPrayers = this.activePrayers.get(entityId);
    if (!entityPrayers) {return;}

    for (const prayerId of Array.from(entityPrayers)) {
      this.deactivatePrayer(entityId, prayerId);
    }
  }

  /**
   * Update prayer drain
   */
  public update(delta: number): void {
    const tickTime = Date.now();

    for (const [entityId, prayerSet] of this.activePrayers) {
      if (prayerSet.size === 0) {continue;}

      const entity = this.world.entities.get(entityId);
      if (!entity) {continue;}

      const stats = entity.getComponent<StatsComponent>('stats');
      if (!stats) {continue;}

      // Check if it's time to drain
      const lastDrain = this.prayerDrainTimers.get(entityId) || 0;
      if (tickTime - lastDrain >= this.PRAYER_TICK_RATE) {
        this.prayerDrainTimers.set(entityId, tickTime);

        // Calculate total drain rate
        let totalDrainRate = 0;
        for (const prayerId of prayerSet) {
          const prayer = this.prayers.get(prayerId);
          if (prayer) {
            totalDrainRate += prayer.drainRate;
          }
        }

        // Apply prayer bonus from equipment
        const prayerBonus = stats.combatBonuses.prayerBonus || 0;
        const drainResistance = this.BASE_DRAIN_RESISTANCE + (prayerBonus * 2);

        // Calculate drain amount
        const drainPerTick = totalDrainRate / (drainResistance / (this.PRAYER_TICK_RATE / 1000));

        // Drain prayer points
        stats.prayer.points = Math.max(0, stats.prayer.points - drainPerTick);

        // If out of prayer points, deactivate all prayers
        if (stats.prayer.points <= 0) {
          this.deactivateAllPrayers(entityId);
          this.sendMessage(entityId, 'You have run out of Prayer points.');
        }
      }
    }
  }

  /**
   * Restore prayer points
   */
  public restorePrayer(entityId: string, amount: number): void {
    const entity = this.world.entities.get(entityId);
    if (!entity) {return;}

    const stats = entity.getComponent<StatsComponent>('stats');
    if (!stats) {return;}

    const previousPoints = stats.prayer.points;
    stats.prayer.points = Math.min(stats.prayer.maxPoints, stats.prayer.points + amount);

    const restored = stats.prayer.points - previousPoints;
    if (restored > 0) {
      this.world.events.emit('prayer:restored', {
        entityId,
        amount: restored,
        current: stats.prayer.points,
        max: stats.prayer.maxPoints
      });
    }
  }

  /**
   * Get active prayers
   */
  public getActivePrayers(entityId: string): string[] {
    const entityPrayers = this.activePrayers.get(entityId);
    return entityPrayers ? Array.from(entityPrayers) : [];
  }

  /**
   * Check if prayer is active
   */
  public isPrayerActive(entityId: string, prayerId: string): boolean {
    const entityPrayers = this.activePrayers.get(entityId);
    return entityPrayers ? entityPrayers.has(prayerId) : false;
  }

  /**
   * Get prayer by ID
   */
  public getPrayer(prayerId: string): Prayer | undefined {
    return this.prayers.get(prayerId);
  }

  /**
   * Get all prayers
   */
  public getAllPrayers(): Prayer[] {
    return Array.from(this.prayers.values());
  }

  /**
   * Get prayers for level
   */
  public getPrayersForLevel(level: number): Prayer[] {
    return Array.from(this.prayers.values()).filter(p => p.level <= level);
  }

  /**
   * Apply prayer effects
   */
  private applyPrayerEffects(entity: RPGEntity, prayer: Prayer): void {
    const stats = entity.getComponent<StatsComponent>('stats');
    if (!stats) {return;}

    // Store original stats if not already stored
    let originalStats = this.originalStats.get(entity.id);
    if (!originalStats) {
      originalStats = {
        attack: { ...stats.attack },
        strength: { ...stats.strength },
        defense: { ...stats.defense },
        ranged: { ...stats.ranged },
        magic: { ...stats.magic }
      };
      this.originalStats.set(entity.id, originalStats);
    }

    for (const effect of prayer.effects) {
      switch (effect.type) {
        case 'stat_boost':
          if (effect.stat && effect.modifier) {
            switch (effect.stat) {
              case 'attack':
                stats.attack.level = Math.floor(originalStats.attack.level * (1 + effect.modifier / 100));
                break;
              case 'strength':
                stats.strength.level = Math.floor(originalStats.strength.level * (1 + effect.modifier / 100));
                break;
              case 'defense':
                stats.defense.level = Math.floor(originalStats.defense.level * (1 + effect.modifier / 100));
                break;
              case 'ranged':
                stats.ranged.level = Math.floor(originalStats.ranged.level * (1 + effect.modifier / 100));
                break;
              case 'magic':
                stats.magic.level = Math.floor(originalStats.magic.level * (1 + effect.modifier / 100));
                break;
            }
          }
          break;
        case 'protection':
          // Protection is handled by combat system
          break;
      }
    }
  }

  /**
   * Remove prayer effects
   */
  private removePrayerEffects(entity: RPGEntity, prayer: Prayer): void {
    const stats = entity.getComponent<StatsComponent>('stats');
    if (!stats) {return;}

    const originalStats = this.originalStats.get(entity.id);
    if (!originalStats) {return;}

    // Recalculate stats from base values considering all active prayers
    const entityPrayers = this.activePrayers.get(entity.id);
    if (!entityPrayers) {return;}

    // Reset to original values
    stats.attack.level = originalStats.attack.level;
    stats.strength.level = originalStats.strength.level;
    stats.defense.level = originalStats.defense.level;
    stats.ranged.level = originalStats.ranged.level;
    stats.magic.level = originalStats.magic.level;

    // Reapply effects from remaining active prayers
    for (const prayerId of entityPrayers) {
      if (prayerId === prayer.id) {continue;} // Skip the prayer we're removing

      const activePrayer = this.prayers.get(prayerId);
      if (activePrayer) {
        for (const effect of activePrayer.effects) {
          if (effect.type === 'stat_boost' && effect.stat && effect.modifier) {
            switch (effect.stat) {
              case 'attack':
                stats.attack.level = Math.floor(originalStats.attack.level * (1 + effect.modifier / 100));
                break;
              case 'strength':
                stats.strength.level = Math.floor(originalStats.strength.level * (1 + effect.modifier / 100));
                break;
              case 'defense':
                stats.defense.level = Math.floor(originalStats.defense.level * (1 + effect.modifier / 100));
                break;
              case 'ranged':
                stats.ranged.level = Math.floor(originalStats.ranged.level * (1 + effect.modifier / 100));
                break;
              case 'magic':
                stats.magic.level = Math.floor(originalStats.magic.level * (1 + effect.modifier / 100));
                break;
            }
          }
        }
      }
    }

    // Clean up original stats if no prayers are active
    if (entityPrayers.size === 0) {
      this.originalStats.delete(entity.id);
    }
  }

  /**
   * Update protection prayers on combat component
   */
  private updateProtectionPrayers(combat: CombatComponent, prayer: Prayer, active: boolean): void {
    const protectionEffect = prayer.effects.find(e => e.type === 'protection');
    if (!protectionEffect) {return;}

    switch (protectionEffect.stat) {
      case 'melee':
        combat.protectionPrayers.melee = active;
        break;
      case 'ranged':
        combat.protectionPrayers.ranged = active;
        break;
      case 'magic':
        combat.protectionPrayers.magic = active;
        break;
    }
  }

  /**
   * Deactivate conflicting prayers
   */
  private deactivateConflictingPrayers(entityId: string, newPrayer: Prayer): void {
    const entityPrayers = this.activePrayers.get(entityId);
    if (!entityPrayers) {return;}

    // Overhead prayers conflict with each other
    if (newPrayer.overhead) {
      for (const prayerId of Array.from(entityPrayers)) {
        const prayer = this.prayers.get(prayerId);
        if (prayer && prayer.overhead && prayer.id !== newPrayer.id) {
          this.deactivatePrayer(entityId, prayerId);
        }
      }
    }

    // Stat boost prayers of the same type conflict
    for (const effect of newPrayer.effects) {
      if (effect.type === 'stat_boost' && effect.stat) {
        for (const prayerId of Array.from(entityPrayers)) {
          const prayer = this.prayers.get(prayerId);
          if (prayer && prayer.id !== newPrayer.id) {
            const hasConflict = prayer.effects.some(e =>
              e.type === 'stat_boost' && e.stat === effect.stat
            );
            if (hasConflict) {
              this.deactivatePrayer(entityId, prayerId);
            }
          }
        }
      }
    }
  }

  /**
   * Send message to entity
   */
  private sendMessage(entityId: string, message: string): void {
    this.world.events.emit('chat:system', {
      targetId: entityId,
      message
    });
  }

  /**
   * Calculate prayer drain modifier for PvP
   */
  public getPvPProtectionModifier(): number {
    return 0.4; // 40% damage reduction in PvP
  }

  /**
   * Check if entity has protection prayer active
   */
  public hasProtectionPrayer(entityId: string, damageType: 'melee' | 'ranged' | 'magic'): boolean {
    const entityPrayers = this.activePrayers.get(entityId);
    if (!entityPrayers) {return false;}

    for (const prayerId of entityPrayers) {
      const prayer = this.prayers.get(prayerId);
      if (prayer) {
        const hasProtection = prayer.effects.some(e =>
          e.type === 'protection' && e.stat === damageType
        );
        if (hasProtection) {return true;}
      }
    }

    return false;
  }
}
