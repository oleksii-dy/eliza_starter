import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import { CodeInterfaceService, type CodeInterfaceOptions } from '../services/code-interface-service.js';

// Mock fs operations
const mockFs = {
  mkdir: mock(() => Promise.resolve()),
  writeFile: mock(() => Promise.resolve()),
  readFile: mock(() => Promise.resolve('{"totalRequests": 0, "successfulRequests": 0}')),
  access: mock(() => Promise.reject(new Error('File not found'))),
  stat: mock(() => Promise.resolve({ 
    size: 1024,
    isFile: () => true,
    isDirectory: () => false,
    mtime: new Date(),
  })),
  readdir: mock(() => Promise.resolve([])),
  unlink: mock(() => Promise.resolve()),
};

const mockPath = {
  dirname: mock(() => '/test/dir'),
  resolve: mock(() => '/test/dir/.test-metrics'),
  join: mock((...args: string[]) => args.join('/')),
};

// Apply mocks
mock.module('fs/promises', () => mockFs);
mock.module('path', () => mockPath);

const mockTelemetryService = {
  logEvent: mock(() => Promise.resolve()),
  start: mock(() => Promise.resolve()),
  stop: mock(() => Promise.resolve()),
};

const mockErrorLogService = {
  logError: mock(() => Promise.resolve()),
  logWarning: mock(() => Promise.resolve()),
  start: mock(() => Promise.resolve()),
  stop: mock(() => Promise.resolve()),
};

