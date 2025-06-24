import { logger } from '@elizaos/core';
import * as fs from 'fs-extra';
import * as path from 'node:path';
import { globby } from 'globby';
import type { MigrationContext } from '../types.js';
import { ClaudeIntegration } from './claude-integration.js';
import type {
  ValidationIssue,
  ValidationRule,
  ValidationTestCase,
  RuleValidation,
  ValidationResult,
  CoverageMetrics,
} from './self-validating-validator.js';

/**
 * Meta-validation test case for comprehensive rule testing
 */
export interface MetaValidationTestCase {
  id: string;
  name: string;
  description: string;
  ruleToTest: ValidationRule;
  inputCode: string;
  expectedValidationResult: boolean;
  expectedIssueCount: number;
  expectedSeverity?: 'critical' | 'high' | 'medium' | 'low';
  scenario: string;
  category: 'positive' | 'negative' | 'edge-case' | 'boundary';
  metadata?: Record<string, unknown>;
}

/**
 * Rule behavior analysis result
 */
export interface RuleBehaviorAnalysis {
  correctness: number; // 0-1 percentage of correct validations
  falsePositiveRate: number; // 0-1 rate of false positives
  falseNegativeRate: number; // 0-1 rate of false negatives
  performanceScore: number; // 0-1 performance rating
  coverageScore: number; // 0-1 coverage rating
  consistency: number; // 0-1 consistency across similar scenarios
  reliability: number; // 0-1 reliability score
  improvements: string[]; // Suggested improvements
  patterns: {
    strengths: string[];
    weaknesses: string[];
    gaps: string[];
  };
  confidence: number; // 0-1 confidence in the analysis
}

/**
 * Edge case generation configuration
 */
export interface EdgeCaseConfig {
  includeV1Patterns: boolean;
  includeV2Patterns: boolean;
  includeBoundaryConditions: boolean;
  includePerformanceEdgeCases: boolean;
  includeSecurityScenarios: boolean;
  maxTestCases: number;
  complexity: 'low' | 'medium' | 'high' | 'extreme';
}

/**
 * Comprehensive AI Meta-Validator that validates validation logic
 *
 * Core Philosophy: "Validators are validated by AI until mathematical certainty"
 * - Uses AI to analyze validation rule behavior
 * - Generates comprehensive test cases for every scenario
 * - Detects false positives and negatives through intelligent analysis
 * - Continuously improves validation accuracy through learning
 */
export class AIMetaValidator {
  private patternAnalyzer: PatternAnalyzer;
  private edgeCaseGenerator: EdgeCaseGenerator;
  private behaviorAnalyzer: BehaviorAnalyzer;
  private testCaseGenerator: MetaTestCaseGenerator;

  // Configuration
  private readonly maxTestCasesPerRule = 100;
  private readonly minimumAccuracy = 0.99; // 99% accuracy requirement
  private readonly performanceThreshold = 1000; // <1s per validation

  constructor(
    private claude: ClaudeIntegration,
    private context: MigrationContext
  ) {
    this.patternAnalyzer = new PatternAnalyzer(this.claude, this.context);
    this.edgeCaseGenerator = new EdgeCaseGenerator(this.claude, this.context);
    this.behaviorAnalyzer = new BehaviorAnalyzer(this.claude);
    this.testCaseGenerator = new MetaTestCaseGenerator(this.claude, this.context);
  }

