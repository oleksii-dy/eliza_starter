/**
 * Smithing Actions for Agent Interaction
 * =====================================
 * Natural language interface for AI agents to interact with the smithing system
 */

import { ActionExample, IAgentRuntime, Memory, State, type Action } from '@elizaos/core';

export const hyperfySmithingAction: Action = {
  name: 'HYPERFY_SMITHING',
  similes: [
    'SMELT',
    'SMITH',
    'FORGE',
    'CRAFT_METAL',
    'MAKE_BAR',
    'MAKE_WEAPON',
    'MAKE_ARMOUR',
    'SMITHING_ACTION'
  ],
  description: 'Smelt ores into bars and smith equipment in the RuneScape world using furnaces and anvils',
  
  validate: async (runtime: IAgentRuntime, message: Memory) => {
    const text = message.content.text?.toLowerCase() || '';
    
    // Check for smithing-related keywords
    const smithingKeywords = [
      'smelt', 'smith', 'forge', 'furnace', 'anvil', 'bar', 'hammer',
      'bronze', 'iron', 'steel', 'mithril', 'adamant', 'rune',
      'weapon', 'sword', 'dagger', 'armour', 'helm', 'smithing'
    ];
    
    const hasKeyword = smithingKeywords.some(keyword => text.includes(keyword));
    
    if (!hasKeyword) {
      return false;
    }

    // Additional validation: check if player has smithing capability
    try {
      const hyperfyService = runtime.getService('hyperfy');
      if (!hyperfyService) {
        return false;
      }

      const world = (hyperfyService as any).getWorld();
      const playerId = runtime.character?.name || 'agent';
      const smithingSystem = world.systems?.find((s: any) => s.name === 'SmithingSystem');
      
      if (!smithingSystem) {
        return false;
      }

      // Check if there are available furnaces/anvils nearby
      if (text.includes('smelt') || text.includes('bar')) {
        const furnaces = smithingSystem.getFurnaces();
        const availableFurnace = Array.from(furnaces.values()).find((f: any) => !f.inUse);
        return !!availableFurnace;
      }
      
      if (text.includes('smith') || text.includes('forge') || text.includes('weapon') || text.includes('armour')) {
        const anvils = smithingSystem.getAnvils();
        const availableAnvil = Array.from(anvils.values()).find((a: any) => !a.inUse);
        return !!availableAnvil;
      }

      return true;
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
      // Parse smithing command
      const smithingCommand = parseSmithingCommand(text);
      
      if (!smithingCommand) {
        callback({
          text: "I don't understand that smithing command. Try 'smelt bronze bar' or 'smith iron sword'.",
          action: 'SMITHING_HELP'
        });
        return;
      }

      // Get world service to emit smithing events
      const hyperfyService = runtime.getService('hyperfy');
      if (!hyperfyService) {
        callback({
          text: "Hyperfy service not available for smithing actions.",
          action: 'SERVICE_ERROR'
        });
        return;
      }

      const world = (hyperfyService as any).getWorld();
      const playerId = runtime.character?.name || 'agent';
      const smithingSystem = world.systems?.find((s: any) => s.name === 'SmithingSystem');

      if (!smithingSystem) {
        callback({
          text: "Smithing system not available.",
          action: 'SYSTEM_ERROR'
        });
        return;
      }

      let responseText = '';
      let actionType = '';

      switch (smithingCommand.action) {
        case 'smelt':
          if (smithingCommand.itemType) {
            // Validate smelting capability
            const validation = smithingSystem.canSmeltBar(playerId, smithingCommand.itemType);
            
            if (!validation.canSmelt) {
              callback({
                text: `I can't smelt ${smithingCommand.itemType} bars: ${validation.reason}`,
                action: 'SMITHING_INVALID'
              });
              return;
            }

            world.events.emit('rpg:smelt_ore', {
              playerId,
              barType: smithingCommand.itemType
            });
            responseText = `I'll smelt some ${smithingCommand.itemType} bars! Heading to the furnace...`;
            actionType = 'START_SMELTING';
          } else {
            responseText = "What type of bar should I smelt? Try specifying bronze, iron, steel, etc.";
            actionType = 'SMITHING_CLARIFY';
          }
          break;

        case 'smith':
          if (smithingCommand.itemType) {
            // Validate smithing capability
            const validation = smithingSystem.canSmithItem(playerId, smithingCommand.itemType);
            
            if (!validation.canSmith) {
              callback({
                text: `I can't smith ${smithingCommand.itemType}: ${validation.reason}`,
                action: 'SMITHING_INVALID'
              });
              return;
            }

            world.events.emit('rpg:smith_item', {
              playerId,
              itemType: smithingCommand.itemType
            });
            responseText = `I'll smith a ${smithingCommand.itemType}! Let me get to the anvil with my hammer...`;
            actionType = 'START_SMITHING';
          } else {
            responseText = "What should I smith? Try specifying a weapon or armor piece.";
            actionType = 'SMITHING_CLARIFY';
          }
          break;

        case 'stop':
          world.events.emit('rpg:stop_smithing', { playerId });
          responseText = "I'll stop smithing and put away my tools.";
          actionType = 'STOP_SMITHING';
          break;

        case 'check':
          responseText = generateSmithingStatus(world, playerId);
          actionType = 'CHECK_SMITHING';
          break;

        default:
          responseText = "I'm not sure what smithing action you want me to perform.";
          actionType = 'SMITHING_UNKNOWN';
      }

      // Emit RPG event for smithing action
      world.events.emit('rpg:agent_action', {
        playerId,
        action: 'smithing',
        details: smithingCommand,
        timestamp: Date.now()
      });

      callback({
        text: responseText,
        action: actionType,
        metadata: {
          skill: 'smithing',
          command: smithingCommand,
          timestamp: Date.now()
        }
      });

    } catch (error) {
      console.error('Error in smithing action:', error);
      callback({
        text: "Something went wrong while trying to smith. Let me try again.",
        action: 'SMITHING_ERROR'
      });
    }
  },

  examples: [
    [
      {
        user: "{{user1}}",
        content: {
          text: "Smelt bronze bars"
        }
      } as ActionExample,
      {
        user: "{{user2}}",
        content: {
          text: "I'll smelt some bronze bars! Let me get copper and tin ore to the furnace."
        }
      } as ActionExample
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Smith iron sword"
        }
      } as ActionExample,
      {
        user: "{{user2}}",
        content: {
          text: "I'll forge an iron sword! Getting my hammer and iron bars ready."
        }
      } as ActionExample
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Make steel bars"
        }
      } as ActionExample,
      {
        user: "{{user2}}",
        content: {
          text: "I'll smelt steel bars! I need iron ore and coal for this."
        }
      } as ActionExample
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Forge bronze dagger"
        }
      } as ActionExample,
      {
        user: "{{user2}}",
        content: {
          text: "I'll smith a bronze dagger at the anvil! Just need one bronze bar."
        }
      } as ActionExample
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Stop smithing"
        }
      } as ActionExample,
      {
        user: "{{user2}}",
        content: {
          text: "Alright, I'll stop smithing and put away my tools."
        }
      } as ActionExample
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Check smithing progress"
        }
      } as ActionExample,
      {
        user: "{{user2}}",
        content: {
          text: "Let me check my smithing level and what I'm currently working on."
        }
      } as ActionExample
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Make mithril equipment"
        }
      } as ActionExample,
      {
        user: "{{user2}}",
        content: {
          text: "I'll work on mithril equipment! I need mithril bars and a high smithing level."
        }
      } as ActionExample
    ]
  ] as ActionExample[][]
};

