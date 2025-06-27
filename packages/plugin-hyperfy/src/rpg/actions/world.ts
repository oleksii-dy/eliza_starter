/**
 * World Actions for Agent Interaction
 * ===================================
 * Natural language interface for AI agents to interact with the world system
 */

import { ActionExample, IAgentRuntime, Memory, State, type Action } from '@elizaos/core';

export const hyperfyWorldAction: Action = {
  name: 'HYPERFY_WORLD',
  similes: [
    'WORLD',
    'TELEPORT',
    'TRAVEL',
    'EXPLORE',
    'LOCATION',
    'AREA',
    'REGION',
    'CITY',
    'DUNGEON',
    'LANDMARK',
    'GENERATE',
    'WORLD_ACTION'
  ],
  description: 'Interact with the world system - teleport, explore areas, generate assets, and navigate the game world',
  
  validate: async (runtime: IAgentRuntime, message: Memory) => {
    const text = message.content.text?.toLowerCase() || '';
    
    // Check for world-related keywords
    const worldKeywords = [
      'teleport', 'travel', 'go to', 'visit', 'explore', 'location', 'area', 'region',
      'city', 'town', 'village', 'dungeon', 'cave', 'landmark', 'castle', 'tower',
      'lumbridge', 'varrock', 'falador', 'draynor', 'wilderness', 'karamja',
      'where am i', 'current location', 'nearby', 'around here',
      'generate asset', 'create building', 'vrm', 'meshy',
      'world map', 'directions', 'how to get to'
    ];
    
    const hasKeyword = worldKeywords.some(keyword => text.includes(keyword));
    
    if (!hasKeyword) {
      return false;
    }

    // Additional validation: check if world system is available
    try {
      const hyperfyService = runtime.getService('hyperfy');
      if (!hyperfyService) {
        return false;
      }

      const world = (hyperfyService as any).getWorld();
      const worldSystem = world.systems?.find((s: any) => s.name === 'WorldSystem');
      
      if (!worldSystem) {
        return false;
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
      // Parse world command
      const worldCommand = parseWorldCommand(text);
      
      if (!worldCommand) {
        callback({
          text: "I don't understand that world command. Try 'teleport to lumbridge' or 'explore varrock'.",
          action: 'WORLD_HELP'
        });
        return;
      }

      // Get world service to emit world events
      const hyperfyService = runtime.getService('hyperfy');
      if (!hyperfyService) {
        callback({
          text: "Hyperfy service not available for world actions.",
          action: 'SERVICE_ERROR'
        });
        return;
      }

      const world = (hyperfyService as any).getWorld();
      const playerId = runtime.character?.name || 'agent';
      const worldSystem = world.systems?.find((s: any) => s.name === 'WorldSystem');

      if (!worldSystem) {
        callback({
          text: "World system not available.",
          action: 'SYSTEM_ERROR'
        });
        return;
      }

      let responseText = '';
      let actionType = '';

      switch (worldCommand.action) {
        case 'teleport':
          if (worldCommand.destination) {
            const success = worldSystem.teleportPlayer(playerId, worldCommand.destination);
            
            if (success) {
              responseText = `I've teleported to ${worldCommand.destination}! What an adventure!`;
              actionType = 'TELEPORT_SUCCESS';
            } else {
              responseText = `I couldn't teleport to ${worldCommand.destination}. That location might not exist or be accessible.`;
              actionType = 'TELEPORT_FAILED';
            }
          } else {
            // List available teleport destinations
            const teleportPoints = worldSystem.getTeleportPoints();
            const destinations = Array.from(teleportPoints.values()).slice(0, 5).map(tp => tp.name);
            
            responseText = `Where would you like me to teleport? Available destinations: ${destinations.join(', ')}.`;
            actionType = 'TELEPORT_LIST';
          }
          break;

        case 'travel':
          if (worldCommand.destination) {
            // For travel, we'll use teleport but with different messaging
            const success = worldSystem.teleportPlayer(playerId, worldCommand.destination);
            
            if (success) {
              responseText = `I'm traveling to ${worldCommand.destination}. The journey begins!`;
              actionType = 'TRAVEL_SUCCESS';
            } else {
              responseText = `I can't find a way to travel to ${worldCommand.destination}. Let me check the map...`;
              actionType = 'TRAVEL_FAILED';
            }
          } else {
            responseText = "Where would you like me to travel? I can go to cities, landmarks, or dungeons.";
            actionType = 'TRAVEL_CLARIFY';
          }
          break;

        case 'explore':
          if (worldCommand.areaType) {
            responseText = generateExploreInfo(world, worldCommand.areaType, worldCommand.specificArea);
            actionType = 'EXPLORE_INFO';
          } else {
            responseText = generateWorldOverview(world);
            actionType = 'WORLD_OVERVIEW';
          }
          break;

        case 'location':
          const playerLocation = worldSystem.getPlayerLocation(playerId);
          if (playerLocation) {
            const regions = worldSystem.getRegions();
            const region = regions.get(playerLocation.region);
            
            responseText = `I'm currently in ${region?.name || 'an unknown area'} at coordinates ${playerLocation.position.x}, ${playerLocation.position.y}, ${playerLocation.position.z}.`;
            actionType = 'CURRENT_LOCATION';
          } else {
            responseText = "I'm not sure where I am right now. Let me get my bearings...";
            actionType = 'LOCATION_UNKNOWN';
          }
          break;

        case 'directions':
          if (worldCommand.destination) {
            responseText = generateDirections(world, playerId, worldCommand.destination);
            actionType = 'DIRECTIONS_PROVIDED';
          } else {
            responseText = "Where do you want directions to? I can guide you to any city or landmark.";
            actionType = 'DIRECTIONS_CLARIFY';
          }
          break;

        case 'list':
          if (worldCommand.areaType) {
            responseText = generateAreaList(world, worldCommand.areaType);
            actionType = 'AREA_LIST';
          } else {
            responseText = generateCompleteWorldList(world);
            actionType = 'COMPLETE_WORLD_LIST';
          }
          break;

        case 'generate':
          if (worldCommand.assetDescription && worldCommand.assetType) {
            world.events.emit('rpg:generate_asset', {
              description: worldCommand.assetDescription,
              assetType: worldCommand.assetType
            });
            
            responseText = `I'm generating a ${worldCommand.assetType} asset: "${worldCommand.assetDescription}". This might take a moment...`;
            actionType = 'GENERATE_ASSET';
          } else {
            responseText = "What kind of asset would you like me to generate? Try 'generate a medieval castle building' or 'create forest environment'.";
            actionType = 'GENERATE_CLARIFY';
          }
          break;

        case 'info':
          if (worldCommand.specificArea) {
            responseText = generateAreaInfo(world, worldCommand.specificArea);
            actionType = 'AREA_INFO';
          } else {
            responseText = "What area would you like information about? I can tell you about cities, dungeons, or landmarks.";
            actionType = 'INFO_CLARIFY';
          }
          break;

        default:
          responseText = "I'm not sure what world action you want me to perform.";
          actionType = 'WORLD_UNKNOWN';
      }

      // Emit RPG event for world action
      world.events.emit('rpg:agent_action', {
        playerId,
        action: 'world',
        details: worldCommand,
        timestamp: Date.now()
      });

      callback({
        text: responseText,
        action: actionType,
        metadata: {
          skill: 'exploration',
          command: worldCommand,
          timestamp: Date.now()
        }
      });

    } catch (error) {
      console.error('Error in world action:', error);
      callback({
        text: "Something went wrong while interacting with the world. Let me try again.",
        action: 'WORLD_ERROR'
      });
    }
  },

  examples: [
    [
      {
        user: "{{user1}}",
        content: {
          text: "Teleport to Lumbridge"
        }
      } as ActionExample,
      {
        user: "{{user2}}",
        content: {
          text: "I've teleported to Lumbridge! What an adventure!"
        }
      } as ActionExample
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Explore Varrock"
        }
      } as ActionExample,
      {
        user: "{{user2}}",
        content: {
          text: "Varrock is a large medieval city with shops, guards, and the Grand Exchange. It's a level 10 area perfect for intermediate adventurers."
        }
      } as ActionExample
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Where am I?"
        }
      } as ActionExample,
      {
        user: "{{user2}}",
        content: {
          text: "I'm currently in Lumbridge Region at coordinates 100, 0, 100."
        }
      } as ActionExample
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "List all cities"
        }
      } as ActionExample,
      {
        user: "{{user2}}",
        content: {
          text: "Available cities: Lumbridge (Level 1), Varrock (Level 10), Falador (Level 20), Draynor Village (Level 5). Each offers unique facilities and adventures!"
        }
      } as ActionExample
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Generate a medieval castle building"
        }
      } as ActionExample,
      {
        user: "{{user2}}",
        content: {
          text: "I'm generating a building asset: \"medieval castle building\". This might take a moment..."
        }
      } as ActionExample
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Travel to Wizards' Tower"
        }
      } as ActionExample,
      {
        user: "{{user2}}",
        content: {
          text: "I'm traveling to Wizards' Tower. The journey begins!"
        }
      } as ActionExample
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "What dungeons are available?"
        }
      } as ActionExample,
      {
        user: "{{user2}}",
        content: {
          text: "Available dungeons: Lumbridge Swamp Caves (Level 1-15), Varrock Sewers (Level 10-30), Edgeville Dungeon (Level 25-70), Karamja Volcano (Level 40-100). Choose your challenge!"
        }
      } as ActionExample
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "How do I get to Falador?"
        }
      } as ActionExample,
      {
        user: "{{user2}}",
        content: {
          text: "To reach Falador: Head west from Lumbridge through Draynor Village, then continue northwest past the Barbarian Village. It's about 400 units west of Lumbridge!"
        }
      } as ActionExample
    ]
  ] as ActionExample[][]
};

