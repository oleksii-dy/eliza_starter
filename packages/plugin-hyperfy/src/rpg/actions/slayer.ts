/**
 * Slayer Actions for Agent Interaction
 * ===================================
 * Natural language interface for AI agents to interact with the slayer system
 */

import { ActionExample, IAgentRuntime, Memory, State, type Action } from '@elizaos/core';

export const hyperfySlayerAction: Action = {
  name: 'HYPERFY_SLAYER',
  similes: [
    'SLAYER',
    'TASK',
    'ASSIGNMENT',
    'SLAYER_MASTER',
    'MONSTER',
    'KILL',
    'HUNT',
    'SLAY',
    'SLAYER_ACTION'
  ],
  description: 'Get slayer tasks, track progress, and manage slayer assignments from slayer masters',
  
  validate: async (runtime: IAgentRuntime, message: Memory) => {
    const text = message.content.text?.toLowerCase() || '';
    
    // Check for slayer-related keywords
    const slayerKeywords = [
      'slayer', 'task', 'assignment', 'slayer master', 'master', 'kill', 'hunt', 'slay',
      'turael', 'mazchna', 'vannaka', 'chaeldar', 'nieve', 'slayer points',
      'abyssal demon', 'dark beast', 'gargoyle', 'nechryael', 'basilisk', 'kurask',
      'aberrant spectre', 'banshee', 'cave crawler', 'rockslug', 'cockatrice',
      'kraken', 'smoke devil', 'slayer gear', 'slayer helmet'
    ];
    
    const hasKeyword = slayerKeywords.some(keyword => text.includes(keyword));
    
    if (!hasKeyword) {
      return false;
    }

    // Additional validation: check if player has slayer capability
    try {
      const hyperfyService = runtime.getService('hyperfy');
      if (!hyperfyService) {
        return false;
      }

      const world = (hyperfyService as any).getWorld();
      const playerId = runtime.character?.name || 'agent';
      const slayerSystem = world.systems?.find((s: any) => s.name === 'SlayerSystem');
      
      if (!slayerSystem) {
        return false;
      }

      return true; // Allow for general slayer queries
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
      // Parse slayer command
      const slayerCommand = parseSlayerCommand(text);
      
      if (!slayerCommand) {
        callback({
          text: "I don't understand that slayer command. Try 'get task from vannaka' or 'check slayer task'.",
          action: 'SLAYER_HELP'
        });
        return;
      }

      // Get world service to emit slayer events
      const hyperfyService = runtime.getService('hyperfy');
      if (!hyperfyService) {
        callback({
          text: "Hyperfy service not available for slayer actions.",
          action: 'SERVICE_ERROR'
        });
        return;
      }

      const world = (hyperfyService as any).getWorld();
      const playerId = runtime.character?.name || 'agent';
      const slayerSystem = world.systems?.find((s: any) => s.name === 'SlayerSystem');

      if (!slayerSystem) {
        callback({
          text: "Slayer system not available.",
          action: 'SYSTEM_ERROR'
        });
        return;
      }

      let responseText = '';
      let actionType = '';

      switch (slayerCommand.action) {
        case 'get_task':
          if (slayerCommand.masterId) {
            // Validate task capability
            const validation = slayerSystem.canGetTask(playerId, slayerCommand.masterId);
            
            if (!validation.canGet) {
              callback({
                text: `I can't get a task from ${slayerCommand.masterId}: ${validation.reason}`,
                action: 'SLAYER_INVALID'
              });
              return;
            }

            world.events.emit('rpg:get_slayer_task', {
              playerId,
              masterId: slayerCommand.masterId
            });
            
            const masters = slayerSystem.getSlayerMasters();
            const master = masters.get(slayerCommand.masterId);
            responseText = `I'll get a new slayer task from ${master?.name || slayerCommand.masterId}. Let's see what monsters I need to hunt!`;
            actionType = 'GET_SLAYER_TASK';
          } else {
            responseText = "Which slayer master should I visit? Try 'get task from turael' or 'get task from vannaka'.";
            actionType = 'SLAYER_CLARIFY';
          }
          break;

        case 'cancel_task':
          // Validate cancel capability
          const validation = slayerSystem.canCancelTask(playerId);
          
          if (!validation.canCancel) {
            callback({
              text: `I can't cancel my slayer task: ${validation.reason}`,
              action: 'SLAYER_INVALID'
            });
            return;
          }

          world.events.emit('rpg:cancel_slayer_task', {
            playerId
          });
          
          responseText = "I'll cancel my current slayer task. I can get a new one from any slayer master.";
          actionType = 'CANCEL_SLAYER_TASK';
          break;

        case 'check_task':
          responseText = generateSlayerStatus(world, playerId);
          actionType = 'CHECK_SLAYER_TASK';
          break;

        case 'kill_monster':
          if (slayerCommand.monsterId) {
            // Check if player can damage this monster
            if (!slayerSystem.canDamageMonster(playerId, slayerCommand.monsterId)) {
              callback({
                text: `I can't damage ${slayerCommand.monsterId.replace(/_/g, ' ')}. I might need a higher slayer level or an active task.`,
                action: 'SLAYER_INVALID'
              });
              return;
            }

            // Check required gear
            if (!slayerSystem.hasRequiredSlayerGear(playerId, slayerCommand.monsterId)) {
              callback({
                text: `I need special slayer gear to fight ${slayerCommand.monsterId.replace(/_/g, ' ')}. Let me check what equipment I need.`,
                action: 'SLAYER_GEAR_REQUIRED'
              });
              return;
            }

            responseText = `I'll hunt ${slayerCommand.monsterId.replace(/_/g, ' ')}. This should count towards my slayer task if it matches!`;
            actionType = 'HUNT_SLAYER_MONSTER';
          } else {
            responseText = "Which monster should I hunt? Try 'kill abyssal demons' or 'hunt gargoyles'.";
            actionType = 'SLAYER_CLARIFY';
          }
          break;

        default:
          responseText = "I'm not sure what slayer action you want me to perform.";
          actionType = 'SLAYER_UNKNOWN';
      }

      // Emit RPG event for slayer action
      world.events.emit('rpg:agent_action', {
        playerId,
        action: 'slayer',
        details: slayerCommand,
        timestamp: Date.now()
      });

      callback({
        text: responseText,
        action: actionType,
        metadata: {
          skill: 'slayer',
          command: slayerCommand,
          timestamp: Date.now()
        }
      });

    } catch (error) {
      console.error('Error in slayer action:', error);
      callback({
        text: "Something went wrong while trying to do slayer activities. Let me try again.",
        action: 'SLAYER_ERROR'
      });
    }
  },

  examples: [
    [
      {
        user: "{{user1}}",
        content: {
          text: "Get task from vannaka"
        }
      } as ActionExample,
      {
        user: "{{user2}}",
        content: {
          text: "I'll get a new slayer task from Vannaka. Let's see what monsters I need to hunt!"
        }
      } as ActionExample
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Check slayer task"
        }
      } as ActionExample,
      {
        user: "{{user2}}",
        content: {
          text: "Let me check my current slayer assignment and progress."
        }
      } as ActionExample
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Kill abyssal demons"
        }
      } as ActionExample,
      {
        user: "{{user2}}",
        content: {
          text: "I'll hunt abyssal demons. This should count towards my slayer task if it matches!"
        }
      } as ActionExample
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Get task from turael"
        }
      } as ActionExample,
      {
        user: "{{user2}}",
        content: {
          text: "I'll get a new slayer task from Turael. Let's see what monsters I need to hunt!"
        }
      } as ActionExample
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Cancel slayer task"
        }
      } as ActionExample,
      {
        user: "{{user2}}",
        content: {
          text: "I'll cancel my current slayer task. I can get a new one from any slayer master."
        }
      } as ActionExample
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Hunt gargoyles"
        }
      } as ActionExample,
      {
        user: "{{user2}}",
        content: {
          text: "I'll hunt gargoyles. This should count towards my slayer task if it matches!"
        }
      } as ActionExample
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Get task from chaeldar"
        }
      } as ActionExample,
      {
        user: "{{user2}}",
        content: {
          text: "I'll get a new slayer task from Chaeldar. Let's see what monsters I need to hunt!"
        }
      } as ActionExample
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Slay nechryael"
        }
      } as ActionExample,
      {
        user: "{{user2}}",
        content: {
          text: "I'll hunt nechryael. This should count towards my slayer task if it matches!"
        }
      } as ActionExample
    ]
  ] as ActionExample[][]
};

