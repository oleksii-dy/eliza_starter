/**
 * Monster Actions for Agent Interaction
 * ====================================
 * Natural language interface for AI agents to interact with monsters
 */

import { ActionExample, IAgentRuntime, Memory, State, type Action } from '@elizaos/core';

export const hyperfyMonsterAction: Action = {
  name: 'HYPERFY_MONSTER',
  similes: [
    'MONSTER',
    'ATTACK',
    'FIGHT',
    'KILL',
    'COMBAT',
    'BATTLE',
    'SLAY',
    'HUNT',
    'CREATURE',
    'MONSTER_ACTION'
  ],
  description: 'Engage in combat with monsters, track spawns, and manage monster interactions',
  
  validate: async (runtime: IAgentRuntime, message: Memory) => {
    const text = message.content.text?.toLowerCase() || '';
    
    // Check for monster-related keywords
    const monsterKeywords = [
      'monster', 'attack', 'fight', 'kill', 'combat', 'battle', 'slay', 'hunt', 'creature',
      'chicken', 'cow', 'rat', 'skeleton', 'goblin', 'dragon', 'demon', 'spider',
      'abyssal', 'cave crawler', 'giant rat', 'giant spider', 'hill giant',
      'spawn', 'respawn', 'drop', 'loot', 'xp', 'experience', 'training',
      'slayer monster', 'aggressive', 'non-aggressive', 'combat level'
    ];
    
    const hasKeyword = monsterKeywords.some(keyword => text.includes(keyword));
    
    if (!hasKeyword) {
      return false;
    }

    // Additional validation: check if monster system is available
    try {
      const hyperfyService = runtime.getService('hyperfy');
      if (!hyperfyService) {
        return false;
      }

      const world = (hyperfyService as any).getWorld();
      const monsterSystem = world.systems?.find((s: any) => s.name === 'MonsterSystem');
      
      if (!monsterSystem) {
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
      // Parse monster command
      const monsterCommand = parseMonsterCommand(text);
      
      if (!monsterCommand) {
        callback({
          text: "I don't understand that monster command. Try 'attack chicken' or 'fight skeleton'.",
          action: 'MONSTER_HELP'
        });
        return;
      }

      // Get world service to emit monster events
      const hyperfyService = runtime.getService('hyperfy');
      if (!hyperfyService) {
        callback({
          text: "Hyperfy service not available for monster actions.",
          action: 'SERVICE_ERROR'
        });
        return;
      }

      const world = (hyperfyService as any).getWorld();
      const playerId = runtime.character?.name || 'agent';
      const monsterSystem = world.systems?.find((s: any) => s.name === 'MonsterSystem');

      if (!monsterSystem) {
        callback({
          text: "Monster system not available.",
          action: 'SYSTEM_ERROR'
        });
        return;
      }

      let responseText = '';
      let actionType = '';

      switch (monsterCommand.action) {
        case 'attack':
          if (monsterCommand.monsterId) {
            // Attack specific monster
            const validation = monsterSystem.canAttackMonster(playerId, monsterCommand.monsterId);
            
            if (!validation.canAttack) {
              callback({
                text: `I can't attack that monster: ${validation.reason}`,
                action: 'MONSTER_INVALID'
              });
              return;
            }

            world.events.emit('rpg:attack_monster', {
              playerId,
              monsterId: monsterCommand.monsterId
            });
            
            const monster = monsterSystem.getMonster(monsterCommand.monsterId);
            const monsterTypes = monsterSystem.getMonsterTypes();
            const monsterType = monsterTypes.get(monster?.typeId || '');
            
            responseText = `I'm attacking the ${monsterType?.name || 'monster'}! Time for combat!`;
            actionType = 'ATTACK_MONSTER';
          } else if (monsterCommand.monsterType) {
            // Find and attack monster by type
            const monsters = monsterSystem.getMonstersByType(monsterCommand.monsterType);
            const availableMonster = monsters.find(m => m.currentHP > 0);
            
            if (availableMonster) {
              const validation = monsterSystem.canAttackMonster(playerId, availableMonster.id);
              
              if (!validation.canAttack) {
                callback({
                  text: `I can't attack that ${monsterCommand.monsterType.replace(/_/g, ' ')}: ${validation.reason}`,
                  action: 'MONSTER_INVALID'
                });
                return;
              }

              world.events.emit('rpg:attack_monster', {
                playerId,
                monsterId: availableMonster.id
              });
              
              const monsterTypes = monsterSystem.getMonsterTypes();
              const monsterType = monsterTypes.get(availableMonster.typeId);
              
              responseText = `I found a ${monsterType?.name || 'monster'} and I'm attacking it!`;
              actionType = 'ATTACK_MONSTER_TYPE';
            } else {
              responseText = `I can't find any ${monsterCommand.monsterType.replace(/_/g, ' ')} to attack right now.`;
              actionType = 'NO_MONSTER_FOUND';
            }
          } else {
            // List available monsters to attack
            const activeMonsters = monsterSystem.getActiveMonsters();
            const aliveMonsters = Array.from(activeMonsters.values()).filter(m => m.currentHP > 0);
            
            if (aliveMonsters.length > 0) {
              const monsterTypes = monsterSystem.getMonsterTypes();
              const monsterNames = aliveMonsters.slice(0, 5).map(m => {
                const type = monsterTypes.get(m.typeId);
                return type?.name || 'Unknown';
              });
              
              responseText = `I can attack these monsters: ${monsterNames.join(', ')}. Which one should I target?`;
              actionType = 'MONSTER_LIST';
            } else {
              responseText = "I don't see any monsters to attack right now.";
              actionType = 'NO_MONSTERS';
            }
          }
          break;

        case 'spawn':
          if (monsterCommand.monsterType && monsterCommand.position) {
            world.events.emit('rpg:spawn_monster', {
              monsterTypeId: monsterCommand.monsterType,
              position: monsterCommand.position
            });
            
            responseText = `I'll spawn a ${monsterCommand.monsterType.replace(/_/g, ' ')} at position ${monsterCommand.position.x},${monsterCommand.position.y},${monsterCommand.position.z}.`;
            actionType = 'SPAWN_MONSTER';
          } else if (monsterCommand.monsterType) {
            responseText = `Where should I spawn the ${monsterCommand.monsterType.replace(/_/g, ' ')}? Please specify coordinates.`;
            actionType = 'MONSTER_CLARIFY';
          } else {
            // List available monster types
            const monsterTypes = monsterSystem.getMonsterTypes();
            const typeNames = Array.from(monsterTypes.values()).slice(0, 8).map(t => t.name);
            responseText = `What type of monster should I spawn? Available types: ${typeNames.join(', ')}.`;
            actionType = 'MONSTER_CLARIFY';
          }
          break;

        case 'info':
          if (monsterCommand.monsterType) {
            responseText = generateMonsterInfo(world, monsterCommand.monsterType);
            actionType = 'MONSTER_INFO';
          } else {
            responseText = generateMonstersOverview(world);
            actionType = 'MONSTERS_OVERVIEW';
          }
          break;

        case 'list':
          if (monsterCommand.region) {
            const monstersInRegion = monsterSystem.getMonstersByRegion(monsterCommand.region);
            
            if (monstersInRegion.length > 0) {
              const monsterTypes = monsterSystem.getMonsterTypes();
              const monsterSummary = monstersInRegion.map(m => {
                const type = monsterTypes.get(m.typeId);
                return `${type?.name || 'Unknown'} (Level ${m.combatLevel})`;
              });
              
              responseText = `Monsters in ${monsterCommand.region}: ${monsterSummary.join(', ')}.`;
            } else {
              responseText = `No monsters found in ${monsterCommand.region}.`;
            }
            actionType = 'LIST_MONSTERS_REGION';
          } else {
            responseText = generateActiveMonstersList(world);
            actionType = 'LIST_MONSTERS';
          }
          break;

        case 'hunt':
          if (monsterCommand.monsterType) {
            // Find best hunting spot for monster type
            const monsters = monsterSystem.getMonstersByType(monsterCommand.monsterType);
            
            if (monsters.length > 0) {
              const regions = [...new Set(monsters.map(m => {
                if (m.spawnPointId) {
                  const spawnPoints = (monsterSystem as any).spawnPoints;
                  const spawnPoint = spawnPoints.get(m.spawnPointId);
                  return spawnPoint?.region || 'Unknown';
                }
                return 'Unknown';
              }))];
              
              responseText = `I can hunt ${monsterCommand.monsterType.replace(/_/g, ' ')} in these areas: ${regions.join(', ')}. Let me head there!`;
              actionType = 'HUNT_MONSTER';
            } else {
              responseText = `I can't find any ${monsterCommand.monsterType.replace(/_/g, ' ')} to hunt right now.`;
              actionType = 'NO_HUNT_TARGET';
            }
          } else {
            responseText = "What monster should I hunt? Try 'hunt chicken' or 'hunt skeleton'.";
            actionType = 'MONSTER_CLARIFY';
          }
          break;

        default:
          responseText = "I'm not sure what monster action you want me to perform.";
          actionType = 'MONSTER_UNKNOWN';
      }

      // Emit RPG event for monster action
      world.events.emit('rpg:agent_action', {
        playerId,
        action: 'monster',
        details: monsterCommand,
        timestamp: Date.now()
      });

      callback({
        text: responseText,
        action: actionType,
        metadata: {
          skill: 'combat',
          command: monsterCommand,
          timestamp: Date.now()
        }
      });

    } catch (error) {
      console.error('Error in monster action:', error);
      callback({
        text: "Something went wrong while trying to interact with monsters. Let me try again.",
        action: 'MONSTER_ERROR'
      });
    }
  },

  examples: [
    [
      {
        user: "{{user1}}",
        content: {
          text: "Attack chicken"
        }
      } as ActionExample,
      {
        user: "{{user2}}",
        content: {
          text: "I found a Chicken and I'm attacking it!"
        }
      } as ActionExample
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Fight skeleton"
        }
      } as ActionExample,
      {
        user: "{{user2}}",
        content: {
          text: "I found a Skeleton and I'm attacking it!"
        }
      } as ActionExample
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "What monsters can I attack?"
        }
      } as ActionExample,
      {
        user: "{{user2}}",
        content: {
          text: "I can attack these monsters: Chicken, Cow, Giant rat, Skeleton. Which one should I target?"
        }
      } as ActionExample
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Hunt abyssal demons"
        }
      } as ActionExample,
      {
        user: "{{user2}}",
        content: {
          text: "I can hunt abyssal demon in these areas: Slayer Tower. Let me head there!"
        }
      } as ActionExample
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Monster info cow"
        }
      } as ActionExample,
      {
        user: "{{user2}}",
        content: {
          text: "Cow (Level 2): 8 HP, Max hit: 1, Non-aggressive. Drops: Bones, Raw beef, Cowhide. Found in Lumbridge."
        }
      } as ActionExample
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "List monsters"
        }
      } as ActionExample,
      {
        user: "{{user2}}",
        content: {
          text: "Active monsters: 3 Chickens, 2 Cows, 1 Giant rat, 1 Skeleton. Total: 7 monsters spawned."
        }
      } as ActionExample
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Spawn giant rat at 50,0,50"
        }
      } as ActionExample,
      {
        user: "{{user2}}",
        content: {
          text: "I'll spawn a giant rat at position 50,0,50."
        }
      } as ActionExample
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Battle"
        }
      } as ActionExample,
      {
        user: "{{user2}}",
        content: {
          text: "I can attack these monsters: Chicken, Cow, Giant rat. Which one should I target?"
        }
      } as ActionExample
    ]
  ] as ActionExample[][]
};

