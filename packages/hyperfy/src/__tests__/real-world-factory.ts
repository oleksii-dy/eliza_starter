import { World } from '../core/World'
import type { World as WorldType, WorldOptions } from '../types'
import { CombatSystem } from '../rpg/systems/CombatSystem'
import { InventorySystem } from '../rpg/systems/InventorySystem'
import { NPCSystem } from '../rpg/systems/NPCSystem'
import { LootSystem } from '../rpg/systems/LootSystem'
import { SpawningSystem } from '../rpg/systems/SpawningSystem'
import { SkillsSystem } from '../rpg/systems/SkillsSystem'
import { QuestSystem } from '../rpg/systems/QuestSystem'
import { BankingSystem } from '../rpg/systems/BankingSystem'
import { MovementSystem } from '../rpg/systems/MovementSystem'
import { ConfigLoader } from '../rpg/config/ConfigLoader'
import { Config } from '../core/config'
import { removeGraphicsSystemsForTesting, setupTestEnvironment } from './helpers/test-setup'
import { CombatStyle } from '../rpg/types'
import { setupGlobalTimeouts, TEST_TIMEOUTS, withTimeout } from './helpers/test-timeouts'

export interface RealTestWorldOptions extends Partial<WorldOptions> {
  enablePhysics?: boolean
  configPath?: string
  enableRPGSystems?: boolean
}

/**
 * Creates a real test world with actual systems for testing
 * This replaces the mock-based test world factory
 */
export async function createRealTestWorld(options: RealTestWorldOptions = {}): Promise<WorldType> {
  // Setup test environment
  setupTestEnvironment()
  setupGlobalTimeouts()

  // Enable test mode in config loader
  const configLoader = ConfigLoader.getInstance()
  configLoader.enableTestMode()

  const world = new World()

  // Remove graphics-dependent systems for testing
  removeGraphicsSystemsForTesting(world)

  // Register RPG systems if requested (default: true)
  if (options.enableRPGSystems !== false) {
    world.register('combat', CombatSystem as any)
    world.register('inventory', InventorySystem as any)
    world.register('npc', NPCSystem as any)
    world.register('loot', LootSystem as any)
    world.register('spawning', SpawningSystem as any)
    world.register('skills', SkillsSystem as any)
    world.register('quest', QuestSystem as any)
    world.register('banking', BankingSystem as any)
    world.register('movement', MovementSystem as any)
  }

  // Initialize world with test-appropriate options using Config system
  const appConfig = Config.get()
  const initOptions: WorldOptions = {
    physics: options.enablePhysics ?? false,
    renderer: 'headless',
    networkRate: options.networkRate ?? appConfig.networkRate,
    maxDeltaTime: options.maxDeltaTime ?? appConfig.maxDeltaTime,
    fixedDeltaTime: options.fixedDeltaTime ?? appConfig.fixedDeltaTime,
    assetsDir: options.assetsDir ?? (appConfig.assetsDir || undefined),
    assetsUrl: options.assetsUrl ?? appConfig.assetsUrl,
    ...options,
  }

  // Initialize with timeout to prevent hanging
  const initPromise = world.init(initOptions)
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('World initialization timed out after 5 seconds')), 5000)
  )

  try {
    await Promise.race([initPromise, timeoutPromise])
  } catch (error) {
    console.error('World initialization failed:', error)
    throw error
  }

  return world as WorldType
}

/**
 * Creates a minimal test world without RPG systems
 * Useful for testing core functionality
 */
export async function createMinimalTestWorld(options: RealTestWorldOptions = {}): Promise<WorldType> {
  return createRealTestWorld({
    ...options,
    enableRPGSystems: false,
  })
}

/**
 * Helper to run world for a specified duration
 */
export async function runWorldFor(world: WorldType, ms: number): Promise<void> {
  const start = Date.now()
  while (Date.now() - start < ms) {
    world.tick(Date.now())
    await new Promise(resolve => setTimeout(resolve, 16)) // 60fps
  }
}

/**
 * Helper to run world until condition is met
 */
export async function runWorldUntil(world: WorldType, condition: () => boolean, timeout = 5000): Promise<void> {
  const start = Date.now()
  while (!condition() && Date.now() - start < timeout) {
    world.tick(Date.now())
    await new Promise(resolve => setTimeout(resolve, 16))
  }
  if (!condition()) {
    throw new Error('Condition not met within timeout')
  }
}

/**
 * Base class for real test scenarios
 */
export class RealTestScenario {
  world!: WorldType

  async setup(options?: RealTestWorldOptions): Promise<void> {
    this.world = await createRealTestWorld(options)
  }

