import type { Plugin } from '@elizaos/core';
import { RolodexService } from './services';
import * as actions from './actions';
import * as providers from './providers';
import * as evaluators from './evaluators';
import tests from './tests';

export const rolodexPlugin: Plugin = {
  name: 'rolodex',
  description: 'Advanced entity and relationship management with trust integration',
  services: [RolodexService as any],
  actions: Object.values(actions),
  providers: Object.values(providers) as any[]
  evaluators: Object.values(evaluators) as any[]
  tests: [tests],
  // Schema will be added when the plugin properly implements database functionality
  // For now, the plugin uses the runtime's existing entity/relationship storage
};

// Export the main service
export { RolodexService } from './services';

// Export types
export * from './types';

// Export the plugin as default
export default rolodexPlugin;