interface MonsterCommand {
  action: 'attack' | 'spawn' | 'info' | 'list' | 'hunt';
  monsterId?: string;
  monsterType?: string;
  region?: string;
  position?: { x: number, y: number, z: number };
}

function parseMonsterCommand(text: string): MonsterCommand | null {
  text = text.toLowerCase().trim();

  // Hunt patterns
  if (text.includes('hunt') || text.includes('hunting')) {
    const monsterType = extractMonsterType(text);
    return { action: 'hunt', monsterType };
  }

  // List patterns
  if (text.includes('list monster') || text.includes('show monster') || text.includes('monsters in')) {
    const region = extractRegion(text);
    return { action: 'list', region };
  }

  // Info patterns
  if (text.includes('monster info') || text.includes('info about') || text.includes('tell me about')) {
    const monsterType = extractMonsterType(text);
    return { action: 'info', monsterType };
  }

  // Spawn patterns
  if (text.includes('spawn') || text.includes('summon') || text.includes('create monster')) {
    const monsterType = extractMonsterType(text);
    const position = extractPosition(text);
    return { action: 'spawn', monsterType, position };
  }

  // Attack patterns
  if (text.includes('attack') || text.includes('fight') || text.includes('kill') || 
      text.includes('battle') || text.includes('slay') || text.includes('combat')) {
    const monsterType = extractMonsterType(text);
    const monsterId = extractMonsterId(text);
    return { action: 'attack', monsterType, monsterId };
  }

  return null;
}

