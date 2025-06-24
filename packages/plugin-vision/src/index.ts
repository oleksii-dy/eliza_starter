// Vision plugin -- gives an agent visual perception through camera integration
import { Plugin } from '@elizaos/core';
import { VisionService } from './service';
import { visionProvider } from './provider';
import { describeSceneAction, captureImageAction, killAutonomousAction, setVisionModeAction, nameEntityAction, identifyPersonAction, trackEntityAction } from './action';
import { testSuites } from './tests/e2e/index';
import './types'; // Ensure module augmentation is loaded

export const visionPlugin: Plugin = {
  name: 'vision',
  description: 'Provides visual perception through camera integration and scene analysis',
  services: [VisionService],
  providers: [visionProvider],
  actions: [
    describeSceneAction,
    captureImageAction,
    killAutonomousAction,
    setVisionModeAction,
    nameEntityAction,
    identifyPersonAction,
    trackEntityAction
  ],
  tests: testSuites,
  init: async (_config, _runtime) => {
    // Plugin initialization
    // The VisionService will be automatically registered and started by the runtime
    // Additional initialization logic can be added here if needed
  },
};

export default visionPlugin;
