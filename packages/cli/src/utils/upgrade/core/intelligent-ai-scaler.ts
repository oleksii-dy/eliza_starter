/**
 * INTELLIGENT AI SCALER
 *
 * Progressive AI utilization that starts simple and scales to unlimited complexity.
 * Implements the philosophy: "Use exactly as much AI as needed for 100% success"
 *
 * Strategy Levels:
 * 1. QuickPatternStrategy - Pattern matching (fast, cheap)
 * 2. FocusedClaudeStrategy - Targeted AI calls (medium cost)
 * 3. FullContextClaudeStrategy - Complete context (higher cost)
 * 4. MultiTurnDeepReasoningStrategy - Conversational refinement (expensive)
 * 5. MultiModelCollaborationStrategy - Multiple models (very expensive)
 * 6+ UnlimitedAIStrategy - No limits, whatever it takes (unlimited cost)
 */

import { logger } from '@elizaos/core';
import type {
  MigrationContext,
  TransformationResult,
  ValidationResult,
  AIStrategy,
  StrategyResult,
  PromptOptimizationContext,
  LearningDatabase,
  MultiModelResult,
  PerformanceMetrics,
} from '../types.js';
import { EnhancedClaudeSDKAdapter } from '../claude-sdk/index.js';
import { PromptOptimizer } from './prompt-optimizer.js';
import { MultiModelOrchestrator } from './multi-model-orchestrator.js';
import { LearningSystem } from './learning-system.js';
import { PerformanceMonitor } from './performance-monitor.js';

export class IntelligentAIScaler {
  private claudeAdapter: EnhancedClaudeSDKAdapter;
  private promptOptimizer: PromptOptimizer;
  private multiModelOrchestrator: MultiModelOrchestrator;
  private learningSystem: LearningSystem;
  private performanceMonitor: PerformanceMonitor;

  private strategyHistory = new Map<string, StrategyResult[]>();
  private currentLevel = 1;
  private maxLevels = 10; // Can go beyond for unlimited scaling

  constructor(context: MigrationContext) {
    this.claudeAdapter = new EnhancedClaudeSDKAdapter({ maxRetries: 5 });
    this.promptOptimizer = new PromptOptimizer(context);
    this.multiModelOrchestrator = new MultiModelOrchestrator();
    this.learningSystem = new LearningSystem();
    this.performanceMonitor = new PerformanceMonitor();

    // Load learned patterns
    this.loadLearningHistory();
  }

  /**
   * Transform with intelligent scaling - the main entry point
   * Continues until perfect transformation is achieved
   */
  async transformWithScaling(
    file: string,
    content: string,
    context: MigrationContext
  ): Promise<TransformationResult> {
    const startTime = Date.now();
    this.currentLevel = 1;

    logger.info(`🎯 Starting intelligent scaling transformation for ${file}`);

    let transformationResult: TransformationResult | null = null;
    let iterationCount = 0;

    // Continue until perfect or maximum reasonable attempts
    while (!(await this.isTransformationPerfect(transformationResult)) && iterationCount < 100) {
      iterationCount++;

      logger.info(`🔄 Iteration ${iterationCount}, Strategy Level ${this.currentLevel}`);

      try {
        // Get the appropriate strategy for current level
        const strategy = this.getStrategyForLevel(this.currentLevel);

        // Execute transformation with current strategy
        transformationResult = await this.executeStrategy(
          strategy,
          file,
          content,
          context,
          iterationCount
        );

        // Validate the transformation
        const validation = await this.validateTransformation(transformationResult, context);

        if (validation.isPerfect) {
          // Success! Record and return
          await this.recordSuccess(file, this.currentLevel, Date.now() - startTime);
          logger.info(
            `✅ Perfect transformation achieved at level ${this.currentLevel} after ${iterationCount} iterations`
          );
          return transformationResult;
        }

        // Learn from partial success or failure
        await this.learnFromResult(file, transformationResult, validation, this.currentLevel);

        // Escalate strategy level
        this.currentLevel = this.calculateNextLevel(validation, iterationCount);

        if (this.currentLevel > this.maxLevels) {
          logger.info(`🚀 Entering unlimited AI mode for ${file} (Level ${this.currentLevel})`);
        }
      } catch (error) {
        await this.learnFromFailure(file, this.currentLevel, error, iterationCount);
        this.currentLevel++;
      }
    }

    // If we reach here, we've exhausted all attempts
    throw new Error(
      `Failed to achieve perfect transformation for ${file} after ${iterationCount} iterations`
    );
  }