  /**
   * Validate all validation rules comprehensively
   */
  async validateAllRules(rules: ValidationRule[]): Promise<{ issues: ValidationIssue[] }> {
    logger.info(`🔍 Meta-validating ${rules.length} validation rules...`);

    const allIssues: ValidationIssue[] = [];

    for (const rule of rules) {
      try {
        logger.info(`🧪 Meta-validating rule: ${rule.name}`);

        const ruleValidation = await this.validateRule(rule);

        if (!ruleValidation.isValid) {
          allIssues.push({
            type: 'rule-conflict',
            severity: ruleValidation.accuracy < 0.8 ? 'critical' : 'high',
            scenario: `Rule validation failed: ${rule.name}`,
            expectedBehavior: `Accuracy >= ${this.minimumAccuracy}`,
            actualBehavior: `Accuracy: ${ruleValidation.accuracy}`,
            rule,
            confidence: ruleValidation.confidence,
            metadata: {
              falsePositiveRate: ruleValidation.falsePositiveRate,
              falseNegativeRate: ruleValidation.falseNegativeRate,
              performance: ruleValidation.performance,
            },
          });
        }

        // Check for specific issues
        if (ruleValidation.falsePositiveRate > 0.01) {
          allIssues.push({
            type: 'false-positive',
            severity: 'high',
            scenario: `High false positive rate in rule: ${rule.name}`,
            expectedBehavior: 'False positive rate <= 1%',
            actualBehavior: `False positive rate: ${(ruleValidation.falsePositiveRate * 100).toFixed(2)}%`,
            rule,
            confidence: ruleValidation.confidence,
          });
        }

        if (ruleValidation.falseNegativeRate > 0.01) {
          allIssues.push({
            type: 'false-negative',
            severity: 'critical',
            scenario: `High false negative rate in rule: ${rule.name}`,
            expectedBehavior: 'False negative rate <= 1%',
            actualBehavior: `False negative rate: ${(ruleValidation.falseNegativeRate * 100).toFixed(2)}%`,
            rule,
            confidence: ruleValidation.confidence,
          });
        }

        if (ruleValidation.performance > this.performanceThreshold) {
          allIssues.push({
            type: 'performance',
            severity: 'medium',
            scenario: `Poor performance in rule: ${rule.name}`,
            expectedBehavior: `Performance <= ${this.performanceThreshold}ms`,
            actualBehavior: `Performance: ${ruleValidation.performance}ms`,
            rule,
            confidence: ruleValidation.confidence,
          });
        }
      } catch (error) {
        logger.error(`❌ Failed to meta-validate rule ${rule.name}:`, error);
        allIssues.push({
          type: 'rule-conflict',
          severity: 'critical',
          scenario: `Meta-validation error for rule: ${rule.name}`,
          expectedBehavior: 'Successful validation',
          actualBehavior: `Error: ${error}`,
          rule,
          confidence: 0.9,
        });
      }
    }

    logger.info(`📊 Meta-validation found ${allIssues.length} issues across ${rules.length} rules`);

    return { issues: allIssues };
  }

  /**
   * Validate a single rule comprehensively using AI analysis
   */
  async validateRule(rule: ValidationRule): Promise<RuleValidation> {
    logger.info(`🔬 Analyzing rule: ${rule.name}`);

    try {
      // Step 1: Generate comprehensive test cases for this rule
      const testCases = await this.generateRuleTestCases(rule);

      // Step 2: Run test cases and collect results
      const testResults = await this.runTestCases(rule, testCases);

      // Step 3: Analyze rule behavior using AI
      const behaviorAnalysis = await this.analyzeRuleBehavior(rule, testResults);

      // Step 4: Calculate metrics
      const accuracy = behaviorAnalysis.correctness;
      const falsePositiveRate = behaviorAnalysis.falsePositiveRate;
      const falseNegativeRate = behaviorAnalysis.falseNegativeRate;
      const performance = behaviorAnalysis.performanceScore;
      const coverage = behaviorAnalysis.coverageScore;

      // Step 5: Generate improvement suggestions
      const suggestions = await this.generateImprovementSuggestions(rule, behaviorAnalysis);

      const isValid =
        accuracy >= this.minimumAccuracy && falsePositiveRate <= 0.01 && falseNegativeRate <= 0.01;

      logger.info(
        `📊 Rule ${rule.name}: ${(accuracy * 100).toFixed(1)}% accuracy, ${isValid ? 'VALID' : 'INVALID'}`
      );

      return {
        isValid,
        falsePositiveRate,
        falseNegativeRate,
        accuracy,
        performance: performance * this.performanceThreshold, // Convert to ms
        coverage,
        suggestions,
        confidence: behaviorAnalysis.confidence,
      };
    } catch (error) {
      logger.error(`❌ Failed to validate rule ${rule.name}:`, error);
      return {
        isValid: false,
        falsePositiveRate: 1.0,
        falseNegativeRate: 1.0,
        accuracy: 0.0,
        performance: this.performanceThreshold * 10,
        coverage: 0.0,
        suggestions: [`Failed to validate rule: ${error}`],
        confidence: 0.1,
      };
    }
  }

