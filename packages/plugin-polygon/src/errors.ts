/**
 * Custom error classes for the Polygon plugin
 * These provide more specific error handling and better error messages for users
 */

/**
 * Base error class for RPC-related errors
 * Used for errors communicating with Ethereum or Polygon RPC endpoints
 */
export class PolygonRpcError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = 'PolygonRpcError';
  }
}

/**
 * Error class for input validation failures
 * Used when user inputs or configuration are invalid
 */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Error class for transaction failures
 * Used when a blockchain transaction fails or reverts
 */
export class TransactionError extends Error {
  constructor(
    message: string,
    public readonly txHash?: string
  ) {
    super(message);
    this.name = 'TransactionError';
  }
}

/**
 * Error class for contract-related errors
 * Used for errors interacting with smart contracts
 */
export class ContractError extends Error {
  constructor(
    message: string,
    public readonly contractAddress?: string,
    public readonly functionName?: string
  ) {
    super(message);
    this.name = 'ContractError';
  }
}

/**
 * Error class for provider initialization errors
 * Used when providers fail to initialize
 */
export class ProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProviderError';
  }
}

/**
 * Error class for service initialization errors
 * Used when services fail to initialize
 */
export class ServiceError extends Error {
  constructor(
    message: string,
    public readonly serviceName?: string
  ) {
    super(message);
    this.name = 'ServiceError';
  }
}

/**
 * Helper function to format error messages consistently
 */
export function formatErrorMessage(action: string, message: string, details?: string): string {
  let formattedMessage = `${action} failed: ${message}`;
  if (details) {
    formattedMessage += `. Details: ${details}`;
  }
  return formattedMessage;
}

/**
 * Helper function to parse error objects from different sources
 * Attempts to extract the most useful error message from various error formats
 */
export function parseErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  if (typeof error === 'object' && error !== null) {
    // Try to handle common error shapes
    if ('message' in error && typeof error.message === 'string') {
      return error.message;
    }

    if ('reason' in error && typeof error.reason === 'string') {
      return error.reason;
    }

    if ('error' in error && typeof error.error === 'object' && error.error !== null) {
      if ('message' in error.error && typeof error.error.message === 'string') {
        return error.error.message;
      }
    }

    return JSON.stringify(error);
  }

  return 'Unknown error';
}
