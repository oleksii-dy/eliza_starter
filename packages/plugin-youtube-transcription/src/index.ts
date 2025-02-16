import { youtubeTranscription } from "./actions/youtubeTranscription";
import type { Plugin } from "@elizaos/core";
import { YouTubeTranscriptionService } from "./services/youtubeTranscriptionService";

export const youtubeTranscriptionPlugin: Plugin = {
    name: "youtubeTranscription",
    description: "Fetch and transcribe YouTube captions",
    actions: [youtubeTranscription],
    evaluators: [],
    providers: [],
    services: [new YouTubeTranscriptionService()],
    clients: [],
};

export default youtubeTranscriptionPlugin;
