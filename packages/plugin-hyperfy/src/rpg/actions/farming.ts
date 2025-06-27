/**
 * Farming Actions for Agent Interaction
 * ====================================
 * Natural language interface for AI agents to interact with the farming system
 */

import { ActionExample, IAgentRuntime, Memory, State, type Action } from '@elizaos/core';

export const hyperfyFarmingAction: Action = {
  name: 'HYPERFY_FARMING',
  similes: [
    'FARMING',
    'PLANT',
    'HARVEST',
    'CROP',
    'SEED',
    'PATCH',
    'GROW',
    'WATER',
    'COMPOST',
    'FARMING_ACTION'
  ],
  description: 'Plant seeds, tend crops, and harvest produce from farming patches across the world',
  
  validate: async (runtime: IAgentRuntime, message: Memory) => {
    const text = message.content.text?.toLowerCase() || '';
    
    // Check for farming-related keywords
    const farmingKeywords = [
      'farming', 'plant', 'harvest', 'crop', 'seed', 'patch', 'grow', 'water', 'compost',
      'allotment', 'herb', 'tree', 'fruit tree', 'flower', 'farm',
      'potato', 'onion', 'cabbage', 'tomato', 'sweetcorn', 'strawberry', 'watermelon',
      'guam', 'marrentill', 'tarromin', 'harralander', 'ranarr', 'snapdragon', 'torstol',
      'oak', 'willow', 'maple', 'yew', 'apple', 'banana', 'orange', 'palm',
      'falador', 'catherby', 'ardougne', 'canifis', 'lumbridge', 'taverley', 'varrock',
      'gnome stronghold', 'brimhaven', 'trollheim', 'marigold', 'rosemary'
    ];
    
    const hasKeyword = farmingKeywords.some(keyword => text.includes(keyword));
    
    if (!hasKeyword) {
      return false;
    }

    // Additional validation: check if player has farming capability
    try {
      const hyperfyService = runtime.getService('hyperfy');
      if (!hyperfyService) {
        return false;
      }

      const world = (hyperfyService as any).getWorld();
      const playerId = runtime.character?.name || 'agent';
      const farmingSystem = world.systems?.find((s: any) => s.name === 'FarmingSystem');
      
      if (!farmingSystem) {
        return false;
      }

      return true; // Allow for general farming queries
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
      // Parse farming command
      const farmingCommand = parseFarmingCommand(text);
      
      if (!farmingCommand) {
        callback({
          text: "I don't understand that farming command. Try 'plant potato seed' or 'harvest crops'.",
          action: 'FARMING_HELP'
        });
        return;
      }

      // Get world service to emit farming events
      const hyperfyService = runtime.getService('hyperfy');
      if (!hyperfyService) {
        callback({
          text: "Hyperfy service not available for farming actions.",
          action: 'SERVICE_ERROR'
        });
        return;
      }

      const world = (hyperfyService as any).getWorld();
      const playerId = runtime.character?.name || 'agent';
      const farmingSystem = world.systems?.find((s: any) => s.name === 'FarmingSystem');

      if (!farmingSystem) {
        callback({
          text: "Farming system not available.",
          action: 'SYSTEM_ERROR'
        });
        return;
      }

      let responseText = '';
      let actionType = '';

      switch (farmingCommand.action) {
        case 'plant':
          if (farmingCommand.seedId && farmingCommand.patchId) {
            // Validate planting capability
            const validation = farmingSystem.canPlantSeed(playerId, farmingCommand.patchId, farmingCommand.seedId);
            
            if (!validation.canPlant) {
              callback({
                text: `I can't plant ${farmingCommand.seedId.replace(/_/g, ' ')} in ${farmingCommand.patchId.replace(/_/g, ' ')}: ${validation.reason}`,
                action: 'FARMING_INVALID'
              });
              return;
            }

            world.events.emit('rpg:plant_seed', {
              playerId,
              patchId: farmingCommand.patchId,
              seedId: farmingCommand.seedId
            });
            
            responseText = `I'll plant ${farmingCommand.seedId.replace(/_/g, ' ')} in the ${farmingCommand.patchId.replace(/_/g, ' ')}. Now I need to wait for it to grow!`;
            actionType = 'PLANT_SEED';
          } else if (farmingCommand.seedId) {
            // Find suitable patch for the seed
            const patches = farmingSystem.getFarmingPatches();
            const seeds = farmingSystem.getFarmingSeeds();
            const seed = seeds.get(farmingCommand.seedId);
            
            if (seed) {
              const suitablePatches = Array.from(patches.values()).filter(p => p.type === seed.patchType);
              if (suitablePatches.length > 0) {
                responseText = `I want to plant ${seed.name}. I can use these ${seed.patchType} patches: ${suitablePatches.map(p => p.name).join(', ')}.`;
              } else {
                responseText = `I want to plant ${seed.name} but there are no suitable ${seed.patchType} patches available.`;
              }
            } else {
              responseText = `I want to plant ${farmingCommand.seedId.replace(/_/g, ' ')} but I need to specify which patch to use.`;
            }
            actionType = 'FARMING_CLARIFY';
          } else {
            responseText = "What should I plant? Try 'plant potato seed' or 'plant guam seed'.";
            actionType = 'FARMING_CLARIFY';
          }
          break;

        case 'harvest':
          if (farmingCommand.patchId) {
            // Validate harvest capability
            const validation = farmingSystem.canHarvestCrop(playerId, farmingCommand.patchId);
            
            if (!validation.canHarvest) {
              callback({
                text: `I can't harvest from ${farmingCommand.patchId.replace(/_/g, ' ')}: ${validation.reason}`,
                action: 'FARMING_INVALID'
              });
              return;
            }

            world.events.emit('rpg:harvest_crop', {
              playerId,
              patchId: farmingCommand.patchId
            });
            
            responseText = `I'll harvest the crops from ${farmingCommand.patchId.replace(/_/g, ' ')}. Let's see what I've grown!`;
            actionType = 'HARVEST_CROP';
          } else {
            // Harvest all ready crops
            const playerCrops = farmingSystem.getPlayerCrops(playerId);
            const readyCrops = Array.from(playerCrops.entries()).filter(([_, crop]) => 
              crop.currentStage >= crop.maxStage && !crop.dead
            );
            
            if (readyCrops.length > 0) {
              responseText = `I'll harvest all my ready crops from: ${readyCrops.map(([patchId, _]) => patchId.replace(/_/g, ' ')).join(', ')}.`;
              actionType = 'HARVEST_ALL';
              
              // Emit harvest events for all ready crops
              readyCrops.forEach(([patchId, _]) => {
                world.events.emit('rpg:harvest_crop', {
                  playerId,
                  patchId
                });
              });
            } else {
              responseText = "I don't have any crops ready for harvest right now.";
              actionType = 'NO_HARVEST';
            }
          }
          break;

        case 'water':
          if (farmingCommand.patchId) {
            world.events.emit('rpg:water_crop', {
              playerId,
              patchId: farmingCommand.patchId
            });
            
            responseText = `I'll water the crop in ${farmingCommand.patchId.replace(/_/g, ' ')}. This should help it grow better!`;
            actionType = 'WATER_CROP';
          } else {
            // Water all crops
            const playerCrops = farmingSystem.getPlayerCrops(playerId);
            const cropsToWater = Array.from(playerCrops.entries()).filter(([_, crop]) => 
              !crop.dead && crop.waterLevel < 3
            );
            
            if (cropsToWater.length > 0) {
              responseText = `I'll water all my crops that need it: ${cropsToWater.map(([patchId, _]) => patchId.replace(/_/g, ' ')).join(', ')}.`;
              actionType = 'WATER_ALL';
              
              cropsToWater.forEach(([patchId, _]) => {
                world.events.emit('rpg:water_crop', {
                  playerId,
                  patchId
                });
              });
            } else {
              responseText = "All my crops are already well watered.";
              actionType = 'NO_WATERING_NEEDED';
            }
          }
          break;

        case 'compost':
          if (farmingCommand.patchId && farmingCommand.compostType) {
            world.events.emit('rpg:compost_patch', {
              playerId,
              patchId: farmingCommand.patchId,
              compostType: farmingCommand.compostType
            });
            
            responseText = `I'll apply ${farmingCommand.compostType} to ${farmingCommand.patchId.replace(/_/g, ' ')}. This should improve the yield!`;
            actionType = 'COMPOST_PATCH';
          } else {
            responseText = "Which patch should I compost? Try 'compost falador herb patch' or 'use supercompost on catherby allotment'.";
            actionType = 'FARMING_CLARIFY';
          }
          break;

        case 'clear':
          if (farmingCommand.patchId) {
            // Validate clear capability
            const validation = farmingSystem.canClearPatch(playerId, farmingCommand.patchId);
            
            if (!validation.canClear) {
              callback({
                text: `I can't clear ${farmingCommand.patchId.replace(/_/g, ' ')}: ${validation.reason}`,
                action: 'FARMING_INVALID'
              });
              return;
            }

            world.events.emit('rpg:clear_patch', {
              playerId,
              patchId: farmingCommand.patchId
            });
            
            responseText = `I'll clear the ${farmingCommand.patchId.replace(/_/g, ' ')}. This will remove any dead crops or weeds.`;
            actionType = 'CLEAR_PATCH';
          } else {
            responseText = "Which patch should I clear? Try 'clear falador allotment' or 'clear dead crops'.";
            actionType = 'FARMING_CLARIFY';
          }
          break;

        case 'check':
          responseText = generateFarmingStatus(world, playerId);
          actionType = 'CHECK_FARMING';
          break;

        default:
          responseText = "I'm not sure what farming action you want me to perform.";
          actionType = 'FARMING_UNKNOWN';
      }

      // Emit RPG event for farming action
      world.events.emit('rpg:agent_action', {
        playerId,
        action: 'farming',
        details: farmingCommand,
        timestamp: Date.now()
      });

      callback({
        text: responseText,
        action: actionType,
        metadata: {
          skill: 'farming',
          command: farmingCommand,
          timestamp: Date.now()
        }
      });

    } catch (error) {
      console.error('Error in farming action:', error);
      callback({
        text: "Something went wrong while trying to do farming. Let me try again.",
        action: 'FARMING_ERROR'
      });
    }
  },

  examples: [
    [
      {
        user: "{{user1}}",
        content: {
          text: "Plant potato seed"
        }
      } as ActionExample,
      {
        user: "{{user2}}",
        content: {
          text: "I want to plant potato seed. I can use these allotment patches: Falador Allotment (North), Falador Allotment (South), Catherby Allotment (North), Catherby Allotment (South)."
        }
      } as ActionExample
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Harvest crops"
        }
      } as ActionExample,
      {
        user: "{{user2}}",
        content: {
          text: "I'll harvest all my ready crops from: falador allotment north, catherby herb patch."
        }
      } as ActionExample
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Water my plants"
        }
      } as ActionExample,
      {
        user: "{{user2}}",
        content: {
          text: "I'll water all my crops that need it: falador herb patch, catherby allotment south."
        }
      } as ActionExample
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Plant guam seed in falador herb patch"
        }
      } as ActionExample,
      {
        user: "{{user2}}",
        content: {
          text: "I'll plant guam seed in the falador herb patch. Now I need to wait for it to grow!"
        }
      } as ActionExample
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Check farming progress"
        }
      } as ActionExample,
      {
        user: "{{user2}}",
        content: {
          text: "Let me check my farming patches and see how my crops are growing."
        }
      } as ActionExample
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Use supercompost on herb patch"
        }
      } as ActionExample,
      {
        user: "{{user2}}",
        content: {
          text: "Which patch should I compost? Try 'compost falador herb patch' or 'use supercompost on catherby allotment'."
        }
      } as ActionExample
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Clear dead crops"
        }
      } as ActionExample,
      {
        user: "{{user2}}",
        content: {
          text: "Which patch should I clear? Try 'clear falador allotment' or 'clear dead crops'."
        }
      } as ActionExample
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Plant oak sapling"
        }
      } as ActionExample,
      {
        user: "{{user2}}",
        content: {
          text: "I want to plant oak sapling. I can use these tree patches: Lumbridge Tree Patch, Falador Tree Patch, Taverley Tree Patch, Varrock Tree Patch."
        }
      } as ActionExample
    ]
  ] as ActionExample[][]
};

