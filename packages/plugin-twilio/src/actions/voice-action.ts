import { Action, HandlerCallback } from '@elizaos/core';
import { twilioService } from '../services/twilio.js';
import { voiceService } from '../services/voice.js';

export const makeVoiceCallAction: Action = {
    name: 'MAKE_VOICE_CALL',
    similes: ['call', 'phone', 'dial', 'voice call'],
    description: 'Make voice calls and speak messages',
    examples: [
        [
            { user: "user1", content: { text: "call +1234567890" } },
            { user: "assistant", content: { text: "Initiating voice call to +1234567890" } }
        ]
    ],
    validate: async () => true,
    handler: async (context: any, message: any, state?: any, options?: any, callback?: HandlerCallback) => {
        const match = message.content?.text?.match(/\+\d+/);
        if (!match) {
            return {
                text: "Please provide a phone number in the format +XXXXXXXXXXXX"
            };
        }

        const phoneNumber = match[0];
        const messageToSpeak = "Hello! This is Eliza, your AI assistant. How can I help you today?";

        try {
            // Convert text to speech using ElevenLabs
            const audioBuffer = await voiceService.textToSpeech(messageToSpeak);

            // Make the call using Twilio
            await twilioService.makeVoiceCall(phoneNumber, audioBuffer);

            return {
                text: `Initiating voice call to ${phoneNumber}`
            };
        } catch (error) {
            console.error('Voice call error:', error);
            return {
                text: "Sorry, I couldn't make the voice call. Please try again later."
            };
        }
    }
};

export const textToSpeechAction: Action = {
    name: 'TEXT_TO_SPEECH',
    similes: ['speak', 'say', 'pronounce'],
    description: 'Convert text to speech',
    examples: [
        [
            { user: "user1", content: { text: "speak 'Hello world'" } },
            { user: "assistant", content: { text: "Converting text to speech" } }
        ]
    ],
    validate: async () => true,
    handler: async (context: any, message: any) => {
        const text = message.content?.text?.match(/'([^']*)'|"([^"]*)"/)?.slice(1).find(Boolean);

        if (!text) {
            return {
                text: "Please provide text in quotes to convert to speech"
            };
        }

        try {
            await voiceService.textToSpeech(text);
            return {
                text: `Successfully converted "${text}" to speech`
            };
        } catch (error) {
            console.error('Text-to-speech error:', error);
            return {
                text: "Sorry, I couldn't convert the text to speech"
            };
        }
    }
};
