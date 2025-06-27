/**
 * Fishing Actions for Agent Interaction
 * ===================================
 * Natural language interface for AI agents to interact with the fishing system
 */

import { ActionExample, IAgentRuntime, Memory, State, type Action } from '@elizaos/core';

export const hyperfyFishingAction: Action = {
  name: 'HYPERFY_FISHING',
  similes: [
    'FISH',
    'CATCH_FISH',
    'START_FISHING',
    'GO_FISHING',
    'USE_FISHING_ROD',
    'NET_FISH',
    'FISHING_ACTION'
  ],
  description: 'Fish at various spots in the RuneScape world using different tools and techniques',
  
  validate: async (runtime: IAgentRuntime, message: Memory) => {
    const text = message.content.text.toLowerCase();
    
    // Check for fishing-related keywords
    const fishingKeywords = [
      'fish', 'fishing', 'catch', 'rod', 'net', 'bait', 'shrimp', 'trout', 
      'salmon', 'lobster', 'harpoon', 'spot', 'river', 'sea', 'lake'
    ];
    
    return fishingKeywords.some(keyword => text.includes(keyword));
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State,
    options: any,
    callback: any
  ) => {
    const text = message.content.text.toLowerCase();
    
    try {
      // Parse fishing command
      const fishingCommand = parseFishingCommand(text);
      
      if (!fishingCommand) {
        callback({
          text: "I don't understand that fishing command. Try 'fish at shrimp spot' or 'stop fishing'.",
          action: 'FISHING_HELP'
        });
        return;
      }

      // Get world service to emit fishing events
      const hyperfyService = runtime.getService('hyperfy');
      if (!hyperfyService) {
        callback({
          text: "Hyperfy service not available for fishing actions.",
          action: 'SERVICE_ERROR'
        });
        return;
      }

      const world = hyperfyService.getWorld();
      const playerId = runtime.character?.name || 'agent';

      let responseText = '';
      let actionType = '';

      switch (fishingCommand.action) {
        case 'start':
          if (fishingCommand.spotType) {
            // Find and start fishing at specific spot type
            world.events.emit('rpg:fish_spot', {
              playerId,
              spotId: `${fishingCommand.spotType}_spot`
            });
            responseText = `I'll start fishing for ${fishingCommand.spotType}! Let me cast my line...`;
            actionType = 'START_FISHING';
          } else {
            // Generic fishing start
            world.events.emit('rpg:fish_spot', {
              playerId,
              spotId: 'shrimp_spot' // Default to shrimp for beginners
            });
            responseText = "I'll start fishing! Looking for a good spot to cast my line...";
            actionType = 'START_FISHING';
          }
          break;

        case 'stop':
          world.events.emit('rpg:stop_fishing', { playerId });
          responseText = "I'll stop fishing and reel in my line.";
          actionType = 'STOP_FISHING';
          break;

        case 'check':
          // Check fishing status and available spots
          responseText = generateFishingStatus(world, playerId);
          actionType = 'CHECK_FISHING';
          break;

        case 'move':
          if (fishingCommand.spotType) {
            // Stop current fishing and move to new spot
            world.events.emit('rpg:stop_fishing', { playerId });
            setTimeout(() => {
              world.events.emit('rpg:fish_spot', {
                playerId,
                spotId: `${fishingCommand.spotType}_spot`
              });
            }, 100);
            responseText = `Moving to the ${fishingCommand.spotType} fishing spot!`;
            actionType = 'MOVE_FISHING_SPOT';
          }
          break;

        default:
          responseText = "I'm not sure what fishing action you want me to perform.";
          actionType = 'FISHING_UNKNOWN';
      }

      // Emit RPG event for fishing action
      world.events.emit('rpg:agent_action', {
        playerId,
        action: 'fishing',
        details: fishingCommand,
        timestamp: Date.now()
      });

      callback({
        text: responseText,
        action: actionType,
        metadata: {
          skill: 'fishing',
          command: fishingCommand,
          timestamp: Date.now()
        }
      });

    } catch (error) {
      console.error('Error in fishing action:', error);
      callback({
        text: "Something went wrong while trying to fish. Let me try again.",
        action: 'FISHING_ERROR'
      });
    }
  },

  examples: [
    [
      {
        user: "{{user1}}",
        content: {
          text: "Start fishing for shrimp"
        }
      } as ActionExample,
      {
        user: "{{user2}}",
        content: {
          text: "I'll head to the shrimp fishing spot and cast my net!"
        }
      } as ActionExample
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Fish at the trout spot"
        }
      } as ActionExample,
      {
        user: "{{user2}}",
        content: {
          text: "Perfect! I'll go to the trout fishing spot with my rod and bait."
        }
      } as ActionExample
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Stop fishing"
        }
      } as ActionExample,
      {
        user: "{{user2}}",
        content: {
          text: "Alright, I'll reel in my line and stop fishing."
        }
      } as ActionExample
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Check my fishing progress"
        }
      } as ActionExample,
      {
        user: "{{user2}}",
        content: {
          text: "Let me check my fishing level and see what fish I've caught recently."
        }
      } as ActionExample
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Move to salmon fishing spot"
        }
      } as ActionExample,
      {
        user: "{{user2}}",
        content: {
          text: "I'll head over to the salmon fishing spot for better catches!"
        }
      } as ActionExample
    ]
  ] as ActionExample[][]
};

