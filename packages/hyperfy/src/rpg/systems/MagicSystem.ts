import { System } from '../../core/systems/System';
import type { World } from '../../types';
import {
  RPGEntity,
  StatsComponent,
  CombatComponent,
  InventoryComponent,
  AttackType,
  HitResult,
  ItemStack,
  Vector3
} from '../types';
import { InventorySystem } from '../systems/InventorySystem';

export interface Spell {
  id: string;
  name: string;
  level: number; // Magic level required
  spellbook: 'standard' | 'ancient' | 'lunar';
  type: 'combat' | 'teleport' | 'enchantment' | 'alchemy' | 'utility';
  runes: RuneRequirement[];
  experience: number;
  damage?: {
    max: number;
    type: 'fire' | 'water' | 'earth' | 'air' | 'standard';
  };
  effects?: SpellEffect[];
  cooldown?: number;
  range?: number;
}

export interface RuneRequirement {
  runeId: number;
  quantity: number;
}

export interface SpellEffect {
  type: 'freeze' | 'poison' | 'weaken' | 'teleport' | 'heal' | 'buff';
  duration?: number;
  value?: any;
}

export interface ActiveSpell {
  spellId: string;
  targetId?: string;
  castTime: number;
  position?: Vector3;
}

export class MagicSystem extends System {
  private spells: Map<string, Spell> = new Map();
  private activeSpells: Map<string, ActiveSpell> = new Map();
  private spellCooldowns: Map<string, Map<string, number>> = new Map(); // entityId -> spellId -> cooldown end time
  private poisonEffects: Map<string, any> = new Map();
  private weakenedStats: Map<string, any> = new Map();
  
  // Rune IDs
  private readonly RUNES = {
    AIR: 556,
    WATER: 555,
    EARTH: 557,
    FIRE: 554,
    MIND: 558,
    BODY: 559,
    COSMIC: 564,
    CHAOS: 562,
    NATURE: 561,
    LAW: 563,
    DEATH: 560,
    BLOOD: 565,
    SOUL: 566,
    ASTRAL: 9075,
    // Combination runes
    DUST: 4696,  // Air + Earth
    MIST: 4695,  // Air + Water
    MUD: 4698,   // Water + Earth
    SMOKE: 4697, // Air + Fire
    STEAM: 4694, // Water + Fire
    LAVA: 4699   // Earth + Fire
  };
  
  constructor(world: World) {
    super(world);
    this.registerDefaultSpells();
  }

