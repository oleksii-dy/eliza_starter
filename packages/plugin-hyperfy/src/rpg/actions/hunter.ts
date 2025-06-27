/**
 * Hunter Actions for Agent Interaction
 * ===================================
 * Natural language interface for AI agents to interact with the hunter system
 */

import { ActionExample, IAgentRuntime, Memory, State, type Action } from '@elizaos/core';

export const hyperfyHunterAction: Action = {
  name: 'HYPERFY_HUNTER',
  similes: [
    'HUNT',
    'TRAP',
    'CATCH',
    'START_HUNTING',
    'SET_TRAP',
    'CHECK_TRAP',
    'TRACK_CREATURE',
    'HUNTER_ACTION'
  ],
  description: 'Hunt creatures in the RuneScape world using traps, tracking, and other hunting methods',
  
  validate: async (runtime: IAgentRuntime, message: Memory) => {
    const text = message.content.text?.toLowerCase() || '';
    
    // Check for hunter-related keywords
    const hunterKeywords = [
      'hunt', 'trap', 'catch', 'track', 'snare', 'creature', 'animal',
      'rabbit', 'bird', 'chinchompa', 'salamander', 'kebbit', 'hunter', 'hunting'
    ];
    
    return hunterKeywords.some(keyword => text.includes(keyword));
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
      // Parse hunter command
      const hunterCommand = parseHunterCommand(text);
      
      if (!hunterCommand) {
        callback({
          text: "I don't understand that hunter command. Try 'set trap for rabbits' or 'track kebbits'.",
          action: 'HUNTER_HELP'
        });
        return;
      }

      // Get world service to emit hunter events
      const hyperfyService = runtime.getService('hyperfy');
      if (!hyperfyService) {
        callback({
          text: "Hyperfy service not available for hunter actions.",
          action: 'SERVICE_ERROR'
        });
        return;
      }

      const world = (hyperfyService as any).getWorld();
      const playerId = runtime.character?.name || 'agent';

      let responseText = '';
      let actionType = '';

      switch (hunterCommand.action) {
        case 'trap':
          if (hunterCommand.creatureType) {
            // Set trap for specific creature type
            const position = { x: 70 + Math.random() * 10, y: 0, z: Math.random() * 10 };
            world.events.emit('rpg:set_trap', {
              playerId,
              creatureId: hunterCommand.creatureType,
              position
            });
            responseText = `I'll set a trap for ${hunterCommand.creatureType}! Let me find a good spot...`;
            actionType = 'SET_TRAP';
          } else {
            // Generic trap setting
            const position = { x: 70 + Math.random() * 10, y: 0, z: Math.random() * 10 };
            world.events.emit('rpg:set_trap', {
              playerId,
              creatureId: 'rabbit', // Default to rabbits for beginners
              position
            });
            responseText = "I'll set a trap! Looking for a good hunting spot...";
            actionType = 'SET_TRAP';
          }
          break;

        case 'track':
          if (hunterCommand.creatureType) {
            // Start tracking specific creature
            world.events.emit('rpg:hunt_creature', {
              playerId,
              creatureId: hunterCommand.creatureType
            });
            responseText = `I'll start tracking ${hunterCommand.creatureType}! Following their trail...`;
            actionType = 'START_TRACKING';
          } else {
            // Generic tracking
            world.events.emit('rpg:hunt_creature', {
              playerId,
              creatureId: 'kebbits'
            });
            responseText = "I'll start tracking creatures! Looking for signs...";
            actionType = 'START_TRACKING';
          }
          break;

        case 'check':
          if (hunterCommand.target === 'traps') {
            // Check all traps
            world.events.emit('rpg:check_all_traps', { playerId });
            responseText = "Let me check all my traps to see if I caught anything!";
            actionType = 'CHECK_TRAPS';
          } else {
            // Check hunter status
            responseText = generateHunterStatus(world, playerId);
            actionType = 'CHECK_HUNTER';
          }
          break;

        case 'stop':
          world.events.emit('rpg:stop_hunting', { playerId });
          responseText = "I'll stop hunting and pack up my gear.";
          actionType = 'STOP_HUNTING';
          break;

        default:
          responseText = "I'm not sure what hunting action you want me to perform.";
          actionType = 'HUNTER_UNKNOWN';
      }

      // Emit RPG event for hunter action
      world.events.emit('rpg:agent_action', {
        playerId,
        action: 'hunter',
        details: hunterCommand,
        timestamp: Date.now()
      });

      callback({
        text: responseText,
        action: actionType,
        metadata: {
          skill: 'hunter',
          command: hunterCommand,
          timestamp: Date.now()
        }
      });

    } catch (error) {
      console.error('Error in hunter action:', error);
      callback({
        text: "Something went wrong while trying to hunt. Let me try again.",
        action: 'HUNTER_ERROR'
      });
    }
  },

  examples: [
    [
      {
        user: "{{user1}}",
        content: {
          text: "Set trap for rabbits"
        }
      } as ActionExample,
      {
        user: "{{user2}}",
        content: {
          text: "I'll set a rabbit snare in a good hunting spot!"
        }
      } as ActionExample
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Track kebbits"
        }
      } as ActionExample,
      {
        user: "{{user2}}",
        content: {
          text: "I'll start tracking kebbits! Let me follow their trail."
        }
      } as ActionExample
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Check my traps"
        }
      } as ActionExample,
      {
        user: "{{user2}}",
        content: {
          text: "Let me check all my traps to see if I caught anything!"
        }
      } as ActionExample
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Hunt chinchompas"
        }
      } as ActionExample,
      {
        user: "{{user2}}",
        content: {
          text: "I'll set box traps for chinchompas! They're tricky to catch."
        }
      } as ActionExample
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Stop hunting"
        }
      } as ActionExample,
      {
        user: "{{user2}}",
        content: {
          text: "Alright, I'll stop hunting and pack up my gear."
        }
      } as ActionExample
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Check my hunter level"
        }
      } as ActionExample,
      {
        user: "{{user2}}",
        content: {
          text: "Let me check my hunter level and see what creatures I can catch."
        }
      } as ActionExample
    ]
  ] as ActionExample[][]
};

