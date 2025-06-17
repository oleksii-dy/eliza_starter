import { type Plugin, PluginEvents } from '@elizaos/core';

import * as actions from './actions/index.ts';
import * as providers from './providers/index.ts';
import { events } from './events';

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
    actions.updateSettingsAction,
  ],
  // this is jank, these events are not valid
  events: events as any as PluginEvents,
  providers: [
    providers.evaluatorsProvider,
    providers.anxietyProvider,
    providers.timeProvider,
    providers.choiceProvider,
    providers.factsProvider,
    providers.settingsProvider,
    providers.capabilitiesProvider,
    providers.attachmentsProvider,
    providers.providersProvider,
    providers.actionsProvider,
    providers.actionStateProvider,
    providers.characterProvider,
    providers.recentMessagesProvider,
    providers.worldProvider,
  ],
};

export default messageHandlingPlugin;
