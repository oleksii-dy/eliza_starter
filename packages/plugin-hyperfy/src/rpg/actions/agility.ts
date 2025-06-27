/**
 * Agility Actions for Agent Interaction
 * ====================================
 * Natural language interface for AI agents to interact with the agility system
 */

import { ActionExample, IAgentRuntime, Memory, State, type Action } from '@elizaos/core';

export const hyperfyAgilityAction: Action = {
  name: 'HYPERFY_AGILITY',
  similes: [
    'AGILITY',
    'OBSTACLE',
    'COURSE',
    'PARKOUR',
    'CLIMB',
    'JUMP',
    'BALANCE',
    'RUN',
    'STAMINA',
    'AGILITY_ACTION'
  ],
  description: 'Navigate obstacle courses, manage stamina, and improve agility in the RuneScape world',
  
  validate: async (runtime: IAgentRuntime, message: Memory) => {
    const text = message.content.text?.toLowerCase() || '';
    
    // Check for agility-related keywords
    const agilityKeywords = [
      'agility', 'obstacle', 'course', 'parkour', 'climb', 'jump', 'balance',
      'run', 'stamina', 'tightrope', 'wall', 'net', 'rope', 'branch',
      'gnome stronghold', 'draynor', 'al kharid', 'agility course',
      'obstacle course', 'log balance', 'zip line', 'tree branch'
    ];
    
    const hasKeyword = agilityKeywords.some(keyword => text.includes(keyword));
    
    if (!hasKeyword) {
      return false;
    }

    // Additional validation: check if player has agility capability
    try {
      const hyperfyService = runtime.getService('hyperfy');
      if (!hyperfyService) {
        return false;
      }

      const world = (hyperfyService as any).getWorld();
      const playerId = runtime.character?.name || 'agent';
      const agilitySystem = world.systems?.find((s: any) => s.name === 'AgilitySystem');
      
      if (!agilitySystem) {
        return false;
      }

      return true; // Allow for general agility queries
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
      // Parse agility command
      const agilityCommand = parseAgilityCommand(text);
      
      if (!agilityCommand) {
        callback({
          text: "I don't understand that agility command. Try 'start gnome course' or 'climb rough wall'.",
          action: 'AGILITY_HELP'
        });
        return;
      }

      // Get world service to emit agility events
      const hyperfyService = runtime.getService('hyperfy');
      if (!hyperfyService) {
        callback({
          text: "Hyperfy service not available for agility actions.",
          action: 'SERVICE_ERROR'
        });
        return;
      }

      const world = (hyperfyService as any).getWorld();
      const playerId = runtime.character?.name || 'agent';
      const agilitySystem = world.systems?.find((s: any) => s.name === 'AgilitySystem');

      if (!agilitySystem) {
        callback({
          text: "Agility system not available.",
          action: 'SYSTEM_ERROR'
        });
        return;
      }

      let responseText = '';
      let actionType = '';

      switch (agilityCommand.action) {
        case 'start_course':
          if (agilityCommand.courseId) {
            // Validate course capability
            const validation = agilitySystem.canDoCourse(playerId, agilityCommand.courseId);
            
            if (!validation.canDo) {
              callback({
                text: `I can't start ${agilityCommand.courseId.replace(/_/g, ' ')} course: ${validation.reason}`,
                action: 'AGILITY_INVALID'
              });
              return;
            }

            world.events.emit('rpg:start_course', {
              playerId,
              courseId: agilityCommand.courseId
            });
            
            responseText = `I'll start the ${agilityCommand.courseId.replace(/_/g, ' ')} agility course! Let's see how fast I can complete it.`;
            actionType = 'START_COURSE';
          } else {
            responseText = "Which agility course should I start? Try 'gnome stronghold', 'draynor', or 'al kharid'.";
            actionType = 'AGILITY_CLARIFY';
          }
          break;

        case 'start_obstacle':
          if (agilityCommand.obstacleId) {
            // Validate obstacle capability
            const validation = agilitySystem.canDoObstacle(playerId, agilityCommand.obstacleId);
            
            if (!validation.canDo) {
              callback({
                text: `I can't do ${agilityCommand.obstacleId.replace(/_/g, ' ')}: ${validation.reason}`,
                action: 'AGILITY_INVALID'
              });
              return;
            }

            world.events.emit('rpg:start_obstacle', {
              playerId,
              obstacleId: agilityCommand.obstacleId
            });
            
            responseText = `I'll attempt the ${agilityCommand.obstacleId.replace(/_/g, ' ')}! This requires careful balance and timing.`;
            actionType = 'START_OBSTACLE';
          } else {
            responseText = "Which obstacle should I attempt? Try specifying like 'climb rough wall' or 'cross tightrope'.";
            actionType = 'AGILITY_CLARIFY';
          }
          break;

        case 'check_stamina':
          const stamina = agilitySystem.getPlayerStaminaPublic(playerId);
          responseText = `My stamina is at ${stamina.current}/${stamina.max}. `;
          if (stamina.current < stamina.max * 0.3) {
            responseText += "I'm getting tired and should rest soon.";
          } else if (stamina.current === stamina.max) {
            responseText += "I'm fully energized and ready for any challenge!";
          } else {
            responseText += "I feel good and can continue training.";
          }
          actionType = 'CHECK_STAMINA';
          break;

        case 'rest':
          // Natural stamina regeneration is handled by the system
          responseText = "I'll take a break to let my stamina recover. It regenerates naturally when I'm not actively training.";
          actionType = 'REST';
          break;

        case 'stop':
          // Try to stop current agility activity
          if (agilitySystem.isPlayerDoingObstacle(playerId)) {
            world.events.emit('rpg:fail_obstacle', { playerId });
            responseText = "I'll stop what I'm doing and step down from the obstacle safely.";
          } else if (agilitySystem.isPlayerDoingCourse(playerId)) {
            responseText = "I'll abandon this course run and return to the starting area.";
          } else {
            responseText = "I'm not currently doing any agility training.";
          }
          actionType = 'STOP_AGILITY';
          break;

        case 'check':
          responseText = generateAgilityStatus(world, playerId);
          actionType = 'CHECK_AGILITY';
          break;

        default:
          responseText = "I'm not sure what agility action you want me to perform.";
          actionType = 'AGILITY_UNKNOWN';
      }

      // Emit RPG event for agility action
      world.events.emit('rpg:agent_action', {
        playerId,
        action: 'agility',
        details: agilityCommand,
        timestamp: Date.now()
      });

      callback({
        text: responseText,
        action: actionType,
        metadata: {
          skill: 'agility',
          command: agilityCommand,
          timestamp: Date.now()
        }
      });

    } catch (error) {
      console.error('Error in agility action:', error);
      callback({
        text: "Something went wrong while trying to do agility training. Let me try again.",
        action: 'AGILITY_ERROR'
      });
    }
  },

  examples: [
    [
      {
        user: "{{user1}}",
        content: {
          text: "Start gnome stronghold course"
        }
      } as ActionExample,
      {
        user: "{{user2}}",
        content: {
          text: "I'll start the gnome stronghold agility course! Let's see how fast I can complete it."
        }
      } as ActionExample
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Climb rough wall"
        }
      } as ActionExample,
      {
        user: "{{user2}}",
        content: {
          text: "I'll attempt the rough wall! This requires careful balance and timing."
        }
      } as ActionExample
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Cross tightrope"
        }
      } as ActionExample,
      {
        user: "{{user2}}",
        content: {
          text: "I'll attempt the tightrope! This requires careful balance and timing."
        }
      } as ActionExample
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Check stamina"
        }
      } as ActionExample,
      {
        user: "{{user2}}",
        content: {
          text: "My stamina is at 45/67. I feel good and can continue training."
        }
      } as ActionExample
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Start draynor course"
        }
      } as ActionExample,
      {
        user: "{{user2}}",
        content: {
          text: "I'll start the draynor village agility course! Let's see how fast I can complete it."
        }
      } as ActionExample
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Rest and recover"
        }
      } as ActionExample,
      {
        user: "{{user2}}",
        content: {
          text: "I'll take a break to let my stamina recover. It regenerates naturally when I'm not actively training."
        }
      } as ActionExample
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Stop agility training"
        }
      } as ActionExample,
      {
        user: "{{user2}}",
        content: {
          text: "I'll stop what I'm doing and step down from the obstacle safely."
        }
      } as ActionExample
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Check agility progress"
        }
      } as ActionExample,
      {
        user: "{{user2}}",
        content: {
          text: "Let me check my agility level and current training status."
        }
      } as ActionExample
    ]
  ] as ActionExample[][]
};