interface FarmingCommand {
  action: 'plant' | 'harvest' | 'water' | 'compost' | 'clear' | 'check';
  seedId?: string;
  patchId?: string;
  compostType?: string;
}

function parseFarmingCommand(text: string): FarmingCommand | null {
  text = text.toLowerCase().trim();

  // Check farming progress patterns
  if (text.includes('check farm') || text.includes('farming progress') || 
      text.includes('farming status') || text.includes('my crops') || text.includes('patch status')) {
    return { action: 'check' };
  }

  // Clear patterns
  if (text.includes('clear') && (text.includes('patch') || text.includes('dead') || text.includes('weed'))) {
    const patchId = extractPatchId(text);
    return { action: 'clear', patchId };
  }

  // Compost patterns
  if (text.includes('compost') || text.includes('use compost') || text.includes('apply compost')) {
    const patchId = extractPatchId(text);
    const compostType = extractCompostType(text);
    return { action: 'compost', patchId, compostType };
  }

  // Water patterns
  if (text.includes('water') && (text.includes('crop') || text.includes('plant') || text.includes('patch'))) {
    const patchId = extractPatchId(text);
    return { action: 'water', patchId };
  }

  // Harvest patterns
  if (text.includes('harvest') || text.includes('pick') || text.includes('collect crop')) {
    const patchId = extractPatchId(text);
    return { action: 'harvest', patchId };
  }

  // Plant patterns
  if (text.includes('plant') || text.includes('grow') || text.includes('sow')) {
    const seedId = extractSeedId(text);
    const patchId = extractPatchId(text);
    return { action: 'plant', seedId, patchId };
  }

  return null;
}

