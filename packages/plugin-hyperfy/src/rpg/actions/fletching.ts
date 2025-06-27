/**
 * Fletching Actions for Agent Interaction
 * ======================================
 * Natural language interface for AI agents to interact with the fletching system
 */

import { ActionExample, IAgentRuntime, Memory, State, type Action } from '@elizaos/core';

export const hyperfyFletchingAction: Action = {
  name: 'HYPERFY_FLETCHING',
  similes: [
    'FLETCH',
    'MAKE_BOW',
    'MAKE_ARROWS',
    'CUT_BOW',
    'STRING_BOW',
    'MAKE_BOLTS',
    'MAKE_DARTS',
    'FLETCHING_ACTION'
  ],
  description: 'Fletch bows, arrows, bolts, and darts in the RuneScape world using knife and other fletching tools',
  
  validate: async (runtime: IAgentRuntime, message: Memory) => {
    const text = message.content.text?.toLowerCase() || '';
    
    // Check for fletching-related keywords
    const fletchingKeywords = [
      'fletch', 'make bow', 'make arrow', 'cut bow', 'string bow', 'make bolt', 'make dart',
      'bow', 'arrow', 'bolt', 'dart', 'knife', 'shortbow', 'longbow', 'yew', 'magic',
      'oak', 'willow', 'maple', 'bronze', 'iron', 'steel', 'mithril', 'adamant', 'rune',
      'feather', 'arrowhead', 'bowstring', 'bow string', 'unstrung', 'headless'
    ];
    
    const hasKeyword = fletchingKeywords.some(keyword => text.includes(keyword));
    
    if (!hasKeyword) {
      return false;
    }

    // Additional validation: check if player has fletching capability
    try {
      const hyperfyService = runtime.getService('hyperfy');
      if (!hyperfyService) {
        return false;
      }

      const world = (hyperfyService as any).getWorld();
      const playerId = runtime.character?.name || 'agent';
      const fletchingSystem = world.systems?.find((s: any) => s.name === 'FletchingSystem');
      
      if (!fletchingSystem) {
        return false;
      }

      // Check if player has any fletchable items
      const recipes = fletchingSystem.getFletchingRecipes();
      for (const recipe of recipes.values()) {
        const validation = fletchingSystem.canFletchItem(playerId, recipe.id);
        if (validation.canFletch) {
          return true;
        }
      }

      return false;
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
      // Parse fletching command
      const fletchingCommand = parseFletchingCommand(text);
      
      if (!fletchingCommand) {
        callback({
          text: "I don't understand that fletching command. Try 'fletch yew longbow' or 'make iron arrows'.",
          action: 'FLETCHING_HELP'
        });
        return;
      }

      // Get world service to emit fletching events
      const hyperfyService = runtime.getService('hyperfy');
      if (!hyperfyService) {
        callback({
          text: "Hyperfy service not available for fletching actions.",
          action: 'SERVICE_ERROR'
        });
        return;
      }

      const world = (hyperfyService as any).getWorld();
      const playerId = runtime.character?.name || 'agent';
      const fletchingSystem = world.systems?.find((s: any) => s.name === 'FletchingSystem');

      if (!fletchingSystem) {
        callback({
          text: "Fletching system not available.",
          action: 'SYSTEM_ERROR'
        });
        return;
      }

      let responseText = '';
      let actionType = '';

      switch (fletchingCommand.action) {
        case 'fletch':
          if (fletchingCommand.itemType) {
            // Validate fletching capability
            const validation = fletchingSystem.canFletchItem(playerId, fletchingCommand.itemType);
            
            if (!validation.canFletch) {
              callback({
                text: `I can't fletch ${fletchingCommand.itemType}: ${validation.reason}`,
                action: 'FLETCHING_INVALID'
              });
              return;
            }

            // Check success chance
            const successChance = fletchingSystem.getSuccessChance(playerId, fletchingCommand.itemType);

            world.events.emit('rpg:fletch_item', {
              playerId,
              itemType: fletchingCommand.itemType
            });
            
            responseText = `I'll fletch ${fletchingCommand.itemType.replace(/_/g, ' ')}! `;
            if (successChance < 95) {
              responseText += `There's a ${successChance.toFixed(1)}% chance of success.`;
            } else {
              responseText += `This should fletch successfully with my skill level.`;
            }
            actionType = 'START_FLETCHING';
          } else {
            responseText = "What should I fletch? Try specifying like 'fletch yew longbow' or 'make steel arrows'.";
            actionType = 'FLETCHING_CLARIFY';
          }
          break;

        case 'cut_bow':
          if (fletchingCommand.bowType) {
            world.events.emit('rpg:cut_bow', {
              playerId,
              bowType: fletchingCommand.bowType
            });
            responseText = `I'll cut an unstrung ${fletchingCommand.bowType} bow from logs!`;
            actionType = 'CUT_BOW';
          } else {
            responseText = "What type of bow should I cut? Try specifying like 'cut yew longbow'.";
            actionType = 'FLETCHING_CLARIFY';
          }
          break;

        case 'string_bow':
          if (fletchingCommand.bowType) {
            world.events.emit('rpg:string_bow', {
              playerId,
              bowType: fletchingCommand.bowType
            });
            responseText = `I'll string the ${fletchingCommand.bowType} bow with a bow string!`;
            actionType = 'STRING_BOW';
          } else {
            responseText = "What type of bow should I string?";
            actionType = 'FLETCHING_CLARIFY';
          }
          break;

        case 'make_arrows':
          if (fletchingCommand.arrowType) {
            const quantity = fletchingCommand.quantity || 10;
            world.events.emit('rpg:make_arrows', {
              playerId,
              arrowType: fletchingCommand.arrowType,
              quantity
            });
            responseText = `I'll make ${quantity} ${fletchingCommand.arrowType.replace(/_/g, ' ')}!`;
            actionType = 'MAKE_ARROWS';
          } else {
            responseText = "What type of arrows should I make? Try specifying like 'make iron arrows'.";
            actionType = 'FLETCHING_CLARIFY';
          }
          break;

        case 'stop':
          world.events.emit('rpg:stop_fletching', { playerId });
          responseText = "I'll stop fletching and put away my tools.";
          actionType = 'STOP_FLETCHING';
          break;

        case 'check':
          responseText = generateFletchingStatus(world, playerId);
          actionType = 'CHECK_FLETCHING';
          break;

        default:
          responseText = "I'm not sure what fletching action you want me to perform.";
          actionType = 'FLETCHING_UNKNOWN';
      }

      // Emit RPG event for fletching action
      world.events.emit('rpg:agent_action', {
        playerId,
        action: 'fletching',
        details: fletchingCommand,
        timestamp: Date.now()
      });

      callback({
        text: responseText,
        action: actionType,
        metadata: {
          skill: 'fletching',
          command: fletchingCommand,
          timestamp: Date.now()
        }
      });

    } catch (error) {
      console.error('Error in fletching action:', error);
      callback({
        text: "Something went wrong while trying to fletch. Let me try again.",
        action: 'FLETCHING_ERROR'
      });
    }
  },

  examples: [
    [
      {
        user: "{{user1}}",
        content: {
          text: "Fletch yew longbow"
        }
      } as ActionExample,
      {
        user: "{{user2}}",
        content: {
          text: "I'll fletch yew longbow u! This should fletch successfully with my skill level."
        }
      } as ActionExample
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Make iron arrows"
        }
      } as ActionExample,
      {
        user: "{{user2}}",
        content: {
          text: "I'll make 10 iron arrows!"
        }
      } as ActionExample
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Cut willow shortbow"
        }
      } as ActionExample,
      {
        user: "{{user2}}",
        content: {
          text: "I'll cut an unstrung willow shortbow from logs!"
        }
      } as ActionExample
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "String oak longbow"
        }
      } as ActionExample,
      {
        user: "{{user2}}",
        content: {
          text: "I'll string the oak longbow with a bow string!"
        }
      } as ActionExample
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Make bronze darts"
        }
      } as ActionExample,
      {
        user: "{{user2}}",
        content: {
          text: "I'll fletch bronze darts! I need bronze dart tips and feathers."
        }
      } as ActionExample
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Stop fletching"
        }
      } as ActionExample,
      {
        user: "{{user2}}",
        content: {
          text: "I'll stop fletching and put away my tools."
        }
      } as ActionExample
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Check fletching progress"
        }
      } as ActionExample,
      {
        user: "{{user2}}",
        content: {
          text: "Let me check my fletching level and what I'm currently working on."
        }
      } as ActionExample
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Fletch magic shortbow"
        }
      } as ActionExample,
      {
        user: "{{user2}}",
        content: {
          text: "I'll fletch magic shortbow u! This is high-level fletching requiring magic logs."
        }
      } as ActionExample
    ]
  ] as ActionExample[][]
};

