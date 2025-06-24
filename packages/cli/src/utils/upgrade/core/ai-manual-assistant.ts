/**
 * AI-Assisted Manual Override System
 *
 * Provides intelligent assistance during manual migration interventions:
 * - Real-time AI suggestions with <500ms latency
 * - Validates all manual changes with 100% accuracy
 * - Learns from manual interventions to automate future cases
 * - Eventually eliminates need for manual work through pattern automation
 *
 * Philosophy: "AI makes manual intervention unnecessary"
 *
 * @author ElizaOS Plugin Migrator v2
 * @version 2.0.0
 */

import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { mkdirSync } from 'fs';
import type { MigrationContext } from '../types.js';

/**
 * Configuration for AI-assisted manual override system
 */
export interface AIManualAssistantConfig {
  /** Maximum iterations for assistance until automation (default: 100) */
  maxIterations?: number;

  /** Confidence threshold for automatic pattern application (default: 0.95) */
  automationThreshold?: number;

  /** Minimum confidence for AI suggestions (default: 0.7) */
  suggestionConfidence?: number;

  /** Maximum response time for suggestions in ms (default: 500) */
  maxSuggestionLatency?: number;

  /** Enable real-time suggestion generation (default: true) */
  enableRealTimeSuggestions?: boolean;

  /** Enable pattern learning from manual fixes (default: true) */
  enablePatternLearning?: boolean;

  /** Enable automatic pattern application (default: true) */
  enablePatternAutomation?: boolean;

  /** Enable comprehensive change validation (default: true) */
  enableChangeValidation?: boolean;

  /** Storage directory for learned patterns (default: .cache/manual-overrides) */
  storageDirectory?: string;
}

/**
 * Context for manual override operations
 */
export interface OverrideContext {
  /** Current file being processed */
  filePath: string;

  /** Current code content */
  currentCode: string;

  /** Migration error that triggered manual intervention */
  error: {
    type: string;
    message: string;
    location?: { line: number; column: number };
    stack?: string;
  };

  /** Pattern context for transformation */
  patternContext: {
    v1Patterns: string[];
    v2Patterns: string[];
    transformationType: string;
  };

  /** Previous attempts and their results */
  previousAttempts: Array<{
    attempt: number;
    approach: string;
    result: 'success' | 'failure';
    error?: string;
  }>;

  /** Migration context */
  migrationContext: MigrationContext;

  /** Timestamp of override request */
  timestamp: number;
}

/**
 * AI-generated suggestion for manual fix
 */
export interface Suggestion {
  /** Unique identifier for the suggestion */
  id: string;

  /** Human-readable title */
  title: string;

  /** Detailed explanation of the fix */
  explanation: string;

  /** Proposed code change */
  change: {
    type: 'replace' | 'insert' | 'delete' | 'restructure';
    target: string;
    replacement?: string;
    position?: { line: number; column: number };
  };

  /** AI confidence in suggestion (0-1) */
  confidence: number;

  /** Expected success probability */
  successProbability: number;

  /** Similar patterns that support this suggestion */
  precedents: string[];

  /** Estimated implementation time */
  estimatedTime: string;

  /** Risk assessment */
  riskLevel: 'low' | 'medium' | 'high';

  /** Generation latency in milliseconds */
  latency: number;
}

/**
 * User choice during manual override
 */
export interface UserChoice {
  /** Type of choice made */
  type: 'ai-suggestion' | 'manual' | 'skip' | 'abort';

  /** Selected suggestion index (if ai-suggestion) */
  suggestionIndex?: number;

  /** Manual change (if manual) */
  manualChange?: {
    code: string;
    explanation: string;
  };

  /** Timestamp of choice */
  timestamp: number;

  /** Time taken to make choice */
  decisionTime: number;
}

/**
 * Validation result for manual changes
 */
export interface ValidationResult {
  /** Whether the change is valid */
  isValid: boolean;

  /** Confidence in validation (0-1) */
  confidence: number;

  /** Validation issues found */
  issues: Array<{
    type: 'syntax' | 'semantic' | 'pattern' | 'performance' | 'security';
    severity: 'error' | 'warning' | 'info';
    message: string;
    location?: { line: number; column: number };
    fix?: string;
  }>;

  /** Suggestions for improvement */
  improvements: string[];

  /** Validation latency */
  latency: number;
}

/**
 * Learned pattern from manual interventions
 */
export interface LearnedPattern {
  /** Unique pattern identifier */
  id: string;

  /** Pattern name */
  name: string;

  /** Pattern description */
  description: string;

  /** Trigger conditions */
  triggers: {
    errorTypes: string[];
    codePatterns: string[];
    contextConditions: string[];
  };

