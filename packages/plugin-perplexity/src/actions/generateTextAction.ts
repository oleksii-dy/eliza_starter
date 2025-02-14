import type { Action, ActionContext, ActionResponse } from "@elizaos/core";
import {
    validateApiKey,
    validatePrompt,
    callPerplexityApi,
    DEFAULT_MODEL,
    DEFAULT_MAX_TOKENS,
    DEFAULT_TEMPERATURE,
} from "./action";
import type { PerplexityTextRequest, PerplexityTextResponse } from "../types";

export const generateTextAction: Action = {
    name: "generateText",
    description: "Generate text using Perplexity AI models",
    examples: [
        "Generate a story about a space adventure",
        "Write a poem about autumn",
        "Explain quantum computing",
    ],

    async handler(
        context: ActionContext,
        prompt: string,
        options: {
            model?: string;
            maxTokens?: number;
            temperature?: number;
            systemPrompt?: string;
        } = {},
    ): Promise<ActionResponse> {
        // Validate inputs
        validatePrompt(prompt);
        const apiKey = validateApiKey();

        // Prepare request
        const messages: PerplexityTextRequest["messages"] = [];
        if (options.systemPrompt) {
            messages.push({
                role: "system" as const,
                content: options.systemPrompt,
            });
        }
        messages.push({
            role: "user" as const,
            content: prompt,
        });

        const requestData: PerplexityTextRequest = {
            model: options.model || DEFAULT_MODEL,
            messages,
            max_tokens: options.maxTokens || DEFAULT_MAX_TOKENS,
            temperature: options.temperature || DEFAULT_TEMPERATURE,
        };

        // Call API
        const response = await callPerplexityApi<PerplexityTextResponse>(
            "/chat/completions",
            requestData,
            apiKey,
        );

        // Extract and return the generated text
        const generatedText = response.choices[0]?.message?.content || "";

        return {
            text: generatedText,
            success: true,
            raw: response,
        };
    },
};
