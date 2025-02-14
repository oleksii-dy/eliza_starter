import type { Action, ActionContext, ActionResponse } from "@elizaos/core";
import {
    validateApiKey,
    validatePrompt,
    callPerplexityApi,
    DEFAULT_MODEL,
    DEFAULT_TEMPERATURE,
} from "./action";
import type { PerplexityEditRequest, PerplexityEditResponse } from "../types";

export const editTextAction: Action = {
    name: "editText",
    description: "Edit or revise text using Perplexity AI",
    examples: ["Fix grammar", "Make text more formal", "Simplify the language"],

    async handler(
        context: ActionContext,
        text: string,
        instruction: string,
    ): Promise<ActionResponse> {
        validatePrompt(text);
        validatePrompt(instruction);
        const apiKey = validateApiKey();

        const messages: PerplexityEditRequest["messages"] = [
            {
                role: "system",
                content:
                    "You are a text editor. Edit the given text according to the instruction.",
            },
            {
                role: "user",
                content: `Text: ${text}\nInstruction: ${instruction}`,
            },
        ];

        const response = await callPerplexityApi<PerplexityEditResponse>(
            "/chat/completions",
            {
                model: DEFAULT_MODEL,
                messages,
                temperature: DEFAULT_TEMPERATURE,
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