interface HunterCommand {
  action: 'trap' | 'track' | 'check' | 'stop';
  creatureType?: string;
  target?: string;
  method?: string;
}

function parseHunterCommand(text: string): HunterCommand | null {
  text = text.toLowerCase().trim();

  // Stop hunting patterns
  if (text.includes('stop hunt') || text.includes('quit hunt') || text.includes('end hunt')) {
    return { action: 'stop' };
  }

  // Check patterns
  if (text.includes('check trap') || text.includes('check my trap')) {
    return { action: 'check', target: 'traps' };
  }
  
  if (text.includes('check hunt') || text.includes('hunter level') || 
      text.includes('hunter progress') || text.includes('hunter status')) {
    return { action: 'check' };
  }

  // Tracking patterns
  if (text.includes('track') || text.includes('follow') || text.includes('trail')) {
    const creatureType = extractCreatureType(text);
    return { action: 'track', creatureType };
  }

  // Trap patterns
  if (text.includes('trap') || text.includes('snare') || text.includes('catch') || 
      text.includes('hunt')) {
    const creatureType = extractCreatureType(text);
    const method = extractHuntingMethod(text);
    
    return { 
      action: 'trap', 
      creatureType,
      method
    };
  }

  return null;
}

function extractCreatureType(text: string): string | undefined {
  const creatureTypes = [
    'rabbit', 'bird', 'chinchompa', 'salamander', 'red_salamander',
    'kebbit', 'kebbits', 'ferret', 'squirrel', 'raccoon'
  ];

  for (const creature of creatureTypes) {
    if (text.includes(creature)) {
      return creature === 'kebbits' ? 'kebbits' : creature;
    }
  }

  return undefined;
}

function extractHuntingMethod(text: string): string | undefined {
  const methods = [
    'trap', 'snare', 'net', 'tracking', 'pitfall', 'falconry'
  ];

  for (const method of methods) {
    if (text.includes(method)) {
      return method;
    }
  }

  return undefined;
}

function generateHunterStatus(world: any, playerId: string): string {
  try {
    // Get hunter system from world
    const hunterSystem = world.systems?.find((s: any) => s.name === 'HunterSystem');
    
    if (!hunterSystem) {
      return "The hunter system isn't available right now.";
    }

    const isCurrentlyHunting = hunterSystem.isPlayerHunting(playerId);
    const activeActions = hunterSystem.getActiveActions();
    const playerAction = activeActions.get(playerId);
    const playerTraps = hunterSystem.getPlayerTraps(playerId);

    let status = '';

    if (isCurrentlyHunting && playerAction) {
      const creatures = hunterSystem.getCreatures();
      const creature = creatures.get(playerAction.nodeId);
      
      status += `I'm currently tracking ${creature?.name || 'unknown creature'}.\n`;
      status += `Attempts: ${playerAction.attempts}, XP gained: ${playerAction.xpGained}, Catches: ${playerAction.itemsGained.length}\n`;
      status += `Success rate: ${(playerAction.successRate * 100).toFixed(1)}%\n`;
    }

    if (playerTraps.length > 0) {
      status += `\nActive traps: ${playerTraps.length}\n`;
      playerTraps.forEach((trap, index) => {
        const creatures = hunterSystem.getCreatures();
        const creature = creatures.get(trap.creatureId);
        status += `- Trap ${index + 1}: ${creature?.name || 'unknown'} (${trap.state})\n`;
      });
    }

    if (!isCurrentlyHunting && playerTraps.length === 0) {
      status = "I'm not currently hunting. I can set traps or track creatures for XP and loot!";
    }

    return status;
  } catch (error) {
    return "I couldn't check my hunter status right now.";
  }
}