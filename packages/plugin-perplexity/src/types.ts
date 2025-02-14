// Types for generating text
export interface PerplexityTextRequest {
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
}

export interface PerplexityTextResponse {
    id: string;
    object: string;
    created: number;
    model: string;
    choices: Array<{
        message: {
            role: "assistant";
            content: string;
        };
        index: number;
        finish_reason: string;
    }>;
    usage: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
}

// Types for generating embeddings
export interface PerplexityEmbeddingRequest {
    model: string;
    input: string | string[];
}

export interface PerplexityEmbeddingResponse {
    object: string;
    data: Array<{
        embedding: number[];
        index: number;
    }>;
    model: string;
    usage: {
        prompt_tokens: number;
        total_tokens: number;
    };
}

// Types for analyzing sentiment
export interface PerplexitySentimentAnalysisRequest
    extends PerplexityTextRequest {
    response_format: {
        type: "json_schema";
        json_schema: {
            schema: {
                type: "object";
                properties: {
                    sentiment: {
                        type: "string";
                        enum: ["positive", "negative", "neutral"];
                    };
                    confidence: {
                        type: "number";
                        minimum: 0;
                        maximum: 1;
                    };
                };
                required: ["sentiment", "confidence"];
            };
        };
    };
}

export interface PerplexitySentimentAnalysisResponse
    extends PerplexityTextResponse {
    choices: Array<{
        message: {
            role: "assistant";
            content: string; // JSON string containing sentiment and confidence
        };
        index: number;
        finish_reason: string;
    }>;
}

// Types for content moderation
export interface PerplexityModerationRequest extends PerplexityTextRequest {
    response_format: {
        type: "json_schema";
        json_schema: {
            schema: {
                type: "object";
                properties: {
                    flagged: { type: "boolean" };
                    categories: {
                        type: "object";
                        properties: {
                            hate: { type: "boolean" };
                            harassment: { type: "boolean" };
                            "self-harm": { type: "boolean" };
                            sexual: { type: "boolean" };
                            violence: { type: "boolean" };
                        };
                        required: [
                            "hate",
                            "harassment",
                            "self-harm",
                            "sexual",
                            "violence",
                        ];
                    };
                };
                required: ["flagged", "categories"];
            };
        };
    };
}

export interface PerplexityModerationResponse extends PerplexityTextResponse {
    choices: Array<{
        message: {
            role: "assistant";
            content: string; // JSON string containing moderation results
        };
        index: number;
        finish_reason: string;
    }>;
}

// Types for editing text
export interface PerplexityEditRequest extends PerplexityTextRequest {
    messages: Array<{
        role: "system" | "user" | "assistant";
        content: string;
    }>;
}

export interface PerplexityEditResponse extends PerplexityTextResponse {}
