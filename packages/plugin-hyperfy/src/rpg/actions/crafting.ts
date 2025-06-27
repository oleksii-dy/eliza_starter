/**
 * Crafting Actions for Agent Interaction
 * =====================================
 * Natural language interface for AI agents to interact with the crafting system
 */

import { ActionExample, IAgentRuntime, Memory, State, type Action } from '@elizaos/core';

export const hyperfyCraftingAction: Action = {
  name: 'HYPERFY_CRAFTING',
  similes: [
    'CRAFT',
    'MAKE',
    'CREATE',
    'TAN',
    'SPIN',
    'WEAVE',
    'POTTERY',
    'JEWELRY',
    'LEATHERWORK',
    'CRAFTING_ACTION'
  ],
  description: 'Craft items including leather goods, pottery, jewelry, spinning, and weaving in the RuneScape world',
  
  validate: async (runtime: IAgentRuntime, message: Memory) => {
    const text = message.content.text?.toLowerCase() || '';
    
    // Check for crafting-related keywords
    const craftingKeywords = [
      'craft', 'make', 'create', 'tan', 'spin', 'weave', 'pottery', 'jewelry',
      'leather', 'gloves', 'boots', 'body', 'vambraces', 'chaps', 'cowl',
      'pot', 'bowl', 'dish', 'clay', 'ring', 'necklace', 'amulet',
      'wool', 'string', 'cloth', 'sack', 'glass', 'vial', 'needle',
      'mould', 'wheel', 'loom', 'furnace'
    ];
    
    const hasKeyword = craftingKeywords.some(keyword => text.includes(keyword));
    
    if (!hasKeyword) {
      return false;
    }

    // Additional validation: check if player has crafting capability
    try {
      const hyperfyService = runtime.getService('hyperfy');
      if (!hyperfyService) {
        return false;
      }

      const world = (hyperfyService as any).getWorld();
      const playerId = runtime.character?.name || 'agent';
      const craftingSystem = world.systems?.find((s: any) => s.name === 'CraftingSystem');
      
      if (!craftingSystem) {
        return false;
      }

      // Check if there are available crafting stations
      const stations = craftingSystem.getCraftingStations();
      const availableStation = Array.from(stations.values()).find((s: any) => !s.inUse);
      if (!availableStation) {
        return false;
      }

      // Check if player has any craftable items
      const recipes = craftingSystem.getCraftingRecipes();
      for (const recipe of recipes.values()) {
        const validation = craftingSystem.canCraftItem(playerId, recipe.id);
        if (validation.canCraft) {
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
      // Parse crafting command
      const craftingCommand = parseCraftingCommand(text);
      
      if (!craftingCommand) {
        callback({
          text: "I don't understand that crafting command. Try 'craft leather gloves' or 'make gold ring'.",
          action: 'CRAFTING_HELP'
        });
        return;
      }

      // Get world service to emit crafting events
      const hyperfyService = runtime.getService('hyperfy');
      if (!hyperfyService) {
        callback({
          text: "Hyperfy service not available for crafting actions.",
          action: 'SERVICE_ERROR'
        });
        return;
      }

      const world = (hyperfyService as any).getWorld();
      const playerId = runtime.character?.name || 'agent';
      const craftingSystem = world.systems?.find((s: any) => s.name === 'CraftingSystem');

      if (!craftingSystem) {
        callback({
          text: "Crafting system not available.",
          action: 'SYSTEM_ERROR'
        });
        return;
      }

      let responseText = '';
      let actionType = '';

      switch (craftingCommand.action) {
        case 'craft':
          if (craftingCommand.itemType) {
            // Validate crafting capability
            const validation = craftingSystem.canCraftItem(playerId, craftingCommand.itemType);
            
            if (!validation.canCraft) {
              callback({
                text: `I can't craft ${craftingCommand.itemType}: ${validation.reason}`,
                action: 'CRAFTING_INVALID'
              });
              return;
            }

            // Check success chance
            const successChance = craftingSystem.getSuccessChance(playerId, craftingCommand.itemType);

            world.events.emit('rpg:craft_item', {
              playerId,
              itemType: craftingCommand.itemType,
              category: craftingCommand.category
            });
            
            responseText = `I'll craft ${craftingCommand.itemType}! `;
            if (successChance < 90) {
              responseText += `There's a ${successChance.toFixed(1)}% chance of success.`;
            } else {
              responseText += `This should craft successfully with my skill level.`;
            }
            actionType = 'START_CRAFTING';
          } else {
            responseText = "What should I craft? Try specifying like 'craft leather gloves' or 'make gold ring'.";
            actionType = 'CRAFTING_CLARIFY';
          }
          break;

        case 'tan':
          if (craftingCommand.hideType) {
            world.events.emit('rpg:tan_hide', {
              playerId,
              hideType: craftingCommand.hideType
            });
            responseText = `I'll tan ${craftingCommand.hideType} hides into leather!`;
            actionType = 'TAN_HIDE';
          } else {
            responseText = "What type of hide should I tan? Cow hide, bear hide, etc.";
            actionType = 'CRAFTING_CLARIFY';
          }
          break;

        case 'spin':
          world.events.emit('rpg:spin_wool', { playerId });
          responseText = "I'll spin wool into balls of wool at the spinning wheel!";
          actionType = 'SPIN_WOOL';
          break;

        case 'stop':
          world.events.emit('rpg:stop_crafting', { playerId });
          responseText = "I'll stop crafting and put away my tools.";
          actionType = 'STOP_CRAFTING';
          break;

        case 'check':
          responseText = generateCraftingStatus(world, playerId);
          actionType = 'CHECK_CRAFTING';
          break;

        default:
          responseText = "I'm not sure what crafting action you want me to perform.";
          actionType = 'CRAFTING_UNKNOWN';
      }

      // Emit RPG event for crafting action
      world.events.emit('rpg:agent_action', {
        playerId,
        action: 'crafting',
        details: craftingCommand,
        timestamp: Date.now()
      });

      callback({
        text: responseText,
        action: actionType,
        metadata: {
          skill: 'crafting',
          command: craftingCommand,
          timestamp: Date.now()
        }
      });

    } catch (error) {
      console.error('Error in crafting action:', error);
      callback({
        text: "Something went wrong while trying to craft. Let me try again.",
        action: 'CRAFTING_ERROR'
      });
    }
  },

  examples: [
    [
      {
        user: "{{user1}}",
        content: {
          text: "Craft leather gloves"
        }
      } as ActionExample,
      {
        user: "{{user2}}",
        content: {
          text: "I'll craft leather gloves! This should craft successfully with my skill level."
        }
      } as ActionExample
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Make gold ring"
        }
      } as ActionExample,
      {
        user: "{{user2}}",
        content: {
          text: "I'll craft gold ring! I need a ring mould and gold bar for this."
        }
      } as ActionExample
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Create pottery bowl"
        }
      } as ActionExample,
      {
        user: "{{user2}}",
        content: {
          text: "I'll craft bowl! I'll need soft clay and access to a pottery wheel."
        }
      } as ActionExample
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Spin wool"
        }
      } as ActionExample,
      {
        user: "{{user2}}",
        content: {
          text: "I'll spin wool into balls of wool at the spinning wheel!"
        }
      } as ActionExample
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Tan cow hide"
        }
      } as ActionExample,
      {
        user: "{{user2}}",
        content: {
          text: "I'll tan cow hide hides into leather!"
        }
      } as ActionExample
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Stop crafting"
        }
      } as ActionExample,
      {
        user: "{{user2}}",
        content: {
          text: "I'll stop crafting and put away my tools."
        }
      } as ActionExample
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Check crafting progress"
        }
      } as ActionExample,
      {
        user: "{{user2}}",
        content: {
          text: "Let me check my crafting level and what I'm currently working on."
        }
      } as ActionExample
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Make sapphire ring"
        }
      } as ActionExample,
      {
        user: "{{user2}}",
        content: {
          text: "I'll craft sapphire ring! I need gold bar, sapphire, and a ring mould."
        }
      } as ActionExample
    ]
  ] as ActionExample[][]
};

