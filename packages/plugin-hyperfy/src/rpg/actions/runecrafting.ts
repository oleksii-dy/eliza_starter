/**
 * Runecrafting Actions for Agent Interaction
 * ==========================================
 * Natural language interface for AI agents to interact with the runecrafting system
 */

import { ActionExample, IAgentRuntime, Memory, State, type Action } from '@elizaos/core';

export const hyperfyRunecraftingAction: Action = {
  name: 'HYPERFY_RUNECRAFTING',
  similes: [
    'RUNECRAFTING',
    'CRAFT_RUNES',
    'MAKE_RUNES',
    'RUNECRAFT',
    'ALTAR',
    'ESSENCE',
    'TALISMAN',
    'RUNE_MAKING',
    'RUNECRAFTING_ACTION'
  ],
  description: 'Craft runes at altars using essence and talismans in the RuneScape world',
  
  validate: async (runtime: IAgentRuntime, message: Memory) => {
    const text = message.content.text?.toLowerCase() || '';
    
    // Check for runecrafting-related keywords
    const runecraftingKeywords = [
      'runecrafting', 'runecraft', 'runes', 'altar', 'essence', 'talisman',
      'air runes', 'water runes', 'earth runes', 'fire runes', 'mind runes',
      'body runes', 'cosmic runes', 'chaos runes', 'nature runes', 'law runes',
      'death runes', 'blood runes', 'soul runes', 'wrath runes',
      'pure essence', 'rune essence', 'craft runes', 'make runes'
    ];
    
    const hasKeyword = runecraftingKeywords.some(keyword => text.includes(keyword));
    
    if (!hasKeyword) {
      return false;
    }

    // Additional validation: check if player has runecrafting capability
    try {
      const hyperfyService = runtime.getService('hyperfy');
      if (!hyperfyService) {
        return false;
      }

      const world = (hyperfyService as any).getWorld();
      const playerId = runtime.character?.name || 'agent';
      const runecraftingSystem = world.systems?.find((s: any) => s.name === 'RunecraftingSystem');
      
      if (!runecraftingSystem) {
        return false;
      }

      // Check if player has any essence or can craft runes
      const recipes = runecraftingSystem.getRunecraftingRecipes();
      for (const recipe of recipes.values()) {
        const validation = runecraftingSystem.canCraftRunes(playerId, recipe.id);
        if (validation.canCraft) {
          return true;
        }
      }

      return true; // Allow for general runecrafting queries
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
      // Parse runecrafting command
      const runecraftingCommand = parseRunecraftingCommand(text);
      
      if (!runecraftingCommand) {
        callback({
          text: "I don't understand that runecrafting command. Try 'craft air runes' or 'make nature runes'.",
          action: 'RUNECRAFTING_HELP'
        });
        return;
      }

      // Get world service to emit runecrafting events
      const hyperfyService = runtime.getService('hyperfy');
      if (!hyperfyService) {
        callback({
          text: "Hyperfy service not available for runecrafting actions.",
          action: 'SERVICE_ERROR'
        });
        return;
      }

      const world = (hyperfyService as any).getWorld();
      const playerId = runtime.character?.name || 'agent';
      const runecraftingSystem = world.systems?.find((s: any) => s.name === 'RunecraftingSystem');

      if (!runecraftingSystem) {
        callback({
          text: "Runecrafting system not available.",
          action: 'SYSTEM_ERROR'
        });
        return;
      }

      let responseText = '';
      let actionType = '';

      switch (runecraftingCommand.action) {
        case 'craft_runes':
          if (runecraftingCommand.runeType) {
            // Validate runecrafting capability
            const validation = runecraftingSystem.canCraftRunes(playerId, runecraftingCommand.runeType);
            
            if (!validation.canCraft) {
              callback({
                text: `I can't craft ${runecraftingCommand.runeType.replace(/_/g, ' ')}: ${validation.reason}`,
                action: 'RUNECRAFTING_INVALID'
              });
              return;
            }

            // Check rune quantity at current level
            const quantity = runecraftingSystem.getRuneQuantityAtLevel(playerId, runecraftingCommand.runeType);

            world.events.emit('rpg:craft_runes', {
              playerId,
              runeType: runecraftingCommand.runeType
            });
            
            responseText = `I'll craft ${runecraftingCommand.runeType.replace(/_/g, ' ')}! `;
            if (quantity > 1) {
              responseText += `At my level, I'll create ${quantity} runes per essence.`;
            } else {
              responseText += `This will create 1 rune per essence.`;
            }
            actionType = 'START_RUNECRAFTING';
          } else {
            responseText = "What runes should I craft? Try specifying like 'craft air runes' or 'make nature runes'.";
            actionType = 'RUNECRAFTING_CLARIFY';
          }
          break;

        case 'enter_altar':
          if (runecraftingCommand.altarType) {
            world.events.emit('rpg:enter_altar', {
              playerId,
              altarId: `${runecraftingCommand.altarType}_altar`
            });
            responseText = `I'll enter the ${runecraftingCommand.altarType} altar to craft runes!`;
            actionType = 'ENTER_ALTAR';
          } else {
            responseText = "Which altar should I enter?";
            actionType = 'RUNECRAFTING_CLARIFY';
          }
          break;

        case 'exit_altar':
          world.events.emit('rpg:exit_altar', {
            playerId,
            altarId: runecraftingCommand.altarType ? `${runecraftingCommand.altarType}_altar` : 'current_altar'
          });
          responseText = "I'll exit the altar and return to the overworld.";
          actionType = 'EXIT_ALTAR';
          break;

        case 'stop':
          world.events.emit('rpg:stop_runecrafting', { playerId });
          responseText = "I'll stop runecrafting and clean up.";
          actionType = 'STOP_RUNECRAFTING';
          break;

        case 'check':
          responseText = generateRunecraftingStatus(world, playerId);
          actionType = 'CHECK_RUNECRAFTING';
          break;

        default:
          responseText = "I'm not sure what runecrafting action you want me to perform.";
          actionType = 'RUNECRAFTING_UNKNOWN';
      }

      // Emit RPG event for runecrafting action
      world.events.emit('rpg:agent_action', {
        playerId,
        action: 'runecrafting',
        details: runecraftingCommand,
        timestamp: Date.now()
      });

      callback({
        text: responseText,
        action: actionType,
        metadata: {
          skill: 'runecrafting',
          command: runecraftingCommand,
          timestamp: Date.now()
        }
      });

    } catch (error) {
      console.error('Error in runecrafting action:', error);
      callback({
        text: "Something went wrong while trying to runecraft. Let me try again.",
        action: 'RUNECRAFTING_ERROR'
      });
    }
  },

  examples: [
    [
      {
        user: "{{user1}}",
        content: {
          text: "Craft air runes"
        }
      } as ActionExample,
      {
        user: "{{user2}}",
        content: {
          text: "I'll craft air runes! At my level, I'll create 2 runes per essence."
        }
      } as ActionExample
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Make nature runes"
        }
      } as ActionExample,
      {
        user: "{{user2}}",
        content: {
          text: "I'll craft nature runes! This will create 1 rune per essence."
        }
      } as ActionExample
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Enter fire altar"
        }
      } as ActionExample,
      {
        user: "{{user2}}",
        content: {
          text: "I'll enter the fire altar to craft runes!"
        }
      } as ActionExample
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Craft cosmic runes"
        }
      } as ActionExample,
      {
        user: "{{user2}}",
        content: {
          text: "I'll craft cosmic runes! This will create 1 rune per essence."
        }
      } as ActionExample
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Make death runes"
        }
      } as ActionExample,
      {
        user: "{{user2}}",
        content: {
          text: "I'll craft death runes! This requires pure essence and high runecrafting level."
        }
      } as ActionExample
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Stop runecrafting"
        }
      } as ActionExample,
      {
        user: "{{user2}}",
        content: {
          text: "I'll stop runecrafting and clean up."
        }
      } as ActionExample
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Check runecrafting progress"
        }
      } as ActionExample,
      {
        user: "{{user2}}",
        content: {
          text: "Let me check my runecrafting level and what I'm currently doing."
        }
      } as ActionExample
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Craft law runes"
        }
      } as ActionExample,
      {
        user: "{{user2}}",
        content: {
          text: "I'll craft law runes! This requires pure essence and access to the law altar."
        }
      } as ActionExample
    ]
  ] as ActionExample[][]
};

