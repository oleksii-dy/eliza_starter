/**
 * Construction Actions for Agent Interaction
 * =========================================
 * Natural language interface for AI agents to interact with the construction system
 */

import { ActionExample, IAgentRuntime, Memory, State, type Action } from '@elizaos/core';

export const hyperfyConstructionAction: Action = {
  name: 'HYPERFY_CONSTRUCTION',
  similes: [
    'CONSTRUCTION',
    'BUILD',
    'HOUSE',
    'ROOM',
    'FURNITURE',
    'PLACE',
    'CREATE',
    'CONSTRUCT',
    'BUILDING',
    'CONSTRUCTION_ACTION'
  ],
  description: 'Build houses, construct rooms, and place furniture using construction skills',
  
  validate: async (runtime: IAgentRuntime, message: Memory) => {
    const text = message.content.text?.toLowerCase() || '';
    
    // Check for construction-related keywords
    const constructionKeywords = [
      'construction', 'build', 'house', 'room', 'furniture', 'place', 'construct', 'create',
      'parlour', 'kitchen', 'dining', 'workshop', 'study', 'entrance', 'hall',
      'chair', 'table', 'bookshelf', 'fireplace', 'workbench', 'telescope',
      'mansion', 'fancy house', 'basic house', 'demolish', 'remove furniture',
      'hotspot', 'blueprint', 'material', 'hammer', 'chisel', 'steel bar',
      'logs', 'oak', 'enter house', 'exit house', 'visit house'
    ];
    
    const hasKeyword = constructionKeywords.some(keyword => text.includes(keyword));
    
    if (!hasKeyword) {
      return false;
    }

    // Additional validation: check if player has construction capability
    try {
      const hyperfyService = runtime.getService('hyperfy');
      if (!hyperfyService) {
        return false;
      }

      const world = (hyperfyService as any).getWorld();
      const playerId = runtime.character?.name || 'agent';
      const constructionSystem = world.systems?.find((s: any) => s.name === 'ConstructionSystem');
      
      if (!constructionSystem) {
        return false;
      }

      return true; // Allow for general construction queries
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
      // Parse construction command
      const constructionCommand = parseConstructionCommand(text);
      
      if (!constructionCommand) {
        callback({
          text: "I don't understand that construction command. Try 'build house' or 'place chair'.",
          action: 'CONSTRUCTION_HELP'
        });
        return;
      }

      // Get world service to emit construction events
      const hyperfyService = runtime.getService('hyperfy');
      if (!hyperfyService) {
        callback({
          text: "Hyperfy service not available for construction actions.",
          action: 'SERVICE_ERROR'
        });
        return;
      }

      const world = (hyperfyService as any).getWorld();
      const playerId = runtime.character?.name || 'agent';
      const constructionSystem = world.systems?.find((s: any) => s.name === 'ConstructionSystem');

      if (!constructionSystem) {
        callback({
          text: "Construction system not available.",
          action: 'SYSTEM_ERROR'
        });
        return;
      }

      let responseText = '';
      let actionType = '';

      switch (constructionCommand.action) {
        case 'build_house':
          if (constructionCommand.housePlanId) {
            // Validate house building capability
            const validation = constructionSystem.canBuildHouse(playerId, constructionCommand.housePlanId);
            
            if (!validation.canBuild) {
              callback({
                text: `I can't build ${constructionCommand.housePlanId.replace(/_/g, ' ')}: ${validation.reason}`,
                action: 'CONSTRUCTION_INVALID'
              });
              return;
            }

            const location = constructionCommand.location || { region: 'Rimmington', coords: { x: 0, y: 0 } };

            world.events.emit('rpg:build_house', {
              playerId,
              housePlanId: constructionCommand.housePlanId,
              location
            });
            
            responseText = `I'll build a ${constructionCommand.housePlanId.replace(/_/g, ' ')} in ${location.region}. This will be my new home!`;
            actionType = 'BUILD_HOUSE';
          } else {
            // Show available house plans
            const housePlans = constructionSystem.getHousePlans();
            const planNames = Array.from(housePlans.values()).map(plan => plan.name);
            responseText = `What type of house should I build? Available plans: ${planNames.join(', ')}.`;
            actionType = 'CONSTRUCTION_CLARIFY';
          }
          break;

        case 'build_room':
          if (constructionCommand.roomTypeId && constructionCommand.position) {
            // Validate room building capability
            const validation = constructionSystem.canBuildRoom(playerId, constructionCommand.roomTypeId);
            
            if (!validation.canBuild) {
              callback({
                text: `I can't build ${constructionCommand.roomTypeId.replace(/_/g, ' ')}: ${validation.reason}`,
                action: 'CONSTRUCTION_INVALID'
              });
              return;
            }

            world.events.emit('rpg:build_room', {
              playerId,
              roomTypeId: constructionCommand.roomTypeId,
              position: constructionCommand.position
            });
            
            responseText = `I'll build a ${constructionCommand.roomTypeId.replace(/_/g, ' ')} at position ${constructionCommand.position.x},${constructionCommand.position.y}.`;
            actionType = 'BUILD_ROOM';
          } else if (constructionCommand.roomTypeId) {
            responseText = `Where should I build the ${constructionCommand.roomTypeId.replace(/_/g, ' ')}? Please specify coordinates like 'at 1,0'.`;
            actionType = 'CONSTRUCTION_CLARIFY';
          } else {
            // Show available room types
            const roomTypes = constructionSystem.getRoomTypes();
            const typeNames = Array.from(roomTypes.values()).map(room => room.name);
            responseText = `What type of room should I build? Available types: ${typeNames.join(', ')}.`;
            actionType = 'CONSTRUCTION_CLARIFY';
          }
          break;

        case 'place_furniture':
          if (constructionCommand.furnitureId && constructionCommand.roomId && constructionCommand.hotspot) {
            // Validate furniture placement capability
            const validation = constructionSystem.canPlaceFurniture(playerId, constructionCommand.furnitureId);
            
            if (!validation.canPlace) {
              callback({
                text: `I can't place ${constructionCommand.furnitureId.replace(/_/g, ' ')}: ${validation.reason}`,
                action: 'CONSTRUCTION_INVALID'
              });
              return;
            }

            world.events.emit('rpg:place_furniture', {
              playerId,
              roomId: constructionCommand.roomId,
              furnitureId: constructionCommand.furnitureId,
              hotspot: constructionCommand.hotspot
            });
            
            responseText = `I'll place a ${constructionCommand.furnitureId.replace(/_/g, ' ')} in the ${constructionCommand.roomId.replace(/_/g, ' ')} on the ${constructionCommand.hotspot} hotspot.`;
            actionType = 'PLACE_FURNITURE';
          } else if (constructionCommand.furnitureId) {
            responseText = `Where should I place the ${constructionCommand.furnitureId.replace(/_/g, ' ')}? Please specify room and hotspot.`;
            actionType = 'CONSTRUCTION_CLARIFY';
          } else {
            // Show available furniture
            const furniture = constructionSystem.getFurnitureBlueprints();
            const furnitureNames = Array.from(furniture.values()).slice(0, 5).map(f => f.name);
            responseText = `What furniture should I place? Some options: ${furnitureNames.join(', ')}.`;
            actionType = 'CONSTRUCTION_CLARIFY';
          }
          break;

        case 'remove_furniture':
          if (constructionCommand.roomId && constructionCommand.hotspot) {
            world.events.emit('rpg:remove_furniture', {
              playerId,
              roomId: constructionCommand.roomId,
              hotspot: constructionCommand.hotspot
            });
            
            responseText = `I'll remove the furniture from the ${constructionCommand.hotspot} hotspot in the ${constructionCommand.roomId.replace(/_/g, ' ')}.`;
            actionType = 'REMOVE_FURNITURE';
          } else {
            responseText = "Which furniture should I remove? Please specify room and hotspot, like 'remove chair from parlour'.";
            actionType = 'CONSTRUCTION_CLARIFY';
          }
          break;

        case 'enter_house':
          const targetPlayerId = constructionCommand.targetPlayer || playerId;
          world.events.emit('rpg:enter_house', {
            playerId,
            houseOwnerId: targetPlayerId
          });
          
          if (targetPlayerId === playerId) {
            responseText = "I'll enter my house and see what I've built.";
          } else {
            responseText = `I'll visit ${targetPlayerId}'s house to see their construction work.`;
          }
          actionType = 'ENTER_HOUSE';
          break;

        case 'exit_house':
          world.events.emit('rpg:exit_house', {
            playerId
          });
          
          responseText = "I'll exit the house and return to the outside world.";
          actionType = 'EXIT_HOUSE';
          break;

        case 'check_house':
          responseText = generateHouseStatus(world, playerId);
          actionType = 'CHECK_HOUSE';
          break;

        case 'demolish_room':
          if (constructionCommand.roomId) {
            world.events.emit('rpg:demolish_room', {
              playerId,
              roomId: constructionCommand.roomId
            });
            
            responseText = `I'll demolish the ${constructionCommand.roomId.replace(/_/g, ' ')}. The materials will be lost.`;
            actionType = 'DEMOLISH_ROOM';
          } else {
            responseText = "Which room should I demolish? Please specify the room name.";
            actionType = 'CONSTRUCTION_CLARIFY';
          }
          break;

        default:
          responseText = "I'm not sure what construction action you want me to perform.";
          actionType = 'CONSTRUCTION_UNKNOWN';
      }

      // Emit RPG event for construction action
      world.events.emit('rpg:agent_action', {
        playerId,
        action: 'construction',
        details: constructionCommand,
        timestamp: Date.now()
      });

      callback({
        text: responseText,
        action: actionType,
        metadata: {
          skill: 'construction',
          command: constructionCommand,
          timestamp: Date.now()
        }
      });

    } catch (error) {
      console.error('Error in construction action:', error);
      callback({
        text: "Something went wrong while trying to do construction. Let me try again.",
        action: 'CONSTRUCTION_ERROR'
      });
    }
  },

  examples: [
    [
      {
        user: "{{user1}}",
        content: {
          text: "Build a house"
        }
      } as ActionExample,
      {
        user: "{{user2}}",
        content: {
          text: "What type of house should I build? Available plans: Basic House, Fancy House, Mansion."
        }
      } as ActionExample
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Build basic house"
        }
      } as ActionExample,
      {
        user: "{{user2}}",
        content: {
          text: "I'll build a basic house in Rimmington. This will be my new home!"
        }
      } as ActionExample
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Build parlour room"
        }
      } as ActionExample,
      {
        user: "{{user2}}",
        content: {
          text: "Where should I build the parlour? Please specify coordinates like 'at 1,0'."
        }
      } as ActionExample
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Build kitchen at 1,0"
        }
      } as ActionExample,
      {
        user: "{{user2}}",
        content: {
          text: "I'll build a kitchen at position 1,0."
        }
      } as ActionExample
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Place chair in parlour"
        }
      } as ActionExample,
      {
        user: "{{user2}}",
        content: {
          text: "Where should I place the chair? Please specify room and hotspot."
        }
      } as ActionExample
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Place wooden chair in parlour on chair hotspot"
        }
      } as ActionExample,
      {
        user: "{{user2}}",
        content: {
          text: "I'll place a wooden chair in the parlour on the chair hotspot."
        }
      } as ActionExample
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Check my house"
        }
      } as ActionExample,
      {
        user: "{{user2}}",
        content: {
          text: "Let me check my house and see what rooms and furniture I have built."
        }
      } as ActionExample
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Enter house"
        }
      } as ActionExample,
      {
        user: "{{user2}}",
        content: {
          text: "I'll enter my house and see what I've built."
        }
      } as ActionExample
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Remove furniture from parlour"
        }
      } as ActionExample,
      {
        user: "{{user2}}",
        content: {
          text: "Which furniture should I remove? Please specify room and hotspot, like 'remove chair from parlour'."
        }
      } as ActionExample
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Build workshop room"
        }
      } as ActionExample,
      {
        user: "{{user2}}",
        content: {
          text: "Where should I build the workshop? Please specify coordinates like 'at 1,0'."
        }
      } as ActionExample
    ]
  ] as ActionExample[][]
};

