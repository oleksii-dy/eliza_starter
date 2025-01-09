import { Action, Memory, State } from '@elizaos/core';
import { twilioService } from '../services/twilio.js';
import { verifyService } from '../services/verify.js';

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

  async validate(runtime: Runtime, message: Memory, state?: State): Promise<boolean> {
    return !!(runtime.getSetting("TWILIO_ACCOUNT_SID") &&
             runtime.getSetting("TWILIO_AUTH_TOKEN") &&
             runtime.getSetting("TWILIO_PHONE_NUMBER"));
  },

  handler: async (context: State, message: Memory) => {
    const phoneNumber = message.content?.text?.match(/\+[0-9]+/)?.[0];

    if (!phoneNumber) {
        return {
            text: "Please provide a phone number in the format +XXXXXXXXXXXX"
        };
    }

    try {
        // Auto-verify on first successful SMS
        if (!verifyService.isVerified(phoneNumber)) {
            await verifyService.verifyNumber(phoneNumber);
        }

        await twilioService.sendMessage(phoneNumber, message.content.text);
        return {
            text: `Message sent to ${phoneNumber} successfully!`
        };
    } catch (error) {
        console.error('SMS error:', error);
        return {
            text: "Sorry, I couldn't send the message. Please try again."
        };
    }
  }
};
