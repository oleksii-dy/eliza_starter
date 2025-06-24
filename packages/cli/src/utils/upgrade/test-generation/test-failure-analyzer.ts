/**
 * TEST FAILURE ANALYZER
 *
 * Responsibilities:
 * - Intelligent categorization of test failures
 * - Pattern recognition across failure types
 * - Root cause analysis using AI
 * - Learning from failure patterns
 * - Confidence scoring for analysis
 */

import { logger } from '@elizaos/core';
import type { ClaudeIntegration } from '../core/claude-integration.js';
import type {
  TestFailure,
  FailureAnalysis,
  MockDetails,
  EnvironmentDetails,
  CodeFix,
} from './ai-test-environment.js';

/**
 * Failure pattern for pattern recognition
 */
interface FailurePattern {
  id: string;
  name: string;
  description: string;
  errorSignatures: string[];
  commonCauses: string[];
  solutionTemplates: string[];
  confidence: number; // 0-1
  occurrenceCount: number;
  lastSeen: number; // timestamp
}

/**
 * Analysis context for comprehensive failure analysis
 */
interface AnalysisContext {
  failureHistory: TestFailure[];
  recentPatterns: FailurePattern[];
  environmentInfo: Record<string, any>;
  projectStructure: string[];
  previousAnalyses: FailureAnalysis[];
}

/**
 * Categorized failure information
 */
interface CategorizedFailure {
  category: 'import' | 'type' | 'runtime' | 'mock' | 'environment' | 'configuration' | 'dependency';
  subcategory: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  confidence: number; // 0-1
  patterns: FailurePattern[];
  suggestedFixes: string[];
}

/**
 * Test failure analyzer with AI-powered pattern recognition
 */
export class TestFailureAnalyzer {
  private claudeIntegration: ClaudeIntegration;
  private knownPatterns: Map<string, FailurePattern> = new Map();
  private analysisHistory: FailureAnalysis[] = [];
  private learningDatabase: Map<string, any> = new Map();

  constructor(claudeIntegration: ClaudeIntegration) {
    this.claudeIntegration = claudeIntegration;
    this.initializeKnownPatterns();

    logger.info('🔍 TestFailureAnalyzer initialized with pattern recognition');
  }

  /**
   * Perform comprehensive analysis of a test failure
   */
  async analyzeFailure(failure: TestFailure, context?: AnalysisContext): Promise<FailureAnalysis> {
    logger.info(`🔬 Analyzing failure: ${failure.testName} (${failure.errorType})`);

    try {
      // Step 1: Categorize the failure
      const categorized = await this.categorizeFailure(failure);

      // Step 2: Identify patterns
      const matchingPatterns = this.identifyPatterns(failure);

      // Step 3: AI-powered root cause analysis
      const rootCauseAnalysis = await this.performRootCauseAnalysis(
        failure,
        categorized,
        matchingPatterns
      );

      // Step 4: Generate specific recommendations
      const recommendations = await this.generateRecommendations(failure, rootCauseAnalysis);

      // Step 5: Build comprehensive analysis
      const analysis: FailureAnalysis = {
        rootCause: rootCauseAnalysis.rootCause,
        category: this.mapCategoryToAnalysisCategory(categorized.category),
        confidence: Math.min(categorized.confidence, rootCauseAnalysis.confidence),
        requiredMocks: recommendations.mocks,
        environmentChanges: recommendations.environment,
        codeFixes: recommendations.code,
        estimatedComplexity: this.calculateComplexity(failure, categorized, matchingPatterns),
      };

      // Step 6: Learn from this analysis
      await this.learnFromAnalysis(failure, analysis, matchingPatterns);

      // Store in history
      this.analysisHistory.push(analysis);

      logger.info(
        `✅ Analysis complete: ${analysis.category} (confidence: ${analysis.confidence.toFixed(2)})`
      );
      return analysis;
    } catch (error) {
      logger.error('❌ Failure analysis failed, using fallback:', error);
      return this.createFallbackAnalysis(failure);
    }
  }