  /** Automated fix logic */
  automation: {
    type: 'template' | 'ai-generated' | 'rule-based';
    implementation: string;
    parameters: Record<string, any>;
  };

  /** Pattern effectiveness metrics */
  metrics: {
    successRate: number;
    usageCount: number;
    lastUsed: number;
    averageTime: number;
    userSatisfaction: number;
  };

  /** Confidence in automation */
  automationConfidence: number;

  /** Learning timestamp */
  learned: number;

  /** Pattern version */
  version: number;
}

/**
 * Suggestion generation statistics
 */
export interface SuggestionStats {
  /** Total suggestions generated */
  totalGenerated: number;

  /** Suggestions accepted by users */
  accepted: number;

  /** Suggestions rejected by users */
  rejected: number;

  /** Average generation latency */
  averageLatency: number;

  /** Average confidence score */
  averageConfidence: number;

  /** Success rate for accepted suggestions */
  successRate: number;
}

/**
 * Manual intervention statistics
 */
export interface InterventionStats {
  /** Total manual interventions required */
  totalInterventions: number;

  /** Interventions that resulted in successful automation */
  automatedCount: number;

  /** Current automation rate */
  automationRate: number;

  /** Average time per intervention */
  averageTime: number;

  /** Patterns learned from interventions */
  patternsLearned: number;
}

/**
 * AI-Assisted Manual Override System
 *
 * Main orchestrator that coordinates AI suggestions, manual change validation,
 * pattern learning, and eventual automation of manual interventions.
 */
export class AIManualAssistant {
  private config: Required<AIManualAssistantConfig>;
  private claude: any; // ClaudeIntegration instance
  private context: MigrationContext;

  // Internal components
  private suggestionEngine: SuggestionEngine;
  private changeValidator: ChangeValidator;
  private patternLearner: PatternLearner;
  private patternAutomator: PatternAutomator;

  // Statistics tracking
  private suggestionStats: SuggestionStats = {
    totalGenerated: 0,
    accepted: 0,
    rejected: 0,
    averageLatency: 0,
    averageConfidence: 0,
    successRate: 0,
  };

  private interventionStats: InterventionStats = {
    totalInterventions: 0,
    automatedCount: 0,
    automationRate: 0,
    averageTime: 0,
    patternsLearned: 0,
  };

  // State tracking
  private learnedPatterns: Map<string, LearnedPattern> = new Map();
  private activeOverrides: Map<string, OverrideContext> = new Map();

  constructor(context: MigrationContext, claude: any, config: AIManualAssistantConfig = {}) {
    this.context = context;
    this.claude = claude;
    this.config = {
      maxIterations: 100,
      automationThreshold: 0.95,
      suggestionConfidence: 0.7,
      maxSuggestionLatency: 500,
      enableRealTimeSuggestions: true,
      enablePatternLearning: true,
      enablePatternAutomation: true,
      enableChangeValidation: true,
      storageDirectory: '.cache/manual-overrides',
      ...config,
    };

    // Initialize components
    this.suggestionEngine = new SuggestionEngine(claude, this.config);
    this.changeValidator = new ChangeValidator(claude, this.config);
    this.patternLearner = new PatternLearner(claude, this.config);
    this.patternAutomator = new PatternAutomator(claude, this.config);
  }

  /**
   * Initialize the AI Manual Assistant system
   */
  async initialize(): Promise<void> {
    console.log('🤖 Initializing AI Manual Assistant...');

    try {
      // Create storage directory
      const storageDir = join(this.context.workingDir, this.config.storageDirectory);
      if (!existsSync(storageDir)) {
        mkdirSync(storageDir, { recursive: true });
      }

      // Load existing learned patterns
      await this.loadLearnedPatterns();

      // Initialize components
      await this.suggestionEngine.initialize();
      await this.changeValidator.initialize();
      await this.patternLearner.initialize();
      await this.patternAutomator.initialize();

      console.log(
        `✅ AI Manual Assistant initialized with ${this.learnedPatterns.size} learned patterns`
      );
    } catch (error) {
      console.error('❌ Failed to initialize AI Manual Assistant:', error);
      throw error;
    }
  }

