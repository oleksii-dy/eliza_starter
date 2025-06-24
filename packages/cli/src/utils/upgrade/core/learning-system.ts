/**
 * LEARNING SYSTEM
 *
 * Pattern recognition and continuous improvement for AI transformations.
 * Learns from successful and failed transformations to optimize future attempts.
 */

import { logger } from '@elizaos/core';
import type { TransformationResult, ValidationResult } from '../types.js';

export interface LearnedPattern {
  name: string;
  regex: RegExp;
  replacement: string;
  successRate: number;
  contexts: string[];
  createdAt: number;
}

export interface LearningDatabase {
  patterns: LearnedPattern[];
  failures: Map<string, string[]>;
  successes: Map<string, number>;
  insights: string[];
}

export class LearningSystem {
  private patterns = new Map<string, LearnedPattern>();
  private failures = new Map<string, string[]>();
  private successes = new Map<string, number>();
  private insights: string[] = [];

  constructor() {
    this.initializeBasePatterns();
  }

  /**
   * Get learned patterns for a specific file type
   */
  async getLearnedPatterns(file: string): Promise<LearnedPattern[]> {
    const fileType = this.getFileType(file);
    const relevantPatterns: LearnedPattern[] = [];

    for (const pattern of this.patterns.values()) {
      if (pattern.contexts.includes(fileType) || pattern.contexts.includes('all')) {
        relevantPatterns.push(pattern);
      }
    }

    // Sort by success rate
    return relevantPatterns.sort((a, b) => b.successRate - a.successRate);
  }

  /**
   * Learn from transformation result
   */
  async learnFromResult(
    file: string,
    result: TransformationResult,
    validation: ValidationResult,
    level: number
  ): Promise<void> {
    if (validation.isPerfect) {
      await this.learnFromSuccess(file, result, level);
    } else {
      await this.learnFromPartialSuccess(file, result, validation, level);
    }
  }

  /**
   * Record successful transformation
   */
  async recordSuccess(file: string, level: number, duration: number): Promise<void> {
    const key = `${this.getFileType(file)}-level-${level}`;
    const currentCount = this.successes.get(key) || 0;
    this.successes.set(key, currentCount + 1);

    logger.info(`✅ Recorded success for ${key} (total: ${currentCount + 1})`);

    // Generate insights based on success patterns
    if (currentCount + 1 >= 3) {
      this.insights.push(
        `Level ${level} is consistently successful for ${this.getFileType(file)} files`
      );
    }
  }

  /**
   * Record failure for learning
   */
  async recordFailure(
    file: string,
    level: number,
    error: string,
    iteration: number
  ): Promise<void> {
    const key = `${this.getFileType(file)}-level-${level}`;
    const failures = this.failures.get(key) || [];
    failures.push(`Iteration ${iteration}: ${error}`);
    this.failures.set(key, failures);

    logger.warn(`⚠️ Recorded failure for ${key}: ${error}`);

    // Learn from failure patterns
    await this.analyzeFailurePattern(file, level, error);
  }

  /**
   * Load patterns from storage
   */
  async loadPatterns(): Promise<void> {
    // In a real implementation, this would load from persistent storage
    logger.info('📚 Loading learned patterns...');

    // For now, we start with base patterns
    this.initializeBasePatterns();
  }

  /**
   * Get insights from learning database
   */
  getInsights(): LearningDatabase {
    return {
      patterns: Array.from(this.patterns.values()),
      failures: this.failures,
      successes: this.successes,
      insights: this.insights,
    };
  }