interface SlayerCommand {
  action: 'get_task' | 'cancel_task' | 'check_task' | 'kill_monster';
  masterId?: string;
  monsterId?: string;
}

function parseSlayerCommand(text: string): SlayerCommand | null {
  text = text.toLowerCase().trim();

  // Cancel task patterns
  if (text.includes('cancel task') || text.includes('cancel slayer') || text.includes('abandon task')) {
    return { action: 'cancel_task' };
  }

  // Check task patterns
  if (text.includes('check task') || text.includes('slayer task') || 
      text.includes('task progress') || text.includes('slayer progress') ||
      text.includes('my task') || text.includes('current task')) {
    return { action: 'check_task' };
  }

  // Get task patterns
  if ((text.includes('get') && text.includes('task')) || 
      (text.includes('new') && text.includes('task')) ||
      (text.includes('task') && text.includes('from'))) {
    const masterId = extractSlayerMasterId(text);
    return { action: 'get_task', masterId };
  }

  // Kill/hunt monster patterns
  if (text.includes('kill') || text.includes('hunt') || text.includes('slay') || text.includes('fight')) {
    const monsterId = extractMonsterId(text);
    if (monsterId) {
      return { action: 'kill_monster', monsterId };
    }
  }

  return null;
}

function extractSlayerMasterId(text: string): string | undefined {
  // Map slayer master names to IDs
  const masterMap: Record<string, string> = {
    'turael': 'turael',
    'mazchna': 'mazchna',
    'vannaka': 'vannaka',
    'chaeldar': 'chaeldar',
    'nieve': 'nieve',
  };

  for (const [masterName, masterId] of Object.entries(masterMap)) {
    if (text.includes(masterName)) {
      return masterId;
    }
  }

  return undefined;
}