  /**
   * Analyze multiple failures for cross-failure patterns
   */
  async analyzeMultipleFailures(failures: TestFailure[]): Promise<FailureAnalysis[]> {
    logger.info(`🔬 Analyzing ${failures.length} failures for cross-patterns...`);

    // Build analysis context
    const context: AnalysisContext = {
      failureHistory: failures,
      recentPatterns: Array.from(this.knownPatterns.values()).slice(-10),
      environmentInfo: {},
      projectStructure: [],
      previousAnalyses: this.analysisHistory.slice(-5),
    };

    // Analyze each failure with shared context
    const analyses: FailureAnalysis[] = [];

    for (const failure of failures) {
      const analysis = await this.analyzeFailure(failure, context);
      analyses.push(analysis);
    }

    // Look for cross-failure patterns
    await this.identifyCrossFailurePatterns(failures, analyses);

    return analyses;
  }

  /**
   * Categorize failure into specific categories
   */
  private async categorizeFailure(failure: TestFailure): Promise<CategorizedFailure> {
    logger.info(`📂 Categorizing failure: ${failure.errorType}`);

    // Check for known patterns first
    const matchingPatterns = this.identifyPatterns(failure);

    if (matchingPatterns.length > 0) {
      const primaryPattern = matchingPatterns[0];
      return {
        category: this.inferCategoryFromPattern(primaryPattern),
        subcategory: primaryPattern.name,
        severity: failure.severity,
        confidence: primaryPattern.confidence,
        patterns: matchingPatterns,
        suggestedFixes: primaryPattern.solutionTemplates,
      };
    }

    // AI-powered categorization for unknown patterns
    const aiCategorization = await this.aiCategorizeFailure(failure);
    return aiCategorization;
  }

  /**
   * AI-powered failure categorization
   */
  private async aiCategorizeFailure(failure: TestFailure): Promise<CategorizedFailure> {
    const categorizationPrompt = `# Test Failure Categorization

<failure_details>
Test Name: ${failure.testName}
Error Type: ${failure.errorType}
Error Message: ${failure.errorMessage}
File Path: ${failure.filePath}
Stack Trace: ${failure.stackTrace || 'N/A'}
</failure_details>

<categorization_task>
Categorize this test failure into one of these categories:

1. **import** - Module resolution, import path, dependency issues
2. **type** - TypeScript type errors, interface mismatches
3. **runtime** - Runtime execution errors, async issues, timing
4. **mock** - Mock-related failures, behavior mismatches
5. **environment** - Environment setup, variables, configuration
6. **configuration** - Test configuration, setup issues
7. **dependency** - Missing or incompatible dependencies

For each category, provide:
- Subcategory (specific type of issue)
- Severity (critical/high/medium/low)
- Confidence (0-1)
- Suggested fixes (3-5 specific recommendations)
</categorization_task>

<output_format>
Return JSON object:
{
  "category": "category_name",
  "subcategory": "specific_issue_type",
  "severity": "critical|high|medium|low",
  "confidence": 0.8,
  "suggestedFixes": ["fix1", "fix2", "fix3"]
}
</output_format>

Provide accurate categorization for this test failure.`;

    try {
      const result = await this.claudeIntegration.runClaudeCodeWithPrompt(categorizationPrompt);
      const parsed = this.parseCategorizationResult(result);

      return {
        category: parsed.category,
        subcategory: parsed.subcategory,
        severity: parsed.severity,
        confidence: parsed.confidence,
        patterns: [],
        suggestedFixes: parsed.suggestedFixes,
      };
    } catch (error) {
      logger.error('❌ AI categorization failed, using heuristic:', error);
      return this.heuristicCategorization(failure);
    }
  }

  /**
   * Identify matching patterns for failure
   */
  private identifyPatterns(failure: TestFailure): FailurePattern[] {
    const matchingPatterns: FailurePattern[] = [];

    for (const pattern of this.knownPatterns.values()) {
      const matchScore = this.calculatePatternMatch(failure, pattern);

      if (matchScore > 0.6) {
        // 60% match threshold
        pattern.occurrenceCount++;
        pattern.lastSeen = Date.now();
        matchingPatterns.push(pattern);
      }
    }

    // Sort by confidence and occurrence count
    return matchingPatterns.sort((a, b) => {
      const scoreA = a.confidence * Math.log(a.occurrenceCount + 1);
      const scoreB = b.confidence * Math.log(b.occurrenceCount + 1);
      return scoreB - scoreA;
    });
  }

