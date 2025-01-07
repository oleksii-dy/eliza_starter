import { Plugin } from '@magickml/core'
import { speakEvaluator } from './evaluator/speakEvaluator'
import { speakProvider } from './provider/speakProvider'
import { callEvaluator } from './evaluator/callEvaluator'
import { callProvider } from './provider/callProvider'

export const twilioPlugin: Plugin = {
  name: 'twilio',
  secrets: [
    {
      name: 'ELEVENLABS_XI_API_KEY',
      key: 'ELEVENLABS_XI_API_KEY',
      global: true,
    },
    {
      name: 'ELEVENLABS_VOICE_ID',
      key: 'ELEVENLABS_VOICE_ID',
      global: true,
    },
    {
      name: 'SERVER_DOMAIN',
      key: 'SERVER_DOMAIN',
      global: true,
    },
    {
      name: 'ELEVENLABS_MODEL_ID',
      key: 'ELEVENLABS_MODEL_ID',
      global: true,
    },
    {
      name: 'ELEVENLABS_VOICE_STABILITY',
      key: 'ELEVENLABS_VOICE_STABILITY',
      global: true,
    },
    {
      name: 'ELEVENLABS_VOICE_SIMILARITY_BOOST',
      key: 'ELEVENLABS_VOICE_SIMILARITY_BOOST',
      global: true,
    },
    {
      name: 'ELEVENLABS_VOICE_STYLE',
      key: 'ELEVENLABS_VOICE_STYLE',
      global: true,
    },
    {
      name: 'ELEVENLABS_VOICE_USE_SPEAKER_BOOST',
      key: 'ELEVENLABS_VOICE_USE_SPEAKER_BOOST',
      global: true,
    },
    {
      name: 'VITS_VOICE',
      key: 'VITS_VOICE',
      global: true,
    }
  ],
  actionEvaluators: [speakEvaluator, callEvaluator],
  actionProviders: [speakProvider, callProvider],
}

export default twilioPlugin;