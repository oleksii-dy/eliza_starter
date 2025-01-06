import { Action, IAgentRuntime, Handler, Memory, State } from '@elizaos/core';
import { verifyService } from '../services/verify.js';

export const requestVerificationAction: Action = {
    name: 'REQUEST_VERIFICATION',
    similes: ['verify phone', 'verify number', 'send code'],
    description: 'Send a verification code to a phone number',

    handler: (async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        options: { [key: string]: unknown }
    ) => {
        const text = message.content?.text;
        if (!text) {
            throw new Error('Missing message text');
        }

        const match = text.match(/verify (?:phone|number) ([\+\d]+)/i);
        if (!match) {
            return {
                text: 'Please use format: "verify phone +1234567890"'
            };
        }

        const [, phoneNumber] = match;

        try {
            await verifyService.sendVerificationCode(phoneNumber);
            return {
                text: `Verification code sent to ${phoneNumber}. Please use "verify code 123456 for +1234567890" to verify.`
            };
        } catch (error) {
            return {
                text: `Failed to send verification code: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }) as Handler
};

export const checkVerificationAction: Action = {
    name: 'CHECK_VERIFICATION',
    similes: ['verify code', 'check code', 'confirm code'],
    description: 'Verify a phone number with a received code',

    handler: (async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        options: { [key: string]: unknown }
    ) => {
        const text = message.content?.text;
        const userId = message.userId;

        if (!text || !userId) {
            throw new Error('Missing required information');
        }

        const match = text.match(/verify code (\d+) for ([\+\d]+)/i);
        if (!match) {
            return {
                text: 'Please use format: "verify code 123456 for +1234567890"'
            };
        }

        const [, code, phoneNumber] = match;

        try {
            const isVerified = await verifyService.checkVerificationCode(phoneNumber, code, userId);
            if (isVerified) {
                return {
                    text: `Phone number ${phoneNumber} has been verified and linked to your account!`
                };
            } else {
                return {
                    text: 'Invalid verification code. Please try again.'
                };
            }
        } catch (error) {
            return {
                text: `Failed to verify code: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }) as Handler
};