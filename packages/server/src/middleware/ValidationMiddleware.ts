/**
 * Comprehensive input validation middleware for ElizaOS server
 *
 * This middleware provides robust input validation to prevent injection attacks,
 * XSS, and other security vulnerabilities.
 */

import { Request, Response, NextFunction } from 'express';
import { logger, ElizaError, ErrorCategory, ErrorSeverity } from '@elizaos/core';
import { sendElizaError } from '../api/shared/responseUtils.js';

// Validation schema interface with improved type safety
interface ValidationSchema {
  type: 'string' | 'object' | 'array' | 'number' | 'boolean';
  required?: boolean;
  properties?: Record<string, ValidationSchema>;
  pattern?: RegExp;
  maxLength?: number;
  minLength?: number;
  minimum?: number;
  maximum?: number;
  items?: ValidationSchema;
  custom?: (value: unknown) => boolean;
}

// Validation result interface
interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

// Validation error interface
interface ValidationError {
  field: string;
  message: string;
  value?: unknown;
}

// Validation error creator
function createValidationError(message: string): ElizaError {
  return new ElizaError(message, ErrorCategory.VALIDATION_ERROR, ErrorSeverity.MEDIUM, {
    recoverable: true,
    retryable: false,
  });
}

// Type-safe validator implementation
class RequestValidator {
  validate(data: unknown, schema: ValidationSchema, field: string): ValidationResult {
    const errors: ValidationError[] = [];

    // Check required fields
    if (schema.required && (data === undefined || data === null)) {
      errors.push({ field, message: `${field} is required`, value: data });
      return { valid: false, errors };
    }

    // Skip validation for optional undefined/null values
    if (data === undefined || data === null) {
      return { valid: true, errors: [] };
    }

    // Type validation
    if (!this.validateType(data, schema.type)) {
      errors.push({
        field,
        message: `${field} must be of type ${schema.type}`,
        value: data,
      });
      return { valid: false, errors };
    }

    // String-specific validation
    if (schema.type === 'string' && typeof data === 'string') {
      if (schema.pattern && !schema.pattern.test(data)) {
        errors.push({ field, message: `${field} format is invalid`, value: data });
      }
      if (schema.maxLength && data.length > schema.maxLength) {
        errors.push({
          field,
          message: `${field} exceeds maximum length of ${schema.maxLength}`,
          value: data,
        });
      }
      if (schema.minLength && data.length < schema.minLength) {
        errors.push({
          field,
          message: `${field} must be at least ${schema.minLength} characters`,
          value: data,
        });
      }
    }

    // Number-specific validation
    if (schema.type === 'number' && typeof data === 'number') {
      if (schema.minimum !== undefined && data < schema.minimum) {
        errors.push({
          field,
          message: `${field} must be at least ${schema.minimum}`,
          value: data,
        });
      }
      if (schema.maximum !== undefined && data > schema.maximum) {
        errors.push({
          field,
          message: `${field} must not exceed ${schema.maximum}`,
          value: data,
        });
      }
    }

    // Object property validation
    if (
      schema.type === 'object' &&
      typeof data === 'object' &&
      data !== null &&
      schema.properties
    ) {
      const objectData = data as Record<string, unknown>;
      for (const [propName, propSchema] of Object.entries(schema.properties)) {
        const propResult = this.validate(objectData[propName], propSchema, `${field}.${propName}`);
        errors.push(...propResult.errors);
      }
    }

    // Array validation
    if (schema.type === 'array' && Array.isArray(data) && schema.items) {
      data.forEach((item, index) => {
        const itemResult = this.validate(item, schema.items!, `${field}[${index}]`);
        errors.push(...itemResult.errors);
      });
    }

    // Custom validation
    if (schema.custom && !schema.custom(data)) {
      errors.push({ field, message: `${field} custom validation failed`, value: data });
    }

    return { valid: errors.length === 0, errors };
  }

  private validateType(data: unknown, expectedType: ValidationSchema['type']): boolean {
    switch (expectedType) {
      case 'string':
        return typeof data === 'string';
      case 'number':
        return typeof data === 'number';
      case 'boolean':
        return typeof data === 'boolean';
      case 'object':
        return typeof data === 'object' && data !== null && !Array.isArray(data);
      case 'array':
        return Array.isArray(data);
      default:
        return false;
    }
  }
}

