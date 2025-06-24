/**
 * Basic Tests for Training Error Handling System
 *
 * Tests core functionality without complex timing scenarios
 */

import { describe, it, expect, vi, beforeEach } from 'bun:test';
import {
  TrainingError,
  ConfigurationError,
  MissingConfigurationError,
  InvalidConfigurationError,
  NetworkError,
  APIError,
  AuthenticationError,
  ValidationError,
  ErrorHandler,
  ErrorCategory,
  safely,
} from '../../errors/training-errors.js';

describe('Training Error Handling System - Basic Tests', () => {
  beforeEach(() => {
    ErrorHandler.resetRetryHistory();
    ErrorHandler.setMaxRetries(3);
  });

  describe('Error Type Creation', () => {
    it('should create MissingConfigurationError correctly', () => {
      const error = new MissingConfigurationError('API_KEY');

      expect(error).toBeInstanceOf(TrainingError);
      expect(error).toBeInstanceOf(ConfigurationError);
      expect(error.code).toBe('MISSING_CONFIGURATION');
      expect(error.category).toBe(ErrorCategory.CONFIGURATION);
      expect(error.retryable).toBe(false);
      expect(error.message).toContain('API_KEY');
      expect(error.getUserMessage()).toContain('API_KEY');
    });

    it('should create NetworkError with retry settings', () => {
      const error = new NetworkError('Connection failed', 'https://api.example.com', 500);

      expect(error.code).toBe('NETWORK_ERROR');
      expect(error.category).toBe(ErrorCategory.NETWORK);
      expect(error.retryable).toBe(true);
      expect(error.retryAfter).toBe(5000); // 5 seconds for 500 errors
      expect(error.context.url).toBe('https://api.example.com');
      expect(error.context.statusCode).toBe(500);
    });

    it('should create APIError with service context', () => {
      const error = new APIError('GitHub', 'Rate limit exceeded', 429);

      expect(error.code).toBe('API_ERROR');
      expect(error.category).toBe(ErrorCategory.NETWORK);
      expect(error.message).toContain('GitHub');
      expect(error.message).toContain('Rate limit exceeded');
      expect(error.context.service).toBe('GitHub');
    });

    it('should create ValidationError for data validation', () => {
      const error = new ValidationError('email', 'invalid-email', 'must be valid email format');

      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.category).toBe(ErrorCategory.VALIDATION);
      expect(error.retryable).toBe(false);
      expect(error.context.field).toBe('email');
      expect(error.context.rule).toBe('must be valid email format');
    });
  });

  describe('Error Normalization', () => {
    it('should normalize generic Error to ProcessingError by default', () => {
      const genericError = new Error('Something went wrong');
      const normalized = ErrorHandler.normalizeError(genericError, 'test_operation');

      expect(normalized.code).toBe('PROCESSING_ERROR');
      expect(normalized.category).toBe(ErrorCategory.PROCESSING);
      expect(normalized.message).toContain('Something went wrong');
    });

    it('should normalize fetch errors to NetworkError', () => {
      const fetchError = new Error('fetch failed: network timeout');
      const normalized = ErrorHandler.normalizeError(fetchError, 'api_call', {
        url: 'https://api.example.com',
      });

      expect(normalized.code).toBe('NETWORK_ERROR');
      expect(normalized.category).toBe(ErrorCategory.NETWORK);
      expect(normalized.context.url).toBe('https://api.example.com');
    });

    it('should normalize authentication errors correctly', () => {
      const authError = new Error('Bad credentials provided');
      const normalized = ErrorHandler.normalizeError(authError, 'api_call', { service: 'GitHub' });

      expect(normalized.code).toBe('AUTHENTICATION_ERROR');
      expect(normalized.category).toBe(ErrorCategory.AUTHENTICATION);
      expect(normalized.context.service).toBe('GitHub');
    });

    it('should keep existing TrainingError instances unchanged', () => {
      const originalError = new ConfigurationError('Test error', 'TEST_KEY');
      const normalized = ErrorHandler.normalizeError(originalError, 'test');

      expect(normalized).toBe(originalError);
      expect(normalized.code).toBe('CONFIGURATION_ERROR');
    });
  });

  describe('Configuration Validation', () => {
    it('should validate complete configuration successfully', () => {
      const config = {
        API_KEY: 'test-key',
        DATABASE_URL: 'postgres://localhost:5432/test',
        TIMEOUT: '30000',
      };

      expect(() => {
        ErrorHandler.validateConfiguration(config, ['API_KEY', 'DATABASE_URL']);
      }).not.toThrow();
    });

    it('should throw for missing required configuration', () => {
      const config = {
        API_KEY: 'test-key',
      };

      expect(() => {
        ErrorHandler.validateConfiguration(config, ['API_KEY', 'MISSING_KEY']);
      }).toThrow(MissingConfigurationError);
    });

    it('should validate URL formats', () => {
      expect(() => {
        ErrorHandler.validateURL('https://api.example.com', 'API_URL');
      }).not.toThrow();

      expect(() => {
        ErrorHandler.validateURL('not-a-url', 'API_URL');
      }).toThrow(InvalidConfigurationError);
    });

    it('should validate numeric ranges', () => {
      expect(() => {
        ErrorHandler.validateNumericRange(50, 0, 100, 'PERCENTAGE');
      }).not.toThrow();

      expect(() => {
        ErrorHandler.validateNumericRange(150, 0, 100, 'PERCENTAGE');
      }).toThrow(InvalidConfigurationError);

      expect(() => {
        ErrorHandler.validateNumericRange(-10, 0, 100, 'PERCENTAGE');
      }).toThrow(InvalidConfigurationError);
    });
  });

  describe('safely Wrapper Function', () => {
    it('should return result on successful operation', async () => {
      const result = await safely(async () => 'success', 'safe_success_test');

      expect(result).toBe('success');
    });

    it('should return null on failed operation without throwing', async () => {
      const result = await safely(async () => {
        throw new Error('Operation failed');
      }, 'safe_failure_test');

      expect(result).toBeNull();
    });

    it('should handle various error types gracefully', async () => {
      const errors = [
        new ConfigurationError('Config error'),
        new NetworkError('Network error'),
        new ValidationError('field', 'value', 'rule'),
        new Error('Generic error'),
      ];

      for (const error of errors) {
        const result = await safely(async () => {
          throw error;
        }, 'safe_error_test');

        expect(result).toBeNull();
      }
    });
  });

  describe('Error Context and Logging', () => {
    it('should provide comprehensive log context', () => {
      const error = new NetworkError('Connection failed', 'https://api.example.com', 500, {
        attempt: 2,
        timeout: 5000,
        userAgent: 'ElizaOS',
      });

      const logContext = error.toLogContext();

      expect(logContext).toEqual({
        code: 'NETWORK_ERROR',
        category: 'network',
        message: 'Connection failed',
        retryable: true,
        retryAfter: 5000,
        timestamp: expect.any(String),
        context: {
          url: 'https://api.example.com',
          statusCode: 500,
          attempt: 2,
          timeout: 5000,
          userAgent: 'ElizaOS',
        },
      });

      // Verify timestamp is valid ISO string
      expect(new Date(logContext.timestamp).toISOString()).toBe(logContext.timestamp);
    });

    it('should provide user-friendly error messages', () => {
      const errors = [
        new MissingConfigurationError('API_KEY'),
        new AuthenticationError('GitHub', 'Invalid token'),
        new ValidationError('email', 'bad-email', 'must be valid email'),
      ];

      errors.forEach((error) => {
        const userMessage = error.getUserMessage();
        expect(userMessage).toBeTruthy();
        expect(userMessage.length).toBeGreaterThan(10); // Should be descriptive
        expect(userMessage).not.toContain('Error:'); // Should be user-friendly
        expect(userMessage).not.toContain('undefined');
        expect(userMessage).not.toContain('null');
      });
    });
  });

  describe('Real-world Error Scenario Simulation', () => {
    it('should categorize common API errors correctly', () => {
      const scenarios = [
        {
          input: new Error('fetch failed: connection timeout'),
          context: { url: 'https://api.github.com' },
          expectedType: NetworkError,
          expectedRetryable: true,
        },
        {
          input: new Error('401 Unauthorized: Bad credentials'),
          context: { service: 'GitHub' },
          expectedType: AuthenticationError,
          expectedRetryable: false,
        },
        {
          input: new Error('File not found: /path/to/file.txt'),
          context: { resourceType: 'file', identifier: '/path/to/file.txt' },
          expectedType: 'RESOURCE_NOT_FOUND', // Check the actual error code
          expectedRetryable: false,
        },
      ];

      scenarios.forEach(({ input, context, expectedType, expectedRetryable }) => {
        const normalized = ErrorHandler.normalizeError(input, 'test_operation', context);

        if (typeof expectedType === 'string') {
          expect(normalized.code).toBe(expectedType);
        } else {
          expect(normalized).toBeInstanceOf(expectedType);
        }

        expect(normalized.retryable).toBe(expectedRetryable);
      });
    });

    it('should handle edge cases in error messages', () => {
      const edgeCases = [
        { message: '', expectedCode: 'PROCESSING_ERROR' },
        { message: 'Network error with timeout issue', expectedCode: 'NETWORK_ERROR' },
        { message: 'Authentication failed with bad api key', expectedCode: 'AUTHENTICATION_ERROR' },
        { message: 'Too many requests - rate limit exceeded', expectedCode: 'RATE_LIMIT_ERROR' },
      ];

      edgeCases.forEach(({ message, expectedCode }) => {
        const error = new Error(message);
        const normalized = ErrorHandler.normalizeError(error, 'edge_case_test');

        expect(normalized.code).toBe(expectedCode);
      });
    });
  });

  describe('Error State Management', () => {
    it('should maintain error context through transformations', () => {
      const originalContext = {
        operation: 'file_read',
        fileName: 'test.txt',
        lineNumber: 42,
        userId: 'user123',
      };

      const error = new ValidationError(
        'content',
        'invalid',
        'file content validation failed',
        originalContext
      );

      expect(error.context).toEqual({
        field: 'content',
        value: 'invalid',
        rule: 'file content validation failed',
        ...originalContext,
      });

      const logContext = error.toLogContext();
      expect(logContext.context).toEqual(error.context);
    });

    it('should handle concurrent error scenarios', () => {
      // Simulate multiple errors happening simultaneously
      const errors = Array.from(
        { length: 5 },
        (_, i) => new NetworkError(`Connection ${i} failed`, `https://api${i}.example.com`, 500)
      );

      errors.forEach((error, index) => {
        expect(error.context.url).toBe(`https://api${index}.example.com`);
        expect(error.timestamp).toBeTypeOf('number');
        expect(error.retryable).toBe(true);
      });

      // Verify each error maintains its own context
      const contexts = errors.map((e) => e.context);
      const uniqueUrls = new Set(contexts.map((c) => c.url));
      expect(uniqueUrls.size).toBe(5); // All unique
    });
  });
});
