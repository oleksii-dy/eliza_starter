import { Action, IContext, ActionConfig, HandlerCallback, IAgentRuntime } from '@elizaos/core';
import { verifyService } from '../services/verify.js';
import { twilioService } from '../services/twilio.js';

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
        const match = userMessage?.match(/verify code (\d+)/);
        const code = match?.[1];
        const phoneNumber = context.state?.phoneNumber;

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
    similes: ['check number', 'is verified'],
    description: 'Check if a phone number is verified',
    examples: [
        [
            { user: "user1", content: { text: "is +1234567890 verified?" } },
            { user: "assistant", content: { text: "Yes, this number is verified." } }
        ]
    ],
    validate: async () => true,
    handler: async (context: IContext) => {
        const match = context.input?.match(/\+\d+/);
        if (!match) {
            return {
                text: "Please provide a phone number in the format +XXXXXXXXXXXX"
            };
        }

        const phoneNumber = match[0];
        try {
            const userId = await verifyService.getVerifiedUserId(phoneNumber);
            return {
                text: userId
                    ? `Yes, ${phoneNumber} is verified.`
                    : `No, ${phoneNumber} is not verified.`
            };
        } catch (error) {
            console.error('Error checking verification:', error);
            return {
                text: "Sorry, I couldn't check the verification status. Please try again."
            };
        }
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
            { user: "assistant", content: { text: `My phone number is ${twilioService.phoneNumber}. Feel free to use this number to test SMS and voice call features.` } }
        ]
    ],
    priority: 1,
    validate: async () => true,
    handler: async () => {
        return {
            text: `My phone number is ${twilioService.phoneNumber}. Feel free to use this number to test SMS and voice call features.`
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