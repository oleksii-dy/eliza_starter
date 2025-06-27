import fs from 'fs/promises';
import path from 'path';
import { elizaLogger } from '@elizaos/core';

export interface ErrorLogOptions {
  logFile: string;
  debug: boolean;
  maxLogSize?: number;
  retentionDays?: number;
}

export interface ErrorLogEntry {
  id: string;
  timestamp: string;
  level: 'error' | 'warn' | 'info';
  message: string;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  context?: Record<string, any>;
  source: 'code-interface' | 'autocoder' | 'swarm' | 'github' | 'telemetry';
}

export class ErrorLogService {
  private options: ErrorLogOptions;
  private logs: ErrorLogEntry[] = [];
  private logFilePath: string;
  private isStarted = false;

  constructor(options: ErrorLogOptions) {
    this.options = {
      maxLogSize: 10 * 1024 * 1024, // 10MB default
      retentionDays: 7, // 7 days default
      ...options,
    };
    this.logFilePath = path.resolve(this.options.logFile);
  }

  async start(): Promise<void> {
    try {
      // Create log directory if it doesn't exist
      const logDir = path.dirname(this.logFilePath);
      await fs.mkdir(logDir, { recursive: true });

      // Load existing logs
      await this.loadExistingLogs();

      // Clean up old logs
      await this.cleanupOldLogs();

      // Log service start
      await this.logInfo('Error log service started');

      this.isStarted = true;
      elizaLogger.info(`Error log service started - Log file: ${this.logFilePath}`);
    } catch (error) {
      elizaLogger.error('Failed to start error log service:', error);
      throw error;
    }
  }

  async logError(message: string, error?: Error | unknown, context?: Record<string, any>, source: ErrorLogEntry['source'] = 'code-interface'): Promise<void> {
    const logEntry: ErrorLogEntry = {
      id: `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      level: 'error',
      message,
      context,
      source,
    };

    if (error) {
      if (error instanceof Error) {
        logEntry.error = {
          name: error.name,
          message: error.message,
          stack: error.stack,
        };
      } else {
        logEntry.error = {
          name: 'Unknown',
          message: String(error),
        };
      }
    }

    await this.addLogEntry(logEntry);

    // Also log to elizaLogger for immediate visibility
    elizaLogger.error(message, error);
  }

  async logWarning(message: string, context?: Record<string, any>, source: ErrorLogEntry['source'] = 'code-interface'): Promise<void> {
    const logEntry: ErrorLogEntry = {
      id: `warn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      level: 'warn',
      message,
      context,
      source,
    };

    await this.addLogEntry(logEntry);
    elizaLogger.warn(message);
  }

