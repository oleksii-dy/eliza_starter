/**
 * Hyperfy RPG Plugin
 *
 * A complete RPG system for Hyperfy with RuneScape-style mechanics
 */

// Export all types
export * from './types'

// Export systems
export { CombatSystem } from './systems/CombatSystem'
export { InventorySystem } from './systems/InventorySystem'
export { NPCSystem } from './systems/NPCSystem'
export { LootSystem } from './systems/LootSystem'
export { SkillsSystem } from './systems/SkillsSystem'
export { QuestSystem } from './systems/QuestSystem'
export { BankingSystem } from './systems/BankingSystem'
export { MovementSystem } from './systems/MovementSystem'
export { SpawningSystem } from './systems/SpawningSystem'
export { TradingSystem } from './systems/TradingSystem'
export { PrayerSystem } from './systems/PrayerSystem'
export { ShopSystem } from './systems/ShopSystem'
export { MagicSystem } from './systems/MagicSystem'
export { RangedSystem } from './systems/RangedSystem'
export { DeathRespawnSystem } from './systems/DeathRespawnSystem'
export { PvPSystem } from './systems/PvPSystem'
export { PlayerHomesSystem } from './systems/PlayerHomesSystem'
export { VisualRepresentationSystem } from './systems/VisualRepresentationSystem'
export { NavigationSystem } from './systems/NavigationSystem'
export { AgentPlayerSystem } from './systems/AgentPlayerSystem'
export { GrandExchangeSystem } from './systems/GrandExchangeSystem'
export { ClanSystem } from './systems/ClanSystem'
export { ConstructionSystem } from './systems/ConstructionSystem'
export { MinigameSystem } from './systems/MinigameSystem'

// Export enhanced systems
export { ResourceSpawningSystem } from './systems/ResourceSpawningSystem'
export { EnhancedSkillsSystem } from './systems/EnhancedSkillsSystem'
export { EnhancedMagicSystem } from './systems/EnhancedMagicSystem'

// Export combat systems
export { AdvancedCombatSystem } from './systems/combat/AdvancedCombatSystem'
export { CombatAnimationSystem } from './systems/combat/CombatAnimationSystem'

// Export production systems
export { SmithingSystem } from './systems/production/SmithingSystem'
export { CookingSystem } from './systems/production/CookingSystem'

// Export item systems
export { EquipmentSystem } from './systems/items/EquipmentSystem'

// Export quest system
export { QuestSystem as EnhancedQuestSystem } from './systems/quests/QuestSystem'

// Export quest definitions
export {
  QUEST_DEFINITIONS,
  QuestDifficulty,
  QuestStatus,
  ObjectiveType,
  getQuestDefinition,
  getQuestsByDifficulty,
  getQuestsByCategory,
  canPlayerStartQuest,
  getAllAvailableQuests,
} from './systems/quests/QuestDefinitions'
export type {
  QuestDefinition,
  QuestObjective,
  QuestRequirement,
  QuestReward,
  DialogueNode,
} from './systems/quests/QuestDefinitions'

// Export skill, resource, spell, zone, and combat definitions
export { SKILL_DEFINITIONS } from './systems/skills/SkillDefinitions'
export type { SkillDefinition } from './systems/skills/SkillDefinitions'
export { SkillType } from './systems/skills/SkillDefinitions'
export { CombatStyle, WeaponType, AttackStyle } from './systems/combat/CombatDefinitions'

// Export item definitions
export {
  ITEM_DEFINITIONS,
  ItemCategory,
  ItemRarity,
  EquipmentSlot,
  getItemDefinition,
  getItemsByCategory,
  getItemsByRarity,
  canPlayerEquipItem,
} from './systems/items/ItemDefinitions'
export type { ItemDefinition, ItemStats, ItemRequirement } from './systems/items/ItemDefinitions'

// Export testing and demo systems
export { VisualResourceTest } from './testing/VisualResourceTest'
export { RuneScapeDemo } from './RuneScapeDemo'

// Export entities
export { RPGEntity } from './entities/RPGEntity'

// Export examples
export { runCombatDemo } from './examples/combat-demo'
export { runVisualDemo } from './examples/visual-demo'

