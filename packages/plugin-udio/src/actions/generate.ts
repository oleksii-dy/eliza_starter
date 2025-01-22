import { Action } from "@elizaos/eliza";
import { UdioProvider } from "../providers/udio";
import { UdioGenerateOptions, UdioResponse } from "../types";

const generateMusic: Action<UdioGenerateOptions, UdioResponse> = {
    name: "generate",
    description: "Generate music using Udio AI",
    provider: "udio",

    async execute(options: UdioGenerateOptions, provider: UdioProvider): Promise<UdioResponse> {
        const { prompt, seed = -1, customLyrics } = options;

        // Generate the initial song
        const generateResult = await provider.generateSong(
            prompt,
            { seed },
            customLyrics
        );

        // Wait for processing to complete
        while (true) {
            const status = await provider.checkSongStatus(generateResult.track_ids);
            if (status.songs.every(song => song.finished)) {
                return status;
            }
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }
};

export default generateMusic;