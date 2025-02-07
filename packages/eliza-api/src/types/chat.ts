export interface CodeSuggestion {
    file: string;
    line?: number;
    suggestion: string;
    code?: string;
}

export interface ChatRequest {
    message: string;
    files?: Array<{
        name: string;
        content: string;
    }>;
    conversationId?: string;
}

export interface ChatResponse {
    message: string;
    conversationId: string;
    suggestions?: CodeSuggestion[];
} 