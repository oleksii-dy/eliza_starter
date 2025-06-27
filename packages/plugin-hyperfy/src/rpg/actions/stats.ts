/**
 * RPG Stats Action
 * ================
 * Action for managing player stats, XP, and skill progression
 */

import {
  Action,
  type IAgentRuntime,
  type Memory,
  type State,
  type HandlerCallback,
  elizaLogger,
  ActionExample,
} from '@elizaos/core';
import { HyperfyService } from '../../service';
import { StatsSystem } from '../systems/StatsSystem';
import type { SkillType } from '../types/stats';

export const hyperfyStatsAction: Action = {
  name: 'HYPERFY_RPG_STATS',
  description: 'Manage player stats, grant XP, check levels, and handle skill progression',
  
  examples: [
    [
      {
        user: '{{user1}}',
        content: {
          text: 'Check my stats',
        },
      },
      {
        user: '{{agent}}',
        content: {
          text: "I'll check your current stats and skill levels.",
          action: 'HYPERFY_RPG_STATS',
          content: {
            action: 'check_stats',
          },
        },
      },
    ],
    [
      {
        user: '{{user1}}',
        content: {
          text: 'Grant me 100 attack XP',
        },
      },
      {
        user: '{{agent}}',
        content: {
          text: "I'll grant you 100 attack experience points.",
          action: 'HYPERFY_RPG_STATS',
          content: {
            action: 'grant_xp',
            skill: 'attack',
            amount: 100,
          },
        },
      },
    ],
    [
      {
        user: '{{user1}}',
        content: {
          text: 'What level do I need for a rune sword?',
        },
      },
      {
        user: '{{agent}}',
        content: {
          text: "Let me check the requirements for a rune sword.",
          action: 'HYPERFY_RPG_STATS',
          content: {
            action: 'check_requirements',
            item: 'rune_sword',
          },
        },
      },
    ],
  ] as ActionExample[][],

  validate: async (runtime: IAgentRuntime, message: Memory) => {
    const hyperfyService = runtime.getService<HyperfyService>(HyperfyService.serviceName);
    if (!hyperfyService?.isConnected()) {
      return false;
    }

    const text = message.content.text.toLowerCase();
    
    // Check for stats-related keywords
    const statsKeywords = [
      'stats', 'level', 'xp', 'experience', 'skill', 'combat level',
      'attack', 'strength', 'defence', 'hitpoints', 'ranged', 'prayer', 'magic',
      'mining', 'fishing', 'woodcutting', 'cooking', 'smithing', 'crafting',
      'grant', 'check', 'requirements', 'unlock'
    ];

    return statsKeywords.some(keyword => text.includes(keyword));
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State,
    _options: { [key: string]: unknown },
    callback?: HandlerCallback
  ) => {
    elizaLogger.info(`[HYPERFY_RPG_STATS] Processing stats action`);

    try {
      const hyperfyService = runtime.getService<HyperfyService>(HyperfyService.serviceName);
      if (!hyperfyService?.isConnected()) {
        throw new Error('Hyperfy service not connected');
      }

      const world = hyperfyService.getWorld();
      if (!world) {
        throw new Error('Hyperfy world not available');
      }

      // Get or create stats system
      let statsSystem = world.systems.find(s => s.name === 'StatsSystem') as StatsSystem;
      if (!statsSystem) {
        statsSystem = new StatsSystem(world);
        world.systems.push(statsSystem);
        await statsSystem.init();
      }

      const playerId = world.entities.player?.data?.id;
      if (!playerId) {
        throw new Error('Player not found in world');
      }

      // Parse the action from message content
      const content = message.content;
      const text = content.text.toLowerCase();

      let actionResult: any = {};

      // Determine action type
      if (text.includes('check') && text.includes('stats')) {
        actionResult = await handleCheckStats(statsSystem, playerId);
      } else if (text.includes('grant') && (text.includes('xp') || text.includes('experience'))) {
        actionResult = await handleGrantXP(statsSystem, playerId, text);
      } else if (text.includes('level') && text.includes('up')) {
        actionResult = await handleLevelUp(statsSystem, playerId, text);
      } else if (text.includes('combat level')) {
        actionResult = await handleCombatLevel(statsSystem, playerId);
      } else if (text.includes('requirements')) {
        actionResult = await handleCheckRequirements(statsSystem, playerId, text);
      } else {
        // Default to stats check
        actionResult = await handleCheckStats(statsSystem, playerId);
      }

      // Update state with stats information
      state.lastStatsAction = {
        action: actionResult.action,
        playerId,
        timestamp: Date.now(),
        result: actionResult,
      };

      if (callback) {
        callback({
          text: actionResult.message,
          action: 'HYPERFY_RPG_STATS',
          content: actionResult,
        });
      }

      return true;

    } catch (error) {
      elizaLogger.error('Error in HYPERFY_RPG_STATS action:', error);
      
      if (callback) {
        callback({
          text: `Failed to process stats action: ${error.message}`,
          action: 'HYPERFY_RPG_STATS',
          content: { error: error.message },
        });
      }

      return false;
    }
  },
};