  /**
   * Perform AI-powered root cause analysis
   */
  private async performRootCauseAnalysis(
    failure: TestFailure,
    categorized: CategorizedFailure,
    patterns: FailurePattern[]
  ): Promise<{ rootCause: string; confidence: number }> {
    logger.info(`🧠 Performing root cause analysis for ${categorized.category} failure...`);

    const analysisPrompt = `# Root Cause Analysis

<failure_details>
Test: ${failure.testName}
Category: ${categorized.category}
Subcategory: ${categorized.subcategory}
Error: ${failure.errorMessage}
File: ${failure.filePath}
</failure_details>

<matching_patterns>
${patterns
  .map(
    (p) => `
Pattern: ${p.name}
Description: ${p.description}
Common Causes: ${p.commonCauses.join(', ')}
Confidence: ${p.confidence}
`
  )
  .join('\n')}
</matching_patterns>

<analysis_requirements>
Identify the ROOT CAUSE of this test failure by:

1. Analyzing the error message and context
2. Considering the matching patterns
3. Identifying the underlying system issue
4. Distinguishing between symptoms and root causes
5. Providing confidence level (0-1)

Focus on the FUNDAMENTAL issue that, when fixed, will resolve this failure.
</analysis_requirements>

<output_format>
Return JSON:
{
  "rootCause": "Clear description of the fundamental issue",
  "confidence": 0.85
}
</output_format>

Identify the root cause with high precision.`;

    try {
      const result = await this.claudeIntegration.runClaudeCodeWithPrompt(analysisPrompt);
      return this.parseRootCauseResult(result);
    } catch (error) {
      logger.error('❌ Root cause analysis failed:', error);
      return {
        rootCause: failure.errorMessage,
        confidence: 0.5,
      };
    }
  }

  /**
   * Generate specific recommendations for fixing the failure
   */
  private async generateRecommendations(
    failure: TestFailure,
    rootCause: { rootCause: string; confidence: number }
  ): Promise<{
    mocks: MockDetails[];
    environment: EnvironmentDetails[];
    code: CodeFix[];
  }> {
    logger.info(`💡 Generating recommendations for: ${rootCause.rootCause}`);

    const recommendationPrompt = `# Generate Fix Recommendations

<failure_context>
Test: ${failure.testName}
Root Cause: ${rootCause.rootCause}
Confidence: ${rootCause.confidence}
Error: ${failure.errorMessage}
File: ${failure.filePath}
</failure_context>

<recommendation_types>
Generate specific recommendations in these categories:

1. **Mocks** - If dependencies need mocking
2. **Environment** - If environment setup is needed
3. **Code** - If code changes are required

For each recommendation, provide:
- Specific details
- Implementation approach
- Confidence level
- Expected complexity
</recommendation_types>

<output_format>
Return JSON:
{
  "mocks": [
    {
      "dependency": "module_name",
      "expectedBehavior": "description",
      "interface": "interface_definition",
      "usageContext": "how_it_is_used",
      "sophisticationLevel": 3,
      "existingFailures": ["failure_reason"]
    }
  ],
  "environment": [
    {
      "type": "variable|dependency|configuration|setup",
      "name": "env_name",
      "value": "env_value",
      "required": true,
      "source": "package.json|env|config|runtime"
    }
  ],
  "code": [
    {
      "filePath": "path/to/file",
      "type": "import|type|logic|structure",
      "description": "what_to_change",
      "confidence": 0.9,
      "changes": [
        {
          "lineNumber": 42,
          "oldCode": "old_code",
          "newCode": "new_code",
          "reason": "why_change_needed"
        }
      ]
    }
  ]
}
</output_format>

Generate comprehensive fix recommendations.`;

    try {
      const result = await this.claudeIntegration.runClaudeCodeWithPrompt(recommendationPrompt);
      return this.parseRecommendationResult(result);
    } catch (error) {
      logger.error('❌ Recommendation generation failed:', error);
      return {
        mocks: [],
        environment: [],
        code: [],
      };
    }
  }