interface RunecraftingCommand {
  action: 'craft_runes' | 'enter_altar' | 'exit_altar' | 'stop' | 'check';
  runeType?: string;
  altarType?: string;
  quantity?: number;
}

function parseRunecraftingCommand(text: string): RunecraftingCommand | null {
  text = text.toLowerCase().trim();

  // Stop runecrafting patterns
  if (text.includes('stop runecrafting') || text.includes('quit runecrafting') || text.includes('end runecrafting')) {
    return { action: 'stop' };
  }

  // Check runecrafting patterns
  if (text.includes('check runecrafting') || text.includes('runecrafting level') || 
      text.includes('runecrafting progress') || text.includes('runecrafting status')) {
    return { action: 'check' };
  }

  // Enter altar patterns
  if (text.includes('enter') && text.includes('altar')) {
    const altarType = extractAltarType(text);
    return { action: 'enter_altar', altarType };
  }

  // Exit altar patterns
  if (text.includes('exit') && text.includes('altar')) {
    const altarType = extractAltarType(text);
    return { action: 'exit_altar', altarType };
  }

  // Craft runes patterns
  if (text.includes('craft') || text.includes('make') || text.includes('create')) {
    const runeType = extractRuneType(text);
    if (runeType) {
      return { action: 'craft_runes', runeType };
    }
    return { action: 'craft_runes' };
  }

  return null;
}

