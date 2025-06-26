import type { TestSuite } from '@elizaos/core';
import { RobotServiceType } from '../../types';

export class RobotRuntimeTestSuite implements TestSuite {
  name = 'robot-runtime';
  description = 'Runtime tests for robot functionality with real agent runtime';

  tests = [
    {
      name: 'Robot service with real runtime',
      fn: async (runtime: any) => {
        console.log('Starting robot service runtime test...');

        // Check if robot service is available
        const robotService = runtime.getService(RobotServiceType.ROBOT);

        if (!robotService) {
          console.log('⚠️  Robot service not configured - ensure plugin is loaded');
          throw new Error('Robot service must be available for this test');
        }

        console.log('✓ Robot service found in runtime');

        // Check character has robot plugin
        const hasRobotPlugin = runtime.character.plugins?.includes('@elizaos/plugin-robot');
        if (!hasRobotPlugin) {
          throw new Error('Character must have @elizaos/plugin-robot plugin loaded');
        }

        console.log('✓ Robot plugin loaded in character');

        // Verify service is properly initialized
        const state = robotService.getState();
        if (!state) {
          throw new Error('Robot service getState() returned null');
        }

        console.log(`✓ Robot state available - Status: ${state.status}, Mode: ${state.mode}`);
        console.log(
          `  Joints: ${state.joints.length}, Emergency Stop: ${state.isEmergencyStopped}`
        );
      },
    },

    {
      name: 'Execute robot movement command',
      fn: async (runtime: any) => {
        console.log('Testing robot movement command execution...');

        const robotService = runtime.getService(RobotServiceType.ROBOT);
        if (!robotService) {
          console.log('⚠️  Skipping - robot service not available');
          return;
        }

        // Create a movement message
        const message = {
          id: `test-move-${Date.now()}`,
          entityId: runtime.agentId,
          agentId: runtime.agentId,
          roomId: 'test-room',
          content: {
            text: 'Move the robot head to look left 30 degrees',
            source: 'test',
          },
          createdAt: Date.now(),
        };

        // Process the message
        await runtime.processMessage(message);

        // Wait for processing
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Check if command was processed
        const messages = await runtime.messageManager.getMessages({
          roomId: 'test-room',
          limit: 10,
        });

        const response = messages.find((m: any) => m.userId === runtime.agentId && m.id !== message.id);

        if (!response) {
          throw new Error('No response received for robot command');
        }

        console.log('✓ Robot command processed');
        console.log(`  Response: ${response.content.text?.substring(0, 100)}...`);

        // Verify command was understood
        const responseText = response.content.text?.toLowerCase() || '';
        if (
          !responseText.includes('head') &&
          !responseText.includes('mov') &&
          !responseText.includes('robot')
        ) {
          console.warn('⚠️  Response may not indicate command understanding');
        }
      },
    },

    {
      name: 'Robot state provider integration',
      fn: async (runtime: any) => {
        console.log('Testing robot state provider integration...');

        const robotService = runtime.getService(RobotServiceType.ROBOT);
        if (!robotService) {
          console.log('⚠️  Skipping - robot service not available');
          return;
        }

        // Create a status query message
        const message = {
          id: `test-status-${Date.now()}`,
          entityId: runtime.agentId,
          agentId: runtime.agentId,
          roomId: 'test-room-status',
          content: {
            text: 'What is the current robot status?',
            source: 'test',
          },
          createdAt: Date.now(),
        };

        // Compose state to check provider
        const state = await runtime.composeState(message);

        if (!state) {
          throw new Error('Failed to compose state');
        }

        // Check if robot state is in the composed state
        const stateText = state.text || '';
        const hasRobotInfo =
          stateText.includes('Robot Status:') ||
          stateText.includes('robot') ||
          stateText.includes('joints');

        if (!hasRobotInfo) {
          console.log('State text:', stateText);
          throw new Error('Robot state provider not providing information');
        }

        console.log('✓ Robot state provider working');

        // Process status query
        await runtime.processMessage(message);
        await new Promise((resolve) => setTimeout(resolve, 2000));

        const messages = await runtime.messageManager.getMessages({
          roomId: 'test-room-status',
          limit: 10,
        });

        const statusResponse = messages.find(
          (m: any) => m.userId === runtime.agentId && m.id !== message.id
        );

        if (statusResponse) {
          const text = statusResponse.content.text || '';
          console.log('✓ Status response received');
          console.log(`  Contains robot info: ${text.includes('robot') || text.includes('joint')}`);
        }
      },
    },

    {
      name: 'Command action validation in runtime',
      fn: async (runtime: any) => {
        console.log('Testing command action validation...');

        const robotService = runtime.getService(RobotServiceType.ROBOT);
        if (!robotService) {
          console.log('⚠️  Skipping - robot service not available');
          return;
        }

        // Find the command action
        const commandAction = runtime.actions.find(
          (a: any) => a.name === 'ROBOT_COMMAND' || a.name === 'ROBOT_COMMAND_V2'
        );

        if (!commandAction) {
          throw new Error('Robot command action not found in runtime');
        }

        console.log(`✓ Found command action: ${commandAction.name}`);

        // Test validation with valid command
        const validMessage = {
          entityId: runtime.agentId,
          agentId: runtime.agentId,
          roomId: 'test-room',
          content: {
            text: 'Move the robot arm up',
            source: 'test',
          },
        };

        const isValid = await commandAction.validate(runtime, validMessage, {});
        console.log(`✓ Valid command validation result: ${isValid}`);

        // Test with invalid command
        const invalidMessage = {
          entityId: runtime.agentId,
          agentId: runtime.agentId,
          roomId: 'test-room',
          content: {
            text: 'What is the weather?',
            source: 'test',
          },
        };

        const isInvalid = await commandAction.validate(runtime, invalidMessage, {});
        console.log(`✓ Invalid command validation result: ${isInvalid}`);

        if (isInvalid) {
          console.warn('⚠️  Action validated non-robot command');
        }
      },
    },

    {
      name: 'Safety features in runtime',
      fn: async (runtime: any) => {
        console.log('Testing safety features...');

        const robotService = runtime.getService(RobotServiceType.ROBOT);
        if (!robotService) {
          console.log('⚠️  Skipping - robot service not available');
          return;
        }

        // Check emergency stop functionality
        if (typeof robotService.emergencyStop !== 'function') {
          throw new Error('Emergency stop method not available');
        }

        console.log('✓ Emergency stop method available');

        // Get current state
        const stateBefore = robotService.getState();
        console.log(`  Emergency stop before: ${stateBefore.isEmergencyStopped}`);

        // Test emergency stop command via message
        const emergencyMessage = {
          id: `test-emergency-${Date.now()}`,
          entityId: runtime.agentId,
          agentId: runtime.agentId,
          roomId: 'test-room-emergency',
          content: {
            text: 'Emergency stop!',
            source: 'test',
          },
          createdAt: Date.now(),
        };

        await runtime.processMessage(emergencyMessage);
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Check response
        const messages = await runtime.messageManager.getMessages({
          roomId: 'test-room-emergency',
          limit: 10,
        });

        const emergencyResponse = messages.find(
          (m: any) => m.userId === runtime.agentId && m.id !== emergencyMessage.id
        );

        if (emergencyResponse) {
          console.log('✓ Emergency stop command processed');
          const responseText = emergencyResponse.content.text?.toLowerCase() || '';
          if (responseText.includes('emergency') || responseText.includes('stop')) {
            console.log('✓ Response acknowledges emergency stop');
          }
        }
      },
    },

    {
      name: 'Teaching mode in runtime',
      fn: async (runtime: any) => {
        console.log('Testing teaching mode functionality...');

        const robotService = runtime.getService(RobotServiceType.ROBOT);
        if (!robotService) {
          console.log('⚠️  Skipping - robot service not available');
          return;
        }

        // Find teach action
        const teachAction = runtime.actions.find((a: any) => a.name === 'ROBOT_TEACH');

        if (!teachAction) {
          console.log('⚠️  Teaching action not found');
          return;
        }

        console.log('✓ Teaching action found');

        // Test teaching command
        const teachMessage = {
          id: `test-teach-${Date.now()}`,
          entityId: runtime.agentId,
          agentId: runtime.agentId,
          roomId: 'test-room-teach',
          content: {
            text: 'Start teaching mode',
            source: 'test',
          },
          createdAt: Date.now(),
        };

        // Validate teaching command
        const canTeach = await teachAction.validate(runtime, teachMessage, {});
        console.log(`✓ Teaching command validation: ${canTeach}`);

        // Process teaching command
        await runtime.processMessage(teachMessage);
        await new Promise((resolve) => setTimeout(resolve, 2000));

        const messages = await runtime.messageManager.getMessages({
          roomId: 'test-room-teach',
          limit: 10,
        });

        const teachResponse = messages.find(
          (m: any) => m.userId === runtime.agentId && m.id !== teachMessage.id
        );

        if (teachResponse) {
          console.log('✓ Teaching command processed');
          console.log(`  Response: ${teachResponse.content.text?.substring(0, 100)}...`);
        }
      },
    },

    {
      name: 'Natural language parsing',
      fn: async (runtime: any) => {
        console.log('Testing natural language command parsing...');

        const robotService = runtime.getService(RobotServiceType.ROBOT);
        if (!robotService) {
          console.log('⚠️  Skipping - robot service not available');
          return;
        }

        // Test various natural language commands
        const testCommands = [
          'Move your right arm up 45 degrees',
          'Look to the left',
          'Wave hello',
          'Stand in home position',
          'Rotate your head 90 degrees clockwise',
        ];

        for (const command of testCommands) {
          console.log(`\nTesting command: "${command}"`);

          const message = {
            id: `test-nl-${Date.now()}-${Math.random()}`,
            entityId: runtime.agentId,
            agentId: runtime.agentId,
            roomId: `test-room-nl-${Date.now()}`,
            content: {
              text: command,
              source: 'test',
            },
            createdAt: Date.now(),
          };

          await runtime.processMessage(message);
          await new Promise((resolve) => setTimeout(resolve, 1500));

          const messages = await runtime.messageManager.getMessages({
            roomId: message.roomId,
            limit: 5,
          });

          const response = messages.find(
            (m: any) => m.userId === runtime.agentId && m.id !== message.id
          );

          if (response) {
            console.log(`  ✓ Response: ${response.content.text?.substring(0, 80)}...`);
          } else {
            console.log('  ⚠️  No response received');
          }
        }
      },
    },

    {
      name: 'IMU data integration',
      fn: async (runtime: any) => {
        console.log('Testing IMU data integration...');

        const robotService = runtime.getService(RobotServiceType.ROBOT);
        if (!robotService) {
          console.log('⚠️  Skipping - robot service not available');
          return;
        }

        // Check if IMU data method exists
        if (typeof robotService.getIMUData !== 'function') {
          console.log('⚠️  getIMUData method not available');
          return;
        }

        // Get IMU data
        const imuData = robotService.getIMUData();

        if (imuData) {
          console.log('✓ IMU data available');
          console.log(`  Timestamp: ${new Date(imuData.timestamp).toISOString()}`);
          console.log(
            `  Accelerometer: x=${imuData.accelerometer.x.toFixed(2)}, y=${imuData.accelerometer.y.toFixed(2)}, z=${imuData.accelerometer.z.toFixed(2)}`
          );
          console.log(
            `  Gyroscope: x=${imuData.gyroscope.x.toFixed(2)}, y=${imuData.gyroscope.y.toFixed(2)}, z=${imuData.gyroscope.z.toFixed(2)}`
          );

          if (imuData.orientation) {
            console.log(
              `  Orientation: w=${imuData.orientation.w.toFixed(2)}, x=${imuData.orientation.x.toFixed(2)}, y=${imuData.orientation.y.toFixed(2)}, z=${imuData.orientation.z.toFixed(2)}`
            );
          }
        } else {
          console.log('⚠️  No IMU data available (hardware may not be connected)');
        }
      },
    },
  ];
}

export default new RobotRuntimeTestSuite();
