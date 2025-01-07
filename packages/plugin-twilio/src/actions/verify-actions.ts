import { Action, IContext } from '@elizaos/core';
import { verifyService } from '../services/verify.js';

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

        try {
            const isVoiceVerification = userMessage?.toLowerCase().includes('voice');
            console.log('REQUEST_VERIFICATION handler - Voice verification:', isVoiceVerification);

            if (isVoiceVerification) {
                await verifyService.sendVoiceVerificationCode(phoneNumber);
            } else {
                await verifyService.sendVerificationCode(phoneNumber);
            }

            console.log('REQUEST_VERIFICATION handler - Verification initiated successfully');
            return {
                text: isVoiceVerification
                    ? `Calling ${phoneNumber} with your verification code.`
                    : `Verification code sent to ${phoneNumber}. Reply with "verify code XXXXXX".`
            };
        } catch (error) {
            console.error('REQUEST_VERIFICATION handler - Error:', error);
            return {
                text: "Sorry, couldn't send verification code. Try again or use 'voice verify'."
            };
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
            { user: "assistant", content: { text: "Your number has been verified!" } }
        ]
    ],
    validate: async () => true,
    handler: async (context: IContext) => {
        const match = context.input?.match(/verify code (\d+)/);
        if (!match) {
            return {
                text: "Please provide the verification code in the format: verify code XXXXXX"
            };
        }

        const code = match[1];
        const phoneNumber = context.userId;
        try {
            const isValid = await verifyService.verifyCode(phoneNumber, code);
            return {
                text: isValid
                    ? "Your number has been verified! You can now use the service."
                    : "Invalid code. Please try again or text 'verify' to get a new code."
            };
        } catch (error) {
            console.error('Error verifying code:', error);
            return {
                text: "Sorry, there was an error verifying your code. Please try again."
            };
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