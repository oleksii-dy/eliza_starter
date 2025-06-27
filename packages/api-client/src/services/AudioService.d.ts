import { UUID } from '@elizaos/core';
import { BaseApiClient } from '../lib/BaseClient';
import { SpeechConversationParams, SpeechGenerateParams, AudioSynthesizeParams, TranscribeParams, SpeechResponse, TranscriptionResponse } from '../types/audio';
export declare class AudioService extends BaseApiClient {
    /**
     * Convert audio input to appropriate FormData value
     */
    private processAudioInput;
    /**
     * Check if a string appears to be base64 encoded
     */
    private isBase64String;
    /**
     * Safe check for Buffer type (works in both Node.js and browser environments)
     */
    private isBuffer;
    /**
     * Handle speech conversation
     */
    speechConversation(agentId: UUID, params: SpeechConversationParams): Promise<SpeechResponse>;
    /**
     * Generate speech from text
     */
    generateSpeech(agentId: UUID, params: SpeechGenerateParams): Promise<{
        audio: string;
        format: string;
    }>;
    /**
     * Synthesize audio message
     */
    synthesizeAudioMessage(agentId: UUID, params: AudioSynthesizeParams): Promise<{
        audio: string;
        format: string;
    }>;
    /**
     * Transcribe audio to text
     */
    transcribe(agentId: UUID, params: TranscribeParams): Promise<TranscriptionResponse>;
    /**
     * Process speech input
     */
    processSpeech(agentId: UUID, audio: Blob | Buffer | string, metadata?: Record<string, any>): Promise<SpeechResponse>;
}
