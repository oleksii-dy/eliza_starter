
import axios from "axios";
import { Action } from "@elizaos/core";
import { OpenAIResponse, OpenAIRequest } from "../types";

const DEFAULT_MODEL = process.env.OPENAI_DEFAULT_MODEL || "text-davinci-003";
const DEFAULT_MAX_TOKENS = parseInt(process.env.OPENAI_MAX_TOKENS || "200", 10);
const DEFAULT_TEMPERATURE = parseFloat(process.env.OPENAI_TEMPERATURE || "0.7");

export const generateTextAction: Action = {
    name: "generateText",
    description: "Generate text using OpenAI",
    async handler(runtime, message, state) {
        const prompt = message.content.text?.trim() || "";
    if (!prompt) {
        throw new Error("Prompt cannot be empty");
    }
    if (prompt.length > 4000) {
        throw new Error("Prompt exceeds maximum length of 4000 characters");
    }
        const apiKey = process.env.OPENAI_API_KEY;

        if (!apiKey) {
            throw new Error("OpenAI API key is not set");
        }

        const requestData: OpenAIRequest = {
            model: message.content.model || DEFAULT_MODEL,
            prompt,
            max_tokens: message.content.maxTokens || DEFAULT_MAX_TOKENS,
            temperature: message.content.temperature || DEFAULT_TEMPERATURE,
        };

        try {
            const response = await axios.post<OpenAIResponse>(
                "https://api.openai.com/v1/completions",
                requestData,
                {
                    headers: {
                        Authorization: `Bearer ${apiKey}`,
                        "Content-Type": "application/json",
                    },
                    timeout: 30000, // 30 second timeout
                }
            );

            return { text: response.data.choices[0].text.trim() };
        } catch (error) {
            console.error("Error communicating with OpenAI API:", error.message);
            if (axios.isAxiosError(error)) {
                if (error.response?.status === 429) {
                    throw new Error("Rate limit exceeded. Please try again later.");
                }
            }
            throw new Error("Failed to generate text with OpenAI");
        }
    },
};