function extractRuneType(text: string): string | undefined {
  // Map common rune names to recipe IDs
  const runeMap: Record<string, string> = {
    'air runes': 'air_runes',
    'air rune': 'air_runes',
    'air': 'air_runes',
    'mind runes': 'mind_runes',
    'mind rune': 'mind_runes',
    'mind': 'mind_runes',
    'water runes': 'water_runes',
    'water rune': 'water_runes',
    'water': 'water_runes',
    'earth runes': 'earth_runes',
    'earth rune': 'earth_runes',
    'earth': 'earth_runes',
    'fire runes': 'fire_runes',
    'fire rune': 'fire_runes',
    'fire': 'fire_runes',
    'body runes': 'body_runes',
    'body rune': 'body_runes',
    'body': 'body_runes',
    'cosmic runes': 'cosmic_runes',
    'cosmic rune': 'cosmic_runes',
    'cosmic': 'cosmic_runes',
    'chaos runes': 'chaos_runes',
    'chaos rune': 'chaos_runes',
    'chaos': 'chaos_runes',
    'nature runes': 'nature_runes',
    'nature rune': 'nature_runes',
    'nature': 'nature_runes',
    'law runes': 'law_runes',
    'law rune': 'law_runes',
    'law': 'law_runes',
    'death runes': 'death_runes',
    'death rune': 'death_runes',
    'death': 'death_runes',
    'blood runes': 'blood_runes',
    'blood rune': 'blood_runes',
    'blood': 'blood_runes',
    'soul runes': 'soul_runes',
    'soul rune': 'soul_runes',
    'soul': 'soul_runes',
    'wrath runes': 'wrath_runes',
    'wrath rune': 'wrath_runes',
    'wrath': 'wrath_runes',
  };

  // Try exact matches first
  for (const [runeName, recipeId] of Object.entries(runeMap)) {
    if (text.includes(runeName)) {
      return recipeId;
    }
  }

  return undefined;
}

