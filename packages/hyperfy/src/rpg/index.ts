/**
 * Hyperfy RPG Plugin
 *
 * A complete RPG system for Hyperfy with RuneScape-style mechanics
 */

// Export all types
export * from './types';

// Export systems
export { CombatSystem } from './systems/CombatSystem';
export { InventorySystem } from './systems/InventorySystem';
export { NPCSystem } from './systems/NPCSystem';
export { LootSystem } from './systems/LootSystem';
export { SkillsSystem } from './systems/SkillsSystem';
export { QuestSystem } from './systems/QuestSystem';
export { BankingSystem } from './systems/BankingSystem';
export { MovementSystem } from './systems/MovementSystem';
export { SpawningSystem } from './systems/SpawningSystem';
export { TradingSystem } from './systems/TradingSystem';
export { PrayerSystem } from './systems/PrayerSystem';
export { ShopSystem } from './systems/ShopSystem';
export { MagicSystem } from './systems/MagicSystem';
export { RangedSystem } from './systems/RangedSystem';
export { DeathRespawnSystem } from './systems/DeathRespawnSystem';
export { PvPSystem } from './systems/PvPSystem';
export { PlayerHomesSystem } from './systems/PlayerHomesSystem';
export { VisualRepresentationSystem } from './systems/VisualRepresentationSystem';

// Export entities
export { RPGEntity } from './entities/RPGEntity';

// Export examples
export { runCombatDemo } from './examples/combat-demo';
export { runVisualDemo } from './examples/visual-demo';

// Plugin definition
export const HyperfyRPGPlugin = {
  name: 'hyperfy-rpg',
  version: '0.3.0',
  description: 'RuneScape-style RPG mechanics for Hyperfy with death/respawn, PvP, and player homes',

  systems: [
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
    { name: 'visualRepresentation', System: () => import('./systems/VisualRepresentationSystem').then(m => m.VisualRepresentationSystem) },
  ],

  // Plugin initialization
  async init(world: any) {
    console.log('[HyperfyRPG] Initializing RPG plugin...');

    // Register all systems
    for (const systemDef of this.systems) {
      const SystemClass = await systemDef.System();
      world.register(systemDef.name, SystemClass);
      console.log(`[HyperfyRPG] Registered ${systemDef.name} system`);
    }

    console.log('[HyperfyRPG] RPG plugin initialized successfully!');
  }
};

// Default export
export default HyperfyRPGPlugin;