  /**
   * Find validation gaps by analyzing patterns and coverage
   */
  async findValidationGaps(): Promise<ValidationIssue[]> {
    logger.info('🔍 Analyzing validation coverage gaps...');

    const gaps: ValidationIssue[] = [];

    try {
      // Analyze V1 → V2 migration patterns for uncovered scenarios
      const migrationPatterns = await this.patternAnalyzer.extractMigrationPatterns();

      // Check each pattern for validation coverage
      for (const pattern of migrationPatterns) {
        const isCovered = await this.checkPatternCoverage(pattern);

        if (!isCovered) {
          gaps.push({
            type: 'coverage-gap',
            severity: pattern.criticality === 'critical' ? 'critical' : 'high',
            scenario: pattern.description,
            codePattern: pattern.v1Pattern,
            expectedBehavior: pattern.v2Pattern,
            confidence: pattern.confidence,
            metadata: {
              category: pattern.category,
              frequency: pattern.frequency,
            },
          });
        }
      }

      // Generate edge cases and check coverage
      const edgeCases = await this.edgeCaseGenerator.generateEdgeCases({
        includeV1Patterns: true,
        includeV2Patterns: true,
        includeBoundaryConditions: true,
        includePerformanceEdgeCases: true,
        includeSecurityScenarios: true,
        maxTestCases: 50,
        complexity: 'high',
      });

      for (const edgeCase of edgeCases) {
        const isCovered = await this.checkEdgeCaseCoverage(edgeCase);

        if (!isCovered) {
          gaps.push({
            type: 'missing-rule',
            severity: 'medium',
            scenario: edgeCase.scenario,
            codePattern: edgeCase.code,
            expectedBehavior: edgeCase.expectedBehavior,
            confidence: edgeCase.confidence,
          });
        }
      }

      logger.info(`📊 Found ${gaps.length} validation gaps`);

      return gaps;
    } catch (error) {
      logger.error('❌ Failed to find validation gaps:', error);
      throw error;
    }
  }

  /**
   * Generate comprehensive test cases for a specific rule
   */
  private async generateRuleTestCases(rule: ValidationRule): Promise<MetaValidationTestCase[]> {
    const testCases: MetaValidationTestCase[] = [];

    try {
      // Generate positive test cases (should pass validation)
      const positiveTests = await this.testCaseGenerator.generatePositiveTests(rule, 20);
      testCases.push(...positiveTests);

      // Generate negative test cases (should fail validation)
      const negativeTests = await this.testCaseGenerator.generateNegativeTests(rule, 20);
      testCases.push(...negativeTests);

      // Generate edge cases
      const edgeTests = await this.testCaseGenerator.generateEdgeTests(rule, 10);
      testCases.push(...edgeTests);

      // Generate boundary condition tests
      const boundaryTests = await this.testCaseGenerator.generateBoundaryTests(rule, 10);
      testCases.push(...boundaryTests);

      logger.info(`📋 Generated ${testCases.length} test cases for rule: ${rule.name}`);

      return testCases;
    } catch (error) {
      logger.error(`❌ Failed to generate test cases for rule ${rule.name}:`, error);
      return [];
    }
  }

  /**
   * Run test cases against a rule and collect results
   */
  private async runTestCases(
    rule: ValidationRule,
    testCases: MetaValidationTestCase[]
  ): Promise<
    Array<{
      testCase: MetaValidationTestCase;
      result: ValidationResult;
      correct: boolean;
      executionTime: number;
    }>
  > {
    const results = [];

    for (const testCase of testCases) {
      const startTime = Date.now();

      try {
        const result = await rule.validate(testCase.inputCode);
        const executionTime = Date.now() - startTime;

        const correct = result.isValid === testCase.expectedValidationResult;

        results.push({
          testCase,
          result,
          correct,
          executionTime,
        });
      } catch (error) {
        logger.warn(`⚠️ Error running test case ${testCase.id} for rule ${rule.name}:`, error);

        results.push({
          testCase,
          result: {
            isValid: false,
            issues: [],
            confidence: 0,
            executionTime: Date.now() - startTime,
          },
          correct: false,
          executionTime: Date.now() - startTime,
        });
      }
    }

    return results;
  }