interface ConstructionCommand {
  action: 'build_house' | 'build_room' | 'place_furniture' | 'remove_furniture' | 'enter_house' | 'exit_house' | 'check_house' | 'demolish_room';
  housePlanId?: string;
  roomTypeId?: string;
  furnitureId?: string;
  roomId?: string;
  hotspot?: string;
  position?: { x: number, y: number };
  location?: { region: string, coords: { x: number, y: number } };
  targetPlayer?: string;
}

function parseConstructionCommand(text: string): ConstructionCommand | null {
  text = text.toLowerCase().trim();

  // Check house status patterns
  if (text.includes('check house') || text.includes('house status') || 
      text.includes('my house') || text.includes('house info')) {
    return { action: 'check_house' };
  }

  // Enter/exit house patterns
  if (text.includes('enter house') || text.includes('go home') || text.includes('visit house')) {
    const targetPlayer = extractPlayerName(text);
    return { action: 'enter_house', targetPlayer };
  }

  if (text.includes('exit house') || text.includes('leave house') || text.includes('go outside')) {
    return { action: 'exit_house' };
  }

  // Demolish patterns
  if (text.includes('demolish') || text.includes('destroy room') || text.includes('remove room')) {
    const roomId = extractRoomId(text);
    return { action: 'demolish_room', roomId };
  }

  // Remove furniture patterns
  if (text.includes('remove furniture') || text.includes('take away') || text.includes('destroy furniture')) {
    const roomId = extractRoomId(text);
    const hotspot = extractHotspot(text);
    return { action: 'remove_furniture', roomId, hotspot };
  }

  // Place furniture patterns
  if (text.includes('place') || text.includes('put') || text.includes('add furniture')) {
    const furnitureId = extractFurnitureId(text);
    const roomId = extractRoomId(text);
    const hotspot = extractHotspot(text);
    return { action: 'place_furniture', furnitureId, roomId, hotspot };
  }

  // Build room patterns
  if (text.includes('build room') || text.includes('add room') || text.includes('create room') ||
      text.includes('build parlour') || text.includes('build kitchen') || text.includes('build dining') ||
      text.includes('build workshop') || text.includes('build study')) {
    const roomTypeId = extractRoomTypeId(text);
    const position = extractPosition(text);
    return { action: 'build_room', roomTypeId, position };
  }

  // Build house patterns
  if (text.includes('build house') || text.includes('create house') || text.includes('construct house') ||
      text.includes('build basic') || text.includes('build fancy') || text.includes('build mansion')) {
    const housePlanId = extractHousePlanId(text);
    const location = extractLocation(text);
    return { action: 'build_house', housePlanId, location };
  }

  return null;
}