function extractAltarType(text: string): string | undefined {
  // Map altar names to types
  const altarMap: Record<string, string> = {
    'air altar': 'air',
    'mind altar': 'mind',
    'water altar': 'water',
    'earth altar': 'earth',
    'fire altar': 'fire',
    'body altar': 'body',
    'cosmic altar': 'cosmic',
    'chaos altar': 'chaos',
    'nature altar': 'nature',
    'law altar': 'law',
    'death altar': 'death',
    'blood altar': 'blood',
    'soul altar': 'soul',
    'wrath altar': 'wrath',
  };

  for (const [altarName, altarType] of Object.entries(altarMap)) {
    if (text.includes(altarName)) {
      return altarType;
    }
  }

  // Try just the rune type
  if (text.includes('air')) return 'air';
  if (text.includes('mind')) return 'mind';
  if (text.includes('water')) return 'water';
  if (text.includes('earth')) return 'earth';
  if (text.includes('fire')) return 'fire';
  if (text.includes('body')) return 'body';
  if (text.includes('cosmic')) return 'cosmic';
  if (text.includes('chaos')) return 'chaos';
  if (text.includes('nature')) return 'nature';
  if (text.includes('law')) return 'law';
  if (text.includes('death')) return 'death';
  if (text.includes('blood')) return 'blood';
  if (text.includes('soul')) return 'soul';
  if (text.includes('wrath')) return 'wrath';

  return undefined;
}

function generateRunecraftingStatus(world: any, playerId: string): string {
  try {
    // Get runecrafting system from world
    const runecraftingSystem = world.systems?.find((s: any) => s.name === 'RunecraftingSystem');
    
    if (!runecraftingSystem) {
      return "The runecrafting system isn't available right now.";
    }

    const isCurrentlyRunecrafting = runecraftingSystem.isPlayerRunecrafting(playerId);
    const activeActions = runecraftingSystem.getActiveActions();
    const playerAction = activeActions.get(playerId);

    let status = '';

    if (isCurrentlyRunecrafting && playerAction) {
      const runecraftingRecipes = runecraftingSystem.getRunecraftingRecipes();
      const recipe = runecraftingRecipes.get(playerAction.recipeId);
      
      status += `I'm currently crafting ${recipe?.name || 'unknown runes'}.\\\\n`;
      status += `Progress: ${playerAction.completed}/${playerAction.quantity} batches\\\\n`;
      status += `XP gained: ${playerAction.xpGained}\\\\n`;
      
      if (recipe) {
        const quantity = runecraftingSystem.getRuneQuantityAtLevel(playerId, recipe.id);
        status += `Runes per essence: ${quantity}\\\\n`;
      }
      
      const timeRemaining = (playerAction.startTime + playerAction.duration) - Date.now();
      if (timeRemaining > 0) {
        status += `Time remaining: ${(timeRemaining / 1000).toFixed(1)}s\\\\n`;
      }
    } else {
      status = `I'm not currently runecrafting.\\\\n`;
    }

    // Show available recipes by essence type
    const runeRecipes = runecraftingSystem.getRecipesByEssenceType('rune');
    const pureRecipes = runecraftingSystem.getRecipesByEssenceType('pure');
    
    if (runeRecipes.length > 0) {
      status += `Available with rune essence: ${runeRecipes.map((r: any) => r.name).join(', ')}\\\\n`;
    }
    if (pureRecipes.length > 0) {
      status += `Available with pure essence: ${pureRecipes.map((r: any) => r.name).join(', ')}\\\\n`;
    }

    status += `I can craft runes at altars using essence and talismans!`;

    return status;
  } catch (error) {
    return "I couldn't check my runecrafting status right now.";
  }
}