import fs from 'fs/promises';
import path from 'path';
import { elizaLogger } from '@elizaos/core';

export interface TelemetryOptions {
  enabled: boolean;
  debug: boolean;
  sessionId?: string;
  org?: string;
  logFile?: string;
}

export interface TelemetryEvent {
  id: string;
  sessionId: string;
  timestamp: string;
  event: string;
  data: Record<string, any>;
  source: 'code-interface' | 'autocoder' | 'swarm' | 'github';
}

export interface TelemetryMetrics {
  eventsLogged: number;
  errorsLogged: number;
  sessionDuration: number;
  lastEvent: string;
  mostCommonEvents: Array<{ event: string; count: number }>;
}

export class TelemetryService {
  private options: TelemetryOptions;
  private events: TelemetryEvent[] = [];
  private logFilePath: string;
  private sessionId: string;
  private startTime: number;
  private isStarted = false;

  constructor(options: TelemetryOptions) {
    this.options = options;
    this.sessionId = options.sessionId || `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.startTime = Date.now();
    this.logFilePath = options.logFile || `.elizaos-telemetry-${this.sessionId}.json`;
  }

  async start(): Promise<void> {
    if (!this.options.enabled) {
      elizaLogger.info('Telemetry service disabled');
      return;
    }

    try {
      // Create telemetry directory if it doesn't exist
      const logDir = path.dirname(this.logFilePath);
      await fs.mkdir(logDir, { recursive: true });

      // Log service start
      await this.logEvent('telemetry_service_started', {
        sessionId: this.sessionId,
        enabled: this.options.enabled,
        debug: this.options.debug,
        startTime: new Date().toISOString(),
      });

      this.isStarted = true;
      elizaLogger.info(`Telemetry service started - Session: ${this.sessionId}`);
    } catch (error) {
      elizaLogger.error('Failed to start telemetry service:', error);
      throw error;
    }
  }

  async logEvent(event: string, data: Record<string, any> = {}, source: TelemetryEvent['source'] = 'code-interface'): Promise<void> {
    if (!this.options.enabled) return;

    const telemetryEvent: TelemetryEvent = {
      id: `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      sessionId: this.sessionId,
      timestamp: new Date().toISOString(),
      event,
      data: {
        ...data,
        sessionDuration: Date.now() - this.startTime,
      },
      source,
    };

    this.events.push(telemetryEvent);

    if (this.options.debug) {
      elizaLogger.debug(`Telemetry: ${event}`, data);
    }

