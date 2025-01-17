
import axios from "axios";
import { Action } from "@elizaos/core";
import { OpenAIResponse, OpenAIRequest } from "../types";

export const generateTextAction: Action = {
    name: "generateText",
    description: "Generate text using OpenAI",
    async handler(runtime, message, state) {
        const prompt = message.content.text || "";
        const apiKey = process.env.OPENAI_API_KEY;

        if (!apiKey) {
            throw new Error("OpenAI API key is not set");
        }

        const requestData: OpenAIRequest = {
            model: "text-davinci-003",
            prompt,
            max_tokens: 200,
            temperature: 0.7,
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
                }
            );

            return { text: response.data.choices[0].text.trim() };
        } catch (error) {
            console.error("Error communicating with OpenAI API:", error);
            throw new Error("Failed to generate text with OpenAI");
        }
    },
};
