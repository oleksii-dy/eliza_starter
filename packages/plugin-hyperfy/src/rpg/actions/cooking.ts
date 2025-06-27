/**
 * Cooking Actions for Agent Interaction
 * ====================================
 * Natural language interface for AI agents to interact with the cooking system
 */

import { ActionExample, IAgentRuntime, Memory, State, type Action } from '@elizaos/core';

export const hyperfyCookingAction: Action = {
  name: 'HYPERFY_COOKING',
  similes: [
    'COOK',
    'PREPARE_FOOD',
    'FRY',
    'GRILL',
    'ROAST',
    'BAKE',
    'HEAT_FOOD',
    'COOKING_ACTION'
  ],
  description: 'Cook raw food into edible meals using fires or ranges in the RuneScape world',
  
  validate: async (runtime: IAgentRuntime, message: Memory) => {
    const text = message.content.text?.toLowerCase() || '';
    
    // Check for cooking-related keywords
    const cookingKeywords = [
      'cook', 'cooking', 'prepare', 'fry', 'grill', 'roast', 'bake', 'heat',
      'fish', 'meat', 'food', 'shrimp', 'salmon', 'tuna', 'lobster', 'shark',
      'range', 'fire', 'stove', 'raw', 'burn', 'burnt'
    ];
    
    const hasKeyword = cookingKeywords.some(keyword => text.includes(keyword));
    
    if (!hasKeyword) {
      return false;
    }

    // Additional validation: check if player has cooking capability
    try {
      const hyperfyService = runtime.getService('hyperfy');
      if (!hyperfyService) {
        return false;
      }

      const world = (hyperfyService as any).getWorld();
      const playerId = runtime.character?.name || 'agent';
      const cookingSystem = world.systems?.find((s: any) => s.name === 'CookingSystem');
      
      if (!cookingSystem) {
        return false;
      }

      // Check if there are available cooking stations nearby
      if (text.includes('range') || text.includes('stove')) {
        const ranges = cookingSystem.getRanges();
        const availableRange = Array.from(ranges.values()).find((r: any) => !r.inUse);
        return !!availableRange;
      }
      
      if (text.includes('fire')) {
        const fires = cookingSystem.getFires();
        const availableFire = Array.from(fires.values()).find((f: any) => !f.inUse);
        return !!availableFire;
      }

      // Check if player has any raw food to cook
      const recipes = cookingSystem.getCookingRecipes();
      for (const recipe of recipes.values()) {
        const validation = cookingSystem.canCookFood(playerId, recipe.id, 'fire');
        if (validation.canCook) {
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
      // Parse cooking command
      const cookingCommand = parseCookingCommand(text);
      
      if (!cookingCommand) {
        callback({
          text: "I don't understand that cooking command. Try 'cook salmon on fire' or 'prepare shrimp on range'.",
          action: 'COOKING_HELP'
        });
        return;
      }

      // Get world service to emit cooking events
      const hyperfyService = runtime.getService('hyperfy');
      if (!hyperfyService) {
        callback({
          text: "Hyperfy service not available for cooking actions.",
          action: 'SERVICE_ERROR'
        });
        return;
      }

      const world = (hyperfyService as any).getWorld();
      const playerId = runtime.character?.name || 'agent';
      const cookingSystem = world.systems?.find((s: any) => s.name === 'CookingSystem');

      if (!cookingSystem) {
        callback({
          text: "Cooking system not available.",
          action: 'SYSTEM_ERROR'
        });
        return;
      }

      let responseText = '';
      let actionType = '';

      switch (cookingCommand.action) {
        case 'cook':
          if (cookingCommand.foodType && cookingCommand.method) {
            // Validate cooking capability
            const validation = cookingSystem.canCookFood(playerId, cookingCommand.foodType, cookingCommand.method);
            
            if (!validation.canCook) {
              callback({
                text: `I can't cook ${cookingCommand.foodType} on ${cookingCommand.method}: ${validation.reason}`,
                action: 'COOKING_INVALID'
              });
              return;
            }

            // Check burn chance
            const burnChance = cookingSystem.getBurnChance(playerId, cookingCommand.foodType);

            world.events.emit('rpg:cook_food', {
              playerId,
              foodType: cookingCommand.foodType,
              method: cookingCommand.method
            });
            
            responseText = `I'll cook ${cookingCommand.foodType} on the ${cookingCommand.method}! `;
            if (burnChance > 20) {
              responseText += `There's a ${burnChance.toFixed(1)}% chance I might burn it.`;
            } else {
              responseText += `I should cook this successfully with my skill level.`;
            }
            actionType = 'START_COOKING';
          } else {
            responseText = "What food should I cook and where? Try specifying like 'cook salmon on fire'.";
            actionType = 'COOKING_CLARIFY';
          }
          break;

        case 'stop':
          world.events.emit('rpg:stop_cooking', { playerId });
          responseText = "I'll stop cooking and clean up.";
          actionType = 'STOP_COOKING';
          break;

        case 'check':
          responseText = generateCookingStatus(world, playerId);
          actionType = 'CHECK_COOKING';
          break;

        case 'light_fire':
          world.events.emit('rpg:light_fire', { 
            playerId,
            position: { x: 0, y: 0, z: 0 } // Could be calculated from player position
          });
          responseText = "I'll light a fire for cooking!";
          actionType = 'LIGHT_FIRE';
          break;

        default:
          responseText = "I'm not sure what cooking action you want me to perform.";
          actionType = 'COOKING_UNKNOWN';
      }

      // Emit RPG event for cooking action
      world.events.emit('rpg:agent_action', {
        playerId,
        action: 'cooking',
        details: cookingCommand,
        timestamp: Date.now()
      });

      callback({
        text: responseText,
        action: actionType,
        metadata: {
          skill: 'cooking',
          command: cookingCommand,
          timestamp: Date.now()
        }
      });

    } catch (error) {
      console.error('Error in cooking action:', error);
      callback({
        text: "Something went wrong while trying to cook. Let me try again.",
        action: 'COOKING_ERROR'
      });
    }
  },

  examples: [
    [
      {
        user: "{{user1}}",
        content: {
          text: "Cook salmon on fire"
        }
      } as ActionExample,
      {
        user: "{{user2}}",
        content: {
          text: "I'll cook salmon on the fire! I should cook this successfully with my skill level."
        }
      } as ActionExample
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Prepare shrimp on range"
        }
      } as ActionExample,
      {
        user: "{{user2}}",
        content: {
          text: "I'll cook shrimps on the range! There's a 15.0% chance I might burn it."
        }
      } as ActionExample
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Cook some tuna"
        }
      } as ActionExample,
      {
        user: "{{user2}}",
        content: {
          text: "I'll cook tuna on the fire! This should turn out perfectly with my cooking level."
        }
      } as ActionExample
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Stop cooking"
        }
      } as ActionExample,
      {
        user: "{{user2}}",
        content: {
          text: "I'll stop cooking and clean up."
        }
      } as ActionExample
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Check cooking progress"
        }
      } as ActionExample,
      {
        user: "{{user2}}",
        content: {
          text: "Let me check my cooking level and what I'm currently preparing."
        }
      } as ActionExample
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Light a fire for cooking"
        }
      } as ActionExample,
      {
        user: "{{user2}}",
        content: {
          text: "I'll light a fire for cooking!"
        }
      } as ActionExample
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Grill lobster"
        }
      } as ActionExample,
      {
        user: "{{user2}}",
        content: {
          text: "I'll cook lobster on the fire! This is high-level food that heals well."
        }
      } as ActionExample
    ]
  ] as ActionExample[][]
};

