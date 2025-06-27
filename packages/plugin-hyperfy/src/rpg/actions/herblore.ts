/**
 * Herblore Actions for Agent Interaction
 * =====================================
 * Natural language interface for AI agents to interact with the herblore system
 */

import { ActionExample, IAgentRuntime, Memory, State, type Action } from '@elizaos/core';

export const hyperfyHerbloreAction: Action = {
  name: 'HYPERFY_HERBLORE',
  similes: [
    'HERBLORE',
    'MAKE_POTION',
    'CLEAN_HERBS',
    'DRINK_POTION',
    'BREW',
    'MIX',
    'POTION_MAKING',
    'HERBLORE_ACTION'
  ],
  description: 'Make potions, clean herbs, and manage potion effects in the RuneScape world',
  
  validate: async (runtime: IAgentRuntime, message: Memory) => {
    const text = message.content.text?.toLowerCase() || '';
    
    // Check for herblore-related keywords
    const herbloreKeywords = [
      'herblore', 'potion', 'brew', 'mix', 'clean', 'herb', 'drink',
      'attack potion', 'strength potion', 'defence potion', 'prayer potion',
      'super attack', 'super strength', 'super defence', 'antipoison',
      'energy potion', 'ranging potion', 'magic potion', 'vial',
      'guam', 'marrentill', 'tarromin', 'harralander', 'ranarr', 'irit',
      'kwuarm', 'cadantine', 'dwarf weed', 'lantadyme', 'grimy'
    ];
    
    const hasKeyword = herbloreKeywords.some(keyword => text.includes(keyword));
    
    if (!hasKeyword) {
      return false;
    }

    // Additional validation: check if player has herblore capability
    try {
      const hyperfyService = runtime.getService('hyperfy');
      if (!hyperfyService) {
        return false;
      }

      const world = (hyperfyService as any).getWorld();
      const playerId = runtime.character?.name || 'agent';
      const herbloreSystem = world.systems?.find((s: any) => s.name === 'HerbloreSystem');
      
      if (!herbloreSystem) {
        return false;
      }

      // Check if player has any herblore materials or can make potions
      const recipes = herbloreSystem.getHerbloreRecipes();
      for (const recipe of recipes.values()) {
        const validation = herbloreSystem.canMakePotion(playerId, recipe.id);
        if (validation.canMake) {
          return true;
        }
      }

      return true; // Allow for herb cleaning even if can't make potions
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
      // Parse herblore command
      const herbloreCommand = parseHerbloreCommand(text);
      
      if (!herbloreCommand) {
        callback({
          text: "I don't understand that herblore command. Try 'make attack potion' or 'clean grimy herbs'.",
          action: 'HERBLORE_HELP'
        });
        return;
      }

      // Get world service to emit herblore events
      const hyperfyService = runtime.getService('hyperfy');
      if (!hyperfyService) {
        callback({
          text: "Hyperfy service not available for herblore actions.",
          action: 'SERVICE_ERROR'
        });
        return;
      }

      const world = (hyperfyService as any).getWorld();
      const playerId = runtime.character?.name || 'agent';
      const herbloreSystem = world.systems?.find((s: any) => s.name === 'HerbloreSystem');

      if (!herbloreSystem) {
        callback({
          text: "Herblore system not available.",
          action: 'SYSTEM_ERROR'
        });
        return;
      }

      let responseText = '';
      let actionType = '';

      switch (herbloreCommand.action) {
        case 'make_potion':
          if (herbloreCommand.potionType) {
            // Validate potion making capability
            const validation = herbloreSystem.canMakePotion(playerId, herbloreCommand.potionType);
            
            if (!validation.canMake) {
              callback({
                text: `I can't make ${herbloreCommand.potionType.replace(/_/g, ' ')}: ${validation.reason}`,
                action: 'HERBLORE_INVALID'
              });
              return;
            }

            // Check success chance
            const successChance = herbloreSystem.getSuccessChance(playerId, herbloreCommand.potionType);

            world.events.emit('rpg:make_potion', {
              playerId,
              potionType: herbloreCommand.potionType
            });
            
            responseText = `I'll make a ${herbloreCommand.potionType.replace(/_/g, ' ')}! `;
            if (successChance < 98) {
              responseText += `There's a ${successChance.toFixed(1)}% chance of success.`;
            } else {
              responseText += `This should brew successfully with my herblore level.`;
            }
            actionType = 'START_HERBLORE';
          } else {
            responseText = "What potion should I make? Try specifying like 'make attack potion' or 'brew strength potion'.";
            actionType = 'HERBLORE_CLARIFY';
          }
          break;

        case 'clean_herbs':
          world.events.emit('rpg:clean_herbs', {
            playerId,
            grimyHerbId: 199, // Default grimy guam
            quantity: herbloreCommand.quantity || 1
          });
          responseText = `I'll clean ${herbloreCommand.quantity || 1} grimy herbs!`;
          actionType = 'CLEAN_HERBS';
          break;

        case 'drink_potion':
          if (herbloreCommand.potionId) {
            world.events.emit('rpg:drink_potion', {
              playerId,
              potionId: herbloreCommand.potionId
            });
            responseText = `I'll drink the potion to gain its effects!`;
            actionType = 'DRINK_POTION';
          } else {
            responseText = "What potion should I drink?";
            actionType = 'HERBLORE_CLARIFY';
          }
          break;

        case 'stop':
          world.events.emit('rpg:stop_herblore', { playerId });
          responseText = "I'll stop making potions and clean up.";
          actionType = 'STOP_HERBLORE';
          break;

        case 'check':
          responseText = generateHerbloreStatus(world, playerId);
          actionType = 'CHECK_HERBLORE';
          break;

        default:
          responseText = "I'm not sure what herblore action you want me to perform.";
          actionType = 'HERBLORE_UNKNOWN';
      }

      // Emit RPG event for herblore action
      world.events.emit('rpg:agent_action', {
        playerId,
        action: 'herblore',
        details: herbloreCommand,
        timestamp: Date.now()
      });

      callback({
        text: responseText,
        action: actionType,
        metadata: {
          skill: 'herblore',
          command: herbloreCommand,
          timestamp: Date.now()
        }
      });

    } catch (error) {
      console.error('Error in herblore action:', error);
      callback({
        text: "Something went wrong while trying to do herblore. Let me try again.",
        action: 'HERBLORE_ERROR'
      });
    }
  },

  examples: [
    [
      {
        user: "{{user1}}",
        content: {
          text: "Make attack potion"
        }
      } as ActionExample,
      {
        user: "{{user2}}",
        content: {
          text: "I'll make a attack potion! This should brew successfully with my herblore level."
        }
      } as ActionExample
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Brew strength potion"
        }
      } as ActionExample,
      {
        user: "{{user2}}",
        content: {
          text: "I'll make a strength potion! I need clean tarromin and limpwurt root."
        }
      } as ActionExample
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Clean grimy herbs"
        }
      } as ActionExample,
      {
        user: "{{user2}}",
        content: {
          text: "I'll clean 1 grimy herbs!"
        }
      } as ActionExample
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Drink prayer potion"
        }
      } as ActionExample,
      {
        user: "{{user2}}",
        content: {
          text: "I'll drink the potion to gain its effects!"
        }
      } as ActionExample
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Make super strength"
        }
      } as ActionExample,
      {
        user: "{{user2}}",
        content: {
          text: "I'll make a super strength! This is high-level herblore requiring clean kwuarm."
        }
      } as ActionExample
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Stop herblore"
        }
      } as ActionExample,
      {
        user: "{{user2}}",
        content: {
          text: "I'll stop making potions and clean up."
        }
      } as ActionExample
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Check herblore progress"
        }
      } as ActionExample,
      {
        user: "{{user2}}",
        content: {
          text: "Let me check my herblore level and what I'm currently brewing."
        }
      } as ActionExample
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Make antipoison"
        }
      } as ActionExample,
      {
        user: "{{user2}}",
        content: {
          text: "I'll make a antipoison! This will protect against poison effects."
        }
      } as ActionExample
    ]
  ] as ActionExample[][]
};