/**
 * Handle checking player stats
 */
async function handleCheckStats(statsSystem: StatsSystem, playerId: string) {
  const stats = statsSystem.getPlayerStats(playerId);
  
  if (!stats) {
    // Create initial stats for new player
    const newStats = statsSystem.createInitialStats();
    statsSystem.setPlayerStats(playerId, newStats);
    
    return {
      action: 'check_stats',
      message: `New player stats initialized! Combat Level: ${newStats.combatLevel}, Total Level: ${newStats.totalLevel}`,
      stats: newStats,
    };
  }

  // Format stats display
  const combatStats = {
    combatLevel: stats.combatLevel,
    attack: stats.attack.level,
    strength: stats.strength.level,
    defence: stats.defence.level,
    hitpoints: `${stats.hitpoints.current}/${stats.hitpoints.max} (Level ${stats.hitpoints.level})`,
    ranged: stats.ranged.level,
    prayer: `${stats.prayer.points}/${stats.prayer.maxPoints} (Level ${stats.prayer.level})`,
    magic: stats.magic.level,
  };

  const productionStats = {
    cooking: stats.cooking.level,
    crafting: stats.crafting.level,
    fletching: stats.fletching.level,
    herblore: stats.herblore.level,
    runecrafting: stats.runecrafting.level,
    smithing: stats.smithing.level,
  };

  const gatheringStats = {
    mining: stats.mining.level,
    fishing: stats.fishing.level,
    woodcutting: stats.woodcutting.level,
  };

  const utilityStats = {
    agility: stats.agility.level,
    construction: stats.construction.level,
    firemaking: stats.firemaking.level,
    slayer: stats.slayer.level,
    thieving: stats.thieving.level,
    farming: stats.farming.level,
    hunter: stats.hunter.level,
  };

  return {
    action: 'check_stats',
    message: `📊 **Player Stats** 📊
Combat Level: **${stats.combatLevel}** | Total Level: **${stats.totalLevel}**

⚔️ **Combat Skills:**
Attack: ${combatStats.attack} | Strength: ${combatStats.strength} | Defence: ${combatStats.defence}
Hitpoints: ${combatStats.hitpoints}
Ranged: ${combatStats.ranged} | Prayer: ${combatStats.prayer} | Magic: ${combatStats.magic}

🔨 **Production Skills:**
Cooking: ${productionStats.cooking} | Crafting: ${productionStats.crafting} | Fletching: ${productionStats.fletching}
Herblore: ${productionStats.herblore} | Runecrafting: ${productionStats.runecrafting} | Smithing: ${productionStats.smithing}

⛏️ **Gathering Skills:**
Mining: ${gatheringStats.mining} | Fishing: ${gatheringStats.fishing} | Woodcutting: ${gatheringStats.woodcutting}

🏃 **Utility Skills:**
Agility: ${utilityStats.agility} | Construction: ${utilityStats.construction} | Firemaking: ${utilityStats.firemaking}
Slayer: ${utilityStats.slayer} | Thieving: ${utilityStats.thieving} | Farming: ${utilityStats.farming} | Hunter: ${utilityStats.hunter}`,
    combatStats,
    productionStats,
    gatheringStats,
    utilityStats,
    totalStats: stats,
  };
}

/**
 * Handle granting XP
 */
async function handleGrantXP(statsSystem: StatsSystem, playerId: string, text: string) {
  // Parse skill and amount from text
  const skillMatch = text.match(/(attack|strength|defence|hitpoints|ranged|prayer|magic|cooking|crafting|fletching|herblore|runecrafting|smithing|mining|fishing|woodcutting|agility|construction|firemaking|slayer|thieving|farming|hunter)/);
  const amountMatch = text.match(/(\d+)/);

  if (!skillMatch || !amountMatch) {
    return {
      action: 'grant_xp',
      message: 'Please specify a valid skill and amount. Example: "Grant me 100 attack XP"',
      error: 'Invalid skill or amount specified',
    };
  }

  const skill = skillMatch[1] as SkillType;
  const amount = parseInt(amountMatch[1]);

  if (amount <= 0 || amount > 10000000) {
    return {
      action: 'grant_xp',
      message: 'XP amount must be between 1 and 10,000,000',
      error: 'Invalid XP amount',
    };
  }

  const oldStats = statsSystem.getPlayerStats(playerId);
  if (!oldStats) {
    const newStats = statsSystem.createInitialStats();
    statsSystem.setPlayerStats(playerId, newStats);
  }

  const oldLevel = statsSystem.getSkillLevel(playerId, skill);
  
  // Grant the XP
  statsSystem.grantXP(playerId, skill, amount, 'admin_grant');
  
  const newLevel = statsSystem.getSkillLevel(playerId, skill);
  const newStats = statsSystem.getPlayerStats(playerId);

  let message = `✨ Granted ${amount.toLocaleString()} ${skill} XP!`;
  
  if (newLevel > oldLevel) {
    message += ` 🎉 Level up! ${skill}: ${oldLevel} → ${newLevel}`;
  }

  if (newStats) {
    message += `\n📊 ${skill}: Level ${newLevel} (${newStats[skill].xp.toLocaleString()} XP)`;
  }

  return {
    action: 'grant_xp',
    skill,
    amount,
    oldLevel,
    newLevel,
    leveledUp: newLevel > oldLevel,
    message,
  };
}

