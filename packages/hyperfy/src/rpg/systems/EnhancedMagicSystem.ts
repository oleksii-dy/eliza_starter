// @ts-nocheck
/**
 * Enhanced Magic System - Comprehensive spell casting with rune requirements
 * Handles combat spells, utility spells, and teleportation
 */

import { System } from '../../core/systems/System';
import type { World, Entity } from '../../types';
import { 
  SpellType, 
  SPELL_DEFINITIONS, 
  RuneType,
  SpellDefinition,
  canCastSpell,
  calculateSpellDamage
} from './spells/SpellDefinitions';
import { SkillType } from './skills/SkillDefinitions';

interface SpellCast {
  id: string;
  casterId: string;
  targetId?: string;
  targetPosition?: { x: number; y: number; z: number };
  spellType: SpellType;
  startTime: number;
  castTime: number;
  completed: boolean;
  interrupted: boolean;
}

interface MagicComponent {
  type: 'magic';
  selectedSpell?: SpellType;
  spellBook: SpellType[];
  autocast?: SpellType;
  lastCastTime: number;
  casting: boolean;
  activeSpells: string[]; // Active spell effect IDs
}

interface SpellEffect {
  id: string;
  spellType: SpellType;
  targetId: string;
  startTime: number;
  duration: number;
  effectType: string;
  data: any;
}

export class EnhancedMagicSystem extends System {
  private activeCasts: Map<string, SpellCast> = new Map();
  private activeEffects: Map<string, SpellEffect> = new Map();
  private spellProjectiles: Map<string, any> = new Map();
  private lastUpdateTime: number = Date.now();

  constructor(world: World) {
    super(world);
  }

  async initialize(): Promise<void> {
    console.log('[EnhancedMagicSystem] Initializing...');
    
    // Set up event listeners
    this.world.events.on('player:joined', this.handlePlayerJoined.bind(this));
    this.world.events.on('combat:target_selected', this.handleTargetSelected.bind(this));
    this.world.events.on('inventory:item_used', this.handleItemUsed.bind(this));
    
    console.log('[EnhancedMagicSystem] Initialized');
  }

  private handlePlayerJoined(data: any): void {
    const { entityId } = data;
    this.createMagicComponent(entityId);
  }

  public createMagicComponent(entityId: string): MagicComponent | null {
    const entity = this.world.getEntityById(entityId);
    if (!entity) return null;

    // Get player's magic level from the skills system
    const skillsSystem = this.world.systems.find(s => s.constructor.name === 'EnhancedSkillsSystem');
    const magicLevel = skillsSystem ? (skillsSystem as any).getSkillLevel(entityId, SkillType.MAGIC) : 1;

    // Build spellbook based on magic level
    const availableSpells = this.getAvailableSpells(magicLevel);

    // Remove existing magic component if it exists
    const existingComponents = entity.components?.filter(c => c.type !== 'magic') || [];
    entity.components = existingComponents;

    const magicComponent: MagicComponent = {
      type: 'magic',
      spellBook: availableSpells,
      selectedSpell: availableSpells.length > 0 ? availableSpells[0] : undefined,
      lastCastTime: 0,
      casting: false,
      activeSpells: []
    };

    entity.addComponent(magicComponent);
    return magicComponent;
  }

  private getAvailableSpells(magicLevel: number): SpellType[] {
    const available: SpellType[] = [];
    
    for (const [spellType, spellDef] of Object.entries(SPELL_DEFINITIONS)) {
      if (spellDef.levelRequired <= magicLevel) {
        available.push(spellType as SpellType);
      }
    }
    
    return available;
  }