interface CraftingCommand {
  action: 'craft' | 'tan' | 'spin' | 'stop' | 'check';
  itemType?: string;
  category?: string;
  hideType?: string;
  quantity?: number;
}

function parseCraftingCommand(text: string): CraftingCommand | null {
  text = text.toLowerCase().trim();

  // Stop crafting patterns
  if (text.includes('stop craft') || text.includes('quit craft') || text.includes('end craft')) {
    return { action: 'stop' };
  }

  // Check crafting patterns
  if (text.includes('check craft') || text.includes('crafting level') || 
      text.includes('crafting progress') || text.includes('crafting status')) {
    return { action: 'check' };
  }

  // Tanning patterns
  if (text.includes('tan')) {
    const hideType = extractHideType(text);
    return { action: 'tan', hideType };
  }

  // Spinning patterns
  if (text.includes('spin wool') || text.includes('spin string') || text.includes('spin flax')) {
    return { action: 'spin' };
  }

  // Crafting patterns
  if (text.includes('craft') || text.includes('make') || text.includes('create')) {
    const itemInfo = extractCraftingItem(text);
    if (itemInfo) {
      return { 
        action: 'craft', 
        itemType: itemInfo.itemType,
        category: itemInfo.category
      };
    }
    return { action: 'craft' };
  }

  return null;
}

function extractHideType(text: string): string | undefined {
  const hideTypes = [
    'cow', 'bear', 'yak', 'snake', 'green', 'blue', 'red', 'black'
  ];

  for (const hideType of hideTypes) {
    if (text.includes(hideType)) {
      return hideType;
    }
  }

  return 'cow'; // Default to cow hide
}