const validator = new RequestValidator();

/**
 * Validation middleware factory
 */
// Request validation schemas interface
interface RequestValidationSchemas {
  body?: ValidationSchema;
  query?: ValidationSchema;
  params?: ValidationSchema;
  headers?: ValidationSchema;
}

export function validateRequest(schemas: RequestValidationSchemas) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate request body
      if (schemas.body && req.body) {
        const bodyResult = validator.validate(req.body, schemas.body, 'body');
        if (!bodyResult.valid) {
          const error = createValidationError(
            `Request body validation failed: ${bodyResult.errors.map((e) => e.message).join(', ')}`
          );
          return sendElizaError(res, error);
        }
      }

      // Validate query parameters
      if (schemas.query && req.query) {
        const queryResult = validator.validate(req.query, schemas.query, 'query');
        if (!queryResult.valid) {
          const error = createValidationError(
            `Query parameters validation failed: ${queryResult.errors.map((e) => e.message).join(', ')}`
          );
          return sendElizaError(res, error);
        }
      }

      // Validate path parameters
      if (schemas.params && req.params) {
        const paramsResult = validator.validate(req.params, schemas.params, 'params');
        if (!paramsResult.valid) {
          const error = createValidationError(
            `Path parameters validation failed: ${paramsResult.errors.map((e) => e.message).join(', ')}`
          );
          return sendElizaError(res, error);
        }
      }

      // Validate headers
      if (schemas.headers && req.headers) {
        const headersResult = validator.validate(req.headers, schemas.headers, 'headers');
        if (!headersResult.valid) {
          const error = createValidationError(
            `Headers validation failed: ${headersResult.errors.map((e) => e.message).join(', ')}`
          );
          return sendElizaError(res, error);
        }
      }

      next();
    } catch (error) {
      logger.error('Validation middleware error:', error);
      const validationError = createValidationError('Request validation failed');
      sendElizaError(res, validationError);
    }
  };
}

/**
 * Security validation middleware to prevent common attacks
 */
export function securityValidation(req: Request, res: Response, next: NextFunction) {
  try {
    // Check for SQL injection patterns
    const sqlInjectionPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|DECLARE)\b)/i,
      /('|('')|;|--|\/\*|\*\/|\b(OR|AND)\b.*=.*)/i,
      /(script|javascript|vbscript|onload|onerror|onclick)/i,
    ];

    // Check for XSS patterns
    const xssPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
      /javascript:/gi,
      /vbscript:/gi,
      /on\w+\s*=/gi,
    ];

    // Check for path traversal
    const pathTraversalPatterns = [
      /\.\.[\/\\]/,
      /[\/\\]\.\.[\/\\]/,
      /%2e%2e[\/\\]/gi,
      /%252e%252e[\/\\]/gi,
    ];

    const checkPatterns = (value: string, patterns: RegExp[], type: string): boolean => {
      for (const pattern of patterns) {
        if (pattern.test(value)) {
          logger.warn(`Potential ${type} attack detected`, {
            pattern: pattern.toString(),
            value: value.substring(0, 100),
            ip: req.ip,
            userAgent: req.get('user-agent'),
          });
          return true;
        }
      }
      return false;
    };

    const validateObject = (obj: unknown, path = ''): boolean => {
      if (typeof obj === 'string') {
        if (
          checkPatterns(obj, sqlInjectionPatterns, 'SQL injection') ||
          checkPatterns(obj, xssPatterns, 'XSS') ||
          checkPatterns(obj, pathTraversalPatterns, 'path traversal')
        ) {
          return true;
        }
      } else if (Array.isArray(obj)) {
        for (let i = 0; i < obj.length; i++) {
          if (validateObject(obj[i], `${path}[${i}]`)) {
            return true;
          }
        }
      } else if (typeof obj === 'object' && obj !== null) {
        for (const [key, value] of Object.entries(obj)) {
          if (validateObject(value, `${path}.${key}`)) {
            return true;
          }
        }
      }
      return false;
    };

    // Validate request components
    if (
      validateObject(req.body, 'body') ||
      validateObject(req.query, 'query') ||
      validateObject(req.params, 'params')
    ) {
      const error = createValidationError('Request contains potentially malicious content');
      return sendElizaError(res, error);
    }

    next();
  } catch (error) {
    logger.error('Security validation error:', error);
    const validationError = createValidationError('Security validation failed');
    sendElizaError(res, validationError);
  }
}

