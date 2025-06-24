import { elizaLogger } from '@elizaos/core';
import * as fs from 'fs/promises';
import * as path from 'path';
import type { TestResults, TestFailure, ValidationDetails } from '../types';
import { DEFAULT_VALIDATION_CONFIG, type ValidationConfig } from '../config/validation-config';
import { TestExecutor } from './test-executor';
import { ResultParser } from './result-parser';

/**
 * Validation checkpoint metadata
 */
export interface ValidationCheckpoint {
  id: string;
  phase: string;
  iteration?: number;
  timestamp: number;
  passed: boolean;
  score: number;
  confidence: number;
  executionTime: number;
  testResults: TestResults;
  details: CheckpointDetails;
  warnings: string[];
  errors: string[];
}

/**
 * Detailed checkpoint information
 */
interface CheckpointDetails {
  frameworkDetected: string;
  testFrameworkDetected: string;
  parsingMethod: string;
  validationReliable: boolean;
  noTestsFound: boolean;
  compilation: {
    success: boolean;
    errors: string[];
    warnings: string[];
  };
  execution: {
    reliable: boolean;
    duration: number;
    framework: string;
    command: string;
  };
  parsing: {
    successful: boolean;
    confidence: number;
    method: string;
    warnings: string[];
  };
  metadata: Record<string, any>;
}

/**
 * Checkpoint management configuration
 */
interface CheckpointConfig {
  enableCheckpoints: boolean;
  persistCheckpoints: boolean;
  checkpointDir: string;
  maxCheckpoints: number;
  cleanupOldCheckpoints: boolean;
  enableProgressiveFixes: boolean;
  autoAdvance: boolean;
  requireMinimumScore: boolean;
  minimumPassingScore: number;
}

/**
 * Validation session for tracking multiple checkpoints
 */
interface ValidationSession {
  sessionId: string;
  instanceId: string;
  startTime: number;
  endTime?: number;
  checkpoints: ValidationCheckpoint[];
  status: 'active' | 'completed' | 'failed' | 'aborted';
  finalScore: number;
  finalPassed: boolean;
  summary: SessionSummary;
}

/**
 * Session summary metrics
 */
interface SessionSummary {
  totalCheckpoints: number;
  passedCheckpoints: number;
  failedCheckpoints: number;
  averageScore: number;
  averageConfidence: number;
  totalExecutionTime: number;
  mostReliablePhase: string;
  leastReliablePhase: string;
  improvementTrend: 'increasing' | 'decreasing' | 'stable' | 'volatile';
  recommendations: string[];
}

/**
 * Enhanced validation checkpoint manager with comprehensive test execution coordination
 */
export class CheckpointManager {
  private config: ValidationConfig;
  private checkpointConfig: CheckpointConfig;
  private testExecutor: TestExecutor;
  private resultParser: ResultParser;
  private activeSessions: Map<string, ValidationSession>;
  private checkpointHistory: Map<string, ValidationCheckpoint[]>;

  constructor(
    config: ValidationConfig = DEFAULT_VALIDATION_CONFIG,
    checkpointConfig?: Partial<CheckpointConfig>
  ) {
    this.config = config;
    this.checkpointConfig = {
      enableCheckpoints: true,
      persistCheckpoints: true,
      checkpointDir: '.validation-checkpoints',
      maxCheckpoints: 50,
      cleanupOldCheckpoints: true,
      enableProgressiveFixes: true,
      autoAdvance: false,
      requireMinimumScore: true,
      minimumPassingScore: 70,
      ...checkpointConfig,
    };

    this.testExecutor = new TestExecutor(config);
    this.resultParser = new ResultParser(config);
    this.activeSessions = new Map();
    this.checkpointHistory = new Map();
  }

