// /packages/plugin-twilio/src/twilio-plugin.ts

import { Plugin, ServiceType } from '@elizaos/core';
import { webhookService } from './services/webhook.js';
import { twilioService } from './services/twilio.js';
import { verifyService } from './services/verify.js';
import { smsAction } from './actions/sms-action.js';
import { makeVoiceCallAction } from './actions/voice-action.js';

export const TwilioPlugin: Plugin = {
    name: 'twilio',
    description: 'Twilio integration for voice and SMS messaging',
    actions: [
        smsAction,
        makeVoiceCallAction
    ],
    services: [
        {
            ...twilioService,
            serviceType: ServiceType.TEXT_GENERATION,
            async initialize() { await twilioService.initialize(); }
        },
        {
            ...verifyService,
            serviceType: ServiceType.TEXT_GENERATION,
            async initialize() { await verifyService.initialize(); }
        },
        webhookService
    ]
};

export default TwilioPlugin;