interface WorldCommand {
  action: 'teleport' | 'travel' | 'explore' | 'location' | 'directions' | 'list' | 'generate' | 'info';
  destination?: string;
  areaType?: 'cities' | 'dungeons' | 'landmarks' | 'regions';
  specificArea?: string;
  assetDescription?: string;
  assetType?: 'building' | 'character' | 'environment' | 'item' | 'dungeon' | 'landmark';
}

function parseWorldCommand(text: string): WorldCommand | null {
  text = text.toLowerCase().trim();

  // Generate asset patterns
  if (text.includes('generate') || text.includes('create asset') || text.includes('meshy')) {
    const assetDescription = extractAssetDescription(text);
    const assetType = extractAssetType(text);
    return { action: 'generate', assetDescription, assetType };
  }

  // Location/current position patterns
  if (text.includes('where am i') || text.includes('current location') || text.includes('my location')) {
    return { action: 'location' };
  }

  // Directions patterns
  if (text.includes('how to get to') || text.includes('directions to') || text.includes('how do i get to')) {
    const destination = extractDestination(text);
    return { action: 'directions', destination };
  }

  // List patterns
  if (text.includes('list') || text.includes('show me') || text.includes('what') && (text.includes('cities') || text.includes('dungeons') || text.includes('landmarks'))) {
    const areaType = extractAreaType(text);
    return { action: 'list', areaType };
  }

  // Info patterns
  if (text.includes('info about') || text.includes('tell me about') || text.includes('describe')) {
    const specificArea = extractSpecificArea(text);
    return { action: 'info', specificArea };
  }

  // Explore patterns
  if (text.includes('explore') || text.includes('discover') || text.includes('investigate')) {
    const areaType = extractAreaType(text);
    const specificArea = extractSpecificArea(text);
    return { action: 'explore', areaType, specificArea };
  }

  // Teleport patterns
  if (text.includes('teleport') || text.includes('tp to') || text.includes('warp to')) {
    const destination = extractDestination(text);
    return { action: 'teleport', destination };
  }

  // Travel patterns
  if (text.includes('travel to') || text.includes('go to') || text.includes('visit') || text.includes('journey to')) {
    const destination = extractDestination(text);
    return { action: 'travel', destination };
  }

  return null;
}