interface FishingCommand {
  action: 'start' | 'stop' | 'check' | 'move';
  spotType?: string;
  tool?: string;
  target?: string;
}

function parseFishingCommand(text: string): FishingCommand | null {
  text = text.toLowerCase().trim();

  // Stop fishing patterns
  if (text.includes('stop fish') || text.includes('quit fish') || text.includes('end fish')) {
    return { action: 'stop' };
  }

  // Check fishing patterns
  if (text.includes('check fish') || text.includes('fishing level') || 
      text.includes('fishing progress') || text.includes('fishing status')) {
    return { action: 'check' };
  }

  // Move to spot patterns
  if (text.includes('move to') || text.includes('go to') || text.includes('switch to')) {
    const spotType = extractSpotType(text);
    if (spotType) {
      return { action: 'move', spotType };
    }
  }

  // Start fishing patterns
  if (text.includes('fish') || text.includes('catch') || text.includes('cast')) {
    const spotType = extractSpotType(text);
    const tool = extractTool(text);
    
    return { 
      action: 'start', 
      spotType,
      tool
    };
  }

  return null;
}

function extractSpotType(text: string): string | undefined {
  const spotTypes = [
    'shrimp', 'trout', 'salmon', 'lobster', 'tuna', 'shark', 'monkfish',
    'cod', 'mackerel', 'sardine', 'herring', 'anchovies', 'bass', 'swordfish'
  ];

  for (const spot of spotTypes) {
    if (text.includes(spot)) {
      return spot;
    }
  }

  return undefined;
}

function extractTool(text: string): string | undefined {
  const tools = [
    'net', 'rod', 'harpoon', 'cage', 'pot', 'fly rod', 'fishing rod'
  ];

  for (const tool of tools) {
    if (text.includes(tool)) {
      return tool;
    }
  }

  return undefined;
}

function generateFishingStatus(world: any, playerId: string): string {
  try {
    // Get fishing system from world
    const fishingSystem = world.systems?.find((s: any) => s.name === 'FishingSystem');
    
    if (!fishingSystem) {
      return "The fishing system isn't available right now.";
    }

    const isCurrentlyFishing = fishingSystem.isPlayerFishing(playerId);
    const activeActions = fishingSystem.getActiveActions();
    const playerAction = activeActions.get(playerId);

    let status = '';

    if (isCurrentlyFishing && playerAction) {
      const spotInstances = fishingSystem.getSpotInstances();
      const spotInstance = spotInstances.get(playerAction.nodeId);
      const fishingSpots = fishingSystem.getFishingSpots();
      const spot = fishingSpots.get(spotInstance?.spotId || '');
      
      status += `I'm currently fishing at the ${spot?.name || 'unknown spot'}.\n`;
      status += `Attempts: ${playerAction.attempts}, XP gained: ${playerAction.xpGained}, Fish caught: ${playerAction.itemsGained.length}\n`;
      status += `Success rate: ${(playerAction.successRate * 100).toFixed(1)}%`;
    } else {
      status = "I'm not currently fishing. I can fish at various spots for different types of fish!";
    }

    return status;
  } catch (error) {
    return "I couldn't check my fishing status right now.";
  }
}