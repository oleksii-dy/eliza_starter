import type { Plugin } from '@elizaos/core';

import * as actions from './actions/index.ts';
import * as providers from './providers/index.ts';
import { events } from './events.ts';
import { testSuites } from './tests.ts';

export * from './actions/index.ts';
export * from './providers/index.ts';

export const messageHandlingPlugin: Plugin = {
  name: 'message-handling',
  description: 'Agent message handling with basic actions and evaluators',
  actions: [
    actions.replyAction,
    actions.followRoomAction,
    actions.unfollowRoomAction,
    actions.ignoreAction,
    actions.noneAction,
    actions.muteRoomAction,
    actions.unmuteRoomAction,
  ],
  // TODO: Fix event type casting - events need proper typing
  events: events as any,
  providers: [
    providers.evaluatorsProvider,
    providers.anxietyProvider,
    providers.timeProvider,
    providers.capabilitiesProvider,
    providers.attachmentsProvider,
    providers.providersProvider,
    providers.actionsProvider,
    providers.actionStateProvider,
    providers.characterProvider,
    providers.recentMessagesProvider,
    providers.worldProvider,
  ],
  tests: testSuites,
  testDependencies: ['@elizaos/plugin-sql'],
};

export default messageHandlingPlugin;
