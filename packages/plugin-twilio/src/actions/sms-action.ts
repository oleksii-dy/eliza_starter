import { Action, IAgentRuntime, ActionExample } from '@elizaos/core';
import { twilioService } from '../services/twilio.js';

interface SMSActionInput {
  to: string;
  message: string;
}

interface RuntimeWithData extends IAgentRuntime {
  data: SMSActionInput;
}

export const smsAction: Action = {
  name: 'SEND_SMS',
  description: 'Send SMS messages to phone numbers',
  similes: ['send text', 'send message', 'text'],
  examples: [
    [
      {
        input: 'Send SMS to +1234567890: "Hello!"',
        output: 'Successfully sent SMS to +1234567890'
      }
    ]
  ] as unknown as ActionExample[][],

  validate: async (runtime: IAgentRuntime, context?: unknown): Promise<boolean> => {
    const typedRuntime = runtime as RuntimeWithData;
    if (!typedRuntime.data) return false;
    const { to, message } = typedRuntime.data;
    return typeof to === 'string' && typeof message === 'string';
  },

  handler: async (runtime: IAgentRuntime, context?: unknown): Promise<{ text: string }> => {
    const typedRuntime = runtime as RuntimeWithData;
    const input = typedRuntime.data;

    if (!input || typeof input !== 'object') {
      throw new Error('Invalid input: must be an object');
    }

    const { to, message } = input;

    try {
      await twilioService.sendMessage(to, message);
      return {
        text: `Successfully sent SMS to ${to}`
      };
    } catch (error) {
      console.error('Failed to send SMS:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to send SMS');
    }
  }
};