  public castSpell(
    casterId: string, 
    spellType: SpellType, 
    targetId?: string, 
    targetPosition?: { x: number; y: number; z: number }
  ): boolean {
    const caster = this.world.getEntityById(casterId);
    if (!caster) return false;

    const magicComponent = caster.getComponent('magic') as MagicComponent;
    if (!magicComponent) return false;

    const spellDef = SPELL_DEFINITIONS[spellType];
    if (!spellDef) return false;

    // Check if spell is in spellbook
    if (!magicComponent.spellBook.includes(spellType)) {
      this.world.events.emit('magic:spell_unavailable', {
        casterId,
        spellType,
        reason: 'Not in spellbook'
      });
      return false;
    }

    // Check magic level requirement
    const skillsSystem = this.world.systems.find(s => s.constructor.name === 'EnhancedSkillsSystem');
    const magicLevel = skillsSystem ? (skillsSystem as any).getSkillLevel(casterId, SkillType.MAGIC) : 1;
    
    if (magicLevel < spellDef.levelRequired) {
      this.world.events.emit('magic:insufficient_level', {
        casterId,
        spellType,
        required: spellDef.levelRequired,
        current: magicLevel
      });
      return false;
    }

    // Check rune requirements
    const inventory = caster.getComponent('inventory');
    if (!this.hasRequiredRunes(inventory, spellDef)) {
      this.world.events.emit('magic:insufficient_runes', {
        casterId,
        spellType,
        requiredRunes: spellDef.runes
      });
      return false;
    }

    // Check if already casting
    if (magicComponent.casting) {
      this.world.events.emit('magic:already_casting', { casterId });
      return false;
    }

    // Check cooldown
    const timeSinceLastCast = Date.now() - magicComponent.lastCastTime;
    const cooldown = spellDef.cooldown || 0;
    
    if (timeSinceLastCast < cooldown) {
      this.world.events.emit('magic:on_cooldown', {
        casterId,
        spellType,
        remainingCooldown: cooldown - timeSinceLastCast
      });
      return false;
    }

    // Validate target for spell type
    if (!this.validateSpellTarget(spellDef, targetId, targetPosition)) {
      this.world.events.emit('magic:invalid_target', {
        casterId,
        spellType,
        targetType: spellDef.targetType
      });
      return false;
    }

    // Start casting
    return this.startSpellCast(caster, spellDef, targetId, targetPosition);
  }

  private hasRequiredRunes(inventory: any, spellDef: SpellDefinition): boolean {
    if (!inventory || !inventory.items) return false;

    for (const runeReq of spellDef.runes) {
      let runeCount = 0;
      
      for (const item of inventory.items) {
        if (item && item.itemId === runeReq.runeType) {
          runeCount += item.quantity || 1;
        }
      }
      
      if (runeCount < runeReq.quantity) {
        return false;
      }
    }
    
    return true;
  }

  private validateSpellTarget(
    spellDef: SpellDefinition, 
    targetId?: string, 
    targetPosition?: { x: number; y: number; z: number }
  ): boolean {
    switch (spellDef.targetType) {
      case 'self':
        return !targetId && !targetPosition;
      case 'enemy':
        return !!targetId;
      case 'item':
        return !!targetId; // Assuming item targeting uses targetId
      case 'ground':
        return !!targetPosition;
      case 'none':
        return true;
      default:
        return false;
    }
  }

  private startSpellCast(
    caster: Entity, 
    spellDef: SpellDefinition, 
    targetId?: string, 
    targetPosition?: { x: number; y: number; z: number }
  ): boolean {
    const magicComponent = caster.getComponent('magic') as MagicComponent;
    if (!magicComponent) return false;

    const castId = `cast_${caster.id}_${Date.now()}`;
    const spellCast: SpellCast = {
      id: castId,
      casterId: caster.id,
      targetId,
      targetPosition,
      spellType: spellDef.type,
      startTime: Date.now(),
      castTime: spellDef.castTime,
      completed: false,
      interrupted: false
    };

    this.activeCasts.set(castId, spellCast);
    magicComponent.casting = true;

    // Consume runes immediately
    this.consumeRunes(caster, spellDef);

    // Start casting animation/effects
    this.world.events.emit('magic:cast_started', {
      casterId: caster.id,
      castId,
      spellType: spellDef.type,
      spellName: spellDef.name,
      castTime: spellDef.castTime,
      targetId,
      targetPosition
    });

    // Schedule cast completion
    setTimeout(() => {
      this.completeSpellCast(castId);
    }, spellDef.castTime);

    return true;
  }

  private consumeRunes(caster: Entity, spellDef: SpellDefinition): void {
    const inventorySystem = this.world.systems.find(s => s.constructor.name === 'InventorySystem');
    if (!inventorySystem) return;

    for (const runeReq of spellDef.runes) {
      (inventorySystem as any).removeItem(caster.id, runeReq.runeType, runeReq.quantity);
    }
  }