  /**
   * Register default spells
   */
  private registerDefaultSpells(): void {
    // Standard spellbook - Combat spells
    this.registerSpell({
      id: 'wind_strike',
      name: 'Wind Strike',
      level: 1,
      spellbook: 'standard',
      type: 'combat',
      runes: [
        { runeId: this.RUNES.AIR, quantity: 1 },
        { runeId: this.RUNES.MIND, quantity: 1 }
      ],
      experience: 5.5,
      damage: { max: 2, type: 'air' },
      range: 10
    });

    this.registerSpell({
      id: 'water_strike',
      name: 'Water Strike',
      level: 5,
      spellbook: 'standard',
      type: 'combat',
      runes: [
        { runeId: this.RUNES.WATER, quantity: 1 },
        { runeId: this.RUNES.AIR, quantity: 1 },
        { runeId: this.RUNES.MIND, quantity: 1 }
      ],
      experience: 7.5,
      damage: { max: 4, type: 'water' },
      range: 10
    });

    this.registerSpell({
      id: 'earth_strike',
      name: 'Earth Strike',
      level: 9,
      spellbook: 'standard',
      type: 'combat',
      runes: [
        { runeId: this.RUNES.EARTH, quantity: 2 },
        { runeId: this.RUNES.AIR, quantity: 1 },
        { runeId: this.RUNES.MIND, quantity: 1 }
      ],
      experience: 9.5,
      damage: { max: 6, type: 'earth' },
      range: 10
    });

    this.registerSpell({
      id: 'fire_strike',
      name: 'Fire Strike',
      level: 13,
      spellbook: 'standard',
      type: 'combat',
      runes: [
        { runeId: this.RUNES.FIRE, quantity: 3 },
        { runeId: this.RUNES.AIR, quantity: 2 },
        { runeId: this.RUNES.MIND, quantity: 1 }
      ],
      experience: 11.5,
      damage: { max: 8, type: 'fire' },
      range: 10
    });

    // Bolt spells
    this.registerSpell({
      id: 'wind_bolt',
      name: 'Wind Bolt',
      level: 17,
      spellbook: 'standard',
      type: 'combat',
      runes: [
        { runeId: this.RUNES.AIR, quantity: 2 },
        { runeId: this.RUNES.CHAOS, quantity: 1 }
      ],
      experience: 13.5,
      damage: { max: 9, type: 'air' },
      range: 10
    });

    this.registerSpell({
      id: 'fire_bolt',
      name: 'Fire Bolt',
      level: 35,
      spellbook: 'standard',
      type: 'combat',
      runes: [
        { runeId: this.RUNES.FIRE, quantity: 4 },
        { runeId: this.RUNES.AIR, quantity: 3 },
        { runeId: this.RUNES.CHAOS, quantity: 1 }
      ],
      experience: 22.5,
      damage: { max: 12, type: 'fire' },
      range: 10
    });

    // Blast spells
    this.registerSpell({
      id: 'wind_blast',
      name: 'Wind Blast',
      level: 41,
      spellbook: 'standard',
      type: 'combat',
      runes: [
        { runeId: this.RUNES.AIR, quantity: 3 },
        { runeId: this.RUNES.DEATH, quantity: 1 }
      ],
      experience: 25.5,
      damage: { max: 13, type: 'air' },
      range: 10
    });

    this.registerSpell({
      id: 'fire_blast',
      name: 'Fire Blast',
      level: 59,
      spellbook: 'standard',
      type: 'combat',
      runes: [
        { runeId: this.RUNES.FIRE, quantity: 5 },
        { runeId: this.RUNES.AIR, quantity: 4 },
        { runeId: this.RUNES.DEATH, quantity: 1 }
      ],
      experience: 34.5,
      damage: { max: 16, type: 'fire' },
      range: 10
    });

    // Teleport spells
    this.registerSpell({
      id: 'varrock_teleport',
      name: 'Varrock Teleport',
      level: 25,
      spellbook: 'standard',
      type: 'teleport',
      runes: [
        { runeId: this.RUNES.FIRE, quantity: 1 },
        { runeId: this.RUNES.AIR, quantity: 3 },
        { runeId: this.RUNES.LAW, quantity: 1 }
      ],
      experience: 35,
      effects: [{
        type: 'teleport',
        value: { x: 3213, y: 0, z: 3428 } // Varrock coordinates
      }]
    });

    this.registerSpell({
      id: 'lumbridge_teleport',
      name: 'Lumbridge Teleport',
      level: 31,
      spellbook: 'standard',
      type: 'teleport',
      runes: [
        { runeId: this.RUNES.EARTH, quantity: 1 },
        { runeId: this.RUNES.AIR, quantity: 3 },
        { runeId: this.RUNES.LAW, quantity: 1 }
      ],
      experience: 41,
      effects: [{
        type: 'teleport',
        value: { x: 3222, y: 0, z: 3218 } // Lumbridge coordinates
      }]
    });

    // Alchemy spells
    this.registerSpell({
      id: 'low_alchemy',
      name: 'Low Level Alchemy',
      level: 21,
      spellbook: 'standard',
      type: 'alchemy',
      runes: [
        { runeId: this.RUNES.FIRE, quantity: 3 },
        { runeId: this.RUNES.NATURE, quantity: 1 }
      ],
      experience: 31,
      cooldown: 3000 // 3 seconds
    });

    this.registerSpell({
      id: 'high_alchemy',
      name: 'High Level Alchemy',
      level: 55,
      spellbook: 'standard',
      type: 'alchemy',
      runes: [
        { runeId: this.RUNES.FIRE, quantity: 5 },
        { runeId: this.RUNES.NATURE, quantity: 1 }
      ],
      experience: 65,
      cooldown: 3000 // 3 seconds
    });

    // Ancient spellbook - Ice spells (multi-target with freeze)
    this.registerSpell({
      id: 'ice_rush',
      name: 'Ice Rush',
      level: 58,
      spellbook: 'ancient',
      type: 'combat',
      runes: [
        { runeId: this.RUNES.WATER, quantity: 2 },
        { runeId: this.RUNES.CHAOS, quantity: 2 },
        { runeId: this.RUNES.DEATH, quantity: 2 }
      ],
      experience: 34,
      damage: { max: 16, type: 'water' },
      effects: [{
        type: 'freeze',
        duration: 5000 // 5 seconds
      }],
      range: 10
    });

    this.registerSpell({
      id: 'ice_barrage',
      name: 'Ice Barrage',
      level: 94,
      spellbook: 'ancient',
      type: 'combat',
      runes: [
        { runeId: this.RUNES.WATER, quantity: 6 },
        { runeId: this.RUNES.BLOOD, quantity: 2 },
        { runeId: this.RUNES.DEATH, quantity: 4 }
      ],
      experience: 52,
      damage: { max: 30, type: 'water' },
      effects: [{
        type: 'freeze',
        duration: 20000 // 20 seconds
      }],
      range: 10
    });
  }

