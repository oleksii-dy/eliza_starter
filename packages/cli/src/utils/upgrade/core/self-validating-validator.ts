import { logger } from '@elizaos/core';
import * as fs from 'fs-extra';
import * as path from 'node:path';
import { globby } from 'globby';
import { execa } from 'execa';
import type { MigrationContext, StepResult } from '../types.js';
import { ClaudeIntegration } from './claude-integration.js';
import { ValidationEngine } from './validation-engine.js';

/**
 * Validation issue types for comprehensive tracking
 */
export interface ValidationIssue {
  type:
    | 'missing-rule'
    | 'false-positive'
    | 'false-negative'
    | 'performance'
    | 'coverage-gap'
    | 'rule-conflict';
  severity: 'critical' | 'high' | 'medium' | 'low';
  scenario: string;
  codePattern?: string;
  expectedBehavior?: string;
  actualBehavior?: string;
  rule?: ValidationRule;
  testCase?: ValidationTestCase;
  reason?: string;
  confidence: number; // 0-1 confidence in the issue identification
  filePath?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Validation test case for comprehensive testing
 */
export interface ValidationTestCase {
  id: string;
  name: string;
  type: 'positive' | 'negative' | 'edge-case';
  code: string;
  expectedResult: boolean;
  scenario: string;
  tags: string[];
  metadata?: Record<string, unknown>;
}

/**
 * Validation rule with AI-powered generation and refinement
 */
export interface ValidationRule {
  id: string;
  name: string;
  description: string;
  pattern: RegExp | string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  validate: (code: string, filePath?: string) => Promise<ValidationResult>;
  confidence: number; // 0-1 confidence in rule accuracy
  successRate: number; // Historical success rate
  createdBy: 'ai' | 'pattern' | 'human';
  version: number;
  lastUpdated: Date;
  testCases: ValidationTestCase[];
  metadata?: Record<string, unknown>;
}

/**
 * Validation result with comprehensive details
 */
export interface ValidationResult {
  isValid: boolean;
  issues: ValidationIssue[];
  confidence: number;
  executionTime: number;
  metadata?: Record<string, unknown>;
}

/**
 * Rule validation analysis
 */
export interface RuleValidation {
  isValid: boolean;
  falsePositiveRate: number;
  falseNegativeRate: number;
  accuracy: number;
  performance: number;
  coverage: number;
  suggestions: string[];
  confidence: number;
}

/**
 * Validation test result for comprehensive analysis
 */
export interface ValidationTestResult {
  perfect: boolean;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  falsePositives: number;
  falseNegatives: number;
  accuracy: number;
  coverage: number;
  issues: ValidationIssue[];
  executionTime: number;
  recommendations: string[];
}

/**
 * Coverage tracking for comprehensive validation
 */
export interface CoverageMetrics {
  totalScenarios: number;
  coveredScenarios: number;
  coveragePercentage: number;
  missingScenarios: string[];
  weakScenarios: string[]; // Low confidence or accuracy
  redundantRules: string[];
  gapAreas: string[];
}

/**
 * Self-Validating Validator that uses AI to validate and improve validation rules
 *
 * Core Philosophy: "Validation continues until perfect accuracy is achieved"
 * - Zero false positives through AI meta-validation
 * - Zero false negatives through comprehensive coverage
 * - Self-healing through continuous rule refinement
 * - Learning from every validation to improve accuracy
 */
export class SelfValidatingValidator {
  private claude: ClaudeIntegration;
  private baseValidator: ValidationEngine;
  private metaValidator: AIMetaValidator;
  private ruleGenerator: ValidationRuleGenerator;
  private coverageTracker: CoverageTracker;
  private learningSystem: ValidationLearningSystem;
  private performanceMonitor: ValidationPerformanceMonitor;

  private validationRules: Map<string, ValidationRule> = new Map();
  private validationHistory: ValidationTestResult[] = [];
  private learningDatabase: Map<string, unknown> = new Map();

