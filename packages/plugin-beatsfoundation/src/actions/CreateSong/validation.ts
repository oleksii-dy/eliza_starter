import { CreateSongContent } from "./types";

const MAX_PROMPT_LENGTH = 1000;
const MAX_LYRICS_LENGTH = 5000;

export function isCreateSongContent(content: unknown): content is CreateSongContent {
    if (!content || typeof content !== "object" || Array.isArray(content) || content === null) return false;
    const c = content as Record<string, unknown>;

    // Required field validation
    if (typeof c.prompt !== "string" || c.prompt.length === 0 || c.prompt.length > MAX_PROMPT_LENGTH) return false;

    // Optional field validation
    if (c.lyrics !== undefined) {
        if (typeof c.lyrics !== "string" || c.lyrics.length > MAX_LYRICS_LENGTH) return false;
    }

    if (c.genre !== undefined) {
        if (typeof c.genre !== "string" || c.genre.trim().length === 0) return false;
    }

    if (c.mood !== undefined) {
        if (typeof c.mood !== "string" || c.mood.trim().length === 0) return false;
    }

    if (c.isInstrumental !== undefined && typeof c.isInstrumental !== "boolean") return false;

    return true;
}