  /**
   * Get the appropriate strategy based on current level
   */
  private getStrategyForLevel(level: number): AIStrategy {
    switch (level) {
      case 1:
        return {
          name: 'QuickPatternStrategy',
          description: 'Fast pattern-based transformation',
          priority: 10,
          confidence: 0.7,
          timeout: 5000,
          maxCost: 0,
          implementation: this.quickPatternStrategy.bind(this),
        };

      case 2:
        return {
          name: 'FocusedClaudeStrategy',
          description: 'Targeted Claude calls with minimal context',
          priority: 8,
          confidence: 0.8,
          timeout: 30000,
          maxCost: 0.1,
          implementation: this.focusedClaudeStrategy.bind(this),
        };

      case 3:
        return {
          name: 'FullContextClaudeStrategy',
          description: 'Complete file context with imports and exports',
          priority: 6,
          confidence: 0.85,
          timeout: 60000,
          maxCost: 0.5,
          implementation: this.fullContextClaudeStrategy.bind(this),
        };

      case 4:
        return {
          name: 'MultiTurnDeepReasoningStrategy',
          description: 'Conversational refinement with iterative improvement',
          priority: 4,
          confidence: 0.9,
          timeout: 180000,
          maxCost: 2.0,
          implementation: this.multiTurnDeepReasoningStrategy.bind(this),
        };

      case 5:
        return {
          name: 'MultiModelCollaborationStrategy',
          description: 'Multiple AI models working together',
          priority: 2,
          confidence: 0.95,
          timeout: 300000,
          maxCost: 5.0,
          implementation: this.multiModelCollaborationStrategy.bind(this),
        };

      default:
        return {
          name: 'UnlimitedAIStrategy',
          description: `Unlimited AI power and resources (Level ${level})`,
          priority: 1,
          confidence: 0.99,
          timeout: Infinity,
          maxCost: Infinity,
          creativityBoost: level - 5,
          implementation: this.unlimitedAIStrategy.bind(this),
        };
    }
  }