interface HerbloreCommand {
  action: 'make_potion' | 'clean_herbs' | 'drink_potion' | 'stop' | 'check';
  potionType?: string;
  potionId?: number;
  quantity?: number;
}

function parseHerbloreCommand(text: string): HerbloreCommand | null {
  text = text.toLowerCase().trim();

  // Stop herblore patterns
  if (text.includes('stop herblore') || text.includes('quit herblore') || text.includes('end herblore')) {
    return { action: 'stop' };
  }

  // Check herblore patterns
  if (text.includes('check herblore') || text.includes('herblore level') || 
      text.includes('herblore progress') || text.includes('herblore status')) {
    return { action: 'check' };
  }

  // Clean herbs patterns
  if (text.includes('clean') && text.includes('herb')) {
    const quantity = extractQuantity(text);
    return { action: 'clean_herbs', quantity };
  }

  // Drink potion patterns
  if (text.includes('drink') && text.includes('potion')) {
    const potionId = extractPotionId(text);
    return { action: 'drink_potion', potionId };
  }

  // Make potion patterns
  if (text.includes('make') || text.includes('brew') || text.includes('mix') || text.includes('create')) {
    const potionType = extractPotionType(text);
    if (potionType) {
      return { action: 'make_potion', potionType };
    }
    return { action: 'make_potion' };
  }

  return null;
}

