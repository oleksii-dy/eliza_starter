import type { Action, ActionContext, ActionResponse } from "@elizaos/core";
import {
    validateApiKey,
    validatePrompt,
    callPerplexityApi,
    DEFAULT_MODEL,
} from "./action";
import type {
    PerplexityModerationRequest,
    PerplexityModerationResponse,
} from "../types";

export const moderateContentAction: Action = {
    name: "moderateContent",
    description: "Check content for inappropriate or harmful content",
    examples: ["Check if this text is safe", "Moderate this content"],

    async handler(
        context: ActionContext,
        content: string,
    ): Promise<ActionResponse> {
        validatePrompt(content);
        const apiKey = validateApiKey();

        const messages: PerplexityModerationRequest["messages"] = [
            {
                role: "system",
                content:
                    "You are a content moderator. Analyze the content for harmful or inappropriate material.",
            },
            { role: "user", content },
        ];

        const response = await callPerplexityApi<PerplexityModerationResponse>(
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
                                flagged: { type: "boolean" },
                                categories: {
                                    type: "object",
                                    properties: {
                                        hate: { type: "boolean" },
                                        harassment: { type: "boolean" },
                                        "self-harm": { type: "boolean" },
                                        sexual: { type: "boolean" },
                                        violence: { type: "boolean" },
                                    },
                                    required: [
                                        "hate",
                                        "harassment",
                                        "self-harm",
                                        "sexual",
                                        "violence",
                                    ],
                                },
                            },
                            required: ["flagged", "categories"],
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