  /**
   * Register a spell
   */
  public registerSpell(spell: Spell): void {
    this.spells.set(spell.id, spell);
  }

  /**
   * Cast a spell
   */
  public castSpell(casterId: string, spellId: string, targetId?: string, position?: Vector3): boolean {
    const caster = this.world.entities.get(casterId);
    if (!caster) return false;

    const stats = caster.getComponent<StatsComponent>('stats');
    if (!stats) return false;

    const spell = this.spells.get(spellId);
    if (!spell) return false;

    // Check magic level
    if (stats.magic.level < spell.level) {
      this.sendMessage(casterId, `You need level ${spell.level} Magic to cast ${spell.name}.`);
      return false;
    }

    // Check cooldown
    if (this.isSpellOnCooldown(casterId, spellId)) {
      this.sendMessage(casterId, "That spell is still on cooldown.");
      return false;
    }

    // Check runes
    if (!this.hasRunes(casterId, spell.runes)) {
      this.sendMessage(casterId, "You don't have the required runes to cast this spell.");
      return false;
    }

    // Check target for combat spells
    if (spell.type === 'combat' && !targetId) {
      this.sendMessage(casterId, "You need a target to cast this spell.");
      return false;
    }

    // Consume runes
    this.consumeRunes(casterId, spell.runes);

    // Create active spell
    const activeSpell: ActiveSpell = {
      spellId,
      targetId,
      castTime: Date.now(),
      position
    };
    this.activeSpells.set(casterId, activeSpell);

    // Apply spell cooldown
    if (spell.cooldown) {
      this.setSpellCooldown(casterId, spellId, spell.cooldown);
    }

    // Execute spell effect
    switch (spell.type) {
      case 'combat':
        this.executeCombatSpell(caster, spell, targetId!);
        break;
      case 'teleport':
        this.executeTeleportSpell(caster, spell);
        break;
      case 'alchemy':
        this.executeAlchemySpell(caster, spell);
        break;
      default:
        // Other spell types
        break;
    }

    // Grant experience
    this.grantMagicExperience(casterId, spell.experience);

    // Emit event
    this.world.events.emit('spell:cast', {
      casterId,
      spellId,
      targetId,
      position
    });

    return true;
  }

