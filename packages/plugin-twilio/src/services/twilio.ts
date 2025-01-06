// /packages/plugin-twilio/src/services/twilio.ts

import pkg from 'twilio';
const { Twilio } = pkg;
import type { Twilio as TwilioInstance } from 'twilio';
import { Service, ServiceType } from '@elizaos/core';

class TwilioService implements Service {
  private client: TwilioInstance | null = null;
  private fromNumber: string | null = null;

  async initialize(): Promise<void> {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !fromNumber) {
      throw new Error('TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER environment variables are required');
    }

    this.client = new Twilio(accountSid, authToken);
    this.fromNumber = fromNumber;
  }

  async sendMessage(to: string, message: string): Promise<void> {
    if (!this.client || !this.fromNumber) {
      throw new Error('Twilio service not initialized');
    }

    await this.client.messages.create({
      body: message,
      to,
      from: this.fromNumber
    });
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