export interface ResponseTemplate {
    template: string;
    description: string;
}

// Pagination interface used across multiple templates
export interface PaginationTemplate {
    nextKey: string | null;
    total: number;
}

// Common coin type used across templates
export interface CoinTemplate {
    denom: string;
    amount: string;
}

// Helper functions for template manipulation
export const templateUtils = {
    // Formats a template string by replacing placeholders
    format: (template: string, values: Record<string, any>): string => {
        return template.replace(
            /\{\{(\w+)\}\}/g,
            (_, key) => values[key] || "null"
        );
    },

    // Combines multiple templates into one
    combine: (templates: string[]): string => {
        return templates.join("\n\n");
    },

    // Creates a JSON response template
    createJsonTemplate: (content: string): string => {
        return `\`\`\`json\n${content}\n\`\`\``;
    },
};

// Common response wrapper
export interface ApiResponse<T> {
    data: T;
    pagination?: PaginationTemplate;
}

// Error template
export interface ErrorTemplate {
    code: number;
    message: string;
    details?: any[];
}