describe('CodeInterfaceService', () => {
  let codeInterfaceService: CodeInterfaceService;
  let mockOptions: CodeInterfaceOptions;

  beforeEach(() => {
    // Clear all mocks
    Object.values(mockFs).forEach(mockFn => mockFn.mockReset());
    Object.values(mockPath).forEach(mockFn => mockFn.mockReset());
    mockTelemetryService.logEvent.mockReset();
    mockErrorLogService.logError.mockReset();
    mockErrorLogService.logWarning.mockReset();
    
    mockOptions = {
      enabled: true,
      metricsDirectory: '.test-metrics',
      enablePerformanceTracking: true,
      enableUsageTracking: true,
      telemetryService: mockTelemetryService as any,
      errorLogService: mockErrorLogService as any,
      debug: true,
    };

    // Setup path mocks
    mockPath.dirname.mockReturnValue('/test/dir');
    mockPath.resolve.mockReturnValue('/test/dir/.test-metrics');
    mockPath.join.mockImplementation((...args) => args.join('/'));

    // Setup fs mocks
    mockFs.mkdir.mockResolvedValue(undefined);
    mockFs.writeFile.mockResolvedValue(undefined);
    mockFs.readFile.mockResolvedValue('{"totalRequests": 0, "successfulRequests": 0}');
    mockFs.access.mockRejectedValue(new Error('File not found'));
    mockFs.stat.mockResolvedValue({ 
      size: 1024,
      isFile: () => true,
      isDirectory: () => false,
      mtime: new Date(),
    } as any);
    mockFs.readdir.mockResolvedValue([]);
    mockFs.unlink.mockResolvedValue(undefined);

    codeInterfaceService = new CodeInterfaceService(mockOptions);
  });

  afterEach(async () => {
    if (codeInterfaceService) {
      await codeInterfaceService.stop();
    }
  });

  describe('initialization', () => {
    it('should create a CodeInterfaceService instance', () => {
      expect(codeInterfaceService).toBeInstanceOf(CodeInterfaceService);
    });

    it('should start successfully with enabled metrics', async () => {
      await expect(codeInterfaceService.start()).resolves.not.toThrow();
      expect(mockFs.mkdir).toHaveBeenCalledWith(
        expect.stringContaining('.test-metrics'),
        { recursive: true }
      );
      expect(mockTelemetryService.logEvent).toHaveBeenCalledWith(
        'code_interface_started',
        expect.objectContaining({
          metricsDirectory: '.test-metrics',
          enablePerformanceTracking: true,
          enableUsageTracking: true,
        }),
        'interface'
      );
    });

    it('should skip initialization when disabled', async () => {
      const disabledService = new CodeInterfaceService({ 
        ...mockOptions, 
        enabled: false 
      });
      
      await disabledService.start();
      expect(mockFs.mkdir).not.toHaveBeenCalled();
      expect(mockTelemetryService.logEvent).not.toHaveBeenCalled();
    });

    it('should handle directory creation errors', async () => {
      mockFs.mkdir.mockRejectedValueOnce(new Error('Permission denied'));
      
      await expect(codeInterfaceService.start()).rejects.toThrow('Permission denied');
      expect(mockErrorLogService.logError).toHaveBeenCalled();
    });

    it('should load existing metrics on start', async () => {
      const existingMetrics = {
        totalRequests: 100,
        successfulRequests: 95,
        totalTokensUsed: 50000,
        averageResponseTime: 1500,
      };
      
      mockFs.readFile.mockResolvedValueOnce(JSON.stringify(existingMetrics));
      
      await codeInterfaceService.start();
      
      const metrics = await codeInterfaceService.getMetrics();
      expect(metrics.totalRequests).toBe(100);
      expect(metrics.successfulRequests).toBe(95);
    });
  });

  describe('request tracking', () => {
    beforeEach(async () => {
      await codeInterfaceService.start();
    });

    it('should track successful requests', async () => {
      const sessionId = 'test-session-123';
      const requestData = {
        prompt: 'Create a React component',
        type: 'code_generation',
        metadata: { language: 'typescript' },
      };

      const requestId = await codeInterfaceService.trackRequest(sessionId, requestData);
      
      expect(requestId).toMatch(/^req-\d+-.{6}$/);
      expect(mockTelemetryService.logEvent).toHaveBeenCalledWith(
        'request_started',
        expect.objectContaining({
          requestId,
          sessionId,
          type: 'code_generation',
          promptLength: expect.any(Number),
        }),
        'interface'
      );
    });

    it('should complete request tracking with response data', async () => {
      const sessionId = 'test-session-123';
      const requestId = await codeInterfaceService.trackRequest(sessionId, {
        prompt: 'Test request',
        type: 'code_generation',
      });

      const responseData = {
        content: 'Generated code content',
        tokensUsed: 250,
        responseTime: 1200,
        success: true,
      };

      await expect(codeInterfaceService.completeRequest(requestId, responseData)).resolves.not.toThrow();
      
      expect(mockTelemetryService.logEvent).toHaveBeenCalledWith(
        'request_completed',
        expect.objectContaining({
          requestId,
          success: true,
          tokensUsed: 250,
          responseTime: 1200,
          contentLength: expect.any(Number),
        }),
        'interface'
      );
    });

    it('should handle request failure tracking', async () => {
      const sessionId = 'test-session-123';
      const requestId = await codeInterfaceService.trackRequest(sessionId, {
        prompt: 'Failing request',
        type: 'code_generation',
      });

      const errorData = {
        success: false,
        error: 'API rate limit exceeded',
        responseTime: 500,
      };

      await codeInterfaceService.completeRequest(requestId, errorData);
      
      expect(mockTelemetryService.logEvent).toHaveBeenCalledWith(
        'request_completed',
        expect.objectContaining({
          requestId,
          success: false,
          error: 'API rate limit exceeded',
          responseTime: 500,
        }),
        'interface'
      );
    });

    it('should track different request types', async () => {
      const requestTypes = [
        'code_generation',
        'code_review',
        'explanation',
        'refactoring',
        'debugging',
        'documentation',
      ];

      const sessionId = 'test-session';
      
      for (const type of requestTypes) {
        const requestId = await codeInterfaceService.trackRequest(sessionId, {
          prompt: `Test ${type} request`,
          type,
        });
        
        expect(requestId).toBeTruthy();
        expect(mockTelemetryService.logEvent).toHaveBeenCalledWith(
          'request_started',
          expect.objectContaining({ type }),
          'interface'
        );
      }
    });

    it('should handle completion of non-existent requests', async () => {
      await expect(codeInterfaceService.completeRequest('non-existent', {
        success: false,
        error: 'Request not found',
      })).resolves.not.toThrow();
      
      expect(mockErrorLogService.logWarning).toHaveBeenCalledWith(
        'Attempted to complete non-existent request: non-existent',
        expect.any(Object),
        'interface'
      );
    });
  });

  describe('session management', () => {
    beforeEach(async () => {
      await codeInterfaceService.start();
    });

    it('should create new sessions', async () => {
      const sessionConfig = {
        userId: 'user-123',
        context: 'web-development',
        settings: { autoSave: true, theme: 'dark' },
      };

      const sessionId = await codeInterfaceService.createSession(sessionConfig);
      
      expect(sessionId).toMatch(/^session-\d+-.{6}$/);
      expect(mockTelemetryService.logEvent).toHaveBeenCalledWith(
        'session_created',
        expect.objectContaining({
          sessionId,
          userId: 'user-123',
          context: 'web-development',
        }),
        'interface'
      );
    });

    it('should get session information', async () => {
      const sessionId = await codeInterfaceService.createSession({
        userId: 'user-123',
        context: 'testing',
      });

      const session = await codeInterfaceService.getSession(sessionId);
      
      expect(session).toEqual({
        id: sessionId,
        userId: 'user-123',
        context: 'testing',
        createdAt: expect.any(String),
        lastActivity: expect.any(String),
        requestCount: 0,
        totalTokensUsed: 0,
        averageResponseTime: 0,
        settings: {},
      });
    });

    it('should handle non-existent session requests', async () => {
      const session = await codeInterfaceService.getSession('non-existent');
      expect(session).toBeNull();
    });

    it('should update session activity', async () => {
      const sessionId = await codeInterfaceService.createSession({
        userId: 'user-123',
        context: 'testing',
      });

      // Track a request to update activity
      const requestId = await codeInterfaceService.trackRequest(sessionId, {
        prompt: 'Test request',
        type: 'code_generation',
      });

      await codeInterfaceService.completeRequest(requestId, {
        success: true,
        tokensUsed: 100,
        responseTime: 800,
      });

      const session = await codeInterfaceService.getSession(sessionId);
      expect(session?.requestCount).toBe(1);
      expect(session?.totalTokensUsed).toBe(100);
      expect(session?.averageResponseTime).toBe(800);
    });

    it('should end sessions', async () => {
      const sessionId = await codeInterfaceService.createSession({
        userId: 'user-123',
        context: 'testing',
      });

      await expect(codeInterfaceService.endSession(sessionId)).resolves.not.toThrow();
      
      expect(mockTelemetryService.logEvent).toHaveBeenCalledWith(
        'session_ended',
        expect.objectContaining({
          sessionId,
          duration: expect.any(Number),
          requestCount: 0,
        }),
        'interface'
      );
    });

    it('should list active sessions', async () => {
      const sessionIds = await Promise.all([
        codeInterfaceService.createSession({ userId: 'user-1', context: 'web' }),
        codeInterfaceService.createSession({ userId: 'user-2', context: 'mobile' }),
        codeInterfaceService.createSession({ userId: 'user-3', context: 'api' }),
      ]);

      const activeSessions = await codeInterfaceService.getActiveSessions();
      
      expect(activeSessions).toHaveLength(3);
      expect(activeSessions.map(s => s.id)).toEqual(expect.arrayContaining(sessionIds));
    });
  });

  describe('metrics and analytics', () => {
    beforeEach(async () => {
      await codeInterfaceService.start();
    });

    it('should provide comprehensive metrics', async () => {
      // Create some test data
      const sessionId = await codeInterfaceService.createSession({
        userId: 'user-123',
        context: 'testing',
      });

      const requestId = await codeInterfaceService.trackRequest(sessionId, {
        prompt: 'Test request',
        type: 'code_generation',
      });

      await codeInterfaceService.completeRequest(requestId, {
        success: true,
        tokensUsed: 150,
        responseTime: 1000,
      });

      const metrics = await codeInterfaceService.getMetrics();
      
      expect(metrics).toEqual({
        totalRequests: 1,
        successfulRequests: 1,
        failedRequests: 0,
        totalTokensUsed: 150,
        averageResponseTime: 1000,
        averageTokensPerRequest: 150,
        requestsByType: {
          code_generation: 1,
        },
        activeSessions: 1,
        totalSessions: 1,
        peakConcurrentSessions: 1,
        uptime: expect.any(Number),
        lastUpdated: expect.any(String),
      });
    });

    it('should calculate averages correctly', async () => {
      const sessionId = await codeInterfaceService.createSession({
        userId: 'user-123',
        context: 'testing',
      });

      // Complete multiple requests with different metrics
      const requests = [
        { tokensUsed: 100, responseTime: 800, success: true },
        { tokensUsed: 200, responseTime: 1200, success: true },
        { tokensUsed: 150, responseTime: 1000, success: false },
      ];

      for (let i = 0; i < requests.length; i++) {
        const requestId = await codeInterfaceService.trackRequest(sessionId, {
          prompt: `Test request ${i + 1}`,
          type: 'code_generation',
        });
        
        await codeInterfaceService.completeRequest(requestId, requests[i]);
      }

      const metrics = await codeInterfaceService.getMetrics();
      
      expect(metrics.totalRequests).toBe(3);
      expect(metrics.successfulRequests).toBe(2);
      expect(metrics.failedRequests).toBe(1);
      expect(metrics.totalTokensUsed).toBe(450);
      expect(metrics.averageTokensPerRequest).toBe(150);
      expect(metrics.averageResponseTime).toBe(1000);
    });

    it('should track performance trends', async () => {
      const trends = await codeInterfaceService.getPerformanceTrends();
      
      expect(trends).toEqual({
        requestsPerHour: expect.any(Number),
        tokensPerHour: expect.any(Number),
        averageResponseTimeTrend: expect.any(Array),
        successRateTrend: expect.any(Array),
        popularRequestTypes: expect.any(Object),
        lastUpdated: expect.any(String),
      });
    });

    it('should export usage data', async () => {
      const sessionId = await codeInterfaceService.createSession({
        userId: 'user-123',
        context: 'testing',
      });

      const requestId = await codeInterfaceService.trackRequest(sessionId, {
        prompt: 'Export test',
        type: 'documentation',
      });

      await codeInterfaceService.completeRequest(requestId, {
        success: true,
        tokensUsed: 75,
        responseTime: 600,
      });

      const exportData = await codeInterfaceService.exportUsageData();
      
      expect(exportData).toEqual({
        summary: expect.objectContaining({
          totalRequests: 1,
          totalSessions: 1,
          totalTokensUsed: 75,
        }),
        sessions: expect.arrayContaining([
          expect.objectContaining({
            id: sessionId,
            userId: 'user-123',
            context: 'testing',
          }),
        ]),
        requests: expect.arrayContaining([
          expect.objectContaining({
            id: requestId,
            sessionId,
            type: 'documentation',
            success: true,
          }),
        ]),
        metrics: expect.any(Object),
        trends: expect.any(Object),
        exportedAt: expect.any(String),
      });
    });
  });

  describe('user feedback and interaction', () => {
    beforeEach(async () => {
      await codeInterfaceService.start();
    });

    it('should record user feedback', async () => {
      const sessionId = await codeInterfaceService.createSession({
        userId: 'user-123',
        context: 'testing',
      });

      const requestId = await codeInterfaceService.trackRequest(sessionId, {
        prompt: 'Test request',
        type: 'code_generation',
      });

      const feedback = {
        rating: 4,
        comment: 'Good response, but could be more detailed',
        helpful: true,
        category: 'quality',
      };

      await expect(codeInterfaceService.recordFeedback(requestId, feedback)).resolves.not.toThrow();
      
      expect(mockTelemetryService.logEvent).toHaveBeenCalledWith(
        'feedback_recorded',
        expect.objectContaining({
          requestId,
          rating: 4,
          helpful: true,
          category: 'quality',
        }),
        'interface'
      );
    });

    it('should handle user preferences', async () => {
      const sessionId = await codeInterfaceService.createSession({
        userId: 'user-123',
        context: 'testing',
      });

      const preferences = {
        codeStyle: 'functional',
        verbosity: 'detailed',
        includeComments: true,
        preferredLanguages: ['typescript', 'python'],
      };

      await codeInterfaceService.updateUserPreferences(sessionId, preferences);
      
      const session = await codeInterfaceService.getSession(sessionId);
      expect(session?.settings).toEqual(expect.objectContaining(preferences));
    });

    it('should track user interactions', async () => {
      const sessionId = await codeInterfaceService.createSession({
        userId: 'user-123',
        context: 'testing',
      });

      const interaction = {
        type: 'code_copy',
        target: 'generated_code_block_1',
        timestamp: new Date().toISOString(),
        metadata: { language: 'javascript' },
      };

      await codeInterfaceService.trackInteraction(sessionId, interaction);
      
      expect(mockTelemetryService.logEvent).toHaveBeenCalledWith(
        'user_interaction',
        expect.objectContaining({
          sessionId,
          type: 'code_copy',
          target: 'generated_code_block_1',
        }),
        'interface'
      );
    });
  });

  describe('error handling', () => {
    beforeEach(async () => {
      await codeInterfaceService.start();
    });

    it('should handle metrics calculation errors', async () => {
      // Mock file read to throw an error
      mockFs.readFile.mockRejectedValueOnce(new Error('Disk read error'));
      
      const metrics = await codeInterfaceService.getMetrics();
      
      // Should return default metrics on error
      expect(metrics.totalRequests).toBe(0);
      expect(mockErrorLogService.logError).toHaveBeenCalled();
    });

    it('should handle session creation errors gracefully', async () => {
      // Mock file write to fail
      mockFs.writeFile.mockRejectedValueOnce(new Error('Disk write error'));
      
      // Should still return session ID but log error
      const sessionId = await codeInterfaceService.createSession({
        userId: 'user-123',
        context: 'error-test',
      });
      
      expect(sessionId).toBeTruthy();
      expect(mockErrorLogService.logError).toHaveBeenCalled();
    });

    it('should validate request data', async () => {
      const sessionId = await codeInterfaceService.createSession({
        userId: 'user-123',
        context: 'validation-test',
      });

      // Test invalid request data
      await expect(codeInterfaceService.trackRequest(sessionId, {
        prompt: '', // Empty prompt
        type: 'code_generation',
      })).rejects.toThrow('Request prompt cannot be empty');

      await expect(codeInterfaceService.trackRequest(sessionId, {
        prompt: 'Valid prompt',
        type: 'invalid_type' as any, // Invalid type
      })).rejects.toThrow('Invalid request type');
    });

    it('should handle metrics file corruption', async () => {
      // Mock corrupted metrics file
      mockFs.readFile.mockResolvedValueOnce('invalid json content');
      
      const metrics = await codeInterfaceService.getMetrics();
      
      // Should fall back to default metrics
      expect(metrics.totalRequests).toBe(0);
      expect(mockErrorLogService.logWarning).toHaveBeenCalledWith(
        expect.stringContaining('Failed to parse metrics file'),
        expect.any(Object),
        'interface'
      );
    });
  });

  describe('stop and cleanup', () => {
    beforeEach(async () => {
      await codeInterfaceService.start();
    });

    it('should stop gracefully', async () => {
      await expect(codeInterfaceService.stop()).resolves.not.toThrow();
      expect(mockFs.writeFile).toHaveBeenCalled(); // Metrics written
    });

    it('should handle stop errors gracefully', async () => {
      mockFs.writeFile.mockRejectedValue(new Error('Write failed'));
      await expect(codeInterfaceService.stop()).resolves.not.toThrow();
    });

    it('should save final metrics on stop', async () => {
      const sessionId = await codeInterfaceService.createSession({
        userId: 'user-123',
        context: 'final-test',
      });

      const requestId = await codeInterfaceService.trackRequest(sessionId, {
        prompt: 'Final request',
        type: 'code_generation',
      });

      await codeInterfaceService.completeRequest(requestId, {
        success: true,
        tokensUsed: 50,
        responseTime: 500,
      });

      await codeInterfaceService.stop();
      
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('interface-metrics.json'),
        expect.stringContaining('"totalRequests":1'),
        'utf8'
      );
    });

    it('should end all active sessions on stop', async () => {
      const sessionIds = await Promise.all([
        codeInterfaceService.createSession({ userId: 'user-1', context: 'test1' }),
        codeInterfaceService.createSession({ userId: 'user-2', context: 'test2' }),
      ]);

      await codeInterfaceService.stop();
      
      // All sessions should be ended
      for (const sessionId of sessionIds) {
        expect(mockTelemetryService.logEvent).toHaveBeenCalledWith(
          'session_ended',
          expect.objectContaining({ sessionId }),
          'interface'
        );
      }
    });
  });
});