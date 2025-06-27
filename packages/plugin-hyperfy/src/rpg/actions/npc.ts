/**
 * NPC Actions for Agent Interaction
 * =================================
 * Natural language interface for AI agents to interact with NPCs
 */

import { ActionExample, IAgentRuntime, Memory, State, type Action } from '@elizaos/core';

export const hyperfyNPCAction: Action = {
  name: 'HYPERFY_NPC',
  similes: [
    'NPC',
    'TALK',
    'SPEAK',
    'CHAT',
    'DIALOGUE',
    'CONVERSATION',
    'SHOP',
    'BUY', 
    'SELL',
    'TRADE',
    'QUEST',
    'NPC_ACTION'
  ],
  description: 'Interact with NPCs through dialogue, shopping, and quest conversations',
  
  validate: async (runtime: IAgentRuntime, message: Memory) => {
    const text = message.content.text?.toLowerCase() || '';
    
    // Check for NPC-related keywords
    const npcKeywords = [
      'npc', 'talk', 'speak', 'chat', 'dialogue', 'conversation',
      'shop', 'buy', 'sell', 'trade', 'purchase', 'merchant', 'shopkeeper',
      'quest', 'task', 'duke', 'horacio', 'hans', 'instructor', 'teacher',
      'lumbridge', 'castle', 'general store', 'combat tutor',
      'hello', 'hi', 'greet', 'greeting', 'what do you sell'
    ];
    
    const hasKeyword = npcKeywords.some(keyword => text.includes(keyword));
    
    if (!hasKeyword) {
      return false;
    }

    // Additional validation: check if NPC system is available
    try {
      const hyperfyService = runtime.getService('hyperfy');
      if (!hyperfyService) {
        return false;
      }

      const world = (hyperfyService as any).getWorld();
      const npcSystem = world.systems?.find((s: any) => s.name === 'NPCSystem');
      
      if (!npcSystem) {
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
      // Parse NPC command
      const npcCommand = parseNPCCommand(text);
      
      if (!npcCommand) {
        callback({
          text: "I don't understand that NPC command. Try 'talk to duke horacio' or 'shop at general store'.",
          action: 'NPC_HELP'
        });
        return;
      }

      // Get world service to emit NPC events
      const hyperfyService = runtime.getService('hyperfy');
      if (!hyperfyService) {
        callback({
          text: "Hyperfy service not available for NPC actions.",
          action: 'SERVICE_ERROR'
        });
        return;
      }

      const world = (hyperfyService as any).getWorld();
      const playerId = runtime.character?.name || 'agent';
      const npcSystem = world.systems?.find((s: any) => s.name === 'NPCSystem');

      if (!npcSystem) {
        callback({
          text: "NPC system not available.",
          action: 'SYSTEM_ERROR'
        });
        return;
      }

      let responseText = '';
      let actionType = '';

      switch (npcCommand.action) {
        case 'talk':
          if (npcCommand.npcId) {
            const result = npcSystem.talkToNPC(playerId, npcCommand.npcId);
            
            if (result) {
              const npcTypes = npcSystem.getNPCTypes();
              const npcType = npcTypes.get(npcCommand.npcId);
              responseText = `I'm talking to ${npcType?.name || 'the NPC'}. They have something to say!`;
              actionType = 'TALK_TO_NPC';
            } else {
              responseText = `I can't talk to that NPC right now.`;
              actionType = 'NPC_UNAVAILABLE';
            }
          } else if (npcCommand.npcName) {
            // Find NPC by name
            const npcs = npcSystem.getNPCsByName(npcCommand.npcName);
            if (npcs.length > 0) {
              const result = npcSystem.talkToNPC(playerId, npcs[0].id);
              if (result) {
                responseText = `I'm talking to ${npcs[0].name}. They have something to say!`;
                actionType = 'TALK_TO_NPC';
              } else {
                responseText = `I can't talk to ${npcs[0].name} right now.`;
                actionType = 'NPC_UNAVAILABLE';
              }
            } else {
              responseText = `I can't find ${npcCommand.npcName} to talk to.`;
              actionType = 'NPC_NOT_FOUND';
            }
          } else {
            // List available NPCs
            const activeNPCs = npcSystem.getActiveNPCs();
            if (activeNPCs.size > 0) {
              const npcTypes = npcSystem.getNPCTypes();
              const npcNames = Array.from(activeNPCs.values()).slice(0, 5).map(npc => {
                const type = npcTypes.get(npc.typeId);
                return type?.name || 'Unknown';
              });
              
              responseText = `I can talk to these NPCs: ${npcNames.join(', ')}. Who should I talk to?`;
              actionType = 'NPC_LIST';
            } else {
              responseText = "I don't see any NPCs to talk to right now.";
              actionType = 'NO_NPCS';
            }
          }
          break;

        case 'shop':
          if (npcCommand.npcId || npcCommand.npcName) {
            const npcId = npcCommand.npcId || findNPCByName(npcSystem, npcCommand.npcName!);
            
            if (npcId) {
              const result = npcSystem.openShop(playerId, npcId);
              
              if (result) {
                const npcTypes = npcSystem.getNPCTypes();
                const npcType = npcTypes.get(npcId);
                responseText = `I opened the shop with ${npcType?.name || 'the merchant'}. Let me see what they have!`;
                actionType = 'OPEN_SHOP';
              } else {
                responseText = `This NPC doesn't have a shop, or it's not available right now.`;
                actionType = 'NO_SHOP';
              }
            } else {
              responseText = `I can't find that NPC to shop with.`;
              actionType = 'NPC_NOT_FOUND';
            }
          } else {
            // List NPCs with shops
            const merchants = npcSystem.getMerchantNPCs();
            if (merchants.length > 0) {
              const npcTypes = npcSystem.getNPCTypes();
              const merchantNames = merchants.map(npc => {
                const type = npcTypes.get(npc.typeId);
                return type?.name || 'Unknown';
              });
              
              responseText = `I can shop with these merchants: ${merchantNames.join(', ')}. Who should I visit?`;
              actionType = 'MERCHANT_LIST';
            } else {
              responseText = "I don't see any merchants to shop with right now.";
              actionType = 'NO_MERCHANTS';
            }
          }
          break;

        case 'buy':
          if (npcCommand.itemName && npcCommand.npcId) {
            world.events.emit('rpg:buy_from_shop', {
              playerId,
              npcId: npcCommand.npcId,
              itemName: npcCommand.itemName,
              quantity: npcCommand.quantity || 1
            });
            
            responseText = `I'll buy ${npcCommand.quantity || 1} ${npcCommand.itemName} from the shop.`;
            actionType = 'BUY_ITEM';
          } else {
            responseText = "What item should I buy? Try 'buy bread from shopkeeper'.";
            actionType = 'BUY_CLARIFY';
          }
          break;

        case 'sell':
          if (npcCommand.itemName && npcCommand.npcId) {
            world.events.emit('rpg:sell_to_shop', {
              playerId,
              npcId: npcCommand.npcId,
              itemName: npcCommand.itemName,
              quantity: npcCommand.quantity || 1
            });
            
            responseText = `I'll sell ${npcCommand.quantity || 1} ${npcCommand.itemName} to the shop.`;
            actionType = 'SELL_ITEM';
          } else {
            responseText = "What item should I sell? Try 'sell logs to shopkeeper'.";
            actionType = 'SELL_CLARIFY';
          }
          break;

        case 'greet':
          if (npcCommand.npcName) {
            const npcs = npcSystem.getNPCsByName(npcCommand.npcName);
            if (npcs.length > 0) {
              responseText = `Hello ${npcs[0].name}! Nice to meet you.`;
              actionType = 'GREET_NPC';
            } else {
              responseText = `I can't find ${npcCommand.npcName} to greet.`;
              actionType = 'NPC_NOT_FOUND';
            }
          } else {
            responseText = "Hello there! Who would you like me to greet?";
            actionType = 'GREET_GENERAL';
          }
          break;

        case 'info':
          if (npcCommand.npcName) {
            responseText = generateNPCInfo(world, npcCommand.npcName);
            actionType = 'NPC_INFO';
          } else {
            responseText = generateNPCsOverview(world);
            actionType = 'NPCS_OVERVIEW';
          }
          break;

        case 'list':
          responseText = generateActiveNPCsList(world);
          actionType = 'LIST_NPCS';
          break;

        default:
          responseText = "I'm not sure what NPC action you want me to perform.";
          actionType = 'NPC_UNKNOWN';
      }

      // Emit RPG event for NPC action
      world.events.emit('rpg:agent_action', {
        playerId,
        action: 'npc',
        details: npcCommand,
        timestamp: Date.now()
      });

      callback({
        text: responseText,
        action: actionType,
        metadata: {
          skill: 'social',
          command: npcCommand,
          timestamp: Date.now()
        }
      });

    } catch (error) {
      console.error('Error in NPC action:', error);
      callback({
        text: "Something went wrong while trying to interact with NPCs. Let me try again.",
        action: 'NPC_ERROR'
      });
    }
  },

  examples: [
    [
      {
        user: "{{user1}}",
        content: {
          text: "Talk to Duke Horacio"
        }
      } as ActionExample,
      {
        user: "{{user2}}",
        content: {
          text: "I'm talking to Duke Horacio. They have something to say!"
        }
      } as ActionExample
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Shop with shopkeeper"
        }
      } as ActionExample,
      {
        user: "{{user2}}",
        content: {
          text: "I opened the shop with Shop keeper. Let me see what they have!"
        }
      } as ActionExample
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Buy bread from general store"
        }
      } as ActionExample,
      {
        user: "{{user2}}",
        content: {
          text: "I'll buy 1 bread from the shop."
        }
      } as ActionExample
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "What NPCs can I talk to?"
        }
      } as ActionExample,
      {
        user: "{{user2}}",
        content: {
          text: "I can talk to these NPCs: Duke Horacio, Shop keeper, Combat Instructor. Who should I talk to?"
        }
      } as ActionExample
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Sell logs to shopkeeper"
        }
      } as ActionExample,
      {
        user: "{{user2}}",
        content: {
          text: "I'll sell 1 logs to the shop."
        }
      } as ActionExample
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Hello Hans"
        }
      } as ActionExample,
      {
        user: "{{user2}}",
        content: {
          text: "Hello Hans! Nice to meet you."
        }
      } as ActionExample
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "List NPCs"
        }
      } as ActionExample,
      {
        user: "{{user2}}",
        content: {
          text: "Active NPCs: Duke Horacio (Quest giver), Shop keeper (Merchant), Combat Instructor (Trainer), Hans (Citizen). Total: 4 NPCs available."
        }
      } as ActionExample
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Who are the merchants?"
        }
      } as ActionExample,
      {
        user: "{{user2}}",
        content: {
          text: "I can shop with these merchants: Shop keeper. Who should I visit?"
        }
      } as ActionExample
    ]
  ] as ActionExample[][]
};