function extractMonsterType(text: string): string | undefined {
  // Map monster names to IDs
  const monsterMap: Record<string, string> = {
    'chicken': 'chicken',
    'chickens': 'chicken',
    'cow': 'cow',
    'cows': 'cow',
    'giant rat': 'giant_rat',
    'rat': 'giant_rat',
    'rats': 'giant_rat',
    'skeleton': 'skeleton',
    'skeletons': 'skeleton',
    'goblin': 'goblin',
    'goblins': 'goblin',
    'cave crawler': 'cave_crawler',
    'cave crawlers': 'cave_crawler',
    'crawler': 'cave_crawler',
    'abyssal demon': 'abyssal_demon',
    'abyssal demons': 'abyssal_demon',
    'demon': 'abyssal_demon',
    'demons': 'abyssal_demon',
  };

  for (const [monsterName, monsterId] of Object.entries(monsterMap)) {
    if (text.includes(monsterName)) {
      return monsterId;
    }
  }

  return undefined;
}

function extractMonsterId(text: string): string | undefined {
  // Look for specific monster ID patterns like "monster_123"
  const monsterIdMatch = text.match(/monster_[\w\d_]+/);
  if (monsterIdMatch) {
    return monsterIdMatch[0];
  }

  return undefined;
}

function extractRegion(text: string): string | undefined {
  // Map region names
  const regionMap: Record<string, string> = {
    'lumbridge': 'Lumbridge',
    'varrock': 'Varrock',
    'falador': 'Falador',
    'edgeville': 'Edgeville',
    'draynor': 'Draynor',
    'barbarian village': 'Barbarian Village',
    'varrock sewers': 'Varrock Sewers',
    'edgeville dungeon': 'Edgeville Dungeon',
    'slayer tower': 'Slayer Tower',
  };

  for (const [regionName, region] of Object.entries(regionMap)) {
    if (text.includes(regionName)) {
      return region;
    }
  }

  return undefined;
}

