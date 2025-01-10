// /packages/plugin-twilio/src/index.ts

import { Plugin, ServiceType } from '@elizaos/core';
import { webhookService } from './services/webhook.js';
import { twilioService } from './services/twilio.js';
import { storageService } from './services/storage.js';

export interface TwilioPluginConfig {
    accountSid?: string;
    authToken?: string;
    phoneNumber?: string;
}

const plugin: Plugin = {
    name: 'twilio',
    description: 'Twilio plugin for SMS and voice calls',
    services: [webhookService],
};

// Export plugin instance
export default plugin;

// Export services for direct access if needed
export { webhookService, twilioService, storageService };