  private completeSpellCast(castId: string): void {
    const spellCast = this.activeCasts.get(castId);
    if (!spellCast || spellCast.completed || spellCast.interrupted) return;

    const caster = this.world.getEntityById(spellCast.casterId);
    if (!caster) return;

    const magicComponent = caster.getComponent('magic') as MagicComponent;
    if (!magicComponent) return;

    const spellDef = SPELL_DEFINITIONS[spellCast.spellType];
    if (!spellDef) return;

    spellCast.completed = true;
    magicComponent.casting = false;
    magicComponent.lastCastTime = Date.now();

    // Apply spell effects
    this.applySpellEffects(spellCast, spellDef);

    // Award magic XP
    const skillsSystem = this.world.systems.find(s => s.constructor.name === 'EnhancedSkillsSystem');
    if (skillsSystem) {
      (skillsSystem as any).addExperience(spellCast.casterId, SkillType.MAGIC, spellDef.baseXP);
    }

    this.world.events.emit('magic:cast_completed', {
      casterId: spellCast.casterId,
      castId,
      spellType: spellCast.spellType,
      spellName: spellDef.name,
      xpGained: spellDef.baseXP
    });

    this.activeCasts.delete(castId);
  }

  private applySpellEffects(spellCast: SpellCast, spellDef: SpellDefinition): void {
    for (const effect of spellDef.effects) {
      switch (effect.type) {
        case 'damage':
          this.applyDamageEffect(spellCast, effect);
          break;
        case 'heal':
          this.applyHealEffect(spellCast, effect);
          break;
        case 'teleport':
          this.applyTeleportEffect(spellCast, effect);
          break;
        case 'alchemy':
          this.applyAlchemyEffect(spellCast, effect);
          break;
        case 'enchant':
          this.applyEnchantEffect(spellCast, effect);
          break;
        case 'utility':
          this.applyUtilityEffect(spellCast, effect);
          break;
      }
    }
  }

  private applyDamageEffect(spellCast: SpellCast, effect: any): void {
    if (!spellCast.targetId || !effect.damage) return;

    const caster = this.world.getEntityById(spellCast.casterId);
    const target = this.world.getEntityById(spellCast.targetId);
    
    if (!caster || !target) return;

    const skillsSystem = this.world.systems.find(s => s.constructor.name === 'EnhancedSkillsSystem');
    const magicLevel = skillsSystem ? (skillsSystem as any).getSkillLevel(caster.id, SkillType.MAGIC) : 1;
    
    const damage = calculateSpellDamage(SPELL_DEFINITIONS[spellCast.spellType], magicLevel);

    // Create projectile if spell has one
    const spellDef = SPELL_DEFINITIONS[spellCast.spellType];
    if (spellDef.projectile) {
      this.createSpellProjectile(spellCast, spellDef, damage);
    } else {
      // Instant damage
      this.dealMagicDamage(spellCast.casterId, spellCast.targetId, damage, effect.damage.element);
    }
  }

  private createSpellProjectile(spellCast: SpellCast, spellDef: SpellDefinition, damage: number): void {
    const projectileId = `proj_${spellCast.id}`;
    
    // Schedule damage delivery based on projectile speed
    const deliveryTime = spellDef.projectile ? (1000 / spellDef.projectile.speed) : 0;
    
    setTimeout(() => {
      this.dealMagicDamage(spellCast.casterId, spellCast.targetId!, damage, spellDef.effects[0]?.damage?.element);
    }, deliveryTime);

    this.world.events.emit('magic:projectile_launched', {
      projectileId,
      casterId: spellCast.casterId,
      targetId: spellCast.targetId,
      spellType: spellCast.spellType,
      damage,
      deliveryTime
    });
  }

  private dealMagicDamage(casterId: string, targetId: string, damage: number, element?: string): void {
    const combatSystem = this.world.systems.find(s => s.constructor.name === 'CombatSystem');
    if (combatSystem && (combatSystem as any).dealDamage) {
      (combatSystem as any).dealDamage(casterId, targetId, damage, 'magic', element);
    }

    this.world.events.emit('magic:damage_dealt', {
      casterId,
      targetId,
      damage,
      element
    });
  }