function extractHousePlanId(text: string): string | undefined {
  // Map house plan names to IDs
  const housePlanMap: Record<string, string> = {
    'basic house': 'basic_house',
    'basic': 'basic_house',
    'fancy house': 'fancy_house',
    'fancy': 'fancy_house',
    'mansion': 'mansion',
    'large house': 'mansion',
  };

  for (const [planName, planId] of Object.entries(housePlanMap)) {
    if (text.includes(planName)) {
      return planId;
    }
  }

  return undefined;
}

function extractRoomTypeId(text: string): string | undefined {
  // Map room names to IDs
  const roomMap: Record<string, string> = {
    'parlour': 'parlour',
    'sitting room': 'parlour',
    'kitchen': 'kitchen',
    'cooking room': 'kitchen',
    'dining room': 'dining_room',
    'dining': 'dining_room',
    'workshop': 'workshop',
    'craft room': 'workshop',
    'study': 'study',
    'magic room': 'study',
    'entrance hall': 'entrance_hall',
    'entrance': 'entrance_hall',
    'hall': 'entrance_hall',
  };

  for (const [roomName, roomId] of Object.entries(roomMap)) {
    if (text.includes(roomName)) {
      return roomId;
    }
  }

  return undefined;
}

function extractFurnitureId(text: string): string | undefined {
  // Map furniture names to IDs
  const furnitureMap: Record<string, string> = {
    'crude chair': 'crude_chair',
    'wooden chair': 'wooden_chair',
    'chair': 'wooden_chair', // Default to wooden chair
    'rocking chair': 'rocking_chair',
    'bookshelf': 'bookshelf',
    'shelf': 'bookshelf',
    'oak table': 'oak_table',
    'table': 'oak_table', // Default to oak table
    'fireplace': 'fireplace',
    'fire': 'fireplace',
  };

  for (const [furnitureName, furnitureId] of Object.entries(furnitureMap)) {
    if (text.includes(furnitureName)) {
      return furnitureId;
    }
  }

  return undefined;
}