interface FletchingCommand {
  action: 'fletch' | 'cut_bow' | 'string_bow' | 'make_arrows' | 'stop' | 'check';
  itemType?: string;
  bowType?: string;
  arrowType?: string;
  quantity?: number;
}

function parseFletchingCommand(text: string): FletchingCommand | null {
  text = text.toLowerCase().trim();

  // Stop fletching patterns
  if (text.includes('stop fletch') || text.includes('quit fletch') || text.includes('end fletch')) {
    return { action: 'stop' };
  }

  // Check fletching patterns
  if (text.includes('check fletch') || text.includes('fletching level') || 
      text.includes('fletching progress') || text.includes('fletching status')) {
    return { action: 'check' };
  }

  // Cut bow patterns
  if (text.includes('cut bow') || text.includes('cut ') && (text.includes('longbow') || text.includes('shortbow'))) {
    const bowType = extractBowType(text);
    return { action: 'cut_bow', bowType };
  }

  // String bow patterns
  if (text.includes('string bow') || text.includes('string ') && (text.includes('longbow') || text.includes('shortbow'))) {
    const bowType = extractBowType(text);
    return { action: 'string_bow', bowType };
  }

  // Make arrows patterns
  if (text.includes('make arrow') || text.includes('fletch arrow') || text.includes('create arrow')) {
    const arrowInfo = extractArrowType(text);
    const quantity = extractQuantity(text);
    return { 
      action: 'make_arrows', 
      arrowType: arrowInfo,
      quantity: quantity || 10
    };
  }

  // General fletching patterns
  if (text.includes('fletch') || text.includes('make bow') || text.includes('make bolt') || text.includes('make dart')) {
    const itemType = extractFletchingItem(text);
    if (itemType) {
      return { action: 'fletch', itemType };
    }
    return { action: 'fletch' };
  }

  return null;
}

