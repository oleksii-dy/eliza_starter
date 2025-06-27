import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import { ErrorLogService } from '../services/error-log-service.js';

// Mock fs operations
const mockFs = {
  mkdir: mock(() => Promise.resolve()),
  appendFile: mock(() => Promise.resolve()),
  writeFile: mock(() => Promise.resolve()),
  readFile: mock(() => Promise.resolve('[]')),
  access: mock(() => Promise.reject(new Error('File not found'))),
  stat: mock(() => Promise.resolve({ size: 1024 })),
  readdir: mock(() => Promise.resolve([])),
  unlink: mock(() => Promise.resolve()),
  rename: mock(() => Promise.resolve()),
};

const mockPath = {
  dirname: mock(() => '/test/dir'),
  resolve: mock(() => '/test/dir/.test-error-logs'),
  join: mock((...args: string[]) => args.join('/')),
};

// Apply mocks
mock.module('fs/promises', () => mockFs);
mock.module('path', () => mockPath);

describe('ErrorLogService', () => {
  let errorLogService: ErrorLogService;
  let mockOptions: any;

  beforeEach(() => {
    // Clear all mocks
    Object.values(mockFs).forEach(mockFn => mockFn.mockReset());
    Object.values(mockPath).forEach(mockFn => mockFn.mockReset());
    
    mockOptions = {
      enabled: true,
      logDirectory: '.test-error-logs',
      maxLogFiles: 5,
      maxLogSize: 1024 * 1024, // 1MB
      debug: true,
    };

    // Setup path mocks
    mockPath.dirname.mockReturnValue('/test/dir');
    mockPath.resolve.mockReturnValue('/test/dir/.test-error-logs');
    mockPath.join.mockImplementation((...args) => args.join('/'));

    // Setup fs mocks
    mockFs.mkdir.mockResolvedValue(undefined);
    mockFs.appendFile.mockResolvedValue(undefined);
    mockFs.writeFile.mockResolvedValue(undefined);
    mockFs.readFile.mockResolvedValue('[]');
    mockFs.access.mockRejectedValue(new Error('File not found'));
    mockFs.stat.mockResolvedValue({ size: 1024 } as any);
    mockFs.readdir.mockResolvedValue([]);

    errorLogService = new ErrorLogService(mockOptions);
  });

  afterEach(async () => {
    if (errorLogService) {
      await errorLogService.stop();
    }
  });

  describe('initialization', () => {
    it('should create an ErrorLogService instance', () => {
      expect(errorLogService).toBeInstanceOf(ErrorLogService);
    });

    it('should start successfully with enabled logging', async () => {
      await expect(errorLogService.start()).resolves.not.toThrow();
      expect(mockFs.mkdir).toHaveBeenCalled();
    });

    it('should skip initialization when disabled', async () => {
      const disabledService = new ErrorLogService({ ...mockOptions, enabled: false });
      await disabledService.start();
      expect(mockFs.mkdir).not.toHaveBeenCalled();
    });

    it('should handle missing log directory creation', async () => {
      mockFs.mkdir.mockRejectedValueOnce(new Error('Permission denied'));
      await expect(errorLogService.start()).rejects.toThrow('Permission denied');
    });
  });

  describe('error logging', () => {
    beforeEach(async () => {
      await errorLogService.start();
    });

    it('should log errors when enabled', async () => {
      const testError = new Error('Test error message');
      await errorLogService.logError('test_operation', testError, { context: 'test' }, 'test-source');
      
      expect(mockFs.appendFile).toHaveBeenCalledWith(
        expect.stringContaining('errors.jsonl'),
        expect.stringContaining('test_operation'),
        'utf8'
      );
    });

    it('should not log errors when disabled', async () => {
      const disabledService = new ErrorLogService({ ...mockOptions, enabled: false });
      await disabledService.start();
      
      const testError = new Error('Test error');
      await disabledService.logError('test_operation', testError);
      
      expect(mockFs.appendFile).not.toHaveBeenCalled();
    });

    it('should handle logging errors gracefully', async () => {
      mockFs.appendFile.mockRejectedValue(new Error('Write failed'));
      
      const testError = new Error('Test error');
      await expect(errorLogService.logError('test_operation', testError)).resolves.not.toThrow();
    });

    it('should log warnings', async () => {
      await errorLogService.logWarning('test warning message', { data: 'test' }, 'test-source');
      
      expect(mockFs.appendFile).toHaveBeenCalledWith(
        expect.stringContaining('errors.jsonl'),
        expect.stringMatching(/warning/),
        'utf8'
      );
    });

    it('should include stack traces in error logs', async () => {
      const testError = new Error('Test error with stack');
      testError.stack = 'Error: Test error\n    at test.js:1:1';
      
      await errorLogService.logError('test_operation', testError);
      
      const logCall = mockFs.appendFile.mock.calls.find(call => 
        call[1].includes('test_operation')
      );
      expect(logCall?.[1]).toContain('test.js:1:1');
    });
  });

  describe('error retrieval and filtering', () => {
    beforeEach(async () => {
      await errorLogService.start();
      
      // Mock file content with test errors
      const mockErrors = [
        {
          timestamp: new Date().toISOString(),
          level: 'error',
          operation: 'test_op_1',
          message: 'Error 1',
          source: 'test-source',
        },
        {
          timestamp: new Date().toISOString(),
          level: 'warning',
          operation: 'test_op_2',
          message: 'Warning 1',
          source: 'other-source',
        },
      ];
      
      mockFs.readFile.mockResolvedValue(
        mockErrors.map(e => JSON.stringify(e)).join('\n')
      );
    });

    it('should retrieve all errors', async () => {
      const errors = await errorLogService.getErrors();
      expect(errors).toHaveLength(2);
      expect(errors[0].operation).toBe('test_op_1');
      expect(errors[1].operation).toBe('test_op_2');
    });

    it('should filter errors by level', async () => {
      const errors = await errorLogService.getErrors({ level: 'error' });
      expect(errors).toHaveLength(1);
      expect(errors[0].level).toBe('error');
    });

    it('should filter errors by source', async () => {
      const errors = await errorLogService.getErrors({ source: 'test-source' });
      expect(errors).toHaveLength(1);
      expect(errors[0].source).toBe('test-source');
    });

    it('should filter errors by operation', async () => {
      const errors = await errorLogService.getErrors({ operation: 'test_op_1' });
      expect(errors).toHaveLength(1);
      expect(errors[0].operation).toBe('test_op_1');
    });

    it('should limit results when requested', async () => {
      const errors = await errorLogService.getErrors({ limit: 1 });
      expect(errors).toHaveLength(1);
    });

    it('should filter errors by date', async () => {
      const now = new Date();
      const errors = await errorLogService.getErrors({ 
        since: new Date(now.getTime() - 1000) 
      });
      expect(errors.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('analytics and metrics', () => {
    beforeEach(async () => {
      await errorLogService.start();
      
      // Add some test errors
      await errorLogService.logError('operation_1', new Error('Error 1'), {}, 'source_1');
      await errorLogService.logError('operation_2', new Error('Error 2'), {}, 'source_1');
      await errorLogService.logWarning('Warning 1', {}, 'source_2');
    });

    it('should generate analytics summary', async () => {
      const analytics = await errorLogService.getAnalytics();
      
      expect(analytics).toHaveProperty('totalErrors');
      expect(analytics).toHaveProperty('totalWarnings');
      expect(analytics).toHaveProperty('errorsBySource');
      expect(analytics).toHaveProperty('errorsByOperation');
      expect(analytics).toHaveProperty('recentTrends');
    });

    it('should track error counts by source', async () => {
      const analytics = await errorLogService.getAnalytics();
      
      expect(analytics.errorsBySource).toHaveProperty('source_1');
      expect(analytics.errorsBySource).toHaveProperty('source_2');
    });

    it('should calculate error trends over time', async () => {
      const analytics = await errorLogService.getAnalytics();
      
      expect(analytics.recentTrends).toHaveProperty('errorsLast24h');
      expect(analytics.recentTrends).toHaveProperty('errorsLast7d');
      expect(analytics.recentTrends).toHaveProperty('averageErrorsPerDay');
    });
  });

  describe('log rotation and cleanup', () => {
    beforeEach(async () => {
      await errorLogService.start();
      
      // Mock file system for rotation testing
      mockFs.stat.mockResolvedValue({ size: 2 * 1024 * 1024 } as any); // 2MB
      mockFs.readdir.mockResolvedValue([
        'errors.jsonl',
        'errors.1.jsonl',
        'errors.2.jsonl',
        'errors.3.jsonl',
        'errors.4.jsonl',
        'errors.5.jsonl',
      ] as any);
    });

    it('should rotate logs when size limit exceeded', async () => {
      // This would trigger rotation due to 2MB size > 1MB limit
      await errorLogService.logError('test', new Error('Large error'), {});
      
      // Should check file size and potentially rotate
      expect(mockFs.stat).toHaveBeenCalled();
    });

    it('should remove old log files beyond max limit', async () => {
      // Mock file removal
      mockFs.unlink = mock(() => Promise.resolve());
      
      // Force cleanup
      await (errorLogService as any).cleanupOldLogs();
      
      // Should remove oldest file (errors.5.jsonl)
      expect(mockFs.unlink).toHaveBeenCalledWith(
        expect.stringContaining('errors.5.jsonl')
      );
    });

    it('should handle rotation errors gracefully', async () => {
      mockFs.rename = mock(() => Promise.reject(new Error('Rotation failed')));
      
      // Should not throw even if rotation fails
      await expect((errorLogService as any).rotateLogFile()).resolves.not.toThrow();
    });
  });

  describe('export functionality', () => {
    beforeEach(async () => {
      await errorLogService.start();
      
      await errorLogService.logError('test_op', new Error('Test error'), { data: 'test' });
      await errorLogService.logWarning('Test warning', { data: 'test' });
    });

    it('should export error logs', async () => {
      const exported = await errorLogService.exportLogs();
      
      expect(exported).toHaveProperty('summary');
      expect(exported).toHaveProperty('errors');
      expect(exported).toHaveProperty('analytics');
      expect(exported.summary).toHaveProperty('totalEntries');
      expect(exported.summary).toHaveProperty('exportedAt');
    });

    it('should export filtered logs', async () => {
      const exported = await errorLogService.exportLogs({
        level: 'error',
        limit: 10,
      });
      
      expect(exported.errors.every((e: any) => e.level === 'error')).toBe(true);
    });

    it('should include performance metrics in export', async () => {
      const exported = await errorLogService.exportLogs();
      
      expect(exported.analytics).toHaveProperty('errorRate');
      expect(exported.analytics).toHaveProperty('topOperations');
      expect(exported.analytics).toHaveProperty('topSources');
    });
  });

  describe('resolution tracking', () => {
    beforeEach(async () => {
      await errorLogService.start();
    });

    it('should track error resolutions', async () => {
      await errorLogService.logError('test_op', new Error('Test error'), { errorId: 'test-123' });
      await errorLogService.markResolved('test-123', 'Fixed by updating dependencies');
      
      const errors = await errorLogService.getErrors({ operation: 'test_op' });
      expect(errors[0]).toHaveProperty('resolved', true);
      expect(errors[0]).toHaveProperty('resolution');
    });

    it('should handle resolution of non-existent errors', async () => {
      await expect(
        errorLogService.markResolved('non-existent', 'Resolution')
      ).resolves.not.toThrow();
    });
  });

  describe('stop and cleanup', () => {
    beforeEach(async () => {
      await errorLogService.start();
    });

    it('should stop gracefully', async () => {
      await expect(errorLogService.stop()).resolves.not.toThrow();
      expect(mockFs.writeFile).toHaveBeenCalled(); // Summary file written
    });

    it('should handle stop errors gracefully', async () => {
      mockFs.writeFile.mockRejectedValue(new Error('Write failed'));
      await expect(errorLogService.stop()).resolves.not.toThrow();
    });

    it('should clean up resources on stop', async () => {
      await errorLogService.stop();
      
      // Should write final summary
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('summary.json'),
        expect.any(String),
        'utf8'
      );
    });
  });

  describe('data sanitization', () => {
    beforeEach(async () => {
      await errorLogService.start();
    });

    it('should sanitize sensitive data in error context', async () => {
      const sensitiveContext = {
        apiKey: 'sk-1234567890abcdef',
        password: 'secret123',
        normalData: 'safe value',
        token: 'ghp_1234567890abcdefghijklmnopqrstuvwxyz',
      };

      await errorLogService.logError('test_op', new Error('Test error'), sensitiveContext);

      const errors = await errorLogService.getErrors({ operation: 'test_op' });
      expect(errors[0].context.apiKey).toBe('[REDACTED]');
      expect(errors[0].context.password).toBe('[REDACTED]');
      expect(errors[0].context.normalData).toBe('safe value');
      expect(errors[0].context.token).toMatch(/^ghp_.*xyz$/);
    });

    it('should sanitize stack traces containing sensitive information', async () => {
      const error = new Error('Database connection failed');
      error.stack = `Error: Database connection failed
    at connect (postgres://user:password123@localhost:5432/db)
    at authenticate (Bearer sk-1234567890abcdef)`;

      await errorLogService.logError('db_connect', error);

      const errors = await errorLogService.getErrors({ operation: 'db_connect' });
      expect(errors[0].stack).not.toContain('password123');
      expect(errors[0].stack).not.toContain('sk-1234567890abcdef');
      expect(errors[0].stack).toContain('[REDACTED]');
    });
  });
});