function extractCraftingItem(text: string): { itemType: string, category: string } | undefined {
  // Map common item names to recipe IDs and categories
  const itemMap: Record<string, { itemType: string, category: string }> = {
    // Leather items
    'leather gloves': { itemType: 'leather_gloves', category: 'leather' },
    'leather boots': { itemType: 'leather_boots', category: 'leather' },
    'leather cowl': { itemType: 'leather_cowl', category: 'leather' },
    'leather vambraces': { itemType: 'leather_vambraces', category: 'leather' },
    'leather body': { itemType: 'leather_body', category: 'leather' },
    'leather chaps': { itemType: 'leather_chaps', category: 'leather' },
    
    // Pottery
    'pot': { itemType: 'pot', category: 'pottery' },
    'pottery pot': { itemType: 'pot', category: 'pottery' },
    'pie dish': { itemType: 'pie_dish', category: 'pottery' },
    'bowl': { itemType: 'bowl', category: 'pottery' },
    'pottery bowl': { itemType: 'bowl', category: 'pottery' },
    
    // Jewelry
    'gold ring': { itemType: 'gold_ring', category: 'jewelry' },
    'sapphire ring': { itemType: 'sapphire_ring', category: 'jewelry' },
    'emerald ring': { itemType: 'emerald_ring', category: 'jewelry' },
    'ruby ring': { itemType: 'ruby_ring', category: 'jewelry' },
    'diamond ring': { itemType: 'diamond_ring', category: 'jewelry' },
    
    // Spinning
    'ball of wool': { itemType: 'ball_of_wool', category: 'spinning' },
    'wool ball': { itemType: 'ball_of_wool', category: 'spinning' },
    'bow string': { itemType: 'bow_string', category: 'spinning' },
    'bowstring': { itemType: 'bow_string', category: 'spinning' },
    
    // Weaving
    'strip of cloth': { itemType: 'strip_of_cloth', category: 'weaving' },
    'cloth strip': { itemType: 'strip_of_cloth', category: 'weaving' },
    'empty sack': { itemType: 'empty_sack', category: 'weaving' },
    'sack': { itemType: 'empty_sack', category: 'weaving' },
    
    // Glassblowing
    'beer glass': { itemType: 'beer_glass', category: 'glassblowing' },
    'glass': { itemType: 'beer_glass', category: 'glassblowing' },
    'vial': { itemType: 'vial', category: 'glassblowing' },
  };

  // Try exact matches first
  for (const [itemName, itemInfo] of Object.entries(itemMap)) {
    if (text.includes(itemName)) {
      return itemInfo;
    }
  }

  // Try pattern matching for generic items
  if (text.includes('gloves')) {
    return { itemType: 'leather_gloves', category: 'leather' };
  }
  if (text.includes('boots')) {
    return { itemType: 'leather_boots', category: 'leather' };
  }
  if (text.includes('ring')) {
    return { itemType: 'gold_ring', category: 'jewelry' };
  }
  if (text.includes('pot') && text.includes('pottery')) {
    return { itemType: 'pot', category: 'pottery' };
  }
  if (text.includes('bowl')) {
    return { itemType: 'bowl', category: 'pottery' };
  }
  if (text.includes('wool')) {
    return { itemType: 'ball_of_wool', category: 'spinning' };
  }

  return undefined;
}

function generateCraftingStatus(world: any, playerId: string): string {
  try {
    // Get crafting system from world
    const craftingSystem = world.systems?.find((s: any) => s.name === 'CraftingSystem');
    
    if (!craftingSystem) {
      return "The crafting system isn't available right now.";
    }

    const isCurrentlyCrafting = craftingSystem.isPlayerCrafting(playerId);
    const activeActions = craftingSystem.getActiveActions();
    const playerAction = activeActions.get(playerId);

    let status = '';

    if (isCurrentlyCrafting && playerAction) {
      const craftingRecipes = craftingSystem.getCraftingRecipes();
      const recipe = craftingRecipes.get(playerAction.recipeId);
      
      status += `I'm currently crafting ${recipe?.name || 'unknown item'}.\\n`;
      status += `Progress: ${playerAction.completed}/${playerAction.quantity} items\\n`;
      status += `XP gained: ${playerAction.xpGained}\\n`;
      
      if (recipe) {
        const successChance = craftingSystem.getSuccessChance(playerId, recipe.id);
        status += `Success chance: ${successChance.toFixed(1)}%\\n`;
      }
      
      const timeRemaining = (playerAction.startTime + playerAction.duration) - Date.now();
      if (timeRemaining > 0) {
        status += `Time remaining: ${(timeRemaining / 1000).toFixed(1)}s`;
      }
    } else {
      const stations = craftingSystem.getCraftingStations();
      const availableStations = Array.from(stations.values()).filter((s: any) => !s.inUse);
      const stationTypes = [...new Set(availableStations.map((s: any) => s.type))];
      
      status = `I'm not currently crafting.\\n`;
      status += `Available station types: ${stationTypes.join(', ')}\\n`;
      status += `I can craft leather goods, pottery, jewelry, spin materials, and weave!`;
    }

    return status;
  } catch (error) {
    return "I couldn't check my crafting status right now.";
  }
}