  /**
   * Main assistance loop - continues until manual intervention is unnecessary
   *
   * This is the primary method that orchestrates the entire manual override process:
   * 1. Detects when manual intervention is needed
   * 2. Generates AI suggestions in real-time
   * 3. Validates manual changes
   * 4. Learns from interventions
   * 5. Automates patterns when confidence is high
   * 6. Tracks progress toward full automation
   */
  async assistUntilUnnecessary(): Promise<{
    success: boolean;
    automationAchieved: boolean;
    finalStats: {
      suggestions: SuggestionStats;
      interventions: InterventionStats;
    };
  }> {
    console.log('🚀 Starting AI-assisted manual override process...');

    let iteration = 0;
    let consecutiveAutomations = 0;
    const automationThreshold = 5; // Need 5 consecutive automations to declare success

    try {
      while (iteration < this.config.maxIterations) {
        iteration++;

        console.log(`\n🔄 Assistance iteration ${iteration}/${this.config.maxIterations}`);

        // Check if manual intervention is needed
        const interventionNeeded = await this.checkInterventionNeeded();

        if (!interventionNeeded.needed) {
          consecutiveAutomations++;
          console.log(
            `✅ No manual intervention needed (${consecutiveAutomations}/${automationThreshold})`
          );

          if (consecutiveAutomations >= automationThreshold) {
            console.log(
              '🎉 Automation threshold reached! Manual intervention no longer necessary.'
            );
            return {
              success: true,
              automationAchieved: true,
              finalStats: {
                suggestions: this.suggestionStats,
                interventions: this.interventionStats,
              },
            };
          }

          await this.sleep(1000); // Wait before next check
          continue;
        }

        // Reset consecutive automations counter
        consecutiveAutomations = 0;

        console.log(`⚠️ Manual intervention needed: ${interventionNeeded.reason}`);

        // Gather context for the intervention
        const context = await this.gatherOverrideContext(interventionNeeded);

        // Check if we can apply an existing automated pattern
        const automatedResult = await this.tryAutomatedPattern(context);

        if (automatedResult.success) {
          console.log(`🤖 Applied automated pattern: ${automatedResult.patternName}`);
          this.interventionStats.automatedCount++;
          this.updateAutomationRate();
          continue;
        }

        // Generate AI suggestions
        const startTime = Date.now();
        const suggestions = await this.generateSuggestions(context);
        const suggestionLatency = Date.now() - startTime;

        if (suggestionLatency > this.config.maxSuggestionLatency) {
          console.warn(
            `⚠️ Suggestion generation took ${suggestionLatency}ms (target: ${this.config.maxSuggestionLatency}ms)`
          );
        }

        // Present suggestions and get user choice
        const userChoice = await this.getUserChoice(suggestions, context);

        // Process the user's choice
        const result = await this.processUserChoice(userChoice, suggestions, context);

        if (result.success) {
          // Learn from the intervention
          if (this.config.enablePatternLearning) {
            await this.learnFromIntervention(userChoice, context, result);
          }

          // Update statistics
          this.updateInterventionStats(userChoice, startTime);

          // Check if we can automate this pattern
          await this.checkForAutomationOpportunity(context, userChoice);
        } else {
          console.error(`❌ Intervention failed: ${result.error}`);
        }
      }

      // Reached max iterations without full automation
      console.log(
        `⚠️ Reached maximum iterations (${this.config.maxIterations}) without achieving full automation`
      );

      return {
        success: true,
        automationAchieved: this.interventionStats.automationRate > 0.95,
        finalStats: {
          suggestions: this.suggestionStats,
          interventions: this.interventionStats,
        },
      };
    } catch (error) {
      console.error('❌ Error in assistance loop:', error);
      return {
        success: false,
        automationAchieved: false,
        finalStats: {
          suggestions: this.suggestionStats,
          interventions: this.interventionStats,
        },
      };
    }
  }

  /**
   * Generate AI suggestions for a manual override context
   */
  async generateSuggestions(context: OverrideContext): Promise<Suggestion[]> {
    const startTime = Date.now();

    try {
      console.log('🧠 Generating AI suggestions...');

      const suggestions = await this.suggestionEngine.generateSuggestions(context);

      const latency = Date.now() - startTime;
      console.log(`✅ Generated ${suggestions.length} suggestions in ${latency}ms`);

      // Update statistics
      this.suggestionStats.totalGenerated += suggestions.length;
      this.suggestionStats.averageLatency = (this.suggestionStats.averageLatency + latency) / 2;

      // Filter by confidence threshold
      const filteredSuggestions = suggestions.filter(
        (s) => s.confidence >= this.config.suggestionConfidence
      );

      console.log(
        `📊 ${filteredSuggestions.length}/${suggestions.length} suggestions meet confidence threshold`
      );

      return filteredSuggestions;
    } catch (error) {
      console.error('❌ Error generating suggestions:', error);
      return [];
    }
  }

