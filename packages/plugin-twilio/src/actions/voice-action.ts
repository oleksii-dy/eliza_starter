import { Action, IAgentRuntime, ActionExample } from '@elizaos/core';
import { voiceService } from '../services/voice.js';
import { twilioService } from '../services/twilio.js';

interface TextToSpeechInput {
  text: string;
}

interface VoiceCallInput {
  to: string;
  message: string;
}

type RuntimeWithData<T> = Omit<IAgentRuntime, 'data'> & { data: T };

export const textToSpeechAction: Action = {
  name: 'TEXT_TO_SPEECH',
  description: 'Convert text to speech audio',
  similes: ['convert to speech', 'speak text', 'synthesize speech'],
  examples: [
    [
      {
        input: 'Convert text "Hello world" to speech',
        output: 'Successfully converted text to speech'
      }
    ]
  ] as unknown as ActionExample[][],

  validate: async (runtime: IAgentRuntime, context?: unknown): Promise<boolean> => {
    const input = (runtime as RuntimeWithData<TextToSpeechInput>).data;
    if (!input) return false;
    return typeof input.text === 'string' && input.text.length > 0;
  },

  handler: async (runtime: IAgentRuntime, context?: unknown) => {
    const input = (runtime as RuntimeWithData<TextToSpeechInput>).data;

    if (!input || typeof input !== 'object') {
      throw new Error('Invalid input: must be an object');
    }

    const { text } = input;

    try {
      const audioBuffer = await voiceService.textToSpeech(text);
      return {
        text: 'Successfully converted text to speech',
        data: {
          audio: audioBuffer
        }
      };
    } catch (error) {
      console.error('Text-to-speech error:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to convert text to speech');
    }
  }
};

export const makeVoiceCallAction: Action = {
  name: 'MAKE_VOICE_CALL',
  description: 'Make a voice call to a phone number',
  similes: ['call', 'phone', 'dial'],
  examples: [
    [
      {
        input: 'Call +1234567890 and say "Hello from Eliza!"',
        output: 'Successfully initiated voice call to +1234567890'
      }
    ]
  ] as unknown as ActionExample[][],

  validate: async (runtime: IAgentRuntime, context?: unknown): Promise<boolean> => {
    const input = (runtime as RuntimeWithData<VoiceCallInput>).data;
    if (!input) return false;
    const { to, message } = input;
    return typeof to === 'string' && typeof message === 'string';
  },

  handler: async (runtime: IAgentRuntime, context?: unknown) => {
    const input = (runtime as RuntimeWithData<VoiceCallInput>).data;

    if (!input || typeof input !== 'object') {
      throw new Error('Invalid input: must be an object');
    }

    const { to, message } = input;

    try {
      const audioBuffer = await voiceService.textToSpeech(message);
      await twilioService.makeVoiceCall(to, audioBuffer);
      return {
        text: `Successfully initiated voice call to ${to}`
      };
    } catch (error) {
      console.error('Voice call error:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to make voice call');
    }
  }
};