interface CookingCommand {
  action: 'cook' | 'stop' | 'check' | 'light_fire';
  foodType?: string;
  method?: 'fire' | 'range';
  quantity?: number;
}

function parseCookingCommand(text: string): CookingCommand | null {
  text = text.toLowerCase().trim();

  // Stop cooking patterns
  if (text.includes('stop cook') || text.includes('quit cook') || text.includes('end cook')) {
    return { action: 'stop' };
  }

  // Check cooking patterns
  if (text.includes('check cook') || text.includes('cooking level') || 
      text.includes('cooking progress') || text.includes('cooking status')) {
    return { action: 'check' };
  }

  // Light fire patterns
  if (text.includes('light fire') || text.includes('make fire') || text.includes('start fire')) {
    return { action: 'light_fire' };
  }

  // Cooking patterns
  if (text.includes('cook') || text.includes('prepare') || text.includes('fry') || 
      text.includes('grill') || text.includes('roast') || text.includes('bake')) {
    
    const foodType = extractFoodType(text);
    const method = extractCookingMethod(text);

    if (foodType) {
      return { 
        action: 'cook', 
        foodType, 
        method: method || 'fire' // Default to fire if no method specified
      };
    }
    return { action: 'cook' };
  }

  return null;
}

function extractFoodType(text: string): string | undefined {
  // Map common food names to recipe IDs
  const foodMap: Record<string, string> = {
    'shrimp': 'shrimps',
    'shrimps': 'shrimps',
    'sardine': 'sardine',
    'sardines': 'sardine',
    'herring': 'herring',
    'anchovies': 'anchovies',
    'anchovy': 'anchovies',
    'mackerel': 'mackerel',
    'trout': 'trout',
    'cod': 'cod',
    'pike': 'pike',
    'salmon': 'salmon',
    'tuna': 'tuna',
    'lobster': 'lobster',
    'bass': 'bass',
    'swordfish': 'swordfish',
    'monkfish': 'monkfish',
    'shark': 'shark',
  };

  // Try exact matches
  for (const [foodName, recipeId] of Object.entries(foodMap)) {
    if (text.includes(foodName)) {
      return recipeId;
    }
  }

  // Generic patterns
  if (text.includes('fish')) {
    // Default to trout for generic fish
    return 'trout';
  }

  return undefined;
}

