import type { Action, ActionContext, ActionResponse } from "@elizaos/core";
import { validateApiKey, callPerplexityApi, DEFAULT_MODEL } from "./action";

export const transcribeAudioAction: Action = {
    name: "transcribeAudio",
    description: "Transcribe audio to text using Perplexity AI",
    examples: ["Transcribe this audio file", "Convert speech to text"],

    async handler(
        context: ActionContext,
        audioData: Buffer,
        options: { language?: string } = {},
    ): Promise<ActionResponse> {
        const apiKey = validateApiKey();

        // Note: Perplexity doesn't currently support audio transcription
        throw new Error(
            "Audio transcription is not supported by Perplexity AI",
        );
    },
};
