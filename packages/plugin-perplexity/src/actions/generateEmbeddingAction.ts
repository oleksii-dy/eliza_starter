import type { Action, ActionContext, ActionResponse } from "@elizaos/core";
import { validateApiKey, validatePrompt, callPerplexityApi } from "./action";
import type {
    PerplexityEmbeddingRequest,
    PerplexityEmbeddingResponse,
} from "../types";

export const generateEmbeddingAction: Action = {
    name: "generateEmbedding",
    description: "Generate embeddings for text using Perplexity AI",
    examples: ["Get vector representation", "Generate text embedding"],

    async handler(
        context: ActionContext,
        text: string,
    ): Promise<ActionResponse> {
        validatePrompt(text);
        const apiKey = validateApiKey();

        // Note: Perplexity doesn't currently support embeddings
        throw new Error(
            "Embedding generation is not supported by Perplexity AI",
        );
    },
};
