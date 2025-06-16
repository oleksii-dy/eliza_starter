import { logger } from '@elizaos/core';
import type {
  MigrationContext,
  MigrationPhase,
  SDKPhaseResult,
  SDKMigrationOptions,
  ClaudeSDKAdapter,
  PhaseMetrics,
  MigrationMetricsCollector,
  SessionManager
} from './types.js';
import {
  importClaudeSDK,
  validateClaudeSDKEnvironment,
  getSDKErrorContext,
  type SDKMessage,
  type ClaudeSDKModule
} from './sdk-utils.js';

/**
 * Claude SDK Adapter for Migration System
 * 
 * Pure SDK implementation for reliable ElizaOS plugin migration.
 * No CLI dependencies - uses official Claude Code SDK exclusively.
 */
export class EnhancedClaudeSDKAdapter implements ClaudeSDKAdapter {
  private maxRetries = 3;
  private rateLimitDelay = 60000; // 1 minute

  constructor(options?: { maxRetries?: number }) {
    this.maxRetries = options?.maxRetries ?? 3;
  }

  /**
   * Execute a prompt using the Claude Code SDK
   */
  async executePrompt(
    prompt: string, 
    options: SDKMigrationOptions, 
    context: MigrationContext
  ): Promise<SDKPhaseResult> {
    logger.info('🤖 Executing prompt with Claude SDK...');
    
    let retryCount = 0;
    let lastError: unknown = null;

    while (retryCount < this.maxRetries) {
      try {
        return await this.executePromptWithSDK(prompt, options, context);
      } catch (error: unknown) {
        lastError = error;
        const err = error as { message?: string; code?: string };
        
        // Check for rate limiting
        if (this.isRateLimitError(err) && retryCount < this.maxRetries - 1) {
          retryCount++;
          const waitTime = Math.min(this.rateLimitDelay * retryCount, 300000); // Max 5 minutes
          logger.warn(`⏸️  Rate limit detected. Waiting ${waitTime / 1000} seconds before retry ${retryCount}/${this.maxRetries - 1}...`);
          
          await this.showCountdown(waitTime);
          continue;
        }

        retryCount++;
        if (retryCount < this.maxRetries) {
          logger.warn(`🔄 Retrying SDK execution (${retryCount}/${this.maxRetries})...`);
          await new Promise(resolve => setTimeout(resolve, 2000 * retryCount));
        }
      }
    }

    const errorMessage = lastError instanceof Error ? lastError.message : String(lastError);
    throw new Error(`SDK execution failed after ${this.maxRetries} attempts. Last error: ${errorMessage}`);
  }

  /**
   * Execute a specific migration phase with enhanced context
   */
  async executePhase(phase: MigrationPhase, context: MigrationContext): Promise<SDKPhaseResult> {
    logger.info(`🔄 Executing migration phase: ${phase}`);
    
    // Start phase metrics tracking
    context.metricsCollector?.startPhase(phase);
    
    const phasePrompt = this.buildPhasePrompt(phase, context);
    const options = this.getPhaseOptions(phase, context);
    
    try {
      const result = await this.executePrompt(phasePrompt, options, context);
      
      // End phase metrics tracking
      context.metricsCollector?.endPhase(phase, result);
      
      // Update session manager
      if (result.sessionId) {
        context.sessionManager?.setSessionForPhase(phase, result.sessionId);
      }
      
      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      context.metricsCollector?.addError(phase, errorMsg);
      
      return {
        success: false,
        message: `Phase ${phase} failed: ${errorMsg}`,
        error: error as Error
      };
    }
  }

  /**
   * Continue an existing session
   */
  async continueSession(
    sessionId: string, 
    prompt: string, 
    context: MigrationContext
  ): Promise<SDKPhaseResult> {
    logger.info(`🔄 Continuing session: ${sessionId}`);
    
    const options: SDKMigrationOptions = {
      maxTurns: 10,
      resumeSessionId: sessionId,
      outputFormat: 'json'
    };
    
    return await this.executePrompt(prompt, options, context);
  }