  /**
   * Calculate complexity score for the failure
   */
  private calculateComplexity(
    failure: TestFailure,
    categorized: CategorizedFailure,
    patterns: FailurePattern[]
  ): number {
    let complexity = 1;

    // Base complexity from category
    const categoryComplexity = {
      import: 2,
      type: 3,
      runtime: 4,
      mock: 5,
      environment: 3,
      configuration: 2,
      dependency: 3,
    };

    complexity += categoryComplexity[categorized.category] || 3;

    // Add complexity based on severity
    const severityComplexity = {
      critical: 4,
      high: 3,
      medium: 2,
      low: 1,
    };

    complexity += severityComplexity[categorized.severity];

    // Reduce complexity if we have known patterns
    if (patterns.length > 0) {
      complexity -= Math.min(2, patterns.length);
    }

    // Increase complexity if error message is vague
    if (failure.errorMessage.length < 50 || failure.errorMessage.includes('unknown')) {
      complexity += 2;
    }

    return Math.max(1, Math.min(10, complexity));
  }

  /**
   * Learn from analysis for future pattern recognition
   */
  private async learnFromAnalysis(
    failure: TestFailure,
    analysis: FailureAnalysis,
    matchingPatterns: FailurePattern[]
  ): Promise<void> {
    logger.info(`📚 Learning from analysis: ${analysis.category}`);

    // If no patterns matched but analysis was successful, create new pattern
    if (matchingPatterns.length === 0 && analysis.confidence > 0.8) {
      const newPattern = this.createPatternFromAnalysis(failure, analysis);
      this.knownPatterns.set(newPattern.id, newPattern);
      logger.info(`📝 Created new pattern: ${newPattern.name}`);
    }

    // Update existing patterns with new information
    for (const pattern of matchingPatterns) {
      this.updatePatternFromAnalysis(pattern, failure, analysis);
    }

    // Store in learning database
    const learningKey = `${analysis.category}-${failure.errorType}`;
    const existingLearning = this.learningDatabase.get(learningKey) || { count: 0, analyses: [] };
    existingLearning.count++;
    existingLearning.analyses.push(analysis);
    this.learningDatabase.set(learningKey, existingLearning);

    logger.info(
      `🧠 Learning complete. Patterns: ${this.knownPatterns.size}, Database: ${this.learningDatabase.size}`
    );
  }

  /**
   * Identify patterns that span multiple failures
   */
  private async identifyCrossFailurePatterns(
    failures: TestFailure[],
    analyses: FailureAnalysis[]
  ): Promise<void> {
    logger.info(`🔗 Identifying cross-failure patterns across ${failures.length} failures...`);

    // Group by category
    const categoryGroups = new Map<
      string,
      { failures: TestFailure[]; analyses: FailureAnalysis[] }
    >();

    for (let i = 0; i < failures.length; i++) {
      const failure = failures[i];
      const analysis = analyses[i];

      if (!categoryGroups.has(analysis.category)) {
        categoryGroups.set(analysis.category, { failures: [], analyses: [] });
      }

      const group = categoryGroups.get(analysis.category)!;
      group.failures.push(failure);
      group.analyses.push(analysis);
    }

    // Look for patterns within each category
    for (const [category, group] of categoryGroups.entries()) {
      if (group.failures.length >= 2) {
        await this.identifyCategoryPattern(category, group.failures, group.analyses);
      }
    }
  }

  /**
   * Initialize known failure patterns
   */
  private initializeKnownPatterns(): void {
    const patterns: FailurePattern[] = [
      {
        id: 'import-extension-mismatch',
        name: 'Import Extension Mismatch',
        description: 'Import statements using .ts instead of .js extensions',
        errorSignatures: ['Cannot find module', '.ts', 'import'],
        commonCauses: ['TypeScript compilation', 'ES module resolution'],
        solutionTemplates: ['Change .ts to .js in imports', 'Update import paths'],
        confidence: 0.9,
        occurrenceCount: 0,
        lastSeen: 0,
      },
      {
        id: 'mock-runtime-missing',
        name: 'Missing Mock Runtime Methods',
        description: 'Mock runtime missing required V2 methods',
        errorSignatures: ['useModel is not a function', 'createMemory is not a function'],
        commonCauses: ['V1 to V2 migration', 'Incomplete mock implementation'],
        solutionTemplates: ['Add useModel method to mock', 'Add createMemory method to mock'],
        confidence: 0.95,
        occurrenceCount: 0,
        lastSeen: 0,
      },
      {
        id: 'test-suite-structure',
        name: 'Test Suite Structure Issues',
        description: 'Test suite export and structure problems',
        errorSignatures: ['TestSuite', 'default export', 'test suite'],
        commonCauses: ['Incorrect export pattern', 'Missing test suite definition'],
        solutionTemplates: ['Export default test suite', 'Fix test suite structure'],
        confidence: 0.85,
        occurrenceCount: 0,
        lastSeen: 0,
      },
      {
        id: 'elizaos-test-structure',
        name: 'ElizaOS Test Structure Issues',
        description: 'Problems with ElizaOS native test structure and patterns',
        errorSignatures: ['TestSuite', 'createMockRuntime', 'IAgentRuntime'],
        commonCauses: ['Incorrect ElizaOS test setup', 'Missing ElizaOS imports'],
        solutionTemplates: [
          'Use ElizaOS TestSuite pattern',
          'Import from @elizaos/core',
          'Use createMockRuntime()',
        ],
        confidence: 0.9,
        occurrenceCount: 0,
        lastSeen: 0,
      },
    ];

    for (const pattern of patterns) {
      this.knownPatterns.set(pattern.id, pattern);
    }

    logger.info(`📚 Initialized ${patterns.length} known failure patterns`);
  }