interface AgilityCommand {
  action: 'start_course' | 'start_obstacle' | 'check_stamina' | 'rest' | 'stop' | 'check';
  courseId?: string;
  obstacleId?: string;
}

function parseAgilityCommand(text: string): AgilityCommand | null {
  text = text.toLowerCase().trim();

  // Stop agility patterns
  if (text.includes('stop agility') || text.includes('quit agility') || text.includes('stop training')) {
    return { action: 'stop' };
  }

  // Check agility patterns
  if (text.includes('check agility') || text.includes('agility level') || 
      text.includes('agility progress') || text.includes('agility status')) {
    return { action: 'check' };
  }

  // Check stamina patterns
  if (text.includes('check stamina') || text.includes('stamina level') || text.includes('how tired')) {
    return { action: 'check_stamina' };
  }

  // Rest patterns
  if (text.includes('rest') || text.includes('recover') || text.includes('take a break')) {
    return { action: 'rest' };
  }

  // Start course patterns
  if (text.includes('start') && text.includes('course')) {
    const courseId = extractCourseId(text);
    return { action: 'start_course', courseId };
  }

  // Obstacle patterns (climb, cross, jump, balance, etc.)
  if (text.includes('climb') || text.includes('cross') || text.includes('jump') || 
      text.includes('balance') || text.includes('obstacle') || text.includes('attempt')) {
    const obstacleId = extractObstacleId(text);
    if (obstacleId) {
      return { action: 'start_obstacle', obstacleId };
    }
  }

  return null;
}