  /**
   * Start a new validation session
   */
  async startValidationSession(instanceId: string): Promise<string> {
    const sessionId = this.generateSessionId(instanceId);
    elizaLogger.info(`[CHECKPOINT-MANAGER] Starting validation session: ${sessionId}`);

    const session: ValidationSession = {
      sessionId,
      instanceId,
      startTime: Date.now(),
      checkpoints: [],
      status: 'active',
      finalScore: 0,
      finalPassed: false,
      summary: {
        totalCheckpoints: 0,
        passedCheckpoints: 0,
        failedCheckpoints: 0,
        averageScore: 0,
        averageConfidence: 0,
        totalExecutionTime: 0,
        mostReliablePhase: '',
        leastReliablePhase: '',
        improvementTrend: 'stable',
        recommendations: [],
      },
    };

    this.activeSessions.set(sessionId, session);

    // Create checkpoint directory if persistence is enabled
    if (this.checkpointConfig.persistCheckpoints) {
      await this.ensureCheckpointDirectory(sessionId);
    }

    return sessionId;
  }

  /**
   * Execute validation checkpoint with enhanced testing
   */
  async executeValidationCheckpoint(
    sessionId: string,
    phase: string,
    repoPath: string,
    testPatch?: string,
    iteration?: number
  ): Promise<ValidationCheckpoint> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Validation session not found: ${sessionId}`);
    }

    const checkpointId = this.generateCheckpointId(sessionId, phase, iteration);
    const startTime = Date.now();

    elizaLogger.info(`[CHECKPOINT-MANAGER] Executing validation checkpoint: ${checkpointId}`);

    try {
      // Execute tests using enhanced test executor
      const testResults = await this.testExecutor.executeTests(repoPath, testPatch);

      // Calculate checkpoint score and confidence
      const score = this.calculateCheckpointScore(testResults);
      const confidence = this.calculateConfidence(testResults);
      const passed = this.determineCheckpointPassed(testResults, score);

      // Create checkpoint details
      const details = await this.createCheckpointDetails(repoPath, testResults);

      // Create validation checkpoint
      const checkpoint: ValidationCheckpoint = {
        id: checkpointId,
        phase,
        iteration,
        timestamp: startTime,
        passed,
        score,
        confidence,
        executionTime: Date.now() - startTime,
        testResults,
        details,
        warnings: this.extractWarnings(testResults, details),
        errors: this.extractErrors(testResults, details),
      };

      // Add checkpoint to session
      session.checkpoints.push(checkpoint);

      // Update session status
      await this.updateSessionProgress(sessionId, checkpoint);

      // Persist checkpoint if enabled
      if (this.checkpointConfig.persistCheckpoints) {
        await this.persistCheckpoint(sessionId, checkpoint);
      }

      elizaLogger.info(
        `[CHECKPOINT-MANAGER] Checkpoint completed: ${checkpointId} (passed: ${passed}, score: ${score})`
      );

      return checkpoint;
    } catch (error) {
      elizaLogger.error(`[CHECKPOINT-MANAGER] Checkpoint execution failed: ${error}`);

      // Create failure checkpoint
      const failureCheckpoint: ValidationCheckpoint = {
        id: checkpointId,
        phase,
        iteration,
        timestamp: startTime,
        passed: false,
        score: 0,
        confidence: 0,
        executionTime: Date.now() - startTime,
        testResults: this.createFailureResults(
          error instanceof Error ? error.message : String(error)
        ),
        details: this.createFailureDetails(
          error instanceof Error ? error : new Error(String(error))
        ),
        warnings: [],
        errors: [
          error instanceof Error
            ? error.message
            : String(error) || 'Unknown checkpoint execution error',
        ],
      };

      session.checkpoints.push(failureCheckpoint);
      return failureCheckpoint;
    }
  }

  /**
   * Complete validation session and generate summary
   */
  async completeValidationSession(sessionId: string): Promise<ValidationSession> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Validation session not found: ${sessionId}`);
    }

    elizaLogger.info(`[CHECKPOINT-MANAGER] Completing validation session: ${sessionId}`);

    // Update session end time and status
    session.endTime = Date.now();
    session.status = 'completed';

    // Calculate final metrics
    session.finalScore = this.calculateFinalScore(session.checkpoints);
    session.finalPassed = this.determineFinalPassed(session.checkpoints, session.finalScore);

    // Generate comprehensive summary
    session.summary = await this.generateSessionSummary(session);

    // Store session in history
    this.checkpointHistory.set(sessionId, session.checkpoints);

    // Persist session summary if enabled
    if (this.checkpointConfig.persistCheckpoints) {
      await this.persistSessionSummary(sessionId, session);
    }

    // Clean up active session
    this.activeSessions.delete(sessionId);

    // Clean up old checkpoints if enabled
    if (this.checkpointConfig.cleanupOldCheckpoints) {
      await this.cleanupOldCheckpoints();
    }

    elizaLogger.info(
      `[CHECKPOINT-MANAGER] Session completed: ${sessionId} (final score: ${session.finalScore}, passed: ${session.finalPassed})`
    );

    return session;
  }

  /**
   * Get validation session status and progress
   */
  getSessionStatus(sessionId: string): ValidationSession | null {
    return this.activeSessions.get(sessionId) || null;
  }

  /**
   * Get checkpoint history for analysis
   */
  getCheckpointHistory(sessionId: string): ValidationCheckpoint[] {
    return this.checkpointHistory.get(sessionId) || [];
  }

  /**
   * Generate validation report for debugging and optimization
   */
  async generateValidationReport(sessionId: string): Promise<string> {
    const session =
      this.activeSessions.get(sessionId) || (await this.loadSessionFromHistory(sessionId));

    // Throw error if session not found
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const reportSession: ValidationSession = session;

    // Ensure session has checkpoints array
    if (!reportSession.checkpoints) {
      reportSession.checkpoints = [];
    }

    // Ensure session has summary
    if (!reportSession.summary) {
      reportSession.summary = {
        totalCheckpoints: 0,
        passedCheckpoints: 0,
        failedCheckpoints: 0,
        averageScore: 0,
        averageConfidence: 0,
        totalExecutionTime: 0,
        mostReliablePhase: '',
        leastReliablePhase: '',
        improvementTrend: 'stable',
        recommendations: [],
      };
    }

    const report = [
      `# Validation Report for Session: ${sessionId}`,
      '',
      '## Session Overview',
      `- Instance ID: ${reportSession.instanceId}`,
      `- Start Time: ${this.formatTimestamp(reportSession.startTime)}`,
      `- End Time: ${this.formatTimestamp(reportSession.endTime)}`,
      `- Status: ${reportSession.status}`,
      `- Final Score: ${reportSession.finalScore}`,
      `- Final Passed: ${reportSession.finalPassed}`,
      '',
      '## Summary Metrics',
      `- Total Checkpoints: ${reportSession.summary.totalCheckpoints}`,
      `- Passed Checkpoints: ${reportSession.summary.passedCheckpoints}`,
      `- Failed Checkpoints: ${reportSession.summary.failedCheckpoints}`,
      `- Average Score: ${reportSession.summary.averageScore.toFixed(2)}`,
      `- Average Confidence: ${reportSession.summary.averageConfidence.toFixed(2)}`,
      `- Total Execution Time: ${reportSession.summary.totalExecutionTime}ms`,
      `- Improvement Trend: ${reportSession.summary.improvementTrend}`,
      '',
      '## Checkpoint Details',
    ];

    // Add detailed checkpoint information
    if (reportSession.checkpoints.length > 0) {
      for (const checkpoint of reportSession.checkpoints) {
        report.push(
          `### ${checkpoint.phase} (${checkpoint.iteration ? `Iteration ${checkpoint.iteration}` : 'Initial'})`
        );
        report.push(`- **Status**: ${checkpoint.passed ? '✅ PASSED' : '❌ FAILED'}`);
        report.push(`- **Score**: ${checkpoint.score.toFixed(2)}`);
        report.push(`- **Confidence**: ${checkpoint.confidence.toFixed(2)}`);
        report.push(`- **Execution Time**: ${checkpoint.executionTime}ms`);
        report.push(
          `- **Tests**: ${checkpoint.testResults.passed}/${checkpoint.testResults.total} passed`
        );

        if (checkpoint.errors?.length > 0) {
          report.push(`- **Errors**: ${checkpoint.errors.join(', ')}`);
        }

        if (checkpoint.warnings?.length > 0) {
          report.push(`- **Warnings**: ${checkpoint.warnings.join(', ')}`);
        }

        report.push('');
      }
    } else {
      report.push('No checkpoints executed');
      report.push('');
    }

    // Add recommendations
    if (reportSession.summary?.recommendations?.length > 0) {
      report.push('## Recommendations');
      for (const recommendation of reportSession.summary.recommendations) {
        report.push(`- ${recommendation}`);
      }
      report.push('');
    }

    return report.join('\n');
  }

  /**
   * Calculate checkpoint score based on test results and validation metrics
   */
  private calculateCheckpointScore(testResults: TestResults): number {
    let score = 0;

    // Base score from test pass rate
    if (testResults.total > 0) {
      const passRate = testResults.passed / testResults.total;
      score += passRate * 60; // 60% weight for test pass rate
    }

    // Bonus for execution reliability
    if (testResults.executionReliable) {
      score += 20; // 20% bonus for reliable execution
    }

    // Bonus for successful parsing
    if (testResults.parsingSuccessful) {
      score += 15; // 15% bonus for successful parsing
    }

    // Penalty for no tests found
    if (testResults.noTestsFound && !this.config.validation.allowNoTestsAsSuccess) {
      score -= 30; // 30% penalty for no tests
    }

    // Apply validation score if available
    if (testResults.validationScore !== undefined) {
      score = Math.max(score, testResults.validationScore);
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate confidence based on test execution metadata
   */
  private calculateConfidence(testResults: TestResults): number {
    let confidence = 0.5; // Base confidence

    // Increase confidence for reliable execution
    if (testResults.executionReliable) {
      confidence += 0.3;
    }

    // Increase confidence for successful parsing
    if (testResults.parsingSuccessful) {
      confidence += 0.2;
    }

    // Decrease confidence for no tests found
    if (testResults.noTestsFound) {
      confidence -= 0.4;
    }

    // Adjust based on framework detection
    if (testResults.frameworkDetected) {
      confidence += 0.1;
    }

    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Determine if checkpoint passed based on results and configuration
   */
  private determineCheckpointPassed(testResults: TestResults, score: number): boolean {
    // Check minimum score requirement
    if (
      this.checkpointConfig.requireMinimumScore &&
      score < this.checkpointConfig.minimumPassingScore
    ) {
      return false;
    }

    // Check if no tests found and that's not allowed as success
    if (testResults.noTestsFound && !this.config.validation.allowNoTestsAsSuccess) {
      return false;
    }

    // Check test pass rate
    if (testResults.total > 0) {
      const failureRate = testResults.failed / testResults.total;
      if (failureRate > this.config.validation.maxFailureRate) {
        return false;
      }
    }

    // Check execution reliability
    if (!testResults.executionReliable) {
      return false;
    }

    return true;
  }

  /**
   * Create detailed checkpoint information
   */
  private async createCheckpointDetails(
    repoPath: string,
    testResults: TestResults
  ): Promise<CheckpointDetails> {
    return {
      frameworkDetected: testResults.frameworkDetected || 'unknown',
      testFrameworkDetected: testResults.frameworkDetected || 'unknown',
      parsingMethod: 'enhanced',
      validationReliable: testResults.executionReliable || false,
      noTestsFound: testResults.noTestsFound || false,
      compilation: {
        success: true, // Assume compilation succeeded if tests ran
        errors: [],
        warnings: [],
      },
      execution: {
        reliable: testResults.executionReliable || false,
        duration: testResults.duration,
        framework: testResults.frameworkDetected || 'unknown',
        command: 'enhanced-test-executor',
      },
      parsing: {
        successful: testResults.parsingSuccessful || false,
        confidence: testResults.validationScore ? testResults.validationScore / 100 : 0.5,
        method: 'enhanced',
        warnings: [],
      },
      metadata: {
        validationScore: testResults.validationScore,
        executionReliable: testResults.executionReliable,
        parsingSuccessful: testResults.parsingSuccessful,
      },
    };
  }

  /**
   * Extract warnings from test results and checkpoint details
   */
  private extractWarnings(testResults: TestResults, details: CheckpointDetails): string[] {
    const warnings: string[] = [];

    if (testResults.noTestsFound) {
      warnings.push('No tests found in repository');
    }

    if (!testResults.executionReliable) {
      warnings.push('Test execution may not be reliable');
    }

    if (!testResults.parsingSuccessful) {
      warnings.push('Test result parsing was not fully successful');
    }

    if (testResults.total === 0) {
      warnings.push('No test results to validate');
    }

    return warnings;
  }

  /**
   * Extract errors from test results and checkpoint details
   */
  private extractErrors(testResults: TestResults, details: CheckpointDetails): string[] {
    const errors: string[] = [];

    if (testResults.failures && testResults.failures.length > 0) {
      for (const failure of testResults.failures) {
        errors.push(`Test failure: ${failure.test_name} - ${failure.error_message}`);
      }
    }

    return errors;
  }

  /**
   * Update session progress and metrics
   */
  private async updateSessionProgress(
    sessionId: string,
    checkpoint: ValidationCheckpoint
  ): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {return;}

    // Update summary metrics
    session.summary.totalCheckpoints = session.checkpoints.length;
    session.summary.passedCheckpoints = session.checkpoints.filter((c) => c.passed).length;
    session.summary.failedCheckpoints = session.checkpoints.filter((c) => !c.passed).length;
    session.summary.averageScore =
      session.checkpoints.reduce((sum, c) => sum + c.score, 0) / session.checkpoints.length;
    session.summary.averageConfidence =
      session.checkpoints.reduce((sum, c) => sum + c.confidence, 0) / session.checkpoints.length;
    session.summary.totalExecutionTime = session.checkpoints.reduce(
      (sum, c) => sum + c.executionTime,
      0
    );

    // Determine improvement trend
    if (session.checkpoints.length >= 3) {
      const recentScores = session.checkpoints.slice(-3).map((c) => c.score);
      const trend = this.calculateTrend(recentScores);
      session.summary.improvementTrend = trend;
    }
  }

  /**
   * Calculate final score for the entire session
   */
  private calculateFinalScore(checkpoints: ValidationCheckpoint[]): number {
    if (checkpoints.length === 0) {return 0;}

    // Use weighted average with more weight on recent checkpoints
    let totalWeight = 0;
    let weightedSum = 0;

    for (let i = 0; i < checkpoints.length; i++) {
      const weight = Math.pow(1.2, i); // Exponential weight increase for recent checkpoints
      weightedSum += checkpoints[i].score * weight;
      totalWeight += weight;
    }

    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  /**
   * Determine if final session passed
   */
  private determineFinalPassed(checkpoints: ValidationCheckpoint[], finalScore: number): boolean {
    if (checkpoints.length === 0) {return false;}

    // Check if minimum score requirement is met
    if (
      this.checkpointConfig.requireMinimumScore &&
      finalScore < this.checkpointConfig.minimumPassingScore
    ) {
      return false;
    }

    // Check if at least one checkpoint passed
    const anyPassed = checkpoints.some((c) => c.passed);
    if (!anyPassed) {return false;}

    // Check if the latest checkpoint passed (most important)
    const latestCheckpoint = checkpoints[checkpoints.length - 1];
    return latestCheckpoint.passed;
  }

  /**
   * Generate comprehensive session summary
   */
  private async generateSessionSummary(session: ValidationSession): Promise<SessionSummary> {
    const checkpoints = session.checkpoints;
    const summary: SessionSummary = {
      totalCheckpoints: checkpoints.length,
      passedCheckpoints: checkpoints.filter((c) => c.passed).length,
      failedCheckpoints: checkpoints.filter((c) => !c.passed).length,
      averageScore: checkpoints.reduce((sum, c) => sum + c.score, 0) / checkpoints.length || 0,
      averageConfidence:
        checkpoints.reduce((sum, c) => sum + c.confidence, 0) / checkpoints.length || 0,
      totalExecutionTime: checkpoints.reduce((sum, c) => sum + c.executionTime, 0),
      mostReliablePhase: '',
      leastReliablePhase: '',
      improvementTrend: 'stable',
      recommendations: [],
    };

    // Find most and least reliable phases
    const phaseScores = new Map<string, number[]>();
    for (const checkpoint of checkpoints) {
      if (!phaseScores.has(checkpoint.phase)) {
        phaseScores.set(checkpoint.phase, []);
      }
      phaseScores.get(checkpoint.phase)!.push(checkpoint.score);
    }

    let highestAverage = 0;
    let lowestAverage = 100;
    for (const [phase, scores] of phaseScores) {
      const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
      if (average > highestAverage) {
        highestAverage = average;
        summary.mostReliablePhase = phase;
      }
      if (average < lowestAverage) {
        lowestAverage = average;
        summary.leastReliablePhase = phase;
      }
    }

    // Calculate improvement trend
    if (checkpoints.length >= 3) {
      const scores = checkpoints.map((c) => c.score);
      summary.improvementTrend = this.calculateTrend(scores);
    }

    // Generate recommendations
    summary.recommendations = this.generateRecommendations(session);

    return summary;
  }

  /**
   * Calculate trend from score sequence
   */
  private calculateTrend(scores: number[]): 'increasing' | 'decreasing' | 'stable' | 'volatile' {
    if (scores.length < 2) {return 'stable';}

    const differences: number[] = [];
    for (let i = 1; i < scores.length; i++) {
      differences.push(scores[i] - scores[i - 1]);
    }

    const avgDifference = differences.reduce((sum, diff) => sum + diff, 0) / differences.length;
    const variance =
      differences.reduce((sum, diff) => sum + Math.pow(diff - avgDifference, 2), 0) /
      differences.length;

    if (variance > 100) {return 'volatile';} // High variance indicates volatility
    if (avgDifference > 5) {return 'increasing';}
    if (avgDifference < -5) {return 'decreasing';}
    return 'stable';
  }

  /**
   * Generate recommendations based on session analysis
   */
  private generateRecommendations(session: ValidationSession): string[] {
    const recommendations: string[] = [];
    const checkpoints = session.checkpoints;

    if (session.summary.averageScore < 70) {
      recommendations.push('Consider improving test coverage and implementation quality');
    }

    if (session.summary.averageConfidence < 0.7) {
      recommendations.push('Improve test execution reliability and result parsing');
    }

    const noTestsCheckpoints = checkpoints.filter((c) => c.testResults.noTestsFound);
    if (noTestsCheckpoints.length > 0) {
      recommendations.push('Ensure test files are properly configured and discoverable');
    }

    const unreliableCheckpoints = checkpoints.filter((c) => !c.testResults.executionReliable);
    if (unreliableCheckpoints.length > 0) {
      recommendations.push('Investigate test execution environment and framework compatibility');
    }

    if (session.summary.improvementTrend === 'decreasing') {
      recommendations.push('Review recent changes as performance appears to be declining');
    }

    if (session.summary.improvementTrend === 'volatile') {
      recommendations.push('Test execution is inconsistent - investigate environmental factors');
    }

    return recommendations;
  }

  /**
   * Create failure test results
   */
  private createFailureResults(errorMessage: string): TestResults {
    return {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      duration: 0,
      failures: [
        {
          test_name: 'checkpoint-execution',
          error_message: errorMessage,
        },
      ],
      noTestsFound: true,
      frameworkDetected: 'unknown',
      executionReliable: false,
      parsingSuccessful: false,
      validationScore: 0,
    };
  }

  /**
   * Create failure checkpoint details
   */
  private createFailureDetails(error: Error): CheckpointDetails {
    return {
      frameworkDetected: 'unknown',
      testFrameworkDetected: 'unknown',
      parsingMethod: 'failure',
      validationReliable: false,
      noTestsFound: true,
      compilation: {
        success: false,
        errors: [error.message],
        warnings: [],
      },
      execution: {
        reliable: false,
        duration: 0,
        framework: 'unknown',
        command: 'failed',
      },
      parsing: {
        successful: false,
        confidence: 0,
        method: 'failure',
        warnings: [],
      },
      metadata: {
        error: error.message,
      },
    };
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(instanceId: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `${instanceId}-${timestamp}-${random}`;
  }

  /**
   * Generate unique checkpoint ID
   */
  private generateCheckpointId(sessionId: string, phase: string, iteration?: number): string {
    const iterationSuffix = iteration !== undefined ? `-i${iteration}` : '';
    return `${sessionId}-${phase}${iterationSuffix}`;
  }

  /**
   * Ensure checkpoint directory exists
   */
  private async ensureCheckpointDirectory(sessionId: string): Promise<void> {
    const dir = path.join(this.checkpointConfig.checkpointDir, sessionId);
    await fs.mkdir(dir, { recursive: true });
  }

  /**
   * Persist checkpoint to disk
   */
  private async persistCheckpoint(
    sessionId: string,
    checkpoint: ValidationCheckpoint
  ): Promise<void> {
    const filePath = path.join(
      this.checkpointConfig.checkpointDir,
      sessionId,
      `${checkpoint.id}.json`
    );
    await fs.writeFile(filePath, JSON.stringify(checkpoint, null, 2));
  }

  /**
   * Persist session summary to disk
   */
  private async persistSessionSummary(
    sessionId: string,
    session: ValidationSession
  ): Promise<void> {
    const filePath = path.join(this.checkpointConfig.checkpointDir, sessionId, 'summary.json');
    await fs.writeFile(filePath, JSON.stringify(session, null, 2));
  }

  /**
   * Load session from history
   */
  private async loadSessionFromHistory(sessionId: string): Promise<ValidationSession | null> {
    try {
      const filePath = path.join(this.checkpointConfig.checkpointDir, sessionId, 'summary.json');
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content) as ValidationSession;
    } catch (error) {
      return null;
    }
  }

  /**
   * Clean up old checkpoints based on configuration
   */
  private async cleanupOldCheckpoints(): Promise<void> {
    try {
      const checkpointDir = this.checkpointConfig.checkpointDir;
      const entries = await fs.readdir(checkpointDir, { withFileTypes: true });
      const sessionDirs = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);

      if (sessionDirs.length > this.checkpointConfig.maxCheckpoints) {
        // Sort by timestamp (assuming session IDs contain timestamps)
        sessionDirs.sort();

        // Remove oldest sessions
        const toRemove = sessionDirs.slice(
          0,
          sessionDirs.length - this.checkpointConfig.maxCheckpoints
        );
        for (const sessionDir of toRemove) {
          const dirPath = path.join(checkpointDir, sessionDir);
          await fs.rm(dirPath, { recursive: true, force: true });
        }

        elizaLogger.info(
          `[CHECKPOINT-MANAGER] Cleaned up ${toRemove.length} old checkpoint sessions`
        );
      }
    } catch (error) {
      elizaLogger.warn(`[CHECKPOINT-MANAGER] Failed to cleanup old checkpoints: ${error}`);
    }
  }

  /**
   * Safely format timestamp for display
   */
  private formatTimestamp(timestamp?: number): string {
    if (!timestamp || !Number.isFinite(timestamp) || timestamp <= 0) {
      return 'Invalid time';
    }

    try {
      return new Date(timestamp).toISOString();
    } catch (error) {
      return `Invalid time (${timestamp})`;
    }
  }
}