function extractSeedId(text: string): string | undefined {
  // Map seed names to IDs
  const seedMap: Record<string, string> = {
    'potato seed': 'potato_seed',
    'potato': 'potato_seed',
    'onion seed': 'onion_seed',
    'onion': 'onion_seed',
    'cabbage seed': 'cabbage_seed',
    'cabbage': 'cabbage_seed',
    'tomato seed': 'tomato_seed',
    'tomato': 'tomato_seed',
    'sweetcorn seed': 'sweetcorn_seed',
    'sweetcorn': 'sweetcorn_seed',
    'strawberry seed': 'strawberry_seed',
    'strawberry': 'strawberry_seed',
    'watermelon seed': 'watermelon_seed',
    'watermelon': 'watermelon_seed',
    'marigold seed': 'marigold_seed',
    'marigold': 'marigold_seed',
    'rosemary seed': 'rosemary_seed',
    'rosemary': 'rosemary_seed',
    'guam seed': 'guam_seed',
    'guam': 'guam_seed',
    'marrentill seed': 'marrentill_seed',
    'marrentill': 'marrentill_seed',
    'tarromin seed': 'tarromin_seed',
    'tarromin': 'tarromin_seed',
    'harralander seed': 'harralander_seed',
    'harralander': 'harralander_seed',
    'ranarr seed': 'ranarr_seed',
    'ranarr': 'ranarr_seed',
    'snapdragon seed': 'snapdragon_seed',
    'snapdragon': 'snapdragon_seed',
    'torstol seed': 'torstol_seed',
    'torstol': 'torstol_seed',
    'oak sapling': 'oak_sapling',
    'oak': 'oak_sapling',
    'willow sapling': 'willow_sapling',
    'willow': 'willow_sapling',
    'maple sapling': 'maple_sapling',
    'maple': 'maple_sapling',
    'yew sapling': 'yew_sapling',
    'yew': 'yew_sapling',
    'apple sapling': 'apple_sapling',
    'apple': 'apple_sapling',
    'banana sapling': 'banana_sapling',
    'banana': 'banana_sapling',
    'orange sapling': 'orange_sapling',
    'orange': 'orange_sapling',
    'palm sapling': 'palm_sapling',
    'palm': 'palm_sapling',
  };

  for (const [seedName, seedId] of Object.entries(seedMap)) {
    if (text.includes(seedName)) {
      return seedId;
    }
  }

  return undefined;
}

