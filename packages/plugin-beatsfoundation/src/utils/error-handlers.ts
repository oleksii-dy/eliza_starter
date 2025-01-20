import { elizaLogger } from "@elizaos/core";
import type { HandlerCallback } from "@elizaos/core";

export function handleBeatsFoundationError(
    error: any,
    handlerName: string,
    callback?: HandlerCallback
): boolean {
    elizaLogger.error(`Error in ${handlerName} handler:`, error);
    if (callback) {
        callback({
            text: `Error in ${handlerName.toLowerCase()}: ${error.message}`,
            content: { error: error.message },
        });
    }
    return false;
}
