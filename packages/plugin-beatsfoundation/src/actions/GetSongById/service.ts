import axios from 'axios';
import { Song } from '../../types';

export function createSongService(apiKey: string) {
    return {
        getSongById: async (songId: string): Promise<Song> => {
            try {
                const response = await axios.get(
                    `https://www.beatsfoundation.com/api/songs/${songId}`,
                    {
                        headers: {
                            Authorization: `Bearer ${apiKey}`,
                            'Content-Type': 'application/json',
                        },
                    }
                );
                return response.data.song;
            } catch (error: any) {
                if (error.response) {
                    throw new Error(`Beats Foundation API Error: ${error.response.data.error || error.response.status}`);
                }
                throw error;
            }
        }
    };
} 