function extractPotionType(text: string): string | undefined {
  // Map common potion names to recipe IDs
  const potionMap: Record<string, string> = {
    'attack potion': 'attack_potion',
    'attack': 'attack_potion',
    'antipoison': 'antipoison',
    'strength potion': 'strength_potion',
    'strength': 'strength_potion',
    'energy potion': 'energy_potion',
    'energy': 'energy_potion',
    'defence potion': 'defence_potion',
    'defense potion': 'defence_potion',
    'defence': 'defence_potion',
    'defense': 'defence_potion',
    'prayer potion': 'prayer_potion',
    'prayer': 'prayer_potion',
    'super attack': 'super_attack',
    'super strength': 'super_strength',
    'super defence': 'super_defence',
    'super defense': 'super_defence',
    'ranging potion': 'ranging_potion',
    'range potion': 'ranging_potion',
    'ranging': 'ranging_potion',
    'magic potion': 'magic_potion',
    'magic': 'magic_potion',
  };

  // Try exact matches first
  for (const [potionName, recipeId] of Object.entries(potionMap)) {
    if (text.includes(potionName)) {
      return recipeId;
    }
  }

  // Pattern matching for super potions
  if (text.includes('super')) {
    if (text.includes('attack')) {
      return 'super_attack';
    }
    if (text.includes('strength')) {
      return 'super_strength';
    }
    if (text.includes('defence') || text.includes('defense')) {
      return 'super_defence';
    }
  }

  return undefined;
}

function extractPotionId(text: string): number | undefined {
  // Map potion names to item IDs for drinking
  const potionIds: Record<string, number> = {
    'attack': 2428,
    'antipoison': 2446,
    'strength': 113,
    'energy': 3010,
    'defence': 2432,
    'defense': 2432,
    'prayer': 2434,
    'super attack': 2436,
    'super strength': 2440,
    'super defence': 2442,
    'super defense': 2442,
    'ranging': 2444,
    'magic': 3040,
  };

  for (const [potionName, itemId] of Object.entries(potionIds)) {
    if (text.includes(potionName)) {
      return itemId;
    }
  }

  return undefined;
}

function extractQuantity(text: string): number | undefined {
  const quantityMatch = text.match(/(\d+)/);
  return quantityMatch ? parseInt(quantityMatch[1]) : undefined;
}

function generateHerbloreStatus(world: any, playerId: string): string {
  try {
    // Get herblore system from world
    const herbloreSystem = world.systems?.find((s: any) => s.name === 'HerbloreSystem');
    
    if (!herbloreSystem) {
      return "The herblore system isn't available right now.";
    }

    const isCurrentlyMaking = herbloreSystem.isPlayerMakingPotions(playerId);
    const activeActions = herbloreSystem.getActiveActions();
    const playerAction = activeActions.get(playerId);
    const activeEffects = herbloreSystem.getPlayerEffects(playerId);

    let status = '';

    if (isCurrentlyMaking && playerAction) {
      const herbloreRecipes = herbloreSystem.getHerbloreRecipes();
      const recipe = herbloreRecipes.get(playerAction.recipeId);
      
      status += `I'm currently making ${recipe?.name || 'unknown potion'}.\\n`;
      status += `Progress: ${playerAction.completed}/${playerAction.quantity} potions\\n`;
      status += `XP gained: ${playerAction.xpGained}\\n`;
      
      if (recipe) {
        const successChance = herbloreSystem.getSuccessChance(playerId, recipe.id);
        status += `Success chance: ${successChance.toFixed(1)}%\\n`;
      }
      
      const timeRemaining = (playerAction.startTime + playerAction.duration) - Date.now();
      if (timeRemaining > 0) {
        status += `Time remaining: ${(timeRemaining / 1000).toFixed(1)}s\\n`;
      }
    } else {
      status = `I'm not currently making potions.\\n`;
    }

    // Add active potion effects
    if (activeEffects.length > 0) {
      status += `Active potion effects:\\n`;
      activeEffects.forEach(effect => {
        const timeLeft = Math.max(0, effect.endTime - Date.now());
        if (timeLeft > 0) {
          status += `- ${effect.effect.skill || 'unknown'} ${effect.effect.type} (${(timeLeft / 1000).toFixed(0)}s left)\\n`;
        }
      });
    } else {
      status += `No active potion effects.\\n`;
    }

    status += `I can make potions, clean herbs, and drink potions for effects!`;

    return status;
  } catch (error) {
    return "I couldn't check my herblore status right now.";
  }
}