import { Action, IContext, ActionConfig, HandlerCallback, IAgentRuntime } from '@elizaos/core';
import { verifyService } from '../services/verify.js';
import { twilioService } from '../services/twilio.js';
import { storageService } from '../services/storage.js';

export const requestVerificationAction: Action = {
    name: 'REQUEST_VERIFICATION',
    similes: [
        'verify \\+[0-9]+',
        'verify phone',
        'voice verify',
        'verify',
        'send code'
    ],
    description: 'Send a verification code via SMS or voice call',
    examples: [
        [
            { user: "user1", content: { text: "verify phone +1234567890" } },
            { user: "assistant", content: { text: "I've sent a verification code to +1234567890" } }
        ]
    ],
    validate: async () => true,
    handler: async (context: IContext, message: Memory) => {
        console.log('REQUEST_VERIFICATION handler - Message:', message);

        // Get text from the message content
        const userMessage = message.content?.text;
        console.log('REQUEST_VERIFICATION handler - User message:', userMessage);

        // Get phone number from the message
        const phoneMatch = userMessage?.match(/\+[0-9]+/);
        const phoneNumber = phoneMatch?.[0];

        console.log('REQUEST_VERIFICATION handler - Extracted phone:', phoneNumber);

        if (!phoneNumber) {
            return {
                text: "Please provide a phone number in the format +XXXXXXXXXXXX"
            };
        }

        if (phoneNumber) {
            context.state = { ...context.state, phoneNumber };

            try {
                const isVoiceVerification = userMessage?.toLowerCase().includes('voice');
                await verifyService.sendVerificationCode(phoneNumber);

                return {
                    text: `I've sent a verification code to ${phoneNumber}. Please reply with "verify code" followed by the code you receive.`
                };
            } catch (error) {
                return {
                    text: "Sorry, I couldn't send the verification code. Would you like to try again?"
                };
            }
        }
    }
};

export const checkVerificationAction: Action = {
    name: 'CHECK_VERIFICATION',
    similes: ['verify code', 'check code'],
    description: 'Verify a phone number with a received code',
    examples: [
        [
            { user: "user1", content: { text: "verify code 123456" } },
            { user: "assistant", content: { text: `Perfect! Your phone number has been verified! You can now use all my services by sending an sms to ${twilioService.phoneNumber}! 📱✅` } }
        ]
    ],
    skipLLM: true as any,
    skipValidation: true as any,
    priority: 1,

    validate: async (runtime: IAgentRuntime, message: Memory) => {
        const userMessage = message.content?.text;
        const match = userMessage?.match(/verify code (\d+)/);
        return !!match;
    },

    handler: async (context: IContext, message: Memory, state?: State, options?: any, callback?: HandlerCallback) => {
        const userMessage = message.content?.text;
        console.log('Verification attempt - Full message:', userMessage);

        const match = userMessage?.match(/verify code (\d+)/i);
        console.log('Regex match result:', match);

        const code = match?.[1];
        const phoneNumber = context.state?.phoneNumber;

        console.log('Extracted code:', code);
        console.log('Stored phone number:', phoneNumber);
        console.log('Stored verification codes:', verifyService.getStoredCodes());

        if (!phoneNumber) {
            return callback?.({
                text: "I couldn't find which phone number you're trying to verify. Please start over with 'verify phone +XXXXXXXXXXXX'"
            });
        }

        try {
            const isValid = await verifyService.verifyCode(phoneNumber, code!);
            const twilioNumber = twilioService.phoneNumber;

            return callback?.({
                text: isValid
                    ? `Perfect! I've verified your phone number ${phoneNumber}. You can now use all my services by sending an sms to ${twilioNumber}! 📱✅`
                    : `That code doesn't match what I sent to ${phoneNumber}. Want to try again or get a new code? Just say 'verify' for a new one! 🔄`
            });
        } catch (error) {
            return callback?.({
                text: "I ran into a problem checking your code. Should we try again or get a new code? 🤔"
            });
        }
    }
};

export const checkVerifiedNumberAction: Action = {
    name: 'CHECK_VERIFIED_NUMBER',
    similes: ['check number', 'is verified', 'my verified number', 'my number'],
    description: 'Check if a phone number is verified',
    examples: [
        [
            { user: "user1", content: { text: "what's my verified phone number?" } },
            { user: "assistant", content: { text: "Your verified phone number is +16503794635." } }
        ]
    ],
    validate: async () => true,
    handler: async (context: any, message: any) => {
        // Get the input text from message content
        const input = message.content?.text?.toLowerCase() || '';

        // If asking for their number
        if (input.includes('my')) {
            const userId = message.userId;
            if (!userId) {
                return {
                    text: "I couldn't find your user information. Are you logged in?"
                };
            }

            const users = await storageService.getAllVerifiedUsers();
            const userData = users.get(userId);

            if (userData?.phoneNumber) {
                return {
                    text: `Your verified phone number is ${userData.phoneNumber}.`
                };
            } else {
                return {
                    text: "You don't have a verified phone number yet. Would you like to verify one?"
                };
            }
        }

        // If checking a specific number
        const match = input.match(/\+\d+/);
        if (!match) {
            return {
                text: "Please provide a phone number in the format +XXXXXXXXXXXX"
            };
        }

        const phoneNumber = match[0];
        const userId = await verifyService.getVerifiedUserId(phoneNumber);

        return {
            text: userId
                ? `Yes, ${phoneNumber} is verified.`
                : `No, ${phoneNumber} is not verified.`
        };
    }
};

export const getAgentPhoneAction: Action = {
    name: 'GET_AGENT_PHONE',
    similes: [
        "what's your phone number",
        "what is your phone number",
        "your phone number",
        "what's your number",
        "what is your number",
        "your number",
        "phone number"
    ],
    description: "Get the agent's phone number",
    examples: [
        [
            { user: "user1", content: { text: "what's your phone number?" } },
            { user: "assistant", content: { text: "My phone number is ${process.env.TWILIO_PHONE_NUMBER}. Feel free to use this number to test SMS and voice call features." } }
        ]
    ],
    priority: 1,
    validate: async () => true,
    handler: async () => {
        const phoneNumber = process.env.TWILIO_PHONE_NUMBER;
        if (!phoneNumber) {
            throw new Error('TWILIO_PHONE_NUMBER not configured in environment');
        }
        return {
            text: `My phone number is ${phoneNumber}. Feel free to use this number to test SMS and voice call features.`
        };
    }
};

// Export all actions
export const verifyActions = {
    requestVerificationAction,
    checkVerificationAction,
    checkVerifiedNumberAction,
    getAgentPhoneAction
};