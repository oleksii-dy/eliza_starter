import { elizaLogger as logger } from '@elizaos/core';
import type { IAgentRuntime } from '@elizaos/core';

// Error Categories
export enum ErrorCategory {
    USER_ERROR = 'USER_ERROR',
    NETWORK_ERROR = 'NETWORK_ERROR',
    CONTRACT_ERROR = 'CONTRACT_ERROR',
    INSUFFICIENT_FUNDS = 'INSUFFICIENT_FUNDS',
    INVALID_PARAMS = 'INVALID_PARAMS',
    TIMEOUT = 'TIMEOUT',
    RATE_LIMIT = 'RATE_LIMIT',
    UNKNOWN = 'UNKNOWN'
}

// Error Severity Levels
export enum ErrorSeverity {
    LOW = 'LOW',
    MEDIUM = 'MEDIUM',
    HIGH = 'HIGH',
    CRITICAL = 'CRITICAL'
}

// Base Error Class
export class EVMError extends Error {
    public readonly category: ErrorCategory;
    public readonly severity: ErrorSeverity;
    public readonly recoverable: boolean;
    public readonly retryable: boolean;
    public readonly context?: Record<string, any>;
    public readonly timestamp: Date;

    constructor(
        message: string,
        category: ErrorCategory = ErrorCategory.UNKNOWN,
        severity: ErrorSeverity = ErrorSeverity.MEDIUM,
        options?: {
            recoverable?: boolean;
            retryable?: boolean;
            context?: Record<string, any>;
            cause?: Error;
        }
    ) {
        super(message);
        this.name = 'EVMError';
        this.category = category;
        this.severity = severity;
        this.recoverable = options?.recoverable ?? false;
        this.retryable = options?.retryable ?? false;
        this.context = options?.context;
        this.timestamp = new Date();
        
        if (options?.cause) {
            this.cause = options.cause;
        }

        // Maintain proper stack trace
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, EVMError);
        }
    }

    toJSON() {
        return {
            name: this.name,
            message: this.message,
            category: this.category,
            severity: this.severity,
            recoverable: this.recoverable,
            retryable: this.retryable,
            context: this.context,
            timestamp: this.timestamp,
            stack: this.stack
        };
    }
}

// Specific Error Classes
export class UserInputError extends EVMError {
    constructor(message: string, context?: Record<string, any>) {
        super(message, ErrorCategory.USER_ERROR, ErrorSeverity.LOW, {
            recoverable: true,
            retryable: false,
            context
        });
        this.name = 'UserInputError';
    }
}

export class NetworkError extends EVMError {
    constructor(message: string, context?: Record<string, any>) {
        super(message, ErrorCategory.NETWORK_ERROR, ErrorSeverity.MEDIUM, {
            recoverable: true,
            retryable: true,
            context
        });
        this.name = 'NetworkError';
    }
}

export class ContractError extends EVMError {
    constructor(message: string, context?: Record<string, any>) {
        super(message, ErrorCategory.CONTRACT_ERROR, ErrorSeverity.HIGH, {
            recoverable: false,
            retryable: false,
            context
        });
        this.name = 'ContractError';
    }
}

export class InsufficientFundsError extends EVMError {
    constructor(message: string, context?: Record<string, any>) {
        super(message, ErrorCategory.INSUFFICIENT_FUNDS, ErrorSeverity.MEDIUM, {
            recoverable: true,
            retryable: false,
            context
        });
        this.name = 'InsufficientFundsError';
    }
}

export class RateLimitError extends EVMError {
    constructor(message: string, retryAfter?: number) {
        super(message, ErrorCategory.RATE_LIMIT, ErrorSeverity.LOW, {
            recoverable: true,
            retryable: true,
            context: { retryAfter }
        });
        this.name = 'RateLimitError';
    }
}

// Error Parsing Utilities
export function parseEthersError(error: any): EVMError {
    const message = error.message || 'Unknown error';
    const code = error.code;
    const reason = error.reason;

    // Network errors
    if (code === 'NETWORK_ERROR' || code === 'SERVER_ERROR' || code === 'TIMEOUT') {
        return new NetworkError(`Network error: ${message}`, {
            code,
            reason,
            method: error.method,
            url: error.url
        });
    }

    // Insufficient funds
    if (code === 'INSUFFICIENT_FUNDS' || message.includes('insufficient funds')) {
        return new InsufficientFundsError('Insufficient funds for transaction', {
            code,
            transaction: error.transaction
        });
    }

    // Contract revert
    if (code === 'CALL_EXCEPTION' || code === 'UNPREDICTABLE_GAS_LIMIT') {
        return new ContractError(`Contract error: ${reason || message}`, {
            code,
            reason,
            method: error.method,
            data: error.data
        });
    }

    // Invalid argument
    if (code === 'INVALID_ARGUMENT') {
        return new UserInputError(`Invalid argument: ${message}`, {
            code,
            argument: error.argument,
            value: error.value
        });
    }

    // Rate limiting
    if (code === 429 || message.includes('rate limit')) {
        return new RateLimitError('Rate limit exceeded');
    }

    // Default
    return new EVMError(message, ErrorCategory.UNKNOWN, ErrorSeverity.MEDIUM, {
        retryable: false,
        context: { code, reason }
    });
}

