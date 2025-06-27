import { elizaLogger } from '@elizaos/core';
import { promises as fs } from 'fs';
import path from 'path';

export interface TelemetryServiceOptions {
  enabled: boolean;
  debug: boolean;
  logFile?: string;
  maxLogSize?: number;
  retentionDays?: number;
}

export interface TelemetryEvent {
  id: string;
  timestamp: string;
  event: string;
  data: Record<string, any>;
  sessionId: string;
  userId?: string;
  version?: string;
  platform: string;
  duration?: number;
}

export interface TelemetrySession {
  id: string;
  startTime: Date;
  endTime?: Date;
  events: number;
  errors: number;
  lastActivity: Date;
}

export interface TelemetryMetrics {
  totalEvents: number;
  totalSessions: number;
  averageSessionDuration: number;
  errorRate: number;
  popularEvents: Array<{ event: string; count: number }>;
  recentActivity: TelemetryEvent[];
}

export class TelemetryService {
  private options: TelemetryServiceOptions;
  private session: TelemetrySession;
  private events: TelemetryEvent[] = [];
  private logFile: string;
  private isRunning = false;

  constructor(options: TelemetryServiceOptions) {
    this.options = {
      maxLogSize: 10 * 1024 * 1024, // 10MB default
      retentionDays: 30,
      logFile: '.elizaos-code-telemetry.json',
      ...options,
    };

    this.logFile = path.resolve(this.options.logFile!);
    
    // Initialize session
    this.session = {
      id: this.generateSessionId(),
      startTime: new Date(),
      events: 0,
      errors: 0,
      lastActivity: new Date(),
    };
  }

  async start(): Promise<void> {
    try {
      elizaLogger.info('Starting Telemetry Service...');

      this.isRunning = true;

      // Load existing events if available
      await this.loadExistingEvents();

      // Log session start
      await this.logEvent('session_started', {
        sessionId: this.session.id,
        enabled: this.options.enabled,
        debug: this.options.debug,
        timestamp: new Date().toISOString(),
      });

      // Set up periodic cleanup
      if (this.options.enabled) {
        setInterval(() => {
          this.performMaintenance().catch(error => {
            elizaLogger.warn('Telemetry maintenance error:', error);
          });
        }, 300000); // Every 5 minutes
      }

      elizaLogger.info('✅ Telemetry Service started');
    } catch (error) {
      elizaLogger.error('Failed to start Telemetry Service:', error);
      // Don't throw - telemetry is optional
    }
  }

  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private async loadExistingEvents(): Promise<void> {
    try {
      if (await this.fileExists(this.logFile)) {
        const content = await fs.readFile(this.logFile, 'utf-8');
        const data = JSON.parse(content);
        
        if (Array.isArray(data.events)) {
          // Load recent events (last 1000)
          this.events = data.events.slice(-1000);
        }
      }
    } catch (error) {
      if (this.options.debug) {
        elizaLogger.warn('Could not load existing telemetry events:', error);
      }
      // Start fresh if there's an issue loading
      this.events = [];
    }
  }