function extractCookingMethod(text: string): 'fire' | 'range' | undefined {
  if (text.includes('range') || text.includes('stove') || text.includes('oven')) {
    return 'range';
  }
  
  if (text.includes('fire') || text.includes('flame') || text.includes('campfire')) {
    return 'fire';
  }

  return undefined;
}

function generateCookingStatus(world: any, playerId: string): string {
  try {
    // Get cooking system from world
    const cookingSystem = world.systems?.find((s: any) => s.name === 'CookingSystem');
    
    if (!cookingSystem) {
      return "The cooking system isn't available right now.";
    }

    const isCurrentlyCooking = cookingSystem.isPlayerCooking(playerId);
    const activeActions = cookingSystem.getActiveActions();
    const playerAction = activeActions.get(playerId);

    let status = '';

    if (isCurrentlyCooking && playerAction) {
      const cookingRecipes = cookingSystem.getCookingRecipes();
      const recipe = cookingRecipes.get(playerAction.recipeId);
      
      status += `I'm currently cooking ${recipe?.name || 'unknown food'}.\\n`;
      status += `Progress: ${playerAction.completed}/${playerAction.quantity} items\\n`;
      status += `XP gained: ${playerAction.xpGained}\\n`;
      
      if (recipe) {
        const burnChance = cookingSystem.getBurnChance(playerId, recipe.id);
        status += `Burn chance: ${burnChance.toFixed(1)}%\\n`;
      }
      
      const timeRemaining = (playerAction.startTime + playerAction.duration) - Date.now();
      if (timeRemaining > 0) {
        status += `Time remaining: ${(timeRemaining / 1000).toFixed(1)}s`;
      }
    } else {
      const ranges = cookingSystem.getRanges();
      const fires = cookingSystem.getFires();
      const availableRanges = Array.from(ranges.values()).filter((r: any) => !r.inUse).length;
      const availableFires = Array.from(fires.values()).filter((f: any) => !f.inUse).length;
      
      status = `I'm not currently cooking.\\n`;
      status += `Available ranges: ${availableRanges}\\n`;
      status += `Available fires: ${availableFires}\\n`;
      status += `I can cook raw food on fires or ranges!`;
    }

    return status;
  } catch (error) {
    return "I couldn't check my cooking status right now.";
  }
}