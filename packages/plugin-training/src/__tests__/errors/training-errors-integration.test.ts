/**
 * Integration Tests for Training Error Handling System
 * 
 * Tests the comprehensive error handling system with real scenarios
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  TrainingError,
  ConfigurationError,
  MissingConfigurationError,
  InvalidConfigurationError,
  NetworkError,
  APIError,
  RateLimitError,
  AuthenticationError,
  ValidationError,
  DataValidationError,
  ResourceError,
  ResourceNotFoundError,
  ResourceExhaustedError,
  ProcessingError,
  DataProcessingError,
  ExternalServiceError,
  ServiceUnavailableError,
  DatabaseError,
  DatabaseConnectionError,
  FileSystemError,
  FileNotFoundError,
  PermissionError,
  RuntimeError,
  ErrorHandler,
  ErrorCategory,
  withErrorHandling,
  withRetry,
  safely,
} from '../../errors/training-errors.js';

describe('Training Error Handling System Integration', () => {
  beforeEach(() => {
    ErrorHandler.resetRetryHistory();
    ErrorHandler.setMaxRetries(3);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Error Type Classification', () => {
    it('should create configuration errors with proper categorization', () => {
      const error = new MissingConfigurationError('API_KEY');
      
      expect(error).toBeInstanceOf(TrainingError);
      expect(error).toBeInstanceOf(ConfigurationError);
      expect(error.code).toBe('MISSING_CONFIGURATION');
      expect(error.category).toBe(ErrorCategory.CONFIGURATION);
      expect(error.retryable).toBe(false);
      expect(error.message).toContain('API_KEY');
      expect(error.getUserMessage()).toContain('API_KEY');
    });

    it('should create network errors with retry logic', () => {
      const error = new NetworkError('Connection timeout', 'https://api.example.com', 500);
      
      expect(error.code).toBe('NETWORK_ERROR');
      expect(error.category).toBe(ErrorCategory.NETWORK);
      expect(error.retryable).toBe(true);
      expect(error.retryAfter).toBe(5000); // 5 seconds for 500 errors
    });

    it('should create rate limit errors with proper wait times', () => {
      const resetTime = Date.now() + 60000; // 1 minute from now
      const error = new RateLimitError('GitHub API', resetTime);
      
      expect(error.code).toBe('RATE_LIMIT_ERROR');
      expect(error.retryable).toBe(true);
      expect(error.retryAfter).toBeGreaterThan(50000); // Close to 1 minute
      expect(error.getUserMessage()).toContain('minute');
    });

    it('should create validation errors for data integrity', () => {
      const issues = ['missing required field', 'invalid format'];
      const error = new DataValidationError('training_data', issues);
      
      expect(error.code).toBe('DATA_VALIDATION_ERROR');
      expect(error.category).toBe(ErrorCategory.VALIDATION);
      expect(error.retryable).toBe(false);
      expect(error.message).toContain('training_data');
      expect(error.message).toContain('missing required field');
    });
  });

  describe('Error Normalization', () => {
    it('should normalize fetch errors to NetworkError', () => {
      const fetchError = new Error('fetch failed');
      const normalized = ErrorHandler.normalizeError(
        fetchError,
        'api_call',
        { url: 'https://api.example.com', statusCode: 500 }
      );
      
      expect(normalized).toBeInstanceOf(NetworkError);
      expect(normalized.context.url).toBe('https://api.example.com');
      expect(normalized.context.statusCode).toBe(500);
    });

    it('should normalize authentication errors correctly', () => {
      const authError = new Error('unauthorized access');
      const normalized = ErrorHandler.normalizeError(
        authError,
        'api_call',
        { service: 'GitHub' }
      );
      
      expect(normalized).toBeInstanceOf(AuthenticationError);
      expect(normalized.context.service).toBe('GitHub');
    });

    it('should normalize file system errors', () => {
      const fsError = new Error('ENOENT: no such file or directory');
      const normalized = ErrorHandler.normalizeError(
        fsError,
        'file_read',
        { resourceType: 'file', identifier: '/path/to/file.txt' }
      );
      
      expect(normalized).toBeInstanceOf(ResourceNotFoundError);
      expect(normalized.context.identifier).toBe('/path/to/file.txt');
    });

    it('should handle already normalized TrainingError instances', () => {
      const originalError = new ConfigurationError('Original error', 'TEST_KEY');
      const normalized = ErrorHandler.normalizeError(originalError, 'test_operation');
      
      expect(normalized).toBe(originalError); // Should return the same instance
    });
  });

  describe('Configuration Validation', () => {
    it('should validate required configuration keys', () => {
      const config = {
        API_KEY: 'test-key',
        DATABASE_URL: 'postgres://localhost:5432/test',
      };
      
      expect(() => {
        ErrorHandler.validateConfiguration(config, ['API_KEY', 'DATABASE_URL']);
      }).not.toThrow();
    });

    it('should throw MissingConfigurationError for missing keys', () => {
      const config = {
        API_KEY: 'test-key',
      };
      
      expect(() => {
        ErrorHandler.validateConfiguration(config, ['API_KEY', 'MISSING_KEY']);
      }).toThrow(MissingConfigurationError);
    });

    it('should validate URL format correctly', () => {
      expect(() => {
        ErrorHandler.validateURL('https://api.example.com', 'API_URL');
      }).not.toThrow();
      
      expect(() => {
        ErrorHandler.validateURL('invalid-url', 'API_URL');
      }).toThrow(InvalidConfigurationError);
    });

    it('should validate numeric ranges', () => {
      expect(() => {
        ErrorHandler.validateNumericRange(50, 0, 100, 'PERCENTAGE');
      }).not.toThrow();
      
      expect(() => {
        ErrorHandler.validateNumericRange(150, 0, 100, 'PERCENTAGE');
      }).toThrow(InvalidConfigurationError);
    });
  });

  describe('Retry Logic and Error Handling', () => {
    it('should retry retryable operations with exponential backoff', async () => {
      let attempts = 0;
      const operation = vi.fn(async () => {
        attempts++;
        if (attempts < 3) {
          throw new NetworkError('Temporary failure', 'https://api.example.com', 500);
        }
        return 'success';
      });

      const result = await ErrorHandler.handleError(
        new Error('test'),
        'retry_test',
        {},
        operation
      );

      expect(result).toBe('success');
      expect(attempts).toBe(3);
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should not retry non-retryable errors', async () => {
      let attempts = 0;
      const operation = vi.fn(async () => {
        attempts++;
        throw new ConfigurationError('Missing API key', 'API_KEY');
      });

      await expect(
        ErrorHandler.handleError(new Error('test'), 'config_test', {}, operation)
      ).rejects.toThrow(ConfigurationError);

      expect(attempts).toBe(1);
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should respect rate limit delays', async () => {
      const startTime = Date.now();
      let attempts = 0;
      
      const operation = vi.fn(async () => {
        attempts++;
        if (attempts === 1) {
          throw new RateLimitError('GitHub API', Date.now() + 100); // 100ms delay
        }
        return 'success';
      });

      const result = await ErrorHandler.handleError(
        new Error('test'),
        'rate_limit_test',
        {},
        operation
      );

      const duration = Date.now() - startTime;
      expect(result).toBe('success');
      expect(duration).toBeGreaterThan(90); // Should wait at least 100ms
      expect(attempts).toBe(2);
    });
  });

  describe('withRetry Wrapper Function', () => {
    it('should retry failed operations', async () => {
      let attempts = 0;
      
      const result = await withRetry(
        async () => {
          attempts++;
          if (attempts < 2) {
            throw new NetworkError('Temporary failure');
          }
          return 'success';
        },
        'retry_wrapper_test',
        {},
        3
      );

      expect(result).toBe('success');
      expect(attempts).toBe(2);
    });

    it('should throw after max retries exceeded', async () => {
      let attempts = 0;
      
      await expect(
        withRetry(
          async () => {
            attempts++;
            throw new NetworkError('Persistent failure');
          },
          'max_retry_test',
          {},
          2
        )
      ).rejects.toThrow(NetworkError);

      expect(attempts).toBe(2); // Should try exactly 2 times
    });
  });

  describe('safely Wrapper Function', () => {
    it('should return result on success', async () => {
      const result = await safely(
        async () => 'success',
        'safe_success_test'
      );

      expect(result).toBe('success');
    });

    it('should return null on failure without throwing', async () => {
      const result = await safely(
        async () => {
          throw new Error('Operation failed');
        },
        'safe_failure_test'
      );

      expect(result).toBeNull();
    });

    it('should log warnings for failed operations', async () => {
      const logSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      await safely(
        async () => {
          throw new ValidationError('field', 'value', 'must be string');
        },
        'safe_validation_test'
      );

      // Note: elizaLogger.warn might not be easily mockable in this context
      // The main thing is that it doesn't throw
      expect(logSpy).toHaveBeenCalled();
      logSpy.mockRestore();
    });
  });

  describe('Error Context and Logging', () => {
    it('should provide comprehensive log context', () => {
      const error = new NetworkError(
        'Connection failed',
        'https://api.example.com',
        500,
        { attempt: 2, timeout: 5000 }
      );

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
        },
      });
    });

    it('should provide user-friendly error messages', () => {
      const errors = [
        new MissingConfigurationError('API_KEY'),
        new RateLimitError('GitHub API', Date.now() + 60000),
        new AuthenticationError('GitHub', 'Invalid token'),
      ];

      errors.forEach(error => {
        const userMessage = error.getUserMessage();
        expect(userMessage).toBeTruthy();
        expect(userMessage).not.toContain('Error:'); // Should be user-friendly
        expect(userMessage).not.toContain('undefined');
      });
    });
  });

  describe('withErrorHandling Decorator', () => {
    it('should wrap method errors with proper context', async () => {
      class TestClass {
        @withErrorHandling('test_method')
        async testMethod(shouldFail: boolean) {
          if (shouldFail) {
            throw new Error('Method failed');
          }
          return 'success';
        }
      }

      const instance = new TestClass();
      
      // Should work normally on success
      const result = await instance.testMethod(false);
      expect(result).toBe('success');

      // Should handle errors properly
      await expect(instance.testMethod(true)).rejects.toThrow(ProcessingError);
    });
  });

  describe('Real-world Error Scenarios', () => {
    it('should handle GitHub API authentication failure', () => {
      const error = ErrorHandler.normalizeError(
        new Error('Bad credentials'),
        'fetch_github_repos',
        { service: 'GitHub', url: 'https://api.github.com/orgs/test' }
      );

      expect(error).toBeInstanceOf(AuthenticationError);
      expect(error.getUserMessage()).toContain('GitHub');
      expect(error.getUserMessage()).toContain('API key');
    });

    it('should handle database connection timeout', () => {
      const error = ErrorHandler.normalizeError(
        new Error('connection timeout'),
        'database_query',
        { operation: 'select', database: 'training_db' }
      );

      expect(error).toBeInstanceOf(NetworkError);
      expect(error.retryable).toBe(true);
      expect(error.retryAfter).toBeDefined();
    });

    it('should handle invalid training data format', () => {
      const error = new DataValidationError('conversation', [
        'Missing required field: messages',
        'Invalid message format in position 3',
        'Empty content not allowed'
      ]);

      expect(error.code).toBe('DATA_VALIDATION_ERROR');
      expect(error.category).toBe(ErrorCategory.VALIDATION);
      expect(error.message).toContain('conversation validation failed');
      expect(error.context.issues).toHaveLength(3);
    });

    it('should handle resource exhaustion gracefully', () => {
      const error = new ResourceExhaustedError('memory', 8192, 9000);

      expect(error.code).toBe('RESOURCE_EXHAUSTED');
      expect(error.retryable).toBe(true);
      expect(error.retryAfter).toBe(60000); // 1 minute default
      expect(error.context.limit).toBe(8192);
      expect(error.context.current).toBe(9000);
    });
  });

  describe('Error Recovery Patterns', () => {
    it('should demonstrate graceful degradation', async () => {
      // Simulate a service that fails but has a fallback
      const primaryOperation = async () => {
        throw new ServiceUnavailableError('PrimaryAPI');
      };

      const fallbackOperation = async () => {
        return 'fallback_result';
      };

      const result = await safely(primaryOperation, 'primary_service') ||
                     await safely(fallbackOperation, 'fallback_service') ||
                     'default_value';

      expect(result).toBe('fallback_result');
    });

    it('should handle cascading failures with circuit breaker pattern', async () => {
      let failureCount = 0;
      const maxFailures = 3;

      const unreliableOperation = async () => {
        failureCount++;
        if (failureCount <= maxFailures) {
          throw new ExternalServiceError('UnreliableAPI', 'call', 'Service down');
        }
        return 'eventually_success';
      };

      // Simulate circuit breaker logic
      let circuitOpen = false;
      const wrappedOperation = async () => {
        if (circuitOpen) {
          throw new ServiceUnavailableError('UnreliableAPI');
        }
        
        try {
          return await unreliableOperation();
        } catch (error) {
          if (failureCount >= maxFailures) {
            circuitOpen = true;
          }
          throw error;
        }
      };

      // First few calls should fail and open circuit
      for (let i = 0; i < maxFailures; i++) {
        await expect(safely(wrappedOperation, 'circuit_test')).resolves.toBeNull();
      }

      // Circuit should now be open
      expect(circuitOpen).toBe(true);
      
      // Further calls should fail fast
      await expect(safely(wrappedOperation, 'circuit_test')).resolves.toBeNull();
    });
  });
});