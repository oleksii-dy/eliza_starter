import { elizaLogger } from '@elizaos/core';
import { writeFileSync, appendFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

export interface TelemetryEvent {
  id: string;
  timestamp: string;
  type: string;
  data: Record<string, any>;
  source: 'pm_agent' | 'swarm_orchestrator' | 'github_coordinator' | 'terminal_interface' | 'secrets_manager';
  severity: 'info' | 'warn' | 'error' | 'debug';
  sessionId: string;
}

export interface TelemetryMetrics {
  totalEvents: number;
  eventsByType: Record<string, number>;
  eventsBySource: Record<string, number>;
  errorCount: number;
  sessionDuration: number;
  agentSpawns: number;
  githubOperations: number;
  userInteractions: number;
}

export interface TelemetryConfig {
  logDirectory: string;
  maxLogFileSize: number;
  retentionDays: number;
  enableMetrics: boolean;
  enableDebugLogging: boolean;
  sessionId?: string;
}

export class TelemetryService {
  private config: TelemetryConfig;
  private sessionId: string;
  private events: TelemetryEvent[] = [];
  private startTime: number;
  private logFilePath: string;
  private metricsFilePath: string;

  constructor(config: Partial<TelemetryConfig> = {}) {
    this.sessionId = config.sessionId || this.generateSessionId();
    this.startTime = Date.now();
    
    this.config = {
      logDirectory: config.logDirectory || join(process.cwd(), '.elizaos', 'telemetry'),
      maxLogFileSize: config.maxLogFileSize || 10 * 1024 * 1024, // 10MB
      retentionDays: config.retentionDays || 7,
      enableMetrics: config.enableMetrics ?? true,
      enableDebugLogging: config.enableDebugLogging ?? false,
      ...config,
    };

    this.ensureLogDirectory();
    this.logFilePath = join(this.config.logDirectory, `telemetry-${this.sessionId}.jsonl`);
    this.metricsFilePath = join(this.config.logDirectory, `metrics-${this.sessionId}.json`);

    this.logEvent('telemetry_service_initialized', {
      sessionId: this.sessionId,
      config: this.config,
    }, 'info', 'pm_agent');
  }

  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private ensureLogDirectory(): void {
    if (!existsSync(this.config.logDirectory)) {
      mkdirSync(this.config.logDirectory, { recursive: true });
    }
  }

  async logEvent(
    type: string,
    data: Record<string, any>,
    severity: 'info' | 'warn' | 'error' | 'debug' = 'info',
    source: TelemetryEvent['source'] = 'pm_agent'
  ): Promise<void> {
    try {
      const event: TelemetryEvent = {
        id: this.generateEventId(),
        timestamp: new Date().toISOString(),
        type,
        data: this.sanitizeData(data),
        source,
        severity,
        sessionId: this.sessionId,
      };

      // Store in memory
      this.events.push(event);

      // Write to file
      await this.writeEventToFile(event);

      // Log to ElizaOS logger based on severity
      this.logToElizaLogger(event);

      // Update metrics if enabled
      if (this.config.enableMetrics) {
        await this.updateMetrics();
      }

      // Cleanup old events from memory to prevent memory leaks
      if (this.events.length > 1000) {
        this.events = this.events.slice(-500);
      }

    } catch (error) {
      elizaLogger.error('Failed to log telemetry event:', error);
    }
  }

  private generateEventId(): string {
    return `evt-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
  }

  private sanitizeData(data: Record<string, any>): Record<string, any> {
    const sanitized = { ...data };
    
    // Remove sensitive information
    const sensitiveKeys = [
      'password', 'token', 'secret', 'key', 'apiKey', 'accessToken',
      'privateKey', 'credential', 'auth', 'authorization'
    ];

    function sanitizeObject(obj: any): any {
      if (obj === null || obj === undefined) return obj;
      
      if (typeof obj === 'string') {
        // Mask potential tokens/secrets in strings
        if (obj.length > 20 && /^[a-zA-Z0-9_\-]+$/.test(obj)) {
          return `${obj.slice(0, 4)}...${obj.slice(-4)}`;
        }
        return obj;
      }
      
      if (Array.isArray(obj)) {
        return obj.map(item => sanitizeObject(item));
      }
      
      if (typeof obj === 'object') {
        const result: any = {};
        for (const [key, value] of Object.entries(obj)) {
          const lowerKey = key.toLowerCase();
          if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))) {
            result[key] = '[REDACTED]';
          } else {
            result[key] = sanitizeObject(value);
          }
        }
        return result;
      }
      
      return obj;
    }

    return sanitizeObject(sanitized);
  }

  private async writeEventToFile(event: TelemetryEvent): Promise<void> {
    try {
      const eventLine = JSON.stringify(event) + '\n';
      appendFileSync(this.logFilePath, eventLine);

      // Check file size and rotate if necessary
      await this.rotateLogFileIfNeeded();
    } catch (error) {
      elizaLogger.error('Failed to write telemetry event to file:', error);
    }
  }

  private async rotateLogFileIfNeeded(): Promise<void> {
    try {
      if (existsSync(this.logFilePath)) {
        const stats = require('fs').statSync(this.logFilePath);
        if (stats.size > this.config.maxLogFileSize) {
          const rotatedPath = `${this.logFilePath}.${Date.now()}`;
          require('fs').renameSync(this.logFilePath, rotatedPath);
          
          this.logEvent('telemetry_file_rotated', {
            originalPath: this.logFilePath,
            rotatedPath,
            fileSize: stats.size,
          }, 'info', 'pm_agent');
        }
      }
    } catch (error) {
      elizaLogger.error('Failed to rotate telemetry log file:', error);
    }
  }

  private logToElizaLogger(event: TelemetryEvent): void {
    if (!this.config.enableDebugLogging && event.severity === 'debug') {
      return;
    }

    const message = `[TELEMETRY:${event.source}] ${event.type}`;
    const context = { 
      eventId: event.id, 
      sessionId: event.sessionId,
      data: event.data 
    };

    switch (event.severity) {
      case 'error':
        elizaLogger.error(message, context);
        break;
      case 'warn':
        elizaLogger.warn(message, context);
        break;
      case 'debug':
        elizaLogger.debug(message, context);
        break;
      default:
        elizaLogger.info(message, context);
        break;
    }
  }

  private async updateMetrics(): Promise<void> {
    try {
      const metrics: TelemetryMetrics = {
        totalEvents: this.events.length,
        eventsByType: {},
        eventsBySource: {},
        errorCount: 0,
        sessionDuration: Date.now() - this.startTime,
        agentSpawns: 0,
        githubOperations: 0,
        userInteractions: 0,
      };

      // Calculate metrics from events
      for (const event of this.events) {
        // Count by type
        metrics.eventsByType[event.type] = (metrics.eventsByType[event.type] || 0) + 1;
        
        // Count by source
        metrics.eventsBySource[event.source] = (metrics.eventsBySource[event.source] || 0) + 1;
        
        // Count errors
        if (event.severity === 'error') {
          metrics.errorCount++;
        }
        
        // Count specific operations
        if (event.type.includes('agent_spawn') || event.type.includes('agent_created')) {
          metrics.agentSpawns++;
        }
        
        if (event.type.includes('github') || event.type.includes('git')) {
          metrics.githubOperations++;
        }
        
        if (event.type.includes('user_message') || event.type.includes('user_interaction')) {
          metrics.userInteractions++;
        }
      }

      // Write metrics to file
      writeFileSync(this.metricsFilePath, JSON.stringify(metrics, null, 2));

    } catch (error) {
      elizaLogger.error('Failed to update telemetry metrics:', error);
    }
  }

  async getMetrics(): Promise<TelemetryMetrics> {
    if (!this.config.enableMetrics) {
      throw new Error('Metrics are disabled');
    }

    await this.updateMetrics();
    
    try {
      if (existsSync(this.metricsFilePath)) {
        const metricsContent = readFileSync(this.metricsFilePath, 'utf-8');
        return JSON.parse(metricsContent);
      }
    } catch (error) {
      elizaLogger.error('Failed to read metrics file:', error);
    }

    // Return empty metrics if file doesn't exist or can't be read
    return {
      totalEvents: 0,
      eventsByType: {},
      eventsBySource: {},
      errorCount: 0,
      sessionDuration: Date.now() - this.startTime,
      agentSpawns: 0,
      githubOperations: 0,
      userInteractions: 0,
    };
  }

  async getEvents(filter?: {
    type?: string;
    source?: TelemetryEvent['source'];
    severity?: TelemetryEvent['severity'];
    since?: string;
    limit?: number;
  }): Promise<TelemetryEvent[]> {
    let filteredEvents = [...this.events];

    if (filter) {
      if (filter.type) {
        filteredEvents = filteredEvents.filter(e => e.type === filter.type);
      }
      
      if (filter.source) {
        filteredEvents = filteredEvents.filter(e => e.source === filter.source);
      }
      
      if (filter.severity) {
        filteredEvents = filteredEvents.filter(e => e.severity === filter.severity);
      }
      
      if (filter.since) {
        const sinceDate = new Date(filter.since);
        filteredEvents = filteredEvents.filter(e => new Date(e.timestamp) >= sinceDate);
      }
      
      if (filter.limit) {
        filteredEvents = filteredEvents.slice(-filter.limit);
      }
    }

    return filteredEvents;
  }

  async exportTelemetryData(): Promise<{
    sessionId: string;
    exportTimestamp: string;
    events: TelemetryEvent[];
    metrics: TelemetryMetrics;
    config: TelemetryConfig;
  }> {
    const metrics = await this.getMetrics();
    
    return {
      sessionId: this.sessionId,
      exportTimestamp: new Date().toISOString(),
      events: this.events,
      metrics,
      config: this.config,
    };
  }

  async cleanup(): Promise<void> {
    try {
      this.logEvent('telemetry_service_cleanup', {
        eventsLogged: this.events.length,
        sessionDuration: Date.now() - this.startTime,
      }, 'info', 'pm_agent');

      // Final metrics update
      if (this.config.enableMetrics) {
        await this.updateMetrics();
      }

      // Cleanup old log files based on retention days
      await this.cleanupOldLogFiles();

      elizaLogger.info(`Telemetry service cleanup completed for session ${this.sessionId}`);
    } catch (error) {
      elizaLogger.error('Failed to cleanup telemetry service:', error);
    }
  }

  private async cleanupOldLogFiles(): Promise<void> {
    try {
      const fs = require('fs');
      const files = fs.readdirSync(this.config.logDirectory);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays);

      for (const file of files) {
        if (file.startsWith('telemetry-') || file.startsWith('metrics-')) {
          const filePath = join(this.config.logDirectory, file);
          const stats = fs.statSync(filePath);
          
          if (stats.mtime < cutoffDate) {
            fs.unlinkSync(filePath);
            elizaLogger.debug(`Deleted old telemetry file: ${file}`);
          }
        }
      }
    } catch (error) {
      elizaLogger.error('Failed to cleanup old telemetry files:', error);
    }
  }

  getSessionId(): string {
    return this.sessionId;
  }

  getSessionDuration(): number {
    return Date.now() - this.startTime;
  }
}