function extractCourseId(text: string): string | undefined {
  // Map course names to IDs
  const courseMap: Record<string, string> = {
    'gnome stronghold': 'gnome_stronghold',
    'gnome': 'gnome_stronghold',
    'stronghold': 'gnome_stronghold',
    'draynor village': 'draynor_village',
    'draynor': 'draynor_village',
    'al kharid': 'al_kharid',
    'alkharid': 'al_kharid',
    'kharid': 'al_kharid',
  };

  for (const [courseName, courseId] of Object.entries(courseMap)) {
    if (text.includes(courseName)) {
      return courseId;
    }
  }

  return undefined;
}

function extractObstacleId(text: string): string | undefined {
  // Map obstacle names to IDs
  const obstacleMap: Record<string, string> = {
    'rough wall': 'gnome_rough_wall',
    'wall': 'gnome_rough_wall',
    'log balance': 'gnome_log_balance',
    'log': 'gnome_log_balance',
    'obstacle net': 'gnome_obstacle_net',
    'net': 'gnome_obstacle_net',
    'tree branch': 'gnome_tree_branch',
    'branch': 'gnome_tree_branch',
    'balancing rope': 'gnome_balancing_rope',
    'rope': 'gnome_balancing_rope',
    'tightrope': 'draynor_tightrope',
    'tight rope': 'draynor_tightrope',
    'narrow wall': 'draynor_narrow_wall',
    'obstacle pipe': 'gnome_obstacle_pipe',
    'pipe': 'gnome_obstacle_pipe',
    'cable': 'alkharid_cable',
    'zip line': 'alkharid_zip_line',
    'zipline': 'alkharid_zip_line',
    'tropical tree': 'alkharid_tropical_tree',
    'tree': 'alkharid_tropical_tree',
    'roof top beams': 'alkharid_roof_top_beams',
    'beams': 'alkharid_roof_top_beams',
  };

  // Try exact matches first
  for (const [obstacleName, obstacleId] of Object.entries(obstacleMap)) {
    if (text.includes(obstacleName)) {
      return obstacleId;
    }
  }

  // Default mapping based on course context
  if (text.includes('gnome') || text.includes('stronghold')) {
    if (text.includes('wall')) return 'gnome_rough_wall';
    if (text.includes('log')) return 'gnome_log_balance';
    if (text.includes('net')) return 'gnome_obstacle_net';
    if (text.includes('branch')) return 'gnome_tree_branch';
    if (text.includes('rope')) return 'gnome_balancing_rope';
    if (text.includes('pipe')) return 'gnome_obstacle_pipe';
  }

  if (text.includes('draynor')) {
    if (text.includes('wall') && text.includes('rough')) return 'draynor_rough_wall';
    if (text.includes('rope') || text.includes('tight')) return 'draynor_tightrope';
    if (text.includes('narrow')) return 'draynor_narrow_wall';
  }

  if (text.includes('al kharid') || text.includes('kharid')) {
    if (text.includes('wall')) return 'alkharid_rough_wall';
    if (text.includes('rope') || text.includes('tight')) return 'alkharid_tightrope';
    if (text.includes('cable')) return 'alkharid_cable';
    if (text.includes('zip')) return 'alkharid_zip_line';
    if (text.includes('tree')) return 'alkharid_tropical_tree';
    if (text.includes('beam')) return 'alkharid_roof_top_beams';
  }

  return undefined;
}

