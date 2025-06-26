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

export const teachAction: Action = {
  name: 'ROBOT_TEACH',
  similes: ['teach robot', 'record motion', 'save demonstration', 'learn motion', 'record pose'],
  description: 'Teach the robot new motions by demonstration',

  validate: async (runtime: IAgentRuntime, message: Memory, _state?: State): Promise<boolean> => {
    const robotService = runtime.getService<RobotService>(RobotServiceType.ROBOT);
    if (!robotService) {
      logger.warn('[TeachAction] Robot service not available');
      return false;
    }

    if (!robotService.isConnected()) {
      logger.warn('[TeachAction] Robot not connected');
      return false;
    }

    const text = message.content.text?.toLowerCase() || '';
    const hasTeachKeywords = [
      'teach',
      'record',
      'save',
      'demonstration',
      'learn',
      'pose',
      'motion',
      'movement',
      'sequence',
      'capture position',
    ].some((keyword) => text.includes(keyword));

    return hasTeachKeywords;
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
    logger.info('[TeachAction] Processing teach command:', text);

    try {
      // Parse teaching command
      const command = parseTeachCommand(text);

      if (command.type === 'start_teaching') {
        // Switch to teaching mode
        await robotService.setMode(RobotMode.TEACHING);

        if (callback) {
          await callback({
            text:
              "🎓 Teaching mode activated! Move the robot to desired positions and I'll record them.\n" +
              'Commands:\n' +
              '- "Record pose [name]" - Save current position\n' +
              '- "Save motion [name]" - Save recorded sequence\n' +
              '- "Exit teaching" - Return to normal mode',
            actions: ['ROBOT_TEACH'],
          });
        }

        return {
          text: 'Teaching mode started',
          data: { mode: 'teaching' },
        };
      }

      if (command.type === 'stop_teaching') {
        // Exit teaching mode
        await robotService.setMode(RobotMode.IDLE);

        if (callback) {
          await callback({
            text: '✅ Exited teaching mode. Robot returned to idle.',
            actions: ['ROBOT_TEACH'],
          });
        }

        return {
          text: 'Teaching mode stopped',
          data: { mode: 'idle' },
        };
      }

      if (command.type === 'record_pose') {
        // Check if in teaching mode
        const currentState = robotService.getState();
        if (currentState.mode !== RobotMode.TEACHING) {
          await robotService.setMode(RobotMode.TEACHING);
        }

        // Record current pose
        const poseName = command.poseName || `pose_${Date.now()}`;
        await robotService.recordPose(poseName);

        if (callback) {
          await callback({
            text:
              `📸 Recorded pose: "${poseName}"\n` +
              'Current joint positions saved. Continue moving the robot or save the motion.',
            actions: ['ROBOT_TEACH'],
          });
        }

        return {
          text: `Pose ${poseName} recorded`,
          data: { pose: poseName },
        };
      }

      if (command.type === 'save_motion') {
        // Save the recorded motion sequence
        const motionName = command.motionName || `motion_${Date.now()}`;
        const description = command.description || 'Recorded motion sequence';

        try {
          await robotService.saveMotion(motionName, description);

          if (callback) {
            await callback({
              text:
                `💾 Motion saved: "${motionName}"\n` +
                `Description: ${description}\n` +
                `You can now execute this motion with "Execute motion ${motionName}"`,
              actions: ['ROBOT_TEACH'],
            });
          }

          return {
            text: `Motion ${motionName} saved`,
            data: { motion: motionName, description },
          };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);

          if (callback) {
            await callback({
              text:
                `❌ Error saving motion: ${errorMessage}\n` +
                'Make sure you have recorded at least one pose.',
              actions: ['ROBOT_TEACH'],
            });
          }

          return {
            text: 'Failed to save motion',
            data: { error: errorMessage },
          };
        }
      }

      if (command.type === 'list_motions') {
        // List all saved motions
        const motions = robotService.getStoredMotions();

        if (motions.length === 0) {
          if (callback) {
            await callback({
              text: '📋 No saved motions found. Use teaching mode to record new motions.',
              actions: ['ROBOT_TEACH'],
            });
          }
        } else {
          const motionList = motions.map((m, i) => `${i + 1}. ${m}`).join('\n');

          if (callback) {
            await callback({
              text:
                `📋 **Saved Motions:**\n${motionList}\n\n` +
                'Execute with: "Execute motion [name]"',
              actions: ['ROBOT_TEACH'],
            });
          }
        }

        return {
          text: 'Listed saved motions',
          data: { motions },
        };
      }

      if (command.type === 'execute_motion') {
        // Execute a saved motion
        const motionName = command.motionName!;

        // Ensure robot is in manual or autonomous mode
        const currentState = robotService.getState();
        if (currentState.mode === RobotMode.TEACHING || currentState.mode === RobotMode.IDLE) {
          await robotService.setMode(RobotMode.MANUAL);
        }

        try {
          await robotService.executeMotion(motionName);

          if (callback) {
            await callback({
              text: `🎬 Executing motion: "${motionName}"`,
              actions: ['ROBOT_TEACH'],
            });
          }

          return {
            text: `Motion ${motionName} executed`,
            data: { motion: motionName },
          };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);

          if (callback) {
            await callback({
              text: `❌ Error executing motion: ${errorMessage}`,
              actions: ['ROBOT_TEACH'],
            });
          }

          return {
            text: 'Failed to execute motion',
            data: { error: errorMessage },
          };
        }
      }

      // Unknown command
      if (callback) {
        await callback({
          text:
            "❓ I didn't understand that teaching command. Try:\n" +
            '- "Start teaching mode"\n' +
            '- "Record pose [name]"\n' +
            '- "Save motion [name]"\n' +
            '- "List saved motions"\n' +
            '- "Execute motion [name]"\n' +
            '- "Exit teaching"',
          actions: ['ROBOT_TEACH'],
        });
      }

      return {
        text: 'Command not recognized',
        data: { error: 'Unknown command' },
      };
    } catch (error) {
      logger.error('[TeachAction] Error executing teach command:', error);

      const errorMessage = error instanceof Error ? error.message : String(error);

      if (callback) {
        await callback({
          text: `❌ Error: ${errorMessage}`,
          actions: ['ROBOT_TEACH'],
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
          text: 'Start teaching the robot',
        },
      },
      {
        name: 'agent',
        content: {
          text: "🎓 Teaching mode activated! Move the robot to desired positions and I'll record them.",
          actions: ['ROBOT_TEACH'],
        },
      },
    ],
    [
      {
        name: 'user',
        content: {
          text: 'Record this pose as standing position',
        },
      },
      {
        name: 'agent',
        content: {
          text: '📸 Recorded pose: "standing position"',
          actions: ['ROBOT_TEACH'],
        },
      },
    ],
    [
      {
        name: 'user',
        content: {
          text: 'Save this motion as wave hello',
        },
      },
      {
        name: 'agent',
        content: {
          text: '💾 Motion saved: "wave hello"',
          actions: ['ROBOT_TEACH'],
        },
      },
    ],
  ],
};