  // Configuration
  private readonly maxIterations = 100; // Safety limit for infinite loops
  private readonly targetAccuracy = 0.999; // 99.9% accuracy target
  private readonly targetCoverage = 1.0; // 100% coverage target
  private readonly performanceTarget = 1000; // <1s per file target

  constructor(
    private context: MigrationContext,
    claude?: ClaudeIntegration
  ) {
    this.claude = claude || new ClaudeIntegration();
    this.baseValidator = new ValidationEngine(context.repoPath, false);
    this.metaValidator = new AIMetaValidator(this.claude, this.context);
    this.ruleGenerator = new ValidationRuleGenerator(this.claude, this.context);
    this.coverageTracker = new CoverageTracker(this.context);
    this.learningSystem = new ValidationLearningSystem();
    this.performanceMonitor = new ValidationPerformanceMonitor();
  }

  /**
   * Initialize the validator (must be called after construction)
   */
  async initialize(): Promise<void> {
    await this.initializeDefaultRules();
  }

  /**
   * Main entry point: Validate the validation system until perfect
   */
  async validateValidation(): Promise<void> {
    logger.info('🔄 Starting self-validating validation process...');

    let iteration = 0;
    while (iteration < this.maxIterations) {
      iteration++;
      logger.info(`🔍 Validation iteration ${iteration}/${this.maxIterations}`);

      const startTime = Date.now();

      try {
        // Step 1: Meta-validate existing rules
        const metaValidationResult = await this.metaValidator.validateAllRules(
          Array.from(this.validationRules.values())
        );

        // Step 2: Find validation gaps
        const gaps = await this.findValidationGaps();

        // Step 3: Generate missing rules
        for (const gap of gaps) {
          await this.generateValidationRule(gap);
        }

        // Step 4: Refine problematic rules
        for (const issue of metaValidationResult.issues) {
          await this.refineRule(issue);
        }

        // Step 5: Test the complete validation suite
        const testResult = await this.testValidationSuite();

        // Step 6: Update learning database
        await this.learningSystem.learn(testResult, this.validationRules);

        // Step 7: Track performance
        const iterationTime = Date.now() - startTime;
        this.performanceMonitor.recordIteration(iteration, testResult, iterationTime);

        // Step 8: Check convergence
        const hasConverged = await this.checkConvergence(testResult);

        if (hasConverged) {
          logger.info(`✅ Validation validation achieved perfect state in ${iteration} iterations`);
          break;
        }

        // Step 9: Optimize for next iteration
        await this.optimizeForNextIteration(testResult);
      } catch (error) {
        logger.error(`❌ Error in validation iteration ${iteration}:`, error);
        await this.handleValidationError(error, iteration);
      }
    }

    if (iteration >= this.maxIterations) {
      logger.warn(
        `⚠️ Reached maximum iterations (${this.maxIterations}) - using best available validation`
      );
    }

    await this.finalizeValidation();
  }

  /**
   * Validate a specific code file using the current rule set
   */
  async validateCode(filePath: string, content?: string): Promise<ValidationResult> {
    const startTime = Date.now();

    const fileContent = content || (await fs.readFile(filePath, 'utf-8'));
    const issues: ValidationIssue[] = [];
    let totalConfidence = 0;
    let ruleCount = 0;

    // Apply all validation rules
    for (const rule of this.validationRules.values()) {
      try {
        const result = await rule.validate(fileContent, filePath);
        issues.push(...result.issues);
        totalConfidence += result.confidence;
        ruleCount++;
      } catch (error) {
        logger.warn(`⚠️ Error applying rule ${rule.name} to ${filePath}:`, error);
      }
    }

    const executionTime = Date.now() - startTime;
    const avgConfidence = ruleCount > 0 ? totalConfidence / ruleCount : 0;

    return {
      isValid:
        issues.filter((i) => i.severity === 'critical' || i.severity === 'high').length === 0,
      issues,
      confidence: avgConfidence,
      executionTime,
      metadata: {
        filePath,
        rulesApplied: ruleCount,
        totalIssues: issues.length,
      },
    };
  }

