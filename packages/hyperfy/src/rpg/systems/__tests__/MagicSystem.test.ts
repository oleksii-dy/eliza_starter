/**
 * Comprehensive tests for MagicSystem
 * Tests spell casting, rune requirements, cooldowns, and spell effects
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { MagicSystem } from '../MagicSystem'
import type { World } from '../../../types'
import type { RPGEntity, StatsComponent, InventoryComponent } from '../../types'

// Mock World and Entity implementations
const createMockWorld = (): World => {
  const entities = new Map<string, RPGEntity>()
  const systems = new Map<string, any>()
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
    getSystem: (name: string) => systems.get(name),
    getSystemByType: (type: any) => Array.from(systems.values()).find(s => s instanceof type),
  } as any
}

const createMockEntity = (id: string): RPGEntity => {
  const components = new Map<string, any>()
  
  return {
    id,
    position: { x: 0, y: 0, z: 0 },
    components,
    getComponent: <T>(type: string): T | undefined => components.get(type),
    addComponent: (component: any) => components.set(component.type, component),
    removeComponent: (type: string) => components.delete(type),
  } as any
}

const createMockStatsComponent = (magicLevel: number = 1): StatsComponent => ({
  type: 'stats',
  hitpoints: { current: 100, max: 100, level: 10, experience: 1154 },
  attack: { level: 1, experience: 0 },
  strength: { level: 1, experience: 0 },
  defense: { level: 1, experience: 0 },
  magic: { level: magicLevel, experience: 0 },
  ranged: { level: 1, experience: 0 },
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
    prayer: 0,
  },
})

const createMockInventoryComponent = (items: any[] = []): InventoryComponent => ({
  type: 'inventory',
  items: new Array(28).fill(null).map((_, i) => items[i] || null),
  size: 28,
})

describe('MagicSystem', () => {
  let world: World
  let magicSystem: MagicSystem
  let player: RPGEntity
  let target: RPGEntity

  beforeEach(() => {
    world = createMockWorld()
    magicSystem = new MagicSystem(world)
    
    // Create mock player
    player = createMockEntity('player1')
    const playerStats = createMockStatsComponent(99) // Level 99 magic (can cast all spells)
    const playerInventory = createMockInventoryComponent([
      { itemId: 556, quantity: 1000 }, // Air runes
      { itemId: 555, quantity: 1000 }, // Water runes
      { itemId: 557, quantity: 1000 }, // Earth runes
      { itemId: 554, quantity: 1000 }, // Fire runes
      { itemId: 558, quantity: 1000 }, // Mind runes
      { itemId: 562, quantity: 1000 }, // Chaos runes
      { itemId: 560, quantity: 1000 }, // Death runes
      { itemId: 563, quantity: 1000 }, // Law runes
      { itemId: 561, quantity: 1000 }, // Nature runes
      { itemId: 565, quantity: 1000 }, // Blood runes
      { itemId: 995, quantity: 10000 }, // Coins for testing
    ])
    
    player.addComponent(playerStats)
    player.addComponent(playerInventory)
    world.entities.set('player1', player)
    
    // Create mock target
    target = createMockEntity('target1')
    const targetStats = createMockStatsComponent()
    target.addComponent(targetStats)
    world.entities.set('target1', target)
    
    // Mock inventory system
    const inventorySystem = {
      removeItem: vi.fn(),
      addItem: vi.fn(),
      itemRegistry: {
        getItem: vi.fn().mockReturnValue({
          value: 100,
          tradeable: true,
        }),
      },
    }
    world.systems.set('inventory', inventorySystem)
    
    // Mock world.getSystemByType to return inventory system
    world.getSystemByType = vi.fn().mockImplementation((type) => {
      if (type.name === 'InventorySystem' || type === 'inventory') {
        return inventorySystem
      }
      return null
    })
    
    // Mock combat system
    const combatSystem = {
      applyDamage: vi.fn(),
    }
    world.systems.set('combat', combatSystem)
    
    // Mock skills system  
    const skillsSystem = {
      grantXP: vi.fn(),
    }
    world.systems.set('skills', skillsSystem)
    
    // Update world.getSystem to handle multiple systems
    world.getSystem = vi.fn().mockImplementation((name: string) => {
      if (name === 'inventory') return inventorySystem
      if (name === 'skills') return skillsSystem
      if (name === 'combat') return combatSystem
      return null
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Spell Registration', () => {
    it('should register default spells on initialization', () => {
      expect(magicSystem.getSpell('wind_strike')).toBeDefined()
      expect(magicSystem.getSpell('fire_blast')).toBeDefined()
      expect(magicSystem.getSpell('varrock_teleport')).toBeDefined()
      expect(magicSystem.getSpell('high_alchemy')).toBeDefined()
    })

    it('should allow custom spell registration', () => {
      const customSpell = {
        id: 'custom_spell',
        name: 'Custom Spell',
        level: 10,
        spellbook: 'standard' as const,
        type: 'combat' as const,
        runes: [{ runeId: 556, quantity: 1 }],
        experience: 10,
        damage: { max: 5, type: 'air' as const },
      }
      
      magicSystem.registerSpell(customSpell)
      expect(magicSystem.getSpell('custom_spell')).toEqual(customSpell)
    })
  })

  describe('Combat Spells', () => {
    it('should cast wind strike successfully', () => {
      const result = magicSystem.castSpell('player1', 'wind_strike', 'target1')
      
      expect(result).toBe(true)
      expect(world.events.emit).toHaveBeenCalledWith('spell:cast', {
        casterId: 'player1',
        spellId: 'wind_strike',
        targetId: 'target1',
        position: undefined,
      })
    })

    it('should fail to cast spell without sufficient magic level', () => {
      const lowLevelPlayer = createMockEntity('lowlevel')
      const lowStats = createMockStatsComponent(1) // Level 1 magic
      lowLevelPlayer.addComponent(lowStats)
      world.entities.set('lowlevel', lowLevelPlayer)
      
      const result = magicSystem.castSpell('lowlevel', 'fire_blast', 'target1')
      
      expect(result).toBe(false)
      expect(world.events.emit).toHaveBeenCalledWith('chat:system', {
        targetId: 'lowlevel',
        message: 'You need level 59 Magic to cast Fire Blast.',
      })
    })

    it('should fail to cast spell without required runes', () => {
      const noRunesPlayer = createMockEntity('norunes')
      const noRunesStats = createMockStatsComponent(50)
      const emptyInventory = createMockInventoryComponent([])
      noRunesPlayer.addComponent(noRunesStats)
      noRunesPlayer.addComponent(emptyInventory)
      world.entities.set('norunes', noRunesPlayer)
      
      const result = magicSystem.castSpell('norunes', 'wind_strike', 'target1')
      
      expect(result).toBe(false)
      expect(world.events.emit).toHaveBeenCalledWith('chat:system', {
        targetId: 'norunes',
        message: "You don't have the required runes to cast this spell.",
      })
    })

    it('should fail to cast combat spell without target', () => {
      const result = magicSystem.castSpell('player1', 'wind_strike')
      
      expect(result).toBe(false)
      expect(world.events.emit).toHaveBeenCalledWith('chat:system', {
        targetId: 'player1',
        message: 'You need a target to cast this spell.',
      })
    })

    it('should respect spell range limitations', () => {
      // Position target far away
      target.position = { x: 100, y: 0, z: 100 }
      
      const result = magicSystem.castSpell('player1', 'wind_strike', 'target1')
      
      // The spell should cast but then fail due to range check in executeCombatSpell
      expect(result).toBe(true) // Cast succeeds initially
      expect(world.events.emit).toHaveBeenCalledWith('chat:system', {
        targetId: 'player1',
        message: 'Your target is too far away.',
      })
    })
  })

  describe('Teleport Spells', () => {
    it('should cast varrock teleport successfully', () => {
      const result = magicSystem.castSpell('player1', 'varrock_teleport')
      
      expect(result).toBe(true)
      expect(world.events.emit).toHaveBeenCalledWith('player:teleport', {
        playerId: 'player1',
        position: { x: 3213, y: 0, z: 3428 },
        spellId: 'varrock_teleport',
      })
    })

    it('should cast lumbridge teleport successfully', () => {
      const result = magicSystem.castSpell('player1', 'lumbridge_teleport')
      
      expect(result).toBe(true)
      expect(world.events.emit).toHaveBeenCalledWith('player:teleport', {
        playerId: 'player1',
        position: { x: 3222, y: 0, z: 3218 },
        spellId: 'lumbridge_teleport',
      })
    })
  })

  describe('Alchemy Spells', () => {
    it('should cast high alchemy successfully', () => {
      // Clear any previous events
      vi.clearAllMocks()
      
      const result = magicSystem.castSpell('player1', 'high_alchemy')
      
      if (!result) {
        console.log('First high alchemy failed - checking events:', world.events.emit.mock.calls)
      }
      
      expect(result).toBe(true)
      expect(world.events.emit).toHaveBeenCalledWith('spell:alchemy', {
        casterId: 'player1',
        spellId: 'high_alchemy',
        itemId: 556, // Air runes (first item in inventory)
        goldReceived: 60, // 60% of item value (100)
      })
    })

    it('should cast low alchemy successfully', () => {
      const result = magicSystem.castSpell('player1', 'low_alchemy')
      
      expect(result).toBe(true)
      expect(world.events.emit).toHaveBeenCalledWith('spell:alchemy', {
        casterId: 'player1',
        spellId: 'low_alchemy',
        itemId: 556, // Air runes (first item in inventory) 
        goldReceived: 40, // 40% of item value (100)
      })
    })

    it('should test alchemy with available items', () => {
      const emptyInventoryPlayer = createMockEntity('empty')
      const emptyStats = createMockStatsComponent(60) // Same level as main player
      // Give them ONLY the required runes but no other items to alchemize
      const emptyInventory = createMockInventoryComponent([])
      // Add just enough runes to cast the spell but no other items
      emptyInventory.items[0] = { itemId: 554, quantity: 5 } // Fire runes (required for high alchemy)
      emptyInventory.items[1] = { itemId: 561, quantity: 1 } // Nature runes (required for high alchemy)
      // Rest of inventory is empty (null)
      
      emptyInventoryPlayer.addComponent(emptyStats)
      emptyInventoryPlayer.addComponent(emptyInventory)
      world.entities.set('empty', emptyInventoryPlayer)
      
      const result = magicSystem.castSpell('empty', 'high_alchemy')
      
      // The spell will succeed because it can alchemize the Fire runes themselves
      expect(result).toBe(true)
      expect(world.events.emit).toHaveBeenCalledWith('spell:alchemy', {
        casterId: 'empty',
        spellId: 'high_alchemy',
        itemId: 554, // Fire runes get alchemized
        goldReceived: 60, // 60% of item value (100)
      })
    })
  })

  describe('Spell Cooldowns', () => {
    it('should apply cooldown after casting alchemy spell', () => {
      magicSystem.castSpell('player1', 'high_alchemy')
      
      // Try to cast again immediately
      const result = magicSystem.castSpell('player1', 'high_alchemy')
      
      expect(result).toBe(false)
      expect(world.events.emit).toHaveBeenCalledWith('chat:system', {
        targetId: 'player1',
        message: 'That spell is still on cooldown.',
      })
    })

    it('should allow casting after cooldown expires', async () => {
      // Mock Date.now to control time
      const mockNow = vi.spyOn(Date, 'now')
      mockNow.mockReturnValue(1000)
      
      magicSystem.castSpell('player1', 'high_alchemy')
      
      // Advance time past cooldown (3000ms)
      mockNow.mockReturnValue(5000)
      
      const result = magicSystem.castSpell('player1', 'high_alchemy')
      expect(result).toBe(true)
      
      mockNow.mockRestore()
    })
  })

  describe('Rune Consumption', () => {
    it('should consume runes when casting spells', () => {
      const inventorySystem = world.getSystem('inventory')
      
      magicSystem.castSpell('player1', 'wind_strike', 'target1')
      
      expect(inventorySystem.removeItem).toHaveBeenCalledWith('player1', 556, 1) // Air rune
      expect(inventorySystem.removeItem).toHaveBeenCalledWith('player1', 558, 1) // Mind rune
    })

    it('should handle combination runes correctly', () => {
      // Add dust runes (air + earth combination)
      const playerInventory = player.getComponent<InventoryComponent>('inventory')!
      playerInventory.items[0] = { itemId: 4696, quantity: 10 } // Dust runes
      
      const hasRunes = (magicSystem as any).hasRunes('player1', [
        { runeId: 556, quantity: 1 }, // Air
        { runeId: 557, quantity: 1 }, // Earth
      ])
      
      expect(hasRunes).toBe(true)
    })
  })

  describe('Experience Granting', () => {
    it('should grant magic experience when casting spells', () => {
      const skillsSystem = world.getSystem('skills')
      
      magicSystem.castSpell('player1', 'wind_strike', 'target1')
      
      expect(skillsSystem.grantXP).toHaveBeenCalledWith('player1', 'magic', 5.5)
    })
  })

  describe('Spell Effects', () => {
    it('should apply freeze effect from ice spells', () => {
      magicSystem.castSpell('player1', 'ice_rush', 'target1')
      
      expect(world.events.emit).toHaveBeenCalledWith('effect:freeze', {
        targetId: 'target1',
        duration: 5000,
      })
    })

    it('should apply freeze effect from ice barrage', () => {
      magicSystem.castSpell('player1', 'ice_barrage', 'target1')
      
      expect(world.events.emit).toHaveBeenCalledWith('effect:freeze', {
        targetId: 'target1',
        duration: 20000,
      })
    })
  })

  describe('Spell Queries', () => {
    it('should return spells for specific level', () => {
      const level1Spells = magicSystem.getSpellsForLevel(1)
      expect(level1Spells).toHaveLength(1)
      expect(level1Spells[0].id).toBe('wind_strike')
      
      const level50Spells = magicSystem.getSpellsForLevel(50)
      expect(level50Spells.length).toBeGreaterThan(5)
    })

    it('should filter spells by spellbook', () => {
      const standardSpells = magicSystem.getSpellsForLevel(99, 'standard')
      const ancientSpells = magicSystem.getSpellsForLevel(99, 'ancient')
      
      expect(standardSpells.every(s => s.spellbook === 'standard')).toBe(true)
      expect(ancientSpells.every(s => s.spellbook === 'ancient')).toBe(true)
    })

    it('should track active spells', () => {
      magicSystem.castSpell('player1', 'wind_strike', 'target1')
      
      const activeSpell = magicSystem.getActiveSpell('player1')
      expect(activeSpell).toBeDefined()
      expect(activeSpell!.spellId).toBe('wind_strike')
      expect(activeSpell!.targetId).toBe('target1')
    })
  })

  describe('System Update', () => {
    it('should clean up expired cooldowns', () => {
      const mockNow = vi.spyOn(Date, 'now')
      mockNow.mockReturnValue(1000)
      
      magicSystem.castSpell('player1', 'high_alchemy')
      
      // Advance time past cooldown
      mockNow.mockReturnValue(10000)
      
      magicSystem.update(16) // Simulate frame update
      
      // Should be able to cast again
      const result = magicSystem.castSpell('player1', 'high_alchemy')
      expect(result).toBe(true)
      
      mockNow.mockRestore()
    })

    it('should process poison effects over time', () => {
      const mockNow = vi.spyOn(Date, 'now')
      mockNow.mockReturnValue(1000)
      
      // Manually add poison effect
      const poisonData = {
        targetId: 'target1',
        damage: 2,
        duration: 30000,
        tickRate: 3000,
        startTime: 1000,
      };
      (magicSystem as any).poisonEffects.set('target1', poisonData)
      
      // Advance time to trigger poison tick
      mockNow.mockReturnValue(4000)
      
      magicSystem.update(16)
      
      expect(world.events.emit).toHaveBeenCalledWith('combat:damage', {
        targetId: 'target1',
        damage: 2,
        type: 'poison',
        timestamp: 4000,
      })
      
      mockNow.mockRestore()
    })
  })

  describe('Error Handling', () => {
    it('should handle missing caster entity', () => {
      const result = magicSystem.castSpell('nonexistent', 'wind_strike', 'target1')
      expect(result).toBe(false)
    })

    it('should handle missing target entity', () => {
      const result = magicSystem.castSpell('player1', 'wind_strike', 'nonexistent')
      expect(result).toBe(true) // Cast succeeds but damage fails silently
    })

    it('should handle invalid spell ID', () => {
      const result = magicSystem.castSpell('player1', 'nonexistent_spell', 'target1')
      expect(result).toBe(false)
    })

    it('should handle missing components gracefully', () => {
      const brokenPlayer = createMockEntity('broken')
      world.entities.set('broken', brokenPlayer)
      
      const result = magicSystem.castSpell('broken', 'wind_strike', 'target1')
      expect(result).toBe(false)
    })
  })
})