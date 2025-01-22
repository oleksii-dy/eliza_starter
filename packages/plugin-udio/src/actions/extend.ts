import { Action } from "@elizaos/eliza";
import { UdioProvider } from "../providers/udio";
import { UdioExtendOptions, UdioResponse } from "../types";

const extendMusic: Action<UdioExtendOptions, UdioResponse> = {
    name: "extend",
    description: "Extend an existing music piece using Udio AI",
    provider: "udio",

    async execute(options: UdioExtendOptions, provider: UdioProvider): Promise<UdioResponse> {
        const {
            prompt,
            seed = -1,
            customLyrics,
            audioConditioningPath,
            audioConditioningSongId,
            cropStartTime
        } = options;

        const generateResult = await provider.generateSong(
            prompt,
            {
                seed,
                audio_conditioning_path: audioConditioningPath,
                audio_conditioning_song_id: audioConditioningSongId,
                audio_conditioning_type: "continuation",
                ...(cropStartTime !== undefined && { crop_start_time: cropStartTime })
            },
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

export default extendMusic;