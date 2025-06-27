/**
 * Woodcutting Actions for Agent Interaction
 * =========================================
 * Natural language interface for AI agents to interact with the woodcutting system
 */

import { ActionExample, IAgentRuntime, Memory, State, type Action } from '@elizaos/core';

export const hyperfyWoodcuttingAction: Action = {
  name: 'HYPERFY_WOODCUTTING',
  similes: [
    'CHOP',
    'CUT_TREE',
    'START_WOODCUTTING',
    'CHOP_WOOD',
    'USE_AXE',
    'FELL_TREE',
    'WOODCUTTING_ACTION'
  ],
  description: 'Chop trees in the RuneScape world to gather logs and gain woodcutting experience',
  
  validate: async (runtime: IAgentRuntime, message: Memory) => {
    const text = message.content.text?.toLowerCase() || '';
    
    // Check for woodcutting-related keywords
    const woodcuttingKeywords = [
      'chop', 'cut', 'tree', 'wood', 'log', 'axe', 'lumber', 'timber',
      'oak', 'willow', 'maple', 'yew', 'magic', 'normal', 'woodcutting'
    ];
    
    return woodcuttingKeywords.some(keyword => text.includes(keyword));
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
      // Parse woodcutting command
      const woodcuttingCommand = parseWoodcuttingCommand(text);
      
      if (!woodcuttingCommand) {
        callback({
          text: "I don't understand that woodcutting command. Try 'chop oak tree' or 'stop woodcutting'.",
          action: 'WOODCUTTING_HELP'
        });
        return;
      }

      // Get world service to emit woodcutting events
      const hyperfyService = runtime.getService('hyperfy');
      if (!hyperfyService) {
        callback({
          text: "Hyperfy service not available for woodcutting actions.",
          action: 'SERVICE_ERROR'
        });
        return;
      }

      const world = (hyperfyService as any).getWorld();
      const playerId = runtime.character?.name || 'agent';

      let responseText = '';
      let actionType = '';

      switch (woodcuttingCommand.action) {
        case 'start':
          if (woodcuttingCommand.treeType) {
            // Find and start chopping specific tree type
            world.events.emit('rpg:chop_tree', {
              playerId,
              treeId: woodcuttingCommand.treeType
            });
            responseText = `I'll start chopping ${woodcuttingCommand.treeType} trees! Let me get my axe ready...`;
            actionType = 'START_WOODCUTTING';
          } else {
            // Generic woodcutting start
            world.events.emit('rpg:chop_tree', {
              playerId,
              treeId: 'normal' // Default to normal trees for beginners
            });
            responseText = "I'll start chopping trees! Looking for a good tree to cut down...";
            actionType = 'START_WOODCUTTING';
          }
          break;

        case 'stop':
          world.events.emit('rpg:stop_woodcutting', { playerId });
          responseText = "I'll stop chopping and put away my axe.";
          actionType = 'STOP_WOODCUTTING';
          break;

        case 'check':
          // Check woodcutting status and available trees
          responseText = generateWoodcuttingStatus(world, playerId);
          actionType = 'CHECK_WOODCUTTING';
          break;

        case 'move':
          if (woodcuttingCommand.treeType) {
            // Stop current woodcutting and move to new tree
            world.events.emit('rpg:stop_woodcutting', { playerId });
            setTimeout(() => {
              world.events.emit('rpg:chop_tree', {
                playerId,
                treeId: woodcuttingCommand.treeType
              });
            }, 100);
            responseText = `Moving to chop ${woodcuttingCommand.treeType} trees!`;
            actionType = 'MOVE_TREE';
          }
          break;

        default:
          responseText = "I'm not sure what woodcutting action you want me to perform.";
          actionType = 'WOODCUTTING_UNKNOWN';
      }

      // Emit RPG event for woodcutting action
      world.events.emit('rpg:agent_action', {
        playerId,
        action: 'woodcutting',
        details: woodcuttingCommand,
        timestamp: Date.now()
      });

      callback({
        text: responseText,
        action: actionType,
        metadata: {
          skill: 'woodcutting',
          command: woodcuttingCommand,
          timestamp: Date.now()
        }
      });

    } catch (error) {
      console.error('Error in woodcutting action:', error);
      callback({
        text: "Something went wrong while trying to chop trees. Let me try again.",
        action: 'WOODCUTTING_ERROR'
      });
    }
  },

  examples: [
    [
      {
        user: "{{user1}}",
        content: {
          text: "Start chopping normal trees"
        }
      } as ActionExample,
      {
        user: "{{user2}}",
        content: {
          text: "I'll head to the normal trees and start chopping for logs!"
        }
      } as ActionExample
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Cut down oak trees"
        }
      } as ActionExample,
      {
        user: "{{user2}}",
        content: {
          text: "Perfect! I'll find some oak trees and start chopping them down."
        }
      } as ActionExample
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Stop woodcutting"
        }
      } as ActionExample,
      {
        user: "{{user2}}",
        content: {
          text: "Alright, I'll stop chopping and put away my axe."
        }
      } as ActionExample
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Check my woodcutting progress"
        }
      } as ActionExample,
      {
        user: "{{user2}}",
        content: {
          text: "Let me check my woodcutting level and see what logs I've gathered."
        }
      } as ActionExample
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Switch to yew trees"
        }
      } as ActionExample,
      {
        user: "{{user2}}",
        content: {
          text: "I'll move to the yew trees for better logs and XP!"
        }
      } as ActionExample
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Chop magic trees"
        }
      } as ActionExample,
      {
        user: "{{user2}}",
        content: {
          text: "Time to chop some magic trees! These give the best woodcutting XP."
        }
      } as ActionExample
    ]
  ] as ActionExample[][]
};