function extractPatchId(text: string): string | undefined {
  // Map patch names to IDs
  const patchMap: Record<string, string> = {
    'falador allotment north': 'falador_allotment_north',
    'falador allotment south': 'falador_allotment_south',
    'falador allotment': 'falador_allotment_north', // Default to north
    'catherby allotment north': 'catherby_allotment_north',
    'catherby allotment south': 'catherby_allotment_south',
    'catherby allotment': 'catherby_allotment_north', // Default to north
    'falador flower': 'falador_flower',
    'falador flower patch': 'falador_flower',
    'catherby flower': 'catherby_flower',
    'catherby flower patch': 'catherby_flower',
    'falador herb': 'falador_herb',
    'falador herb patch': 'falador_herb',
    'catherby herb': 'catherby_herb',
    'catherby herb patch': 'catherby_herb',
    'ardougne herb': 'ardougne_herb',
    'ardougne herb patch': 'ardougne_herb',
    'canifis herb': 'canifis_herb',
    'canifis herb patch': 'canifis_herb',
    'trollheim herb': 'trollheim_herb',
    'trollheim herb patch': 'trollheim_herb',
    'lumbridge tree': 'lumbridge_tree',
    'lumbridge tree patch': 'lumbridge_tree',
    'falador tree': 'falador_tree',
    'falador tree patch': 'falador_tree',
    'taverley tree': 'taverley_tree',
    'taverley tree patch': 'taverley_tree',
    'varrock tree': 'varrock_tree',
    'varrock tree patch': 'varrock_tree',
    'gnome stronghold fruit': 'gnome_stronghold_fruit',
    'gnome fruit': 'gnome_stronghold_fruit',
    'catherby fruit': 'catherby_fruit',
    'catherby fruit tree': 'catherby_fruit',
    'brimhaven fruit': 'brimhaven_fruit',
    'brimhaven fruit tree': 'brimhaven_fruit',
  };

  // Try exact matches first
  for (const [patchName, patchId] of Object.entries(patchMap)) {
    if (text.includes(patchName)) {
      return patchId;
    }
  }

  // Try location-based matching
  if (text.includes('falador') && text.includes('allotment')) {
    return 'falador_allotment_north';
  }
  if (text.includes('catherby') && text.includes('allotment')) {
    return 'catherby_allotment_north';
  }
  if (text.includes('falador') && text.includes('herb')) {
    return 'falador_herb';
  }
  if (text.includes('catherby') && text.includes('herb')) {
    return 'catherby_herb';
  }

  return undefined;
}

