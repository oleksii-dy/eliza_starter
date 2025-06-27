/**
 * Comprehensive tests for EnhancedMagicSystem
 * Tests advanced spell casting, projectiles, spell effects, and autocast
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { EnhancedMagicSystem } from '../EnhancedMagicSystem'
import { SpellType, SPELL_DEFINITIONS } from '../spells/SpellDefinitions'
import type { World } from '../../../types'
import type { Entity } from '../../../types'

// Mock implementations
const createMockWorld = (): World => {
  const entities = new Map<string, Entity>()
  const systems: any[] = []
  const events = {
    emit: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
  }

  return {
    entities,
    systems,
    events,
    getEntityById: (id: string) => entities.get(id),
  } as any
}

const createMockEntity = (id: string): Entity => {
  const components: any[] = []
  
  return {
    id,
    components,
    getComponent: (type: string) => components.find(c => c.type === type),
    addComponent: (component: any) => {
      const existingIndex = components.findIndex(c => c.type === component.type)
      if (existingIndex >= 0) {
        components[existingIndex] = component
      } else {
        components.push(component)
      }
    },
    removeComponent: (type: string) => {
      const index = components.findIndex(c => c.type === type)
      if (index >= 0) components.splice(index, 1)
    },
  } as any
}

const createMockInventoryComponent = (items: any[] = []) => ({
  type: 'inventory',
  items: items.map(item => ({ itemId: item.runeType, quantity: item.quantity })),
})

describe('EnhancedMagicSystem', () => {
  let world: World
  let magicSystem: EnhancedMagicSystem
  let player: Entity
  let target: Entity

  beforeEach(() => {
    world = createMockWorld()
    magicSystem = new EnhancedMagicSystem(world)
    
    // Create mock player
    player = createMockEntity('player1')
    const playerInventory = createMockInventoryComponent([
      { runeType: 556, quantity: 1000 }, // Air runes
      { runeType: 555, quantity: 1000 }, // Water runes
      { runeType: 557, quantity: 1000 }, // Earth runes
      { runeType: 554, quantity: 1000 }, // Fire runes
      { runeType: 558, quantity: 1000 }, // Mind runes
      { runeType: 562, quantity: 1000 }, // Chaos runes
      { runeType: 560, quantity: 1000 }, // Death runes
      { runeType: 563, quantity: 1000 }, // Law runes
      { runeType: 561, quantity: 1000 }, // Nature runes
      { runeType: 564, quantity: 1000 }, // Cosmic runes
    ])
    player.addComponent(playerInventory)
    world.entities.set('player1', player)
    
    // Create mock target
    target = createMockEntity('target1')
    const targetStats = {
      type: 'stats',
      hitpoints: { current: 100, max: 100 },
    }
    target.addComponent(targetStats)
    world.entities.set('target1', target)
    
    // Mock enhanced skills system
    const skillsSystem = {
      constructor: { name: 'EnhancedSkillsSystem' },
      getSkillLevel: vi.fn().mockReturnValue(50), // Level 50 magic
      addExperience: vi.fn(),
    }
    world.systems.push(skillsSystem)
    
    // Mock inventory system
    const inventorySystem = {
      constructor: { name: 'InventorySystem' },
      removeItem: vi.fn(),
      addItem: vi.fn(),
    }
    world.systems.push(inventorySystem)
    
    // Mock combat system
    const combatSystem = {
      constructor: { name: 'CombatSystem' },
      dealDamage: vi.fn(),
    }
    world.systems.push(combatSystem)
    
    // Initialize system
    magicSystem.initialize()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      await magicSystem.initialize()
      expect(world.events.on).toHaveBeenCalledWith('player:joined', expect.any(Function))
      expect(world.events.on).toHaveBeenCalledWith('combat:target_selected', expect.any(Function))
      expect(world.events.on).toHaveBeenCalledWith('inventory:item_used', expect.any(Function))
    })
  })

  describe('Magic Component Creation', () => {
    it('should create magic component for new player', () => {
      const component = magicSystem.createMagicComponent('player1')
      
      expect(component).toBeDefined()
      expect(component!.type).toBe('magic')
      expect(component!.spellBook).toContain(SpellType.WIND_STRIKE)
      expect(component!.casting).toBe(false)
      expect(component!.activeSpells).toEqual([])
    })

    it('should build spellbook based on magic level', () => {
      const component = magicSystem.createMagicComponent('player1')
      
      // Should include spells up to level 50
      expect(component!.spellBook).toContain(SpellType.WIND_STRIKE) // Level 1
      expect(component!.spellBook).toContain(SpellType.FIRE_BOLT) // Level 35
      expect(component!.spellBook).toContain(SpellType.WATER_BLAST) // Level 47
      expect(component!.spellBook).not.toContain(SpellType.FIRE_BLAST) // Level 59
    })

    it('should handle missing entity', () => {
      const component = magicSystem.createMagicComponent('nonexistent')
      expect(component).toBeNull()
    })
  })

  describe('Spell Casting Validation', () => {
    beforeEach(() => {
      magicSystem.createMagicComponent('player1')
    })

    it('should successfully cast valid spell', () => {
      const result = magicSystem.castSpell(
        'player1',
        SpellType.WIND_STRIKE,
        'target1'
      )
      
      expect(result).toBe(true)
      expect(world.events.emit).toHaveBeenCalledWith('magic:cast_started', expect.objectContaining({
        casterId: 'player1',
        spellType: SpellType.WIND_STRIKE,
        targetId: 'target1',
      }))
    })

    it('should fail when spell not in spellbook', () => {
      const result = magicSystem.castSpell(
        'player1',
        SpellType.FIRE_BLAST, // Level 59, player is level 50
        'target1'
      )
      
      expect(result).toBe(false)
      expect(world.events.emit).toHaveBeenCalledWith('magic:spell_unavailable', {
        casterId: 'player1',
        spellType: SpellType.FIRE_BLAST,
        reason: 'Not in spellbook',
      })
    })

    it('should fail when insufficient magic level', () => {
      // Mock lower magic level
      const skillsSystem = world.systems.find(s => s.constructor.name === 'EnhancedSkillsSystem')
      skillsSystem.getSkillLevel.mockReturnValue(1)
      
      magicSystem.createMagicComponent('player1') // Recreate with lower level
      
      const result = magicSystem.castSpell(
        'player1',
        SpellType.FIRE_STRIKE, // Level 13
        'target1'
      )
      
      expect(result).toBe(false)
      expect(world.events.emit).toHaveBeenCalledWith('magic:insufficient_level', {
        casterId: 'player1',
        spellType: SpellType.FIRE_STRIKE,
        required: 13,
        current: 1,
      })
    })

    it('should fail when insufficient runes', () => {
      // Empty inventory
      const emptyInventory = createMockInventoryComponent([])
      player.addComponent(emptyInventory)
      
      const result = magicSystem.castSpell(
        'player1',
        SpellType.WIND_STRIKE,
        'target1'
      )
      
      expect(result).toBe(false)
      expect(world.events.emit).toHaveBeenCalledWith('magic:insufficient_runes', {
        casterId: 'player1',
        spellType: SpellType.WIND_STRIKE,
        requiredRunes: SPELL_DEFINITIONS[SpellType.WIND_STRIKE].runes,
      })
    })

    it('should fail when already casting', () => {
      // Start first cast
      magicSystem.castSpell('player1', SpellType.WIND_STRIKE, 'target1')
      
      // Try to cast again immediately
      const result = magicSystem.castSpell('player1', SpellType.WATER_STRIKE, 'target1')
      
      expect(result).toBe(false)
      expect(world.events.emit).toHaveBeenCalledWith('magic:already_casting', {
        casterId: 'player1',
      })
    })

    it('should fail when spell on cooldown', () => {
      const mockNow = vi.spyOn(Date, 'now')
      mockNow.mockReturnValue(1000)
      
      // Cast spell with cooldown
      magicSystem.castSpell('player1', SpellType.LOW_LEVEL_ALCHEMY)
      
      // Try to cast again before cooldown expires
      mockNow.mockReturnValue(2000) // Still within cooldown
      
      const result = magicSystem.castSpell('player1', SpellType.LOW_LEVEL_ALCHEMY)
      
      expect(result).toBe(false)
      expect(world.events.emit).toHaveBeenCalledWith('magic:on_cooldown', expect.objectContaining({
        casterId: 'player1',
        spellType: SpellType.LOW_LEVEL_ALCHEMY,
      }))
      
      mockNow.mockRestore()
    })

    it('should validate spell targets correctly', () => {
      // Enemy spell needs target
      let result = magicSystem.castSpell('player1', SpellType.WIND_STRIKE)
      expect(result).toBe(false)
      
      // Self spell should not need target
      result = magicSystem.castSpell('player1', SpellType.LUMBRIDGE_TELEPORT)
      expect(result).toBe(true)
      
      // Ground spell needs position
      result = magicSystem.castSpell('player1', SpellType.TELEKINETIC_GRAB)
      expect(result).toBe(false)
      
      result = magicSystem.castSpell('player1', SpellType.TELEKINETIC_GRAB, undefined, { x: 0, y: 0, z: 0 })
      expect(result).toBe(true)
    })
  })

  describe('Spell Effects', () => {
    beforeEach(() => {
      magicSystem.createMagicComponent('player1')
    })

    it('should apply damage effects', async () => {
      const mockNow = vi.spyOn(Date, 'now')
      mockNow.mockReturnValue(1000)
      
      magicSystem.castSpell('player1', SpellType.WIND_STRIKE, 'target1')
      
      // Advance time to complete cast
      mockNow.mockReturnValue(1000 + SPELL_DEFINITIONS[SpellType.WIND_STRIKE].castTime)
      
      // Wait for cast completion
      await new Promise(resolve => setTimeout(resolve, SPELL_DEFINITIONS[SpellType.WIND_STRIKE].castTime + 10))
      
      expect(world.events.emit).toHaveBeenCalledWith('magic:cast_completed', expect.objectContaining({
        casterId: 'player1',
        spellType: SpellType.WIND_STRIKE,
      }))
      
      mockNow.mockRestore()
    })

    it('should create projectiles for combat spells', async () => {
      magicSystem.castSpell('player1', SpellType.FIRE_BOLT, 'target1')
      
      // Wait for cast completion
      await new Promise(resolve => setTimeout(resolve, SPELL_DEFINITIONS[SpellType.FIRE_BOLT].castTime + 10))
      
      expect(world.events.emit).toHaveBeenCalledWith('magic:projectile_launched', expect.objectContaining({
        casterId: 'player1',
        targetId: 'target1',
        spellType: SpellType.FIRE_BOLT,
      }))
    })

    it('should apply teleport effects', async () => {
      magicSystem.castSpell('player1', SpellType.VARROCK_TELEPORT)
      
      // Wait for cast completion
      await new Promise(resolve => setTimeout(resolve, SPELL_DEFINITIONS[SpellType.VARROCK_TELEPORT].castTime + 10))
      
      expect(world.events.emit).toHaveBeenCalledWith('magic:teleport', expect.objectContaining({
        casterId: 'player1',
        destination: { x: 100, y: 0, z: 0 },
        zoneName: 'varrock',
      }))
    })

    it('should apply alchemy effects', async () => {
      magicSystem.castSpell('player1', SpellType.HIGH_LEVEL_ALCHEMY, 'target_item')
      
      // Wait for cast completion
      await new Promise(resolve => setTimeout(resolve, SPELL_DEFINITIONS[SpellType.HIGH_LEVEL_ALCHEMY].castTime + 10))
      
      expect(world.events.emit).toHaveBeenCalledWith('magic:alchemy', expect.objectContaining({
        casterId: 'player1',
        spellType: SpellType.HIGH_LEVEL_ALCHEMY,
      }))
    })

    it('should apply heal effects', async () => {
      // Create heal spell for testing
      const healSpell = {
        ...SPELL_DEFINITIONS[SpellType.WIND_STRIKE],
        effects: [{ type: 'heal', heal: { amount: 10 } }]
      }
      
      // Mock target with stats
      const targetStats = target.getComponent('stats')
      targetStats.hitpoints.current = 50
      
      // Manually test heal effect
      const mockCast = {
        casterId: 'player1',
        targetId: 'target1',
        spellType: SpellType.WIND_STRIKE,
        startTime: Date.now(),
        castTime: 1000,
        completed: false,
        interrupted: false,
        id: 'test_cast',
      };
      
      (magicSystem as any).applySpellEffects(mockCast, healSpell)
      
      expect(world.events.emit).toHaveBeenCalledWith('magic:heal_applied', expect.objectContaining({
        casterId: 'player1',
        targetId: 'target1',
        healAmount: 10,
      }))
    })

    it('should handle enchant effects', async () => {
      magicSystem.castSpell('player1', SpellType.ENCHANT_SAPPHIRE, 'target_item')
      
      // Wait for cast completion
      await new Promise(resolve => setTimeout(resolve, SPELL_DEFINITIONS[SpellType.ENCHANT_SAPPHIRE].castTime + 10))
      
      expect(world.events.emit).toHaveBeenCalledWith('magic:enchant', expect.objectContaining({
        casterId: 'player1',
        spellType: SpellType.ENCHANT_SAPPHIRE,
      }))
    })

    it('should handle utility effects', async () => {
      magicSystem.castSpell('player1', SpellType.TELEKINETIC_GRAB, undefined, { x: 10, y: 0, z: 10 })
      
      // Wait for cast completion
      await new Promise(resolve => setTimeout(resolve, SPELL_DEFINITIONS[SpellType.TELEKINETIC_GRAB].castTime + 10))
      
      expect(world.events.emit).toHaveBeenCalledWith('magic:telekinetic_grab', expect.objectContaining({
        casterId: 'player1',
        targetPosition: { x: 10, y: 0, z: 10 },
      }))
    })
  })

  describe('Spell Management', () => {
    beforeEach(() => {
      magicSystem.createMagicComponent('player1')
    })

    it('should select spells', () => {
      const result = magicSystem.selectSpell('player1', SpellType.FIRE_STRIKE)
      
      expect(result).toBe(true)
      expect(world.events.emit).toHaveBeenCalledWith('magic:spell_selected', {
        casterId: 'player1',
        spellType: SpellType.FIRE_STRIKE,
        spellName: 'Fire Strike',
      })
      
      const magic = magicSystem.getPlayerMagic('player1')
      expect(magic!.selectedSpell).toBe(SpellType.FIRE_STRIKE)
    })

    it('should not select unavailable spells', () => {
      const result = magicSystem.selectSpell('player1', SpellType.FIRE_BLAST) // Too high level
      
      expect(result).toBe(false)
    })

    it('should set autocast', () => {
      const result = magicSystem.setAutocast('player1', SpellType.WIND_STRIKE)
      
      expect(result).toBe(true)
      expect(world.events.emit).toHaveBeenCalledWith('magic:autocast_set', {
        casterId: 'player1',
        spellType: SpellType.WIND_STRIKE,
        spellName: 'Wind Strike',
      })
      
      const magic = magicSystem.getPlayerMagic('player1')
      expect(magic!.autocast).toBe(SpellType.WIND_STRIKE)
    })

    it('should clear autocast', () => {
      magicSystem.setAutocast('player1', SpellType.WIND_STRIKE)
      const result = magicSystem.setAutocast('player1', undefined)
      
      expect(result).toBe(true)
      expect(world.events.emit).toHaveBeenCalledWith('magic:autocast_set', {
        casterId: 'player1',
        spellType: undefined,
        spellName: null,
      })
      
      const magic = magicSystem.getPlayerMagic('player1')
      expect(magic!.autocast).toBeUndefined()
    })

    it('should interrupt casts', () => {
      magicSystem.castSpell('player1', SpellType.WIND_STRIKE, 'target1')
      
      const result = magicSystem.interruptCast('player1')
      
      expect(result).toBe(true)
      expect(world.events.emit).toHaveBeenCalledWith('magic:cast_interrupted', expect.objectContaining({
        casterId: 'player1',
        spellType: SpellType.WIND_STRIKE,
      }))
      
      const magic = magicSystem.getPlayerMagic('player1')
      expect(magic!.casting).toBe(false)
    })

    it('should check casting status', () => {
      expect(magicSystem.isCasting('player1')).toBe(false)
      
      magicSystem.castSpell('player1', SpellType.WIND_STRIKE, 'target1')
      expect(magicSystem.isCasting('player1')).toBe(true)
    })
  })

  describe('Event Handling', () => {
    beforeEach(() => {
      magicSystem.createMagicComponent('player1')
      magicSystem.setAutocast('player1', SpellType.WIND_STRIKE)
    })

    it('should handle target selection with autocast', () => {
      const targetSelectedHandler = world.events.on.mock.calls
        .find(call => call[0] === 'combat:target_selected')[1]
      
      targetSelectedHandler({ attackerId: 'player1', targetId: 'target1' })
      
      expect(world.events.emit).toHaveBeenCalledWith('magic:cast_started', expect.objectContaining({
        casterId: 'player1',
        spellType: SpellType.WIND_STRIKE,
        targetId: 'target1',
      }))
    })

    it('should handle item usage with selected spell', () => {
      magicSystem.selectSpell('player1', SpellType.HIGH_LEVEL_ALCHEMY)
      
      const itemUsedHandler = world.events.on.mock.calls
        .find(call => call[0] === 'inventory:item_used')[1]
      
      itemUsedHandler({ playerId: 'player1', itemId: 'test_item' })
      
      expect(world.events.emit).toHaveBeenCalledWith('magic:cast_started', expect.objectContaining({
        casterId: 'player1',
        spellType: SpellType.HIGH_LEVEL_ALCHEMY,
        targetId: 'test_item',
      }))
    })
  })

  describe('System Updates', () => {
    it('should clean up completed casts', () => {
      const mockNow = vi.spyOn(Date, 'now')
      mockNow.mockReturnValue(1000)
      
      magicSystem.castSpell('player1', SpellType.WIND_STRIKE, 'target1')
      
      // Advance time way past completion
      mockNow.mockReturnValue(10000)
      
      magicSystem.update(16)
      
      // Cast should be cleaned up (private method, test indirectly)
      expect((magicSystem as any).activeCasts.size).toBe(0)
      
      mockNow.mockRestore()
    })

    it('should update spell effects', () => {
      const mockNow = vi.spyOn(Date, 'now')
      mockNow.mockReturnValue(1000)
      
      // Manually add an effect that should expire
      const effect = {
        id: 'test_effect',
        spellType: SpellType.WIND_STRIKE,
        targetId: 'target1',
        startTime: 1000,
        duration: 5000,
        effectType: 'test',
        data: {},
      };
      (magicSystem as any).activeEffects.set('test_effect', effect)
      
      // Advance time past effect duration
      mockNow.mockReturnValue(7000)
      
      magicSystem.update(16)
      
      expect(world.events.emit).toHaveBeenCalledWith('magic:effect_expired', {
        effectId: 'test_effect',
        targetId: 'target1',
        spellType: SpellType.WIND_STRIKE,
        effectType: 'test',
      })
      
      mockNow.mockRestore()
    })
  })

  describe('Serialization', () => {
    it('should serialize system state', () => {
      magicSystem.castSpell('player1', SpellType.WIND_STRIKE, 'target1')
      
      const serialized = magicSystem.serialize()
      
      expect(serialized).toHaveProperty('activeCasts')
      expect(serialized).toHaveProperty('activeEffects')
      expect(serialized).toHaveProperty('lastUpdateTime')
    })

    it('should deserialize system state', () => {
      const data = {
        activeCasts: { 'cast1': { id: 'cast1', casterId: 'player1' } },
        activeEffects: { 'effect1': { id: 'effect1', targetId: 'target1' } },
        lastUpdateTime: 12345,
      }
      
      magicSystem.deserialize(data)
      
      expect((magicSystem as any).activeCasts.get('cast1')).toBeDefined()
      expect((magicSystem as any).activeEffects.get('effect1')).toBeDefined()
      expect((magicSystem as any).lastUpdateTime).toBe(12345)
    })
  })

  describe('Error Handling', () => {
    it('should handle missing caster', () => {
      const result = magicSystem.castSpell('nonexistent', SpellType.WIND_STRIKE, 'target1')
      expect(result).toBe(false)
    })

    it('should handle missing magic component', () => {
      // Don't create magic component
      const result = magicSystem.castSpell('player1', SpellType.WIND_STRIKE, 'target1')
      expect(result).toBe(false)
    })

    it('should handle invalid spell type', () => {
      magicSystem.createMagicComponent('player1')
      const result = magicSystem.castSpell('player1', 'INVALID_SPELL' as SpellType, 'target1')
      expect(result).toBe(false)
    })

    it('should handle missing systems gracefully', () => {
      // Clear systems
      world.systems = []
      
      magicSystem.createMagicComponent('player1')
      const result = magicSystem.castSpell('player1', SpellType.WIND_STRIKE, 'target1')
      
      // Should still work but with limited functionality
      expect(result).toBe(true)
    })
  })
})