function extractBowType(text: string): string | undefined {
  // Extract wood type and bow type
  const woodTypes = ['', 'oak', 'willow', 'maple', 'yew', 'magic'];
  const bowTypes = ['shortbow', 'longbow'];

  let woodType = '';
  let bowType = '';

  for (const wood of woodTypes) {
    if (wood === '' || text.includes(wood)) {
      woodType = wood;
      break;
    }
  }

  for (const bow of bowTypes) {
    if (text.includes(bow)) {
      bowType = bow;
      break;
    }
  }

  if (bowType) {
    return woodType ? `${woodType}_${bowType}` : bowType;
  }

  return undefined;
}

function extractArrowType(text: string): string | undefined {
  const arrowTypes = [
    'headless_arrows',
    'bronze_arrows',
    'iron_arrows', 
    'steel_arrows',
    'mithril_arrows',
    'adamant_arrows',
    'rune_arrows'
  ];

  // Check for headless arrows first
  if (text.includes('headless')) {
    return 'headless_arrows';
  }

  // Check metal types
  const metals = ['bronze', 'iron', 'steel', 'mithril', 'adamant', 'rune'];
  for (const metal of metals) {
    if (text.includes(metal)) {
      return `${metal}_arrows`;
    }
  }

  return 'bronze_arrows'; // Default
}

