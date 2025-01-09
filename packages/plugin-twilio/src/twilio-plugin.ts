// /packages/plugin-twilio/src/twilio-plugin.ts

import { Plugin, IAgentRuntime, ServiceType } from '@elizaos/core';
import { webhookService } from './services/webhook.js';
import { twilioService } from './services/twilio.js';
import { storageService } from './services/storage.js';
import { verifyService } from './services/verify.js';
import { voiceService } from './services/voice.js';
import { smsAction } from './actions/sms-action.js';
import { makeVoiceCallAction } from './actions/voice-action.js';
import * as verifyActions from './actions/verify-actions.js';

export const TwilioPlugin: Plugin = {
    name: 'twilio',
    description: 'Twilio integration for voice, SMS and verification',
    actions: [
        smsAction,
        makeVoiceCallAction,
        verifyActions.requestVerificationAction,
        verifyActions.checkVerificationAction,
        verifyActions.checkVerifiedNumberAction,
        verifyActions.getAgentPhoneAction
    ],
    services: [
        {
            ...twilioService,
            serviceType: ServiceType.TEXT_GENERATION,
            initialize: async (runtime) => {
                await storageService.initialize();
                await twilioService.initialize();
                await webhookService.initialize(runtime);
            }
        },
        {
            ...voiceService,
            serviceType: ServiceType.TEXT_GENERATION,
            initialize: async () => await voiceService.initialize()
        },
        {
            ...verifyService,
            serviceType: ServiceType.TEXT_GENERATION,
            initialize: async () => await verifyService.initialize()
        },
        {
            ...storageService,
            serviceType: ServiceType.TEXT_GENERATION,
            initialize: async () => await storageService.initialize()
        }
    ]
};

export default TwilioPlugin;