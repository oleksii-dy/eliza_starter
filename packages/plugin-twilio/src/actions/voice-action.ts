import { Action, IAgentRuntime, HandlerCallback, Handler, Memory, State } from '@elizaos/core';
import { twilioService } from '../services/twilio.js';
import { voiceService } from '../services/voice.js';

interface VoiceCallInput {
    to: string;
    message: string;
}

export const makeVoiceCallAction: Action = {
    name: 'MAKE_VOICE_CALL',
    similes: ['call', 'phone', 'dial'],
    description: 'Make voice calls and speak messages',

    async validate(runtime: IAgentRuntime): Promise<boolean> {
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
        const input = message.content?.args as VoiceCallInput;

        if (!input || typeof input !== 'object') {
            throw new Error('Invalid input: must be an object');
        }

        const { to, message: voiceMessage } = input;

        if (!to || !voiceMessage) {
            throw new Error('Invalid input: requires "to" and "message" parameters');
        }

        try {
            const audioBuffer = await voiceService.textToSpeech(voiceMessage);
            await twilioService.makeVoiceCall(to, audioBuffer);
            return {
                text: `Successfully initiated voice call to ${to}`
            };
        } catch (error) {
            console.error('Voice call error:', error);
            throw new Error(error instanceof Error ? error.message : 'Failed to make voice call');
        }
    }) as Handler,

    examples: [
        [
            {
                user: "user1",
                content: { text: "Call +1234567890 and say 'Hello!'" }
            },
            {
                user: "assistant",
                content: {
                    text: "Making a voice call to +1234567890",
                    action: "MAKE_VOICE_CALL",
                    args: {
                        to: "+1234567890",
                        message: "Hello!"
                    }
                }
            }
        ]
    ]
};

export const textToSpeechAction: Action = {
    name: 'TEXT_TO_SPEECH',
    similes: ['convert to speech', 'speak text', 'synthesize speech'],
    description: 'Convert text to speech',

    async validate(runtime: IAgentRuntime): Promise<boolean> {
        return true;
    },

    handler: (async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        options: { [key: string]: unknown }
    ) => {
        const input = message.content?.args as { text: string };

        if (!input?.text || typeof input.text !== 'string') {
            throw new Error('Invalid input: requires "text" parameter');
        }

        try {
            const audioBuffer = await voiceService.textToSpeech(input.text);
            return {
                text: 'Successfully converted text to speech',
                data: { audio: audioBuffer }
            };
        } catch (error) {
            console.error('Text-to-speech error:', error);
            throw new Error(error instanceof Error ? error.message : 'Failed to convert text to speech');
        }
    }) as Handler,

    examples: [
        [
            {
                user: "user1",
                content: { text: "Convert 'Hello world' to speech" }
            },
            {
                user: "assistant",
                content: {
                    text: "Converting text to speech",
                    action: "TEXT_TO_SPEECH",
                    args: { text: "Hello world" }
                }
            }
        ]
    ]
};
