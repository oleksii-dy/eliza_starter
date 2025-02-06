import axios, { AxiosRequestConfig } from "axios";
import { DEFAULT_TIMEOUT } from "./config";

/**
 * Validate the presence of the State of Mika (SOM) API key.
 * @throws Will throw an error if the API key is not set.
 * @returns The API key.
 */
export function validateApiKey(): string {
    const apiKey = process.env.SOM_API_KEY;
    if (!apiKey) {
        throw new Error("State of Mika API key is not set");
    }
    return apiKey;
}

export interface SOMRequestFormData extends FormData {
    append(name: "query", value: string): void;
    append(name: string, value: string | Blob): void;
}

export interface SOMResponseData {
    original_query: string;
    route: SOMRouteInfo;
    response: {
        processed_response: string;
        [key: string]: any;
    };
}

export interface SOMRouteInfo {
    tool: string;
    confidence: number;
    parameters?: {
        [key: string]: any;
    };
    description: string;
}

/**
 * Build a request object for SOM Router.
 * @param prompt - The text prompt to process.
 * @returns The request payload for SOM router.
 */

export function buildRequestData(prompt: string) {
    const formData: SOMRequestFormData = new FormData();
    formData.append("query", prompt);

    return formData;
}

export async function callSomApi<T extends SOMResponseData>(
    url: string,
    data: SOMRequestFormData,
    apiKey: string
): Promise<T> {
    try {
        const config: AxiosRequestConfig = {
            headers: {
                "X-API-Key": apiKey,
                timeout: DEFAULT_TIMEOUT,
            },
        };
        const response = await axios.post<T>(url, data, config);
        return response.data;
    } catch (error) {
        console.error(
            "Error communicating with SOM API:",
            error instanceof Error ? error.message : String(error)
        );
        if (axios.isAxiosError(error)) {
            if (error.response?.status === 429) {
                throw new Error("Rate limit exceeded. Please try again later.");
            }
        }
        throw new Error("Failed to communicate with SOM API");
    }
}
