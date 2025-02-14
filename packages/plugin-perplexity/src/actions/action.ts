import axios, { type AxiosRequestConfig } from "axios";

export const DEFAULT_MODEL =
    process.env.PERPLEXITY_DEFAULT_MODEL || "sonar-pro";
export const DEFAULT_MAX_TOKENS = Number.parseInt(
    process.env.PERPLEXITY_MAX_TOKENS || "200",
    10,
);
export const DEFAULT_TEMPERATURE = Number.parseFloat(
    process.env.PERPLEXITY_TEMPERATURE || "0.7",
);
export const DEFAULT_TIMEOUT = 30000; // 30 seconds

/**
 * Validate a prompt for length and content.
 * @param prompt - The prompt to validate.
 * @throws Will throw an error if the prompt is invalid.
 */
export function validatePrompt(prompt: string): void {
    if (!prompt.trim()) {
        throw new Error("Prompt cannot be empty");
    }
    if (prompt.length > 4000) {
        throw new Error("Prompt exceeds maximum length of 4000 characters");
    }
}

/**
 * Validate the presence of the Perplexity API key.
 * @throws Will throw an error if the API key is not set.
 * @returns The API key.
 */
export function validateApiKey(): string {
    const apiKey = process.env.PERPLEXITY_API_KEY;
    if (!apiKey) {
        throw new Error("Perplexity API key is not set");
    }
    return apiKey;
}

export interface PerplexityRequestData {
    model: string;
    messages: Array<{
        role: "system" | "user" | "assistant";
        content: string;
    }>;
    max_tokens?: number;
    temperature?: number;
    top_p?: number;
    stream?: boolean;
    presence_penalty?: number;
    frequency_penalty?: number;
    response_format?: {
        type: "json_schema" | "regex";
        json_schema?: { schema: object };
        regex?: { regex: string };
    };
}

export async function callPerplexityApi<T>(
    url: string,
    data: PerplexityRequestData,
    apiKey: string,
): Promise<T> {
    try {
        const config: AxiosRequestConfig = {
            headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
            timeout: DEFAULT_TIMEOUT,
        };
        const response = await axios.post<T>(
            "https://api.perplexity.ai" + url,
            data,
            config,
        );
        return response.data;
    } catch (error) {
        console.error(
            "Error communicating with Perplexity API:",
            error instanceof Error ? error.message : String(error),
        );
        if (axios.isAxiosError(error)) {
            if (error.response?.status === 429) {
                throw new Error("Rate limit exceeded. Please try again later.");
            }
            if (error.response?.status === 401) {
                throw new Error("Invalid API key or insufficient credits.");
            }
        }
        throw new Error("Failed to communicate with Perplexity API");
    }
}