  /**
   * Execute combat spell
   */
  private executeCombatSpell(caster: RPGEntity, spell: Spell, targetId: string): void {
    const target = this.world.entities.get(targetId);
    if (!target) return;

    // Check range
    const distance = this.getDistance(caster, target);
    if (spell.range && distance > spell.range) {
      this.sendMessage(caster.id, "Your target is too far away.");
      return;
    }

    // Calculate damage
    const casterStats = caster.getComponent<StatsComponent>('stats');
    if (!casterStats || !spell.damage) return;

    // Base damage + magic level bonus
    const magicLevel = casterStats.magic.level;
    const magicBonus = casterStats.combatBonuses.attackMagic;
    const damage = Math.floor(Math.random() * (spell.damage.max + 1)) + Math.floor(magicLevel / 10);

    // Create hit result
    const hit: HitResult = {
      damage,
      type: 'normal',
      attackType: AttackType.MAGIC,
      attackerId: caster.id,
      targetId,
      timestamp: Date.now()
    };

    // Apply damage through combat system
    const combatSystem = this.world.getSystem<any>('combat');
    if (combatSystem) {
      combatSystem.applyDamage(target, hit);
    }

    // Apply spell effects
    if (spell.effects) {
      for (const effect of spell.effects) {
        this.applySpellEffect(target, effect);
      }
    }
  }

  /**
   * Execute teleport spell
   */
  private executeTeleportSpell(caster: RPGEntity, spell: Spell): void {
    const teleportEffect = spell.effects?.find(e => e.type === 'teleport');
    if (!teleportEffect || !teleportEffect.value) return;

    // Teleport player
    const position = teleportEffect.value as Vector3;
    
    this.world.events.emit('player:teleport', {
      playerId: caster.id,
      position,
      spellId: spell.id
    });

    this.sendMessage(caster.id, `You teleport to ${spell.name.replace(' Teleport', '')}.`);
  }

  /**
   * Execute alchemy spell
   */
  private executeAlchemySpell(caster: RPGEntity, spell: Spell): void {
    const inventory = caster.getComponent<InventoryComponent>('inventory');
    if (!inventory) return;

    // Find the next non-empty item slot
    let targetSlot = -1;
    for (let i = 0; i < inventory.items.length; i++) {
      if (inventory.items[i] !== null) {
        targetSlot = i;
        break;
      }
    }

    if (targetSlot === -1) {
      this.sendMessage(caster.id, "You don't have any items to alchemize.");
      return;
    }

    const item = inventory.items[targetSlot];
    if (!item) return;

    // Get item value from inventory system
    const inventorySystem = this.world.getSystemByType(InventorySystem) || 
                           this.world.getSystem<InventorySystem>('inventory');
    if (!inventorySystem) return;

    const itemDef = (inventorySystem as any).itemRegistry?.getItem(item.itemId);
    if (!itemDef) {
      this.sendMessage(caster.id, "That item cannot be alchemized.");
      return;
    }

    // Check if item can be alchemized
    if (!itemDef.tradeable) {
      this.sendMessage(caster.id, "That item cannot be alchemized.");
      return;
    }

    // Calculate gold amount based on spell type
    let goldAmount = 0;
    if (spell.id === 'high_alchemy') {
      goldAmount = Math.floor(itemDef.value * 0.6); // 60% of item value for high alch
    } else if (spell.id === 'low_alchemy') {
      goldAmount = Math.floor(itemDef.value * 0.4); // 40% of item value for low alch
    }

    // Remove the item
    inventory.items[targetSlot] = null;

    // Add gold (coin item ID is 995)
    (inventorySystem as any).addItem(caster.id, 995, goldAmount);

    // Send message
    this.sendMessage(caster.id, `You cast ${spell.name} and receive ${goldAmount} coins.`);

    // Emit alchemy event
    this.world.events.emit('spell:alchemy', {
      casterId: caster.id,
      spellId: spell.id,
      itemId: item.itemId,
      goldReceived: goldAmount
    });
  }

