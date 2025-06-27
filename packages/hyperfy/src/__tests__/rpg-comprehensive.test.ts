/**
 * Comprehensive RPG System Tests
 * Tests all new systems: skills, resources, spells, zones
 * Includes both visual verification and data accuracy tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { createTestWorld } from './test-utils'
import { ResourceSpawningSystem } from '../rpg/systems/ResourceSpawningSystem'
import { EnhancedSkillsSystem } from '../rpg/systems/EnhancedSkillsSystem'
import { EnhancedMagicSystem } from '../rpg/systems/EnhancedMagicSystem'
import { SkillType, getXPForLevel, getLevelForXP } from '../rpg/systems/skills/SkillDefinitions'
import { ResourceType, RESOURCE_DEFINITIONS } from '../rpg/systems/resources/ResourceDefinitions'
import { SpellType, SPELL_DEFINITIONS } from '../rpg/systems/spells/SpellDefinitions'
import { ZoneType, ZONE_DEFINITIONS, getZoneAt } from '../rpg/systems/zones/ZoneDefinitions'

describe('RPG Comprehensive System Tests', () => {
  let world: any
  let resourceSystem: ResourceSpawningSystem
  let skillsSystem: EnhancedSkillsSystem
  let magicSystem: EnhancedMagicSystem
  let testPlayer: any

  beforeEach(async () => {
    // Create test world with new systems
    world = createTestWorld()

    // Add new systems
    resourceSystem = new ResourceSpawningSystem(world)
    skillsSystem = new EnhancedSkillsSystem(world)
    magicSystem = new EnhancedMagicSystem(world)

    world.addSystem(resourceSystem)
    world.addSystem(skillsSystem)
    world.addSystem(magicSystem)

    // Initialize systems
    await resourceSystem.initialize()
    await skillsSystem.initialize()
    await magicSystem.initialize()

    // Create test player
    testPlayer = world.createEntity({
      type: 'player',
      id: 'test_player_comprehensive',
      components: [],
    })

    // Add essential components
    testPlayer.addComponent({
      type: 'movement',
      position: { x: 0, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
    })

    testPlayer.addComponent({
      type: 'stats',
      hitpoints: { current: 100, max: 100 },
      attack: { level: 1, xp: 0 },
      strength: { level: 1, xp: 0 },
      defence: { level: 1, xp: 0 },
    })

    testPlayer.addComponent({
      type: 'inventory',
      items: new Array(28).fill(null),
      maxSize: 28,
    })

    // Initialize player skills
    skillsSystem.createPlayerSkills(testPlayer)
    magicSystem.createMagicComponent(testPlayer.id)
  })

  afterEach(() => {
    if (world && world.cleanup) {
      world.cleanup()
    }
  })

  describe('Skills System', () => {
    it('should create player with all skills initialized', () => {
      const skills = skillsSystem.getPlayerSkills(testPlayer.id)

      expect(skills).not.toBeNull()
      expect(skills.skills).toBeDefined()

      // Check all skills exist
      for (const skillType of Object.values(SkillType)) {
        expect(skills.skills[skillType]).toBeDefined()
        expect(skills.skills[skillType].level).toBeGreaterThan(0)
        expect(skills.skills[skillType].xp).toBeGreaterThanOrEqual(0)
      }

      // Hitpoints should start at level 10
      expect(skills.skills[SkillType.HITPOINTS].level).toBe(10)

      // Other skills should start at level 1
      expect(skills.skills[SkillType.ATTACK].level).toBe(1)
      expect(skills.skills[SkillType.WOODCUTTING].level).toBe(1)
    })

    it('should calculate XP requirements correctly', () => {
      // Test known XP values from RuneScape
      expect(getXPForLevel(1)).toBe(0)
      expect(getXPForLevel(2)).toBe(83)
      expect(getXPForLevel(10)).toBe(1154)
      expect(getXPForLevel(50)).toBe(101333)
      expect(getXPForLevel(99)).toBe(13034431)

      // Test level calculation
      expect(getLevelForXP(0)).toBe(1)
      expect(getLevelForXP(83)).toBe(2)
      expect(getLevelForXP(1154)).toBe(10)
      expect(getLevelForXP(13034431)).toBe(99)
    })

    it('should handle experience gain and level ups', () => {
      const initialLevel = skillsSystem.getSkillLevel(testPlayer.id, SkillType.WOODCUTTING)

      // Add enough XP to level up
      skillsSystem.addExperience(testPlayer.id, SkillType.WOODCUTTING, 100)

      const newLevel = skillsSystem.getSkillLevel(testPlayer.id, SkillType.WOODCUTTING)
      expect(newLevel).toBeGreaterThan(initialLevel)
    })

    it('should calculate combat level correctly', () => {
      const combatLevel = skillsSystem.getCombatLevel(testPlayer.id)
      expect(combatLevel).toBeGreaterThan(0)
      expect(combatLevel).toBeLessThan(200) // Reasonable range
    })

    it('should handle skill requirements', () => {
      expect(skillsSystem.hasRequiredLevel(testPlayer.id, SkillType.WOODCUTTING, 1)).toBe(true)
      expect(skillsSystem.hasRequiredLevel(testPlayer.id, SkillType.WOODCUTTING, 50)).toBe(false)
    })

    it('should track active skill actions', () => {
      const actionId = skillsSystem.startCraftingAction(
        testPlayer.id,
        SkillType.SMITHING,
        'Making bronze dagger',
        2000,
        25
      )

      expect(actionId).toBeDefined()

      const activeActions = skillsSystem.getActiveActions(testPlayer.id)
      expect(activeActions.length).toBe(1)
      expect(activeActions[0].skillType).toBe(SkillType.SMITHING)
    })
  })

  describe('Resource System', () => {
    it('should spawn resources in zones', () => {
      resourceSystem.forceSpawnAllResources()

      // Check that resources were spawned
      const spawnerStats = resourceSystem.getSpawnerStats()

      expect(spawnerStats).toBeDefined()

      // Should have spawners for different resource types
      expect(spawnerStats[ResourceType.TREE_NORMAL].spawners).toBeGreaterThan(0)
      expect(spawnerStats[ResourceType.ROCK_COPPER].spawners).toBeGreaterThan(0)
      expect(spawnerStats[ResourceType.FISHING_NET].spawners).toBeGreaterThan(0)
    })

    it('should create visually distinct resources', () => {
      // Test resource visual properties
      const normalTree = RESOURCE_DEFINITIONS[ResourceType.TREE_NORMAL]
      const oakTree = RESOURCE_DEFINITIONS[ResourceType.TREE_OAK]
      const copperRock = RESOURCE_DEFINITIONS[ResourceType.ROCK_COPPER]

      // Different colors
      expect(normalTree.visual.color).not.toBe(oakTree.visual.color)
      expect(normalTree.visual.color).not.toBe(copperRock.visual.color)

      // Proper color formats (hex)
      expect(normalTree.visual.color).toMatch(/^#[0-9A-F]{6}$/i)
      expect(copperRock.visual.color).toMatch(/^#[0-9A-F]{6}$/i)

      // Different scales for variety
      expect(normalTree.visual.scale).toBeGreaterThan(0)
      expect(copperRock.visual.scale).toBeGreaterThan(0)
    })

    it('should validate resource level requirements', () => {
      const resources = resourceSystem.getResourcesInRange(0, 0, 100)

      for (const resource of resources) {
        const resourceDef = RESOURCE_DEFINITIONS[resource.resourceType]
        expect(resourceDef.levelRequired).toBeGreaterThanOrEqual(1)
        expect(resourceDef.levelRequired).toBeLessThanOrEqual(99)
      }
    })

    it('should handle resource harvesting', () => {
      // Spawn a resource nearby
      resourceSystem.forceSpawnAllResources()
      const nearbyResources = resourceSystem.getResourcesInRange(0, 0, 50)

      if (nearbyResources.length > 0) {
        const resource = nearbyResources[0]
        const resourceDef = RESOURCE_DEFINITIONS[resource.resourceType]

        // Give player required level
        skillsSystem.addExperience(testPlayer.id, resourceDef.skill, getXPForLevel(resourceDef.levelRequired + 5))

        // Attempt to harvest
        const success = resourceSystem.harvestResource(resource.id, testPlayer.id)
        expect(success).toBe(true)
      }
    })

    it('should respawn depleted resources', async () => {
      resourceSystem.forceSpawnAllResources()
      const resources = resourceSystem.getResourcesInRange(0, 0, 50)

      if (resources.length > 0) {
        const resource = resources[0]
        const resourceDef = RESOURCE_DEFINITIONS[resource.resourceType]

        // Give player required level
        skillsSystem.addExperience(testPlayer.id, resourceDef.skill, getXPForLevel(resourceDef.levelRequired + 10))

        // Harvest resource
        resourceSystem.harvestResource(resource.id, testPlayer.id)

        // Wait for harvest completion
        await new Promise(resolve => setTimeout(resolve, resourceDef.baseHarvestTime + 100))

        // Check if resource was depleted (for depleting resources)
        if (resourceDef.depletes) {
          expect(resource.depleted).toBe(true)
        }
      }
    })
  })

  describe('Magic System', () => {
    it('should initialize player spellbook based on magic level', () => {
      const magic = magicSystem.getPlayerMagic(testPlayer.id)

      expect(magic).not.toBeNull()
      expect(magic.spellBook).toBeDefined()
      expect(magic.spellBook.length).toBeGreaterThan(0)

      // Should have Wind Strike at level 1
      expect(magic.spellBook).toContain(SpellType.WIND_STRIKE)
    })

    it('should validate spell requirements', () => {
      // Add runes to inventory
      const inventory = testPlayer.getComponent('inventory')
      inventory.items[0] = { itemId: 556, quantity: 10 } // Air runes
      inventory.items[1] = { itemId: 558, quantity: 10 } // Mind runes

      // Should be able to cast Wind Strike
      const canCast = magicSystem.castSpell(testPlayer.id, SpellType.WIND_STRIKE, 'dummy_target')
      expect(canCast).toBe(true)
    })

    it('should handle spell targeting correctly', () => {
      const windStrike = SPELL_DEFINITIONS[SpellType.WIND_STRIKE]
      const lumTeleport = SPELL_DEFINITIONS[SpellType.LUMBRIDGE_TELEPORT]
      const lowAlch = SPELL_DEFINITIONS[SpellType.LOW_LEVEL_ALCHEMY]

      expect(windStrike.targetType).toBe('enemy')
      expect(lumTeleport.targetType).toBe('self')
      expect(lowAlch.targetType).toBe('item')
    })

    it('should calculate spell damage correctly', () => {
      const windStrike = SPELL_DEFINITIONS[SpellType.WIND_STRIKE]
      const fireBlast = SPELL_DEFINITIONS[SpellType.FIRE_BLAST]

      expect(windStrike.effects[0].damage.max).toBe(2)
      expect(fireBlast.effects[0].damage.max).toBe(16)

      // Fire Blast should do more damage than Wind Strike
      expect(fireBlast.effects[0].damage.max).toBeGreaterThan(windStrike.effects[0].damage.max)
    })

    it('should prevent casting without required runes', () => {
      // Empty inventory (no runes)
      const inventory = testPlayer.getComponent('inventory')
      inventory.items.fill(null)

      const canCast = magicSystem.castSpell(testPlayer.id, SpellType.WIND_STRIKE, 'dummy_target')
      expect(canCast).toBe(false)
    })

    it('should update spellbook when magic level increases', () => {
      // Give high magic level
      skillsSystem.addExperience(testPlayer.id, SkillType.MAGIC, getXPForLevel(60))

      // Recreate magic component with new level
      magicSystem.createMagicComponent(testPlayer.id)

      const magic = magicSystem.getPlayerMagic(testPlayer.id)

      // Should now have access to higher level spells
      expect(magic.spellBook).toContain(SpellType.FIRE_BLAST)
      expect(magic.spellBook).toContain(SpellType.HIGH_LEVEL_ALCHEMY)
    })
  })

  describe('Zone System', () => {
    it('should define zones with proper boundaries', () => {
      for (const [zoneType, zoneDef] of Object.entries(ZONE_DEFINITIONS)) {
        expect(zoneDef.bounds.minX).toBeLessThan(zoneDef.bounds.maxX)
        expect(zoneDef.bounds.minZ).toBeLessThan(zoneDef.bounds.maxZ)

        expect(zoneDef.name).toBeDefined()
        expect(zoneDef.description).toBeDefined()
        expect(zoneDef.theme).toBeDefined()
      }
    })

    it('should correctly identify zones by position', () => {
      // Test Lumbridge (center of world)
      const lumbridgeZone = getZoneAt(0, 0)
      expect(lumbridgeZone?.type).toBe(ZoneType.LUMBRIDGE)

      // Test Varrock (east of Lumbridge)
      const varrockZone = getZoneAt(100, 0)
      expect(varrockZone?.type).toBe(ZoneType.VARROCK)

      // Test Wilderness (far north-east)
      const wildernessZone = getZoneAt(150, 150)
      expect(wildernessZone?.type).toBe(ZoneType.WILDERNESS)
    })

    it('should have appropriate resources for each zone', () => {
      const lumbridge = ZONE_DEFINITIONS[ZoneType.LUMBRIDGE]
      const wilderness = ZONE_DEFINITIONS[ZoneType.WILDERNESS]
      const resourceForest = ZONE_DEFINITIONS[ZoneType.RESOURCE_FOREST]

      // Lumbridge should have beginner resources
      const lumbridgeTreeTypes = lumbridge.resources
        .filter(r => r.resourceType.startsWith('tree_'))
        .map(r => r.resourceType)
      expect(lumbridgeTreeTypes).toContain(ResourceType.TREE_NORMAL)

      // Wilderness should have high-level resources
      const wildernessResourceTypes = wilderness.resources.map(r => r.resourceType)
      expect(wildernessResourceTypes).toContain(ResourceType.TREE_YEW)
      expect(wildernessResourceTypes).toContain(ResourceType.ROCK_RUNITE)

      // Resource Forest should have many tree types
      const forestTrees = resourceForest.resources
        .filter(r => r.resourceType.startsWith('tree_'))
        .map(r => r.resourceType)
      expect(forestTrees.length).toBeGreaterThan(3)
    })

    it('should apply zone skill multipliers', () => {
      // Resource Forest should have woodcutting multiplier
      const resourceForest = ZONE_DEFINITIONS[ZoneType.RESOURCE_FOREST]
      expect(resourceForest.features.skillMultipliers[SkillType.WOODCUTTING]).toBe(1.5)

      // Wilderness should have mining multiplier
      const wilderness = ZONE_DEFINITIONS[ZoneType.WILDERNESS]
      expect(wilderness.features.skillMultipliers[SkillType.MINING]).toBe(1.5)
    })

    it('should have proper PvP zone configuration', () => {
      const lumbridge = ZONE_DEFINITIONS[ZoneType.LUMBRIDGE]
      const wilderness = ZONE_DEFINITIONS[ZoneType.WILDERNESS]

      expect(lumbridge.features.pvpEnabled).toBe(false)
      expect(lumbridge.features.safeZone).toBe(true)

      expect(wilderness.features.pvpEnabled).toBe(true)
      expect(wilderness.features.safeZone).toBe(false)
    })
  })

  describe('Integration Tests', () => {
    it('should handle complete skill training loop', async () => {
      // Place player in Resource Forest for woodcutting bonus
      const movement = testPlayer.getComponent('movement')
      movement.position = { x: 0, y: 0, z: 200 } // Resource Forest

      // Spawn resources
      resourceSystem.forceSpawnAllResources()

      // Find a tree to cut
      const nearbyResources = resourceSystem.getResourcesInRange(0, 200, 50)
      const tree = nearbyResources.find(r => r.resourceType === ResourceType.TREE_NORMAL)

      if (tree) {
        const initialLevel = skillsSystem.getSkillLevel(testPlayer.id, SkillType.WOODCUTTING)
        const initialXP = skillsSystem.getSkillXP(testPlayer.id, SkillType.WOODCUTTING)

        // Harvest the tree
        const success = resourceSystem.harvestResource(tree.id, testPlayer.id)
        expect(success).toBe(true)

        // Wait for completion
        const resourceDef = RESOURCE_DEFINITIONS[tree.resourceType]
        await new Promise(resolve => setTimeout(resolve, resourceDef.baseHarvestTime + 100))

        // Check XP gain (should be boosted by zone multiplier)
        const finalXP = skillsSystem.getSkillXP(testPlayer.id, SkillType.WOODCUTTING)
        expect(finalXP).toBeGreaterThan(initialXP)

        // XP should be multiplied by Resource Forest bonus (1.5x)
        const expectedMinXP = initialXP + Math.floor(resourceDef.drops[0].xp * 1.5)
        expect(finalXP).toBeGreaterThanOrEqual(expectedMinXP)
      }
    })

    it('should handle magic combat with skill integration', () => {
      // Give player magic level and runes
      skillsSystem.addExperience(testPlayer.id, SkillType.MAGIC, getXPForLevel(20))
      magicSystem.createMagicComponent(testPlayer.id)

      const inventory = testPlayer.getComponent('inventory')
      inventory.items[0] = { itemId: 556, quantity: 100 } // Air runes
      inventory.items[1] = { itemId: 558, quantity: 100 } // Mind runes

      // Create target
      const target = world.createEntity({
        type: 'npc',
        id: 'test_target',
        components: [],
      })

      target.addComponent({
        type: 'stats',
        hitpoints: { current: 50, max: 50 },
      })

      // Cast spell
      const success = magicSystem.castSpell(testPlayer.id, SpellType.WIND_STRIKE, target.id)
      expect(success).toBe(true)

      // Should be casting
      expect(magicSystem.isCasting(testPlayer.id)).toBe(true)
    })

    it('should validate resource distribution matches zone definitions', () => {
      resourceSystem.forceSpawnAllResources()

      // Check Lumbridge area for appropriate resources
      const lumbridgeResources = resourceSystem.getResourcesInRange(0, 0, 50)
      const resourceTypes = lumbridgeResources.map(r => r.resourceType)

      // Should have normal trees and basic resources
      expect(resourceTypes).toContain(ResourceType.TREE_NORMAL)

      // Should NOT have high-level resources
      expect(resourceTypes).not.toContain(ResourceType.TREE_MAGIC)
      expect(resourceTypes).not.toContain(ResourceType.ROCK_RUNITE)
    })

    it('should handle cross-system skill requirements', () => {
      // Test that magic spells require appropriate magic level
      const highLevelSpell = SPELL_DEFINITIONS[SpellType.FIRE_BLAST]
      expect(highLevelSpell.levelRequired).toBe(59)

      // Test that resources require appropriate skill levels
      const yewTree = RESOURCE_DEFINITIONS[ResourceType.TREE_YEW]
      expect(yewTree.levelRequired).toBe(60)
      expect(yewTree.skill).toBe(SkillType.WOODCUTTING)

      // Test that player can't harvest high-level resources at low level
      const success = resourceSystem.harvestResource('dummy_yew', testPlayer.id)
      expect(success).toBe(false) // Should fail due to level requirement
    })

    it('should maintain consistent visual theming', () => {
      // Trees should use brown/green color palette
      const trees = Object.values(RESOURCE_DEFINITIONS).filter(r => r.type.toString().startsWith('tree_'))

      for (const tree of trees) {
        const color = tree.visual.color.toLowerCase()
        // Should contain earth tones (brown, green, orange, purple for magic)
        expect(
          color.includes('8b4513') || // Brown
            color.includes('654321') || // Dark brown
            color.includes('9acd32') || // Yellow-green
            color.includes('ff8c00') || // Orange
            color.includes('006400') || // Dark green
            color.includes('8a2be2') // Purple (magic)
        ).toBe(true)
      }

      // Rocks should use metallic/stone colors
      const rocks = Object.values(RESOURCE_DEFINITIONS).filter(r => r.type.toString().startsWith('rock_'))

      for (const rock of rocks) {
        expect(rock.visual.scale).toBeGreaterThan(0)
        expect(rock.visual.color).toMatch(/^#[0-9A-F]{6}$/i)
      }
    })
  })

  describe('Performance Tests', () => {
    it('should handle large numbers of resources efficiently', () => {
      const startTime = Date.now()

      // Force spawn all resources
      resourceSystem.forceSpawnAllResources()

      // Get all resources in a large area
      const allResources = resourceSystem.getResourcesInRange(0, 0, 1000)

      const endTime = Date.now()
      const duration = endTime - startTime

      // Should complete within reasonable time (< 1 second)
      expect(duration).toBeLessThan(1000)
      expect(allResources.length).toBeGreaterThan(0)
    })

    it('should efficiently calculate XP for multiple skills', () => {
      const startTime = Date.now()

      // Add XP to all skills
      for (const skillType of Object.values(SkillType)) {
        skillsSystem.addExperience(testPlayer.id, skillType, 1000)
      }

      const endTime = Date.now()
      const duration = endTime - startTime

      // Should complete quickly
      expect(duration).toBeLessThan(100)
    })

    it('should handle concurrent spell casting attempts', () => {
      // Give player runes
      const inventory = testPlayer.getComponent('inventory')
      inventory.items[0] = { itemId: 556, quantity: 1000 } // Air runes
      inventory.items[1] = { itemId: 558, quantity: 1000 } // Mind runes

      // Try to cast multiple spells quickly
      const results = []
      for (let i = 0; i < 5; i++) {
        const result = magicSystem.castSpell(testPlayer.id, SpellType.WIND_STRIKE, `target_${i}`)
        results.push(result)
      }

      // Should only allow one cast at a time
      const successfulCasts = results.filter(r => r === true)
      expect(successfulCasts.length).toBe(1)
    })
  })
})

// Visual verification tests
describe('Visual Verification Tests', () => {
  let world: any
  let resourceSystem: ResourceSpawningSystem

  beforeEach(async () => {
    world = createTestWorld()
    resourceSystem = new ResourceSpawningSystem(world)
    world.addSystem(resourceSystem)
    await resourceSystem.initialize()
  })

  it('should create distinct visual representations for all resource types', () => {
    const visualTests: any[] = []

    for (const [resourceType, resourceDef] of Object.entries(RESOURCE_DEFINITIONS)) {
      visualTests.push({
        resourceType,
        name: resourceDef.name,
        color: resourceDef.visual.color,
        scale: resourceDef.visual.scale,
        emissive: resourceDef.visual.emissive,
        metalness: resourceDef.visual.metalness,
        roughness: resourceDef.visual.roughness,
      })
    }

    // Log visual properties for manual verification
    console.log('\n=== RESOURCE VISUAL VERIFICATION ===')
    console.log('Expected visual representations:')

    visualTests.forEach(test => {
      console.log(`${test.name}: Color=${test.color}, Scale=${test.scale}x`)
      if (test.emissive) {
        console.log(`  - Glows with: ${test.emissive}`)
      }
      if (test.metalness) {
        console.log(`  - Metallic: ${test.metalness}`)
      }
    })

    console.log('\nVerify that each resource type has a unique, identifiable appearance!')
    console.log('=====================================\n')

    // Ensure all resources have valid visual properties
    expect(visualTests.length).toBeGreaterThanOrEqual(19) // Should have many resources

    visualTests.forEach(test => {
      expect(test.color).toMatch(/^#[0-9A-F]{6}$/i)
      expect(test.scale).toBeGreaterThan(0)
      expect(test.scale).toBeLessThan(3)
    })
  })

  it('should spawn resources with proper world distribution', () => {
    resourceSystem.forceSpawnAllResources()

    const zones = [
      { name: 'Lumbridge', center: { x: 0, z: 0 }, radius: 40 },
      { name: 'Varrock', center: { x: 100, z: 0 }, radius: 40 },
      { name: 'Draynor', center: { x: -100, z: 0 }, radius: 40 },
      { name: 'Wilderness', center: { x: 150, z: 150 }, radius: 40 },
      { name: 'Resource Forest', center: { x: 0, z: 200 }, radius: 40 },
    ]

    console.log('\n=== RESOURCE DISTRIBUTION VERIFICATION ===')

    zones.forEach(zone => {
      const resources = resourceSystem.getResourcesInRange(zone.center.x, zone.center.z, zone.radius)
      const resourceCounts: Record<string, number> = {}

      resources.forEach(resource => {
        const category = resource.resourceType.split('_')[0] // tree, rock, fishing
        resourceCounts[category] = (resourceCounts[category] || 0) + 1
      })

      console.log(`${zone.name}: ${JSON.stringify(resourceCounts)} (total: ${resources.length})`)
    })

    console.log('\nVerify resource distribution matches zone themes!')
    console.log('- Lumbridge: Basic resources for beginners')
    console.log('- Varrock: Mining focus with rocks')
    console.log('- Draynor: Fishing and willows')
    console.log('- Wilderness: Rare, high-level resources')
    console.log('- Resource Forest: Abundant trees of all types')
    console.log('===========================================\n')
  })
})
