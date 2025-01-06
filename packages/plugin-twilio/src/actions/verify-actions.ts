import { Action, IAgentRuntime, Handler, Memory, State } from '@elizaos/core';
import { verifyService } from '../services/verify.js';
import { storageService } from '../services/storage.js';

export const requestVerificationAction: Action = {
    name: 'REQUEST_VERIFICATION',
    similes: ['verify phone', 'verify number', 'send code'],
    description: 'Send a verification code to a phone number',
    examples: [
        [
            {
                user: "user1",
                content: { text: "verify phone +1234567890" }
            },
            {
                user: "assistant",
                content: { text: "Verification code sent to +1234567890. Please use 'verify code 123456 for +1234567890' to verify." }
            }
        ]
    ],

    async validate(runtime: IAgentRuntime, message: Memory, state?: State): Promise<boolean> {
        return !!(runtime.getSetting("TWILIO_ACCOUNT_SID") &&
                 runtime.getSetting("TWILIO_AUTH_TOKEN") &&
                 runtime.getSetting("TWILIO_PHONE_NUMBER"));
    },

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
            state.verifyingPhone = phoneNumber;
            return {
                text: `Please reply with the verification code sent to ${phoneNumber}`
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
    examples: [
        [
            {
                user: "user1",
                content: { text: "verify code 123456 for +1234567890" }
            },
            {
                user: "assistant",
                content: { text: "Phone number +1234567890 has been verified successfully!" }
            }
        ]
    ],

    async validate(runtime: IAgentRuntime, message: Memory, state?: State): Promise<boolean> {
        return !!(runtime.getSetting("TWILIO_ACCOUNT_SID") &&
                 runtime.getSetting("TWILIO_AUTH_TOKEN") &&
                 runtime.getSetting("TWILIO_PHONE_NUMBER"));
    },

    handler: (async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        options: { [key: string]: unknown }
    ) => {
        const text = message.content?.text?.trim();
        if (!text) {
            throw new Error('Missing message text');
        }

        const phoneNumber = state.verifyingPhone;
        if (!phoneNumber) {
            return {
                text: 'Please verify your phone number first using "verify phone +1234567890"'
            };
        }

        const code = text.match(/^\d+$/)?.[0];
        if (!code) {
            return {
                text: 'Please just enter the verification code'
            };
        }

        try {
            const isVerified = await verifyService.checkVerificationCode(phoneNumber, code);
            if (isVerified) {
                await storageService.storeVerifiedUser(message.userId, phoneNumber);
                delete state.verifyingPhone;
                return {
                    text: `Phone number ${phoneNumber} has been verified successfully!`
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

export const checkVerifiedNumberAction: Action = {
    name: 'CHECK_VERIFIED_NUMBER',
    similes: ['show verified number', 'check my number', 'show my number'],
    description: 'Show the verified phone number for the current user',
    examples: [
        [
            {
                user: "user1",
                content: { text: "show my verified number" }
            },
            {
                user: "assistant",
                content: { text: "Your verified phone number is: +1234567890 (verified on Jan 1, 2024)" }
            }
        ]
    ],

    async validate(runtime: IAgentRuntime, message: Memory, state?: State): Promise<boolean> {
        return true; // No special validation needed
    },

    handler: (async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State
    ) => {
        const verifiedUser = await storageService.getVerifiedUser(message.userId);

        if (!verifiedUser) {
            return {
                text: "You don't have any verified phone numbers yet. Use 'verify phone +1234567890' to verify a number."
            };
        }

        const verifiedDate = verifiedUser.verifiedAt.toLocaleDateString();
        return {
            text: `Your verified phone number is: ${verifiedUser.phoneNumber} (verified on ${verifiedDate})`
        };
    }) as Handler
};