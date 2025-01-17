
export interface OpenAIRequest {
    model: string;
    prompt: string;
    max_tokens: number;
    temperature: number;
}

export interface OpenAIResponse {
    id: string;
    object: string;
    created: number;
    model: string;
    choices: Array<{
        text: string;
        index: number;
        logprobs: null | any;
        finish_reason: string;
    }>;
}
