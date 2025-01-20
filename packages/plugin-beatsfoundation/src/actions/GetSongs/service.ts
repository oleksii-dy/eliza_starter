import axios from 'axios';
import { PaginatedSongsResponse } from '../../types.js';

export function createSongsService(apiKey: string) {
    return {
        getSongs: async (limit?: number, offset?: number): Promise<PaginatedSongsResponse> => {
            try {
                const params: Record<string, any> = {
                    limit: Math.min(limit || 10, 100), // Default 10, max 100
                    offset: Math.max(offset || 0, 0)   // Default 0, min 0
                };

                const response = await axios.get(
                    'https://www.beatsfoundation.com/api/songs',
                    {
                        params,
                        headers: {
                            Authorization: `Bearer ${apiKey}`,
                            'Content-Type': 'application/json',
                        },
                    }
                );
                const { songs, total } = response.data;
                return {
                    data: songs,
                    pagination: {
                        total,
                        limit: limit || 10, // Default limit
                        offset: offset || 0  // Default offset
                    }
                };
            } catch (error: any) {
                if (error.response) {
                    throw new Error(`Beats Foundation API Error: ${error.response.data.error || error.response.status}`);
                }
                throw error;
            }
        }
    };
}
