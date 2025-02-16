import { Service } from "@elizaos/core";

export interface IYouTubeTranscriptionService extends Service {
    getTranscription(videoUrl: string): Promise<string>;
}