interface SmithingCommand {
  action: 'smelt' | 'smith' | 'stop' | 'check';
  itemType?: string;
  material?: string;
  quantity?: number;
}

function parseSmithingCommand(text: string): SmithingCommand | null {
  text = text.toLowerCase().trim();

  // Stop smithing patterns
  if (text.includes('stop smith') || text.includes('quit smith') || text.includes('end smith')) {
    return { action: 'stop' };
  }

  // Check smithing patterns
  if (text.includes('check smith') || text.includes('smithing level') || 
      text.includes('smithing progress') || text.includes('smithing status')) {
    return { action: 'check' };
  }

  // Smelting patterns
  if (text.includes('smelt') || text.includes('make bar') || text.includes('create bar')) {
    const material = extractMaterial(text);
    if (material) {
      return { action: 'smelt', itemType: material };
    }
    return { action: 'smelt' };
  }

  // Smithing patterns
  if (text.includes('smith') || text.includes('forge') || text.includes('craft') || 
      text.includes('make weapon') || text.includes('make armour') || text.includes('make armor')) {
    const itemType = extractItemType(text);
    if (itemType) {
      return { action: 'smith', itemType };
    }
    return { action: 'smith' };
  }

  return null;
}

function extractMaterial(text: string): string | undefined {
  const materials = [
    'bronze', 'iron', 'steel', 'mithril', 'adamant', 'adamantite', 'rune', 'runite'
  ];

  for (const material of materials) {
    if (text.includes(material)) {
      // Normalize adamantite to adamant for consistency
      return material === 'adamantite' ? 'adamant' : 
             material === 'runite' ? 'rune' : material;
    }
  }

  return undefined;
}

