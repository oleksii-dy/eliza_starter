/**
 * Thieving Actions for Agent Interaction
 * =====================================
 * Natural language interface for AI agents to interact with the thieving system
 */

import { ActionExample, IAgentRuntime, Memory, State, type Action } from '@elizaos/core';

export const hyperfyThievingAction: Action = {
  name: 'HYPERFY_THIEVING',
  similes: [
    'THIEVING',
    'PICKPOCKET',
    'STEAL',
    'LOCKPICK',
    'STALL',
    'THEFT',
    'SNEAK',
    'ROGUE',
    'THIEVING_ACTION'
  ],
  description: 'Pickpocket NPCs, steal from stalls, and lockpick chests/doors in the RuneScape world',
  
  validate: async (runtime: IAgentRuntime, message: Memory) => {
    const text = message.content.text?.toLowerCase() || '';
    
    // Check for thieving-related keywords
    const thievingKeywords = [
      'thieving', 'pickpocket', 'steal', 'lockpick', 'stall', 'theft', 'sneak',
      'rogue', 'pick pocket', 'pick lock', 'chest', 'door', 'vendor', 'shop',
      'man', 'woman', 'farmer', 'warrior', 'guard', 'knight', 'paladin', 'hero',
      'vegetable stall', 'baker', 'tea stall', 'silk stall', 'wine stall',
      'seed stall', 'fur stall', 'fish stall', 'gem stall'
    ];
    
    const hasKeyword = thievingKeywords.some(keyword => text.includes(keyword));
    
    if (!hasKeyword) {
      return false;
    }

    // Additional validation: check if player has thieving capability
    try {
      const hyperfyService = runtime.getService('hyperfy');
      if (!hyperfyService) {
        return false;
      }

      const world = (hyperfyService as any).getWorld();
      const playerId = runtime.character?.name || 'agent';
      const thievingSystem = world.systems?.find((s: any) => s.name === 'ThievingSystem');
      
      if (!thievingSystem) {
        return false;
      }

      return true; // Allow for general thieving queries
    } catch (error) {
      return false;
    }
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State,
    options: any,
    callback: any
  ) => {
    const text = message.content.text?.toLowerCase() || '';
    
    try {
      // Parse thieving command
      const thievingCommand = parseThievingCommand(text);
      
      if (!thievingCommand) {
        callback({
          text: "I don't understand that thieving command. Try 'pickpocket guard' or 'steal from silk stall'.",
          action: 'THIEVING_HELP'
        });
        return;
      }

      // Get world service to emit thieving events
      const hyperfyService = runtime.getService('hyperfy');
      if (!hyperfyService) {
        callback({
          text: "Hyperfy service not available for thieving actions.",
          action: 'SERVICE_ERROR'
        });
        return;
      }

      const world = (hyperfyService as any).getWorld();
      const playerId = runtime.character?.name || 'agent';
      const thievingSystem = world.systems?.find((s: any) => s.name === 'ThievingSystem');

      if (!thievingSystem) {
        callback({
          text: "Thieving system not available.",
          action: 'SYSTEM_ERROR'
        });
        return;
      }

      let responseText = '';
      let actionType = '';

      switch (thievingCommand.action) {
        case 'pickpocket':
          if (thievingCommand.targetId) {
            // Validate pickpocket capability
            const validation = thievingSystem.canPickpocket(playerId, thievingCommand.targetId);
            
            if (!validation.canPickpocket) {
              callback({
                text: `I can't pickpocket ${thievingCommand.targetId.replace(/_/g, ' ')}: ${validation.reason}`,
                action: 'THIEVING_INVALID'
              });
              return;
            }

            world.events.emit('rpg:start_pickpocket', {
              playerId,
              targetId: thievingCommand.targetId
            });
            
            responseText = `I'll try to pickpocket the ${thievingCommand.targetId.replace(/_/g, ' ')}. I need to be quick and stealthy!`;
            actionType = 'START_PICKPOCKET';
          } else {
            responseText = "Who should I pickpocket? Try specifying like 'pickpocket guard' or 'pickpocket farmer'.";
            actionType = 'THIEVING_CLARIFY';
          }
          break;

        case 'steal_stall':
          if (thievingCommand.targetId) {
            // Validate stall theft capability
            const validation = thievingSystem.canStealStall(playerId, thievingCommand.targetId);
            
            if (!validation.canSteal) {
              callback({
                text: `I can't steal from ${thievingCommand.targetId.replace(/_/g, ' ')}: ${validation.reason}`,
                action: 'THIEVING_INVALID'
              });
              return;
            }

            world.events.emit('rpg:start_steal_stall', {
              playerId,
              stallId: thievingCommand.targetId
            });
            
            responseText = `I'll steal from the ${thievingCommand.targetId.replace(/_/g, ' ')}. Hope the owner doesn't notice!`;
            actionType = 'START_STALL_THEFT';
          } else {
            responseText = "Which stall should I steal from? Try 'steal from silk stall' or 'steal from baker stall'.";
            actionType = 'THIEVING_CLARIFY';
          }
          break;

        case 'lockpick':
          if (thievingCommand.targetId) {
            // Validate lockpick capability
            const validation = thievingSystem.canLockpick(playerId, thievingCommand.targetId);
            
            if (!validation.canLockpick) {
              callback({
                text: `I can't lockpick ${thievingCommand.targetId.replace(/_/g, ' ')}: ${validation.reason}`,
                action: 'THIEVING_INVALID'
              });
              return;
            }

            world.events.emit('rpg:start_lockpick', {
              playerId,
              targetId: thievingCommand.targetId
            });
            
            responseText = `I'll try to lockpick the ${thievingCommand.targetId.replace(/_/g, ' ')}. This requires careful manipulation!`;
            actionType = 'START_LOCKPICK';
          } else {
            responseText = "What should I lockpick? Try 'lockpick chest' or 'lockpick door'.";
            actionType = 'THIEVING_CLARIFY';
          }
          break;

        case 'stop':
          if (thievingSystem.isPlayerThieving(playerId)) {
            world.events.emit('rpg:stop_thieving', { playerId });
            responseText = "I'll stop my thieving activities and act innocently.";
          } else {
            responseText = "I'm not currently thieving anything.";
          }
          actionType = 'STOP_THIEVING';
          break;

        case 'check':
          responseText = generateThievingStatus(world, playerId);
          actionType = 'CHECK_THIEVING';
          break;

        default:
          responseText = "I'm not sure what thieving action you want me to perform.";
          actionType = 'THIEVING_UNKNOWN';
      }

      // Emit RPG event for thieving action
      world.events.emit('rpg:agent_action', {
        playerId,
        action: 'thieving',
        details: thievingCommand,
        timestamp: Date.now()
      });

      callback({
        text: responseText,
        action: actionType,
        metadata: {
          skill: 'thieving',
          command: thievingCommand,
          timestamp: Date.now()
        }
      });

    } catch (error) {
      console.error('Error in thieving action:', error);
      callback({
        text: "Something went wrong while trying to do thieving. Let me try again.",
        action: 'THIEVING_ERROR'
      });
    }
  },

  examples: [
    [
      {
        user: "{{user1}}",
        content: {
          text: "Pickpocket guard"
        }
      } as ActionExample,
      {
        user: "{{user2}}",
        content: {
          text: "I'll try to pickpocket the guard. I need to be quick and stealthy!"
        }
      } as ActionExample
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Steal from silk stall"
        }
      } as ActionExample,
      {
        user: "{{user2}}",
        content: {
          text: "I'll steal from the silk stall. Hope the owner doesn't notice!"
        }
      } as ActionExample
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Lockpick chest"
        }
      } as ActionExample,
      {
        user: "{{user2}}",
        content: {
          text: "I'll try to lockpick the chest. This requires careful manipulation!"
        }
      } as ActionExample
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Pickpocket farmer"
        }
      } as ActionExample,
      {
        user: "{{user2}}",
        content: {
          text: "I'll try to pickpocket the farmer. I need to be quick and stealthy!"
        }
      } as ActionExample
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Steal from baker stall"
        }
      } as ActionExample,
      {
        user: "{{user2}}",
        content: {
          text: "I'll steal from the baker stall. Hope the owner doesn't notice!"
        }
      } as ActionExample
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Stop thieving"
        }
      } as ActionExample,
      {
        user: "{{user2}}",
        content: {
          text: "I'll stop my thieving activities and act innocently."
        }
      } as ActionExample
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Check thieving progress"
        }
      } as ActionExample,
      {
        user: "{{user2}}",
        content: {
          text: "Let me check my thieving level and current criminal activities."
        }
      } as ActionExample
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Steal from gem stall"
        }
      } as ActionExample,
      {
        user: "{{user2}}",
        content: {
          text: "I'll steal from the gem stall. Hope the owner doesn't notice!"
        }
      } as ActionExample
    ]
  ] as ActionExample[][]
};