// Retry Configuration
export interface RetryConfig {
    maxAttempts: number;
    baseDelay: number;
    maxDelay: number;
    backoffMultiplier: number;
    jitter: boolean;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
    jitter: true
};

// Retry Mechanism
export async function withRetry<T>(
    fn: () => Promise<T>,
    config: Partial<RetryConfig> = {}
): Promise<T> {
    const retryConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= retryConfig.maxAttempts; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error as Error;
            
            const evmError = error instanceof EVMError ? error : parseEthersError(error);
            
            if (!evmError.retryable || attempt === retryConfig.maxAttempts) {
                throw evmError;
            }

            const delay = calculateBackoff(attempt, retryConfig);
            logger.warn(`Retry attempt ${attempt}/${retryConfig.maxAttempts} after ${delay}ms`, {
                error: evmError.message,
                category: evmError.category
            });

            await sleep(delay);
        }
    }

    throw lastError;
}

function calculateBackoff(attempt: number, config: RetryConfig): number {
    let delay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1);
    delay = Math.min(delay, config.maxDelay);

    if (config.jitter) {
        // Add random jitter (±25%)
        const jitter = delay * 0.25 * (Math.random() * 2 - 1);
        delay += jitter;
    }

    return Math.floor(delay);
}

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Circuit Breaker
export class CircuitBreaker {
    private failures = 0;
    private lastFailureTime?: number;
    private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

    constructor(
        private readonly name: string,
        private readonly threshold: number = 5,
        private readonly timeout: number = 60000, // 1 minute
        private readonly resetTimeout: number = 300000 // 5 minutes
    ) {}

    async execute<T>(fn: () => Promise<T>): Promise<T> {
        if (this.state === 'OPEN') {
            const now = Date.now();
            if (this.lastFailureTime && now - this.lastFailureTime > this.timeout) {
                this.state = 'HALF_OPEN';
                logger.info(`Circuit breaker ${this.name} entering HALF_OPEN state`);
            } else {
                throw new EVMError(
                    `Circuit breaker ${this.name} is OPEN`,
                    ErrorCategory.NETWORK_ERROR,
                    ErrorSeverity.HIGH,
                    { retryable: false }
                );
            }
        }

        try {
            const result = await fn();
            
            if (this.state === 'HALF_OPEN') {
                this.reset();
            }
            
            return result;
        } catch (error) {
            this.recordFailure();
            throw error;
        }
    }

    private recordFailure() {
        this.failures++;
        this.lastFailureTime = Date.now();

        if (this.failures >= this.threshold) {
            this.state = 'OPEN';
            logger.error(`Circuit breaker ${this.name} opened after ${this.failures} failures`);
        }
    }

    private reset() {
        this.failures = 0;
        this.lastFailureTime = undefined;
        this.state = 'CLOSED';
        logger.info(`Circuit breaker ${this.name} reset to CLOSED state`);
    }

    getState() {
        return {
            name: this.name,
            state: this.state,
            failures: this.failures,
            lastFailureTime: this.lastFailureTime
        };
    }
}

