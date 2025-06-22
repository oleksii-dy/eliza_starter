import {
  Action,
  type IAgentRuntime,
  type Memory,
  type State,
  type HandlerCallback,
  type ActionResult,
  logger,
} from '@elizaos/core';
import { RobotService } from '../services/robot-service';
import { RobotServiceType, RobotMode, NavigationGoal, Pose } from '../types';

// Predefined poses for common positions
const PREDEFINED_POSES: { [name: string]: Pose } = {
  'home': {
    name: 'home',
    joints: {
      'head_yaw': 0,
      'head_pitch': 0,
      'left_shoulder_pitch': 0,
      'left_shoulder_roll': -0.1,
      'left_elbow_pitch': -0.5,
      'left_wrist_yaw': 0,
      'left_wrist_pitch': 0,
      'left_gripper': 0,
      'right_shoulder_pitch': 0,
      'right_shoulder_roll': 0.1,
      'right_elbow_pitch': -0.5,
      'right_wrist_yaw': 0,
      'right_wrist_pitch': 0,
      'right_gripper': 0,
      'left_hip_yaw': 0,
      'left_hip_roll': 0,
      'left_hip_pitch': -0.1,
      'left_knee_pitch': 0.2,
      'left_ankle_pitch': -0.1,
      'left_ankle_roll': 0,
      'right_hip_yaw': 0,
      'right_hip_roll': 0,
      'right_hip_pitch': -0.1,
      'right_knee_pitch': 0.2,
      'right_ankle_pitch': -0.1,
      'right_ankle_roll': 0,
    },
    duration: 2000,
  },
  'ready': {
    name: 'ready',
    joints: {
      'head_yaw': 0,
      'head_pitch': 0.1,
      'left_shoulder_pitch': -0.3,
      'left_shoulder_roll': -0.2,
      'left_elbow_pitch': -1.0,
      'left_wrist_yaw': 0,
      'left_wrist_pitch': 0,
      'left_gripper': 0.5,
      'right_shoulder_pitch': -0.3,
      'right_shoulder_roll': 0.2,
      'right_elbow_pitch': -1.0,
      'right_wrist_yaw': 0,
      'right_wrist_pitch': 0,
      'right_gripper': 0.5,
      'left_hip_yaw': 0,
      'left_hip_roll': 0.05,
      'left_hip_pitch': -0.2,
      'left_knee_pitch': 0.4,
      'left_ankle_pitch': -0.2,
      'left_ankle_roll': 0,
      'right_hip_yaw': 0,
      'right_hip_roll': -0.05,
      'right_hip_pitch': -0.2,
      'right_knee_pitch': 0.4,
      'right_ankle_pitch': -0.2,
      'right_ankle_roll': 0,
    },
    duration: 1500,
  },
  'sit': {
    name: 'sit',
    joints: {
      'head_yaw': 0,
      'head_pitch': 0,
      'left_shoulder_pitch': 0,
      'left_shoulder_roll': -0.1,
      'left_elbow_pitch': -0.3,
      'left_wrist_yaw': 0,
      'left_wrist_pitch': 0,
      'left_gripper': 0,
      'right_shoulder_pitch': 0,
      'right_shoulder_roll': 0.1,
      'right_elbow_pitch': -0.3,
      'right_wrist_yaw': 0,
      'right_wrist_pitch': 0,
      'right_gripper': 0,
      'left_hip_yaw': 0,
      'left_hip_roll': 0,
      'left_hip_pitch': -1.57,
      'left_knee_pitch': 1.57,
      'left_ankle_pitch': 0,
      'left_ankle_roll': 0,
      'right_hip_yaw': 0,
      'right_hip_roll': 0,
      'right_hip_pitch': -1.57,
      'right_knee_pitch': 1.57,
      'right_ankle_pitch': 0,
      'right_ankle_roll': 0,
    },
    duration: 3000,
  },
};

// Predefined motions for navigation
const NAVIGATION_MOTIONS: { [name: string]: string } = {
  'forward': 'walk_forward',
  'backward': 'walk_backward',
  'left': 'turn_left',
  'right': 'turn_right',
  'stop': 'stand',
};