function extractPosition(text: string): { x: number, y: number, z: number } | undefined {
  // Look for coordinate patterns like "at 50,0,50" or "position 100,20,100"
  const coordMatch = text.match(/(?:at|position)\s*(\d+),\s*(\d+),\s*(\d+)/);
  if (coordMatch) {
    return {
      x: parseInt(coordMatch[1]),
      y: parseInt(coordMatch[2]),
      z: parseInt(coordMatch[3])
    };
  }

  return undefined;
}

function generateMonsterInfo(world: any, monsterType: string): string {
  try {
    const monsterSystem = world.systems?.find((s: any) => s.name === 'MonsterSystem');
    if (!monsterSystem) {
      return "Monster system not available.";
    }

    const monsterTypes = monsterSystem.getMonsterTypes();
    const monster = monsterTypes.get(monsterType);

    if (!monster) {
      return `Unknown monster type: ${monsterType.replace(/_/g, ' ')}.`;
    }

    let info = `${monster.name} (Level ${monster.combatLevel}): `;
    info += `${monster.hitpoints} HP, `;
    info += `Max hit: ${monster.maxHit}, `;
    info += `${monster.aggressive ? 'Aggressive' : 'Non-aggressive'}. `;

    if (monster.slayerLevelRequired > 0) {
      info += `Requires ${monster.slayerLevelRequired} Slayer. `;
    }

    // Add drop information
    const dropTables = (monsterSystem as any).dropTables;
    const dropTable = dropTables.get(monsterType);
    if (dropTable) {
      const drops = [
        ...dropTable.alwaysDrops,
        ...dropTable.commonDrops.filter((d: any) => d.chance > 0.5),
      ];
      
      if (drops.length > 0) {
        // This would need item name mapping in a real implementation
        info += `Drops: Common loot`;
      }
    }

    // Add location information
    const activeMonsters = monsterSystem.getMonstersByType(monsterType);
    if (activeMonsters.length > 0) {
      const regions = [...new Set(activeMonsters.map((m: any) => {
        if (m.spawnPointId) {
          const spawnPoints = (monsterSystem as any).spawnPoints;
          const spawnPoint = spawnPoints.get(m.spawnPointId);
          return spawnPoint?.region || 'Unknown';
        }
        return 'Unknown';
      }))];
      
      info += `. Found in ${regions.join(', ')}.`;
    }

    return info;
  } catch (error) {
    return "Couldn't get monster information right now.";
  }
}