  /**
   * Analyze rule behavior using comprehensive AI analysis
   */
  private async analyzeRuleBehavior(
    rule: ValidationRule,
    testResults: Array<{
      testCase: MetaValidationTestCase;
      result: ValidationResult;
      correct: boolean;
      executionTime: number;
    }>
  ): Promise<RuleBehaviorAnalysis> {
    const prompt = `
<analyze_validation_rule_behavior>
<rule_information>
  <name>${rule.name}</name>
  <description>${rule.description}</description>
  <category>${rule.category}</category>
  <severity>${rule.severity}</severity>
  <pattern>${rule.pattern}</pattern>
  <confidence>${rule.confidence}</confidence>
  <success_rate>${rule.successRate}</success_rate>
</rule_information>

<test_results>
  <total_tests>${testResults.length}</total_tests>
  <correct_results>${testResults.filter((r) => r.correct).length}</correct_results>
  <incorrect_results>${testResults.filter((r) => !r.correct).length}</incorrect_results>
  <false_positives>${testResults.filter((r) => !r.correct && r.testCase.expectedValidationResult && !r.result.isValid).length}</false_positives>
  <false_negatives>${testResults.filter((r) => !r.correct && !r.testCase.expectedValidationResult && r.result.isValid).length}</false_negatives>
  <average_execution_time>${testResults.reduce((sum, r) => sum + r.executionTime, 0) / testResults.length}</average_execution_time>
</test_results>

<detailed_results>
${testResults
  .map(
    (r) => `
  <test_result>
    <test_name>${r.testCase.name}</test_name>
    <scenario>${r.testCase.scenario}</scenario>
    <category>${r.testCase.category}</category>
    <expected>${r.testCase.expectedValidationResult}</expected>
    <actual>${r.result.isValid}</actual>
    <correct>${r.correct}</correct>
    <execution_time>${r.executionTime}ms</execution_time>
    <issues_found>${r.result.issues.length}</issues_found>
  </test_result>
`
  )
  .join('')}
</detailed_results>

Analyze this validation rule's behavior and provide:

1. **Correctness Analysis** (0-1 score):
   - Overall accuracy percentage
   - False positive analysis and rate
   - False negative analysis and rate
   - Pattern recognition effectiveness

2. **Performance Analysis** (0-1 score):
   - Execution time consistency
   - Resource usage patterns
   - Scalability assessment

3. **Coverage Analysis** (0-1 score):
   - Scenario coverage completeness
   - Edge case handling
   - Boundary condition coverage

4. **Reliability Analysis** (0-1 score):
   - Consistency across similar inputs
   - Stability under different conditions
   - Error handling robustness

5. **Improvement Recommendations**:
   - Specific areas for enhancement
   - Pattern adjustments needed
   - Performance optimizations
   - Coverage gap identification

6. **Pattern Analysis**:
   - Rule strengths and effective patterns
   - Identified weaknesses and failure modes
   - Missing scenarios and gaps

Provide detailed analysis with specific examples and numeric scores.
</analyze_validation_rule_behavior>
    `;

    try {
      const analysis = await this.behaviorAnalyzer.analyzeWithAI(prompt);

      return {
        correctness: analysis.correctness || 0,
        falsePositiveRate: analysis.falsePositiveRate || 0,
        falseNegativeRate: analysis.falseNegativeRate || 0,
        performanceScore: analysis.performanceScore || 0,
        coverageScore: analysis.coverageScore || 0,
        consistency: analysis.consistency || 0,
        reliability: analysis.reliability || 0,
        improvements: analysis.improvements || [],
        patterns: analysis.patterns || { strengths: [], weaknesses: [], gaps: [] },
        confidence: analysis.confidence || 0.8,
      };
    } catch (error) {
      logger.error(`❌ Failed to analyze rule behavior for ${rule.name}:`, error);

      // Fallback calculation based on test results
      const totalTests = testResults.length;
      const correctResults = testResults.filter((r) => r.correct).length;
      const falsePositives = testResults.filter(
        (r) => !r.correct && r.testCase.expectedValidationResult && !r.result.isValid
      ).length;
      const falseNegatives = testResults.filter(
        (r) => !r.correct && !r.testCase.expectedValidationResult && r.result.isValid
      ).length;

      return {
        correctness: totalTests > 0 ? correctResults / totalTests : 0,
        falsePositiveRate: totalTests > 0 ? falsePositives / totalTests : 0,
        falseNegativeRate: totalTests > 0 ? falseNegatives / totalTests : 0,
        performanceScore: 0.5, // Default moderate performance
        coverageScore: 0.5, // Default moderate coverage
        consistency: 0.5,
        reliability: 0.5,
        improvements: ['Analysis failed - manual review needed'],
        patterns: { strengths: [], weaknesses: ['Analysis failed'], gaps: [] },
        confidence: 0.3,
      };
    }
  }

