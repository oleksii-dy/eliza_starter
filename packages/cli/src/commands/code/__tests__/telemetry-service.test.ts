import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import { TelemetryService } from '../services/telemetry-service.js';

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
  resolve: mock(() => '/test/dir/.test-telemetry.json'),
  join: mock((...args: string[]) => args.join('/')),
};

// Apply mocks
mock.module('fs/promises', () => mockFs);
mock.module('path', () => mockPath);

describe('TelemetryService', () => {
  let telemetryService: TelemetryService;
  let mockOptions: any;

  beforeEach(() => {
    // Clear all mocks
    Object.values(mockFs).forEach(mockFn => mockFn.mockReset());
    Object.values(mockPath).forEach(mockFn => mockFn.mockReset());
    
    mockOptions = {
      enabled: true,
      debug: true,
      sessionId: 'test-session-123',
      logFile: '.test-telemetry.json',
    };

    // Setup path mocks
    mockPath.dirname.mockReturnValue('/test/dir');
    mockPath.resolve.mockReturnValue('/test/dir/.test-telemetry.json');

    // Setup fs mocks
    mockFs.mkdir.mockResolvedValue(undefined);
    mockFs.appendFile.mockResolvedValue(undefined);
    mockFs.writeFile.mockResolvedValue(undefined);
    mockFs.access.mockRejectedValue(new Error('File not found'));

    telemetryService = new TelemetryService(mockOptions);
  });

  afterEach(async () => {
    if (telemetryService) {
      await telemetryService.stop();
    }
  });

  describe('initialization', () => {
    it('should create a TelemetryService instance', () => {
      expect(telemetryService).toBeInstanceOf(TelemetryService);
    });

    it('should start successfully with enabled telemetry', async () => {
      await expect(telemetryService.start()).resolves.not.toThrow();
      expect(mockFs.mkdir).toHaveBeenCalled();
    });

    it('should skip initialization when disabled', async () => {
      const disabledService = new TelemetryService({ ...mockOptions, enabled: false });
      await disabledService.start();
      expect(mockFs.mkdir).not.toHaveBeenCalled();
    });
  });

  describe('event logging', () => {
    beforeEach(async () => {
      await telemetryService.start();
    });

    it('should log events when enabled', async () => {
      await telemetryService.logEvent('test_event', { key: 'value' }, 'code-interface');
      
      expect(mockFs.appendFile).toHaveBeenCalledWith(
        expect.stringContaining('.test-telemetry.json'),
        expect.stringContaining('test_event'),
        'utf8'
      );
    });

    it('should not log events when disabled', async () => {
      const disabledService = new TelemetryService({ ...mockOptions, enabled: false });
      await disabledService.start();
      await disabledService.logEvent('test_event', { key: 'value' });
      
      expect(mockFs.appendFile).not.toHaveBeenCalled();
    });

    it('should handle logging errors gracefully', async () => {
      mockFs.appendFile.mockRejectedValue(new Error('Write failed'));
      
      await expect(telemetryService.logEvent('test_event', { key: 'value' })).resolves.not.toThrow();
    });

    it('should log error events with proper structure', async () => {
      const testError = new Error('Test error');
      await telemetryService.logError('test_operation', testError, { context: 'test' });
      
      expect(mockFs.appendFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringMatching(/error_test_operation/),
        'utf8'
      );
    });
  });

  describe('metrics collection', () => {
    beforeEach(async () => {
      await telemetryService.start();
    });

    it('should calculate metrics correctly', async () => {
      await telemetryService.logEvent('user_input', { input: 'test' });
      await telemetryService.logEvent('agent_response', { response: 'test' });
      await telemetryService.logError('test_error', new Error('test'));

      const metrics = await telemetryService.getMetrics();

      expect(metrics.eventsLogged).toBe(3);
      expect(metrics.errorsLogged).toBe(1);
      expect(metrics.sessionDuration).toBeGreaterThan(0);
    });

    it('should track most common events', async () => {
      await telemetryService.logEvent('common_event', {});
      await telemetryService.logEvent('common_event', {});
      await telemetryService.logEvent('rare_event', {});

      const metrics = await telemetryService.getMetrics();

      expect(metrics.mostCommonEvents[0]).toEqual({
        event: 'common_event',
        count: 2,
      });
    });
  });

  describe('event filtering', () => {
    beforeEach(async () => {
      await telemetryService.start();
      
      // Add some test events
      await telemetryService.logEvent('event1', {}, 'code-interface');
      await telemetryService.logEvent('event2', {}, 'autocoder');
      await telemetryService.logEvent('event1', {}, 'code-interface');
    });

    it('should filter events by type', async () => {
      const events = await telemetryService.getEvents({ event: 'event1' });
      expect(events).toHaveLength(2);
      expect(events.every(e => e.event === 'event1')).toBe(true);
    });

    it('should filter events by source', async () => {
      const events = await telemetryService.getEvents({ source: 'autocoder' });
      expect(events).toHaveLength(1);
      expect(events[0].source).toBe('autocoder');
    });

    it('should limit events when requested', async () => {
      const events = await telemetryService.getEvents({ limit: 1 });
      expect(events).toHaveLength(1);
    });

    it('should filter events by date', async () => {
      const now = new Date();
      const events = await telemetryService.getEvents({ 
        since: new Date(now.getTime() - 1000) 
      });
      expect(events.length).toBeGreaterThan(0);
    });
  });

  describe('session export', () => {
    beforeEach(async () => {
      await telemetryService.start();
      await telemetryService.logEvent('test_event', { key: 'value' });
    });

    it('should export session data', async () => {
      const exported = await telemetryService.exportSession();

      expect(exported).toHaveProperty('sessionId');
      expect(exported).toHaveProperty('metrics');
      expect(exported).toHaveProperty('events');
      expect(exported).toHaveProperty('summary');
    });

    it('should include performance metrics in export', async () => {
      const exported = await telemetryService.exportSession();

      expect(exported.summary).toHaveProperty('performance');
      expect(exported.summary.performance).toHaveProperty('totalInteractions');
      expect(exported.summary.performance).toHaveProperty('errorRate');
    });
  });

  describe('stop and cleanup', () => {
    beforeEach(async () => {
      await telemetryService.start();
    });

    it('should stop gracefully', async () => {
      await expect(telemetryService.stop()).resolves.not.toThrow();
      expect(mockFs.writeFile).toHaveBeenCalled(); // Summary file written
    });

    it('should handle stop errors gracefully', async () => {
      mockFs.writeFile.mockRejectedValue(new Error('Write failed'));
      await expect(telemetryService.stop()).resolves.not.toThrow();
    });
  });

  describe('data sanitization', () => {
    beforeEach(async () => {
      await telemetryService.start();
    });

    it('should sanitize sensitive data in events', async () => {
      const sensitiveData = {
        apiKey: 'sk-1234567890abcdef',
        password: 'secret123',
        normalData: 'safe value',
      };

      await telemetryService.logEvent('test_event', sensitiveData);

      const events = await telemetryService.getEvents({ event: 'test_event' });
      expect(events[0].data.apiKey).toBe('[REDACTED]');
      expect(events[0].data.password).toBe('[REDACTED]');
      expect(events[0].data.normalData).toBe('safe value');
    });

    it('should mask potential tokens in strings', async () => {
      const tokenData = {
        token: 'ghp_1234567890abcdefghijklmnopqrstuvwxyz',
        shortValue: 'abc',
      };

      await telemetryService.logEvent('test_event', tokenData);

      const events = await telemetryService.getEvents({ event: 'test_event' });
      expect(events[0].data.token).toMatch(/^ghp_.*xyz$/);
      expect(events[0].data.shortValue).toBe('abc');
    });
  });

  describe('performance metrics calculation', () => {
    beforeEach(async () => {
      await telemetryService.start();
    });

    it('should calculate response times correctly', async () => {
      // Simulate user input -> agent response pattern
      await telemetryService.logEvent('user_input', {}, 'code-interface');
      
      // Wait a bit then log response
      await new Promise(resolve => setTimeout(resolve, 10));
      await telemetryService.logEvent('agent_response', {}, 'code-interface');

      const exported = await telemetryService.exportSession();
      expect(exported.summary.performance.averageResponseTime).toBeGreaterThan(0);
    });

    it('should calculate error rates', async () => {
      await telemetryService.logEvent('normal_event', {});
      await telemetryService.logError('test_error', new Error('test'));

      const exported = await telemetryService.exportSession();
      expect(exported.summary.performance.errorRate).toBe(0.5);
    });
  });
});