function extractItemType(text: string): string | undefined {
  // Map common item names to recipe IDs
  const itemMap: Record<string, string> = {
    // Bronze items
    'bronze dagger': 'bronze_dagger',
    'bronze sword': 'bronze_sword',
    'bronze helm': 'bronze_full_helm',
    'bronze full helm': 'bronze_full_helm',
    
    // Iron items
    'iron dagger': 'iron_dagger',
    'iron sword': 'iron_sword',
    
    // Steel items
    'steel dagger': 'steel_dagger',
    'steel sword': 'steel_sword',
    
    // Mithril items
    'mithril dagger': 'mithril_dagger',
    
    // Adamant items
    'adamant dagger': 'adamant_dagger',
    'adamantite dagger': 'adamant_dagger',
    
    // Rune items
    'rune dagger': 'rune_dagger',
    'runite dagger': 'rune_dagger',
  };

  // Try exact matches first
  for (const [itemName, recipeId] of Object.entries(itemMap)) {
    if (text.includes(itemName)) {
      return recipeId;
    }
  }

  // Try pattern matching for generic items
  const material = extractMaterial(text);
  if (material) {
    if (text.includes('dagger')) {
      return `${material}_dagger`;
    }
    if (text.includes('sword')) {
      return `${material}_sword`;
    }
    if (text.includes('helm')) {
      return `${material}_full_helm`;
    }
  }

  return undefined;
}

function generateSmithingStatus(world: any, playerId: string): string {
  try {
    // Get smithing system from world
    const smithingSystem = world.systems?.find((s: any) => s.name === 'SmithingSystem');
    
    if (!smithingSystem) {
      return "The smithing system isn't available right now.";
    }

    const isCurrentlySmithing = smithingSystem.isPlayerSmithing(playerId);
    const activeActions = smithingSystem.getActiveActions();
    const playerAction = activeActions.get(playerId);

    let status = '';

    if (isCurrentlySmithing && playerAction) {
      const smeltingRecipes = smithingSystem.getSmeltingRecipes();
      const smithingRecipes = smithingSystem.getSmithingRecipes();
      const recipe = smeltingRecipes.get(playerAction.recipeId) || smithingRecipes.get(playerAction.recipeId);
      
      status += `I'm currently ${playerAction.recipeId.includes('bar') ? 'smelting' : 'smithing'} ${recipe?.name || 'unknown item'}.\n`;
      status += `Progress: ${playerAction.completed}/${playerAction.quantity} items\n`;
      status += `XP gained: ${playerAction.xpGained}\n`;
      
      const timeRemaining = (playerAction.startTime + playerAction.duration) - Date.now();
      if (timeRemaining > 0) {
        status += `Time remaining: ${(timeRemaining / 1000).toFixed(1)}s`;
      }
    } else {
      const furnaces = smithingSystem.getFurnaces();
      const anvils = smithingSystem.getAnvils();
      const availableFurnaces = Array.from(furnaces.values()).filter((f: any) => !f.inUse).length;
      const availableAnvils = Array.from(anvils.values()).filter((a: any) => !a.inUse).length;
      
      status = `I'm not currently smithing.\n`;
      status += `Available furnaces: ${availableFurnaces}\n`;
      status += `Available anvils: ${availableAnvils}\n`;
      status += `I can smelt ores into bars or smith equipment!`;
    }

    return status;
  } catch (error) {
    return "I couldn't check my smithing status right now.";
  }
}