  /**
   * Get metrics for a specific session
   */
  async getSessionMetrics(sessionId: string): Promise<PhaseMetrics> {
    // Note: This would need to be implemented based on SDK capabilities
    // For now, return default metrics
    return {
      cost: 0,
      duration: 0,
      turns: 0,
      attempts: 1,
      success: true,
      sessionId,
      errors: []
    };
  }

  /**
   * Execute prompt using the Claude Code SDK
   */
  private async executePromptWithSDK(
    prompt: string,
    options: SDKMigrationOptions,
    context: MigrationContext
  ): Promise<SDKPhaseResult> {
    const messages: SDKMessage[] = [];
    let result: SDKPhaseResult = {
      success: false,
      message: 'No result received'
    };

    try {
      // Validate environment before attempting SDK operations
      validateClaudeSDKEnvironment();
      
      // Safely import Claude SDK
      const claudeModule = await importClaudeSDK();
      const { query } = claudeModule;
      
      for await (const message of query({
        prompt,
        abortController: context.abortController || new AbortController(),
        options: {
          maxTurns: options.maxTurns,
          model: options.model || 'claude-sonnet-4-20250514', // Default to sonnet-4
          systemPrompt: options.systemPrompt,
          outputFormat: options.outputFormat || 'json',
          permissionMode: options.permissionMode || 'acceptEdits',
          ...(options.allowedTools && { allowedTools: options.allowedTools }),
          ...(options.resumeSessionId && { resumeSessionId: options.resumeSessionId })
        },
        cwd: context.repoPath
      })) {
        messages.push(message);
        
        // Process different message types
        if (message.type === 'result') {
          result = {
            success: message.subtype === 'success',
            message: message.subtype === 'success' ? 'Operation completed successfully' : `Operation failed: ${message.subtype}`,
            sessionId: message.session_id,
            cost: message.total_cost_usd,
            duration: message.duration_ms,
            turns: message.num_turns,
            shouldContinue: message.subtype === 'error_max_turns'
          };
          
          if (message.subtype === 'success' && 'result' in message && message.result) {
            result.message = message.result;
          }
        }
        
        // Handle streaming progress updates
        if (message.type === 'assistant' || message.type === 'user') {
          logger.debug(`📝 ${message.type} message in session ${message.session_id || 'unknown'}`);
        }
      }
      
      logger.info(`✅ SDK execution completed. Cost: $${result.cost?.toFixed(4) || '0'}, Duration: ${result.duration || 0}ms`);
      return result;
      
    } catch (error) {
      const err = error as Error;
      const contextualError = getSDKErrorContext(error);
      
      logger.error('❌ SDK execution failed:', contextualError);
      
      return {
        success: false,
        message: `SDK execution failed: ${contextualError}`,
        error: err
      };
    }
  }



  /**
   * Build phase-specific prompts
   */
  private buildPhasePrompt(phase: MigrationPhase, context: MigrationContext): string {
    const basePrompt = context.claudePrompts.get(phase) || this.getDefaultPhasePrompt(phase, context);
    
    return `# ElizaOS V1→V2 Migration: ${phase}

Plugin: ${context.pluginName}
Phase: ${phase}

${basePrompt}

Please execute this migration phase following the ElizaOS V2 patterns exactly.`;
  }

  /**
   * Get phase-specific options
   */
  private getPhaseOptions(phase: MigrationPhase, context: MigrationContext): SDKMigrationOptions {
    const baseOptions: SDKMigrationOptions = {
      maxTurns: 15,
      model: 'claude-sonnet-4-20250514', // Default to Sonnet
      outputFormat: 'json',
      permissionMode: 'acceptEdits'
    };

    // Customize options based on phase complexity
    switch (phase) {
      case 'file-structure-migration':
        return { ...baseOptions, maxTurns: 10, model: 'claude-sonnet-4-20250514' };
      case 'actions-migration':
        return { ...baseOptions, maxTurns: 20, model: 'claude-opus-4-20250514' }; // Complex migrations use Opus
      case 'testing-infrastructure':
        return { ...baseOptions, maxTurns: 25, model: 'claude-opus-4-20250514' }; // Test generation uses Opus
      case 'core-structure-migration':
        return { ...baseOptions, maxTurns: 15, model: 'claude-opus-4-20250514' }; // Architecture changes use Opus
      default:
        return baseOptions;
    }
  }