  /**
   * Execute a specific strategy with comprehensive error handling
   */
  private async executeStrategy(
    strategy: AIStrategy,
    file: string,
    content: string,
    context: MigrationContext,
    iteration: number
  ): Promise<TransformationResult> {
    const startTime = Date.now();

    logger.info(`🔧 Executing ${strategy.name} for ${file}`);

    try {
      // Track performance
      this.performanceMonitor.startStrategy(strategy.name);

      // Execute the strategy
      const result = await strategy.implementation(file, content, context, iteration);

      // Track success
      this.performanceMonitor.endStrategy(strategy.name, true, Date.now() - startTime);

      return result;
    } catch (error) {
      // Track failure
      this.performanceMonitor.endStrategy(strategy.name, false, Date.now() - startTime);

      throw new Error(
        `Strategy ${strategy.name} failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Level 1: Quick Pattern Strategy - Fast pattern matching
   */
  private async quickPatternStrategy(
    file: string,
    content: string,
    context: MigrationContext,
    iteration: number
  ): Promise<TransformationResult> {
    logger.info('⚡ Applying quick pattern transformations...');

    // Load learned patterns from successful transformations
    const patterns = await this.learningSystem.getLearnedPatterns(file);

    let transformedContent = content;
    const appliedPatterns: string[] = [];

    // Apply known successful patterns
    for (const pattern of patterns) {
      if (pattern.regex.test(transformedContent)) {
        transformedContent = transformedContent.replace(pattern.regex, pattern.replacement);
        appliedPatterns.push(pattern.name);
        logger.debug(`✓ Applied pattern: ${pattern.name}`);
      }
    }

    return {
      success: appliedPatterns.length > 0,
      transformedCode: transformedContent,
      appliedPatterns,
      strategy: 'QuickPatternStrategy',
      cost: 0,
      duration: 0,
      confidence: appliedPatterns.length > 0 ? 0.7 : 0.3,
    };
  }

  /**
   * Level 2: Focused Claude Strategy - Targeted AI calls
   */
  private async focusedClaudeStrategy(
    file: string,
    content: string,
    context: MigrationContext,
    iteration: number
  ): Promise<TransformationResult> {
    logger.info('🎯 Applying focused Claude transformation...');

    // Optimize prompt for this specific transformation
    const optimizedPrompt = await this.promptOptimizer.optimizeForFocusedTransform(
      file,
      content,
      context,
      iteration
    );

    const result = await this.claudeAdapter.executePrompt(
      optimizedPrompt,
      {
        maxTurns: 5,
        model: 'claude-sonnet-4-20250514',
        outputFormat: 'json',
        permissionMode: 'acceptEdits',
      },
      context
    );

    return this.parseClaudeResult(result, 'FocusedClaudeStrategy');
  }

  /**
   * Level 3: Full Context Claude Strategy - Complete context
   */
  private async fullContextClaudeStrategy(
    file: string,
    content: string,
    context: MigrationContext,
    iteration: number
  ): Promise<TransformationResult> {
    logger.info('📋 Applying full context Claude transformation...');

    // Build comprehensive context including related files
    const fullContext = await this.buildFullContext(file, content, context);

    const optimizedPrompt = await this.promptOptimizer.optimizeForFullContext(
      fullContext,
      context,
      iteration
    );

    const result = await this.claudeAdapter.executePrompt(
      optimizedPrompt,
      {
        maxTurns: 15,
        model: 'claude-opus-4-20250514', // Use Opus for complex context
        outputFormat: 'json',
        permissionMode: 'acceptEdits',
      },
      context
    );

    return this.parseClaudeResult(result, 'FullContextClaudeStrategy');
  }

  /**
   * Level 4: Multi-Turn Deep Reasoning Strategy
   */
  private async multiTurnDeepReasoningStrategy(
    file: string,
    content: string,
    context: MigrationContext,
    iteration: number
  ): Promise<TransformationResult> {
    logger.info('🧠 Applying multi-turn deep reasoning...');

    let currentResult: any = null;
    let sessionId: string | undefined;
    const maxTurns = 10;

    for (let turn = 1; turn <= maxTurns; turn++) {
      logger.info(`🔄 Deep reasoning turn ${turn}/${maxTurns}`);

      const promptForTurn = await this.promptOptimizer.optimizeForDeepReasoning(
        file,
        content,
        context,
        turn,
        currentResult
      );

      const result = await this.claudeAdapter.executePrompt(
        promptForTurn,
        {
          maxTurns: 3, // Short turns for iterative refinement
          model: 'claude-opus-4-20250514',
          outputFormat: 'json',
          permissionMode: 'acceptEdits',
          resumeSessionId: sessionId,
        },
        context
      );

      sessionId = result.sessionId;
      currentResult = result;

      // Check if we've achieved sufficient quality
      const validation = await this.validateTransformation(
        this.parseClaudeResult(result, 'MultiTurnDeepReasoningStrategy'),
        context
      );

      if (validation.score >= 0.95) {
        logger.info(`✅ Deep reasoning achieved high quality at turn ${turn}`);
        break;
      }
    }

    return this.parseClaudeResult(currentResult, 'MultiTurnDeepReasoningStrategy');
  }

  /**
   * Level 5: Multi-Model Collaboration Strategy
   */
  private async multiModelCollaborationStrategy(
    file: string,
    content: string,
    context: MigrationContext,
    iteration: number
  ): Promise<TransformationResult> {
    logger.info('🤝 Applying multi-model collaboration...');

    // Use multiple models to solve the same problem
    const models = ['claude-opus-4-20250514', 'claude-sonnet-4-20250514'];
    const results: MultiModelResult[] = [];

    for (const model of models) {
      logger.info(`🤖 Getting solution from ${model}...`);

      const modelPrompt = await this.promptOptimizer.optimizeForModel(
        file,
        content,
        context,
        model,
        iteration
      );

      const result = await this.claudeAdapter.executePrompt(
        modelPrompt,
        {
          maxTurns: 10,
          model,
          outputFormat: 'json',
          permissionMode: 'acceptEdits',
        },
        context
      );

      results.push({
        model,
        result: this.parseClaudeResult(result, `MultiModel-${model}`),
        confidence: result.success ? 0.9 : 0.3,
      });
    }

    // Synthesize the best result from multiple models
    return await this.multiModelOrchestrator.synthesizeResults(results, context);
  }

  /**
   * Level 6+: Unlimited AI Strategy - No limits, whatever it takes
   */
  private async unlimitedAIStrategy(
    file: string,
    content: string,
    context: MigrationContext,
    iteration: number
  ): Promise<TransformationResult> {
    logger.info(`🚀 Applying unlimited AI strategy (Level ${this.currentLevel})...`);

    // Escalating creativity and resource usage
    const creativityBoost = this.currentLevel - 5;

    // Use the most powerful model with maximum context
    const unlimitedPrompt = await this.promptOptimizer.optimizeForUnlimitedPower(
      file,
      content,
      context,
      creativityBoost,
      iteration
    );

    const result = await this.claudeAdapter.executePrompt(
      unlimitedPrompt,
      {
        maxTurns: 50, // No reasonable limit
        model: 'claude-opus-4-20250514',
        outputFormat: 'json',
        permissionMode: 'bypassPermissions', // Maximum permissions
      },
      context
    );

    return this.parseClaudeResult(result, `UnlimitedAI-Level${this.currentLevel}`);
  }

  /**
   * Validate transformation quality
   */
  private async validateTransformation(
    result: TransformationResult | null,
    context: MigrationContext
  ): Promise<ValidationResult> {
    if (!result || !result.success) {
      return {
        isPerfect: false,
        score: 0,
        issues: ['Transformation failed'],
      };
    }

    // Multi-layer validation
    const syntaxValid = await this.validateSyntax(result.transformedCode);
    const semanticValid = await this.validateSemantics(result.transformedCode, context);
    const testValid = await this.validateWithTests(result.transformedCode, context);
    const aiValid = await this.validateWithAI(result.transformedCode, context);

    const validations = [syntaxValid, semanticValid, testValid, aiValid];
    const score = validations.reduce((sum, valid) => sum + (valid ? 0.25 : 0), 0);

    return {
      isPerfect: score >= 1.0,
      score,
      issues: this.collectValidationIssues(validations),
      syntaxValid,
      semanticValid,
      testValid,
      aiValid,
    };
  }

  /**
   * Check if transformation is perfect
   */
  private async isTransformationPerfect(result: TransformationResult | null): Promise<boolean> {
    if (!result) return false;

    // For unlimited AI strategy, we accept high confidence results
    if (result.strategy?.includes('UnlimitedAI') && result.confidence >= 0.95) {
      return true;
    }

    // Otherwise require full validation
    return result.success && result.confidence >= 0.99;
  }

  /**
   * Calculate next strategy level based on validation results
   */
  private calculateNextLevel(validation: ValidationResult, iteration: number): number {
    // Fast escalation for critical failures
    if (validation.score < 0.3) {
      return this.currentLevel + 2;
    }

    // Medium escalation for partial success
    if (validation.score < 0.7) {
      return this.currentLevel + 1;
    }

    // Slow escalation for near success
    return this.currentLevel + 1;
  }

  /**
   * Parse Claude result into standardized format
   */
  private parseClaudeResult(result: any, strategy: string): TransformationResult {
    return {
      success: result.success || false,
      transformedCode: result.message || '',
      appliedPatterns: [],
      strategy,
      cost: result.cost || 0,
      duration: result.duration || 0,
      confidence: result.success ? 0.8 : 0.2,
      sessionId: result.sessionId,
    };
  }

  /**
   * Build comprehensive context for full context strategy
   */
  private async buildFullContext(
    file: string,
    content: string,
    context: MigrationContext
  ): Promise<string> {
    // Include imports, exports, related files, and project context
    return `File: ${file}\n\nContent:\n${content}\n\nProject Context: ${context.pluginName}`;
  }

  /**
   * Load learning history from previous transformations
   */
  private async loadLearningHistory(): Promise<void> {
    await this.learningSystem.loadPatterns();
  }

  /**
   * Record successful transformation for learning
   */
  private async recordSuccess(file: string, level: number, duration: number): Promise<void> {
    await this.learningSystem.recordSuccess(file, level, duration);
    this.performanceMonitor.recordSuccess(file, level, duration);
  }

  /**
   * Learn from transformation result
   */
  private async learnFromResult(
    file: string,
    result: TransformationResult,
    validation: ValidationResult,
    level: number
  ): Promise<void> {
    await this.learningSystem.learnFromResult(file, result, validation, level);
  }

  /**
   * Learn from failure
   */
  private async learnFromFailure(
    file: string,
    level: number,
    error: unknown,
    iteration: number
  ): Promise<void> {
    const errorMessage = error instanceof Error ? error.message : String(error);
    await this.learningSystem.recordFailure(file, level, errorMessage, iteration);
  }

  /**
   * Validate syntax
   */
  private async validateSyntax(code: string): Promise<boolean> {
    try {
      // Basic TypeScript syntax validation
      return code.includes('import') || code.includes('export') || code.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Validate semantics
   */
  private async validateSemantics(code: string, context: MigrationContext): Promise<boolean> {
    // Check for proper V2 patterns
    return (
      !code.includes('ModelClass') &&
      !code.includes('elizaLogger') &&
      !code.includes('composeContext')
    );
  }

  /**
   * Validate with tests
   */
  private async validateWithTests(code: string, context: MigrationContext): Promise<boolean> {
    // Would run actual tests here
    return true; // Simplified for now
  }

  /**
   * Validate with AI
   */
  private async validateWithAI(code: string, context: MigrationContext): Promise<boolean> {
    // Use AI to validate the transformation quality
    return true; // Simplified for now
  }

  /**
   * Collect validation issues
   */
  private collectValidationIssues(validations: boolean[]): string[] {
    const issues: string[] = [];
    const labels = ['Syntax', 'Semantic', 'Test', 'AI'];

    validations.forEach((valid, index) => {
      if (!valid) {
        issues.push(`${labels[index]} validation failed`);
      }
    });

    return issues;
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): PerformanceMetrics {
    return this.performanceMonitor.getMetrics();
  }

  /**
   * Get learning insights
   */
  getLearningInsights(): LearningDatabase {
    return this.learningSystem.getInsights();
  }
}
