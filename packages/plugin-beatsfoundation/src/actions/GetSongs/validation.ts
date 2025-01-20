import { GetSongsContent } from "./types";

const MAX_LIMIT = 100;
const MIN_OFFSET = 0;

export function isGetSongsContent(content: unknown): content is GetSongsContent {
    if (!content || typeof content !== "object" || Array.isArray(content) || content === null) return false;
    const c = content as Record<string, unknown>;

    // Validate limit
    if (c.limit !== undefined) {
        if (typeof c.limit !== "number") return false;
        if (c.limit < 0 || c.limit > MAX_LIMIT) return false;
    }

    // Validate offset
    if (c.offset !== undefined) {
        if (typeof c.offset !== "number") return false;
        if (c.offset < MIN_OFFSET) return false;
    }

    return true;
}