  /**
   * Apply spell effect to target
   */
  private applySpellEffect(target: RPGEntity, effect: SpellEffect): void {
    switch (effect.type) {
      case 'freeze':
        // Apply movement freeze
        this.world.events.emit('effect:freeze', {
          targetId: target.id,
          duration: effect.duration || 5000
        });
        break;
      case 'poison':
        // Apply poison damage over time
        const stats = target.getComponent<StatsComponent>('stats');
        if (!stats) return;
        
        // Create poison effect
        const poisonData = {
          targetId: target.id,
          damage: effect.value?.damage || 2, // Default 2 damage per tick
          duration: effect.duration || 30000, // Default 30 seconds
          tickRate: effect.value?.tickRate || 3000, // Default damage every 3 seconds
          startTime: Date.now()
        };
        
        // Store poison effect
        this.poisonEffects.set(target.id, poisonData);
        
        // Emit poison event
        this.world.events.emit('effect:poison', poisonData);
        
        this.sendMessage(target.id, "You have been poisoned!");
        break;
      case 'weaken':
        // Reduce target stats temporarily
        const targetStats = target.getComponent<StatsComponent>('stats');
        if (!targetStats) return;
        
        // Store original stats if not already stored
        if (!this.weakenedStats.has(target.id)) {
          this.weakenedStats.set(target.id, {
            attack: targetStats.attack.level,
            strength: targetStats.strength.level,
            defense: targetStats.defense.level
          });
        }
        
        // Apply stat reduction (default 10%)
        const reduction = effect.value?.reduction || 0.1;
        targetStats.attack.level = Math.floor(targetStats.attack.level * (1 - reduction));
        targetStats.strength.level = Math.floor(targetStats.strength.level * (1 - reduction));
        targetStats.defense.level = Math.floor(targetStats.defense.level * (1 - reduction));
        
        // Schedule stat restoration
        setTimeout(() => {
          const originalStats = this.weakenedStats.get(target.id);
          if (originalStats && targetStats) {
            targetStats.attack.level = originalStats.attack;
            targetStats.strength.level = originalStats.strength;
            targetStats.defense.level = originalStats.defense;
            this.weakenedStats.delete(target.id);
          }
        }, effect.duration || 60000); // Default 60 seconds
        
        this.sendMessage(target.id, "You feel weakened!");
        break;
    }
  }

  /**
   * Check if player has required runes
   */
  private hasRunes(entityId: string, requirements: RuneRequirement[]): boolean {
    const entity = this.world.entities.get(entityId);
    if (!entity) return false;

    const inventory = entity.getComponent<InventoryComponent>('inventory');
    if (!inventory) return false;

    // Check combination runes
    const runeAmounts = this.calculateRuneAmounts(inventory);

    for (const req of requirements) {
      if ((runeAmounts.get(req.runeId) || 0) < req.quantity) {
        return false;
      }
    }

    return true;
  }

  /**
   * Calculate rune amounts including combination runes
   */
  private calculateRuneAmounts(inventory: InventoryComponent): Map<number, number> {
    const amounts = new Map<number, number>();

    for (const item of inventory.items) {
      if (!item) continue;

      // Add basic rune amounts
      const current = amounts.get(item.itemId) || 0;
      amounts.set(item.itemId, current + item.quantity);

      // Add combination rune equivalents
      switch (item.itemId) {
        case this.RUNES.DUST:
          amounts.set(this.RUNES.AIR, (amounts.get(this.RUNES.AIR) || 0) + item.quantity);
          amounts.set(this.RUNES.EARTH, (amounts.get(this.RUNES.EARTH) || 0) + item.quantity);
          break;
        case this.RUNES.MIST:
          amounts.set(this.RUNES.AIR, (amounts.get(this.RUNES.AIR) || 0) + item.quantity);
          amounts.set(this.RUNES.WATER, (amounts.get(this.RUNES.WATER) || 0) + item.quantity);
          break;
        // Add other combination runes...
      }
    }

    return amounts;
  }

