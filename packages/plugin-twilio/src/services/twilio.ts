// /packages/plugin-twilio/src/services/twilio.ts

import pkg from 'twilio';
const { Twilio } = pkg;
import type { Twilio as TwilioInstance } from 'twilio';
import { Service, ServiceType } from '@elizaos/core';
import { LogSanitizer } from '../utils/sanitizer.js';

export class TwilioService implements Service {
  private client: TwilioInstance | null = null;
  private fromNumber: string | undefined = undefined;
  private messagingServiceSid: string | undefined = undefined;
  public phoneNumber: string;

  constructor() {
    this.phoneNumber = process.env.TWILIO_PHONE_NUMBER || '';
  }

  async initialize(): Promise<void> {
    const accountSid = process.env.TWILIO_ACCOUNT_SID ?? '';
    const authToken = process.env.TWILIO_AUTH_TOKEN ?? '';
    const fromNumber = process.env.TWILIO_PHONE_NUMBER ?? '';

    // Make messagingServiceSid optional but undefined instead of null
    const messagingServiceSid = process.env.TWILIO_LOW_VOLUME_SERVICE_SID || undefined;

    if (!accountSid || !authToken || !fromNumber) {
        throw new Error('Required environment variables missing');
    }

    this.fromNumber = fromNumber;
    this.client = new Twilio(accountSid, authToken);
    this.messagingServiceSid = messagingServiceSid;

    console.log('Initialized Twilio with:', LogSanitizer.sanitize(JSON.stringify({
        fromNumber: this.fromNumber,
        isCanadianNumber: fromNumber.startsWith('+1343'),
        messagingService: this.messagingServiceSid || 'Not configured'
    })));
  }

  private async getPhoneNumberSid(phoneNumber: string): Promise<string> {
    if (!this.client) throw new Error('Client not initialized');

    const numbers = await this.client.incomingPhoneNumbers.list();
    const number = numbers.find(n => n.phoneNumber === phoneNumber);

    if (!number) {
      throw new Error(`Phone number ${phoneNumber} not found in your Twilio account`);
    }

    return number.sid;
  }

  private sanitizeLog(log: string): string {
    return LogSanitizer.sanitize(log);
  }

  async sendMessage(to: string, message: string): Promise<any> {
    if (!this.client || !this.fromNumber) {
        throw new Error('Twilio service not properly initialized');
    }

    try {
        console.log(this.sanitizeLog(`TwilioService: Sending message to: ${to}`));
        const response = await this.client.messages.create({
            to,
            from: this.fromNumber,
            body: message,
            ...(this.messagingServiceSid ? { messagingServiceSid: this.messagingServiceSid } : {})
        });
        console.log(this.sanitizeLog(`TwilioService: API Response: ${JSON.stringify(response)}`));
        return response;
    } catch (error) {
        console.error(this.sanitizeLog(`TwilioService: Failed to send message to ${to}`), error);
        throw error;
    }
  }

  async makeVoiceCall(to: string, audioBuffer: Buffer): Promise<void> {
    if (!this.client || !this.fromNumber) {
        throw new Error('Twilio service not initialized');
    }

    // Create a TwiML response
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
        <Response>
            <Say voice="alice">Hello! This is Eliza, your AI assistant.</Say>
            <Play>${audioBuffer.toString('base64')}</Play>
            <Gather input="speech" timeout="3" action="${process.env.WEBHOOK_URL}/voice">
                <Say>Please speak after the tone.</Say>
            </Gather>
        </Response>`;

    try {
        await this.client.calls.create({
            twiml,
            to,
            from: this.fromNumber
        });
    } catch (error) {
        console.error('Voice call error:', error);
        throw error;
    }
  }

  get serviceType(): ServiceType {
    return ServiceType.TEXT_GENERATION;
  }
}

// Create and export single instance
export const twilioService = new TwilioService();