export const gotoAction: Action = {
  name: 'ROBOT_GOTO',
  similes: ['go to', 'move to', 'walk to', 'navigate to', 'reach', 'approach'],
  description: 'Navigate the robot to a specific position or execute a predefined pose',
  
  validate: async (runtime: IAgentRuntime, message: Memory, state?: State): Promise<boolean> => {
    const robotService = runtime.getService<RobotService>(RobotServiceType.ROBOT);
    if (!robotService) {
      logger.warn('[GotoAction] Robot service not available');
      return false;
    }
    
    if (!robotService.isConnected()) {
      logger.warn('[GotoAction] Robot not connected');
      return false;
    }
    
    const text = message.content.text?.toLowerCase() || '';
    const hasGotoKeywords = [
      'go to', 'goto', 'move to', 'walk to', 'navigate',
      'reach', 'approach', 'position', 'home', 'ready', 'sit',
      'forward', 'backward', 'left', 'right', 'turn'
    ].some(keyword => text.includes(keyword));
    
    return hasGotoKeywords;
  },
  
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    options?: any,
    callback?: HandlerCallback
  ): Promise<ActionResult> => {
    const robotService = runtime.getService<RobotService>(RobotServiceType.ROBOT);
    if (!robotService) {
      throw new Error('Robot service not available');
    }
    
    const text = message.content.text || '';
    logger.info('[GotoAction] Processing goto command:', text);
    
    try {
      // Parse goto command
      const command = parseGotoCommand(text);
      
      if (command.type === 'pose') {
        // Execute predefined pose
        const pose = PREDEFINED_POSES[command.target!];
        if (!pose) {
          if (callback) {
            await callback({
              text: `❓ Unknown position "${command.target}". Available positions: ${Object.keys(PREDEFINED_POSES).join(', ')}`,
              actions: ['ROBOT_GOTO'],
            });
          }
          
          return {
            text: 'Unknown pose',
            data: { error: 'Unknown pose' },
          };
        }
        
        // Ensure robot is in manual mode
        const currentState = robotService.getState();
        if (currentState.mode !== RobotMode.MANUAL) {
          await robotService.setMode(RobotMode.MANUAL);
        }
        
        // Move to pose
        await robotService.moveToPose(pose);
        
        if (callback) {
          await callback({
            text: `🎯 Moving to ${command.target} position...`,
            actions: ['ROBOT_GOTO'],
          });
        }
        
        return {
          text: `Moving to ${command.target}`,
          data: { pose: command.target },
        };
      }
      
      if (command.type === 'motion') {
        // Execute navigation motion
        const motionName = NAVIGATION_MOTIONS[command.direction!];
        if (!motionName) {
          if (callback) {
            await callback({
              text: `❓ Unknown direction "${command.direction}"`,
              actions: ['ROBOT_GOTO'],
            });
          }
          
          return {
            text: 'Unknown direction',
            data: { error: 'Unknown direction' },
          };
        }
        
        // Check if motion exists
        const storedMotions = robotService.getStoredMotions();
        if (!storedMotions.includes(motionName)) {
          if (callback) {
            await callback({
              text: `⚠️ Motion "${motionName}" not found. Please teach the robot this motion first.`,
              actions: ['ROBOT_GOTO'],
            });
          }
          
          return {
            text: 'Motion not found',
            data: { error: 'Motion not found' },
          };
        }
        
        // Set to autonomous mode for motion execution
        await robotService.setMode(RobotMode.AUTONOMOUS);
        
        // Execute motion
        await robotService.executeMotion(motionName);
        
        if (callback) {
          await callback({
            text: `🚶 Moving ${command.direction}...`,
            actions: ['ROBOT_GOTO'],
          });
        }
        
        return {
          text: `Executing ${command.direction} motion`,
          data: { motion: motionName },
        };
      }
      
      if (command.type === 'coordinate') {
        // Navigate to specific coordinates (would require path planning)
        if (callback) {
          await callback({
            text: `📍 Navigation to coordinates not yet implemented. Position: (${command.x}, ${command.y})`,
            actions: ['ROBOT_GOTO'],
          });
        }
        
        return {
          text: 'Coordinate navigation not implemented',
          data: { x: command.x, y: command.y },
        };
      }
      
      // Unknown command
      if (callback) {
        await callback({
          text: `❓ I didn't understand that navigation command. Try:\n` +
                `- "Go to home position"\n` +
                `- "Move forward"\n` +
                `- "Turn left"\n` +
                `- "Sit down"`,
          actions: ['ROBOT_GOTO'],
        });
      }
      
      return {
        text: 'Command not recognized',
        data: { error: 'Unknown command' },
      };
      
    } catch (error) {
      logger.error('[GotoAction] Error executing goto command:', error);
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      if (callback) {
        await callback({
          text: `❌ Error executing navigation: ${errorMessage}`,
          actions: ['ROBOT_GOTO'],
        });
      }
      
      throw error;
    }
  },
  
  examples: [
    [
      {
        name: 'user',
        content: {
          text: 'Go to home position',
        },
      },
      {
        name: 'agent',
        content: {
          text: '🎯 Moving to home position...',
          actions: ['ROBOT_GOTO'],
        },
      },
    ],
    [
      {
        name: 'user',
        content: {
          text: 'Move forward',
        },
      },
      {
        name: 'agent',
        content: {
          text: '🚶 Moving forward...',
          actions: ['ROBOT_GOTO'],
        },
      },
    ],
    [
      {
        name: 'user',
        content: {
          text: 'Sit down',
        },
      },
      {
        name: 'agent',
        content: {
          text: '🎯 Moving to sit position...',
          actions: ['ROBOT_GOTO'],
        },
      },
    ],
  ],
};

// Helper function to parse goto commands
function parseGotoCommand(text: string): {
  type: string;
  target?: string;
  direction?: string;
  x?: number;
  y?: number;
} {
  const lowerText = text.toLowerCase();
  
  // Check for predefined poses
  for (const poseName of Object.keys(PREDEFINED_POSES)) {
    if (lowerText.includes(poseName)) {
      return { type: 'pose', target: poseName };
    }
  }
  
  // Check for sit/stand variations
  if (lowerText.includes('sit down') || lowerText.includes('sit')) {
    return { type: 'pose', target: 'sit' };
  }
  
  if (lowerText.includes('stand up') || lowerText.includes('stand')) {
    return { type: 'pose', target: 'ready' };
  }
  
  // Check for directional movement
  const directions = ['forward', 'backward', 'left', 'right'];
  for (const direction of directions) {
    if (lowerText.includes(direction)) {
      return { type: 'motion', direction };
    }
  }
  
  // Check for turn commands
  if (lowerText.includes('turn left')) {
    return { type: 'motion', direction: 'left' };
  }
  if (lowerText.includes('turn right')) {
    return { type: 'motion', direction: 'right' };
  }
  
  // Check for coordinate-based navigation
  const coordMatch = text.match(/\(?\s*(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)\s*\)?/);
  if (coordMatch) {
    return {
      type: 'coordinate',
      x: parseFloat(coordMatch[1]),
      y: parseFloat(coordMatch[2]),
    };
  }
  
  return { type: 'unknown' };
} 