function extractDestination(text: string): string | undefined {
  // Map location names to identifiers
  const locationMap: Record<string, string> = {
    'lumbridge': 'lumbridge',
    'varrock': 'varrock',
    'falador': 'falador',
    'draynor': 'draynor',
    'draynor village': 'draynor',
    'wizards tower': 'wizards_tower',
    "wizards' tower": 'wizards_tower',
    'wizard tower': 'wizards_tower',
    'lumbridge castle': 'lumbridge_castle',
    'castle': 'lumbridge_castle',
    'grand exchange': 'grand_exchange',
    'ge': 'grand_exchange',
    'barbarian village': 'barbarian_village',
    'wilderness': 'wilderness',
    'karamja': 'karamja_dungeon',
    'edgeville dungeon': 'edgeville_dungeon',
    'varrock sewers': 'varrock_sewers',
    'lumbridge caves': 'lumbridge_swamp_caves',
    'swamp caves': 'lumbridge_swamp_caves',
  };

  for (const [locationName, locationId] of Object.entries(locationMap)) {
    if (text.includes(locationName)) {
      return locationId;
    }
  }

  return undefined;
}

function extractAreaType(text: string): 'cities' | 'dungeons' | 'landmarks' | 'regions' | undefined {
  if (text.includes('cities') || text.includes('towns') || text.includes('villages')) {
    return 'cities';
  }
  if (text.includes('dungeons') || text.includes('caves') || text.includes('underground')) {
    return 'dungeons';
  }
  if (text.includes('landmarks') || text.includes('monuments') || text.includes('points of interest')) {
    return 'landmarks';
  }
  if (text.includes('regions') || text.includes('areas') || text.includes('zones')) {
    return 'regions';
  }
  return undefined;
}

