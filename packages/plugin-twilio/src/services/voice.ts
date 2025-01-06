// /packages/plugin-twilio/src/services/voice.ts

import axios from 'axios';
import { EventEmitter } from 'events';
import { Service, ServiceType } from '@elizaos/core';

class VoiceService extends EventEmitter implements Service {
  private apiKey: string | null = null;

  async initialize(): Promise<void> {
    const apiKey = process.env.ELEVENLABS_XI_API_KEY;
    if (!apiKey) {
      throw new Error('Missing ElevenLabs API key');
    }
    this.apiKey = apiKey;
  }

  async textToSpeech(text: string): Promise<Buffer> {
    if (!this.apiKey) {
      throw new Error('Voice service not initialized');
    }

    try {
      const response = await axios.post(
        'https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM',
        {
          text,
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.5
          }
        },
        {
          headers: {
            'Accept': 'audio/mpeg',
            'xi-api-key': this.apiKey,
            'Content-Type': 'application/json'
          },
          responseType: 'arraybuffer'
        }
      );

      return Buffer.from(response.data);
    } catch (error) {
      console.error('Text-to-speech error:', error);
      throw error;
    }
  }

  get serviceType(): ServiceType {
    return ServiceType.SPEECH_GENERATION;
  }
}

const voiceService = new VoiceService();

export type { VoiceService };
export { voiceService };