  /**
   * Initialize base transformation patterns
   */
  private initializeBasePatterns(): void {
    const basePatterns = [
      {
        name: 'ModelClass-to-ModelType',
        regex: /ModelClass/g,
        replacement: 'ModelType',
        successRate: 0.95,
        contexts: ['all'],
        createdAt: Date.now(),
      },
      {
        name: 'elizaLogger-to-logger',
        regex: /elizaLogger/g,
        replacement: 'logger',
        successRate: 0.98,
        contexts: ['all'],
        createdAt: Date.now(),
      },
      {
        name: 'composeContext-to-composePromptFromState',
        regex: /composeContext/g,
        replacement: 'composePromptFromState',
        successRate: 0.9,
        contexts: ['action', 'provider'],
        createdAt: Date.now(),
      },
      {
        name: 'generateObject-removal',
        regex: /generateObject(Deprecated)?/g,
        replacement: 'runtime.useModel',
        successRate: 0.85,
        contexts: ['action'],
        createdAt: Date.now(),
      },
    ];

    for (const pattern of basePatterns) {
      this.patterns.set(pattern.name, pattern);
    }

    logger.info(`📋 Initialized ${basePatterns.length} base patterns`);
  }

  /**
   * Learn from successful transformation
   */
  private async learnFromSuccess(
    file: string,
    result: TransformationResult,
    level: number
  ): Promise<void> {
    // Extract successful patterns from the transformation
    if (result.appliedPatterns) {
      for (const patternName of result.appliedPatterns) {
        const pattern = this.patterns.get(patternName);
        if (pattern) {
          // Increase success rate
          pattern.successRate = Math.min(pattern.successRate + 0.01, 1.0);
          this.patterns.set(patternName, pattern);
        }
      }
    }

    // Generate new patterns from successful transformations
    await this.extractNewPatterns(file, result);
  }

  /**
   * Learn from partial success
   */
  private async learnFromPartialSuccess(
    file: string,
    result: TransformationResult,
    validation: ValidationResult,
    level: number
  ): Promise<void> {
    // Analyze what worked and what didn't
    if (validation.syntaxValid && result.appliedPatterns) {
      // Syntax patterns worked, reinforce them
      for (const patternName of result.appliedPatterns) {
        const pattern = this.patterns.get(patternName);
        if (pattern) {
          pattern.successRate = Math.min(pattern.successRate + 0.005, 1.0);
        }
      }
    }

    // Learn from validation issues
    for (const issue of validation.issues) {
      await this.learnFromValidationIssue(file, issue, level);
    }
  }

  /**
   * Extract new patterns from successful transformations
   */
  private async extractNewPatterns(file: string, result: TransformationResult): Promise<void> {
    // Analyze the transformation to identify new patterns
    // This is simplified - in reality, would use AST analysis

    const fileType = this.getFileType(file);
    const transformedCode = result.transformedCode;

    // Look for repeated transformation patterns
    const patterns = this.identifyTransformationPatterns(transformedCode);

    for (const pattern of patterns) {
      if (!this.patterns.has(pattern.name)) {
        this.patterns.set(pattern.name, {
          ...pattern,
          successRate: 0.7, // Start with moderate confidence
          contexts: [fileType],
          createdAt: Date.now(),
        });

        logger.info(`🧠 Learned new pattern: ${pattern.name}`);
      }
    }
  }

  /**
   * Analyze failure patterns
   */
  private async analyzeFailurePattern(file: string, level: number, error: string): Promise<void> {
    // Categorize the failure
    const category = this.categorizeError(error);

    // Update pattern success rates based on failures
    if (category === 'import-error') {
      // Reduce confidence in import-related patterns
      for (const pattern of this.patterns.values()) {
        if (pattern.name.includes('import') || pattern.name.includes('from')) {
          pattern.successRate = Math.max(pattern.successRate - 0.02, 0.1);
        }
      }
    }

    // Generate insights from failure patterns
    const fileType = this.getFileType(file);
    const failureKey = `${fileType}-${category}`;
    const failures = this.failures.get(failureKey) || [];

    if (failures.length >= 3) {
      this.insights.push(
        `Repeated ${category} failures in ${fileType} files - pattern needs refinement`
      );
    }
  }

