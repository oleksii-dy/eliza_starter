/**
 * REAL MVP PLUGIN - ZERO LARP CODE
 * 
 * Plugin based on validated real integration tests.
 * All functionality has been tested with real ElizaOS runtime.
 */

import type { Plugin, IAgentRuntime } from '@elizaos/core';
import { elizaLogger } from '@elizaos/core';
import { 
  enableReasoningAction, 
  disableReasoningAction, 
  checkReasoningStatusAction 
} from './real-actions';
import { clearServiceRegistry } from './real-reasoning-service';

export const realMvpPlugin: Plugin = {
  name: '@elizaos/plugin-training/real-mvp',
  description: 'Real MVP custom reasoning plugin with training data collection',
  
  actions: [
    enableReasoningAction,
    disableReasoningAction,
    checkReasoningStatusAction,
  ],

  init: async (config: Record<string, string>, runtime: IAgentRuntime) => {
    elizaLogger.info('🚀 Real MVP plugin initializing...');
    
    // REAL: Verify runtime has required functionality
    if (!runtime.useModel) {
      throw new Error('Runtime does not have useModel function');
    }
    
    if (!runtime.agentId) {
      throw new Error('Runtime does not have agentId');
    }

    elizaLogger.info(`✅ Real MVP plugin initialized for agent: ${runtime.agentId}`);
  },

  // Note: cleanup function removed - not part of Plugin interface
};

export default realMvpPlugin;

elizaLogger.info('✅ Real MVP plugin module loaded');