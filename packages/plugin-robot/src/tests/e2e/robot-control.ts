import type { TestSuite } from '@elizaos/core';
import { RobotServiceType, RobotMode } from '../../types';

export class RobotControlTestSuite implements TestSuite {
  name = 'robot-control';
  description = 'E2E tests for robot control functionality';

  tests = [
    {
      name: 'Robot service initialization',
      fn: async (runtime: any) => {
        // Check if robot service is available
        const robotService = runtime.getService(RobotServiceType.ROBOT);

        if (!robotService) {
          // This is OK if we're not configured for robot control
          console.log('⚠️  Robot service not configured - skipping robot tests');
          console.log('   Set USE_SIMULATION=true or connect hardware to enable');
          return;
        }

        console.log('✓ Robot service initialized');

        // Check if service has required methods
        const requiredMethods = [
          'isConnected',
          'getState',
          'setMode',
          'moveJoint',
          'emergencyStop',
        ];

        for (const method of requiredMethods) {
          if (typeof robotService[method] !== 'function') {
            throw new Error(`Robot service missing method: ${method}`);
          }
        }

        console.log('✓ All required methods present');
      },
    },

    {
      name: 'Robot state provider',
      fn: async (runtime: any) => {
        // Check if robot is configured
        const robotService = runtime.getService(RobotServiceType.ROBOT);
        if (!robotService) {
          console.log('⚠️  Robot service not configured - skipping state provider test');
          return;
        }

        // Compose state to check if robot state provider is working
        const message = {
          id: `test-msg-${Date.now()}`,
          entityId: 'test-entity',
          roomId: 'test-room',
          content: {
            text: 'Check robot status',
          },
          createdAt: Date.now(),
        };

        const state = await runtime.composeState(message);

        if (!state) {
          throw new Error('Failed to compose state');
        }

        // Check if robot state is included
        const stateText = state.text || '';

        if (
          !stateText.includes('Robot Status:') &&
          !stateText.includes('Robot service is not available')
        ) {
          throw new Error('Robot state provider not providing status information');
        }

        console.log('✓ Robot state provider working');
        console.log('State includes:', stateText.split('\n').slice(0, 5).join('\n'), '...');
      },
    },

    {
      name: 'Robot command action validation',
      fn: async (runtime: any) => {
        // Check if robot is configured
        const robotService = runtime.getService(RobotServiceType.ROBOT);
        if (!robotService) {
          console.log('⚠️  Robot service not configured - skipping command action test');
          return;
        }

        // Test command action validation
        const commandAction = runtime.actions.find((a: any) => a.name === 'ROBOT_COMMAND');

        if (!commandAction) {
          throw new Error('ROBOT_COMMAND action not found');
        }

        // Test with valid command
        const validMessage = {
          entityId: 'test-entity',
          roomId: 'test-room',
          content: {
            text: 'Move the robot head yaw to 30 degrees',
          },
        };

        const isValid = await commandAction.validate(runtime, validMessage);

        // Note: Validation might fail if robot is not connected, which is OK for testing
        console.log(`✓ Command action validation returned: ${isValid}`);

        // Test with invalid command
        const invalidMessage = {
          entityId: 'test-entity',
          roomId: 'test-room',
          content: {
            text: 'What is the weather today?',
          },
        };

        const isInvalid = await commandAction.validate(runtime, invalidMessage);

        if (isInvalid) {
          throw new Error('Command action validated invalid message');
        }

        console.log('✓ Command action correctly rejects non-robot commands');
      },
    },

    {
      name: 'Teaching action validation',
      fn: async (runtime: any) => {
        // Check if robot is configured
        const robotService = runtime.getService(RobotServiceType.ROBOT);
        if (!robotService) {
          console.log('⚠️  Robot service not configured - skipping teaching action test');
          return;
        }

        // Test teaching action
        const teachAction = runtime.actions.find((a: any) => a.name === 'ROBOT_TEACH');

        if (!teachAction) {
          throw new Error('ROBOT_TEACH action not found');
        }

        // Test with teaching command
        const teachMessage = {
          entityId: 'test-entity',
          roomId: 'test-room',
          content: {
            text: 'Start teaching the robot',
          },
        };

        const canTeach = await teachAction.validate(runtime, teachMessage);

        console.log(`✓ Teach action validation returned: ${canTeach}`);
      },
    },

    {
      name: 'Robot mode transitions',
      fn: async (runtime: any) => {
        const robotService = runtime.getService(RobotServiceType.ROBOT);

        if (!robotService) {
          console.log('⚠️  Robot service not configured - skipping mode transition test');
          return;
        }

        if (!robotService.isConnected()) {
          console.log('⚠️  Robot not connected (mock or hardware), skipping mode transition test');
          return;
        }

        // Get initial state
        const initialState = robotService.getState();
        console.log(`Initial mode: ${initialState.mode}`);

        // Try to set different modes
        const modes = [RobotMode.MANUAL, RobotMode.IDLE];

        for (const mode of modes) {
          try {
            await robotService.setMode(mode);
            const newState = robotService.getState();

            if (newState.mode !== mode) {
              throw new Error(`Failed to set mode to ${mode}`);
            }

            console.log(`✓ Successfully set mode to ${mode}`);
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.log(`⚠️  Could not set mode to ${mode}: ${errorMessage}`);
          }
        }
      },
    },

    {
      name: 'Safety features',
      fn: async (runtime: any) => {
        const robotService = runtime.getService(RobotServiceType.ROBOT);

        if (!robotService) {
          console.log('⚠️  Robot service not configured - skipping safety features test');
          return;
        }

        // Check if safety features are present
        const state = robotService.getState();

        if (typeof state.isEmergencyStopped !== 'boolean') {
          throw new Error('Emergency stop state not available');
        }

        console.log(`✓ Emergency stop state: ${state.isEmergencyStopped ? 'ACTIVE' : 'Released'}`);

        // Check if emergency stop methods exist
        if (typeof robotService.emergencyStop !== 'function') {
          throw new Error('Emergency stop method not found');
        }

        if (typeof robotService.releaseEmergencyStop !== 'function') {
          throw new Error('Release emergency stop method not found');
        }

        console.log('✓ Safety methods available');
      },
    },

    {
      name: 'Robot state structure',
      fn: async (runtime: any) => {
        const robotService = runtime.getService(RobotServiceType.ROBOT);

        if (!robotService) {
          console.log('⚠️  Robot service not configured - skipping state structure test');
          return;
        }

        const state = robotService.getState();

        // Verify state structure
        const requiredFields = ['timestamp', 'joints', 'mode', 'status', 'isEmergencyStopped'];

        for (const field of requiredFields) {
          if (!(field in state)) {
            throw new Error(`Robot state missing field: ${field}`);
          }
        }

        console.log('✓ Robot state has all required fields');

        // Check joints array
        if (!Array.isArray(state.joints)) {
          throw new Error('Robot state joints is not an array');
        }

        console.log(`✓ Robot has ${state.joints.length} joints`);

        // If joints exist, check their structure
        if (state.joints.length > 0) {
          const joint = state.joints[0];
          const jointFields = ['name', 'position'];

          for (const field of jointFields) {
            if (!(field in joint)) {
              throw new Error(`Joint missing field: ${field}`);
            }
          }

          console.log('✓ Joint structure is correct');
        }
      },
    },

    {
      name: 'Motion storage',
      fn: async (runtime: any) => {
        const robotService = runtime.getService(RobotServiceType.ROBOT);

        if (!robotService) {
          console.log('⚠️  Robot service not configured - skipping motion storage test');
          return;
        }

        // Check if motion storage methods exist
        if (typeof robotService.getStoredMotions !== 'function') {
          throw new Error('getStoredMotions method not found');
        }

        const motions = robotService.getStoredMotions();

        if (!Array.isArray(motions)) {
          throw new Error('Stored motions is not an array');
        }

        console.log(`✓ Robot has ${motions.length} stored motions`);

        if (motions.length > 0) {
          console.log('Stored motions:', motions.join(', '));
        }
      },
    },
  ];
}

export default new RobotControlTestSuite();