interface ThievingCommand {
  action: 'pickpocket' | 'steal_stall' | 'lockpick' | 'stop' | 'check';
  targetId?: string;
}

function parseThievingCommand(text: string): ThievingCommand | null {
  text = text.toLowerCase().trim();

  // Stop thieving patterns
  if (text.includes('stop thieving') || text.includes('quit thieving') || text.includes('stop stealing')) {
    return { action: 'stop' };
  }

  // Check thieving patterns
  if (text.includes('check thieving') || text.includes('thieving level') || 
      text.includes('thieving progress') || text.includes('thieving status')) {
    return { action: 'check' };
  }

  // Pickpocket patterns
  if (text.includes('pickpocket') || text.includes('pick pocket')) {
    const targetId = extractPickpocketTargetId(text);
    return { action: 'pickpocket', targetId };
  }

  // Steal from stall patterns
  if ((text.includes('steal') && text.includes('stall')) || 
      (text.includes('steal') && text.includes('from'))) {
    const targetId = extractStallId(text);
    return { action: 'steal_stall', targetId };
  }

  // Lockpick patterns
  if (text.includes('lockpick') || text.includes('pick lock') || text.includes('unlock')) {
    const targetId = extractLockpickTargetId(text);
    return { action: 'lockpick', targetId };
  }

  return null;
}