  /**
   * Learn from validation issues
   */
  private async learnFromValidationIssue(
    file: string,
    issue: string,
    level: number
  ): Promise<void> {
    const fileType = this.getFileType(file);

    // Map validation issues to pattern adjustments
    if (issue.includes('Syntax validation failed')) {
      // Reduce confidence in syntax-related patterns
      for (const pattern of this.patterns.values()) {
        if (pattern.contexts.includes(fileType)) {
          pattern.successRate = Math.max(pattern.successRate - 0.01, 0.1);
        }
      }
    }

    if (issue.includes('Semantic validation failed')) {
      // Focus on semantic correctness patterns
      this.insights.push(
        `Semantic validation issues common in ${fileType} files at level ${level}`
      );
    }
  }

  /**
   * Identify transformation patterns in code
   */
  private identifyTransformationPatterns(code: string): LearnedPattern[] {
    const patterns: LearnedPattern[] = [];

    // Look for common transformation patterns
    // This is a simplified implementation

    // Pattern: Import statement transformations
    const importMatches = code.match(/import.*from ['"]@elizaos\/core['"];/g);
    if (importMatches) {
      patterns.push({
        name: 'v2-import-pattern',
        regex: /import.*from ['"]@elizaos\/core['"];/g,
        replacement: 'import { ... } from "@elizaos/core";',
        successRate: 0.8,
        contexts: ['all'],
        createdAt: Date.now(),
      });
    }

    return patterns;
  }

  /**
   * Categorize error for learning
   */
  private categorizeError(error: string): string {
    if (error.includes('import') || error.includes('module')) {
      return 'import-error';
    }
    if (error.includes('syntax') || error.includes('parse')) {
      return 'syntax-error';
    }
    if (error.includes('type') || error.includes('TypeError')) {
      return 'type-error';
    }
    if (error.includes('build') || error.includes('compile')) {
      return 'build-error';
    }
    return 'general-error';
  }

  /**
   * Get file type for context
   */
  private getFileType(file: string): string {
    if (file.includes('action')) return 'action';
    if (file.includes('provider')) return 'provider';
    if (file.includes('service')) return 'service';
    if (file.includes('test')) return 'test';
    if (file.includes('index')) return 'index';
    return 'general';
  }

  /**
   * Get pattern statistics
   */
  getPatternStats(): {
    totalPatterns: number;
    avgSuccessRate: number;
    mostSuccessfulPattern: string;
    leastSuccessfulPattern: string;
  } {
    const patterns = Array.from(this.patterns.values());

    if (patterns.length === 0) {
      return {
        totalPatterns: 0,
        avgSuccessRate: 0,
        mostSuccessfulPattern: 'none',
        leastSuccessfulPattern: 'none',
      };
    }

    const avgSuccessRate = patterns.reduce((sum, p) => sum + p.successRate, 0) / patterns.length;
    const mostSuccessful = patterns.reduce((best, current) =>
      current.successRate > best.successRate ? current : best
    );
    const leastSuccessful = patterns.reduce((worst, current) =>
      current.successRate < worst.successRate ? current : worst
    );

    return {
      totalPatterns: patterns.length,
      avgSuccessRate,
      mostSuccessfulPattern: mostSuccessful.name,
      leastSuccessfulPattern: leastSuccessful.name,
    };
  }

  /**
   * Export learning database for persistence
   */
  exportDatabase(): string {
    return JSON.stringify(
      {
        patterns: Array.from(this.patterns.entries()),
        failures: Array.from(this.failures.entries()),
        successes: Array.from(this.successes.entries()),
        insights: this.insights,
        timestamp: Date.now(),
      },
      null,
      2
    );
  }

  /**
   * Import learning database from persistence
   */
  importDatabase(data: string): void {
    try {
      const parsed = JSON.parse(data);

      // Restore patterns
      this.patterns.clear();
      for (const [key, value] of parsed.patterns) {
        this.patterns.set(key, value as LearnedPattern);
      }

      // Restore failures and successes
      this.failures = new Map(parsed.failures);
      this.successes = new Map(parsed.successes);
      this.insights = parsed.insights || [];

      logger.info(`📥 Imported learning database with ${this.patterns.size} patterns`);
    } catch (error) {
      logger.error('❌ Failed to import learning database:', error);
    }
  }
}
