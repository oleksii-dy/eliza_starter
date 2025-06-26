// Session management for Claude CLI

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { SessionData, SessionMetrics } from '../types';
import * as crypto from 'crypto';

export class SessionManager {
  private sessionData: SessionData;
  private sessionDir: string;

  constructor() {
    this.sessionDir = path.join(os.homedir(), '.claude-cli', 'sessions');
    this.ensureSessionDir();
    this.sessionData = this.initializeSession();
  }

  private ensureSessionDir(): void {
    if (!fs.existsSync(this.sessionDir)) {
      fs.mkdirSync(this.sessionDir, { recursive: true });
    }
  }

  private initializeSession(): SessionData {
    const sessionId = this.generateSessionId();
    return {
      id: sessionId,
      startTime: new Date(),
      cwd: process.cwd(),
      metrics: {
        inputTokens: 0,
        outputTokens: 0,
        cacheReadTokens: 0,
        cacheCreationTokens: 0,
        totalCost: 0,
        duration: 0,
      }
    };
  }

  private generateSessionId(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  getSessionId(): string {
    return this.sessionData.id;
  }

  updateMetrics(metrics: Partial<SessionMetrics>): void {
    Object.assign(this.sessionData.metrics, metrics);
  }

  addTokenUsage(usage: {
    input_tokens: number;
    output_tokens: number;
    cache_read_input_tokens?: number;
    cache_creation_input_tokens?: number;
  }): void {
    this.sessionData.metrics.inputTokens += usage.input_tokens;
    this.sessionData.metrics.outputTokens += usage.output_tokens;
    this.sessionData.metrics.cacheReadTokens += usage.cache_read_input_tokens || 0;
    this.sessionData.metrics.cacheCreationTokens += usage.cache_creation_input_tokens || 0;
    
    // Simple cost calculation (example rates)
    const inputCost = this.sessionData.metrics.inputTokens * 0.000003;
    const outputCost = this.sessionData.metrics.outputTokens * 0.000015;
    this.sessionData.metrics.totalCost = inputCost + outputCost;
  }

  saveSession(): void {
    const sessionFile = path.join(this.sessionDir, `${this.sessionData.id}.json`);
    fs.writeFileSync(sessionFile, JSON.stringify(this.sessionData, null, 2));
  }

  getMetrics(): SessionMetrics {
    return { ...this.sessionData.metrics };
  }

  getDuration(): number {
    return Date.now() - this.sessionData.startTime.getTime();
  }
}

// Global session instance
let globalSession: SessionManager | null = null;

export function initializeSession(): SessionManager {
  if (!globalSession) {
    globalSession = new SessionManager();
  }
  return globalSession;
}

export function getSession(): SessionManager {
  if (!globalSession) {
    throw new Error('Session not initialized');
  }
  return globalSession;
}

export function getSessionId(): string {
  return getSession().getSessionId();
} 