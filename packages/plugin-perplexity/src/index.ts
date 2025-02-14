import type { Plugin } from "@elizaos/core";
import { generateTextAction } from "./actions/generateTextAction";
import { generateEmbeddingAction } from "./actions/generateEmbeddingAction";
import { analyzeSentimentAction } from "./actions/analyzeSentimentAction";
import { transcribeAudioAction } from "./actions/transcribeAudioAction";
import { moderateContentAction } from "./actions/moderateContentAction";
import { editTextAction } from "./actions/editTextAction";

export const perplexityPlugin: Plugin = {
    name: "perplexity",
    description: "Perplexity AI integration plugin for various AI capabilities",
    actions: [
        generateTextAction,
        generateEmbeddingAction,
        analyzeSentimentAction,
        transcribeAudioAction,
        moderateContentAction,
        editTextAction,
    ],
    evaluators: [],
    providers: [],
};

export default perplexityPlugin;