function generateAgilityStatus(world: any, playerId: string): string {
  try {
    // Get agility system from world
    const agilitySystem = world.systems?.find((s: any) => s.name === 'AgilitySystem');
    
    if (!agilitySystem) {
      return "The agility system isn't available right now.";
    }

    const isDoingObstacle = agilitySystem.isPlayerDoingObstacle(playerId);
    const isDoingCourse = agilitySystem.isPlayerDoingCourse(playerId);
    const stamina = agilitySystem.getPlayerStaminaPublic(playerId);

    let status = '';

    // Current activity
    if (isDoingObstacle) {
      const activeActions = agilitySystem.getActiveObstacleActions();
      const action = activeActions.get(playerId);
      if (action) {
        const obstacles = agilitySystem.getObstacles();
        const obstacle = obstacles.get(action.obstacleId);
        status += `I'm currently attempting ${obstacle?.name || 'an obstacle'}.\\\\n`;
        
        const timeRemaining = (action.startTime + action.duration) - Date.now();
        if (timeRemaining > 0) {
          status += `Time remaining: ${(timeRemaining / 1000).toFixed(1)}s\\\\n`;
        }
      }
    } else if (isDoingCourse) {
      const courseStates = agilitySystem.getPlayerCourseStates();
      const courseState = courseStates.get(playerId);
      if (courseState) {
        const courses = agilitySystem.getAgilityCourses();
        const course = courses.get(courseState.courseId);
        status += `I'm running the ${course?.name || 'agility course'}.\\\\n`;
        status += `Progress: ${courseState.completedObstacles.length}/${course?.obstacles.length || 0} obstacles\\\\n`;
        status += `XP gained this run: ${courseState.totalXpGained}\\\\n`;
      }
    } else {
      status = `I'm not currently doing agility training.\\\\n`;
    }

    // Stamina status
    status += `Stamina: ${stamina.current}/${stamina.max} `;
    if (stamina.current < stamina.max * 0.3) {
      status += "(tired)\\\\n";
    } else if (stamina.current === stamina.max) {
      status += "(full energy)\\\\n";
    } else {
      status += "(good condition)\\\\n";
    }

    // Available courses by level
    const stats = world.entities.players.get(playerId)?.data?.stats;
    if (stats) {
      const agilityLevel = stats.agility.level;
      const availableCourses = agilitySystem.getCoursesByLevel(1, agilityLevel);
      if (availableCourses.length > 0) {
        status += `Available courses: ${availableCourses.map((c: any) => c.name).join(', ')}\\\\n`;
      }
    }

    status += `I can train at obstacle courses to improve my agility and stamina!`;

    return status;
  } catch (error) {
    return "I couldn't check my agility status right now.";
  }
}