// Plugin definition with configurable system loading
export const HyperfyRPGPlugin = {
  name: 'hyperfy-rpg',
  version: '0.5.0',
  description: 'Modular RuneScape-style RPG mechanics for Hyperfy',

  // Core systems (always required for RPG functionality)
  coreSystems: [
    'combat',
    'inventory',
    'npc',
    'loot',
    'spawning',
    'skills',
    'movement',
    'visualRepresentation',
    'navigation',
    'agentPlayer',
    'resourceSpawning',
    'enhancedSkills',
    'enhancedMagic',
    'advancedCombat',
    'combatAnimation',
    'smithing',
    'cooking',
    'equipment',
    'enhancedQuest',
  ],

  // Optional systems (can be enabled/disabled)
  optionalSystems: [
    'quest',
    'banking',
    'trading',
    'prayer',
    'shop',
    'magic',
    'ranged',
    'deathRespawn',
    'pvp',
    'playerHomes',
    'grandExchange',
    'clan',
    'construction',
    'minigame',
    'visualResourceTest',
    'runeScapeDemo',
  ],

  // All available systems
  allSystems: [
    { name: 'combat', System: () => import('./systems/CombatSystem').then(m => m.CombatSystem) },
    { name: 'inventory', System: () => import('./systems/InventorySystem').then(m => m.InventorySystem) },
    { name: 'npc', System: () => import('./systems/NPCSystem').then(m => m.NPCSystem) },
    { name: 'loot', System: () => import('./systems/LootSystem').then(m => m.LootSystem) },
    { name: 'spawning', System: () => import('./systems/SpawningSystem').then(m => m.SpawningSystem) },
    { name: 'skills', System: () => import('./systems/SkillsSystem').then(m => m.SkillsSystem) },
    { name: 'quest', System: () => import('./systems/QuestSystem').then(m => m.QuestSystem) },
    { name: 'banking', System: () => import('./systems/BankingSystem').then(m => m.BankingSystem) },
    { name: 'movement', System: () => import('./systems/MovementSystem').then(m => m.MovementSystem) },
    { name: 'trading', System: () => import('./systems/TradingSystem').then(m => m.TradingSystem) },
    { name: 'prayer', System: () => import('./systems/PrayerSystem').then(m => m.PrayerSystem) },
    { name: 'shop', System: () => import('./systems/ShopSystem').then(m => m.ShopSystem) },
    { name: 'magic', System: () => import('./systems/MagicSystem').then(m => m.MagicSystem) },
    { name: 'ranged', System: () => import('./systems/RangedSystem').then(m => m.RangedSystem) },
    { name: 'deathRespawn', System: () => import('./systems/DeathRespawnSystem').then(m => m.DeathRespawnSystem) },
    { name: 'pvp', System: () => import('./systems/PvPSystem').then(m => m.PvPSystem) },
    { name: 'playerHomes', System: () => import('./systems/PlayerHomesSystem').then(m => m.PlayerHomesSystem) },
    {
      name: 'visualRepresentation',
      System: () => import('./systems/VisualRepresentationSystem').then(m => m.VisualRepresentationSystem),
    },
    { name: 'navigation', System: () => import('./systems/NavigationSystem').then(m => m.NavigationSystem) },
    { name: 'agentPlayer', System: () => import('./systems/AgentPlayerSystem').then(m => m.AgentPlayerSystem) },
    { name: 'grandExchange', System: () => import('./systems/GrandExchangeSystem').then(m => m.GrandExchangeSystem) },
    { name: 'clan', System: () => import('./systems/ClanSystem').then(m => m.ClanSystem) },
    { name: 'construction', System: () => import('./systems/ConstructionSystem').then(m => m.ConstructionSystem) },
    { name: 'minigame', System: () => import('./systems/MinigameSystem').then(m => m.MinigameSystem) },
    {
      name: 'advancedCombat',
      System: () => import('./systems/combat/AdvancedCombatSystem').then(m => m.AdvancedCombatSystem),
    },
    {
      name: 'combatAnimation',
      System: () => import('./systems/combat/CombatAnimationSystem').then(m => m.CombatAnimationSystem),
    },
    { name: 'smithing', System: () => import('./systems/production/SmithingSystem').then(m => m.SmithingSystem) },
    { name: 'cooking', System: () => import('./systems/production/CookingSystem').then(m => m.CookingSystem) },
    { name: 'equipment', System: () => import('./systems/items/EquipmentSystem').then(m => m.EquipmentSystem) },
    { name: 'enhancedQuest', System: () => import('./systems/quests/QuestSystem').then(m => m.QuestSystem) },
  ],

  // World content injection methods
  inject: {
    world: {
      // RPG-specific world methods
      spawnNPC(entity: any, id: string, position: any, options: any = {}) {
        const world = entity._world || entity.world
        const npcSystem = world.getSystem('npc')
        return npcSystem?.spawnNPC(id, position, options)
      },

      createQuest(entity: any, questDefinition: any) {
        const world = entity._world || entity.world
        const questSystem = world.getSystem('quest')
        return questSystem?.registerQuest(questDefinition)
      },

      createSpawnArea(entity: any, areaDefinition: any) {
        const world = entity._world || entity.world
        const spawningSystem = world.getSystem('spawning')
        return spawningSystem?.createSpawnArea(areaDefinition)
      },

      addRPGPlayer(entity: any, playerId: string, spawnPosition: any = null) {
        const world = entity._world || entity.world
        const movementSystem = world.getSystem('movement')
        const inventorySystem = world.getSystem('inventory')
        const skillsSystem = world.getSystem('skills')

        // Initialize RPG player state
        if (movementSystem) {
          movementSystem.initializePlayer(playerId, spawnPosition)
        }
        if (inventorySystem) {
          inventorySystem.createInventory(playerId)
        }
        if (skillsSystem) {
          skillsSystem.initializePlayerSkills(playerId)
        }

        console.log(`[RPG] Initialized player ${playerId} for RPG gameplay`)
      },
    },

    app: {
      // RPG-specific app methods
      makeInteractable(entity: any, options: any = {}) {
        const world = entity._world || entity.world
        const npcSystem = world.getSystem('npc')
        if (npcSystem && options.npcType) {
          return npcSystem.makeAppInteractableAsNPC(entity, options)
        }
      },

      addToInventory(entity: any, itemId: string, quantity: number = 1) {
        const world = entity._world || entity.world
        const inventorySystem = world.getSystem('inventory')
        const playerId = entity.player?.id || entity.playerId
        return inventorySystem?.addItem(playerId, itemId, quantity)
      },

      giveExperience(entity: any, skill: string, xp: number) {
        const world = entity._world || entity.world
        const skillsSystem = world.getSystem('skills')
        const playerId = entity.player?.id || entity.playerId
        return skillsSystem?.addExperience(playerId, skill, xp)
      },
    },
  },

  // Plugin initialization with configurable systems
  async init(world: any, config: { systems?: string[]; worldType?: string } = {}) {
    console.log('[HyperfyRPG] Initializing RPG plugin v0.5.0...')

    // Determine which systems to load
    let systemsToLoad: string[]

    if (config.systems && config.systems.length > 0) {
      // Use provided system list, but ensure core systems are included
      systemsToLoad = [...new Set([...this.coreSystems, ...config.systems])]
      console.log(`[HyperfyRPG] Loading custom system set: ${systemsToLoad.join(', ')}`)
    } else {
      // Load all systems by default
      systemsToLoad = [...this.coreSystems, ...this.optionalSystems]
      console.log('[HyperfyRPG] Loading all available systems')
    }

    // Register selected systems
    let loadedSystems = 0
    for (const systemName of systemsToLoad) {
      const systemDef = this.allSystems.find(s => s.name === systemName)
      if (systemDef) {
        try {
          const SystemClass = await systemDef.System()
          world.register(systemName, SystemClass)
          console.log(`[HyperfyRPG] ✓ Registered ${systemName} system`)
          loadedSystems++
        } catch (error) {
          console.error(`[HyperfyRPG] ✗ Failed to load ${systemName} system:`, error)
        }
      } else {
        console.warn(`[HyperfyRPG] ⚠ Unknown system: ${systemName}`)
      }
    }

    // Inject RPG methods into world and app contexts via Apps system
    const appsSystem = world.getSystem('apps')
    if (appsSystem && this.inject) {
      appsSystem.inject(this.inject)
      console.log('[HyperfyRPG] Injected RPG methods into Apps system')
    }

    console.log(`[HyperfyRPG] Plugin initialized with ${loadedSystems} systems!`)
    console.log(`[HyperfyRPG] World type: ${config.worldType || 'default'}`)

    return { loadedSystems, totalSystems: systemsToLoad.length }
  },

  // Helper to get available systems
  getAvailableSystems() {
    return {
      core: this.coreSystems,
      optional: this.optionalSystems,
      all: this.allSystems.map(s => s.name),
    }
  },
}

// Default export
export default HyperfyRPGPlugin