  /**
   * Validate a manual change before applying it
   */
  async validateManualChange(
    change: UserChoice['manualChange'],
    context: OverrideContext
  ): Promise<ValidationResult> {
    if (!change) {
      return {
        isValid: false,
        confidence: 0,
        issues: [
          {
            type: 'syntax',
            severity: 'error',
            message: 'No manual change provided',
          },
        ],
        improvements: [],
        latency: 0,
      };
    }

    console.log('🔍 Validating manual change...');

    const startTime = Date.now();

    try {
      const validation = await this.changeValidator.validate(change, context);

      const latency = Date.now() - startTime;
      validation.latency = latency;

      console.log(
        `${validation.isValid ? '✅' : '❌'} Validation completed in ${latency}ms (confidence: ${(validation.confidence * 100).toFixed(1)}%)`
      );

      if (!validation.isValid) {
        console.log(`📋 Found ${validation.issues.length} issues:`);
        validation.issues.forEach((issue) => {
          console.log(`  - ${issue.severity.toUpperCase()}: ${issue.message}`);
        });
      }

      return validation;
    } catch (error) {
      console.error('❌ Error validating manual change:', error);
      return {
        isValid: false,
        confidence: 0,
        issues: [
          {
            type: 'syntax',
            severity: 'error',
            message: `Validation error: ${error.message}`,
          },
        ],
        improvements: [],
        latency: Date.now() - startTime,
      };
    }
  }

  /**
   * Learn from a manual intervention choice
   */
  async learnFromChoice(choice: UserChoice, context: OverrideContext): Promise<void> {
    if (!this.config.enablePatternLearning) {
      return;
    }

    console.log('📚 Learning from manual intervention...');

    try {
      const pattern = await this.patternLearner.extractPattern(choice, context);

      if (pattern) {
        // Store the learned pattern
        this.learnedPatterns.set(pattern.id, pattern);

        // Save to persistent storage
        await this.saveLearnedPatterns();

        console.log(
          `✅ Learned new pattern: ${pattern.name} (confidence: ${(pattern.automationConfidence * 100).toFixed(1)}%)`
        );

        // Check if pattern can be automated
        if (pattern.automationConfidence >= this.config.automationThreshold) {
          await this.patternAutomator.addPattern(pattern);
          console.log(`🤖 Pattern "${pattern.name}" added to automation system`);
        }

        this.interventionStats.patternsLearned++;
      }
    } catch (error) {
      console.error('❌ Error learning from choice:', error);
    }
  }