function extractRoomId(text: string): string | undefined {
  // Extract room from context - could be room name or coordinates
  const roomTypeId = extractRoomTypeId(text);
  if (roomTypeId) {
    return roomTypeId; // For simplicity, assume room ID matches room type
  }

  // Extract from coordinates
  const position = extractPosition(text);
  if (position) {
    return `${position.x}_${position.y}`;
  }

  return undefined;
}

function extractHotspot(text: string): string | undefined {
  // Map hotspot phrases to IDs
  const hotspotMap: Record<string, string> = {
    'chair hotspot': 'chair',
    'chair spot': 'chair',
    'seat': 'chair',
    'table hotspot': 'table',
    'table spot': 'table',
    'bookshelf hotspot': 'bookshelf',
    'shelf spot': 'bookshelf',
    'fireplace hotspot': 'fireplace',
    'fire spot': 'fireplace',
    'workbench hotspot': 'workbench',
    'tool rack hotspot': 'tool_rack',
    'stairs hotspot': 'stairs',
  };

  for (const [hotspotName, hotspotId] of Object.entries(hotspotMap)) {
    if (text.includes(hotspotName)) {
      return hotspotId;
    }
  }

  // Try to extract from "on [hotspot]" patterns
  const onMatch = text.match(/on (\w+)/);
  if (onMatch) {
    return onMatch[1];
  }

  return undefined;
}

