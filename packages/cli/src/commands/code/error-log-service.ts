import { elizaLogger } from '@elizaos/core';
import { promises as fs } from 'fs';
import path from 'path';

export interface ErrorLogServiceOptions {
  logFile: string;
  debug: boolean;
  maxLogSize?: number;
  retentionDays?: number;
  includeStackTraces?: boolean;
}

export interface ErrorLogEntry {
  id: string;
  timestamp: string;
  message: string;
  error?: string;
  stack?: string;
  context?: Record<string, any>;
  severity: 'error' | 'warning' | 'critical';
  component?: string;
  sessionId?: string;
  resolved?: boolean;
  resolvedAt?: string;
  resolvedBy?: string;
}

export interface ErrorLogMetrics {
  totalErrors: number;
  errorsByComponent: Record<string, number>;
  errorsBySeverity: Record<string, number>;
  recentErrors: ErrorLogEntry[];
  errorRate: number;
  criticalErrors: number;
  unresolvedErrors: number;
}

export class ErrorLogService {
  private options: ErrorLogServiceOptions;
  private logFile: string;
  private errors: ErrorLogEntry[] = [];
  private isRunning = false;
  private sessionId: string;

  constructor(options: ErrorLogServiceOptions) {
    this.options = {
      maxLogSize: 5 * 1024 * 1024, // 5MB default
      retentionDays: 7, // Keep errors for 7 days
      includeStackTraces: true,
      ...options,
    };

    this.logFile = path.resolve(this.options.logFile);
    this.sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  async start(): Promise<void> {
    try {
      elizaLogger.info('Starting Error Log Service...');

      this.isRunning = true;

      // Load existing errors
      await this.loadExistingErrors();

      // Set up periodic cleanup
      setInterval(() => {
        this.performMaintenance().catch(error => {
          console.error('Error log maintenance failed:', error);
        });
      }, 300000); // Every 5 minutes

      elizaLogger.info('✅ Error Log Service started');
    } catch (error) {
      elizaLogger.error('Failed to start Error Log Service:', error);
      // Don't throw - error logging is optional but helpful
    }
  }

  private async loadExistingErrors(): Promise<void> {
    try {
      if (await this.fileExists(this.logFile)) {
        const content = await fs.readFile(this.logFile, 'utf-8');
        const lines = content.trim().split('\n').filter(line => line.trim());
        
        this.errors = lines
          .map(line => {
            try {
              return JSON.parse(line);
            } catch {
              return null;
            }
          })
          .filter((entry): entry is ErrorLogEntry => entry !== null)
          .slice(-500); // Keep last 500 errors in memory
      }
    } catch (error) {
      if (this.options.debug) {
        elizaLogger.warn('Could not load existing error log:', error);
      }
      this.errors = [];
    }
  }

  async logError(
    message: string,
    error?: any,
    context?: Record<string, any>,
    severity: 'error' | 'warning' | 'critical' = 'error',
    component?: string
  ): Promise<void> {
    if (!this.isRunning) return;

    try {
      const errorEntry: ErrorLogEntry = {
        id: `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        message,
        severity,
        component,
        sessionId: this.sessionId,
        resolved: false,
      };

      // Process error object
      if (error) {
        if (error instanceof Error) {
          errorEntry.error = error.message;
          if (this.options.includeStackTraces) {
            errorEntry.stack = error.stack;
          }
        } else {
          errorEntry.error = String(error);
        }
      }

      // Add context (sanitized)
      if (context) {
        errorEntry.context = this.sanitizeContext(context);
      }

      // Add to in-memory collection
      this.errors.push(errorEntry);

      // Log to console based on severity
      const logMethod = severity === 'critical' ? 'error' : 
                       severity === 'warning' ? 'warn' : 'error';
      
      if (this.options.debug || severity === 'critical') {
        elizaLogger[logMethod](`[ErrorLog] ${message}`, error);
      }

      // Persist to file
      await this.persistError(errorEntry);

      // Keep in-memory errors limited
      if (this.errors.length > 1000) {
        this.errors = this.errors.slice(-500);
      }

    } catch (logError) {
      // Don't let error logging itself break the application
      console.error('Failed to log error:', logError);
    }
  }

  async logWarning(message: string, context?: Record<string, any>, component?: string): Promise<void> {
    await this.logError(message, undefined, context, 'warning', component);
  }

  async logCritical(message: string, error?: any, context?: Record<string, any>, component?: string): Promise<void> {
    await this.logError(message, error, context, 'critical', component);
  }

  private sanitizeContext(context: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};

    for (const [key, value] of Object.entries(context)) {
      // Skip potentially sensitive keys
      if (this.isSensitiveKey(key)) {
        sanitized[key] = '[REDACTED]';
        continue;
      }

      // Limit string length
      if (typeof value === 'string' && value.length > 1000) {
        sanitized[key] = value.substring(0, 1000) + '...[TRUNCATED]';
      } else if (typeof value === 'object' && value !== null) {
        // Recursively sanitize nested objects (limited depth)
        try {
          sanitized[key] = JSON.parse(JSON.stringify(value).substring(0, 2000));
        } catch {
          sanitized[key] = '[COMPLEX_OBJECT]';
        }
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  private isSensitiveKey(key: string): boolean {
    const sensitiveKeys = [
      'token', 'key', 'secret', 'password', 'auth', 'credential',
      'api_key', 'github_token', 'openai_api_key', 'anthropic_api_key',
    ];
    
    return sensitiveKeys.some(sensitive => 
      key.toLowerCase().includes(sensitive)
    );
  }

  private async persistError(errorEntry: ErrorLogEntry): Promise<void> {
    try {
      // Check file size before writing
      if (await this.fileExists(this.logFile)) {
        const stats = await fs.stat(this.logFile);
        if (stats.size > this.options.maxLogSize!) {
          await this.rotateLogFile();
        }
      }

      // Append as JSON line
      const line = JSON.stringify(errorEntry) + '\n';
      await fs.appendFile(this.logFile, line, 'utf-8');

    } catch (error) {
      if (this.options.debug) {
        console.error('Failed to persist error log:', error);
      }
    }
  }

  private async rotateLogFile(): Promise<void> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFile = this.logFile.replace('.log', `-${timestamp}.log`);
      
      await fs.rename(this.logFile, backupFile);
      
      if (this.options.debug) {
        elizaLogger.info(`Rotated error log to: ${backupFile}`);
      }

    } catch (error) {
      if (this.options.debug) {
        console.error('Failed to rotate error log:', error);
      }
    }
  }

  async getRecentLogs(limit = 50): Promise<ErrorLogEntry[]> {
    return this.errors.slice(-limit);
  }

  async getLogsByComponent(component: string, limit = 50): Promise<ErrorLogEntry[]> {
    return this.errors
      .filter(error => error.component === component)
      .slice(-limit);
  }

  async getLogsBySeverity(severity: 'error' | 'warning' | 'critical', limit = 50): Promise<ErrorLogEntry[]> {
    return this.errors
      .filter(error => error.severity === severity)
      .slice(-limit);
  }

  async getUnresolvedErrors(): Promise<ErrorLogEntry[]> {
    return this.errors.filter(error => !error.resolved);
  }

  async markErrorResolved(errorId: string, resolvedBy?: string): Promise<boolean> {
    const error = this.errors.find(e => e.id === errorId);
    if (!error) {
      return false;
    }

    error.resolved = true;
    error.resolvedAt = new Date().toISOString();
    error.resolvedBy = resolvedBy;

    // Update in file if needed
    await this.persistError(error);

    return true;
  }

  getMetrics(): ErrorLogMetrics {
    const errorsByComponent: Record<string, number> = {};
    const errorsBySeverity: Record<string, number> = {};
    let criticalErrors = 0;
    let unresolvedErrors = 0;

    for (const error of this.errors) {
      // Count by component
      const component = error.component || 'unknown';
      errorsByComponent[component] = (errorsByComponent[component] || 0) + 1;

      // Count by severity
      errorsBySeverity[error.severity] = (errorsBySeverity[error.severity] || 0) + 1;

      // Count critical and unresolved
      if (error.severity === 'critical') {
        criticalErrors++;
      }
      if (!error.resolved) {
        unresolvedErrors++;
      }
    }

    // Calculate error rate (errors per hour for current session)
    const sessionStart = new Date();
    sessionStart.setHours(sessionStart.getHours() - 1);
    const recentErrors = this.errors.filter(e => 
      new Date(e.timestamp) > sessionStart
    ).length;

    return {
      totalErrors: this.errors.length,
      errorsByComponent,
      errorsBySeverity,
      recentErrors: this.errors.slice(-20),
      errorRate: recentErrors, // Errors per hour
      criticalErrors,
      unresolvedErrors,
    };
  }

  async exportErrors(outputFile?: string, filter?: {
    severity?: 'error' | 'warning' | 'critical';
    component?: string;
    since?: Date;
    unresolved?: boolean;
  }): Promise<string> {
    let filteredErrors = [...this.errors];

    if (filter) {
      if (filter.severity) {
        filteredErrors = filteredErrors.filter(e => e.severity === filter.severity);
      }
      if (filter.component) {
        filteredErrors = filteredErrors.filter(e => e.component === filter.component);
      }
      if (filter.since) {
        filteredErrors = filteredErrors.filter(e => 
          new Date(e.timestamp) >= filter.since!
        );
      }
      if (filter.unresolved) {
        filteredErrors = filteredErrors.filter(e => !e.resolved);
      }
    }

    const exportData = {
      errors: filteredErrors,
      metrics: this.getMetrics(),
      exportedAt: new Date().toISOString(),
      filter,
      version: '1.0',
    };

    const exportPath = outputFile || `error-log-export-${Date.now()}.json`;
    await fs.writeFile(exportPath, JSON.stringify(exportData, null, 2), 'utf-8');

    return exportPath;
  }

  async searchErrors(query: string, limit = 50): Promise<ErrorLogEntry[]> {
    const lowerQuery = query.toLowerCase();
    
    return this.errors
      .filter(error => 
        error.message.toLowerCase().includes(lowerQuery) ||
        error.error?.toLowerCase().includes(lowerQuery) ||
        error.component?.toLowerCase().includes(lowerQuery)
      )
      .slice(-limit);
  }

  private async performMaintenance(): Promise<void> {
    try {
      // Remove old errors from memory
      const cutoffTime = new Date();
      cutoffTime.setDate(cutoffTime.getDate() - this.options.retentionDays!);
      const cutoffTimestamp = cutoffTime.toISOString();

      const originalLength = this.errors.length;
      this.errors = this.errors.filter(error => error.timestamp > cutoffTimestamp);

      if (this.options.debug && this.errors.length < originalLength) {
        elizaLogger.info(`Cleaned up ${originalLength - this.errors.length} old error log entries`);
      }

      // Clean up old log files
      await this.cleanupOldLogFiles();

    } catch (error) {
      if (this.options.debug) {
        console.error('Error log maintenance failed:', error);
      }
    }
  }

  private async cleanupOldLogFiles(): Promise<void> {
    try {
      const dir = path.dirname(this.logFile);
      const baseName = path.basename(this.logFile, '.log');
      
      const files = await fs.readdir(dir);
      const logFiles = files.filter(file => 
        file.startsWith(baseName) && file.endsWith('.log') && file !== path.basename(this.logFile)
      );

      const cutoffTime = new Date();
      cutoffTime.setDate(cutoffTime.getDate() - this.options.retentionDays!);

      for (const file of logFiles) {
        try {
          const filePath = path.join(dir, file);
          const stats = await fs.stat(filePath);
          
          if (stats.mtime < cutoffTime) {
            await fs.unlink(filePath);
            if (this.options.debug) {
              elizaLogger.info(`Deleted old error log: ${file}`);
            }
          }
        } catch (error) {
          // Skip files we can't process
        }
      }

    } catch (error) {
      // Cleanup is best effort
    }
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async stop(): Promise<void> {
    try {
      if (!this.isRunning) return;

      elizaLogger.info('Stopping Error Log Service...');

      // Log final metrics
      const metrics = this.getMetrics();
      await this.logError(
        `Error Log Service stopping - Session summary: ${metrics.totalErrors} total errors, ${metrics.criticalErrors} critical, ${metrics.unresolvedErrors} unresolved`,
        undefined,
        { metrics },
        'error',
        'error-log-service'
      );

      this.isRunning = false;

      elizaLogger.info('✅ Error Log Service stopped');
    } catch (error) {
      console.error('Error stopping Error Log Service:', error);
    }
  }
}