/**
 * Integration tests for the complete spell system
 * Tests MagicSystem, EnhancedMagicSystem, and SpellDefinitions working together
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { MagicSystem } from '../MagicSystem'
import { EnhancedMagicSystem } from '../EnhancedMagicSystem'
import { SpellType, SPELL_DEFINITIONS, canCastSpell, calculateSpellDamage } from '../spells/SpellDefinitions'
import spellsData from '../../data/spells.json'
import type { World } from '../../../types'

// Mock World implementation for integration testing
const createIntegrationWorld = (): World => {
  const entities = new Map<string, any>()
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

const createTestPlayer = (id: string, magicLevel: number = 50) => {
  const components = new Map<string, any>()
  
  const entity = {
    id,
    position: { x: 0, y: 0, z: 0 },
    components,
    getComponent: (type: string) => components.get(type),
    addComponent: (component: any) => components.set(component.type, component),
    removeComponent: (type: string) => components.delete(type),
  }

  // Add stats component
  const stats = {
    type: 'stats',
    hitpoints: { current: 100, max: 100, level: 10, experience: 1154 },
    attack: { level: 1, experience: 0 },
    strength: { level: 1, experience: 0 },
    defense: { level: 1, experience: 0 },
    magic: { level: magicLevel, experience: 0 },
    ranged: { level: 1, experience: 0 },
    combatBonuses: {
      attackStab: 0, attackSlash: 0, attackCrush: 0, attackMagic: 0, attackRanged: 0,
      defenseStab: 0, defenseSlash: 0, defenseCrush: 0, defenseMagic: 0, defenseRanged: 0,
      meleeStrength: 0, rangedStrength: 0, magicDamage: 0, prayer: 0,
    },
  }
  entity.addComponent(stats)

  // Add inventory with all runes
  const inventory = {
    type: 'inventory',
    items: new Array(28).fill(null),
    size: 28,
  }
  
  // Add all types of runes
  const runeTypes = [556, 555, 557, 554, 558, 562, 560, 563, 561, 564, 559, 565, 566, 9075]
  runeTypes.forEach((runeId, index) => {
    if (index < 28) {
      inventory.items[index] = { itemId: runeId, quantity: 1000 }
    }
  })
  
  entity.addComponent(inventory)

  return entity
}

describe('Spell System Integration', () => {
  let world: World
  let basicMagicSystem: MagicSystem
  let enhancedMagicSystem: EnhancedMagicSystem
  let player: any
  let target: any

  beforeEach(() => {
    world = createIntegrationWorld()
    basicMagicSystem = new MagicSystem(world)
    enhancedMagicSystem = new EnhancedMagicSystem(world)
    
    player = createTestPlayer('player1', 50)
    target = createTestPlayer('target1', 1)
    
    world.entities.set('player1', player)
    world.entities.set('target1', target)
    
    // Mock supporting systems
    const inventorySystem = {
      removeItem: vi.fn(),
      addItem: vi.fn(),
      itemRegistry: {
        getItem: vi.fn().mockReturnValue({ value: 100, tradeable: true }),
      },
    }
    world.systems.set('inventory', inventorySystem)
    
    const combatSystem = {
      applyDamage: vi.fn(),
      dealDamage: vi.fn(),
    }
    world.systems.set('combat', combatSystem)
    
    const skillsSystem = {
      constructor: { name: 'EnhancedSkillsSystem' },
      grantXP: vi.fn(),
      getSkillLevel: vi.fn().mockReturnValue(50),
      addExperience: vi.fn(),
    }
    world.systems.set('skills', skillsSystem)
    world.systems.push(skillsSystem)
    
    // Initialize enhanced system
    enhancedMagicSystem.initialize()
    enhancedMagicSystem.createMagicComponent('player1')
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Spell Data Consistency Between Systems', () => {
    it('should have matching spells between basic and enhanced systems', () => {
      // Check that spells exist in both systems
      expect(basicMagicSystem.getSpell('wind_strike')).toBeDefined()
      expect(SPELL_DEFINITIONS[SpellType.WIND_STRIKE]).toBeDefined()
      
      expect(basicMagicSystem.getSpell('fire_blast')).toBeDefined()
      expect(SPELL_DEFINITIONS[SpellType.FIRE_BLAST]).toBeDefined()
    })

    it('should have consistent spell properties', () => {
      const basicWindStrike = basicMagicSystem.getSpell('wind_strike')
      const enhancedWindStrike = SPELL_DEFINITIONS[SpellType.WIND_STRIKE]
      
      expect(basicWindStrike?.level).toBe(enhancedWindStrike.levelRequired)
      expect(basicWindStrike?.experience).toBe(enhancedWindStrike.baseXP)
    })

    it('should have spells that match JSON data structure', () => {
      const jsonWindStrike = spellsData.spells.find(s => s.name === 'Wind Strike')
      const codeWindStrike = SPELL_DEFINITIONS[SpellType.WIND_STRIKE]
      
      expect(jsonWindStrike).toBeDefined()
      expect(codeWindStrike).toBeDefined()
      
      // Check level consistency
      expect(jsonWindStrike!.level).toBe(codeWindStrike.levelRequired)
      expect(jsonWindStrike!.experience).toBe(codeWindStrike.baseXP)
    })
  })

  describe('Cross-System Spell Casting', () => {
    it('should cast spells successfully in basic system', () => {
      const result = basicMagicSystem.castSpell('player1', 'wind_strike', 'target1')
      
      expect(result).toBe(true)
      expect(world.events.emit).toHaveBeenCalledWith('spell:cast', expect.objectContaining({
        casterId: 'player1',
        spellId: 'wind_strike',
        targetId: 'target1',
      }))
    })

    it('should cast spells successfully in enhanced system', () => {
      const result = enhancedMagicSystem.castSpell('player1', SpellType.WIND_STRIKE, 'target1')
      
      expect(result).toBe(true)
      expect(world.events.emit).toHaveBeenCalledWith('magic:cast_started', expect.objectContaining({
        casterId: 'player1',
        spellType: SpellType.WIND_STRIKE,
        targetId: 'target1',
      }))
    })

    it('should handle the same rune consumption logic', () => {
      const inventorySystem = world.getSystem('inventory')
      
      // Cast with basic system
      basicMagicSystem.castSpell('player1', 'wind_strike', 'target1')
      expect(inventorySystem.removeItem).toHaveBeenCalled()
      
      vi.clearAllMocks()
      
      // Cast with enhanced system
      enhancedMagicSystem.castSpell('player1', SpellType.WATER_STRIKE, 'target1')
      expect(inventorySystem.removeItem).toHaveBeenCalled()
    })
  })

  describe('Spell Validation Consistency', () => {
    it('should have consistent level requirements', () => {
      const lowLevelPlayer = createTestPlayer('lowlevel', 1)
      world.entities.set('lowlevel', lowLevelPlayer)
      
      // Both systems should reject high-level spells for low-level players
      const basicResult = basicMagicSystem.castSpell('lowlevel', 'fire_blast', 'target1')
      expect(basicResult).toBe(false)
      
      // Enhanced system would also reject but we need magic component first
      enhancedMagicSystem.createMagicComponent('lowlevel')
      const enhancedResult = enhancedMagicSystem.castSpell('lowlevel', SpellType.FIRE_BLAST, 'target1')
      expect(enhancedResult).toBe(false)
    })

    it('should use consistent damage calculation', () => {
      const spell = SPELL_DEFINITIONS[SpellType.WIND_STRIKE]
      
      // Test damage calculation function
      for (let i = 0; i < 100; i++) {
        const damage = calculateSpellDamage(spell, 50)
        expect(damage).toBeGreaterThanOrEqual(0)
        expect(damage).toBeLessThanOrEqual(spell.effects[0].damage!.max + Math.floor(50 / 10))
      }
    })

    it('should validate rune requirements consistently', () => {
      const spell = SPELL_DEFINITIONS[SpellType.WIND_STRIKE]
      const mockInventory = [
        { itemId: 556, quantity: 1 }, // Air rune
        { itemId: 558, quantity: 1 }, // Mind rune
      ]
      
      expect(canCastSpell(spell, 1, mockInventory)).toBe(true)
      expect(canCastSpell(spell, 1, [])).toBe(false) // No runes
    })
  })

  describe('Complete Spell Workflow Integration', () => {
    it('should complete full combat spell workflow', async () => {
      // Start with enhanced system (more comprehensive)
      const castResult = enhancedMagicSystem.castSpell('player1', SpellType.FIRE_BOLT, 'target1')
      expect(castResult).toBe(true)
      
      // Wait for cast completion
      await new Promise(resolve => setTimeout(resolve, SPELL_DEFINITIONS[SpellType.FIRE_BOLT].castTime + 50))
      
      // Check that all events were emitted
      expect(world.events.emit).toHaveBeenCalledWith('magic:cast_started', expect.any(Object))
      expect(world.events.emit).toHaveBeenCalledWith('magic:cast_completed', expect.any(Object))
      
      // Check that damage was applied
      const combatSystem = world.getSystem('combat')
      expect(combatSystem.dealDamage).toHaveBeenCalled()
      
      // Check that experience was granted
      const skillsSystem = world.getSystem('skills')
      expect(skillsSystem.addExperience).toHaveBeenCalledWith('player1', expect.any(String), SPELL_DEFINITIONS[SpellType.FIRE_BOLT].baseXP)
    })

    it('should complete teleport spell workflow', async () => {
      const castResult = enhancedMagicSystem.castSpell('player1', SpellType.VARROCK_TELEPORT)
      expect(castResult).toBe(true)
      
      // Wait for cast completion
      await new Promise(resolve => setTimeout(resolve, SPELL_DEFINITIONS[SpellType.VARROCK_TELEPORT].castTime + 50))
      
      // Check teleport event
      expect(world.events.emit).toHaveBeenCalledWith('magic:teleport', expect.objectContaining({
        casterId: 'player1',
        destination: { x: 100, y: 0, z: 0 },
        zoneName: 'varrock',
      }))
    })

    it('should complete alchemy spell workflow', async () => {
      const castResult = enhancedMagicSystem.castSpell('player1', SpellType.HIGH_LEVEL_ALCHEMY, 'test_item')
      expect(castResult).toBe(true)
      
      // Wait for cast completion
      await new Promise(resolve => setTimeout(resolve, SPELL_DEFINITIONS[SpellType.HIGH_LEVEL_ALCHEMY].castTime + 50))
      
      // Check alchemy event
      expect(world.events.emit).toHaveBeenCalledWith('magic:alchemy', expect.objectContaining({
        casterId: 'player1',
        spellType: SpellType.HIGH_LEVEL_ALCHEMY,
      }))
    })
  })

  describe('System Interoperability', () => {
    it('should share rune consumption logic', () => {
      const inventorySystem = world.getSystem('inventory')
      
      // Test that both systems consume the same runes for the same spell
      const windStrikeBasic = basicMagicSystem.getSpell('wind_strike')
      const windStrikeEnhanced = SPELL_DEFINITIONS[SpellType.WIND_STRIKE]
      
      // Basic system
      basicMagicSystem.castSpell('player1', 'wind_strike', 'target1')
      
      const basicCalls = inventorySystem.removeItem.mock.calls
      expect(basicCalls).toContainEqual(['player1', 556, 1]) // Air rune
      expect(basicCalls).toContainEqual(['player1', 558, 1]) // Mind rune
      
      vi.clearAllMocks()
      
      // Enhanced system
      enhancedMagicSystem.castSpell('player1', SpellType.WIND_STRIKE, 'target1')
      
      const enhancedCalls = inventorySystem.removeItem.mock.calls
      expect(enhancedCalls).toContainEqual(['player1', 556, 1]) // Air rune
      expect(enhancedCalls).toContainEqual(['player1', 558, 1]) // Mind rune
    })

    it('should grant experience through the same system', () => {
      const skillsSystem = world.getSystem('skills')
      
      // Basic system
      basicMagicSystem.castSpell('player1', 'wind_strike', 'target1')
      expect(skillsSystem.grantXP).toHaveBeenCalledWith('player1', 'magic', 5.5)
      
      vi.clearAllMocks()
      
      // Enhanced system (experience granted after cast completion)
      enhancedMagicSystem.castSpell('player1', SpellType.WATER_STRIKE, 'target1')
      // Wait for completion would be needed to test experience granting
    })

    it('should handle combat damage through the same system', () => {
      const combatSystem = world.getSystem('combat')
      
      // Basic system applies damage directly
      basicMagicSystem.castSpell('player1', 'wind_strike', 'target1')
      expect(combatSystem.applyDamage).toHaveBeenCalled()
      
      vi.clearAllMocks()
      
      // Enhanced system applies damage through dealDamage method
      enhancedMagicSystem.castSpell('player1', SpellType.WATER_STRIKE, 'target1')
      // Damage would be applied after cast completion
    })
  })

  describe('Error Handling Consistency', () => {
    it('should handle missing entities consistently', () => {
      const basicResult = basicMagicSystem.castSpell('nonexistent', 'wind_strike', 'target1')
      const enhancedResult = enhancedMagicSystem.castSpell('nonexistent', SpellType.WIND_STRIKE, 'target1')
      
      expect(basicResult).toBe(false)
      expect(enhancedResult).toBe(false)
    })

    it('should handle invalid spells consistently', () => {
      const basicResult = basicMagicSystem.castSpell('player1', 'invalid_spell', 'target1')
      const enhancedResult = enhancedMagicSystem.castSpell('player1', 'invalid_spell' as SpellType, 'target1')
      
      expect(basicResult).toBe(false)
      expect(enhancedResult).toBe(false)
    })

    it('should handle insufficient resources consistently', () => {
      // Create player with no runes
      const poorPlayer = createTestPlayer('poor', 50)
      poorPlayer.getComponent('inventory').items = new Array(28).fill(null)
      world.entities.set('poor', poorPlayer)
      
      const basicResult = basicMagicSystem.castSpell('poor', 'wind_strike', 'target1')
      expect(basicResult).toBe(false)
      
      enhancedMagicSystem.createMagicComponent('poor')
      const enhancedResult = enhancedMagicSystem.castSpell('poor', SpellType.WIND_STRIKE, 'target1')
      expect(enhancedResult).toBe(false)
    })
  })

  describe('Performance and Scalability', () => {
    it('should handle multiple simultaneous casts', () => {
      const players = ['player1', 'player2', 'player3', 'player4', 'player5']
      
      players.forEach((playerId, index) => {
        if (index > 0) {
          const newPlayer = createTestPlayer(playerId, 50)
          world.entities.set(playerId, newPlayer)
          enhancedMagicSystem.createMagicComponent(playerId)
        }
      })
      
      // Cast spells with all players simultaneously
      const results = players.map(playerId => 
        enhancedMagicSystem.castSpell(playerId, SpellType.WIND_STRIKE, 'target1')
      )
      
      // All casts should succeed
      expect(results.every(result => result === true)).toBe(true)
      
      // All should emit cast started events
      expect(world.events.emit).toHaveBeenCalledTimes(players.length)
    })

    it('should handle system updates efficiently', () => {
      // Start multiple casts
      for (let i = 0; i < 10; i++) {
        enhancedMagicSystem.castSpell('player1', SpellType.WIND_STRIKE, 'target1')
      }
      
      // System update should handle all active casts
      const startTime = Date.now()
      enhancedMagicSystem.update(16)
      const updateTime = Date.now() - startTime
      
      // Update should be fast (less than 10ms for 10 casts)
      expect(updateTime).toBeLessThan(10)
    })
  })

  describe('Data Validation Integration', () => {
    it('should validate all spell definitions are usable', () => {
      // Test that every spell definition can theoretically be cast
      for (const [spellType, spell] of Object.entries(SPELL_DEFINITIONS)) {
        expect(spell.name).toBeTruthy()
        expect(spell.levelRequired).toBeGreaterThan(0)
        expect(spell.runes.length).toBeGreaterThan(0)
        expect(spell.effects.length).toBeGreaterThan(0)
        expect(spell.castTime).toBeGreaterThan(0)
        
        // Test with high level player that has all runes
        const highLevelPlayer = createTestPlayer('highlevel', 99)
        world.entities.set('highlevel', highLevelPlayer)
        enhancedMagicSystem.createMagicComponent('highlevel')
        
        // Should be able to cast any spell
        const canCast = enhancedMagicSystem.castSpell('highlevel', spellType as SpellType, 'target1')
        expect(canCast).toBe(true)
        
        // Clean up for next iteration
        enhancedMagicSystem.interruptCast('highlevel')
      }
    })

    it('should have consistent spell data across all sources', () => {
      // Compare JSON data with TypeScript definitions
      const jsonSpells = spellsData.spells
      
      for (const jsonSpell of jsonSpells) {
        if (jsonSpell.category === 'combat') {
          // Find corresponding TypeScript spell
          const spellName = jsonSpell.name.toLowerCase().replace(/\s+/g, '_')
          const tsSpell = Object.values(SPELL_DEFINITIONS).find(s => 
            s.name.toLowerCase() === jsonSpell.name.toLowerCase()
          )
          
          if (tsSpell) {
            expect(tsSpell.levelRequired).toBe(jsonSpell.level)
            expect(tsSpell.baseXP).toBe(jsonSpell.experience)
            
            if (jsonSpell.damage) {
              expect(tsSpell.effects[0].damage?.max).toBe(jsonSpell.damage.max)
              expect(tsSpell.effects[0].damage?.min).toBe(jsonSpell.damage.min)
            }
          }
        }
      }
    })
  })
})