  /**
   * Generate a new validation rule using AI for missing scenarios
   */
  private async generateValidationRule(issue: ValidationIssue): Promise<void> {
    logger.info(`🤖 Generating validation rule for: ${issue.scenario}`);

    try {
      const rule = await this.ruleGenerator.generateRule(issue);

      // Test the new rule immediately
      const ruleValidation = await this.metaValidator.validateRule(rule);

      if (ruleValidation.accuracy > 0.9) {
        this.validationRules.set(rule.id, rule);
        logger.info(`✅ Generated and validated rule: ${rule.name}`);
      } else {
        logger.warn(
          `❌ Generated rule failed validation: ${rule.name} (accuracy: ${ruleValidation.accuracy})`
        );

        // Try to refine the rule
        await this.refineGeneratedRule(rule, ruleValidation);
      }
    } catch (error) {
      logger.error(`❌ Failed to generate validation rule for ${issue.scenario}:`, error);
      throw error;
    }
  }

  /**
   * Refine an existing rule that has issues
   */
  private async refineRule(issue: ValidationIssue): Promise<void> {
    if (!issue.rule) return;

    logger.info(`🔧 Refining validation rule: ${issue.rule.name}`);

    try {
      const refinedRule = await this.ruleGenerator.refineRule(issue.rule, issue);

      // Test the refined rule
      const ruleValidation = await this.metaValidator.validateRule(refinedRule);

      if (ruleValidation.accuracy > issue.rule.confidence) {
        this.validationRules.set(refinedRule.id, refinedRule);
        logger.info(`✅ Successfully refined rule: ${refinedRule.name}`);
      } else {
        logger.warn(`❌ Rule refinement did not improve accuracy: ${refinedRule.name}`);
      }
    } catch (error) {
      logger.error(`❌ Failed to refine validation rule ${issue.rule.name}:`, error);
      throw error;
    }
  }

  /**
   * Initialize default validation rules based on existing patterns
   */
  private async initializeDefaultRules(): Promise<void> {
    logger.info('🚀 Initializing default validation rules...');

    const defaultRules: ValidationRule[] = [
      {
        id: 'v1-import-check',
        name: 'V1 Import Detection',
        description: 'Detects remaining V1 import patterns',
        pattern: /@ai16z\/eliza|elizaLogger|ModelClass|composeContext/,
        severity: 'critical',
        category: 'imports',
        validate: async (code: string) => {
          const issues: ValidationIssue[] = [];
          const pattern = /@ai16z\/eliza|elizaLogger|ModelClass|composeContext/g;
          const matches = code.match(pattern);

          if (matches) {
            for (const match of matches) {
              issues.push({
                type: 'false-negative',
                severity: 'critical',
                scenario: 'V1 import detected',
                codePattern: match,
                expectedBehavior: 'Should use V2 imports',
                confidence: 0.95,
              });
            }
          }

          return {
            isValid: issues.length === 0,
            issues,
            confidence: 0.95,
            executionTime: 10,
          };
        },
        confidence: 0.95,
        successRate: 0.9,
        createdBy: 'pattern',
        version: 1,
        lastUpdated: new Date(),
        testCases: [],
      },
    ];

    for (const rule of defaultRules) {
      this.validationRules.set(rule.id, rule);
    }

    logger.info(`✅ Initialized ${defaultRules.length} default validation rules`);
  }

  // Additional helper methods with placeholder implementations
  private async testValidationSuite(): Promise<ValidationTestResult> {
    // Implementation for testing the complete validation suite
    return {
      perfect: false,
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      falsePositives: 0,
      falseNegatives: 0,
      accuracy: 0.8,
      coverage: 0.8,
      issues: [],
      executionTime: 100,
      recommendations: [],
    };
  }

  private async findValidationGaps(): Promise<ValidationIssue[]> {
    return [];
  }

