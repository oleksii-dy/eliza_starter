import {
  Action,
  ActionExample,
  HandlerCallback,
  IAgentRuntime,
  Memory,
  State,
  type Handler,
  type Validator,
  logger,
} from '@elizaos/core';
import { RobotServiceType, RobotMode } from '../types';
import { RobotServiceV2 } from '../services/robot-service-v2';

// Helper functions for parsing commands
function parseCommandType(text: string): string {
  const lower = text.toLowerCase();
  
  // Movement commands
  if (lower.includes('move') && (lower.includes('arm') || lower.includes('head') || lower.includes('leg'))) {
    return 'MOVE_JOINT';
  }
  if (lower.includes('walk') || lower.includes('step')) {
    return 'WALK';
  }
  if (lower.includes('turn') || lower.includes('rotate')) {
    return 'TURN';
  }
  
  // Gesture commands
  if (lower.includes('wave')) return 'WAVE';
  if (lower.includes('point')) return 'POINT';
  if (lower.includes('nod')) return 'NOD';
  if (lower.includes('shake') && lower.includes('head')) return 'SHAKE_HEAD';
  
  // System commands
  if (lower.includes('stop')) return 'STOP';
  if (lower.includes('emergency')) return 'EMERGENCY_STOP';
  if (lower.includes('reset')) return 'RESET';
  if (lower.includes('teach')) return 'START_TEACHING';
  
  // Vision commands
  if (lower.includes('look')) return 'LOOK_AT';
  if (lower.includes('track') || lower.includes('follow')) return 'TRACK';
  
  return 'UNKNOWN';
}

function parseCommandParameters(text: string): any {
  const lower = text.toLowerCase();
  const params: any = {};
  
  // Target parsing
  if (lower.includes('left arm')) params.target = 'left_arm';
  else if (lower.includes('right arm')) params.target = 'right_arm';
  else if (lower.includes('both arms')) params.target = 'both_arms';
  else if (lower.includes('head')) params.target = 'head';
  else if (lower.includes('waist')) params.target = 'waist';
  else if (lower.includes('left leg')) params.target = 'left_leg';
  else if (lower.includes('right leg')) params.target = 'right_leg';
  
  // Direction parsing
  if (lower.includes(' up')) params.direction = 'up';
  else if (lower.includes(' down')) params.direction = 'down';
  else if (lower.includes(' left')) params.direction = 'left';
  else if (lower.includes(' right')) params.direction = 'right';
  else if (lower.includes(' forward')) params.direction = 'forward';
  else if (lower.includes(' back')) params.direction = 'back';
  
  // Amount parsing
  const degreeMatch = lower.match(/(\d+)\s*degree/);
  if (degreeMatch) {
    params.amount = parseInt(degreeMatch[1]);
  }
  
  // Speed parsing
  if (lower.includes('slow')) params.speed = 0.3;
  else if (lower.includes('fast')) params.speed = 0.8;
  else if (lower.includes('quick')) params.speed = 0.8;
  else params.speed = 0.5; // Default medium speed
  
  return params;
}

const commandExamples: ActionExample[][] = [
  [
    {
      name: 'user',
      content: { text: 'Move your right arm up 45 degrees' },
    },
    {
      name: 'assistant',
      content: {
        text: 'Moving right arm up 45 degrees...',
        actions: ['ROBOT_COMMAND'],
      },
    },
  ],
  [
    {
      name: 'user',
      content: { text: 'Wave hello' },
    },
    {
      name: 'assistant',
      content: {
        text: 'Waving hello!',
        actions: ['ROBOT_COMMAND'],
      },
    },
  ],
  [
    {
      name: 'user',
      content: { text: 'Look to your left' },
    },
    {
      name: 'assistant',
      content: {
        text: 'Looking left...',
        actions: ['ROBOT_COMMAND'],
      },
    },
  ],
  [
    {
      name: 'user',
      content: { text: 'Stop all movement' },
    },
    {
      name: 'assistant',
      content: {
        text: 'Stopping all movement immediately.',
        actions: ['ROBOT_COMMAND'],
      },
    },
  ],
];

const validate: Validator = async (runtime: IAgentRuntime, message: Memory) => {
  const robotService = runtime.getService<RobotServiceV2>(RobotServiceType.ROBOT);
  
  if (!robotService || !robotService.isConnected()) {
    logger.warn('[CommandActionV2] Robot service not available or not connected');
    return false;
  }
  
  const text = message.content.text?.toLowerCase() || '';
  
  // Check for robot-related keywords
  const robotKeywords = [
    'move', 'turn', 'rotate', 'arm', 'head', 'leg', 'waist',
    'wave', 'point', 'nod', 'shake', 'gesture',
    'walk', 'step', 'forward', 'backward', 'left', 'right',
    'stop', 'halt', 'freeze', 'emergency',
    'look', 'track', 'follow', 'watch',
    'grab', 'grasp', 'pick', 'hold', 'release', 'drop',
    'pose', 'position', 'stand', 'sit',
    'teach', 'record', 'save',
  ];
  
  const hasRobotKeyword = robotKeywords.some(keyword => text.includes(keyword));
  
  // Also check for direct robot address
  const isAddressingRobot = text.includes('robot') || 
                           text.includes('your') || 
                           text.includes('you');
  
  return hasRobotKeyword || (isAddressingRobot && robotKeywords.some(kw => text.includes(kw)));
};

