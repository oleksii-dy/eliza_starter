import { describe, it, expect, beforeEach, mock, afterEach } from 'bun:test';
import { CheckpointManager } from '../swe-bench/validation/checkpoint-manager';
import { DEFAULT_VALIDATION_CONFIG } from '../swe-bench/config/validation-config';
import type { TestResults } from '../swe-bench/types';

// Mock the test executor and result parser modules
mock.module('../swe-bench/validation/test-executor', () => ({
  TestExecutor: mock().mockImplementation(() => ({
    executeTests: mock().mockResolvedValue({
      total: 5,
      passed: 4,
      failed: 1,
      skipped: 0,
      duration: 1500,
      failures: [
        {
          test_name: 'should fail test',
          error_message: 'Expected true but got false',
        },
      ],
      noTestsFound: false,
      frameworkDetected: 'jest',
      executionReliable: true,
      parsingSuccessful: true,
      validationScore: 85,
    }),
  })),
}));

mock.module('../swe-bench/validation/result-parser', () => ({
  ResultParser: mock().mockImplementation(() => ({
    parseResults: mock().mockResolvedValue({
      results: {
        total: 5,
        passed: 4,
        failed: 1,
        skipped: 0,
        duration: 1500,
      },
      confidence: 0.9,
      parseMethod: 'json',
      framework: 'jest',
      warnings: [],
    }),
  })),
}));

// Mock fs/promises
mock.module('fs/promises', () => ({
  mkdir: mock().mockResolvedValue(undefined),
  writeFile: mock().mockResolvedValue(undefined),
  readFile: mock().mockResolvedValue('{}'),
  readdir: mock().mockResolvedValue([]),
  rm: mock().mockResolvedValue(undefined),
}));

