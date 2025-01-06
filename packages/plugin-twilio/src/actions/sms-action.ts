import { Action, IAgentRuntime, Handler, Memory, State } from '@elizaos/core';
import { twilioService } from '../services/twilio.js';

interface SMSActionInput {
  to: string;
  message: string;
}

export const smsAction: Action = {
  name: 'SEND_SMS',
  similes: ['send text', 'send message', 'text'],
  description: 'Send SMS messages to phone numbers',
  examples: [
    [
      {
        user: "user1",
        content: {
          text: 'Send SMS to +1234567890: "Hello!"'
        }
      },
      {
        user: "assistant",
        content: {
          text: 'Successfully sent SMS to +1234567890',
          action: 'SEND_SMS',
          args: {
            to: '+1234567890',
            message: 'Hello!'
          }
        }
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

    const match = text.match(/(?:send.*?|Sending.*?)(?:message|SMS).*?[\"\'](.*?)[\"\'].*?to\s*([\+\d]+)/i);

    if (!match) {
        return {
            text: 'Could not understand the message format. Please use: "send message \'your message\' to +1234567890"'
        };
    }

    const [, smsMessage, to] = match;

    try {
        await twilioService.sendMessage(to, smsMessage);
        return {
            text: `Successfully sent SMS to ${to}`
        };
    } catch (error) {
        if (error instanceof Error) {
            const twilioError = error as any;
            if (twilioError.code === 21608) {
                return {
                    text: `Unable to send SMS: The number ${to} needs to be verified first. For trial accounts, verify at twilio.com/user/account/phone-numbers/verified`
                };
            }
            return {
                text: `Failed to send SMS: ${error.message}`
            };
        }
        return {
            text: 'An unexpected error occurred while sending the SMS'
        };
    }
  }) as Handler
};
