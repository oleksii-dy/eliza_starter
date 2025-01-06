// /packages/plugin-twilio/src/twilio-plugin.ts

import { Plugin } from '@elizaos/core';
import { twilioService } from './services/twilio.js';
import { voiceService } from './services/voice.js';
import { transcriptionService } from './services/transcription.js';
import { smsAction } from './actions/sms-action.js';
import { textToSpeechAction, makeVoiceCallAction } from './actions/voice-action.js';

// Create plugin instance
const twilioPlugin: Plugin = {
  name: 'twilio',
  description: 'Twilio plugin for Eliza with voice, SMS, and transcription capabilities',
  actions: [
    smsAction,
    textToSpeechAction,
    makeVoiceCallAction
  ],
  evaluators: [],
  providers: [],
  services: [
    twilioService,
    voiceService,
    transcriptionService
  ]
};

// Export plugin
export { twilioPlugin };
export default twilioPlugin;