// /packages/plugin-twilio/src/services/transcription.ts

import pkg from '@deepgram/sdk';
const { Deepgram } = pkg;
import { EventEmitter } from 'events';
import { Service, ServiceType } from '@elizaos/core';

class TranscriptionService extends EventEmitter implements Service {
  private client: InstanceType<typeof Deepgram> | null = null;

  async initialize(): Promise<void> {
    const apiKey = process.env.DEEPGRAM_API_KEY;
    if (!apiKey) {
      throw new Error('DEEPGRAM_API_KEY environment variable is required');
    }
    this.client = new Deepgram(apiKey);
  }

  async transcribeAudio(audioBuffer: Buffer): Promise<string> {
    if (!this.client) {
      throw new Error('Transcription service not initialized');
    }

    try {
      const response = await this.client.transcription.preRecorded({
        buffer: audioBuffer,
        mimetype: 'audio/wav'
      }, {
        model: 'nova-2',
        language: 'en',
        smart_format: true
      });

      const transcript = response.results?.channels[0]?.alternatives[0]?.transcript;
      if (!transcript) {
        throw new Error('No transcription found in response');
      }

      return transcript;
    } catch (error) {
      console.error('Transcription error:', error);
      throw error;
    }
  }

  get serviceType(): ServiceType {
    return ServiceType.TRANSCRIPTION;
  }
}

// Create a single instance
const transcriptionService = new TranscriptionService();

// Export the instance and type separately
export type { TranscriptionService };
export { transcriptionService };