// Error Recovery Suggestions
export function getRecoverySuggestions(error: EVMError): string[] {
    const suggestions: string[] = [];

    switch (error.category) {
        case ErrorCategory.INSUFFICIENT_FUNDS:
            suggestions.push(
                'Check your wallet balance',
                'Ensure you have enough ETH for gas fees',
                'Try reducing the transaction amount',
                'Bridge funds from another chain if needed'
            );
            break;

        case ErrorCategory.NETWORK_ERROR:
            suggestions.push(
                'Check your internet connection',
                'Try again in a few moments',
                'Switch to a different RPC endpoint',
                'Check if the blockchain is congested'
            );
            break;

        case ErrorCategory.CONTRACT_ERROR:
            suggestions.push(
                'Verify the contract address is correct',
                'Check if you have the necessary approvals',
                'Ensure the contract method exists',
                'Review the transaction parameters'
            );
            break;

        case ErrorCategory.USER_ERROR:
            suggestions.push(
                'Double-check all input values',
                'Ensure addresses are valid',
                'Verify token amounts and decimals',
                'Check if you\'re using the correct chain'
            );
            break;

        case ErrorCategory.RATE_LIMIT:
            const retryAfter = error.context?.retryAfter;
            if (retryAfter) {
                suggestions.push(`Wait ${retryAfter} seconds before retrying`);
            } else {
                suggestions.push('Wait a few minutes before retrying');
            }
            suggestions.push('Consider using a different RPC endpoint');
            break;

        case ErrorCategory.TIMEOUT:
            suggestions.push(
                'Try again with a higher gas price',
                'Check if the network is congested',
                'Consider using a different RPC endpoint'
            );
            break;

        default:
            suggestions.push(
                'Try again in a few moments',
                'Check the transaction details',
                'Contact support if the issue persists'
            );
    }

    return suggestions;
}

// Global Error Handler
export class ErrorHandler {
    private readonly circuitBreakers = new Map<string, CircuitBreaker>();
    private readonly errorLog: EVMError[] = [];
    private readonly maxLogSize = 1000;

    constructor(private readonly runtime: IAgentRuntime) {}

    async handle(error: any, context?: Record<string, any>): Promise<void> {
        let evmError = error instanceof EVMError ? error : parseEthersError(error);
        
        // Add context by creating new error with merged context
        if (context) {
            const mergedContext = { ...evmError.context, ...context };
            evmError = new EVMError(
                evmError.message,
                evmError.category,
                evmError.severity,
                {
                    recoverable: evmError.recoverable,
                    retryable: evmError.retryable,
                    context: mergedContext,
                    cause: evmError.cause as Error
                }
            );
        }

        // Log error
        this.logError(evmError);

        // Get recovery suggestions
        const suggestions = getRecoverySuggestions(evmError);

        // Log based on severity
        switch (evmError.severity) {
            case ErrorSeverity.CRITICAL:
                logger.error('Critical error occurred', {
                    error: evmError.toJSON(),
                    suggestions
                });
                // Could trigger alerts here
                break;

            case ErrorSeverity.HIGH:
                logger.error('High severity error', {
                    error: evmError.toJSON(),
                    suggestions
                });
                break;

            case ErrorSeverity.MEDIUM:
                logger.warn('Medium severity error', {
                    error: evmError.toJSON(),
                    suggestions
                });
                break;

            case ErrorSeverity.LOW:
                logger.info('Low severity error', {
                    error: evmError.toJSON(),
                    suggestions
                });
                break;
        }

        // Store critical errors for future analysis
        if (evmError.severity >= ErrorSeverity.HIGH) {
            // In production, could store critical errors in database
            // or send alerts to monitoring service
        }
    }

    private logError(error: EVMError) {
        this.errorLog.push(error);
        
        // Maintain log size
        if (this.errorLog.length > this.maxLogSize) {
            this.errorLog.shift();
        }
    }

    getCircuitBreaker(name: string, config?: {
        threshold?: number;
        timeout?: number;
        resetTimeout?: number;
    }): CircuitBreaker {
        if (!this.circuitBreakers.has(name)) {
            this.circuitBreakers.set(name, new CircuitBreaker(
                name,
                config?.threshold,
                config?.timeout,
                config?.resetTimeout
            ));
        }
        return this.circuitBreakers.get(name)!;
    }

    getErrorStats(since?: Date): {
        total: number;
        byCategory: Record<ErrorCategory, number>;
        bySeverity: Record<ErrorSeverity, number>;
        recentErrors: EVMError[];
    } {
        const errors = since 
            ? this.errorLog.filter(e => e.timestamp >= since)
            : this.errorLog;

        const byCategory = errors.reduce((acc, error) => {
            acc[error.category] = (acc[error.category] || 0) + 1;
            return acc;
        }, {} as Record<ErrorCategory, number>);

        const bySeverity = errors.reduce((acc, error) => {
            acc[error.severity] = (acc[error.severity] || 0) + 1;
            return acc;
        }, {} as Record<ErrorSeverity, number>);

        return {
            total: errors.length,
            byCategory,
            bySeverity,
            recentErrors: errors.slice(-10)
        };
    }

    clearErrorLog() {
        this.errorLog.length = 0;
    }
}

// Export factory function
export function createErrorHandler(runtime: IAgentRuntime): ErrorHandler {
    return new ErrorHandler(runtime);
} 