function extractCompostType(text: string): string | undefined {
  if (text.includes('ultracompost') || text.includes('ultra compost')) {
    return 'ultracompost';
  }
  if (text.includes('supercompost') || text.includes('super compost')) {
    return 'supercompost';
  }
  if (text.includes('compost')) {
    return 'compost';
  }
  return undefined;
}

function generateFarmingStatus(world: any, playerId: string): string {
  try {
    // Get farming system from world
    const farmingSystem = world.systems?.find((s: any) => s.name === 'FarmingSystem');
    
    if (!farmingSystem) {
      return "The farming system isn't available right now.";
    }

    const playerCrops = farmingSystem.getPlayerCrops(playerId);

    let status = '';

    if (playerCrops.size === 0) {
      status = `I don't have any crops planted right now.\\n`;
    } else {
      status = `My current farming patches:\\n`;
      
      const patches = farmingSystem.getFarmingPatches();
      const seeds = farmingSystem.getFarmingSeeds();
      
      for (const [patchId, crop] of playerCrops.entries()) {
        const patch = patches.get(patchId);
        const seed = seeds.get(crop.seedId);
        
        if (patch && seed) {
          const progress = `${crop.currentStage}/${crop.maxStage}`;
          let cropStatus = '';
          
          if (crop.dead) {
            cropStatus = 'DEAD';
          } else if (crop.diseased) {
            cropStatus = 'DISEASED';
          } else if (crop.currentStage >= crop.maxStage) {
            cropStatus = 'READY TO HARVEST';
          } else {
            cropStatus = `Growing (${progress})`;
          }
          
          status += `${patch.name}: ${seed.name} - ${cropStatus}\\n`;
          if (crop.waterLevel > 0) {
            status += `  Water level: ${crop.waterLevel}/3\\n`;
          }
          if (crop.compostLevel > 0) {
            status += `  Compost level: ${crop.compostLevel}/3\\n`;
          }
        }
      }
    }

    // Available patches info
    const stats = world.entities.players.get(playerId)?.data?.stats;
    if (stats) {
      const farmingLevel = stats.farming.level;
      const availableSeeds = farmingSystem.getSeedsByLevel(1, farmingLevel);
      const categories = [...new Set(availableSeeds.map((s: any) => s.patchType))];
      
      status += `\\nFarming level ${farmingLevel} - Available patch types: ${categories.join(', ')}\\n`;
    }

    status += `I can plant seeds, water crops, apply compost, and harvest when ready!`;

    return status;
  } catch (error) {
    return "I couldn't check my farming status right now.";
  }
}