/**
 * Handle level up command
 */
async function handleLevelUp(statsSystem: StatsSystem, playerId: string, text: string) {
  const skillMatch = text.match(/(attack|strength|defence|hitpoints|ranged|prayer|magic|cooking|crafting|fletching|herblore|runecrafting|smithing|mining|fishing|woodcutting|agility|construction|firemaking|slayer|thieving|farming|hunter)/);
  
  if (!skillMatch) {
    return {
      action: 'level_up',
      message: 'Please specify a skill to level up. Example: "Level up my attack"',
      error: 'No skill specified',
    };
  }

  const skill = skillMatch[1] as SkillType;
  const currentLevel = statsSystem.getSkillLevel(playerId, skill);
  
  if (currentLevel >= 99) {
    return {
      action: 'level_up',
      message: `Your ${skill} is already at the maximum level (99)!`,
      skill,
      currentLevel,
    };
  }

  // Calculate XP needed for next level
  const nextLevel = currentLevel + 1;
  const requiredXP = statsSystem.getXPForLevel(nextLevel);
  const currentStats = statsSystem.getPlayerStats(playerId);
  const currentXP = currentStats?.[skill]?.xp || 0;
  const neededXP = requiredXP - currentXP;

  // Grant the needed XP
  statsSystem.grantXP(playerId, skill, neededXP, 'level_up_command');

  return {
    action: 'level_up',
    skill,
    oldLevel: currentLevel,
    newLevel: nextLevel,
    xpGranted: neededXP,
    message: `🎉 Level up! ${skill}: ${currentLevel} → ${nextLevel} (Granted ${neededXP.toLocaleString()} XP)`,
  };
}

/**
 * Handle combat level check
 */
async function handleCombatLevel(statsSystem: StatsSystem, playerId: string) {
  const stats = statsSystem.getPlayerStats(playerId);
  
  if (!stats) {
    return {
      action: 'combat_level',
      message: 'Player stats not found. Use "check stats" to initialize.',
      error: 'No stats found',
    };
  }

  const combatLevel = statsSystem.calculateCombatLevel(stats);
  
  return {
    action: 'combat_level',
    combatLevel,
    combatStats: {
      attack: stats.attack.level,
      strength: stats.strength.level,
      defence: stats.defence.level,
      hitpoints: stats.hitpoints.level,
      ranged: stats.ranged.level,
      prayer: stats.prayer.level,
      magic: stats.magic.level,
    },
    message: `⚔️ **Combat Level: ${combatLevel}**
Attack: ${stats.attack.level} | Strength: ${stats.strength.level} | Defence: ${stats.defence.level}
Hitpoints: ${stats.hitpoints.level} | Ranged: ${stats.ranged.level} | Prayer: ${stats.prayer.level} | Magic: ${stats.magic.level}`,
  };
}

/**
 * Handle requirements checking
 */
async function handleCheckRequirements(statsSystem: StatsSystem, playerId: string, text: string) {
  // This would be expanded with actual item/quest requirements database
  // For now, provide example requirements
  
  const exampleRequirements = {
    rune_sword: { attack: 40 },
    dragon_sword: { attack: 60 },
    barrows_gloves: { defence: 41, cooking: 70, crafting: 25 },
    fire_cape: { ranged: 75, prayer: 43 },
  };

  // Parse item from text (simplified)
  const item = Object.keys(exampleRequirements).find(key => 
    text.includes(key.replace('_', ' '))
  );

  if (!item) {
    return {
      action: 'check_requirements',
      message: 'Item not recognized. Try checking requirements for: rune sword, dragon sword, barrows gloves, fire cape',
      error: 'Item not found',
    };
  }

  const requirements = exampleRequirements[item as keyof typeof exampleRequirements];
  const meetsRequirements = statsSystem.meetsRequirements(playerId, requirements);
  
  const requirementText = Object.entries(requirements)
    .map(([skill, level]) => `${skill}: ${level}`)
    .join(', ');

  return {
    action: 'check_requirements',
    item,
    requirements,
    meetsRequirements,
    message: `📋 **${item.replace('_', ' ')} Requirements:**
${requirementText}

${meetsRequirements ? '✅ You meet all requirements!' : '❌ You do not meet all requirements yet.'}`,
  };
}