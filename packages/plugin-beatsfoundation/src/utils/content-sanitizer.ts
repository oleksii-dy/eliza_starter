import { CreateSongContent } from "../actions/CreateSong/types.js";

const MAX_PROMPT_LENGTH = 1000;
const MAX_LYRICS_LENGTH = 5000;
const VALID_GENRES = [
    "pop", "rock", "jazz", "classical", "electronic", "hip-hop", "rap",
    "r&b", "country", "folk", "indie", "metal", "blues", "reggae"
];
const VALID_MOODS = [
    "happy", "sad", "energetic", "calm", "angry", "peaceful", "romantic",
    "mysterious", "dark", "uplifting", "melancholic", "nostalgic"
];

export function sanitizeCreateSongContent(content: CreateSongContent): CreateSongContent {
    return {
        ...content,
        prompt: sanitizeString(content.prompt, MAX_PROMPT_LENGTH),
        lyrics: content.lyrics ? sanitizeString(content.lyrics, MAX_LYRICS_LENGTH) : undefined,
        genre: content.genre ? sanitizeGenre(content.genre) : undefined,
        mood: content.mood ? sanitizeMood(content.mood) : undefined,
        isInstrumental: Boolean(content.isInstrumental),
    };
}

function sanitizeString(str: string, maxLength: number): string {
    // Trim whitespace and normalize spaces
    let sanitized = str.trim().replace(/\s+/g, ' ');
    // Truncate if too long
    if (sanitized.length > maxLength) {
        sanitized = sanitized.slice(0, maxLength);
    }
    return sanitized;
}

function sanitizeGenre(genre: string): string | undefined {
    const normalized = genre.toLowerCase().trim();
    return VALID_GENRES.find(g => g === normalized);
}

function sanitizeMood(mood: string): string | undefined {
    const normalized = mood.toLowerCase().trim();
    return VALID_MOODS.find(m => m === normalized);
}
