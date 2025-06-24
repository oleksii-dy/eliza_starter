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
import { RobotServiceType, RobotMode } from '../types';

export const commandAction: Action = {
  name: 'ROBOT_COMMAND',
  similes: ['control robot', 'move robot', 'robot command', 'send command', 'control joints'],
  description: 'Send direct control commands to the robot',

  validate: async (runtime: IAgentRuntime, message: Memory, _state?: State): Promise<boolean> => {
    const robotService = runtime.getService<RobotService>(RobotServiceType.ROBOT);
    if (!robotService) {
      logger.warn('[CommandAction] Robot service not available');
      return false;
    }

    if (!robotService.isConnected()) {
      logger.warn('[CommandAction] Robot not connected');
      return false;
    }

    const text = message.content.text?.toLowerCase() || '';
    const hasCommandKeywords = [
      'move',
      'rotate',
      'turn',
      'position',
      'joint',
      'servo',
      'head',
      'arm',
      'leg',
      'gripper',
      'shoulder',
      'elbow',
      'wrist',
      'hip',
      'knee',
      'ankle',
      'degrees',
      'radians',
      'angle',
    ].some((keyword) => text.includes(keyword));

    return hasCommandKeywords;
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state?: State,
    _options?: any,
    callback?: HandlerCallback
  ): Promise<ActionResult> => {
    const robotService = runtime.getService<RobotService>(RobotServiceType.ROBOT);
    if (!robotService) {
      throw new Error('Robot service not available');
    }

    const text = message.content.text || '';
    logger.info('[CommandAction] Processing command:', text);

    try {
      // Parse command from natural language
      const command = parseRobotCommand(text);

      if (command.type === 'emergency_stop') {
        await robotService.emergencyStop();

        if (callback) {
          await callback({
            text: '🛑 Emergency stop activated! All robot movements halted.',
            actions: ['ROBOT_COMMAND'],
          });
        }

        return {
          text: 'Emergency stop executed',
          data: { emergency: true },
        };
      }

      if (command.type === 'release_stop') {
        await robotService.releaseEmergencyStop();

        if (callback) {
          await callback({
            text: '✅ Emergency stop released. Robot is ready for commands.',
            actions: ['ROBOT_COMMAND'],
          });
        }

        return {
          text: 'Emergency stop released',
          data: { emergency: false },
        };
      }

      if (command.type === 'set_mode') {
        await robotService.setMode(command.mode!);

        if (callback) {
          await callback({
            text: `🤖 Robot mode set to: ${command.mode}`,
            actions: ['ROBOT_COMMAND'],
          });
        }

        return {
          text: `Mode set to ${command.mode}`,
          data: { mode: command.mode },
        };
      }

      if (command.type === 'move_joint') {
        // Ensure robot is in manual mode
        const currentState = robotService.getState();
        if (currentState.mode !== RobotMode.MANUAL) {
          await robotService.setMode(RobotMode.MANUAL);
        }

        // Move the specified joint
        await robotService.moveJoint(command.jointName!, command.position!);

        if (callback) {
          await callback({
            text: `🎯 Moving ${command.jointName} to ${command.position?.toFixed(2)} radians`,
            actions: ['ROBOT_COMMAND'],
          });
        }

        return {
          text: `Joint ${command.jointName} commanded to ${command.position}`,
          data: {
            joint: command.jointName,
            position: command.position,
          },
        };
      }

      if (command.type === 'move_multiple') {
        // Ensure robot is in manual mode
        const currentState = robotService.getState();
        if (currentState.mode !== RobotMode.MANUAL) {
          await robotService.setMode(RobotMode.MANUAL);
        }

        // Move multiple joints
        const movements: string[] = [];
        for (const [joint, position] of Object.entries(command.joints!)) {
          await robotService.moveJoint(joint, position);
          movements.push(`${joint}: ${position.toFixed(2)}rad`);
        }

        if (callback) {
          await callback({
            text: `🎯 Moving multiple joints:\n${movements.join('\n')}`,
            actions: ['ROBOT_COMMAND'],
          });
        }

        return {
          text: `Commanded ${movements.length} joints`,
          data: { joints: command.joints },
        };
      }

      if (command.type === 'status') {
        const state = robotService.getState();
        const statusText = formatRobotStatus(state);

        if (callback) {
          await callback({
            text: statusText,
            actions: ['ROBOT_COMMAND'],
          });
        }

        return {
          text: 'Status retrieved',
          data: { state },
        };
      }

      // Unknown command
      if (callback) {
        await callback({
          text:
            "❓ I didn't understand that command. Try:\n" +
            '- "Move head yaw to 30 degrees"\n' +
            '- "Set robot to manual mode"\n' +
            '- "Emergency stop"\n' +
            '- "Show robot status"',
          actions: ['ROBOT_COMMAND'],
        });
      }

      return {
        text: 'Command not recognized',
        data: { error: 'Unknown command' },
      };
    } catch (error) {
      logger.error('[CommandAction] Error executing command:', error);

      const errorMessage = error instanceof Error ? error.message : String(error);

      if (callback) {
        await callback({
          text: `❌ Error executing command: ${errorMessage}`,
          actions: ['ROBOT_COMMAND'],
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
          text: 'Move the robot head yaw to 30 degrees',
        },
      },
      {
        name: 'agent',
        content: {
          text: '🎯 Moving head_yaw to 0.52 radians',
          actions: ['ROBOT_COMMAND'],
        },
      },
    ],
    [
      {
        name: 'user',
        content: {
          text: 'Emergency stop!',
        },
      },
      {
        name: 'agent',
        content: {
          text: '🛑 Emergency stop activated! All robot movements halted.',
          actions: ['ROBOT_COMMAND'],
        },
      },
    ],
    [
      {
        name: 'user',
        content: {
          text: 'Set robot to teaching mode',
        },
      },
      {
        name: 'agent',
        content: {
          text: '🤖 Robot mode set to: TEACHING',
          actions: ['ROBOT_COMMAND'],
        },
      },
    ],
  ],
};

// Helper function to parse natural language commands
function parseRobotCommand(text: string): {
  type: string;
  jointName?: string;
  position?: number;
  joints?: { [name: string]: number };
  mode?: RobotMode;
} {
  const lowerText = text.toLowerCase();

  // Emergency commands
  if (lowerText.includes('emergency') || lowerText.includes('stop all')) {
    return { type: 'emergency_stop' };
  }

  if (lowerText.includes('release') && lowerText.includes('stop')) {
    return { type: 'release_stop' };
  }

  // Mode commands
  if (lowerText.includes('mode')) {
    if (lowerText.includes('manual')) {
      return { type: 'set_mode', mode: RobotMode.MANUAL };
    }
    if (lowerText.includes('autonomous')) {
      return { type: 'set_mode', mode: RobotMode.AUTONOMOUS };
    }
    if (lowerText.includes('teaching')) {
      return { type: 'set_mode', mode: RobotMode.TEACHING };
    }
    if (lowerText.includes('idle')) {
      return { type: 'set_mode', mode: RobotMode.IDLE };
    }
  }

  // Status command
  if (lowerText.includes('status') || lowerText.includes('state')) {
    return { type: 'status' };
  }

  // Joint movement commands
  const jointMap: { [key: string]: string } = {
    'head yaw': 'head_yaw',
    'head pitch': 'head_pitch',
    'left shoulder pitch': 'left_shoulder_pitch',
    'left shoulder roll': 'left_shoulder_roll',
    'left elbow': 'left_elbow_pitch',
    'left wrist yaw': 'left_wrist_yaw',
    'left wrist pitch': 'left_wrist_pitch',
    'left gripper': 'left_gripper',
    'right shoulder pitch': 'right_shoulder_pitch',
    'right shoulder roll': 'right_shoulder_roll',
    'right elbow': 'right_elbow_pitch',
    'right wrist yaw': 'right_wrist_yaw',
    'right wrist pitch': 'right_wrist_pitch',
    'right gripper': 'right_gripper',
    'left hip yaw': 'left_hip_yaw',
    'left hip roll': 'left_hip_roll',
    'left hip pitch': 'left_hip_pitch',
    'left knee': 'left_knee_pitch',
    'left ankle pitch': 'left_ankle_pitch',
    'left ankle roll': 'left_ankle_roll',
    'right hip yaw': 'right_hip_yaw',
    'right hip roll': 'right_hip_roll',
    'right hip pitch': 'right_hip_pitch',
    'right knee': 'right_knee_pitch',
    'right ankle pitch': 'right_ankle_pitch',
    'right ankle roll': 'right_ankle_roll',
  };

  // Check for joint movement
  for (const [phrase, jointName] of Object.entries(jointMap)) {
    if (lowerText.includes(phrase)) {
      // Extract angle value
      const angleMatch = text.match(/(-?\d+\.?\d*)\s*(degrees?|radians?|rad|deg|°)/i);
      if (angleMatch) {
        let angle = parseFloat(angleMatch[1]);
        const unit = angleMatch[2].toLowerCase();

        // Convert to radians if needed
        if (unit.includes('deg') || unit === '°') {
          angle = (angle * Math.PI) / 180;
        }

        return {
          type: 'move_joint',
          jointName,
          position: angle,
        };
      }
    }
  }

  return { type: 'unknown' };
}

// Helper function to format robot status
function formatRobotStatus(state: any): string {
  const lines = [
    '🤖 **Robot Status**',
    `Mode: ${state.mode}`,
    `Status: ${state.status}`,
    `Emergency Stop: ${state.isEmergencyStopped ? 'ACTIVE ⚠️' : 'Released ✅'}`,
  ];

  if (state.batteryLevel !== undefined) {
    lines.push(`Battery: ${state.batteryLevel}%`);
  }

  if (state.imuData) {
    const { orientation } = state.imuData;
    lines.push(
      `Orientation: x=${orientation.x.toFixed(2)}, y=${orientation.y.toFixed(2)}, z=${orientation.z.toFixed(2)}, w=${orientation.w.toFixed(2)}`
    );
  }

  lines.push('\n**Joint Positions:**');
  const joints = state.joints.slice(0, 5); // Show first 5 joints
  for (const joint of joints) {
    lines.push(`- ${joint.name}: ${joint.position.toFixed(3)} rad`);
  }
  lines.push(`... and ${state.joints.length - 5} more joints`);

  return lines.join('\n');
}