  private applyHealEffect(spellCast: SpellCast, effect: any): void {
    if (!effect.heal) return;

    const target = spellCast.targetId ? 
      this.world.getEntityById(spellCast.targetId) : 
      this.world.getEntityById(spellCast.casterId);
    
    if (!target) return;

    const statsComponent = target.getComponent('stats');
    if (!statsComponent) return;

    const healAmount = effect.heal.amount;
    statsComponent.hitpoints.current = Math.min(
      statsComponent.hitpoints.max,
      statsComponent.hitpoints.current + healAmount
    );

    this.world.events.emit('magic:heal_applied', {
      casterId: spellCast.casterId,
      targetId: target.id,
      healAmount,
      newHealth: statsComponent.hitpoints.current
    });
  }

  private applyTeleportEffect(spellCast: SpellCast, effect: any): void {
    if (!effect.teleport) return;

    const caster = this.world.getEntityById(spellCast.casterId);
    if (!caster) return;

    const movementComponent = caster.getComponent('movement');
    if (!movementComponent) return;

    const { x, y, z } = effect.teleport;
    movementComponent.position = { x, y: y || 0, z };
    movementComponent.destination = null;
    movementComponent.path = [];

    this.world.events.emit('magic:teleport', {
      casterId: spellCast.casterId,
      destination: { x, y: y || 0, z },
      zoneName: effect.teleport.zoneName
    });
  }

  private applyAlchemyEffect(spellCast: SpellCast, effect: any): void {
    if (!effect.alchemy || !spellCast.targetId) return;

    // Assuming targetId represents an item in inventory
    const caster = this.world.getEntityById(spellCast.casterId);
    if (!caster) return;

    const inventorySystem = this.world.systems.find(s => s.constructor.name === 'InventorySystem');
    if (!inventorySystem) return;

    // Convert item to coins based on its value
    const itemValue = this.getItemValue(spellCast.targetId);
    const coinValue = Math.floor(itemValue * effect.alchemy.valueMultiplier);

    // Remove item and add coins
    (inventorySystem as any).removeItem(spellCast.casterId, spellCast.targetId, 1);
    (inventorySystem as any).addItem(spellCast.casterId, 995, coinValue); // 995 = coins

    this.world.events.emit('magic:alchemy', {
      casterId: spellCast.casterId,
      itemId: spellCast.targetId,
      coinValue,
      spellType: spellCast.spellType
    });
  }

  private applyEnchantEffect(spellCast: SpellCast, effect: any): void {
    if (!effect.enchant || !spellCast.targetId) return;

    const caster = this.world.getEntityById(spellCast.casterId);
    if (!caster) return;

    const inventorySystem = this.world.systems.find(s => s.constructor.name === 'InventorySystem');
    if (!inventorySystem) return;

    // Transform item
    (inventorySystem as any).removeItem(spellCast.casterId, effect.enchant.targetItemId, 1);
    (inventorySystem as any).addItem(spellCast.casterId, effect.enchant.resultItemId, 1);

    this.world.events.emit('magic:enchant', {
      casterId: spellCast.casterId,
      targetItemId: effect.enchant.targetItemId,
      resultItemId: effect.enchant.resultItemId,
      spellType: spellCast.spellType
    });
  }

  private applyUtilityEffect(spellCast: SpellCast, effect: any): void {
    // Handle special utility spells
    switch (effect.utility?.effect) {
      case 'telekinetic_grab':
        this.handleTelekineticGrab(spellCast);
        break;
      case 'superheat':
        this.handleSuperheat(spellCast);
        break;
    }
  }

  private handleTelekineticGrab(spellCast: SpellCast): void {
    if (!spellCast.targetPosition) return;

    // Find item at target position and teleport to player
    this.world.events.emit('magic:telekinetic_grab', {
      casterId: spellCast.casterId,
      targetPosition: spellCast.targetPosition
    });
  }

  private handleSuperheat(spellCast: SpellCast): void {
    // Instantly smelt ores without furnace
    const smithingSystem = this.world.systems.find(s => s.constructor.name === 'SmithingSystem');
    if (smithingSystem && (smithingSystem as any).smeltOre) {
      (smithingSystem as any).smeltOre(spellCast.casterId, spellCast.targetId);
    }
  }

  private getItemValue(itemId: string): number {
    // Would normally look up item value from item registry
    return 100; // Placeholder
  }