interface NPCCommand {
  action: 'talk' | 'shop' | 'buy' | 'sell' | 'greet' | 'info' | 'list';
  npcId?: string;
  npcName?: string;
  itemName?: string;
  quantity?: number;
}

function parseNPCCommand(text: string): NPCCommand | null {
  text = text.toLowerCase().trim();

  // List patterns
  if (text.includes('list npc') || text.includes('show npc') || text === 'npcs') {
    return { action: 'list' };
  }

  // Info patterns
  if (text.includes('npc info') || text.includes('info about') || text.includes('tell me about')) {
    const npcName = extractNPCName(text);
    return { action: 'info', npcName };
  }

  // Greet patterns
  if (text.includes('hello') || text.includes('hi ') || text.includes('greet')) {
    const npcName = extractNPCName(text);
    return { action: 'greet', npcName };
  }

  // Buy patterns
  if (text.includes('buy') || text.includes('purchase')) {
    const itemName = extractItemName(text);
    const quantity = extractQuantity(text);
    const npcName = extractNPCName(text);
    const npcId = npcName ? findNPCIdByName(npcName) : undefined;
    return { action: 'buy', itemName, quantity, npcName, npcId };
  }

  // Sell patterns
  if (text.includes('sell')) {
    const itemName = extractItemName(text);
    const quantity = extractQuantity(text);
    const npcName = extractNPCName(text);
    const npcId = npcName ? findNPCIdByName(npcName) : undefined;
    return { action: 'sell', itemName, quantity, npcName, npcId };
  }

  // Shop patterns
  if (text.includes('shop') || text.includes('store') || text.includes('merchant') || text.includes('trade')) {
    const npcName = extractNPCName(text);
    const npcId = npcName ? findNPCIdByName(npcName) : undefined;
    return { action: 'shop', npcName, npcId };
  }

  // Talk patterns
  if (text.includes('talk') || text.includes('speak') || text.includes('chat') || text.includes('dialogue')) {
    const npcName = extractNPCName(text);
    const npcId = npcName ? findNPCIdByName(npcName) : undefined;
    return { action: 'talk', npcName, npcId };
  }

  return null;
}

