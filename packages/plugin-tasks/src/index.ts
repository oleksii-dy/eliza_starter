import { type Plugin } from '@elizaos/core';

import * as actions from './actions/index.ts';
import * as providers from './providers/index.ts';

import { TaskService } from './services/task.ts';

export const tasksPlugin: Plugin = {
  name: 'tasks',
  description: 'Agent tasks with basic actions and evaluators',

  actions: [
    // Task actions enabled by default - high-level functionality users want
    actions.choiceAction,
  ],

  providers: [
    // Task providers enabled by default - read-only information
    providers.choiceProvider,
  ],

  services: [
    // Task service enabled by default - required for functionality
    TaskService,
  ],
};

export default tasksPlugin;
