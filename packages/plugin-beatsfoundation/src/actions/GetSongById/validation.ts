import { GetSongByIdContent } from "./types";

export function isGetSongByIdContent(content: unknown): content is GetSongByIdContent {
    if (!content || typeof content !== "object" || Array.isArray(content) || content === null) return false;
    const c = content as Record<string, unknown>;

    if (typeof c.songId !== "string" || c.songId.trim().length === 0) return false;

    return true;
}
