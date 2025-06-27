// Robot control plugin -- provides comprehensive control for the AiNex humanoid robot
import { type Plugin } from '@elizaos/core';

// Services
import { VisionService } from './service';
import { RobotServiceV2 } from './services/robot-service-v2';
import { SimulationService } from './services/simulation-service';
import { RLService } from './services/rl-service';

// Actions
import {
  describeSceneAction,
  captureImageAction,
  killAutonomousAction,
  setVisionModeAction,
} from './action';
import { nameEntityAction, identifyPersonAction, trackEntityAction } from './actions-enhanced';
import { commandAction } from './actions/command-action';
import { teachAction } from './actions/teach-action';
import { gotoAction } from './actions/goto-action';

// Providers
import { visionProvider } from './provider';
import { visionEnhancedProvider } from './provider-enhanced';
import { robotStateProvider } from './providers/state-provider';

// Tests
import { testSuites } from './tests/e2e/index';

// Type augmentation
import './types';

export const robotPlugin: Plugin = {
  name: 'robot',
  description:
    'Comprehensive robot control for AiNex humanoid with vision, motion control, and learning capabilities',

  services: [
    RobotServiceV2,
    VisionService,
    // Only include simulation services if not in test/mock mode
    ...(process.env.NODE_ENV !== 'test' && process.env.USE_MOCK_ROBOT !== 'true'
      ? [SimulationService, RLService]
      : []),
  ],

  providers: [robotStateProvider, visionProvider, visionEnhancedProvider],

  actions: [
    // Robot control actions
    commandAction,
    teachAction,
    gotoAction,

    // Vision actions
    describeSceneAction,
    captureImageAction,
    killAutonomousAction,
    setVisionModeAction,
    nameEntityAction,
    identifyPersonAction,
    trackEntityAction,
  ],

  tests: testSuites,

  init: async (_config, runtime) => {
    // Plugin initialization
    // The services will be automatically registered and started by the runtime
    // Additional initialization logic can be added here if needed

    // Log configuration
    const useSimulation = runtime.getSetting('USE_SIMULATION') === 'true';
    const robotPort = runtime.getSetting('ROBOT_SERIAL_PORT') || '/dev/ttyUSB0';
    const rosUrl = runtime.getSetting('ROS_WEBSOCKET_URL') || 'ws://localhost:9090';

    console.log('[RobotPlugin] Initializing with configuration:');
    console.log(`  - Mode: ${useSimulation ? 'Simulation' : 'Hardware'}`);
    console.log(`  - Serial Port: ${robotPort}`);
    console.log(`  - ROS 2 URL: ${rosUrl}`);
  },
};

// Export the plugin as default
export default robotPlugin;

// Re-export types for convenience
export * from './types';
