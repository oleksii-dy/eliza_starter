import { z } from "zod";
import { v4 as uuidv4 } from "uuid";

// Comprehensive Error Types
export enum ErrorType {
    VALIDATION = "VALIDATION",
    NETWORK = "NETWORK",
    RATE_LIMIT = "RATE_LIMIT",
    API = "API",
    INTERNAL = "INTERNAL",
    AUTHENTICATION = "AUTHENTICATION",
    PERMISSION = "PERMISSION",
}

// Expanded Error Codes
export enum ErrorCode {
    // Validation Errors
    INVALID_ADDRESS = "INVALID_ADDRESS",
    INVALID_TOKEN_ID = "INVALID_TOKEN_ID",
    INVALID_PRICE = "INVALID_PRICE",
    INVALID_DATA = "INVALID_DATA",

    // Network Errors
    REQUEST_TIMEOUT = "REQUEST_TIMEOUT",
    NETWORK_ERROR = "NETWORK_ERROR",
    DNS_RESOLUTION_ERROR = "DNS_RESOLUTION_ERROR",

    // Rate Limit Errors
    RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED",

    // API Errors
    API_ERROR = "API_ERROR",
    API_KEY_INVALID = "API_KEY_INVALID",
    API_RESPONSE_INVALID = "API_RESPONSE_INVALID",
    UNSUPPORTED_API_VERSION = "UNSUPPORTED_API_VERSION",

    // Authentication Errors
    UNAUTHORIZED = "UNAUTHORIZED",
    TOKEN_EXPIRED = "TOKEN_EXPIRED",

    // Permission Errors
    INSUFFICIENT_PERMISSIONS = "INSUFFICIENT_PERMISSIONS",

    // Internal Errors
    INTERNAL_ERROR = "INTERNAL_ERROR",
    CACHE_ERROR = "CACHE_ERROR",
    DEPENDENCY_ERROR = "DEPENDENCY_ERROR",
}

// Enhanced Error Schema
const ErrorSchema = z.object({
    id: z.string().uuid(),
    type: z.nativeEnum(ErrorType),
    code: z.nativeEnum(ErrorCode),
    message: z.string(),
    details: z.record(z.unknown()).optional(),
    timestamp: z.date(),
    retryable: z.boolean(),
    severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("MEDIUM"),
    correlationId: z.string().optional(),
});

export type NFTError = z.infer<typeof ErrorSchema>;

// Advanced Error Factory
export class NFTErrorFactory {
    static create(
        type: ErrorType,
        code: ErrorCode,
        message: string,
        options: {
            details?: Record<string, unknown>;
            retryable?: boolean;
            severity?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
            correlationId?: string;
        } = {}
    ): NFTError {
        return ErrorSchema.parse({
            id: uuidv4(),
            type,
            code,
            message,
            details: options.details,
            timestamp: new Date(),
            retryable: options.retryable ?? false,
            severity: options.severity ?? "MEDIUM",
            correlationId: options.correlationId,
        });
    }

    static fromError(
        error: unknown,
        defaultType: ErrorType = ErrorType.INTERNAL
    ): NFTError {
        if (error instanceof Error) {
            return this.create(
                defaultType,
                ErrorCode.INTERNAL_ERROR,
                error.message,
                {
                    details: {
                        stack: error.stack,
                    },
                    retryable: false,
                    severity: "HIGH",
                }
            );
        }
        return this.create(
            defaultType,
            ErrorCode.INTERNAL_ERROR,
            "Unknown error occurred",
            {
                details: { error },
                severity: "CRITICAL",
            }
        );
    }
}

// Enhanced Error Handler with Advanced Features
export class ErrorHandler {
    private static instance: ErrorHandler;
    private errorCallbacks: Array<(error: NFTError) => void> = [];
    private telemetryCallbacks: Array<(error: NFTError) => void> = [];

    private constructor() {}

    static getInstance(): ErrorHandler {
        if (!ErrorHandler.instance) {
            ErrorHandler.instance = new ErrorHandler();
        }
        return ErrorHandler.instance;
    }

    registerErrorCallback(callback: (error: NFTError) => void): void {
        this.errorCallbacks.push(callback);
    }

    registerTelemetryCallback(callback: (error: NFTError) => void): void {
        this.telemetryCallbacks.push(callback);
    }

    handleError(error: NFTError): void {
        // Advanced logging
        console.error(
            JSON.stringify(
                {
                    errorId: error.id,
                    type: error.type,
                    code: error.code,
                    message: error.message,
                    severity: error.severity,
                    timestamp: error.timestamp,
                },
                null,
                2
            )
        );

        // Execute registered error callbacks
        this.errorCallbacks.forEach((callback) => {
            try {
                callback(error);
            } catch (callbackError) {
                console.error("Error in error callback:", callbackError);
            }
        });

        // Send to telemetry
        this.telemetryCallbacks.forEach((callback) => {
            try {
                callback(error);
            } catch (callbackError) {
                console.error("Error in telemetry callback:", callbackError);
            }
        });

        // Specialized error handling
        this.routeErrorHandling(error);
    }

    private routeErrorHandling(error: NFTError): void {
        switch (error.type) {
            case ErrorType.RATE_LIMIT:
                this.handleRateLimitError(error);
                break;
            case ErrorType.NETWORK:
                this.handleNetworkError(error);
                break;
            case ErrorType.API:
                this.handleAPIError(error);
                break;
            case ErrorType.AUTHENTICATION:
                this.handleAuthenticationError(error);
                break;
            default:
                break;
        }
    }

    private handleRateLimitError(error: NFTError): void {
        if (error.retryable) {
            const retryDelay = this.calculateExponentialBackoff(error);
            console.log(`Rate limit error. Retrying in ${retryDelay}ms`);
        }
    }

    private handleNetworkError(error: NFTError): void {
        if (error.retryable) {
            const retryDelay = this.calculateExponentialBackoff(error);
            console.log(`Network error. Retrying in ${retryDelay}ms`);
        }
    }

    private handleAPIError(error: NFTError): void {
        switch (error.code) {
            case ErrorCode.API_KEY_INVALID:
                console.error("Critical: Invalid API key detected");
                break;
            case ErrorCode.UNSUPPORTED_API_VERSION:
                console.error("API version no longer supported");
                break;
        }
    }

    private handleAuthenticationError(error: NFTError): void {
        switch (error.code) {
            case ErrorCode.TOKEN_EXPIRED:
                console.log("Attempting token refresh");
                break;
            case ErrorCode.UNAUTHORIZED:
                console.error("Access denied");
                break;
        }
    }

    private calculateExponentialBackoff(
        error: NFTError,
        baseDelay: number = 1000,
        maxDelay: number = 30000
    ): number {
        // Simulate retry attempt tracking
        const attempt = (error.details?.retryAttempt as number) || 0;
        return Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
    }
}

// Utility Functions
export function isRetryableError(error: NFTError): boolean {
    return error.retryable && error.severity !== "CRITICAL";
}

export function shouldRetry(
    error: NFTError,
    attempt: number,
    maxRetries: number = 3
): boolean {
    return isRetryableError(error) && attempt < maxRetries;
}

// Example Usage
/*
try {
    // Your code here
} catch (error) {
    const nftError = NFTErrorFactory.create(
        ErrorType.API,
        ErrorCode.API_ERROR,
        'Detailed API request failure',
        {
            details: { originalError: error },
            retryable: true,
            severity: 'HIGH',
            correlationId: 'unique-request-id'
        }
    );
    ErrorHandler.getInstance().handleError(nftError);
}
*/