const handler: Handler = async (
  runtime: IAgentRuntime,
  message: Memory,
  state?: State,
  options?: { [key: string]: unknown },
  callback?: HandlerCallback
) => {
  const robotService = runtime.getService<RobotServiceV2>(RobotServiceType.ROBOT);
  
  if (!robotService) {
    logger.error('[CommandActionV2] Robot service not found');
    if (callback) {
      await callback({
        text: 'Robot control service is not available.',
        actions: [],
      });
    }
    return;
  }
  
  if (!robotService.isConnected()) {
    logger.warn('[CommandActionV2] Robot not connected');
    if (callback) {
      await callback({
        text: 'Robot is not connected. Please check the connection.',
        actions: [],
      });
    }
    return;
  }
  
  const commandText = message.content.text || '';
  const userId = message.entityId;
  
  logger.info(`[CommandActionV2] Processing command: "${commandText}"`);
  
  try {
    // Parse command type from natural language
    const commandType = parseCommandType(commandText);
    const parameters = parseCommandParameters(commandText);
    
    // Create robot command
    const command = {
      id: `cmd-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: commandType,
      natural_language: commandText,
      parameters,
      constraints: {
        maintain_balance: true,
        avoid_collisions: true,
        respect_limits: true,
      },
      metadata: {
        timestamp: Date.now(),
        source: 'natural_language',
        user_id: userId,
      },
    };
    
    // Execute command through service
    let result;
    if (commandType === 'STOP' || commandType === 'EMERGENCY_STOP') {
      await robotService.emergencyStop();
      result = { success: true, command_id: command.id, executed_at: Date.now() };
    } else if (commandType === 'START_TEACHING') {
      await robotService.setMode('TEACHING' as any);
      result = { success: true, command_id: command.id, executed_at: Date.now() };
    } else if (commandType === 'MOVE_JOINT' && parameters.target) {
      await robotService.moveJoint(parameters.target, parameters.amount || 0, parameters.speed);
      result = { success: true, command_id: command.id, executed_at: Date.now() };
    } else {
      // For other commands, try to execute through stored motions
      const motionName = commandType.toLowerCase();
      if (robotService.getStoredMotions().includes(motionName)) {
        await robotService.executeMotion(motionName);
        result = { success: true, command_id: command.id, executed_at: Date.now() };
      } else {
        result = { 
          success: false, 
          command_id: command.id, 
          executed_at: Date.now(),
          error: `Unknown command type: ${commandType}`
        };
      }
    }
    
    // Get current state for feedback
    const currentState = robotService.getState();
    const capabilities = robotService.getCapabilities();
    
    // Prepare response based on result
    let responseText = '';
    
    if (result.success) {
      // Success responses
      if (commandText.toLowerCase().includes('wave')) {
        responseText = 'I\'m waving hello! 👋';
      } else if (commandText.toLowerCase().includes('stop')) {
        responseText = 'All movement stopped.';
      } else if (commandText.toLowerCase().includes('look')) {
        responseText = 'I\'m looking in that direction now.';
      } else if (commandText.toLowerCase().includes('move')) {
        const target = result.metadata?.target || 'joint';
        responseText = `I've moved my ${target} as requested.`;
      } else if (commandText.toLowerCase().includes('teach')) {
        responseText = 'Teaching mode activated. You can now physically move my joints to teach me new poses.';
      } else {
        responseText = 'Command executed successfully.';
      }
      
      // Add state information if relevant
      if (currentState && commandText.toLowerCase().includes('status')) {
        responseText += `\n\nCurrent mode: ${currentState.mode}`;
        responseText += `\nStatus: ${currentState.status}`;
        responseText += `\nJoints active: ${currentState.joints.length}`;
      }
    } else {
      // Error responses
      if (result.error?.includes('emergency stopped')) {
        responseText = 'I cannot move because the emergency stop is active. Please release it first.';
      } else if (result.error?.includes('not found')) {
        responseText = `I couldn't find the ${result.error.split(':')[1]?.trim() || 'requested item'}.`;
      } else if (result.error?.includes('teaching mode')) {
        responseText = 'I\'m currently in teaching mode. Please stop teaching mode before issuing movement commands.';
      } else {
        responseText = `I couldn't execute that command: ${result.error || 'Unknown error'}`;
      }
    }
    
    // Add warnings if any
    if (result.warnings && result.warnings.length > 0) {
      responseText += '\n\nNote: ' + result.warnings.join(', ');
    }
    
    // Add execution time for debugging
    if (result.duration) {
      logger.debug(`[CommandActionV2] Command executed in ${result.duration}ms`);
    }
    
    if (callback) {
      await callback({
        text: responseText,
        actions: ['ROBOT_COMMAND'],
        metadata: {
          command_id: result.command_id,
          success: result.success,
          duration: result.duration,
        },
      });
    }
  } catch (error) {
    logger.error('[CommandActionV2] Error executing command:', error);
    
    if (callback) {
      await callback({
        text: 'I encountered an error while trying to execute that command. Please try again.',
        actions: ['ROBOT_COMMAND'],
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
};

export const robotCommandActionV2: Action = {
  name: 'ROBOT_COMMAND_V2',
  similes: ['MOVE_ROBOT', 'CONTROL_ROBOT', 'ROBOT_MOTION'],
  description: 'Execute natural language robot commands using the isomorphic robot interface',
  
  examples: commandExamples,
  validate,
  handler,
  effects: {
    provides: ['robot_action_executed', 'robot_state_changed'],
    requires: ['robot_connected'],
    modifies: ['robot_position', 'robot_mode'],
  },
}; 