function extractFletchingItem(text: string): string | undefined {
  // Map common item names to recipe IDs
  const itemMap: Record<string, string> = {
    // Bows (unstrung)
    'shortbow': 'shortbow_u',
    'oak shortbow': 'oak_shortbow_u',
    'willow shortbow': 'willow_shortbow_u',
    'maple shortbow': 'maple_shortbow_u',
    'yew shortbow': 'yew_shortbow_u',
    'magic shortbow': 'magic_shortbow_u',
    
    'longbow': 'longbow_u',
    'oak longbow': 'oak_longbow_u',
    'willow longbow': 'willow_longbow_u',
    'maple longbow': 'maple_longbow_u',
    'yew longbow': 'yew_longbow_u',
    'magic longbow': 'magic_longbow_u',
    
    // Arrows
    'headless arrows': 'headless_arrows',
    'bronze arrows': 'bronze_arrows',
    'iron arrows': 'iron_arrows',
    'steel arrows': 'steel_arrows',
    'mithril arrows': 'mithril_arrows',
    'adamant arrows': 'adamant_arrows',
    'rune arrows': 'rune_arrows',
    
    // Bolts
    'bronze bolts': 'bronze_bolts',
    'iron bolts': 'iron_bolts',
    'steel bolts': 'steel_bolts',
    
    // Darts
    'bronze darts': 'bronze_darts',
    'iron darts': 'iron_darts',
    'steel darts': 'steel_darts',
  };

  // Try exact matches first
  for (const [itemName, recipeId] of Object.entries(itemMap)) {
    if (text.includes(itemName)) {
      return recipeId;
    }
  }

  // Pattern matching for bows
  if (text.includes('bow')) {
    const bowType = extractBowType(text);
    if (bowType) {
      return `${bowType}_u`; // Default to unstrung
    }
  }

  // Pattern matching for arrows
  if (text.includes('arrow')) {
    return extractArrowType(text);
  }

  // Pattern matching for bolts
  if (text.includes('bolt')) {
    const metals = ['bronze', 'iron', 'steel'];
    for (const metal of metals) {
      if (text.includes(metal)) {
        return `${metal}_bolts`;
      }
    }
    return 'bronze_bolts';
  }

  // Pattern matching for darts
  if (text.includes('dart')) {
    const metals = ['bronze', 'iron', 'steel'];
    for (const metal of metals) {
      if (text.includes(metal)) {
        return `${metal}_darts`;
      }
    }
    return 'bronze_darts';
  }

  return undefined;
}

function extractQuantity(text: string): number | undefined {
  const quantityMatch = text.match(/(\d+)/);
  return quantityMatch ? parseInt(quantityMatch[1]) : undefined;
}

function generateFletchingStatus(world: any, playerId: string): string {
  try {
    // Get fletching system from world
    const fletchingSystem = world.systems?.find((s: any) => s.name === 'FletchingSystem');
    
    if (!fletchingSystem) {
      return "The fletching system isn't available right now.";
    }

    const isCurrentlyFletching = fletchingSystem.isPlayerFletching(playerId);
    const activeActions = fletchingSystem.getActiveActions();
    const playerAction = activeActions.get(playerId);

    let status = '';

    if (isCurrentlyFletching && playerAction) {
      const fletchingRecipes = fletchingSystem.getFletchingRecipes();
      const recipe = fletchingRecipes.get(playerAction.recipeId);
      
      status += `I'm currently fletching ${recipe?.name || 'unknown item'}.\\n`;
      status += `Progress: ${playerAction.completed}/${playerAction.quantity} items\\n`;
      status += `XP gained: ${playerAction.xpGained}\\n`;
      
      if (recipe) {
        const successChance = fletchingSystem.getSuccessChance(playerId, recipe.id);
        status += `Success chance: ${successChance.toFixed(1)}%\\n`;
      }
      
      const timeRemaining = (playerAction.startTime + playerAction.duration) - Date.now();
      if (timeRemaining > 0) {
        status += `Time remaining: ${(timeRemaining / 1000).toFixed(1)}s`;
      }
    } else {
      const recipes = fletchingSystem.getFletchingRecipes();
      const categories = ['bows', 'arrows', 'bolts', 'darts'];
      
      status = `I'm not currently fletching.\\n`;
      status += `Available categories: ${categories.join(', ')}\\n`;
      status += `I can fletch bows, arrows, bolts, and darts!`;
    }

    return status;
  } catch (error) {
    return "I couldn't check my fletching status right now.";
  }
}