function extractMonsterId(text: string): string | undefined {
  // Map monster names to IDs
  const monsterMap: Record<string, string> = {
    'abyssal demon': 'abyssal_demon',
    'abyssal demons': 'abyssal_demon',
    'dark beast': 'dark_beast',
    'dark beasts': 'dark_beast',
    'gargoyle': 'gargoyle',
    'gargoyles': 'gargoyle',
    'nechryael': 'nechryael',
    'aberrant spectre': 'aberrant_spectre',
    'aberrant spectres': 'aberrant_spectre',
    'banshee': 'banshee',
    'banshees': 'banshee',
    'basilisk': 'basilisk',
    'basilisks': 'basilisk',
    'kurask': 'kurask',
    'turoth': 'turoth',
    'turoths': 'turoth',
    'cave crawler': 'cave_crawler',
    'cave crawlers': 'cave_crawler',
    'rockslug': 'rockslug',
    'rockslugs': 'rockslug',
    'cockatrice': 'cockatrice',
    'cockatrices': 'cockatrice',
    'kraken': 'kraken',
    'smoke devil': 'smoke_devil',
    'smoke devils': 'smoke_devil',
    'thermonuclear smoke devil': 'smoke_devil',
  };

  // Try exact matches first
  for (const [monsterName, monsterId] of Object.entries(monsterMap)) {
    if (text.includes(monsterName)) {
      return monsterId;
    }
  }

  return undefined;
}

function generateSlayerStatus(world: any, playerId: string): string {
  try {
    // Get slayer system from world
    const slayerSystem = world.systems?.find((s: any) => s.name === 'SlayerSystem');
    
    if (!slayerSystem) {
      return "The slayer system isn't available right now.";
    }

    const currentTask = slayerSystem.getPlayerTask(playerId);

    let status = '';

    if (currentTask) {
      // Get task details
      const masters = slayerSystem.getSlayerMasters();
      const assignments = slayerSystem.getSlayerAssignments();
      const master = masters.get(currentTask.masterId);
      const assignment = assignments.get(currentTask.assignmentId);

      if (master && assignment) {
        status += `Current slayer task from ${master.name}:\\n`;
        status += `Kill ${assignment.name}: ${currentTask.monstersKilled}/${currentTask.monstersAssigned}\\n`;
        
        const remaining = currentTask.monstersAssigned - currentTask.monstersKilled;
        status += `Remaining: ${remaining}\\n`;
        status += `Reward: ${assignment.slayerXP} slayer XP, ${currentTask.slayerPoints} slayer points\\n`;
        
        // Calculate time elapsed
        const timeElapsed = Date.now() - currentTask.assignedTime;
        const hoursElapsed = Math.floor(timeElapsed / (1000 * 60 * 60));
        const minutesElapsed = Math.floor((timeElapsed % (1000 * 60 * 60)) / (1000 * 60));
        status += `Task assigned: ${hoursElapsed}h ${minutesElapsed}m ago\\n`;
      }
    } else {
      status = `I don't have an active slayer task.\\n`;
    }

    // Available masters by level
    const stats = world.entities.players.get(playerId)?.data?.stats;
    if (stats) {
      const slayerLevel = stats.slayer.level;
      const availableMasters = slayerSystem.getMastersByLevel(1, slayerLevel);
      if (availableMasters.length > 0) {
        status += `Available slayer masters (level ${slayerLevel}): ${availableMasters.map((m: any) => m.name).join(', ')}\\n`;
      }
    }

    if (!currentTask) {
      status += `I can get a new slayer task from any available slayer master!`;
    } else {
      status += `I should continue hunting ${assignments.get(currentTask.assignmentId)?.name || 'my assigned monsters'} to complete this task.`;
    }

    return status;
  } catch (error) {
    return "I couldn't check my slayer status right now.";
  }
}