function extractPosition(text: string): { x: number, y: number } | undefined {
  // Look for coordinate patterns like "at 1,0" or "position 2,1"
  const coordMatch = text.match(/(?:at|position)\s*(\d+),\s*(\d+)/);
  if (coordMatch) {
    return {
      x: parseInt(coordMatch[1]),
      y: parseInt(coordMatch[2])
    };
  }

  return undefined;
}

function extractLocation(text: string): { region: string, coords: { x: number, y: number } } | undefined {
  // Extract location if specified, otherwise use default
  const locationMap: Record<string, string> = {
    'rimmington': 'Rimmington',
    'falador': 'Falador',
    'varrock': 'Varrock',
    'lumbridge': 'Lumbridge',
    'camelot': 'Camelot',
    'yanille': 'Yanille',
  };

  for (const [locationName, region] of Object.entries(locationMap)) {
    if (text.includes(locationName)) {
      return {
        region,
        coords: { x: 0, y: 0 }
      };
    }
  }

  return undefined;
}

function extractPlayerName(text: string): string | undefined {
  // Look for player name patterns like "visit PlayerName's house"
  const playerMatch = text.match(/visit (\w+)'?s? house/);
  if (playerMatch) {
    return playerMatch[1];
  }

  return undefined;
}

function generateHouseStatus(world: any, playerId: string): string {
  try {
    // Get construction system from world
    const constructionSystem = world.systems?.find((s: any) => s.name === 'ConstructionSystem');
    
    if (!constructionSystem) {
      return "The construction system isn't available right now.";
    }

    const house = constructionSystem.getPlayerHouse(playerId);

    if (!house) {
      return "I don't have a house built yet. I should build one first!";
    }

    const housePlans = constructionSystem.getHousePlans();
    const housePlan = housePlans.get(house.housePlanId);

    let status = `My ${housePlan?.name || 'house'} in ${house.location.region}:\\n`;
    status += `Built on: ${new Date(house.createdAt).toLocaleDateString()}\\n`;
    status += `Construction level when built: ${house.constructionLevel}\\n\\n`;

    if (house.rooms.size === 0) {
      status += "No rooms built yet.\\n";
    } else {
      status += `Rooms (${house.rooms.size}/${housePlan?.maxRooms || 'unlimited'}): \\n`;
      
      const roomTypes = constructionSystem.getRoomTypes();
      
      for (const [roomId, room] of house.rooms.entries()) {
        const roomType = roomTypes.get(room.roomTypeId);
        status += `- ${roomType?.name || room.roomTypeId} (${room.position.x},${room.position.y})`;
        
        if (room.furniture.length > 0) {
          status += ` - ${room.furniture.length} furniture pieces`;
        }
        status += '\\n';
      }
    }

    // Show available upgrades
    const stats = world.entities.players.get(playerId)?.data?.stats;
    if (stats) {
      const constructionLevel = stats.construction.level;
      const availableRooms = constructionSystem.getRoomsByType('').filter((r: any) => r.levelRequired <= constructionLevel);
      const availableFurniture = constructionSystem.getFurnitureByLevel(1, constructionLevel);
      
      status += `\\nConstruction level ${constructionLevel} - I can build ${availableRooms.length} room types and ${availableFurniture.length} furniture pieces!`;
    }

    return status;
  } catch (error) {
    return "I couldn't check my house status right now.";
  }
}