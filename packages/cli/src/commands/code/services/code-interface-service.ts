import { elizaLogger } from '@elizaos/core';
import type { TelemetryService } from './telemetry-service.js';
import type { ErrorLogService } from './error-log-service.js';

export interface CodeInterfaceServiceOptions {
  telemetryService: TelemetryService;
  errorLogService: ErrorLogService;
  debug?: boolean;
}

export interface CodeInterfaceStatus {
  ready: boolean;
  currentMode: 'single' | 'swarm';
  activeCommands: number;
  sessionDuration: number;
  totalInteractions: number;
  lastActivity: string;
}

export interface CodeInterfaceMetrics {
  commandsExecuted: number;
  codeGenerated: number;
  testsRun: number;
  errorsHandled: number;
  averageResponseTime: number;
  successRate: number;
}

export class CodeInterfaceService {
  private options: CodeInterfaceServiceOptions;
  private telemetryService: TelemetryService;
  private errorLogService: ErrorLogService;
  private isInitialized = false;
  private sessionStartTime: number;
  private metrics: CodeInterfaceMetrics = {
    commandsExecuted: 0,
    codeGenerated: 0,
    testsRun: 0,
    errorsHandled: 0,
    averageResponseTime: 0,
    successRate: 0,
  };
  private responseTimes: number[] = [];

  constructor(options: CodeInterfaceServiceOptions) {
    this.options = options;
    this.telemetryService = options.telemetryService;
    this.errorLogService = options.errorLogService;
    this.sessionStartTime = Date.now();
  }

  async initialize(): Promise<void> {
    try {
      elizaLogger.info('Initializing Code Interface Service...');

      await this.telemetryService.logEvent('code_interface_service_initialized', {
        timestamp: new Date().toISOString(),
        sessionId: this.getSessionId(),
      }, 'code-interface');

      this.isInitialized = true;
      elizaLogger.info('✅ Code Interface Service initialized');
    } catch (error) {
      elizaLogger.error('Failed to initialize Code Interface Service:', error);
      throw error;
    }
  }

  async recordCommand(command: string, duration: number, success: boolean): Promise<void> {
    if (!this.isInitialized) return;

    try {
      this.metrics.commandsExecuted++;
      this.responseTimes.push(duration);
      
      if (success) {
        this.updateSuccessRate();
      } else {
        this.metrics.errorsHandled++;
      }

      this.updateAverageResponseTime();

      await this.telemetryService.logEvent('command_executed', {
        command: command.substring(0, 50), // Truncate for privacy
        duration,
        success,
        totalCommands: this.metrics.commandsExecuted,
        sessionDuration: this.getSessionDuration(),
      }, 'code-interface');

      if (this.options.debug) {
        elizaLogger.debug(`Command recorded: ${command} (${duration}ms, success: ${success})`);
      }
    } catch (error) {
      await this.errorLogService.logError('Failed to record command', error, {
        command: command.substring(0, 50),
        duration,
        success,
      }, 'code-interface');
    }
  }

  async recordCodeGeneration(linesGenerated: number, language: string): Promise<void> {
    if (!this.isInitialized) return;

    try {
      this.metrics.codeGenerated++;

      await this.telemetryService.logEvent('code_generated', {
        linesGenerated,
        language,
        totalCodeGenerated: this.metrics.codeGenerated,
        sessionDuration: this.getSessionDuration(),
      }, 'code-interface');

      if (this.options.debug) {
        elizaLogger.debug(`Code generation recorded: ${linesGenerated} lines of ${language}`);
      }
    } catch (error) {
      await this.errorLogService.logError('Failed to record code generation', error, {
        linesGenerated,
        language,
      }, 'code-interface');
    }
  }

  async recordTestExecution(testCount: number, passed: number, failed: number): Promise<void> {
    if (!this.isInitialized) return;

    try {
      this.metrics.testsRun++;

      await this.telemetryService.logEvent('tests_executed', {
        testCount,
        passed,
        failed,
        successRate: passed / testCount,
        totalTestsRun: this.metrics.testsRun,
        sessionDuration: this.getSessionDuration(),
      }, 'code-interface');

      if (this.options.debug) {
        elizaLogger.debug(`Test execution recorded: ${passed}/${testCount} passed`);
      }
    } catch (error) {
      await this.errorLogService.logError('Failed to record test execution', error, {
        testCount,
        passed,
        failed,
      }, 'code-interface');
    }
  }

  async getStatus(): Promise<CodeInterfaceStatus> {
    return {
      ready: this.isInitialized,
      currentMode: 'single', // Will be determined by swarm orchestrator
      activeCommands: 0, // Will be tracked by active operations
      sessionDuration: this.getSessionDuration(),
      totalInteractions: this.metrics.commandsExecuted,
      lastActivity: new Date().toISOString(),
    };
  }

  async getMetrics(): Promise<CodeInterfaceMetrics> {
    return { ...this.metrics };
  }

  async exportSession(): Promise<{
    sessionId: string;
    startTime: number;
    duration: number;
    metrics: CodeInterfaceMetrics;
    status: CodeInterfaceStatus;
  }> {
    return {
      sessionId: this.getSessionId(),
      startTime: this.sessionStartTime,
      duration: this.getSessionDuration(),
      metrics: await this.getMetrics(),
      status: await this.getStatus(),
    };
  }

  private getSessionId(): string {
    return `code-session-${this.sessionStartTime}`;
  }

  private getSessionDuration(): number {
    return Date.now() - this.sessionStartTime;
  }

  private updateAverageResponseTime(): void {
    if (this.responseTimes.length === 0) return;
    
    const sum = this.responseTimes.reduce((acc, time) => acc + time, 0);
    this.metrics.averageResponseTime = sum / this.responseTimes.length;

    // Keep only last 100 response times to prevent memory growth
    if (this.responseTimes.length > 100) {
      this.responseTimes = this.responseTimes.slice(-100);
    }
  }

  private updateSuccessRate(): void {
    const totalAttempts = this.metrics.commandsExecuted;
    const successes = totalAttempts - this.metrics.errorsHandled;
    this.metrics.successRate = totalAttempts > 0 ? successes / totalAttempts : 0;
  }

  async stop(): Promise<void> {
    try {
      elizaLogger.info('Stopping Code Interface Service...');

      const sessionExport = await this.exportSession();
      await this.telemetryService.logEvent('code_interface_service_stopped', {
        sessionExport,
        timestamp: new Date().toISOString(),
      }, 'code-interface');

      this.isInitialized = false;
      elizaLogger.info('✅ Code Interface Service stopped');
    } catch (error) {
      elizaLogger.error('Error stopping Code Interface Service:', error);
    }
  }
}