  /**
   * Consume runes for spell
   */
  private consumeRunes(entityId: string, requirements: RuneRequirement[]): void {
    const inventorySystem = this.world.getSystem<any>('inventory');
    if (!inventorySystem) return;

    // Remove required runes (prioritize basic runes over combination)
    for (const req of requirements) {
      inventorySystem.removeItem(entityId, req.runeId, req.quantity);
    }
  }

  /**
   * Grant magic experience
   */
  private grantMagicExperience(entityId: string, experience: number): void {
    const skillsSystem = this.world.getSystem<any>('skills');
    if (skillsSystem) {
      skillsSystem.grantXP(entityId, 'magic', experience);
    }
  }

  /**
   * Check if spell is on cooldown
   */
  private isSpellOnCooldown(entityId: string, spellId: string): boolean {
    const cooldowns = this.spellCooldowns.get(entityId);
    if (!cooldowns) return false;

    const cooldownEnd = cooldowns.get(spellId);
    if (!cooldownEnd) return false;

    return Date.now() < cooldownEnd;
  }

  /**
   * Set spell cooldown
   */
  private setSpellCooldown(entityId: string, spellId: string, duration: number): void {
    let cooldowns = this.spellCooldowns.get(entityId);
    if (!cooldowns) {
      cooldowns = new Map();
      this.spellCooldowns.set(entityId, cooldowns);
    }
    cooldowns.set(spellId, Date.now() + duration);
  }

  /**
   * Helper methods
   */
  private getDistance(entity1: RPGEntity, entity2: RPGEntity): number {
    const pos1 = entity1.position;
    const pos2 = entity2.position;
    
    const dx = pos1.x - pos2.x;
    const dz = pos1.z - pos2.z;
    
    return Math.sqrt(dx * dx + dz * dz);
  }

  private sendMessage(entityId: string, message: string): void {
    this.world.events.emit('chat:system', {
      targetId: entityId,
      message
    });
  }

  /**
   * Get spell by ID
   */
  public getSpell(spellId: string): Spell | undefined {
    return this.spells.get(spellId);
  }

  /**
   * Get all spells for level
   */
  public getSpellsForLevel(level: number, spellbook: string = 'standard'): Spell[] {
    return Array.from(this.spells.values()).filter(s => 
      s.level <= level && s.spellbook === spellbook
    );
  }

  /**
   * Get active spell for entity
   */
  public getActiveSpell(entityId: string): ActiveSpell | undefined {
    return this.activeSpells.get(entityId);
  }

  /**
   * Update spell cooldowns
   */
  public update(delta: number): void {
    // Clean up expired cooldowns
    const now = Date.now();
    for (const [entityId, cooldowns] of this.spellCooldowns) {
      for (const [spellId, cooldownEnd] of cooldowns) {
        if (now >= cooldownEnd) {
          cooldowns.delete(spellId);
        }
      }
    }

    // Process poison effects
    for (const [entityId, poisonData] of this.poisonEffects) {
      const entity = this.world.entities.get(entityId);
      if (!entity) {
        this.poisonEffects.delete(entityId);
        continue;
      }

      const stats = entity.getComponent<StatsComponent>('stats');
      if (!stats) continue;

      // Check if poison has expired
      if (now >= poisonData.startTime + poisonData.duration) {
        this.poisonEffects.delete(entityId);
        this.sendMessage(entityId, "The poison has worn off.");
        continue;
      }

      // Apply poison damage at tick rate
      const lastTick = poisonData.lastTick || poisonData.startTime;
      if (now >= lastTick + poisonData.tickRate) {
        poisonData.lastTick = now;
        
        // Apply damage
        stats.hitpoints.current = Math.max(0, stats.hitpoints.current - poisonData.damage);
        
        // Create poison hit splat
        this.world.events.emit('combat:damage', {
          targetId: entityId,
          damage: poisonData.damage,
          type: 'poison',
          timestamp: now
        });

        // Check if entity died from poison
        if (stats.hitpoints.current <= 0) {
          this.poisonEffects.delete(entityId);
          this.world.events.emit('entity:death', {
            entityId,
            cause: 'poison'
          });
        }
      }
    }
  }
} 