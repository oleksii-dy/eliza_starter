/**
 * RPG Combat Action
 * =================
 * Action for handling combat interactions, attacks, and combat mechanics
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
import { CombatSystem } from '../systems/CombatSystem';
import { StatsSystem } from '../systems/StatsSystem';
import type { WeaponType, CombatStyle } from '../types/combat';

export const hyperfyCombatAction: Action = {
  name: 'HYPERFY_RPG_COMBAT',
  description: 'Handle combat actions including attacking, defending, and combat mechanics',
  
  examples: [
    [
      {
        user: '{{user1}}',
        content: {
          text: 'Attack the goblin',
        },
      },
      {
        user: '{{agent}}',
        content: {
          text: "I'll attack the goblin with my sword!",
          action: 'HYPERFY_RPG_COMBAT',
          content: {
            action: 'attack',
            target: 'goblin',
            weaponType: 'melee',
          },
        },
      },
    ],
    [
      {
        user: '{{user1}}',
        content: {
          text: 'Stop fighting',
        },
      },
      {
        user: '{{agent}}',
        content: {
          text: "I'll stop combat and back away.",
          action: 'HYPERFY_RPG_COMBAT',
          content: {
            action: 'stop_combat',
          },
        },
      },
    ],
    [
      {
        user: '{{user1}}',
        content: {
          text: 'Use special attack',
        },
      },
      {
        user: '{{agent}}',
        content: {
          text: "I'll use my weapon's special attack!",
          action: 'HYPERFY_RPG_COMBAT',
          content: {
            action: 'special_attack',
          },
        },
      },
    ],
    [
      {
        user: '{{user1}}',
        content: {
          text: 'Switch to defensive combat style',
        },
      },
      {
        user: '{{agent}}',
        content: {
          text: "I'll switch to defensive combat style.",
          action: 'HYPERFY_RPG_COMBAT',
          content: {
            action: 'set_combat_style',
            style: 'defensive',
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
    
    // Check for combat-related keywords
    const combatKeywords = [
      'attack', 'fight', 'combat', 'kill', 'defeat', 'battle',
      'special attack', 'defend', 'block', 'stop fighting',
      'hit', 'damage', 'weapon', 'sword', 'bow', 'staff',
      'melee', 'ranged', 'magic', 'cast', 'shoot', 'slash',
      'accurate', 'aggressive', 'defensive', 'controlled'
    ];

    return combatKeywords.some(keyword => text.includes(keyword));
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State,
    _options: { [key: string]: unknown },
    callback?: HandlerCallback
  ) => {
    elizaLogger.info(`[HYPERFY_RPG_COMBAT] Processing combat action`);

    try {
      const hyperfyService = runtime.getService<HyperfyService>(HyperfyService.serviceName);
      if (!hyperfyService?.isConnected()) {
        throw new Error('Hyperfy service not connected');
      }

      const world = hyperfyService.getWorld();
      if (!world) {
        throw new Error('Hyperfy world not available');
      }

      // Get or create combat system
      let combatSystem = world.systems.find(s => s.name === 'CombatSystem') as CombatSystem;
      if (!combatSystem) {
        combatSystem = new CombatSystem(world);
        world.systems.push(combatSystem);
        await combatSystem.init();
      }

      // Get or create stats system (needed for combat)
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

      // Ensure player has stats
      if (!statsSystem.getPlayerStats(playerId)) {
        const initialStats = statsSystem.createInitialStats();
        statsSystem.setPlayerStats(playerId, initialStats);
      }

      // Parse the action from message content
      const text = message.content.text.toLowerCase();
      let actionResult: any = {};

      // Determine combat action type
      if (text.includes('attack') || text.includes('fight') || text.includes('kill')) {
        actionResult = await handleAttack(combatSystem, playerId, text, world);
      } else if (text.includes('stop') && (text.includes('fight') || text.includes('combat'))) {
        actionResult = await handleStopCombat(combatSystem, playerId);
      } else if (text.includes('special') && text.includes('attack')) {
        actionResult = await handleSpecialAttack(combatSystem, playerId);
      } else if (text.includes('combat style') || text.includes('switch to')) {
        actionResult = await handleSetCombatStyle(combatSystem, playerId, text);
      } else if (text.includes('heal') || text.includes('eat')) {
        actionResult = await handleHeal(statsSystem, playerId, text);
      } else {
        // Default to status check
        actionResult = await handleCombatStatus(combatSystem, statsSystem, playerId);
      }

      // Update state with combat information
      state.lastCombatAction = {
        action: actionResult.action,
        playerId,
        timestamp: Date.now(),
        result: actionResult,
      };

      if (callback) {
        callback({
          text: actionResult.message,
          action: 'HYPERFY_RPG_COMBAT',
          content: actionResult,
        });
      }

      return true;

    } catch (error) {
      elizaLogger.error('Error in HYPERFY_RPG_COMBAT action:', error);
      
      if (callback) {
        callback({
          text: `Failed to process combat action: ${error.message}`,
          action: 'HYPERFY_RPG_COMBAT',
          content: { error: error.message },
        });
      }

      return false;
    }
  },
};

/**
 * Handle attack command
 */