function extractNPCName(text: string): string | undefined {
  // Map NPC names to identifiers
  const npcMap: Record<string, string> = {
    'duke horacio': 'Duke Horacio',
    'duke': 'Duke Horacio',
    'horacio': 'Duke Horacio',
    'shopkeeper': 'Shop keeper',
    'shop keeper': 'Shop keeper',
    'merchant': 'Shop keeper',
    'general store': 'Shop keeper',
    'combat instructor': 'Combat Instructor',
    'instructor': 'Combat Instructor',
    'trainer': 'Combat Instructor',
    'tutor': 'Combat Instructor',
    'hans': 'Hans',
  };

  for (const [npcName, displayName] of Object.entries(npcMap)) {
    if (text.includes(npcName)) {
      return displayName;
    }
  }

  return undefined;
}

function extractItemName(text: string): string | undefined {
  // Common shop items
  const itemMap: Record<string, string> = {
    'bread': 'bread',
    'loaf': 'bread',
    'pot': 'pot',
    'bucket': 'bucket',
    'tinderbox': 'tinderbox',
    'chisel': 'chisel',
    'hammer': 'hammer',
    'needle': 'needle',
    'thread': 'thread',
    'logs': 'logs',
    'wood': 'logs',
    'ore': 'ore',
    'coal': 'coal',
    'iron': 'iron ore',
    'copper': 'copper ore',
    'tin': 'tin ore',
  };

  for (const [itemName, standardName] of Object.entries(itemMap)) {
    if (text.includes(itemName)) {
      return standardName;
    }
  }

  return undefined;
}