function extractPickpocketTargetId(text: string): string | undefined {
  // Map pickpocket target names to IDs
  const targetMap: Record<string, string> = {
    'man': 'man',
    'woman': 'woman',
    'farmer': 'farmer',
    'warrior': 'warrior',
    'guard': 'guard',
    'knight': 'knight',
    'paladin': 'paladin',
    'hero': 'hero',
  };

  for (const [targetName, targetId] of Object.entries(targetMap)) {
    if (text.includes(targetName)) {
      return targetId;
    }
  }

  return undefined;
}

function extractStallId(text: string): string | undefined {
  // Map stall names to IDs
  const stallMap: Record<string, string> = {
    'vegetable stall': 'vegetable_stall',
    'vegetable': 'vegetable_stall',
    'baker stall': 'baker_stall',
    'baker': 'baker_stall',
    'bakers stall': 'baker_stall',
    'tea stall': 'tea_stall',
    'tea': 'tea_stall',
    'silk stall': 'silk_stall',
    'silk': 'silk_stall',
    'wine stall': 'wine_stall',
    'wine': 'wine_stall',
    'seed stall': 'seed_stall',
    'seed': 'seed_stall',
    'fur stall': 'fur_stall',
    'fur': 'fur_stall',
    'fish stall': 'fish_stall',
    'fish': 'fish_stall',
    'gem stall': 'gem_stall',
    'gem': 'gem_stall',
  };

  for (const [stallName, stallId] of Object.entries(stallMap)) {
    if (text.includes(stallName)) {
      return stallId;
    }
  }

  return undefined;
}