// Helper function to parse teaching commands
function parseTeachCommand(text: string): {
  type: string;
  poseName?: string;
  motionName?: string;
  description?: string;
} {
  const lowerText = text.toLowerCase();

  // Start/stop teaching
  if (
    lowerText.includes('start teach') ||
    lowerText.includes('teaching mode') ||
    lowerText.includes('enter teach')
  ) {
    return { type: 'start_teaching' };
  }

  if (
    lowerText.includes('stop teach') ||
    lowerText.includes('exit teach') ||
    lowerText.includes('finish teach')
  ) {
    return { type: 'stop_teaching' };
  }

  // Record pose
  if (
    lowerText.includes('record') &&
    (lowerText.includes('pose') || lowerText.includes('position'))
  ) {
    // Extract pose name after "as" or "called"
    const nameMatch = text.match(/(?:as|called|named?)\s+["']?([^"'\n]+)["']?/i);
    const poseName = nameMatch ? nameMatch[1].trim() : undefined;

    return { type: 'record_pose', poseName };
  }

  // Save motion
  if (lowerText.includes('save') && lowerText.includes('motion')) {
    // Extract motion name
    const nameMatch = text.match(/(?:as|called|named?)\s+["']?([^"'\n]+)["']?/i);
    const motionName = nameMatch ? nameMatch[1].trim() : undefined;

    // Extract description if provided
    const descMatch = text.match(/(?:description|desc):\s*["']?([^"'\n]+)["']?/i);
    const description = descMatch ? descMatch[1].trim() : undefined;

    return { type: 'save_motion', motionName, description };
  }

  // List motions
  if (lowerText.includes('list') && lowerText.includes('motion')) {
    return { type: 'list_motions' };
  }

  // Execute motion
  if (lowerText.includes('execute') || lowerText.includes('run') || lowerText.includes('play')) {
    if (lowerText.includes('motion')) {
      // Extract motion name
      const words = text.split(/\s+/);
      const actionIndex = words.findIndex((w) =>
        ['execute', 'run', 'play'].includes(w.toLowerCase())
      );

      if (actionIndex >= 0 && actionIndex < words.length - 1) {
        // Take everything after the action word as the motion name
        const motionName = words
          .slice(actionIndex + 2)
          .join(' ')
          .replace(/["']/g, '');
        return { type: 'execute_motion', motionName };
      }
    }
  }

  return { type: 'unknown' };
}
