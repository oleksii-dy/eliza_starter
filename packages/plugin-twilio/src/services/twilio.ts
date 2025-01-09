// /packages/plugin-twilio/src/services/twilio.ts

import pkg from 'twilio';
const { Twilio } = pkg;
import type { Twilio as TwilioInstance } from 'twilio';
import { Service, ServiceType } from '@elizaos/core';

export class TwilioService implements Service {
  private client: TwilioInstance | null = null;
  private fromNumber: string | null = null;
  private messagingServiceSid: string | null = null;
  public phoneNumber: string;

  constructor() {
    this.phoneNumber = process.env.TWILIO_PHONE_NUMBER || '';
  }

  async initialize(): Promise<void> {
    const accountSid = process.env.TWILIO_ACCOUNT_SID ?? '';
    const authToken = process.env.TWILIO_AUTH_TOKEN ?? '';
    const fromNumber = process.env.TWILIO_PHONE_NUMBER ?? '';

    // Make messagingServiceSid optional
    const messagingServiceSid = process.env.TWILIO_LOW_VOLUME_SERVICE_SID;

    if (!accountSid || !authToken || !fromNumber) {
        throw new Error('Required environment variables missing');
    }

    this.fromNumber = fromNumber;
    this.client = new Twilio(accountSid, authToken);
    this.messagingServiceSid = messagingServiceSid || null;

    console.log('Initialized Twilio with:', {
        fromNumber: this.fromNumber,
        isCanadianNumber: fromNumber.startsWith('+1343'),
        messagingService: this.messagingServiceSid || 'Not configured'
    });
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

  async sendMessage(to: string, message: string): Promise<void> {
    console.log('TwilioService: Sending message to:', to);

    if (!this.client || !this.fromNumber) {
        console.error('TwilioService: Not initialized');
        throw new Error('Twilio service not properly initialized');
    }

    try {
        // Only include messagingServiceSid if it exists
        const messageOptions: any = {
            from: this.fromNumber,
            to,
            body: message
        };

        if (this.messagingServiceSid) {
            messageOptions.messagingServiceSid = this.messagingServiceSid;
        }

        const result = await this.client.messages.create(messageOptions);

        console.log('TwilioService: API Response:', {
            sid: result.sid,
            status: result.status
        });
    } catch (error: any) {
        console.error('TwilioService: API Error:', {
            code: error.code,
            message: error.message
        });
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