function generateMonstersOverview(world: any): string {
  try {
    const monsterSystem = world.systems?.find((s: any) => s.name === 'MonsterSystem');
    if (!monsterSystem) {
      return "Monster system not available.";
    }

    const monsterTypes = monsterSystem.getMonsterTypes();
    const activeMonsters = monsterSystem.getActiveMonsters();

    let overview = `Available monster types (${monsterTypes.size}): `;
    const typeNames = Array.from(monsterTypes.values())
      .slice(0, 6)
      .map(t => `${t.name} (Lv.${t.combatLevel})`)
      .join(', ');
    
    overview += typeNames;
    
    if (monsterTypes.size > 6) {
      overview += ` and ${monsterTypes.size - 6} more`;
    }

    overview += `.\\n\\nCurrently spawned: ${activeMonsters.size} monsters active.`;

    return overview;
  } catch (error) {
    return "Couldn't get monsters overview right now.";
  }
}

function generateActiveMonstersList(world: any): string {
  try {
    const monsterSystem = world.systems?.find((s: any) => s.name === 'MonsterSystem');
    if (!monsterSystem) {
      return "Monster system not available.";
    }

    const activeMonsters = monsterSystem.getActiveMonsters();
    const monsterTypes = monsterSystem.getMonsterTypes();

    if (activeMonsters.size === 0) {
      return "No monsters are currently spawned.";
    }

    // Group monsters by type
    const monsterCounts: Record<string, number> = {};
    
    for (const monster of activeMonsters.values()) {
      const type = monsterTypes.get(monster.typeId);
      const typeName = type?.name || 'Unknown';
      monsterCounts[typeName] = (monsterCounts[typeName] || 0) + 1;
    }

    const countSummary = Object.entries(monsterCounts)
      .map(([name, count]) => `${count} ${name}${count > 1 ? 's' : ''}`)
      .join(', ');

    return `Active monsters: ${countSummary}. Total: ${activeMonsters.size} monsters spawned.`;
  } catch (error) {
    return "Couldn't list active monsters right now.";
  }
}