  // Helper methods
  private calculatePatternMatch(failure: TestFailure, pattern: FailurePattern): number {
    let matchScore = 0;

    // Check error message for signature matches
    for (const signature of pattern.errorSignatures) {
      if (failure.errorMessage.toLowerCase().includes(signature.toLowerCase())) {
        matchScore += 0.3;
      }
    }

    // Check error type compatibility
    if (pattern.id.includes(failure.errorType)) {
      matchScore += 0.2;
    }

    // Check stack trace for additional context
    if (failure.stackTrace) {
      for (const signature of pattern.errorSignatures) {
        if (failure.stackTrace.toLowerCase().includes(signature.toLowerCase())) {
          matchScore += 0.2;
        }
      }
    }

    return Math.min(1, matchScore);
  }

  private inferCategoryFromPattern(pattern: FailurePattern): CategorizedFailure['category'] {
    const categoryMap: Record<string, CategorizedFailure['category']> = {
      import: 'import',
      mock: 'mock',
      test: 'configuration',
      vitest: 'configuration',
      runtime: 'runtime',
      type: 'type',
    };

    for (const [key, category] of Object.entries(categoryMap)) {
      if (pattern.id.includes(key) || pattern.name.toLowerCase().includes(key)) {
        return category;
      }
    }

    return 'runtime'; // Default fallback
  }

  private mapCategoryToAnalysisCategory(
    category: CategorizedFailure['category']
  ): FailureAnalysis['category'] {
    const mapping: Record<CategorizedFailure['category'], FailureAnalysis['category']> = {
      import: 'dependency',
      type: 'code',
      runtime: 'code',
      mock: 'mock',
      environment: 'environment',
      configuration: 'configuration',
      dependency: 'dependency',
    };

    return mapping[category] || 'code';
  }

  private heuristicCategorization(failure: TestFailure): CategorizedFailure {
    // Simple heuristic categorization based on error patterns
    if (failure.errorMessage.includes('Cannot find module')) {
      return {
        category: 'import',
        subcategory: 'module-resolution',
        severity: 'critical',
        confidence: 0.8,
        patterns: [],
        suggestedFixes: ['Check import paths', 'Verify file extensions'],
      };
    }

    if (failure.errorMessage.includes('TypeError')) {
      return {
        category: 'type',
        subcategory: 'type-error',
        severity: 'high',
        confidence: 0.7,
        patterns: [],
        suggestedFixes: ['Check type definitions', 'Verify interfaces'],
      };
    }

    return {
      category: 'runtime',
      subcategory: 'unknown',
      severity: failure.severity,
      confidence: 0.5,
      patterns: [],
      suggestedFixes: ['Check runtime setup', 'Verify test configuration'],
    };
  }

  private parseCategorizationResult(result: any): any {
    try {
      if (typeof result === 'string') {
        const jsonMatch = result.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      }
      return result;
    } catch (error) {
      logger.warn('⚠️ Failed to parse categorization result');
      return {
        category: 'runtime',
        subcategory: 'unknown',
        severity: 'medium',
        confidence: 0.5,
        suggestedFixes: [],
      };
    }
  }