  async logEvent(event: string, data: Record<string, any> = {}): Promise<void> {
    if (!this.isRunning) return;

    try {
      const telemetryEvent: TelemetryEvent = {
        id: `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        event,
        data: this.sanitizeData(data),
        sessionId: this.session.id,
        platform: process.platform,
        version: process.env.npm_package_version || 'unknown',
      };

      // Add to in-memory collection
      this.events.push(telemetryEvent);

      // Update session
      this.session.events++;
      this.session.lastActivity = new Date();

      // Log to console in debug mode
      if (this.options.debug) {
        elizaLogger.info(`[Telemetry] ${event}:`, data);
      }

      // Persist if enabled
      if (this.options.enabled) {
        await this.persistEvents();
      }

      // Keep in-memory events limited
      if (this.events.length > 2000) {
        this.events = this.events.slice(-1000);
      }

    } catch (error) {
      if (this.options.debug) {
        elizaLogger.warn('Failed to log telemetry event:', error);
      }
      // Don't throw - telemetry failures shouldn't break the app
    }
  }

  async logError(event: string, error: any, context: Record<string, any> = {}): Promise<void> {
    this.session.errors++;

    await this.logEvent(`error_${event}`, {
      ...context,
      error: {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        type: error?.constructor?.name || 'Unknown',
      },
      severity: 'error',
    });
  }

  async logTiming(event: string, startTime: number, data: Record<string, any> = {}): Promise<void> {
    const duration = Date.now() - startTime;
    
    await this.logEvent(event, {
      ...data,
      duration,
      timing: true,
    });
  }

  private sanitizeData(data: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};

    for (const [key, value] of Object.entries(data)) {
      // Skip potentially sensitive keys
      if (this.isSensitiveKey(key)) {
        sanitized[key] = '[REDACTED]';
        continue;
      }

      // Sanitize nested objects
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        sanitized[key] = this.sanitizeData(value);
      } else if (typeof value === 'string' && this.looksLikeSecret(value)) {
        sanitized[key] = '[REDACTED]';
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

  private looksLikeSecret(value: string): boolean {
    // Basic patterns for common secrets
    const secretPatterns = [
      /^sk-[A-Za-z0-9]{48}$/, // OpenAI
      /^sk-ant-[A-Za-z0-9\-_]{95}$/, // Anthropic
      /^gh[ps]_[A-Za-z0-9_]{36,}$/, // GitHub
    ];

    return secretPatterns.some(pattern => pattern.test(value));
  }

  private async persistEvents(): Promise<void> {
    try {
      // Check file size before writing
      if (await this.fileExists(this.logFile)) {
        const stats = await fs.stat(this.logFile);
        if (stats.size > this.options.maxLogSize!) {
          await this.rotateLogFile();
        }
      }

      const data = {
        session: this.session,
        events: this.events,
        metadata: {
          version: '1.0',
          lastUpdated: new Date().toISOString(),
          totalEvents: this.events.length,
        },
      };

      await fs.writeFile(this.logFile, JSON.stringify(data, null, 2), 'utf-8');

    } catch (error) {
      if (this.options.debug) {
        elizaLogger.warn('Failed to persist telemetry events:', error);
      }
    }
  }

  private async rotateLogFile(): Promise<void> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFile = this.logFile.replace('.json', `-${timestamp}.json`);
      
      await fs.rename(this.logFile, backupFile);
      
      if (this.options.debug) {
        elizaLogger.info(`Rotated telemetry log to: ${backupFile}`);
      }

      // Keep only recent events for the new file
      this.events = this.events.slice(-500);

    } catch (error) {
      if (this.options.debug) {
        elizaLogger.warn('Failed to rotate telemetry log:', error);
      }
    }
  }

  private async performMaintenance(): Promise<void> {
    try {
      // Clean up old events from memory
      const cutoffTime = new Date();
      cutoffTime.setHours(cutoffTime.getHours() - 24); // Keep last 24 hours

      const cutoffTimestamp = cutoffTime.toISOString();
      this.events = this.events.filter(event => event.timestamp > cutoffTimestamp);

      // Clean up old log files
      await this.cleanupOldLogFiles();

    } catch (error) {
      if (this.options.debug) {
        elizaLogger.warn('Telemetry maintenance error:', error);
      }
    }
  }

  private async cleanupOldLogFiles(): Promise<void> {
    try {
      const dir = path.dirname(this.logFile);
      const baseName = path.basename(this.logFile, '.json');
      
      const files = await fs.readdir(dir);
      const logFiles = files.filter(file => 
        file.startsWith(baseName) && file.endsWith('.json') && file !== path.basename(this.logFile)
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
              elizaLogger.info(`Deleted old telemetry log: ${file}`);
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

  getMetrics(): TelemetryMetrics {
    const now = new Date();
    const sessionDuration = now.getTime() - this.session.startTime.getTime();

    // Count event types
    const eventCounts = new Map<string, number>();
    for (const event of this.events) {
      eventCounts.set(event.event, (eventCounts.get(event.event) || 0) + 1);
    }

    const popularEvents = Array.from(eventCounts.entries())
      .map(([event, count]) => ({ event, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const errorRate = this.session.events > 0 ? this.session.errors / this.session.events : 0;

    return {
      totalEvents: this.events.length,
      totalSessions: 1, // Current session only
      averageSessionDuration: sessionDuration,
      errorRate,
      popularEvents,
      recentActivity: this.events.slice(-20),
    };
  }

  getRecentEvents(limit = 50): TelemetryEvent[] {
    return this.events.slice(-limit);
  }

  async exportData(outputFile?: string): Promise<string> {
    const exportData = {
      session: this.session,
      events: this.events,
      metrics: this.getMetrics(),
      exportedAt: new Date().toISOString(),
      version: '1.0',
    };

    const exportPath = outputFile || `telemetry-export-${Date.now()}.json`;
    await fs.writeFile(exportPath, JSON.stringify(exportData, null, 2), 'utf-8');

    return exportPath;
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

      elizaLogger.info('Stopping Telemetry Service...');

      // Log session end
      this.session.endTime = new Date();
      await this.logEvent('session_ended', {
        sessionId: this.session.id,
        duration: this.session.endTime.getTime() - this.session.startTime.getTime(),
        totalEvents: this.session.events,
        totalErrors: this.session.errors,
        timestamp: new Date().toISOString(),
      });

      // Final persistence
      if (this.options.enabled) {
        await this.persistEvents();
      }

      this.isRunning = false;

      elizaLogger.info('✅ Telemetry Service stopped');
    } catch (error) {
      elizaLogger.error('Error stopping Telemetry Service:', error);
      // Don't throw - we're shutting down anyway
    }
  }
}