async function handleAttack(combatSystem: CombatSystem, playerId: string, text: string, world: any) {
  // Parse target from text
  const targetPatterns = [
    /attack (?:the )?(\w+)/,
    /fight (?:the )?(\w+)/,
    /kill (?:the )?(\w+)/,
  ];

  let targetName = null;
  for (const pattern of targetPatterns) {
    const match = text.match(pattern);
    if (match) {
      targetName = match[1];
      break;
    }
  }

  if (!targetName) {
    return {
      action: 'attack',
      message: 'Please specify a target to attack. Example: "Attack the goblin"',
      error: 'No target specified',
    };
  }

  // Find target entity (simplified - in full version would search nearby entities)
  const targetId = `npc_${targetName}`;
  
  // Determine weapon type from text
  let weaponType: WeaponType = 'melee';
  if (text.includes('bow') || text.includes('shoot') || text.includes('arrow')) {
    weaponType = 'ranged';
  } else if (text.includes('cast') || text.includes('spell') || text.includes('magic')) {
    weaponType = 'magic';
  }

  // Initiate combat
  const success = combatSystem.attack(playerId, targetId, weaponType);

  if (success) {
    return {
      action: 'attack',
      targetName,
      weaponType,
      message: `⚔️ Attacking ${targetName} with ${weaponType} combat!`,
      success: true,
    };
  } else {
    return {
      action: 'attack',
      targetName,
      message: `❌ Cannot attack ${targetName} - target not found or invalid`,
      success: false,
    };
  }
}

/**
 * Handle stop combat command
 */
async function handleStopCombat(combatSystem: CombatSystem, playerId: string) {
  // Emit stop combat event
  combatSystem.world.events.emit('rpg:stop_combat', { entityId: playerId });

  return {
    action: 'stop_combat',
    message: '🛡️ Stopped combat and backed away.',
    success: true,
  };
}

/**
 * Handle special attack command
 */
async function handleSpecialAttack(combatSystem: CombatSystem, playerId: string) {
  // Emit special attack event
  combatSystem.world.events.emit('rpg:special_attack', { entityId: playerId });

  return {
    action: 'special_attack',
    message: '⚡ Activating special attack!',
    success: true,
  };
}

/**
 * Handle combat style change
 */
async function handleSetCombatStyle(combatSystem: CombatSystem, playerId: string, text: string) {
  const stylePatterns = {
    accurate: /accurate/,
    aggressive: /aggressive/,
    defensive: /defensive/,
    controlled: /controlled/,
    rapid: /rapid/,
    longrange: /long.?range/,
  };

  let combatStyle: CombatStyle = 'accurate';
  for (const [style, pattern] of Object.entries(stylePatterns)) {
    if (pattern.test(text)) {
      combatStyle = style as CombatStyle;
      break;
    }
  }

  // TODO: Update combat component with new style
  // For now, just acknowledge the change

  return {
    action: 'set_combat_style',
    style: combatStyle,
    message: `🎯 Combat style changed to ${combatStyle}.`,
    success: true,
  };
}

/**
 * Handle healing command
 */
async function handleHeal(statsSystem: StatsSystem, playerId: string, text: string) {
  const stats = statsSystem.getPlayerStats(playerId);
  if (!stats) {
    return {
      action: 'heal',
      message: 'Player stats not found.',
      error: 'No stats',
    };
  }

  // Simple healing logic (can be enhanced with food items)
  const healAmount = Math.min(10, stats.hitpoints.max - stats.hitpoints.current);
  
  if (healAmount <= 0) {
    return {
      action: 'heal',
      message: `❤️ Already at full health (${stats.hitpoints.current}/${stats.hitpoints.max})`,
      healAmount: 0,
    };
  }

  stats.hitpoints.current += healAmount;
  statsSystem.setPlayerStats(playerId, stats);

  return {
    action: 'heal',
    healAmount,
    currentHp: stats.hitpoints.current,
    maxHp: stats.hitpoints.max,
    message: `❤️ Healed for ${healAmount} HP! Current: ${stats.hitpoints.current}/${stats.hitpoints.max}`,
    success: true,
  };
}

/**
 * Handle combat status check
 */
async function handleCombatStatus(combatSystem: CombatSystem, statsSystem: StatsSystem, playerId: string) {
  const stats = statsSystem.getPlayerStats(playerId);
  if (!stats) {
    return {
      action: 'status',
      message: 'Player stats not found.',
      error: 'No stats',
    };
  }

  const combatLevel = statsSystem.calculateCombatLevel(stats);
  
  return {
    action: 'status',
    combatLevel,
    hitpoints: `${stats.hitpoints.current}/${stats.hitpoints.max}`,
    combatStats: {
      attack: stats.attack.level,
      strength: stats.strength.level,
      defence: stats.defence.level,
      ranged: stats.ranged.level,
      magic: stats.magic.level,
    },
    message: `⚔️ **Combat Status** ⚔️
Combat Level: **${combatLevel}**
Hitpoints: **${stats.hitpoints.current}/${stats.hitpoints.max}**

Combat Skills:
Attack: ${stats.attack.level} | Strength: ${stats.strength.level} | Defence: ${stats.defence.level}
Ranged: ${stats.ranged.level} | Magic: ${stats.magic.level}`,
    success: true,
  };
}