function extractQuantity(text: string): number | undefined {
  // Look for quantity patterns like "5 bread" or "buy 10"
  const quantityMatch = text.match(/(\d+)\s*(?:x\s*)?(?:of\s*)?/);
  if (quantityMatch) {
    return parseInt(quantityMatch[1]);
  }

  return undefined;
}

function findNPCIdByName(npcName: string): string | undefined {
  // Map display names to NPC IDs
  const npcIdMap: Record<string, string> = {
    'Duke Horacio': 'duke_horacio',
    'Shop keeper': 'shop_keeper',
    'Combat Instructor': 'combat_instructor',
    'Hans': 'hans',
  };

  return npcIdMap[npcName];
}

function findNPCByName(npcSystem: any, npcName: string): string | null {
  const npcId = findNPCIdByName(npcName);
  if (npcId) {
    const activeNPCs = npcSystem.getActiveNPCs();
    const npc = Array.from(activeNPCs.values()).find((n: any) => n.typeId === npcId);
    return npc?.id || null;
  }
  return null;
}

function generateNPCInfo(world: any, npcName: string): string {
  try {
    const npcSystem = world.systems?.find((s: any) => s.name === 'NPCSystem');
    if (!npcSystem) {
      return "NPC system not available.";
    }

    const npcTypes = npcSystem.getNPCTypes();
    const npcId = findNPCIdByName(npcName);
    
    if (!npcId) {
      return `Unknown NPC: ${npcName}.`;
    }

    const npcType = npcTypes.get(npcId);
    if (!npcType) {
      return `Unknown NPC: ${npcName}.`;
    }

    let info = `${npcType.name}: ${npcType.description}. `;
    info += `Location: ${npcType.location}. `;
    
    if (npcType.hasShop) {
      info += `Has a shop. `;
    }
    
    if (npcType.hasDialogue) {
      info += `Can be talked to. `;
    }

    return info;
  } catch (error) {
    return "Couldn't get NPC information right now.";
  }
}

function generateNPCsOverview(world: any): string {
  try {
    const npcSystem = world.systems?.find((s: any) => s.name === 'NPCSystem');
    if (!npcSystem) {
      return "NPC system not available.";
    }

    const npcTypes = npcSystem.getNPCTypes();
    const activeNPCs = npcSystem.getActiveNPCs();

    let overview = `Available NPC types (${npcTypes.size}): `;
    const typeNames = Array.from(npcTypes.values())
      .slice(0, 4)
      .map(t => `${t.name} (${t.role})`)
      .join(', ');
    
    overview += typeNames;
    
    if (npcTypes.size > 4) {
      overview += ` and ${npcTypes.size - 4} more`;
    }

    overview += `.\\n\\nCurrently spawned: ${activeNPCs.size} NPCs active.`;

    return overview;
  } catch (error) {
    return "Couldn't get NPCs overview right now.";
  }
}

function generateActiveNPCsList(world: any): string {
  try {
    const npcSystem = world.systems?.find((s: any) => s.name === 'NPCSystem');
    if (!npcSystem) {
      return "NPC system not available.";
    }

    const activeNPCs = npcSystem.getActiveNPCs();
    const npcTypes = npcSystem.getNPCTypes();

    if (activeNPCs.size === 0) {
      return "No NPCs are currently spawned.";
    }

    const npcList = Array.from(activeNPCs.values()).map(npc => {
      const type = npcTypes.get(npc.typeId);
      return `${type?.name || 'Unknown'} (${type?.role || 'Unknown role'})`;
    });

    return `Active NPCs: ${npcList.join(', ')}. Total: ${activeNPCs.size} NPCs available.`;
  } catch (error) {
    return "Couldn't list active NPCs right now.";
  }
}