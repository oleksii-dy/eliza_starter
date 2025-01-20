import axios, { CancelToken } from 'axios';
import { Song } from '../../types.js';
import { CreateSongContent, CreateSongOptions } from './types.js';

export function createSongService(apiKey: string) {
    // Create axios instance with retry configuration
    const client = axios.create();
    
    // Will be configured once axios-retry package is added
    /*
    axiosRetry(client, { 
        retries: 3,
        retryDelay: axiosRetry.exponentialDelay,
        retryCondition: (error) => {
            return axiosRetry.isNetworkOrIdempotentRequestError(error) 
                || error.code === 'ECONNABORTED';
        }
    });
    */

    return {
        createSong: async (content: CreateSongContent, options?: CreateSongOptions): Promise<Song> => {
            try {
                const response = await client.post(
                    'https://www.beatsfoundation.com/api/songs',
                    content,
                    {
                        ...options,
                        headers: {
                            Authorization: `Bearer ${apiKey}`,
                            'Content-Type': 'application/json',
                        },
                        timeout: 300000, // 5 minutes timeout for song generation
                    }
                );
                return response.data.song;
            } catch (error: any) {
                // Handle cancellation
                if (axios.isCancel(error)) {
                    throw new Error('Song creation request was cancelled');
                }
                
                // Handle API errors
                if (error.response) {
                    throw new Error(`Beats Foundation API Error: ${error.response.data.error || error.response.status}`);
                }

                // Handle network errors
                if (error.code === 'ECONNABORTED') {
                    throw new Error('Song creation request timed out');
                }

                // Handle other errors
                throw error;
            }
        }
    };
}
