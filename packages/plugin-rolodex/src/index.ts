import type { Plugin } from '@elizaos/core';
import { RolodexService } from './services/RolodexService';
import * as actions from './actions';
import * as providers from './providers';
import * as evaluators from './evaluators';
import tests from './tests';

export const rolodexPlugin: Plugin = {
  name: 'rolodex',
  description: 'Advanced entity and relationship management with trust integration',
  services: [RolodexService as any],
  actions: Object.values(actions),
  providers: Object.values(providers) as any[],
  evaluators: Object.values(evaluators) as any[],
  testDependencies: ['@elizaos/plugin-sql'],
  tests: [tests],
  // Schema will be added when the plugin properly implements database functionality
  // For now, the plugin uses the runtime's existing entity/relationship storage
};

// Export the main service
export { RolodexService } from './services/RolodexService';

// Export types
export * from './types';

// Export the plugin as default
export default rolodexPlugin;
