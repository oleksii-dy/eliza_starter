import { Action } from '@elizaos/core';
import { verifyService } from '../services/verify.js';
import { twilioService } from '../services/twilio.js';
import { storageService } from '../services/storage.js';

export const requestVerificationAction: Action = {
    name: 'REQUEST_VERIFICATION',
    similes: [
        'verify \\+[0-9]+',
        'verify phone',
        'verify'
    ],
    description: 'Send a verification code via SMS',
    examples: [
        [
            { user: "user1", content: { text: "verify phone" } },
            { user: "assistant", content: { text: "I've sent a verification code" } }
        ]
    ],
    validate: async () => true,
    priority: 1,
    handler: async (context, message) => {
        const phoneNumber = message.content?.text?.match(/\+[0-9]+/)?.[0];
        if (!phoneNumber) {
            return {
                text: "Please provide a phone number in the format +XXXXXXXXXXXX"
            };
        }
        await verifyService.sendVerificationCode(phoneNumber);
        return {
            text: `I've sent a verification code to ${phoneNumber}`
        };
    }
};

export const verifyActions = {
    requestVerificationAction
};