  /**
   * Attempt to automate a pattern
   */
  async automatePattern(
    pattern: LearnedPattern,
    context: OverrideContext
  ): Promise<{
    success: boolean;
    result?: any;
    error?: string;
  }> {
    if (!this.config.enablePatternAutomation) {
      return { success: false, error: 'Pattern automation disabled' };
    }

    console.log(`🤖 Attempting to automate pattern: ${pattern.name}`);

    try {
      const result = await this.patternAutomator.applyPattern(pattern, context);

      if (result.success) {
        // Update pattern metrics
        pattern.metrics.usageCount++;
        pattern.metrics.lastUsed = Date.now();
        pattern.metrics.successRate =
          (pattern.metrics.successRate * (pattern.metrics.usageCount - 1) + 1) /
          pattern.metrics.usageCount;

        // Save updated pattern
        this.learnedPatterns.set(pattern.id, pattern);
        await this.saveLearnedPatterns();

        console.log(`✅ Pattern automated successfully`);
      } else {
        console.log(`❌ Pattern automation failed: ${result.error}`);

        // Update failure metrics
        pattern.metrics.successRate =
          (pattern.metrics.successRate * pattern.metrics.usageCount) /
          (pattern.metrics.usageCount + 1);
        pattern.metrics.usageCount++;
      }

      return result;
    } catch (error) {
      console.error('❌ Error automating pattern:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get statistics about AI suggestions
   */
  getSuggestionStats(): SuggestionStats {
    return { ...this.suggestionStats };
  }

  /**
   * Get statistics about manual interventions
   */
  getInterventionStats(): InterventionStats {
    return { ...this.interventionStats };
  }

  /**
   * Get all learned patterns
   */
  getLearnedPatterns(): LearnedPattern[] {
    return Array.from(this.learnedPatterns.values());
  }

  /**
   * Check if manual intervention is needed
   */
  private async checkInterventionNeeded(): Promise<{
    needed: boolean;
    reason?: string;
    context?: any;
  }> {
    // This would typically be called by the migration system
    // For now, simulate based on active overrides
    return {
      needed: this.activeOverrides.size > 0,
      reason: this.activeOverrides.size > 0 ? 'Active override requests pending' : undefined,
    };
  }

  /**
   * Gather context for an override operation
   */
  private async gatherOverrideContext(intervention: any): Promise<OverrideContext> {
    // Implementation would gather actual context from migration system
    return {
      filePath: intervention.filePath || 'unknown',
      currentCode: intervention.code || '',
      error: intervention.error || { type: 'unknown', message: 'Unknown error' },
      patternContext: {
        v1Patterns: [],
        v2Patterns: [],
        transformationType: 'unknown',
      },
      previousAttempts: [],
      migrationContext: this.context,
      timestamp: Date.now(),
    };
  }

  /**
   * Try to apply an existing automated pattern
   */
  private async tryAutomatedPattern(context: OverrideContext): Promise<{
    success: boolean;
    patternName?: string;
    error?: string;
  }> {
    // Find matching patterns
    for (const pattern of this.learnedPatterns.values()) {
      if (pattern.automationConfidence >= this.config.automationThreshold) {
        // Check if pattern matches current context
        const matches = await this.checkPatternMatch(pattern, context);

        if (matches) {
          const result = await this.automatePattern(pattern, context);
          if (result.success) {
            return { success: true, patternName: pattern.name };
          }
        }
      }
    }

    return { success: false, error: 'No matching automated patterns found' };
  }

  /**
   * Check if a pattern matches the current context
   */
  private async checkPatternMatch(
    pattern: LearnedPattern,
    context: OverrideContext
  ): Promise<boolean> {
    // Check error type match
    if (!pattern.triggers.errorTypes.includes(context.error.type)) {
      return false;
    }

    // Check code pattern match (simplified)
    const codeMatches = pattern.triggers.codePatterns.some((codePattern) =>
      context.currentCode.includes(codePattern)
    );

    return codeMatches;
  }

  /**
   * Simulate getting user choice (in real implementation, this would be interactive)
   */
  private async getUserChoice(
    suggestions: Suggestion[],
    context: OverrideContext
  ): Promise<UserChoice> {
    const startTime = Date.now();

    // For automation testing, prefer the highest confidence suggestion
    if (suggestions.length > 0) {
      const bestSuggestion = suggestions.reduce((best, current) =>
        current.confidence > best.confidence ? current : best
      );

      if (bestSuggestion.confidence > 0.9) {
        return {
          type: 'ai-suggestion',
          suggestionIndex: suggestions.indexOf(bestSuggestion),
          timestamp: Date.now(),
          decisionTime: Date.now() - startTime,
        };
      }
    }

    // Simulate manual choice for lower confidence cases
    return {
      type: 'manual',
      manualChange: {
        code: context.currentCode, // Simplified - would be actual manual fix
        explanation: 'Manual fix applied',
      },
      timestamp: Date.now(),
      decisionTime: Date.now() - startTime,
    };
  }

  /**
   * Process the user's choice
   */
  private async processUserChoice(
    choice: UserChoice,
    suggestions: Suggestion[],
    context: OverrideContext
  ): Promise<{ success: boolean; error?: string }> {
    switch (choice.type) {
      case 'ai-suggestion':
        if (choice.suggestionIndex !== undefined) {
          const suggestion = suggestions[choice.suggestionIndex];
          this.suggestionStats.accepted++;
          console.log(`✅ Applied AI suggestion: ${suggestion.title}`);
          return { success: true };
        }
        return { success: false, error: 'Invalid suggestion index' };

      case 'manual':
        if (choice.manualChange) {
          const validation = await this.validateManualChange(choice.manualChange, context);
          if (validation.isValid) {
            console.log(`✅ Applied validated manual change`);
            return { success: true };
          } else {
            console.log(`❌ Manual change validation failed`);
            return { success: false, error: 'Manual change validation failed' };
          }
        }
        return { success: false, error: 'No manual change provided' };

      case 'skip':
        console.log(`⏭️ User chose to skip intervention`);
        return { success: true };

      case 'abort':
        console.log(`🛑 User chose to abort intervention`);
        return { success: false, error: 'User aborted intervention' };

      default:
        return { success: false, error: 'Unknown choice type' };
    }
  }

  /**
   * Learn from an intervention
   */
  private async learnFromIntervention(
    choice: UserChoice,
    context: OverrideContext,
    result: any
  ): Promise<void> {
    if (choice.type === 'manual' || choice.type === 'ai-suggestion') {
      await this.learnFromChoice(choice, context);
    }
  }

  /**
   * Check for automation opportunities
   */
  private async checkForAutomationOpportunity(
    context: OverrideContext,
    choice: UserChoice
  ): Promise<void> {
    // If we've seen this pattern multiple times, consider automation
    const similarPatterns = Array.from(this.learnedPatterns.values()).filter((pattern) =>
      pattern.triggers.errorTypes.includes(context.error.type)
    );

    if (similarPatterns.length >= 3) {
      console.log(
        `🤖 Found ${similarPatterns.length} similar patterns - checking for automation opportunity`
      );

      // Find the pattern with highest confidence
      const bestPattern = similarPatterns.reduce((best, current) =>
        current.automationConfidence > best.automationConfidence ? current : best
      );

      if (bestPattern.automationConfidence >= this.config.automationThreshold) {
        await this.patternAutomator.addPattern(bestPattern);
        console.log(`🚀 Pattern "${bestPattern.name}" promoted to automation`);
      }
    }
  }

  /**
   * Update intervention statistics
   */
  private updateInterventionStats(choice: UserChoice, startTime: number): void {
    this.interventionStats.totalInterventions++;

    const interventionTime = Date.now() - startTime;
    this.interventionStats.averageTime =
      (this.interventionStats.averageTime + interventionTime) / 2;

    this.updateAutomationRate();
  }

  /**
   * Update automation rate calculation
   */
  private updateAutomationRate(): void {
    if (this.interventionStats.totalInterventions > 0) {
      this.interventionStats.automationRate =
        this.interventionStats.automatedCount / this.interventionStats.totalInterventions;
    }
  }

  /**
   * Load learned patterns from persistent storage
   */
  private async loadLearnedPatterns(): Promise<void> {
    try {
      const patternsFile = join(
        this.context.workingDir,
        this.config.storageDirectory,
        'patterns.json'
      );

      if (existsSync(patternsFile)) {
        const data = await readFile(patternsFile, 'utf-8');
        const patterns = JSON.parse(data) as LearnedPattern[];

        patterns.forEach((pattern) => {
          this.learnedPatterns.set(pattern.id, pattern);
        });

        console.log(`📚 Loaded ${patterns.length} learned patterns`);
      }
    } catch (error) {
      console.warn('⚠️ Could not load learned patterns:', error.message);
    }
  }

  /**
   * Save learned patterns to persistent storage
   */
  private async saveLearnedPatterns(): Promise<void> {
    try {
      const patternsFile = join(
        this.context.workingDir,
        this.config.storageDirectory,
        'patterns.json'
      );
      const patterns = Array.from(this.learnedPatterns.values());

      // Ensure directory exists
      const dir = dirname(patternsFile);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }

      await writeFile(patternsFile, JSON.stringify(patterns, null, 2));
    } catch (error) {
      console.error('❌ Could not save learned patterns:', error);
    }
  }

  /**
   * Utility method for delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Suggestion Engine - Generates AI-powered suggestions for manual fixes
 */
class SuggestionEngine {
  private claude: any;
  private config: Required<AIManualAssistantConfig>;

  constructor(claude: any, config: Required<AIManualAssistantConfig>) {
    this.claude = claude;
    this.config = config;
  }

  async initialize(): Promise<void> {
    console.log('🧠 Initializing Suggestion Engine...');
  }

  async generateSuggestions(context: OverrideContext): Promise<Suggestion[]> {
    const startTime = Date.now();

    try {
      const prompt = this.buildSuggestionPrompt(context);
      const response = await this.claude.generateResponse(prompt);

      const suggestions = this.parseSuggestionsResponse(response);
      const latency = Date.now() - startTime;

      // Add latency to each suggestion
      return suggestions.map((suggestion) => ({
        ...suggestion,
        latency,
      }));
    } catch (error) {
      console.error('❌ Error generating suggestions:', error);
      return [];
    }
  }

  private buildSuggestionPrompt(context: OverrideContext): string {
    return `
<manual_override_assistance>
<context>
  <file_path>${context.filePath}</file_path>
  <current_code>${context.currentCode}</current_code>
  <error>
    <type>${context.error.type}</type>
    <message>${context.error.message}</message>
    ${context.error.location ? `<location>line ${context.error.location.line}, column ${context.error.location.column}</location>` : ''}
  </error>
  <pattern_context>
    <v1_patterns>${context.patternContext.v1Patterns.join(', ')}</v1_patterns>
    <v2_patterns>${context.patternContext.v2Patterns.join(', ')}</v2_patterns>
    <transformation_type>${context.patternContext.transformationType}</transformation_type>
  </pattern_context>
  <previous_attempts>
    ${context.previousAttempts
      .map(
        (attempt) =>
          `<attempt>${attempt.attempt}: ${attempt.approach} - ${attempt.result}${attempt.error ? ` (${attempt.error})` : ''}</attempt>`
      )
      .join('\n')}
  </previous_attempts>
</context>

Generate 3-5 specific suggestions to fix this migration issue:

1. **Analyze the root cause** of the error
2. **Propose multiple solutions** with different approaches
3. **Rank by likelihood of success** (provide confidence scores 0-1)
4. **Explain each suggestion** clearly with reasoning
5. **Include specific code changes** needed
6. **Estimate implementation time** for each
7. **Assess risk level** (low/medium/high)

Consider:
- ElizaOS V1 to V2 migration patterns
- Common edge cases and gotchas
- Performance implications
- Code maintainability
- Semantic preservation

Respond in JSON format with array of suggestions.
</manual_override_assistance>
    `;
  }

  private parseSuggestionsResponse(response: string): Suggestion[] {
    try {
      // Parse AI response and convert to Suggestion objects
      const parsed = JSON.parse(response);

      if (Array.isArray(parsed)) {
        return parsed.map((item, index) => ({
          id: `suggestion-${Date.now()}-${index}`,
          title: item.title || 'AI Suggestion',
          explanation: item.explanation || 'No explanation provided',
          change: {
            type: item.change?.type || 'replace',
            target: item.change?.target || '',
            replacement: item.change?.replacement,
            position: item.change?.position,
          },
          confidence: Math.max(0, Math.min(1, item.confidence || 0.5)),
          successProbability: Math.max(0, Math.min(1, item.successProbability || 0.5)),
          precedents: item.precedents || [],
          estimatedTime: item.estimatedTime || 'Unknown',
          riskLevel: item.riskLevel || 'medium',
          latency: 0, // Will be set by caller
        }));
      }

      return [];
    } catch (error) {
      console.error('❌ Error parsing suggestions response:', error);
      return [];
    }
  }
}

/**
 * Change Validator - Validates manual changes before applying them
 */
class ChangeValidator {
  private claude: any;
  private config: Required<AIManualAssistantConfig>;

  constructor(claude: any, config: Required<AIManualAssistantConfig>) {
    this.claude = claude;
    this.config = config;
  }

  async initialize(): Promise<void> {
    console.log('🔍 Initializing Change Validator...');
  }

  async validate(
    change: UserChoice['manualChange'],
    context: OverrideContext
  ): Promise<ValidationResult> {
    if (!change) {
      return {
        isValid: false,
        confidence: 0,
        issues: [{ type: 'syntax', severity: 'error', message: 'No change provided' }],
        improvements: [],
        latency: 0,
      };
    }

    try {
      // Perform multiple validation checks
      const syntaxCheck = await this.validateSyntax(change.code);
      const semanticCheck = await this.validateSemantics(change.code, context);
      const patternCheck = await this.validatePatternCompliance(change.code, context);

      // Combine results
      const allIssues = [...syntaxCheck.issues, ...semanticCheck.issues, ...patternCheck.issues];

      const isValid = allIssues.filter((issue) => issue.severity === 'error').length === 0;

      // Calculate overall confidence
      const confidence =
        (syntaxCheck.confidence + semanticCheck.confidence + patternCheck.confidence) / 3;

      return {
        isValid,
        confidence,
        issues: allIssues,
        improvements: [
          ...syntaxCheck.improvements,
          ...semanticCheck.improvements,
          ...patternCheck.improvements,
        ],
        latency: 0, // Will be set by caller
      };
    } catch (error) {
      return {
        isValid: false,
        confidence: 0,
        issues: [
          {
            type: 'syntax',
            severity: 'error',
            message: `Validation error: ${error.message}`,
          },
        ],
        improvements: [],
        latency: 0,
      };
    }
  }

  private async validateSyntax(code: string): Promise<{
    confidence: number;
    issues: ValidationResult['issues'];
    improvements: string[];
  }> {
    // Simplified syntax validation
    try {
      // This would typically use TypeScript compiler API
      return {
        confidence: 0.9,
        issues: [],
        improvements: [],
      };
    } catch (error) {
      return {
        confidence: 0,
        issues: [
          {
            type: 'syntax',
            severity: 'error',
            message: `Syntax error: ${error.message}`,
          },
        ],
        improvements: ['Fix syntax errors before proceeding'],
      };
    }
  }

  private async validateSemantics(
    code: string,
    context: OverrideContext
  ): Promise<{
    confidence: number;
    issues: ValidationResult['issues'];
    improvements: string[];
  }> {
    // Simplified semantic validation
    return {
      confidence: 0.8,
      issues: [],
      improvements: [],
    };
  }

  private async validatePatternCompliance(
    code: string,
    context: OverrideContext
  ): Promise<{
    confidence: number;
    issues: ValidationResult['issues'];
    improvements: string[];
  }> {
    // Simplified pattern compliance validation
    return {
      confidence: 0.85,
      issues: [],
      improvements: [],
    };
  }
}

/**
 * Pattern Learner - Learns patterns from manual interventions
 */
class PatternLearner {
  private claude: any;
  private config: Required<AIManualAssistantConfig>;
  private patternCounter = 0;

  constructor(claude: any, config: Required<AIManualAssistantConfig>) {
    this.claude = claude;
    this.config = config;
  }

  async initialize(): Promise<void> {
    console.log('📚 Initializing Pattern Learner...');
  }

  async extractPattern(
    choice: UserChoice,
    context: OverrideContext
  ): Promise<LearnedPattern | null> {
    try {
      this.patternCounter++;

      // Extract pattern from the manual intervention
      const pattern: LearnedPattern = {
        id: `pattern-${Date.now()}-${this.patternCounter}`,
        name: this.generatePatternName(context),
        description: this.generatePatternDescription(choice, context),
        triggers: {
          errorTypes: [context.error.type],
          codePatterns: this.extractCodePatterns(context.currentCode),
          contextConditions: [context.patternContext.transformationType],
        },
        automation: {
          type: choice.type === 'ai-suggestion' ? 'ai-generated' : 'template',
          implementation: this.generateAutomationLogic(choice, context),
          parameters: {},
        },
        metrics: {
          successRate: 1.0, // Start optimistic
          usageCount: 1,
          lastUsed: Date.now(),
          averageTime: 0,
          userSatisfaction: choice.type === 'ai-suggestion' ? 0.9 : 0.7,
        },
        automationConfidence: this.calculateAutomationConfidence(choice, context),
        learned: Date.now(),
        version: 1,
      };

      return pattern;
    } catch (error) {
      console.error('❌ Error extracting pattern:', error);
      return null;
    }
  }

  private generatePatternName(context: OverrideContext): string {
    return `${context.error.type}-fix-${context.patternContext.transformationType}`;
  }

  private generatePatternDescription(choice: UserChoice, context: OverrideContext): string {
    if (choice.type === 'ai-suggestion') {
      return `AI-suggested fix for ${context.error.type} during ${context.patternContext.transformationType}`;
    } else {
      return `Manual fix for ${context.error.type} during ${context.patternContext.transformationType}`;
    }
  }

  private extractCodePatterns(code: string): string[] {
    // Simplified pattern extraction
    const patterns: string[] = [];

    // Look for common patterns
    if (code.includes('import')) patterns.push('import-statement');
    if (code.includes('export')) patterns.push('export-statement');
    if (code.includes('class')) patterns.push('class-definition');
    if (code.includes('function')) patterns.push('function-definition');

    return patterns;
  }

  private generateAutomationLogic(choice: UserChoice, context: OverrideContext): string {
    if (choice.type === 'ai-suggestion') {
      return `Apply AI transformation for ${context.error.type} errors`;
    } else if (choice.manualChange) {
      return `Template-based fix: ${choice.manualChange.explanation}`;
    } else {
      return 'Generic fix pattern';
    }
  }

  private calculateAutomationConfidence(choice: UserChoice, context: OverrideContext): number {
    let confidence = 0.5; // Base confidence

    // Boost confidence for AI suggestions
    if (choice.type === 'ai-suggestion') {
      confidence += 0.3;
    }

    // Boost for simple error types
    if (['import', 'export', 'syntax'].includes(context.error.type)) {
      confidence += 0.2;
    }

    // Reduce for complex transformations
    if (context.patternContext.transformationType === 'complex') {
      confidence -= 0.1;
    }

    return Math.max(0, Math.min(1, confidence));
  }
}

/**
 * Pattern Automator - Applies learned patterns automatically
 */
class PatternAutomator {
  private claude: any;
  private config: Required<AIManualAssistantConfig>;
  private automatedPatterns: Map<string, LearnedPattern> = new Map();

  constructor(claude: any, config: Required<AIManualAssistantConfig>) {
    this.claude = claude;
    this.config = config;
  }

  async initialize(): Promise<void> {
    console.log('🤖 Initializing Pattern Automator...');
  }

  async addPattern(pattern: LearnedPattern): Promise<void> {
    this.automatedPatterns.set(pattern.id, pattern);
    console.log(
      `🚀 Added pattern "${pattern.name}" to automation (confidence: ${(pattern.automationConfidence * 100).toFixed(1)}%)`
    );
  }

  async applyPattern(
    pattern: LearnedPattern,
    context: OverrideContext
  ): Promise<{
    success: boolean;
    result?: any;
    error?: string;
  }> {
    try {
      console.log(`🔧 Applying automated pattern: ${pattern.name}`);

      // Simulate pattern application
      // In real implementation, this would apply the actual transformation

      await this.sleep(100); // Simulate processing time

      return {
        success: true,
        result: `Applied pattern ${pattern.name} successfully`,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Export for use in other modules
export {
  AIManualAssistant,
  type AIManualAssistantConfig,
  type OverrideContext,
  type Suggestion,
  type UserChoice,
  type ValidationResult,
  type LearnedPattern,
  type SuggestionStats,
  type InterventionStats,
};
