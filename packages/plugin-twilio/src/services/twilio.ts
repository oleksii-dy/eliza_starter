// /packages/plugin-twilio/src/services/twilio.ts

import pkg from 'twilio';
const { Twilio } = pkg;
import type { Twilio as TwilioInstance } from 'twilio';
import { Service, ServiceType } from '@elizaos/core';
import { RuntimeContext } from './runtime-context.js';

class TwilioService implements Service {
  private client: TwilioInstance | null = null;
  private fromNumber: string | null = null;
  private messagingServiceSid: string | null = null;

  async initialize(): Promise<void> {
    const accountSid = process.env.TWILIO_ACCOUNT_SID ?? '';
    const authToken = process.env.TWILIO_AUTH_TOKEN ?? '';
    const fromNumber = process.env.TWILIO_PHONE_NUMBER ?? '';
    const lowVolumeServiceSid = process.env.TWILIO_LOW_VOLUME_SERVICE_SID ?? '';

    if (!accountSid || !authToken || !fromNumber || !lowVolumeServiceSid) {
        throw new Error('Required environment variables missing');
    }

    this.fromNumber = fromNumber;
    this.client = new Twilio(accountSid, authToken);
    this.messagingServiceSid = lowVolumeServiceSid;

    console.log('Initialized Twilio with:', {
        fromNumber: this.fromNumber,
        messagingService: this.messagingServiceSid
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
        console.error('TwilioService: Not initialized:', {
            hasClient: !!this.client,
            fromNumber: this.fromNumber
        });
        throw new Error('Twilio service not properly initialized');
    }

    try {
        console.log('TwilioService: Calling Twilio API with:', {
            from: this.fromNumber,
            to,
            messageLength: message.length
        });

        const result = await this.client.messages.create({
            from: this.fromNumber,
            to,
            body: message
        });

        console.log('TwilioService: API Response:', {
            sid: result.sid,
            status: result.status,
            errorCode: result.errorCode,
            errorMessage: result.errorMessage
        });
    } catch (error) {
        console.error('TwilioService: API Error:', {
            code: (error as any).code,
            message: (error as any).message,
            moreInfo: (error as any).moreInfo
        });
        throw error;
    }
  }

  async makeVoiceCall(to: string, audioBuffer: Buffer): Promise<void> {
    if (!this.client || !this.fromNumber) {
      throw new Error('Twilio service not initialized');
    }

    // Create a TwiML response with the audio
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Play>${audioBuffer.toString('base64')}</Play>
      </Response>`;

    await this.client.calls.create({
      twiml,
      to,
      from: this.fromNumber
    });
  }

  get serviceType(): ServiceType {
    return ServiceType.TEXT_GENERATION;
  }
}

// Create a single instance
const twilioService = new TwilioService();

// Export the instance and type separately
export type { TwilioService };
export { twilioService };