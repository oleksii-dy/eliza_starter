import { BaseApiClient } from '../lib/BaseClient';
export class AudioService extends BaseApiClient {
    /**
     * Convert audio input to appropriate FormData value
     */
    processAudioInput(audio) {
        if (audio instanceof Blob) {
            return audio;
        }
        if (typeof audio === 'string') {
            // Handle base64 data URLs (e.g., "data:audio/mp3;base64,...")
            if (audio.startsWith('data:')) {
                try {
                    const [header, base64Data] = audio.split(',');
                    const mimeMatch = header.match(/data:([^;]+)/);
                    const mimeType = mimeMatch ? mimeMatch[1] : 'audio/wav';
                    const binaryString = atob(base64Data);
                    const bytes = new Uint8Array(binaryString.length);
                    for (let i = 0; i < binaryString.length; i++) {
                        bytes[i] = binaryString.charCodeAt(i);
                    }
                    return new Blob([bytes], { type: mimeType });
                }
                catch (error) {
                    throw new Error(`Invalid base64 data URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
                }
            }
            // Handle plain base64 strings (try to decode)
            if (this.isBase64String(audio)) {
                try {
                    const binaryString = atob(audio);
                    const bytes = new Uint8Array(binaryString.length);
                    for (let i = 0; i < binaryString.length; i++) {
                        bytes[i] = binaryString.charCodeAt(i);
                    }
                    return new Blob([bytes], { type: 'audio/wav' });
                }
                catch {
                    // If base64 decoding fails, treat as file path or other string
                    return audio;
                }
            }
            // For file paths or other strings, return as-is (server will handle file reading)
            return audio;
        }
        // Handle Buffer and ArrayBuffer types
        if (this.isBuffer(audio)) {
            return new Blob([audio], { type: 'audio/wav' });
        }
        // Cast to any for runtime type checking since TypeScript can't narrow the union type properly
        const audioAsAny = audio;
        if (audioAsAny instanceof ArrayBuffer) {
            return new Blob([audioAsAny], { type: 'audio/wav' });
        }
        if (audioAsAny &&
            typeof audioAsAny === 'object' &&
            'buffer' in audioAsAny &&
            audioAsAny.buffer instanceof ArrayBuffer) {
            // Handle typed arrays like Uint8Array
            return new Blob([audioAsAny.buffer], { type: 'audio/wav' });
        }
        throw new Error(`Unsupported audio input type: ${typeof audio}. Expected Blob, Buffer, ArrayBuffer, or string.`);
    }
    /**
     * Check if a string appears to be base64 encoded
     */
    isBase64String(str) {
        // Basic base64 pattern check (allows padding)
        const base64Pattern = /^[A-Za-z0-9+/]*={0,2}$/;
        // Must be at least 4 characters and divisible by 4 (with padding)
        if (str.length < 4 || str.length % 4 !== 0) {
            return false;
        }
        return base64Pattern.test(str);
    }
    /**
     * Safe check for Buffer type (works in both Node.js and browser environments)
     */
    isBuffer(obj) {
        return (obj !== null &&
            typeof obj === 'object' &&
            typeof obj.constructor === 'function' &&
            obj.constructor.name === 'Buffer' &&
            typeof obj.readUInt8 === 'function');
    }
    /**
     * Handle speech conversation
     */
    async speechConversation(agentId, params) {
        const formData = new FormData();
        const processedAudio = this.processAudioInput(params.audio);
        if (processedAudio instanceof Blob) {
            formData.append('audio', processedAudio);
        }
        else {
            // String (file path or other string identifier)
            formData.append('audio', processedAudio);
        }
        if (params.format) {
            formData.append('format', params.format);
        }
        if (params.language) {
            formData.append('language', params.language);
        }
        if (params.metadata) {
            formData.append('metadata', JSON.stringify(params.metadata));
        }
        return this.request('POST', `/api/audio/${agentId}/speech/conversation`, {
            body: formData,
        });
    }
    /**
     * Generate speech from text
     */
    async generateSpeech(agentId, params) {
        return this.post(`/api/audio/${agentId}/speech/generate`, params);
    }
    /**
     * Synthesize audio message
     */
    async synthesizeAudioMessage(agentId, params) {
        return this.post(`/api/audio/${agentId}/audio-messages/synthesize`, params);
    }
    /**
     * Transcribe audio to text
     */
    async transcribe(agentId, params) {
        const formData = new FormData();
        const processedAudio = this.processAudioInput(params.audio);
        if (processedAudio instanceof Blob) {
            formData.append('audio', processedAudio);
        }
        else {
            // String (file path or other string identifier)
            formData.append('audio', processedAudio);
        }
        if (params.format) {
            formData.append('format', params.format);
        }
        if (params.language) {
            formData.append('language', params.language);
        }
        return this.request('POST', `/api/audio/${agentId}/transcribe`, {
            body: formData,
        });
    }
    /**
     * Process speech input
     */
    async processSpeech(agentId, audio, metadata) {
        const formData = new FormData();
        const processedAudio = this.processAudioInput(audio);
        if (processedAudio instanceof Blob) {
            formData.append('audio', processedAudio);
        }
        else {
            // String (file path or other string identifier)
            formData.append('audio', processedAudio);
        }
        if (metadata) {
            formData.append('metadata', JSON.stringify(metadata));
        }
        return this.request('POST', `/api/audio/${agentId}/speech`, {
            body: formData,
        });
    }
}
