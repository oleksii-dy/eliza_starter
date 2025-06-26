// Robot control plugin -- provides comprehensive control for the AiNex humanoid robot
import { type Plugin } from '@elizaos/core';

// Services
import { VisionService } from './service.js';
import { RobotServiceV2 } from './services/robot-service-v2.js';
import { SimulationService } from './services/simulation-service.js';
import { RLService } from './services/rl-service.js';

// Actions
import {
  describeSceneAction,
  captureImageAction,
  killAutonomousAction,
  setVisionModeAction,
} from './action.js';
import { nameEntityAction, identifyPersonAction, trackEntityAction } from './actions-enhanced.js';
import { commandAction } from './actions/command-action.js';
import { teachAction } from './actions/teach-action.js';
import { gotoAction } from './actions/goto-action.js';

// Providers
import { visionProvider } from './provider.js';
import { visionEnhancedProvider } from './provider-enhanced.js';
import { robotStateProvider } from './providers/state-provider.js';

// Tests
import { testSuites } from './tests/e2e/index';

// Type augmentation
import './types.js';

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
export * from './types.js';
