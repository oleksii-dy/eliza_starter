import { Content } from "@elizaos/core";

// Configuration for the adNetworkPlugin API
export interface AdNetworkConfig {
    provider: {
        apiKey: string; // API key for authentication
        baseUrl?: string; // Optional base URL for the API
    };
}

// Token information returned by the API
export interface TokenDetails {
    token: string; // Name of the token
    chain: string; // Blockchain associated with the token
    context: string; // Context or description of the token
}

// Provider response structure for adNetworkPlugin
export interface AdNetworkProviderResponse {
    success: boolean; // Indicates if the API call was successful
    data?: TokenDetails; // Token details if the call was successful
    error?: string; // Error message in case of failure
}

// Content structure for promotional content generation
export interface AdNetworkActionContent extends Content {
    text: string; // Input text for generating promotional content
}

// Content structure for evaluation
export interface AdNetworkEvalContent extends Content {
    text: string; // Text to evaluate
    tokenDetails?: TokenDetails; // Token details for evaluation
}

// Evaluation response
export interface AdNetworkEvalResponse {
    success: boolean; // Indicates if the evaluation was successful
    response: string; // Evaluation result or message
}
