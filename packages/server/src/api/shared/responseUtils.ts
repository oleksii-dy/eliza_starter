import express from 'express';
import { ElizaError, ErrorCategory, isElizaError } from '@elizaos/core';

/**
 * Sends a standardized error response using ElizaError
 */
export const sendError = (
  res: express.Response,
  status: number,
  code: string,
  message: string,
  details?: unknown
) => {
  res.status(status).json({
    success: false,
    error: {
      code,
      message,
      timestamp: new Date().toISOString(),
      ...(details ? { details } : {}),
    },
  });
};

/**
 * Sends an error response from an ElizaError instance
 */
export const sendElizaError = (res: express.Response, error: ElizaError) => {
  const statusCode = getHttpStatusFromError(error);

  res.status(statusCode).json({
    success: false,
    error: {
      code: error.errorCode,
      message: error.getUserMessage(),
      category: error.category,
      severity: error.severity,
      timestamp: new Date().toISOString(),
      recoverable: error.recoverable,
      retryable: error.retryable,
      recoveryActions: error.recoveryActions,
    },
  });
};

/**
 * Sends an error response from any error type
 */
export const sendErrorFromException = (
  res: express.Response,
  error: unknown,
  defaultMessage = 'An unexpected error occurred'
) => {
  if (isElizaError(error)) {
    sendElizaError(res, error);
    return;
  }

  if (error instanceof Error) {
    sendError(res, 500, 'INTERNAL_ERROR', error.message);
    return;
  }

  sendError(res, 500, 'INTERNAL_ERROR', defaultMessage);
};

/**
 * Maps ElizaError categories to HTTP status codes
 */
function getHttpStatusFromError(error: ElizaError): number {
  switch (error.category) {
    case ErrorCategory.VALIDATION_ERROR:
    case ErrorCategory.INVALID_INPUT:
      return 400;
    case ErrorCategory.PERMISSION_DENIED:
      return 403;
    case ErrorCategory.RESOURCE_NOT_FOUND:
      return 404;
    case ErrorCategory.RATE_LIMIT_EXCEEDED:
      return 429;
    case ErrorCategory.DATABASE_ERROR:
    case ErrorCategory.SERVICE_ERROR:
    case ErrorCategory.MODEL_ERROR:
    case ErrorCategory.PLUGIN_ERROR:
      return 503;
    case ErrorCategory.TIMEOUT_ERROR:
      return 504;
    case ErrorCategory.CONFIGURATION_ERROR:
    case ErrorCategory.DEPENDENCY_ERROR:
    case ErrorCategory.RESOURCE_EXHAUSTION:
    case ErrorCategory.INTERNAL_ERROR:
    case ErrorCategory.NOT_IMPLEMENTED:
    default:
      return 500;
  }
}

/**
 * Sends a standardized success response with proper typing
 */
export const sendSuccess = <T>(
  res: express.Response,
  data: T,
  status = 200,
  metadata?: Record<string, unknown>
) => {
  res.status(status).json({
    success: true,
    data,
    metadata: {
      timestamp: new Date().toISOString(),
      ...metadata,
    },
  });
};

/**
 * Sends a paginated response
 */
export const sendPaginatedResponse = <T>(
  res: express.Response,
  data: T[],
  pagination: {
    page: number;
    limit: number;
    total: number;
  }
) => {
  const totalPages = Math.ceil(pagination.total / pagination.limit);

  res.status(200).json({
    success: true,
    data,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages,
      hasNext: pagination.page < totalPages,
      hasPrev: pagination.page > 1,
    },
    metadata: {
      timestamp: new Date().toISOString(),
    },
  });
};