function extractLockpickTargetId(text: string): string | undefined {
  // Map lockpick target names to IDs
  const targetMap: Record<string, string> = {
    'chest lumbridge': 'chest_lumbridge',
    'chest': 'chest_lumbridge', // Default to Lumbridge chest
    'lumbridge chest': 'chest_lumbridge',
    'chaos druid door': 'door_chaos_druid',
    'druid door': 'door_chaos_druid',
    'chaos door': 'door_chaos_druid',
    'ardougne chest': 'chest_ardougne',
    'yanille door': 'door_yanille_dungeon',
    'yanille dungeon door': 'door_yanille_dungeon',
    'dungeon door': 'door_yanille_dungeon',
    'rogues den chest': 'chest_rogues_den',
    'rogues chest': 'chest_rogues_den',
    'rogue chest': 'chest_rogues_den',
  };

  for (const [targetName, targetId] of Object.entries(targetMap)) {
    if (text.includes(targetName)) {
      return targetId;
    }
  }

  // Default based on context
  if (text.includes('door')) {
    return 'door_chaos_druid'; // Most common door
  }
  if (text.includes('chest')) {
    return 'chest_lumbridge'; // Starting chest
  }

  return undefined;
}

function generateThievingStatus(world: any, playerId: string): string {
  try {
    // Get thieving system from world
    const thievingSystem = world.systems?.find((s: any) => s.name === 'ThievingSystem');
    
    if (!thievingSystem) {
      return "The thieving system isn't available right now.";
    }

    const isThieving = thievingSystem.isPlayerThieving(playerId);

    let status = '';

    // Current activity
    if (isThieving) {
      const activeActions = thievingSystem.getActiveThievingActions();
      const action = activeActions.get(playerId);
      if (action) {
        let targetName = action.targetId;
        
        // Get proper name from system
        if (action.type === 'pickpocket') {
          const targets = thievingSystem.getPickpocketTargets();
          const target = targets.get(action.targetId);
          targetName = target?.name || action.targetId;
        } else if (action.type === 'steal_stall') {
          const stalls = thievingSystem.getStalls();
          const stall = stalls.get(action.targetId);
          targetName = stall?.name || action.targetId;
        } else if (action.type === 'lockpick') {
          const targets = thievingSystem.getLockpickTargets();
          const target = targets.get(action.targetId);
          targetName = target?.name || action.targetId;
        }
        
        status += `I'm currently ${action.type === 'pickpocket' ? 'pickpocketing' : action.type === 'steal_stall' ? 'stealing from' : 'lockpicking'} ${targetName}.\\n`;
        
        const timeRemaining = (action.startTime + action.duration) - Date.now();
        if (timeRemaining > 0) {
          status += `Time remaining: ${(timeRemaining / 1000).toFixed(1)}s\\n`;
        }
      }
    } else {
      status = `I'm not currently thieving anything.\\n`;
    }

    // Available targets by level
    const stats = world.entities.players.get(playerId)?.data?.stats;
    if (stats) {
      const thievingLevel = stats.thieving.level;
      const availableTargets = thievingSystem.getTargetsByLevel(1, thievingLevel);
      if (availableTargets.length > 0) {
        const targetNames = availableTargets.slice(0, 5).map((t: any) => t.name).join(', ');
        status += `Available targets (level ${thievingLevel}): ${targetNames}${availableTargets.length > 5 ? '...' : ''}\\n`;
      }
    }

    status += `I can pickpocket NPCs, steal from stalls, and lockpick chests for valuable loot!`;

    return status;
  } catch (error) {
    return "I couldn't check my thieving status right now.";
  }
}