interface WoodcuttingCommand {
  action: 'start' | 'stop' | 'check' | 'move';
  treeType?: string;
  tool?: string;
}

function parseWoodcuttingCommand(text: string): WoodcuttingCommand | null {
  text = text.toLowerCase().trim();

  // Stop woodcutting patterns
  if (text.includes('stop wood') || text.includes('quit chop') || text.includes('end wood') || 
      text.includes('stop cut')) {
    return { action: 'stop' };
  }

  // Check woodcutting patterns
  if (text.includes('check wood') || text.includes('woodcutting level') || 
      text.includes('woodcutting progress') || text.includes('wood status') ||
      text.includes('chopping progress')) {
    return { action: 'check' };
  }

  // Move to tree patterns
  if (text.includes('move to') || text.includes('go to') || text.includes('switch to')) {
    const treeType = extractTreeType(text);
    if (treeType) {
      return { action: 'move', treeType };
    }
  }

  // Start woodcutting patterns
  if (text.includes('chop') || text.includes('cut') || text.includes('wood') || 
      text.includes('tree') || text.includes('lumber')) {
    const treeType = extractTreeType(text);
    const tool = extractTool(text);
    
    return { 
      action: 'start', 
      treeType,
      tool
    };
  }

  return null;
}

function extractTreeType(text: string): string | undefined {
  const treeTypes = [
    'normal', 'oak', 'willow', 'maple', 'yew', 'magic',
    'tree', 'teak', 'mahogany', 'redwood'
  ];

  for (const tree of treeTypes) {
    if (text.includes(tree)) {
      return tree === 'tree' ? 'normal' : tree;
    }
  }

  return undefined;
}

function extractTool(text: string): string | undefined {
  const tools = [
    'axe', 'hatchet', 'bronze axe', 'iron axe', 'steel axe', 
    'mithril axe', 'adamant axe', 'rune axe', 'dragon axe'
  ];

  for (const tool of tools) {
    if (text.includes(tool)) {
      return tool;
    }
  }

  return undefined;
}

function generateWoodcuttingStatus(world: any, playerId: string): string {
  try {
    // Get woodcutting system from world
    const woodcuttingSystem = world.systems?.find((s: any) => s.name === 'WoodcuttingSystem');
    
    if (!woodcuttingSystem) {
      return "The woodcutting system isn't available right now.";
    }

    const isCurrentlyWoodcutting = woodcuttingSystem.isPlayerWoodcutting(playerId);
    const activeActions = woodcuttingSystem.getActiveActions();
    const playerAction = activeActions.get(playerId);

    let status = '';

    if (isCurrentlyWoodcutting && playerAction) {
      const treeNodes = woodcuttingSystem.getTreeNodes();
      const treeNode = treeNodes.get(playerAction.nodeId);
      const trees = woodcuttingSystem.getTrees();
      const tree = trees.get(treeNode?.treeId || '');
      
      status += `I'm currently chopping ${tree?.name || 'unknown tree'} trees.\n`;
      status += `Attempts: ${playerAction.attempts}, XP gained: ${playerAction.xpGained}, Logs collected: ${playerAction.itemsGained.length}\n`;
      status += `Success rate: ${(playerAction.successRate * 100).toFixed(1)}%`;
    } else {
      status = "I'm not currently woodcutting. I can chop various types of trees for logs and XP!";
    }

    return status;
  } catch (error) {
    return "I couldn't check my woodcutting status right now.";
  }
}