    // Write to file asynchronously
    try {
      await this.writeToFile(telemetryEvent);
    } catch (error) {
      elizaLogger.warn('Failed to write telemetry to file:', error);
    }
  }

  async logError(event: string, error: Error, context: Record<string, any> = {}): Promise<void> {
    await this.logEvent(`error_${event}`, {
      ...context,
      error: {
        message: error.message,
        name: error.name,
        stack: error.stack,
      },
      severity: 'error',
    });
  }

  async getMetrics(): Promise<TelemetryMetrics> {
    const now = Date.now();
    const sessionDuration = now - this.startTime;

    // Count event types
    const eventCounts: Record<string, number> = {};
    let errorCount = 0;

    this.events.forEach(event => {
      eventCounts[event.event] = (eventCounts[event.event] || 0) + 1;
      if (event.event.startsWith('error_')) {
        errorCount++;
      }
    });

    // Get most common events
    const mostCommonEvents = Object.entries(eventCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([event, count]) => ({ event, count }));

    return {
      eventsLogged: this.events.length,
      errorsLogged: errorCount,
      sessionDuration,
      lastEvent: this.events[this.events.length - 1]?.event || 'none',
      mostCommonEvents,
    };
  }

  async getEvents(filter?: {
    event?: string;
    source?: TelemetryEvent['source'];
    since?: Date;
    limit?: number;
  }): Promise<TelemetryEvent[]> {
    let filteredEvents = [...this.events];

    if (filter?.event) {
      filteredEvents = filteredEvents.filter(e => e.event.includes(filter.event!));
    }

    if (filter?.source) {
      filteredEvents = filteredEvents.filter(e => e.source === filter.source);
    }

    if (filter?.since) {
      const sinceMs = filter.since.getTime();
      filteredEvents = filteredEvents.filter(e => new Date(e.timestamp).getTime() >= sinceMs);
    }

    if (filter?.limit) {
      filteredEvents = filteredEvents.slice(-filter.limit);
    }

    return filteredEvents;
  }

  private async writeToFile(event: TelemetryEvent): Promise<void> {
    try {
      // Append to JSONL format for easy parsing
      const line = JSON.stringify(event) + '\n';
      await fs.appendFile(this.logFilePath, line, 'utf8');
    } catch (error) {
      // Silently fail file writes to avoid disrupting main operation
      if (this.options.debug) {
        elizaLogger.warn('Telemetry file write failed:', error);
      }
    }
  }

  async exportSession(): Promise<{
    sessionId: string;
    metrics: TelemetryMetrics;
    events: TelemetryEvent[];
    summary: Record<string, any>;
  }> {
    const metrics = await this.getMetrics();
    
    // Create session summary
    const summary = {
      sessionId: this.sessionId,
      startTime: new Date(this.startTime).toISOString(),
      endTime: new Date().toISOString(),
      duration: metrics.sessionDuration,
      totalEvents: metrics.eventsLogged,
      totalErrors: metrics.errorsLogged,
      topEvents: metrics.mostCommonEvents.slice(0, 5),
      performance: this.calculatePerformanceMetrics(),
    };

    return {
      sessionId: this.sessionId,
      metrics,
      events: this.events,
      summary,
    };
  }

  private calculatePerformanceMetrics(): Record<string, any> {
    // Calculate various performance metrics from events
    const userEvents = this.events.filter(e => e.event === 'user_input');
    const responseEvents = this.events.filter(e => e.event === 'agent_response');
    
    let totalResponseTime = 0;
    let responseCount = 0;

    // Match user inputs with responses to calculate response times
    userEvents.forEach(userEvent => {
      const userTime = new Date(userEvent.timestamp).getTime();
      const nextResponse = responseEvents.find(respEvent => {
        const respTime = new Date(respEvent.timestamp).getTime();
        return respTime > userTime && respTime - userTime < 60000; // Within 1 minute
      });

      if (nextResponse) {
        const responseTime = new Date(nextResponse.timestamp).getTime() - userTime;
        totalResponseTime += responseTime;
        responseCount++;
      }
    });

    return {
      averageResponseTime: responseCount > 0 ? totalResponseTime / responseCount : 0,
      totalInteractions: userEvents.length,
      errorRate: this.events.length > 0 ? (this.events.filter(e => e.event.startsWith('error_')).length / this.events.length) : 0,
      eventsPerMinute: this.events.length > 0 ? (this.events.length / (Date.now() - this.startTime)) * 60000 : 0,
    };
  }

  async stop(): Promise<void> {
    if (!this.options.enabled || !this.isStarted) return;

    try {
      // Log service stop and final metrics
      const finalMetrics = await this.getMetrics();
      await this.logEvent('telemetry_service_stopped', {
        sessionId: this.sessionId,
        finalMetrics,
        endTime: new Date().toISOString(),
      });

      // Export session data
      const sessionData = await this.exportSession();
      
      // Write final session summary
      const summaryPath = this.logFilePath.replace('.json', '-summary.json');
      await fs.writeFile(summaryPath, JSON.stringify(sessionData, null, 2), 'utf8');

      elizaLogger.info(`Telemetry service stopped - Session data saved to ${summaryPath}`);
      this.isStarted = false;
    } catch (error) {
      elizaLogger.error('Error stopping telemetry service:', error);
    }
  }

  // GitHub artifact storage integration
  async uploadToGitHub(githubService: any): Promise<string | null> {
    if (!this.options.enabled || !githubService) return null;

    try {
      const sessionData = await this.exportSession();
      const fileName = `telemetry-${this.sessionId}-${Date.now()}.json`;
      
      // Upload to elizaos-artifacts organization
      const repoUrl = await githubService.uploadArtifact(
        'telemetry-logs',
        fileName,
        JSON.stringify(sessionData, null, 2),
        'Telemetry session data'
      );

      await this.logEvent('telemetry_uploaded_to_github', {
        fileName,
        repoUrl,
        dataSize: JSON.stringify(sessionData).length,
      });

      return repoUrl;
    } catch (error) {
      await this.logError('telemetry_upload_failed', error as Error);
      return null;
    }
  }
}

// Export singleton instance for easy access
export let telemetryInstance: TelemetryService | null = null;

export function createTelemetryService(options: TelemetryOptions): TelemetryService {
  telemetryInstance = new TelemetryService(options);
  return telemetryInstance;
}

export function getTelemetryService(): TelemetryService | null {
  return telemetryInstance;
}