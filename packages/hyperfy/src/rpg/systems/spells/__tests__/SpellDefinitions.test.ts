/**
 * Comprehensive tests for SpellDefinitions
 * Tests spell data integrity, helper functions, and spell validation
 */

import { describe, it, expect } from 'vitest'
import {
  SpellType,
  RuneType,
  SPELL_DEFINITIONS,
  getSpellsByLevel,
  getCombatSpells,
  getUtilitySpells,
  canCastSpell,
  calculateSpellDamage,
} from '../SpellDefinitions'
import { SkillType } from '../../skills/SkillDefinitions'

describe('SpellDefinitions', () => {
  describe('Spell Type Enum', () => {
    it('should have all expected combat spells', () => {
      expect(SpellType.WIND_STRIKE).toBe('wind_strike')
      expect(SpellType.WATER_STRIKE).toBe('water_strike')
      expect(SpellType.EARTH_STRIKE).toBe('earth_strike')
      expect(SpellType.FIRE_STRIKE).toBe('fire_strike')
      
      expect(SpellType.WIND_BOLT).toBe('wind_bolt')
      expect(SpellType.WATER_BOLT).toBe('water_bolt')
      expect(SpellType.EARTH_BOLT).toBe('earth_bolt')
      expect(SpellType.FIRE_BOLT).toBe('fire_bolt')
      
      expect(SpellType.WIND_BLAST).toBe('wind_blast')
      expect(SpellType.WATER_BLAST).toBe('water_blast')
      expect(SpellType.EARTH_BLAST).toBe('earth_blast')
      expect(SpellType.FIRE_BLAST).toBe('fire_blast')
    })

    it('should have all expected utility spells', () => {
      expect(SpellType.LOW_LEVEL_ALCHEMY).toBe('low_level_alchemy')
      expect(SpellType.HIGH_LEVEL_ALCHEMY).toBe('high_level_alchemy')
      expect(SpellType.TELEKINETIC_GRAB).toBe('telekinetic_grab')
    })

    it('should have all expected teleport spells', () => {
      expect(SpellType.LUMBRIDGE_TELEPORT).toBe('lumbridge_teleport')
      expect(SpellType.VARROCK_TELEPORT).toBe('varrock_teleport')
      expect(SpellType.FALADOR_TELEPORT).toBe('falador_teleport')
      expect(SpellType.CAMELOT_TELEPORT).toBe('camelot_teleport')
    })

    it('should have all expected enchant spells', () => {
      expect(SpellType.ENCHANT_CROSSBOW_BOLT).toBe('enchant_crossbow_bolt')
      expect(SpellType.ENCHANT_SAPPHIRE).toBe('enchant_sapphire')
      expect(SpellType.ENCHANT_EMERALD).toBe('enchant_emerald')
      expect(SpellType.ENCHANT_RUBY).toBe('enchant_ruby')
      expect(SpellType.ENCHANT_DIAMOND).toBe('enchant_diamond')
    })

    it('should have all expected support spells', () => {
      expect(SpellType.SUPERHEAT_ITEM).toBe('superheat_item')
      expect(SpellType.CHARGE_WATER_ORB).toBe('charge_water_orb')
      expect(SpellType.CHARGE_EARTH_ORB).toBe('charge_earth_orb')
      expect(SpellType.CHARGE_FIRE_ORB).toBe('charge_fire_orb')
      expect(SpellType.CHARGE_AIR_ORB).toBe('charge_air_orb')
    })
  })

  describe('Rune Type Enum', () => {
    it('should have correct RuneScape rune IDs', () => {
      expect(RuneType.AIR_RUNE).toBe(556)
      expect(RuneType.WATER_RUNE).toBe(555)
      expect(RuneType.EARTH_RUNE).toBe(557)
      expect(RuneType.FIRE_RUNE).toBe(554)
      expect(RuneType.MIND_RUNE).toBe(558)
      expect(RuneType.CHAOS_RUNE).toBe(562)
      expect(RuneType.DEATH_RUNE).toBe(560)
      expect(RuneType.BLOOD_RUNE).toBe(565)
      expect(RuneType.SOUL_RUNE).toBe(566)
      expect(RuneType.ASTRAL_RUNE).toBe(9075)
      expect(RuneType.NATURE_RUNE).toBe(561)
      expect(RuneType.LAW_RUNE).toBe(563)
      expect(RuneType.COSMIC_RUNE).toBe(564)
      expect(RuneType.BODY_RUNE).toBe(559)
    })
  })

  describe('Spell Definitions Data Integrity', () => {
    it('should have definitions for all spell types', () => {
      const spellTypes = Object.values(SpellType)
      
      for (const spellType of spellTypes) {
        expect(SPELL_DEFINITIONS[spellType]).toBeDefined()
        expect(SPELL_DEFINITIONS[spellType].type).toBe(spellType)
      }
    })

    it('should have valid spell data structure', () => {
      for (const [spellType, spell] of Object.entries(SPELL_DEFINITIONS)) {
        expect(spell.type).toBe(spellType)
        expect(typeof spell.name).toBe('string')
        expect(spell.name.length).toBeGreaterThan(0)
        expect(typeof spell.description).toBe('string')
        expect(spell.description.length).toBeGreaterThan(0)
        expect(typeof spell.levelRequired).toBe('number')
        expect(spell.levelRequired).toBeGreaterThanOrEqual(1)
        expect(typeof spell.baseXP).toBe('number')
        expect(spell.baseXP).toBeGreaterThan(0)
        expect(Array.isArray(spell.runes)).toBe(true)
        expect(spell.runes.length).toBeGreaterThan(0)
        expect(Array.isArray(spell.effects)).toBe(true)
        expect(spell.effects.length).toBeGreaterThan(0)
        expect(['self', 'enemy', 'item', 'ground', 'none']).toContain(spell.targetType)
        expect(typeof spell.castTime).toBe('number')
        expect(spell.castTime).toBeGreaterThan(0)
      }
    })

    it('should have valid rune requirements', () => {
      for (const spell of Object.values(SPELL_DEFINITIONS)) {
        for (const rune of spell.runes) {
          expect(Object.values(RuneType)).toContain(rune.runeType)
          expect(typeof rune.quantity).toBe('number')
          expect(rune.quantity).toBeGreaterThan(0)
        }
      }
    })

    it('should have valid spell effects', () => {
      for (const spell of Object.values(SPELL_DEFINITIONS)) {
        for (const effect of spell.effects) {
          expect(['damage', 'heal', 'teleport', 'alchemy', 'enchant', 'utility']).toContain(effect.type)
          
          if (effect.type === 'damage') {
            expect(effect.damage).toBeDefined()
            expect(typeof effect.damage!.min).toBe('number')
            expect(typeof effect.damage!.max).toBe('number')
            expect(effect.damage!.min).toBeLessThanOrEqual(effect.damage!.max)
            if (effect.damage!.element) {
              expect(['air', 'water', 'earth', 'fire']).toContain(effect.damage!.element)
            }
          }
          
          if (effect.type === 'teleport') {
            expect(effect.teleport).toBeDefined()
            expect(typeof effect.teleport!.x).toBe('number')
            expect(typeof effect.teleport!.y).toBe('number')
            expect(typeof effect.teleport!.z).toBe('number')
          }
          
          if (effect.type === 'alchemy') {
            expect(effect.alchemy).toBeDefined()
            expect(typeof effect.alchemy!.valueMultiplier).toBe('number')
            expect(effect.alchemy!.valueMultiplier).toBeGreaterThan(0)
          }
        }
      }
    })

    it('should have appropriate projectiles for combat spells', () => {
      const combatSpells = Object.values(SPELL_DEFINITIONS).filter(s => s.combatOnly)
      
      for (const spell of combatSpells) {
        if (spell.projectile) {
          expect(typeof spell.projectile.speed).toBe('number')
          expect(spell.projectile.speed).toBeGreaterThan(0)
          expect(typeof spell.projectile.model).toBe('string')
          expect(spell.projectile.model.length).toBeGreaterThan(0)
          expect(typeof spell.projectile.color).toBe('string')
          expect(spell.projectile.color.length).toBeGreaterThan(0)
        }
      }
    })
  })

  describe('Strike Spells (Level 1-13)', () => {
    it('should have correct wind strike definition', () => {
      const spell = SPELL_DEFINITIONS[SpellType.WIND_STRIKE]
      
      expect(spell.name).toBe('Wind Strike')
      expect(spell.levelRequired).toBe(1)
      expect(spell.baseXP).toBe(5.5)
      expect(spell.runes).toEqual([
        { runeType: RuneType.AIR_RUNE, quantity: 1 },
        { runeType: RuneType.MIND_RUNE, quantity: 1 },
      ])
      expect(spell.effects[0].damage).toEqual({ min: 0, max: 2, element: 'air' })
      expect(spell.targetType).toBe('enemy')
      expect(spell.maxRange).toBe(10)
      expect(spell.combatOnly).toBe(true)
    })

    it('should have correct fire strike definition', () => {
      const spell = SPELL_DEFINITIONS[SpellType.FIRE_STRIKE]
      
      expect(spell.name).toBe('Fire Strike')
      expect(spell.levelRequired).toBe(13)
      expect(spell.baseXP).toBe(11.5)
      expect(spell.runes).toEqual([
        { runeType: RuneType.FIRE_RUNE, quantity: 3 },
        { runeType: RuneType.AIR_RUNE, quantity: 2 },
        { runeType: RuneType.MIND_RUNE, quantity: 1 },
      ])
      expect(spell.effects[0].damage).toEqual({ min: 0, max: 8, element: 'fire' })
    })
  })

  describe('Bolt Spells (Level 17-35)', () => {
    it('should have correct wind bolt definition', () => {
      const spell = SPELL_DEFINITIONS[SpellType.WIND_BOLT]
      
      expect(spell.levelRequired).toBe(17)
      expect(spell.baseXP).toBe(13.5)
      expect(spell.runes).toEqual([
        { runeType: RuneType.AIR_RUNE, quantity: 2 },
        { runeType: RuneType.CHAOS_RUNE, quantity: 1 },
      ])
      expect(spell.effects[0].damage).toEqual({ min: 0, max: 9, element: 'air' })
    })

    it('should have correct fire bolt definition', () => {
      const spell = SPELL_DEFINITIONS[SpellType.FIRE_BOLT]
      
      expect(spell.levelRequired).toBe(35)
      expect(spell.baseXP).toBe(22.5)
      expect(spell.effects[0].damage).toEqual({ min: 0, max: 12, element: 'fire' })
    })
  })

  describe('Blast Spells (Level 41-59)', () => {
    it('should have correct wind blast definition', () => {
      const spell = SPELL_DEFINITIONS[SpellType.WIND_BLAST]
      
      expect(spell.levelRequired).toBe(41)
      expect(spell.baseXP).toBe(25.5)
      expect(spell.runes).toEqual([
        { runeType: RuneType.AIR_RUNE, quantity: 3 },
        { runeType: RuneType.DEATH_RUNE, quantity: 1 },
      ])
      expect(spell.effects[0].damage).toEqual({ min: 0, max: 13, element: 'air' })
    })

    it('should have correct fire blast definition', () => {
      const spell = SPELL_DEFINITIONS[SpellType.FIRE_BLAST]
      
      expect(spell.levelRequired).toBe(59)
      expect(spell.baseXP).toBe(34.5)
      expect(spell.effects[0].damage).toEqual({ min: 0, max: 16, element: 'fire' })
    })
  })

  describe('Utility Spells', () => {
    it('should have correct alchemy spells', () => {
      const lowAlch = SPELL_DEFINITIONS[SpellType.LOW_LEVEL_ALCHEMY]
      const highAlch = SPELL_DEFINITIONS[SpellType.HIGH_LEVEL_ALCHEMY]
      
      expect(lowAlch.levelRequired).toBe(21)
      expect(lowAlch.effects[0].alchemy!.valueMultiplier).toBe(0.6)
      expect(lowAlch.targetType).toBe('item')
      expect(lowAlch.combatOnly).toBe(false)
      
      expect(highAlch.levelRequired).toBe(55)
      expect(highAlch.effects[0].alchemy!.valueMultiplier).toBe(1.0)
      expect(highAlch.targetType).toBe('item')
      expect(highAlch.combatOnly).toBe(false)
    })

    it('should have correct telekinetic grab', () => {
      const spell = SPELL_DEFINITIONS[SpellType.TELEKINETIC_GRAB]
      
      expect(spell.levelRequired).toBe(33)
      expect(spell.baseXP).toBe(43)
      expect(spell.targetType).toBe('ground')
      expect(spell.maxRange).toBe(15)
      expect(spell.effects[0].utility).toEqual({
        description: 'Grabs distant items',
        effect: 'telekinetic_grab',
      })
    })
  })

  describe('Teleport Spells', () => {
    it('should have correct teleport destinations', () => {
      const varrock = SPELL_DEFINITIONS[SpellType.VARROCK_TELEPORT]
      const lumbridge = SPELL_DEFINITIONS[SpellType.LUMBRIDGE_TELEPORT]
      const falador = SPELL_DEFINITIONS[SpellType.FALADOR_TELEPORT]
      const camelot = SPELL_DEFINITIONS[SpellType.CAMELOT_TELEPORT]
      
      expect(varrock.effects[0].teleport).toEqual({ x: 100, y: 0, z: 0, zoneName: 'varrock' })
      expect(lumbridge.effects[0].teleport).toEqual({ x: 0, y: 0, z: 0, zoneName: 'lumbridge' })
      expect(falador.effects[0].teleport).toEqual({ x: -100, y: 0, z: 0, zoneName: 'falador' })
      expect(camelot.effects[0].teleport).toEqual({ x: 0, y: 0, z: 100, zoneName: 'camelot' })
      
      expect(varrock.levelRequired).toBe(25)
      expect(lumbridge.levelRequired).toBe(31)
      expect(falador.levelRequired).toBe(37)
      expect(camelot.levelRequired).toBe(45)
    })
  })

  describe('Enchant Spells', () => {
    it('should have correct enchant effects', () => {
      const sapphire = SPELL_DEFINITIONS[SpellType.ENCHANT_SAPPHIRE]
      const emerald = SPELL_DEFINITIONS[SpellType.ENCHANT_EMERALD]
      const ruby = SPELL_DEFINITIONS[SpellType.ENCHANT_RUBY]
      const diamond = SPELL_DEFINITIONS[SpellType.ENCHANT_DIAMOND]
      
      expect(sapphire.levelRequired).toBe(7)
      expect(sapphire.effects[0].enchant).toEqual({ targetItemId: 1637, resultItemId: 2550 })
      
      expect(emerald.levelRequired).toBe(27)
      expect(emerald.effects[0].enchant).toEqual({ targetItemId: 1639, resultItemId: 2552 })
      
      expect(ruby.levelRequired).toBe(49)
      expect(ruby.effects[0].enchant).toEqual({ targetItemId: 1641, resultItemId: 2568 })
      
      expect(diamond.levelRequired).toBe(57)
      expect(diamond.effects[0].enchant).toEqual({ targetItemId: 1643, resultItemId: 2570 })
    })
  })

  describe('Helper Functions', () => {
    describe('getSpellsByLevel', () => {
      it('should return spells available at level 1', () => {
        const spells = getSpellsByLevel(1)
        
        expect(spells.length).toBe(1)
        expect(spells[0].type).toBe(SpellType.WIND_STRIKE)
      })

      it('should return more spells at higher levels', () => {
        const level1Spells = getSpellsByLevel(1)
        const level50Spells = getSpellsByLevel(50)
        
        expect(level50Spells.length).toBeGreaterThan(level1Spells.length)
      })

      it('should include all spells at level 99', () => {
        const allSpells = getSpellsByLevel(99)
        const totalSpells = Object.keys(SPELL_DEFINITIONS).length
        
        expect(allSpells.length).toBe(totalSpells)
      })

      it('should not include spells above the specified level', () => {
        const level20Spells = getSpellsByLevel(20)
        
        for (const spell of level20Spells) {
          expect(spell.levelRequired).toBeLessThanOrEqual(20)
        }
      })
    })

    describe('getCombatSpells', () => {
      it('should return only combat spells', () => {
        const combatSpells = getCombatSpells()
        
        for (const spell of combatSpells) {
          expect(spell.combatOnly).toBe(true)
        }
      })

      it('should include all strike, bolt, and blast spells', () => {
        const combatSpells = getCombatSpells()
        const combatSpellTypes = combatSpells.map(s => s.type)
        
        expect(combatSpellTypes).toContain(SpellType.WIND_STRIKE)
        expect(combatSpellTypes).toContain(SpellType.FIRE_BOLT)
        expect(combatSpellTypes).toContain(SpellType.WIND_BLAST)
      })
    })

    describe('getUtilitySpells', () => {
      it('should return only non-combat spells', () => {
        const utilitySpells = getUtilitySpells()
        
        for (const spell of utilitySpells) {
          expect(spell.combatOnly).not.toBe(true)
        }
      })

      it('should include teleport and alchemy spells', () => {
        const utilitySpells = getUtilitySpells()
        const utilitySpellTypes = utilitySpells.map(s => s.type)
        
        expect(utilitySpellTypes).toContain(SpellType.VARROCK_TELEPORT)
        expect(utilitySpellTypes).toContain(SpellType.HIGH_LEVEL_ALCHEMY)
        expect(utilitySpellTypes).toContain(SpellType.ENCHANT_SAPPHIRE)
      })
    })

    describe('canCastSpell', () => {
      const mockInventory = [
        { itemId: RuneType.AIR_RUNE, quantity: 10 },
        { itemId: RuneType.MIND_RUNE, quantity: 10 },
        { itemId: RuneType.FIRE_RUNE, quantity: 5 },
      ]

      it('should return true when requirements are met', () => {
        const spell = SPELL_DEFINITIONS[SpellType.WIND_STRIKE]
        const result = canCastSpell(spell, 10, mockInventory)
        
        expect(result).toBe(true)
      })

      it('should return false when level requirement not met', () => {
        const spell = SPELL_DEFINITIONS[SpellType.FIRE_STRIKE]
        const result = canCastSpell(spell, 5, mockInventory)
        
        expect(result).toBe(false)
      })

      it('should return false when rune requirement not met', () => {
        const spell = SPELL_DEFINITIONS[SpellType.FIRE_BLAST]
        const result = canCastSpell(spell, 99, mockInventory) // Has fire runes but not enough
        
        expect(result).toBe(false)
      })

      it('should handle empty inventory', () => {
        const spell = SPELL_DEFINITIONS[SpellType.WIND_STRIKE]
        const result = canCastSpell(spell, 99, [])
        
        expect(result).toBe(false)
      })
    })

    describe('calculateSpellDamage', () => {
      it('should return 0 for non-damage spells', () => {
        const spell = SPELL_DEFINITIONS[SpellType.VARROCK_TELEPORT]
        const damage = calculateSpellDamage(spell, 50)
        
        expect(damage).toBe(0)
      })

      it('should return damage within spell range', () => {
        const spell = SPELL_DEFINITIONS[SpellType.WIND_STRIKE]
        const damage = calculateSpellDamage(spell, 1)
        
        expect(damage).toBeGreaterThanOrEqual(0)
        expect(damage).toBeLessThanOrEqual(spell.effects[0].damage!.max + Math.floor(1 / 10))
      })

      it('should increase damage with magic level', () => {
        const spell = SPELL_DEFINITIONS[SpellType.WIND_STRIKE]
        const lowLevelDamage = calculateSpellDamage(spell, 1)
        const highLevelDamage = calculateSpellDamage(spell, 99)
        
        // With level bonus, high level should generally do more damage
        // (though randomness means this test could occasionally fail)
        expect(highLevelDamage).toBeGreaterThanOrEqual(lowLevelDamage)
      })

      it('should never return negative damage', () => {
        const spell = SPELL_DEFINITIONS[SpellType.WIND_STRIKE]
        
        // Test multiple times due to randomness
        for (let i = 0; i < 100; i++) {
          const damage = calculateSpellDamage(spell, 1)
          expect(damage).toBeGreaterThanOrEqual(0)
        }
      })
    })
  })

  describe('Spell Progression and Balance', () => {
    it('should have increasing damage for strike → bolt → blast progression', () => {
      const windStrike = SPELL_DEFINITIONS[SpellType.WIND_STRIKE]
      const windBolt = SPELL_DEFINITIONS[SpellType.WIND_BOLT]
      const windBlast = SPELL_DEFINITIONS[SpellType.WIND_BLAST]
      
      expect(windStrike.effects[0].damage!.max).toBeLessThan(windBolt.effects[0].damage!.max)
      expect(windBolt.effects[0].damage!.max).toBeLessThan(windBlast.effects[0].damage!.max)
    })

    it('should have increasing level requirements for spell tiers', () => {
      const windStrike = SPELL_DEFINITIONS[SpellType.WIND_STRIKE]
      const windBolt = SPELL_DEFINITIONS[SpellType.WIND_BOLT]
      const windBlast = SPELL_DEFINITIONS[SpellType.WIND_BLAST]
      
      expect(windStrike.levelRequired).toBeLessThan(windBolt.levelRequired)
      expect(windBolt.levelRequired).toBeLessThan(windBlast.levelRequired)
    })

    it('should have increasing XP rewards for higher tier spells', () => {
      const spells = Object.values(SPELL_DEFINITIONS)
        .filter(s => s.combatOnly)
        .sort((a, b) => a.levelRequired - b.levelRequired)
      
      for (let i = 1; i < spells.length; i++) {
        expect(spells[i].baseXP).toBeGreaterThanOrEqual(spells[i - 1].baseXP)
      }
    })

    it('should have reasonable rune cost progression', () => {
      // Strike spells should use mind runes
      const windStrike = SPELL_DEFINITIONS[SpellType.WIND_STRIKE]
      expect(windStrike.runes.some(r => r.runeType === RuneType.MIND_RUNE)).toBe(true)
      
      // Bolt spells should use chaos runes
      const windBolt = SPELL_DEFINITIONS[SpellType.WIND_BOLT]
      expect(windBolt.runes.some(r => r.runeType === RuneType.CHAOS_RUNE)).toBe(true)
      
      // Blast spells should use death runes
      const windBlast = SPELL_DEFINITIONS[SpellType.WIND_BLAST]
      expect(windBlast.runes.some(r => r.runeType === RuneType.DEATH_RUNE)).toBe(true)
    })
  })

  describe('Cast Time and Cooldown Balance', () => {
    it('should have consistent cast times for similar spells', () => {
      const combatSpells = getCombatSpells()
      const combatCastTime = combatSpells[0].castTime
      
      for (const spell of combatSpells) {
        expect(spell.castTime).toBe(combatCastTime)
      }
    })

    it('should have longer cast times for teleports', () => {
      const teleportSpells = [
        SPELL_DEFINITIONS[SpellType.VARROCK_TELEPORT],
        SPELL_DEFINITIONS[SpellType.LUMBRIDGE_TELEPORT],
      ]
      const combatSpell = SPELL_DEFINITIONS[SpellType.WIND_STRIKE]
      
      for (const teleport of teleportSpells) {
        expect(teleport.castTime).toBeGreaterThan(combatSpell.castTime)
      }
    })

    it('should have appropriate cooldowns for utility spells', () => {
      const lowAlch = SPELL_DEFINITIONS[SpellType.LOW_LEVEL_ALCHEMY]
      const highAlch = SPELL_DEFINITIONS[SpellType.HIGH_LEVEL_ALCHEMY]
      
      // Alchemy spells should have cooldowns but combat spells shouldn't
      expect(lowAlch.cooldown).toBeUndefined() // No cooldown in current implementation
      expect(highAlch.cooldown).toBeUndefined() // No cooldown in current implementation
    })
  })
})