  async logInfo(message: string, context?: Record<string, any>, source: ErrorLogEntry['source'] = 'code-interface'): Promise<void> {
    const logEntry: ErrorLogEntry = {
      id: `info-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      level: 'info',
      message,
      context,
      source,
    };

    await this.addLogEntry(logEntry);
    
    if (this.options.debug) {
      elizaLogger.info(message);
    }
  }

  private async addLogEntry(entry: ErrorLogEntry): Promise<void> {
    this.logs.push(entry);

    // Keep only recent logs in memory (last 1000)
    if (this.logs.length > 1000) {
      this.logs = this.logs.slice(-1000);
    }

    // Write to file
    try {
      await this.writeToFile(entry);
    } catch (error) {
      // Try to log the file write error, but don't fail the main operation
      elizaLogger.warn('Failed to write error log to file:', error);
    }

    // Check if log file is getting too large
    await this.checkLogFileSize();
  }

  private async writeToFile(entry: ErrorLogEntry): Promise<void> {
    try {
      const line = JSON.stringify(entry) + '\n';
      await fs.appendFile(this.logFilePath, line, 'utf8');
    } catch (error) {
      // If we can't write to the primary log file, try a fallback
      const fallbackPath = this.logFilePath + '.fallback';
      try {
        const line = JSON.stringify(entry) + '\n';
        await fs.appendFile(fallbackPath, line, 'utf8');
      } catch (fallbackError) {
        // Last resort: just log to elizaLogger
        elizaLogger.error('Failed to write to both primary and fallback log files');
      }
    }
  }

  private async loadExistingLogs(): Promise<void> {
    try {
      const fileExists = await fs.access(this.logFilePath).then(() => true).catch(() => false);
      if (!fileExists) return;

      const fileContent = await fs.readFile(this.logFilePath, 'utf8');
      const lines = fileContent.trim().split('\n').filter(line => line.trim());

      // Load the last 1000 entries into memory
      const recentLines = lines.slice(-1000);
      this.logs = recentLines.map(line => {
        try {
          return JSON.parse(line) as ErrorLogEntry;
        } catch {
          // Skip invalid JSON lines
          return null;
        }
      }).filter(Boolean) as ErrorLogEntry[];

      if (this.options.debug) {
        elizaLogger.info(`Loaded ${this.logs.length} existing log entries`);
      }
    } catch (error) {
      elizaLogger.warn('Failed to load existing logs:', error);
    }
  }

  private async checkLogFileSize(): Promise<void> {
    try {
      const stats = await fs.stat(this.logFilePath);
      
      if (stats.size > this.options.maxLogSize!) {
        await this.rotateLogFile();
      }
    } catch (error) {
      // File might not exist yet, that's okay
    }
  }

  private async rotateLogFile(): Promise<void> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const rotatedPath = this.logFilePath.replace('.log', `-${timestamp}.log`);
      
      // Move current log to rotated file
      await fs.rename(this.logFilePath, rotatedPath);
      
      // Log the rotation
      await this.logInfo('Log file rotated', { rotatedTo: rotatedPath });
      
      elizaLogger.info(`Log file rotated to: ${rotatedPath}`);
    } catch (error) {
      elizaLogger.error('Failed to rotate log file:', error);
    }
  }

  private async cleanupOldLogs(): Promise<void> {
    try {
      const logDir = path.dirname(this.logFilePath);
      const files = await fs.readdir(logDir);
      const cutoffDate = new Date(Date.now() - (this.options.retentionDays! * 24 * 60 * 60 * 1000));

      for (const file of files) {
        if (file.includes('.elizaos-code-errors') && file.endsWith('.log')) {
          const filePath = path.join(logDir, file);
          try {
            const stats = await fs.stat(filePath);
            if (stats.mtime < cutoffDate) {
              await fs.unlink(filePath);
              if (this.options.debug) {
                elizaLogger.info(`Cleaned up old log file: ${file}`);
              }
            }
          } catch (error) {
            // Skip files we can't process
          }
        }
      }
    } catch (error) {
      elizaLogger.warn('Failed to cleanup old logs:', error);
    }
  }

  async getRecentLogs(limit = 50): Promise<ErrorLogEntry[]> {
    return this.logs.slice(-limit);
  }

  async getLogsByLevel(level: ErrorLogEntry['level'], limit = 50): Promise<ErrorLogEntry[]> {
    return this.logs.filter(log => log.level === level).slice(-limit);
  }

  async getLogsBySource(source: ErrorLogEntry['source'], limit = 50): Promise<ErrorLogEntry[]> {
    return this.logs.filter(log => log.source === source).slice(-limit);
  }

  async getLogsSince(since: Date, limit = 100): Promise<ErrorLogEntry[]> {
    const sinceMs = since.getTime();
    return this.logs
      .filter(log => new Date(log.timestamp).getTime() >= sinceMs)
      .slice(-limit);
  }

  async searchLogs(query: string, limit = 50): Promise<ErrorLogEntry[]> {
    const lowerQuery = query.toLowerCase();
    return this.logs
      .filter(log => 
        log.message.toLowerCase().includes(lowerQuery) ||
        log.error?.message.toLowerCase().includes(lowerQuery) ||
        JSON.stringify(log.context || {}).toLowerCase().includes(lowerQuery)
      )
      .slice(-limit);
  }

  async getLogStatistics(): Promise<{
    total: number;
    byLevel: Record<ErrorLogEntry['level'], number>;
    bySource: Record<ErrorLogEntry['source'], number>;
    recentErrors: number;
    oldestLog?: string;
    newestLog?: string;
  }> {
    const byLevel: Record<ErrorLogEntry['level'], number> = { error: 0, warn: 0, info: 0 };
    const bySource: Record<ErrorLogEntry['source'], number> = {
      'code-interface': 0,
      'autocoder': 0,
      'swarm': 0,
      'github': 0,
      'telemetry': 0,
    };

    // Count last 24 hours of errors
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    let recentErrors = 0;

    this.logs.forEach(log => {
      byLevel[log.level]++;
      bySource[log.source]++;
      
      if (log.level === 'error' && new Date(log.timestamp) > oneDayAgo) {
        recentErrors++;
      }
    });

    return {
      total: this.logs.length,
      byLevel,
      bySource,
      recentErrors,
      oldestLog: this.logs[0]?.timestamp,
      newestLog: this.logs[this.logs.length - 1]?.timestamp,
    };
  }

  async exportLogs(format: 'json' | 'csv' = 'json'): Promise<string> {
    if (format === 'json') {
      return JSON.stringify(this.logs, null, 2);
    } else {
      // CSV format
      const headers = ['timestamp', 'level', 'message', 'source', 'error_name', 'error_message'];
      const csvLines = [headers.join(',')];
      
      this.logs.forEach(log => {
        const row = [
          log.timestamp,
          log.level,
          `"${log.message.replace(/"/g, '""')}"`,
          log.source,
          log.error?.name || '',
          log.error?.message ? `"${log.error.message.replace(/"/g, '""')}"` : '',
        ];
        csvLines.push(row.join(','));
      });
      
      return csvLines.join('\n');
    }
  }

  // GitHub artifact storage integration
  async uploadToGitHub(githubService: any): Promise<string | null> {
    if (!githubService) return null;

    try {
      const logData = {
        metadata: {
          exported: new Date().toISOString(),
          statistics: await this.getLogStatistics(),
        },
        logs: this.logs,
      };
      
      const fileName = `error-logs-${Date.now()}.json`;
      
      // Upload to elizaos-artifacts organization
      const repoUrl = await githubService.uploadArtifact(
        'error-logs',
        fileName,
        JSON.stringify(logData, null, 2),
        'Error logs export'
      );

      await this.logInfo('Error logs uploaded to GitHub', { fileName, repoUrl });
      return repoUrl;
    } catch (error) {
      await this.logError('Failed to upload error logs to GitHub', error as Error);
      return null;
    }
  }

  async stop(): Promise<void> {
    if (!this.isStarted) return;

    try {
      await this.logInfo('Error log service stopping');
      
      // Final cleanup
      await this.cleanupOldLogs();
      
      elizaLogger.info('Error log service stopped');
      this.isStarted = false;
    } catch (error) {
      elizaLogger.error('Error stopping error log service:', error);
    }
  }
}