describe('CheckpointManager Validation', () => {
  let manager: CheckpointManager;

  beforeEach(() => {
    manager = new CheckpointManager(DEFAULT_VALIDATION_CONFIG, {
      enableCheckpoints: true,
      persistCheckpoints: false, // Disable persistence for tests
      requireMinimumScore: true,
      minimumPassingScore: 70,
    });
  });

  afterEach(() => {
    mock.restore();
  });

  describe('Session Management', () => {
    it('should start a new validation session successfully', async () => {
      const sessionId = await manager.startValidationSession('test-instance-1');

      expect(sessionId).toBeDefined();
      expect(sessionId).toContain('test-instance-1');

      const status = manager.getSessionStatus(sessionId);
      expect(status).toBeDefined();
      expect(status?.instanceId).toBe('test-instance-1');
      expect(status?.status).toBe('active');
      expect(status?.checkpoints).toEqual([]);
    });

    it('should handle multiple concurrent sessions', async () => {
      const sessionId1 = await manager.startValidationSession('instance-1');
      const sessionId2 = await manager.startValidationSession('instance-2');

      expect(sessionId1).not.toBe(sessionId2);

      const status1 = manager.getSessionStatus(sessionId1);
      const status2 = manager.getSessionStatus(sessionId2);

      expect(status1?.instanceId).toBe('instance-1');
      expect(status2?.instanceId).toBe('instance-2');
    });

    it('should return null for non-existent session', () => {
      const status = manager.getSessionStatus('non-existent');
      expect(status).toBeNull();
    });
  });

  describe('Checkpoint Execution', () => {
    it('should execute validation checkpoint successfully', async () => {
      const sessionId = await manager.startValidationSession('test-instance');

      const checkpoint = await manager.executeValidationCheckpoint(
        sessionId,
        'initial-validation',
        '/test/repo'
      );

      expect(checkpoint).toBeDefined();
      expect(checkpoint.phase).toBe('initial-validation');
      expect(checkpoint.passed).toBe(true); // Should pass with 85 score
      expect(checkpoint.score).toBe(85);
      expect(checkpoint.confidence).toBeGreaterThan(0.8);
      expect(checkpoint.testResults.frameworkDetected).toBe('jest');
      expect(checkpoint.testResults.executionReliable).toBe(true);
      expect(checkpoint.testResults.parsingSuccessful).toBe(true);
    });

    it('should handle checkpoint execution with test patch', async () => {
      const sessionId = await manager.startValidationSession('test-instance');
      const testPatch = 'diff --git a/test.js b/test.js\n+new test line';

      const checkpoint = await manager.executeValidationCheckpoint(
        sessionId,
        'patch-validation',
        '/test/repo',
        testPatch,
        1
      );

      expect(checkpoint.phase).toBe('patch-validation');
      expect(checkpoint.iteration).toBe(1);
      expect(checkpoint.id).toContain('patch-validation-i1');
    });

    it('should handle checkpoint execution failure gracefully', async () => {
      const sessionId = await manager.startValidationSession('test-instance');

      // Mock test executor to throw error
      const mockTestExecutor = manager['testExecutor'];
      mock
        .spyOn(mockTestExecutor, 'executeTests')
        .mockRejectedValueOnce(new Error('Test execution failed'));

      const checkpoint = await manager.executeValidationCheckpoint(
        sessionId,
        'failing-phase',
        '/test/repo'
      );

      expect(checkpoint.passed).toBe(false);
      expect(checkpoint.score).toBe(0);
      expect(checkpoint.errors).toContain('Test execution failed');
    });

    it('should update session progress after checkpoint execution', async () => {
      const sessionId = await manager.startValidationSession('test-instance');

      await manager.executeValidationCheckpoint(sessionId, 'phase1', '/test/repo');
      await manager.executeValidationCheckpoint(sessionId, 'phase2', '/test/repo');

      const status = manager.getSessionStatus(sessionId);
      expect(status?.summary.totalCheckpoints).toBe(2);
      expect(status?.summary.passedCheckpoints).toBe(2);
      expect(status?.summary.averageScore).toBeGreaterThan(0);
    });
  });

  describe('Session Completion', () => {
    it('should complete validation session and generate summary', async () => {
      const sessionId = await manager.startValidationSession('test-instance');

      // Execute multiple checkpoints
      await manager.executeValidationCheckpoint(sessionId, 'phase1', '/test/repo');
      await manager.executeValidationCheckpoint(sessionId, 'phase2', '/test/repo');
      await manager.executeValidationCheckpoint(sessionId, 'phase3', '/test/repo');

      const completedSession = await manager.completeValidationSession(sessionId);

      expect(completedSession.status).toBe('completed');
      expect(completedSession.endTime).toBeDefined();
      expect(completedSession.finalScore).toBeGreaterThan(0);
      expect(completedSession.finalPassed).toBe(true);
      expect(completedSession.summary.totalCheckpoints).toBe(3);
      expect(completedSession.summary.recommendations).toBeDefined();
    });

    it('should handle session completion with no checkpoints', async () => {
      const sessionId = await manager.startValidationSession('test-instance');

      const completedSession = await manager.completeValidationSession(sessionId);

      expect(completedSession.status).toBe('completed');
      expect(completedSession.finalScore).toBe(0);
      expect(completedSession.finalPassed).toBe(false);
      expect(completedSession.summary.totalCheckpoints).toBe(0);
    });

    it('should remove session from active sessions after completion', async () => {
      const sessionId = await manager.startValidationSession('test-instance');
      await manager.executeValidationCheckpoint(sessionId, 'phase1', '/test/repo');

      await manager.completeValidationSession(sessionId);

      const status = manager.getSessionStatus(sessionId);
      expect(status).toBeNull(); // Should be removed from active sessions
    });
  });

  describe('Score Calculation', () => {
    it('should calculate checkpoint score correctly for passing tests', async () => {
      const sessionId = await manager.startValidationSession('test-instance');

      const checkpoint = await manager.executeValidationCheckpoint(
        sessionId,
        'test-phase',
        '/test/repo'
      );

      // With 4/5 tests passing (80%), reliable execution, and successful parsing
      // Expected score: 80% * 60 (base) + 20 (reliability) + 15 (parsing) + validation score = 85
      expect(checkpoint.score).toBe(85);
    });

    it('should handle no tests found scenario', async () => {
      const sessionId = await manager.startValidationSession('test-instance');

      // Mock test executor to return no tests found
      const mockTestExecutor = manager['testExecutor'];
      mock.spyOn(mockTestExecutor, 'executeTests').mockResolvedValueOnce({
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        duration: 100,
        noTestsFound: true,
        frameworkDetected: 'jest',
        executionReliable: false,
        parsingSuccessful: false,
        validationScore: 0,
      });

      const checkpoint = await manager.executeValidationCheckpoint(
        sessionId,
        'no-tests-phase',
        '/test/repo'
      );

      expect(checkpoint.passed).toBe(false);
      expect(checkpoint.testResults.noTestsFound).toBe(true);
      expect(checkpoint.warnings).toContain('No tests found in repository');
    });
  });

  describe('Confidence Calculation', () => {
    it('should calculate high confidence for reliable execution', async () => {
      const sessionId = await manager.startValidationSession('test-instance');

      const checkpoint = await manager.executeValidationCheckpoint(
        sessionId,
        'reliable-phase',
        '/test/repo'
      );

      // Base 0.5 + 0.3 (reliable) + 0.2 (parsing) + 0.1 (framework) = 1.1 capped at 1.0
      expect(checkpoint.confidence).toBeGreaterThan(0.9);
    });

    it('should calculate low confidence for unreliable execution', async () => {
      const sessionId = await manager.startValidationSession('test-instance');

      // Mock unreliable execution
      const mockTestExecutor = manager['testExecutor'];
      mock.spyOn(mockTestExecutor, 'executeTests').mockResolvedValueOnce({
        total: 3,
        passed: 1,
        failed: 2,
        skipped: 0,
        duration: 500,
        noTestsFound: false,
        frameworkDetected: undefined,
        executionReliable: false,
        parsingSuccessful: false,
        validationScore: 30,
      });

      const checkpoint = await manager.executeValidationCheckpoint(
        sessionId,
        'unreliable-phase',
        '/test/repo'
      );

      expect(checkpoint.confidence).toBeLessThan(0.7);
    });
  });

  describe('Validation Report Generation', () => {
    it('should generate comprehensive validation report', async () => {
      const sessionId = await manager.startValidationSession('test-instance');

      await manager.executeValidationCheckpoint(sessionId, 'phase1', '/test/repo');
      await manager.executeValidationCheckpoint(sessionId, 'phase2', '/test/repo', undefined, 1);

      const completedSession = await manager.completeValidationSession(sessionId);

      const report = await manager.generateValidationReport(sessionId);

      expect(report).toContain('Validation Report');
      expect(report).toContain(sessionId);
      expect(report).toContain('test-instance');
      expect(report).toContain('Session Overview');
      expect(report).toContain('Summary Metrics');
      expect(report).toContain('Checkpoint Details');
      expect(report).toContain('phase1');
      expect(report).toContain('phase2');
    });

    it('should include recommendations in report', async () => {
      const sessionId = await manager.startValidationSession('test-instance');

      // Mock low-scoring execution to trigger recommendations
      const mockTestExecutor = manager['testExecutor'];
      mock.spyOn(mockTestExecutor, 'executeTests').mockResolvedValue({
        total: 10,
        passed: 3,
        failed: 7,
        skipped: 0,
        duration: 2000,
        noTestsFound: false,
        frameworkDetected: 'jest',
        executionReliable: false,
        parsingSuccessful: false,
        validationScore: 30,
      });

      await manager.executeValidationCheckpoint(sessionId, 'low-score-phase', '/test/repo');
      await manager.completeValidationSession(sessionId);

      const report = await manager.generateValidationReport(sessionId);

      expect(report).toContain('Recommendations');
      expect(report).toContain('improve test coverage');
    });
  });

  describe('Checkpoint History', () => {
    it('should maintain checkpoint history after session completion', async () => {
      const sessionId = await manager.startValidationSession('test-instance');

      await manager.executeValidationCheckpoint(sessionId, 'phase1', '/test/repo');
      await manager.executeValidationCheckpoint(sessionId, 'phase2', '/test/repo');

      await manager.completeValidationSession(sessionId);

      const history = manager.getCheckpointHistory(sessionId);
      expect(history).toHaveLength(2);
      expect(history[0].phase).toBe('phase1');
      expect(history[1].phase).toBe('phase2');
    });

    it('should return empty array for non-existent session history', () => {
      const history = manager.getCheckpointHistory('non-existent');
      expect(history).toEqual([]);
    });
  });

  describe('Error Handling', () => {
    it('should throw error for executing checkpoint on non-existent session', async () => {
      await expect(
        manager.executeValidationCheckpoint('non-existent-session', 'test-phase', '/test/repo')
      ).rejects.toThrow('Validation session not found');
    });

    it('should throw error for completing non-existent session', async () => {
      await expect(manager.completeValidationSession('non-existent-session')).rejects.toThrow(
        'Validation session not found'
      );
    });

    it('should throw error for generating report of non-existent session', async () => {
      await expect(manager.generateValidationReport('non-existent-session')).rejects.toThrow(
        'Session not found'
      );
    });
  });

  describe('Trend Analysis', () => {
    it('should detect increasing trend in checkpoint scores', async () => {
      const sessionId = await manager.startValidationSession('test-instance');

      // Mock progressive improvement in scores
      const mockTestExecutor = manager['testExecutor'];

      // First checkpoint - score 60
      mock.spyOn(mockTestExecutor, 'executeTests').mockResolvedValueOnce({
        total: 5,
        passed: 3,
        failed: 2,
        skipped: 0,
        duration: 1000,
        noTestsFound: false,
        frameworkDetected: 'jest',
        executionReliable: true,
        parsingSuccessful: true,
        validationScore: 60,
      });
      await manager.executeValidationCheckpoint(sessionId, 'phase1', '/test/repo');

      // Second checkpoint - score 75
      mock.spyOn(mockTestExecutor, 'executeTests').mockResolvedValueOnce({
        total: 5,
        passed: 4,
        failed: 1,
        skipped: 0,
        duration: 1000,
        noTestsFound: false,
        frameworkDetected: 'jest',
        executionReliable: true,
        parsingSuccessful: true,
        validationScore: 75,
      });
      await manager.executeValidationCheckpoint(sessionId, 'phase2', '/test/repo');

      // Third checkpoint - score 90
      mock.spyOn(mockTestExecutor, 'executeTests').mockResolvedValueOnce({
        total: 5,
        passed: 5,
        failed: 0,
        skipped: 0,
        duration: 1000,
        noTestsFound: false,
        frameworkDetected: 'jest',
        executionReliable: true,
        parsingSuccessful: true,
        validationScore: 90,
      });
      await manager.executeValidationCheckpoint(sessionId, 'phase3', '/test/repo');

      const completedSession = await manager.completeValidationSession(sessionId);

      expect(completedSession.summary.improvementTrend).toBe('increasing');
    });

    it('should detect stable trend when scores are consistent', async () => {
      const sessionId = await manager.startValidationSession('test-instance');

      // Execute checkpoints with similar scores (85, 85, 85)
      await manager.executeValidationCheckpoint(sessionId, 'phase1', '/test/repo');
      await manager.executeValidationCheckpoint(sessionId, 'phase2', '/test/repo');
      await manager.executeValidationCheckpoint(sessionId, 'phase3', '/test/repo');

      const completedSession = await manager.completeValidationSession(sessionId);

      expect(completedSession.summary.improvementTrend).toBe('stable');
    });
  });
});