  private parseRootCauseResult(result: any): { rootCause: string; confidence: number } {
    try {
      if (typeof result === 'string') {
        const jsonMatch = result.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return {
            rootCause: parsed.rootCause || 'Unknown root cause',
            confidence: parsed.confidence || 0.5,
          };
        }
      }
      return result;
    } catch (error) {
      logger.warn('⚠️ Failed to parse root cause result');
      return {
        rootCause: 'Unknown root cause',
        confidence: 0.5,
      };
    }
  }

  private parseRecommendationResult(result: any): {
    mocks: MockDetails[];
    environment: EnvironmentDetails[];
    code: CodeFix[];
  } {
    try {
      if (typeof result === 'string') {
        const jsonMatch = result.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return {
            mocks: parsed.mocks || [],
            environment: parsed.environment || [],
            code: parsed.code || [],
          };
        }
      }
      return result;
    } catch (error) {
      logger.warn('⚠️ Failed to parse recommendation result');
      return {
        mocks: [],
        environment: [],
        code: [],
      };
    }
  }

  private createPatternFromAnalysis(
    failure: TestFailure,
    analysis: FailureAnalysis
  ): FailurePattern {
    return {
      id: `pattern-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: `${analysis.category} Pattern`,
      description: `Generated pattern for ${analysis.category} failures`,
      errorSignatures: [failure.errorMessage.slice(0, 50)],
      commonCauses: [analysis.rootCause],
      solutionTemplates: [`Fix ${analysis.category} issue`],
      confidence: analysis.confidence,
      occurrenceCount: 1,
      lastSeen: Date.now(),
    };
  }

  private updatePatternFromAnalysis(
    pattern: FailurePattern,
    failure: TestFailure,
    analysis: FailureAnalysis
  ): void {
    // Update pattern with new information
    pattern.confidence = (pattern.confidence + analysis.confidence) / 2;
    pattern.occurrenceCount++;
    pattern.lastSeen = Date.now();

    // Add new error signatures if unique
    const newSignature = failure.errorMessage.slice(0, 50);
    if (!pattern.errorSignatures.includes(newSignature)) {
      pattern.errorSignatures.push(newSignature);
    }

    // Add new common causes if unique
    if (!pattern.commonCauses.includes(analysis.rootCause)) {
      pattern.commonCauses.push(analysis.rootCause);
    }
  }

  private async identifyCategoryPattern(
    category: string,
    failures: TestFailure[],
    analyses: FailureAnalysis[]
  ): Promise<void> {
    logger.info(`🔗 Identifying pattern for ${category} category with ${failures.length} failures`);

    // Look for common patterns across failures in this category
    const commonElements = {
      errorMessages: this.findCommonSubstrings(failures.map((f) => f.errorMessage)),
      filePaths: this.findCommonSubstrings(failures.map((f) => f.filePath)),
      rootCauses: this.findCommonSubstrings(analyses.map((a) => a.rootCause)),
    };

    if (commonElements.errorMessages.length > 0 || commonElements.rootCauses.length > 0) {
      // Create a cross-failure pattern
      const crossPattern: FailurePattern = {
        id: `cross-${category}-${Date.now()}`,
        name: `Cross-${category} Pattern`,
        description: `Pattern spanning multiple ${category} failures`,
        errorSignatures: commonElements.errorMessages,
        commonCauses: commonElements.rootCauses,
        solutionTemplates: [`Apply systematic ${category} fixes`],
        confidence: 0.7,
        occurrenceCount: failures.length,
        lastSeen: Date.now(),
      };

      this.knownPatterns.set(crossPattern.id, crossPattern);
      logger.info(`📝 Created cross-failure pattern: ${crossPattern.name}`);
    }
  }

  private findCommonSubstrings(strings: string[]): string[] {
    if (strings.length < 2) return [];

    const common: string[] = [];
    const minLength = 10; // Minimum substring length

    for (let i = 0; i < strings[0].length - minLength; i++) {
      for (let j = i + minLength; j <= strings[0].length; j++) {
        const substring = strings[0].slice(i, j);

        if (strings.every((str) => str.includes(substring))) {
          common.push(substring);
        }
      }
    }

    // Return unique, non-overlapping substrings
    return [...new Set(common)].filter((s) => s.trim().length >= minLength);
  }

  private createFallbackAnalysis(failure: TestFailure): FailureAnalysis {
    return {
      rootCause: failure.errorMessage,
      category: 'code',
      confidence: 0.3,
      requiredMocks: [],
      environmentChanges: [],
      codeFixes: [],
      estimatedComplexity: 5,
    };
  }
}
