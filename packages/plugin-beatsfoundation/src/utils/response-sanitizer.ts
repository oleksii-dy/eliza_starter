import { Song } from '../types.js';

/**
 * Fields considered sensitive in song creation requests:
 * - prompt: May contain user-specific context or private information
 * - lyrics: Could contain personal or copyrighted content
 * - genre/mood: While not highly sensitive, could indicate user preferences
 * 
 * Safe fields to expose:
 * - title: Public song title
 * - id: Public identifier
 * - audio_url: Public URL to the generated audio
 * - song_url: Public URL to the song page
 * - streams/upvote_count: Public metrics
 * - username: Public creator attribution
 */

export interface SafeSongResponse {
    song: Song;
    metadata: {
        hasLyrics: boolean;
        genre?: string;
        mood?: string;
        isInstrumental: boolean;
    };
}

export function createSafeResponse(song: Song, hasLyrics: boolean, genre?: string, mood?: string, isInstrumental = false): SafeSongResponse {
    return {
        song,
        metadata: {
            hasLyrics,
            genre,
            mood,
            isInstrumental
        }
    };
}
