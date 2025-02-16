import { Service, ServiceType } from "@elizaos/core";
import { getSubtitles } from "youtube-captions-scraper";
import type { IYouTubeTranscriptionService } from "../types";

export class YouTubeTranscriptionService
    extends Service
    implements IYouTubeTranscriptionService
{
    async initialize(): Promise<void> {
        // No initialization required for this service.
    }

    getInstance(): IYouTubeTranscriptionService {
        return YouTubeTranscriptionService.getInstance();
    }

    static get serviceType(): ServiceType {
        return ServiceType.TRANSCRIPTION; // Customize as needed for your use case
    }

    async getTranscription(videoUrl: string): Promise<string> {
        try {
            const videoId = this.extractVideoId(videoUrl);
            const captions = await getSubtitles({ videoID: videoId });
            return captions.map(caption => caption.text).join(" ");
        } catch (error) {
            console.error("YouTube transcription error:", error);
            throw new Error(
                `Failed to fetch transcription: ${error.message}`
            );
        }
    }

    private extractVideoId(url: string): string {
        const match =
            url.match(/(?:https?:\/\/)?(?:www\.)?youtube\.com\/.*v=([^&]+)/) ||
            url.match(/(?:https?:\/\/)?(?:www\.)?youtu\.be\/([^?&]+)/);
        if (!match) {
            throw new Error("Invalid YouTube URL");
        }
        return match[1];
    }
}
