import type { Action, ActionContext, ActionResponse } from "@elizaos/core";
import {
    validateApiKey,
    validatePrompt,
    callPerplexityApi,
    DEFAULT_MODEL,
} from "./action";
import type {
    PerplexitySentimentAnalysisRequest,
    PerplexitySentimentAnalysisResponse,
} from "../types";

export const analyzeSentimentAction: Action = {
    name: "analyzeSentiment",
    description: "Analyze the sentiment of text",
    examples: [
        "Is this review positive?",
        "What's the sentiment of this text?",
    ],

    async handler(
        context: ActionContext,
        text: string,
    ): Promise<ActionResponse> {
        validatePrompt(text);
        const apiKey = validateApiKey();

        const messages: PerplexitySentimentAnalysisRequest["messages"] = [
            {
                role: "system",
                content:
                    "You are a sentiment analyzer. Analyze the sentiment of the given text.",
            },
            { role: "user", content: text },
        ];

        const response =
            await callPerplexityApi<PerplexitySentimentAnalysisResponse>(
                "/chat/completions",
                {
                    model: DEFAULT_MODEL,
                    messages,
                    response_format: {
                        type: "json_schema",
                        json_schema: {
                            schema: {
                                type: "object",
                                properties: {
                                    sentiment: {
                                        type: "string",
                                        enum: [
                                            "positive",
                                            "negative",
                                            "neutral",
                                        ],
                                    },
                                    confidence: {
                                        type: "number",
                                        minimum: 0,
                                        maximum: 1,
                                    },
                                },
                                required: ["sentiment", "confidence"],
                            },
                        },
                    },
                },
                apiKey,
            );

        return {
            text: response.choices[0]?.message?.content || "",
            success: true,
            raw: response,
        };
    },
};