function extractSpecificArea(text: string): string | undefined {
  // Extract specific area names for info requests
  const areas = [
    'lumbridge', 'varrock', 'falador', 'draynor',
    'wizards tower', 'lumbridge castle', 'grand exchange', 'barbarian village',
    'edgeville dungeon', 'varrock sewers', 'lumbridge caves', 'karamja volcano',
    'wilderness'
  ];

  for (const area of areas) {
    if (text.includes(area)) {
      return area.replace(' ', '_');
    }
  }

  return undefined;
}

function extractAssetDescription(text: string): string | undefined {
  // Extract asset description from generate commands
  const patterns = [
    /generate (?:a |an )?(.*?)(?:\s+building|\s+character|\s+environment|\s+item|\s+dungeon|\s+landmark|$)/,
    /create (?:a |an )?(.*?)(?:\s+asset|$)/,
    /make (?:a |an )?(.*?)(?:\s+building|\s+character|\s+environment|\s+item|\s+dungeon|\s+landmark|$)/
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  return undefined;
}

function extractAssetType(text: string): 'building' | 'character' | 'environment' | 'item' | 'dungeon' | 'landmark' | undefined {
  if (text.includes('building') || text.includes('house') || text.includes('castle') || text.includes('shop')) {
    return 'building';
  }
  if (text.includes('character') || text.includes('npc') || text.includes('person')) {
    return 'character';
  }
  if (text.includes('environment') || text.includes('landscape') || text.includes('terrain') || text.includes('forest') || text.includes('mountain')) {
    return 'environment';
  }
  if (text.includes('item') || text.includes('weapon') || text.includes('armor') || text.includes('tool')) {
    return 'item';
  }
  if (text.includes('dungeon') || text.includes('cave') || text.includes('underground')) {
    return 'dungeon';
  }
  if (text.includes('landmark') || text.includes('monument') || text.includes('tower')) {
    return 'landmark';
  }
  return 'building'; // Default to building
}

function generateExploreInfo(world: any, areaType?: string, specificArea?: string): string {
  try {
    const worldSystem = world.systems?.find((s: any) => s.name === 'WorldSystem');
    if (!worldSystem) {
      return "World system not available for exploration.";
    }

    if (specificArea) {
      // Get info about specific area
      const cities = worldSystem.getCities();
      const landmarks = worldSystem.getLandmarks();
      const dungeons = worldSystem.getDungeons();
      
      const city = cities.get(specificArea);
      const landmark = landmarks.get(specificArea);
      const dungeon = dungeons.get(specificArea);
      
      if (city) {
        return `${city.name} is a ${city.type} with ${city.facilities.join(', ')}. It's a level ${city.level} area${city.safeZone ? ' (safe zone)' : ''}. ${city.description}`;
      } else if (landmark) {
        return `${landmark.name}: ${landmark.description} This ${landmark.significance} landmark is ${landmark.accessible ? 'accessible' : 'restricted'}.`;
      } else if (dungeon) {
        return `${dungeon.name}: ${dungeon.description} Entry level: ${dungeon.entryLevel}, Max level: ${dungeon.maxLevel}, Floors: ${dungeon.floors}.`;
      }
    }

    if (areaType) {
      return generateAreaList(world, areaType);
    }

    return generateWorldOverview(world);
  } catch (error) {
    return "Couldn't get exploration information right now.";
  }
}

function generateWorldOverview(world: any): string {
  try {
    const worldSystem = world.systems?.find((s: any) => s.name === 'WorldSystem');
    if (!worldSystem) {
      return "World system not available.";
    }

    const regions = worldSystem.getRegions();
    const cities = worldSystem.getCities();
    const dungeons = worldSystem.getDungeons();
    const landmarks = worldSystem.getLandmarks();

    return `Welcome to the world of RuneScape! Available areas:\n\n` +
           `🏙️ Cities (${cities.size}): Major settlements for trading, quests, and services\n` +
           `🏰 Landmarks (${landmarks.size}): Notable locations and points of interest\n` +
           `⚔️ Dungeons (${dungeons.size}): Dangerous areas with monsters and treasures\n` +
           `🗺️ Regions (${regions.size}): Large areas containing multiple locations\n\n` +
           `Type 'list cities' or 'explore varrock' to learn more!`;
  } catch (error) {
    return "Couldn't get world overview right now.";
  }
}

function generateAreaList(world: any, areaType: string): string {
  try {
    const worldSystem = world.systems?.find((s: any) => s.name === 'WorldSystem');
    if (!worldSystem) {
      return "World system not available.";
    }

    switch (areaType) {
      case 'cities':
        const cities = worldSystem.getCities();
        const cityList = Array.from(cities.values())
          .map(city => `${city.name} (Level ${city.level})`)
          .join(', ');
        return `Available cities: ${cityList}. Each offers unique facilities and adventures!`;

      case 'dungeons':
        const dungeons = worldSystem.getDungeons();
        const dungeonList = Array.from(dungeons.values())
          .map(dungeon => `${dungeon.name} (Level ${dungeon.entryLevel}-${dungeon.maxLevel})`)
          .join(', ');
        return `Available dungeons: ${dungeonList}. Choose your challenge!`;

      case 'landmarks':
        const landmarks = worldSystem.getLandmarks();
        const landmarkList = Array.from(landmarks.values())
          .slice(0, 6)
          .map(landmark => landmark.name)
          .join(', ');
        return `Notable landmarks: ${landmarkList}. Each has its own story and significance!`;

      case 'regions':
        const regions = worldSystem.getRegions();
        const regionList = Array.from(regions.values())
          .map(region => `${region.name} (${region.terrain})`)
          .join(', ');
        return `World regions: ${regionList}. Vast areas to explore!`;

      default:
        return generateCompleteWorldList(world);
    }
  } catch (error) {
    return "Couldn't list areas right now.";
  }
}

function generateCompleteWorldList(world: any): string {
  try {
    const worldSystem = world.systems?.find((s: any) => s.name === 'WorldSystem');
    if (!worldSystem) {
      return "World system not available.";
    }

    const cities = worldSystem.getCities();
    const dungeons = worldSystem.getDungeons();
    const landmarks = worldSystem.getLandmarks();

    const cityNames = Array.from(cities.values()).slice(0, 4).map(c => c.name);
    const dungeonNames = Array.from(dungeons.values()).slice(0, 3).map(d => d.name);
    const landmarkNames = Array.from(landmarks.values()).slice(0, 3).map(l => l.name);

    return `🌍 Complete World Guide:\n\n` +
           `Cities: ${cityNames.join(', ')}\n` +
           `Dungeons: ${dungeonNames.join(', ')}\n` +
           `Landmarks: ${landmarkNames.join(', ')}\n\n` +
           `Use 'teleport to [location]' or 'explore [area]' for more details!`;
  } catch (error) {
    return "Couldn't get complete world list right now.";
  }
}

function generateDirections(world: any, playerId: string, destination: string): string {
  try {
    const worldSystem = world.systems?.find((s: any) => s.name === 'WorldSystem');
    if (!worldSystem) {
      return "Navigation system not available.";
    }

    const playerLocation = worldSystem.getPlayerLocation(playerId);
    if (!playerLocation) {
      return "I need to know your current location to provide directions.";
    }

    // Simple direction generation based on destination
    const directions: Record<string, string> = {
      'lumbridge': "Head to the peaceful starting town in the southeast.",
      'varrock': "Travel northeast to the bustling medieval capital.",
      'falador': "Journey west to the white-walled city of knights.",
      'draynor': "Go southwest to the quiet village by the river.",
      'wizards_tower': "Head south from Draynor to the tall magical tower.",
      'grand_exchange': "Visit the northwest area of Varrock for trading.",
      'wilderness': "Travel far north beyond the safe zones (dangerous!).",
    };

    const direction = directions[destination];
    if (direction) {
      return `To reach ${destination}: ${direction}`;
    }

    return `I'm not sure how to get to ${destination}. Try teleporting there instead!`;
  } catch (error) {
    return "Couldn't calculate directions right now.";
  }
}

function generateAreaInfo(world: any, areaName: string): string {
  try {
    const worldSystem = world.systems?.find((s: any) => s.name === 'WorldSystem');
    if (!worldSystem) {
      return "World system not available.";
    }

    // Try to find the area in cities, landmarks, or dungeons
    const cities = worldSystem.getCities();
    const landmarks = worldSystem.getLandmarks();
    const dungeons = worldSystem.getDungeons();

    for (const city of cities.values()) {
      if (city.id.includes(areaName) || city.name.toLowerCase().includes(areaName)) {
        return `${city.name}: ${city.description} Level ${city.level} ${city.type} with facilities: ${city.facilities.join(', ')}.`;
      }
    }

    for (const landmark of landmarks.values()) {
      if (landmark.id.includes(areaName) || landmark.name.toLowerCase().includes(areaName)) {
        return `${landmark.name}: ${landmark.description} A ${landmark.significance} ${landmark.type}.`;
      }
    }

    for (const dungeon of dungeons.values()) {
      if (dungeon.id.includes(areaName) || dungeon.name.toLowerCase().includes(areaName)) {
        return `${dungeon.name}: ${dungeon.description} Entry level: ${dungeon.entryLevel}, ${dungeon.floors} floors.`;
      }
    }

    return `I couldn't find information about "${areaName}". Try asking about specific cities, landmarks, or dungeons.`;
  } catch (error) {
    return "Couldn't get area information right now.";
  }
}