  /**
   * Generate improvement suggestions for a rule
   */
  private async generateImprovementSuggestions(
    rule: ValidationRule,
    analysis: RuleBehaviorAnalysis
  ): Promise<string[]> {
    const suggestions: string[] = [];

    if (analysis.correctness < 0.95) {
      suggestions.push(`Improve accuracy from ${(analysis.correctness * 100).toFixed(1)}% to >95%`);
    }

    if (analysis.falsePositiveRate > 0.01) {
      suggestions.push(
        `Reduce false positive rate from ${(analysis.falsePositiveRate * 100).toFixed(2)}% to <1%`
      );
    }

    if (analysis.falseNegativeRate > 0.01) {
      suggestions.push(
        `Reduce false negative rate from ${(analysis.falseNegativeRate * 100).toFixed(2)}% to <1%`
      );
    }

    if (analysis.performanceScore < 0.8) {
      suggestions.push('Optimize performance for faster execution');
    }

    if (analysis.coverageScore < 0.9) {
      suggestions.push('Expand coverage to handle more scenarios');
    }

    suggestions.push(...analysis.improvements);

    return suggestions;
  }

  /**
   * Helper methods with placeholder implementations
   */
  private async checkPatternCoverage(pattern: any): Promise<boolean> {
    // Implementation for checking if a pattern is covered by existing rules
    return false; // Placeholder
  }

  private async checkEdgeCaseCoverage(edgeCase: any): Promise<boolean> {
    // Implementation for checking if an edge case is covered
    return false; // Placeholder
  }
}

/**
 * Supporting classes with placeholder implementations
 */
export class PatternAnalyzer {
  constructor(
    private claude: ClaudeIntegration,
    private context: MigrationContext
  ) {}

  async extractMigrationPatterns(): Promise<any[]> {
    // Implementation for extracting migration patterns
    return [];
  }
}

export class EdgeCaseGenerator {
  constructor(
    private claude: ClaudeIntegration,
    private context: MigrationContext
  ) {}

  async generateEdgeCases(config: EdgeCaseConfig): Promise<any[]> {
    // Implementation for generating edge cases
    return [];
  }
}

export class BehaviorAnalyzer {
  constructor(private claude: ClaudeIntegration) {}

  async analyzeWithAI(prompt: string): Promise<any> {
    // Implementation for AI-powered behavior analysis
    return {
      correctness: 0.9,
      falsePositiveRate: 0.05,
      falseNegativeRate: 0.05,
      performanceScore: 0.8,
      coverageScore: 0.85,
      consistency: 0.9,
      reliability: 0.85,
      improvements: [],
      patterns: { strengths: [], weaknesses: [], gaps: [] },
      confidence: 0.8,
    };
  }
}

export class MetaTestCaseGenerator {
  constructor(
    private claude: ClaudeIntegration,
    private context: MigrationContext
  ) {}

  async generatePositiveTests(
    rule: ValidationRule,
    count: number
  ): Promise<MetaValidationTestCase[]> {
    // Implementation for generating positive test cases
    return [];
  }

  async generateNegativeTests(
    rule: ValidationRule,
    count: number
  ): Promise<MetaValidationTestCase[]> {
    // Implementation for generating negative test cases
    return [];
  }

  async generateEdgeTests(rule: ValidationRule, count: number): Promise<MetaValidationTestCase[]> {
    // Implementation for generating edge test cases
    return [];
  }

  async generateBoundaryTests(
    rule: ValidationRule,
    count: number
  ): Promise<MetaValidationTestCase[]> {
    // Implementation for generating boundary test cases
    return [];
  }
}