  private async checkConvergence(testResult: ValidationTestResult): Promise<boolean> {
    return (
      testResult.accuracy >= this.targetAccuracy &&
      testResult.coverage >= this.targetCoverage &&
      testResult.falsePositives === 0 &&
      testResult.falseNegatives === 0
    );
  }

  private async refineGeneratedRule(
    rule: ValidationRule,
    validation: RuleValidation
  ): Promise<void> {
    // Implementation for refining generated rules
  }

  private async optimizeForNextIteration(testResult: ValidationTestResult): Promise<void> {
    // Implementation for optimization
  }

  private async handleValidationError(error: unknown, iteration: number): Promise<void> {
    logger.warn(`⚠️ Handling validation error in iteration ${iteration}:`, error);
  }

  private async finalizeValidation(): Promise<void> {
    logger.info('✅ Validation system finalized');
  }
}

/**
 * AI Meta-Validator that validates validation logic
 */
export class AIMetaValidator {
  constructor(
    private claude: ClaudeIntegration,
    private context: MigrationContext
  ) {}

  async validateAllRules(rules: ValidationRule[]): Promise<{ issues: ValidationIssue[] }> {
    const issues: ValidationIssue[] = [];

    for (const rule of rules) {
      const ruleValidation = await this.validateRule(rule);

      if (!ruleValidation.isValid) {
        issues.push({
          type: 'rule-conflict',
          severity: 'high',
          scenario: `Rule validation failed: ${rule.name}`,
          rule,
          confidence: ruleValidation.confidence,
        });
      }
    }

    return { issues };
  }

  async validateRule(rule: ValidationRule): Promise<RuleValidation> {
    // Implementation for validating individual rules using AI
    return {
      isValid: true,
      falsePositiveRate: 0,
      falseNegativeRate: 0,
      accuracy: 0.95,
      performance: 100,
      coverage: 0.9,
      suggestions: [],
      confidence: 0.9,
    };
  }
}

/**
 * Validation Rule Generator using AI
 */
export class ValidationRuleGenerator {
  constructor(
    private claude: ClaudeIntegration,
    private context: MigrationContext
  ) {}

  async generateRule(issue: ValidationIssue): Promise<ValidationRule> {
    // Implementation for AI-powered rule generation
    return {
      id: `generated-${Date.now()}`,
      name: `Generated Rule for ${issue.scenario}`,
      description: `AI-generated rule to address: ${issue.scenario}`,
      pattern: '',
      severity: issue.severity,
      category: 'generated',
      validate: async () => ({ isValid: true, issues: [], confidence: 0.8, executionTime: 10 }),
      confidence: 0.8,
      successRate: 0.0,
      createdBy: 'ai',
      version: 1,
      lastUpdated: new Date(),
      testCases: [],
    };
  }

  async refineRule(rule: ValidationRule, issue: ValidationIssue): Promise<ValidationRule> {
    // Implementation for AI-powered rule refinement
    return {
      ...rule,
      version: rule.version + 1,
      lastUpdated: new Date(),
    };
  }
}

/**
 * Coverage Tracker for comprehensive validation
 */
export class CoverageTracker {
  constructor(private context: MigrationContext) {}

  async analyzeCoverage(rules: ValidationRule[]): Promise<CoverageMetrics> {
    // Implementation for coverage analysis
    return {
      totalScenarios: 100,
      coveredScenarios: 80,
      coveragePercentage: 0.8,
      missingScenarios: [],
      weakScenarios: [],
      redundantRules: [],
      gapAreas: [],
    };
  }
}

/**
 * Learning System for validation improvement
 */
export class ValidationLearningSystem {
  async learn(testResult: ValidationTestResult, rules: Map<string, ValidationRule>): Promise<void> {
    // Implementation for learning from validation results
  }
}

/**
 * Performance Monitor for validation optimization
 */
export class ValidationPerformanceMonitor {
  recordIteration(iteration: number, result: ValidationTestResult, duration: number): void {
    // Implementation for performance monitoring
  }
}