  public interruptCast(casterId: string): boolean {
    const activeCast = Array.from(this.activeCasts.values())
      .find(cast => cast.casterId === casterId && !cast.completed);
    
    if (!activeCast) return false;

    activeCast.interrupted = true;
    
    const caster = this.world.getEntityById(casterId);
    if (caster) {
      const magicComponent = caster.getComponent('magic') as MagicComponent;
      if (magicComponent) {
        magicComponent.casting = false;
      }
    }

    this.world.events.emit('magic:cast_interrupted', {
      casterId,
      castId: activeCast.id,
      spellType: activeCast.spellType
    });

    this.activeCasts.delete(activeCast.id);
    return true;
  }

  public selectSpell(casterId: string, spellType: SpellType): boolean {
    const caster = this.world.getEntityById(casterId);
    if (!caster) return false;

    const magicComponent = caster.getComponent('magic') as MagicComponent;
    if (!magicComponent) return false;

    if (!magicComponent.spellBook.includes(spellType)) {
      return false;
    }

    magicComponent.selectedSpell = spellType;

    this.world.events.emit('magic:spell_selected', {
      casterId,
      spellType,
      spellName: SPELL_DEFINITIONS[spellType].name
    });

    return true;
  }

  public setAutocast(casterId: string, spellType?: SpellType): boolean {
    const caster = this.world.getEntityById(casterId);
    if (!caster) return false;

    const magicComponent = caster.getComponent('magic') as MagicComponent;
    if (!magicComponent) return false;

    if (spellType && !magicComponent.spellBook.includes(spellType)) {
      return false;
    }

    magicComponent.autocast = spellType;

    this.world.events.emit('magic:autocast_set', {
      casterId,
      spellType,
      spellName: spellType ? SPELL_DEFINITIONS[spellType].name : null
    });

    return true;
  }

  public getPlayerMagic(entityId: string): MagicComponent | null {
    const entity = this.world.getEntityById(entityId);
    return entity ? entity.getComponent('magic') as MagicComponent : null;
  }

  public isCasting(entityId: string): boolean {
    const magic = this.getPlayerMagic(entityId);
    return magic ? magic.casting : false;
  }

  private handleTargetSelected(data: any): void {
    const { attackerId, targetId } = data;
    
    const magic = this.getPlayerMagic(attackerId);
    if (magic && magic.autocast) {
      this.castSpell(attackerId, magic.autocast, targetId);
    }
  }

  private handleItemUsed(data: any): void {
    const { playerId, itemId } = data;
    
    const magic = this.getPlayerMagic(playerId);
    if (magic && magic.selectedSpell) {
      const spellDef = SPELL_DEFINITIONS[magic.selectedSpell];
      if (spellDef && spellDef.targetType === 'item') {
        this.castSpell(playerId, magic.selectedSpell, itemId);
      }
    }
  }

  update(deltaTime: number): void {
    // Clean up completed casts
    for (const [castId, cast] of this.activeCasts) {
      if (cast.completed || cast.interrupted || 
          (Date.now() - cast.startTime) > (cast.castTime + 5000)) {
        this.activeCasts.delete(castId);
      }
    }

    // Update spell effects
    for (const [effectId, effect] of this.activeEffects) {
      if ((Date.now() - effect.startTime) > effect.duration) {
        this.removeSpellEffect(effectId);
      }
    }
  }

  private removeSpellEffect(effectId: string): void {
    const effect = this.activeEffects.get(effectId);
    if (!effect) return;

    this.world.events.emit('magic:effect_expired', {
      effectId,
      targetId: effect.targetId,
      spellType: effect.spellType,
      effectType: effect.effectType
    });

    this.activeEffects.delete(effectId);
  }

  serialize(): any {
    return {
      activeCasts: Object.fromEntries(this.activeCasts),
      activeEffects: Object.fromEntries(this.activeEffects),
      lastUpdateTime: this.lastUpdateTime
    };
  }

  deserialize(data: any): void {
    if (data.activeCasts) {
      this.activeCasts = new Map(Object.entries(data.activeCasts));
    }
    if (data.activeEffects) {
      this.activeEffects = new Map(Object.entries(data.activeEffects));
    }
    if (data.lastUpdateTime) {
      this.lastUpdateTime = data.lastUpdateTime;
    }
  }
}