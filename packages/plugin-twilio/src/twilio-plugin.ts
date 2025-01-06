// /packages/plugin-twilio/src/twilio-plugin.ts

import { Plugin } from '@elizaos/core';
import { smsAction } from './actions/sms-action.js';
import { makeVoiceCallAction, textToSpeechAction } from './actions/voice-action.js';
import { requestVerificationAction, checkVerificationAction, checkVerifiedNumberAction } from './actions/verify-actions.js';
import { twilioService } from './services/twilio.js';
import { verifyService } from './services/verify.js';
import { storageService } from './services/storage.js';

export const TwilioPlugin: Plugin = {
    name: 'twilio',
    description: 'Twilio integration for voice, SMS and verification',
    actions: [
        smsAction,
        makeVoiceCallAction,
        textToSpeechAction,
        requestVerificationAction,
        checkVerificationAction,
        checkVerifiedNumberAction
    ],
    services: [
        twilioService,
        verifyService,
        storageService
    ]
};

export default TwilioPlugin;