  /**
   * Get default prompt for phases that don't have custom prompts
   */
  private getDefaultPhasePrompt(phase: MigrationPhase, context: MigrationContext): string {
    return `Execute the ${phase} phase for the ${context.pluginName} plugin migration from V1 to V2.`;
  }

  /**
   * Check if error is rate limit related
   */
  private isRateLimitError(error: { message?: string; code?: string }): boolean {
    const errorMessage = error.message || '';
    return errorMessage.includes('rate limit') ||
           errorMessage.includes('429') ||
           errorMessage.includes('too many requests') ||
           errorMessage.includes('quota exceeded') ||
           error.code === '429';
  }

  /**
   * Show countdown timer
   */
  private async showCountdown(waitTime: number): Promise<void> {
    const seconds = Math.ceil(waitTime / 1000);
    for (let i = seconds; i > 0; i--) {
      process.stdout.write(`\r⏱️  Resuming in ${i} seconds...  `);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    process.stdout.write('\r\n');
  }
}

/**
 * Create metrics collector
 */
export function createMigrationMetricsCollector(): MigrationMetricsCollector {
  const metrics = {
    totalCost: 0,
    totalDuration: 0,
    totalTurns: 0,
    phaseMetrics: new Map(),
    errorCount: 0,
    sessionsUsed: [],
    startTime: new Date()
  };

  return {
    metrics,
    
    startPhase(phase: MigrationPhase) {
      if (!this.metrics.phaseMetrics.has(phase)) {
        this.metrics.phaseMetrics.set(phase, {
          cost: 0,
          duration: 0,
          turns: 0,
          attempts: 0,
          success: false,
          errors: []
        });
      }
    },
    
    endPhase(phase: MigrationPhase, result: SDKPhaseResult) {
      const phaseMetric = this.metrics.phaseMetrics.get(phase);
      if (!phaseMetric) {
        logger.warn(`Phase metrics not found for ${phase}, creating new entry`);
        this.startPhase(phase);
        return this.endPhase(phase, result);
      }
      
      phaseMetric.cost += result.cost || 0;
      phaseMetric.duration += result.duration || 0;
      phaseMetric.turns += result.turns || 0;
      phaseMetric.attempts++;
      phaseMetric.success = result.success;
      
      if (result.sessionId) {
        phaseMetric.sessionId = result.sessionId;
        if (!this.metrics.sessionsUsed.includes(result.sessionId)) {
          this.metrics.sessionsUsed.push(result.sessionId);
        }
      }
      
      this.metrics.totalCost += result.cost || 0;
      this.metrics.totalDuration += result.duration || 0;
      this.metrics.totalTurns += result.turns || 0;
    },
    
    addError(phase: MigrationPhase, error: string) {
      const phaseMetric = this.metrics.phaseMetrics.get(phase);
      if (phaseMetric) {
        phaseMetric.errors.push(error);
      }
      this.metrics.errorCount++;
    },
    
    getTotalCost() {
      return this.metrics.totalCost;
    },
    
    getTotalDuration() {
      return this.metrics.totalDuration;
    },
    
    getPhaseReport(phase: MigrationPhase) {
      return this.metrics.phaseMetrics.get(phase);
    },
    
    getFullReport() {
      this.metrics.endTime = new Date();
      return this.metrics;
    }
  };
}

/**
 * Create session manager
 */
export function createSessionManager(): SessionManager {
  const activeSessions = new Map<MigrationPhase, string>();
  
  return {
    activeSessions,
    
    getSessionForPhase(phase: MigrationPhase) {
      return activeSessions.get(phase);
    },
    
    setSessionForPhase(phase: MigrationPhase, sessionId: string) {
      activeSessions.set(phase, sessionId);
    },
    
    clearSession(phase: MigrationPhase) {
      activeSessions.delete(phase);
    },
    
    getAllSessions() {
      const sessions: Record<string, string> = {};
      for (const [phase, sessionId] of activeSessions.entries()) {
        sessions[phase] = sessionId;
      }
      return sessions;
    }
  };
} 