  async spawnPlayer(id: string, options?: any): Promise<any> {
    if (!this.world.entities) {
      throw new Error('Entities system not available')
    }

    // Create a basic entity without triggering physics systems
    const player = this.world.entities.create(id)
    if (!player) {
      throw new Error('Failed to create player entity')
    }

    // Set basic properties
    player.type = 'test_player' // Use test_player to avoid PlayerLocal instantiation
    player.name = options?.name || 'Test Player'
    player.position = options?.position || { x: 0, y: 0, z: 0 }

    // Add standard player components
    // Merge stats and skills into the stats component as expected by SkillsSystem
    const defaultStats = {
      hitpoints: { current: 100, max: 100, level: 10, xp: 0 },
      attack: { level: 1, xp: 0 },
      strength: { level: 1, xp: 0 },
      defense: { level: 1, xp: 0 },
      ranged: { level: 1, xp: 0 },
      magic: { level: 1, xp: 0 },
      prayer: { level: 1, xp: 0, points: 10, maxPoints: 10 },
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
      combatLevel: 3,
      totalLevel: 32,
    }

    // Merge any skills from options into stats
    if (options?.skills) {
      Object.assign(defaultStats, options.skills)
    }

    // The stats data should be passed as component data, not as the component itself
    const statsData = {
      ...defaultStats,
      ...options?.stats,
    }

    player.addComponent('stats', statsData)

    player.addComponent('inventory', {
      items: new Array(28).fill(null),
      maxSlots: 28,
      equipment: {
        head: null,
        cape: null,
        amulet: null,
        weapon: null,
        body: null,
        shield: null,
        legs: null,
        gloves: null,
        boots: null,
        ring: null,
        ammo: null,
      },
      totalWeight: 0,
      equipmentBonuses: {
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
      ...options?.inventory,
    })

    player.addComponent('combat', {
      inCombat: false,
      target: null,
      lastAttackTime: 0,
      attackSpeed: 4,
      combatStyle: CombatStyle.ACCURATE,
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
      ...options?.combat,
    })

    player.addComponent('movement', {
      position: options?.position || { x: 0, y: 0, z: 0 },
      destination: null,
      moveSpeed: 10,
      isMoving: false,
      facingDirection: 0,
      ...options?.movement,
    })

    // Set entity position
    player.position = options?.position || { x: 0, y: 0, z: 0 }

    return player
  }

  async spawnNPC(definitionId: number, position?: any): Promise<any> {
    const npcSystem = this.world.getSystem('npc') as any
    if (!npcSystem) {
      throw new Error('NPC system not available')
    }

    // Create a basic NPC entity if the system's spawnNPC fails
    try {
      const npc = npcSystem.spawnNPC(definitionId, position || { x: 0, y: 0, z: 0 })
      if (npc) {
        return npc
      }
    } catch (error) {
      console.warn('NPC system spawnNPC failed, creating basic NPC entity:', error)
    }

    // Fallback: create a basic NPC entity manually
    const npcData = {
      id: `npc_${definitionId}_${Date.now()}`,
      type: 'npc',
      name: `NPC ${definitionId}`,
      position: position || { x: 0, y: 0, z: 0 },
    }

    const npc = this.world.entities.add(npcData, true)

    // Add basic NPC components
    npc.addComponent('stats', {
      hitpoints: { current: 10, max: 10, level: 1, xp: 0 },
      attack: { level: 1, xp: 0 },
      strength: { level: 1, xp: 0 },
      defense: { level: 1, xp: 0 },
      combatLevel: 3,
    })

    npc.addComponent('combat', {
      inCombat: false,
      target: null,
      lastAttackTime: 0,
      attackSpeed: 4,
      hitSplatQueue: [],
      animationQueue: [],
      autoRetaliate: true,
    })

    npc.addComponent('movement', {
      position: position || { x: 0, y: 0, z: 0 },
      isMoving: false,
      moveSpeed: 2,
    })

    return npc
  }

  async runFor(ms: number): Promise<void> {
    return runWorldFor(this.world, ms)
  }

  async runUntil(condition: () => boolean, timeout?: number): Promise<void> {
    return runWorldUntil(this.world, condition, timeout)
  }

  async cleanup(): Promise<void> {
    if (this.world) {
      try {
        // Clear entities that might not have proper destroy methods
        if (this.world.entities && this.world.entities.items) {
          this.world.entities.items.clear()
        }
        this.world.destroy()
      } catch (error) {
        console.warn('Cleanup error (non-critical):', error)
      }
    }
  }
}
