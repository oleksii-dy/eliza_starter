import { elizaLogger } from '@elizaos/core';/**
 * REAL MVP PLUGIN EXPORT - ZERO LARP CODE
 * 
 * Clean export for real MVP plugin with training data collection.
 * All functionality validated with real ElizaOS integration tests.
 */

export { realMvpPlugin } from './real-mvp/real-plugin';
export { RealReasoningService, getReasoningService } from './real-mvp/real-reasoning-service';
export { 
  enableReasoningAction, 
  disableReasoningAction, 
  checkReasoningStatusAction 
} from './real-mvp/real-actions';

// Default export for plugin loading
export { realMvpPlugin as default } from './real-mvp/real-plugin';

elizaLogger.info('✅ Real MVP plugin exports loaded');