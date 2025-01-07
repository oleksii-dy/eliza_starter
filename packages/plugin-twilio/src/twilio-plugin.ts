// /packages/plugin-twilio/src/twilio-plugin.ts

import { Plugin } from '@elizaos/core';
import { smsAction } from './actions/sms-action.js';
import { makeVoiceCallAction, textToSpeechAction } from './actions/voice-action.js';
import { verifyActions } from './actions/verify-actions.js';
import { twilioService } from './services/twilio.js';
import { verifyService } from './services/verify.js';
import { storageService } from './services/storage.js';
import { webhookService } from './services/webhook.js';
import { RuntimeContext } from './services/runtime-context.js';
import { ServiceType } from '@elizaos/core';

export const TwilioPlugin: Plugin = {
    name: 'twilio',
    description: 'Twilio integration for voice, SMS and verification',
    actions: [
        smsAction,
        makeVoiceCallAction,
        textToSpeechAction,
        verifyActions.requestVerificationAction,
        verifyActions.checkVerificationAction,
        verifyActions.checkVerifiedNumberAction,
        verifyActions.getAgentPhoneAction
    ],
    services: [
        {
            ...twilioService,
            serviceType: ServiceType.TEXT_GENERATION,
            initialize: async (runtime: any) => {
                RuntimeContext.setRuntime(runtime);
                await Promise.all([
                    storageService.initialize(),
                    twilioService.initialize(),
                    webhookService.initialize()
                ]);
            }
        },
        verifyService,
        storageService,
        webhookService
    ]
};

export default TwilioPlugin;