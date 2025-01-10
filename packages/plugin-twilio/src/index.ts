// /packages/plugin-twilio/src/index.ts

import { Plugin } from '@elizaos/core';
import { webhookService } from './services/webhook.js';
import { smsActions } from './actions/sms-action.js';

export const plugin: Plugin = {
    name: 'twilio',
    description: 'A plugin for handling SMS interactions via Twilio',
    services: [webhookService],
    actions: Object.values(smsActions)  // Add the SMS action
};

export default plugin;