/**
 * Rate limiting validation middleware
 */
export function rateLimitValidation(
  windowMs: number = 15 * 60 * 1000, // 15 minutes
  maxRequests: number = 100
) {
  const requestCounts = new Map<string, { count: number; resetTime: number }>();

  return (req: Request, res: Response, next: NextFunction) => {
    const clientKey = req.ip || 'unknown';
    const now = Date.now();

    const clientData = requestCounts.get(clientKey);

    if (!clientData || now > clientData.resetTime) {
      // Reset or initialize counter
      requestCounts.set(clientKey, {
        count: 1,
        resetTime: now + windowMs,
      });
      return next();
    }

    if (clientData.count >= maxRequests) {
      logger.warn('Rate limit exceeded', {
        ip: req.ip,
        userAgent: req.get('user-agent'),
        count: clientData.count,
        maxRequests,
      });

      const error = createValidationError('Rate limit exceeded. Please try again later.');
      return sendElizaError(res, error);
    }

    // Increment counter
    clientData.count++;
    next();
  };
}

/**
 * Content-Length validation middleware
 */
export function contentLengthValidation(maxSizeBytes: number = 1024 * 1024) {
  // 1MB default
  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = parseInt(req.get('content-length') || '0', 10);

    if (contentLength > maxSizeBytes) {
      logger.warn('Request too large', {
        contentLength,
        maxSizeBytes,
        ip: req.ip,
      });

      const error = createValidationError(`Request too large. Maximum size: ${maxSizeBytes} bytes`);
      return sendElizaError(res, error);
    }

    next();
  };
}

/**
 * Common validation schemas
 */
export const CommonSchemas = {
  UUID: {
    type: 'string' as const,
    required: true,
    pattern: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  },

  AgentId: {
    type: 'object' as const,
    required: true,
    properties: {
      agentId: {
        type: 'string' as const,
        required: true,
        pattern: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      },
    },
  },

  PaginationQuery: {
    type: 'object' as const,
    required: false,
    properties: {
      page: {
        type: 'string' as const,
        required: false,
        custom: (value: unknown) => {
          if (typeof value !== 'string') {
            return true;
          }
          const num = parseInt(value, 10);
          return !isNaN(num) && num > 0;
        },
      },
      limit: {
        type: 'string' as const,
        required: false,
        custom: (value: unknown) => {
          if (typeof value !== 'string') {
            return true;
          }
          const num = parseInt(value, 10);
          return !isNaN(num) && num > 0 && num <= 100;
        },
      },
    },
  },

  MessageContent: {
    type: 'object' as const,
    required: true,
    properties: {
      text: { type: 'string' as const, required: false, maxLength: 10000 },
      thought: { type: 'string' as const, required: false, maxLength: 5000 },
      source: { type: 'string' as const, required: false, maxLength: 100 },
    },
  },
} as const;

/**
 * Sanitization middleware
 */
export function sanitizeInput(req: Request, _res: Response, next: NextFunction) {
  const sanitizeString = (str: string): string => {
    return str
      .replace(/[<>\"']/g, '') // Remove potentially dangerous characters
      .replace(/javascript:/gi, '') // Remove javascript protocols
      .replace(/vbscript:/gi, '') // Remove vbscript protocols
      .trim();
  };

  const sanitizeObject = (obj: unknown): unknown => {
    if (typeof obj === 'string') {
      return sanitizeString(obj);
    } else if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    } else if (typeof obj === 'object' && obj !== null) {
      const sanitized: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = sanitizeObject(value);
      }
      return sanitized;
    }
    return obj;
  };

  // Sanitize request data with proper type handling
  if (req.body) {
    req.body = sanitizeObject(req.body) as typeof req.body;
  }

  if (req.query) {
    req.query = sanitizeObject(req.query) as typeof req.query;
  }

  next();
}
