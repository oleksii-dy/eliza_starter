import {
    type Action,
    type HandlerCallback,
    type IAgentRuntime,
    type Memory,
    type State,
    elizaLogger,
} from "@elizaos/core";
import { encodingForModel, type TiktokenModel } from "js-tiktoken";
import { YouTubeTranscriptionService } from "../services/youtubeTranscriptionService";

const DEFAULT_MAX_TRANSCRIPTION_TOKENS = 300; // Limit the transcription preview to 300 tokens
const DEFAULT_MODEL_ENCODING = "gpt-3.5-turbo";

function getTotalTokensFromString(
    str: string,
    encodingName: TiktokenModel = DEFAULT_MODEL_ENCODING
) {
    const encoding = encodingForModel(encodingName);
    return encoding.encode(str).length;
}

function limitTranscription(
    data: string,
    maxTokens: number = DEFAULT_MAX_TRANSCRIPTION_TOKENS
): string {
    if (getTotalTokensFromString(data) > maxTokens) {
        return data.slice(0, maxTokens) + "...";
    }
    return data;
}

export const youtubeTranscription: Action = {
    name: "YOUTUBE_TRANSCRIPTION",
    similes: [
        "YT_TRANSCRIBE",
        "TRANSCRIBE_VIDEO",
        "GET_CAPTIONS",
        "FETCH_YOUTUBE_CAPTIONS",
    ],
    suppressInitialMessage: true,
    description: "Fetch and transcribe captions from a YouTube video.",
    validate: async (runtime: IAgentRuntime, message: Memory) => {
        const content = message.content.text;
        return (
            !!content &&
            /(?:https?:\/\/)?(?:www\.)?(youtube\.com|youtu\.be)/.test(content)
        );
    },
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        options: any,
        callback: HandlerCallback
    ) => {
        try {
            elizaLogger.log("Composing state for message:", message);
            state = (await runtime.composeState(message)) as State;

            const videoUrl = message.content.text;
            elizaLogger.log("YouTube video URL received:", videoUrl);

            const transcriptionService = new YouTubeTranscriptionService();
            const transcription = await transcriptionService.getTranscription(
                videoUrl
            );

            // Limit the transcription to a tokenized preview
            const preview = limitTranscription(
                transcription,
                DEFAULT_MAX_TRANSCRIPTION_TOKENS
            );

            callback({
                text: `Here's a preview of the transcription:\n\n${preview}\n\nYou can request the full transcription if needed.`,
            });
        } catch (error) {
            elizaLogger.error("YouTube transcription error:", error.message);
            callback({
                text: "Sorry, I couldn't fetch the transcription for this video.",
            });
        }
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Transcribe the captions for this video: https://www.youtube.com/watch?v=VIDEO_ID",
                },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "Here is the transcription preview for the video:",
                    action: "YOUTUBE_TRANSCRIPTION",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Can you get the captions for https://youtu.be/VIDEO_ID?",
                },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "Here is the transcription preview for the video:",
                    action: "YOUTUBE_TRANSCRIPTION",
                },
            },
        ],
    ],
} as Action;
