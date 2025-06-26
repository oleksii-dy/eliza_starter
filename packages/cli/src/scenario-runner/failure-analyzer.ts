/**
 * Scenario Failure Analysis System
 * Analyzes failed scenarios to provide actionable improvement recommendations
 */

import { logger } from '@elizaos/core';

export interface ScenarioFailureAnalysis {
  scenarioId: string;
  scenarioName: string;
  failureCategory: 'technical' | 'verification' | 'timeout' | 'configuration' | 'api' | 'unknown';
  rootCause: string;
  failedVerificationRules: string[];
  transcriptInsights: TranscriptInsight[];
  improvementRecommendations: ImprovementRecommendation[];
  retryLikelihood: 'high' | 'medium' | 'low';
  estimatedFixComplexity: 'simple' | 'moderate' | 'complex';
}

export interface TranscriptInsight {
  type:
    | 'missing_interaction'
    | 'error_pattern'
    | 'timeout_issue'
    | 'incomplete_response'
    | 'configuration_error';
  description: string;
  evidence: string[];
  impact: 'critical' | 'major' | 'minor';
}

export interface ImprovementRecommendation {
  category:
    | 'configuration'
    | 'environment'
    | 'scenario_design'
    | 'verification_rules'
    | 'infrastructure';
  priority: 'high' | 'medium' | 'low';
  action: string;
  implementation: string;
  expectedImpact: string;
}

export class ScenarioFailureAnalyzer {
  constructor() {
    logger.info('ScenarioFailureAnalyzer initialized');
  }

  /**
   * Analyze a failed scenario and provide comprehensive insights
   */
  async analyzeFailure(
    scenarioResult: any,
    scenario: any,
    transcript: any[],
    errors: string[]
  ): Promise<ScenarioFailureAnalysis> {
    logger.info(`Analyzing failure for scenario: ${scenario.name}`);

    const failureCategory = this.categorizeFailure(errors, scenarioResult, transcript);
    const rootCause = this.identifyRootCause(errors, transcript, failureCategory);
    const failedVerificationRules = this.extractFailedVerificationRules(scenarioResult);
    const transcriptInsights = this.analyzeTranscript(transcript, scenario);
    const improvementRecommendations = this.generateImprovementRecommendations(
      failureCategory,
      rootCause,
      transcriptInsights,
      scenario
    );
    const retryLikelihood = this.assessRetryLikelihood(
      failureCategory,
      rootCause,
      transcriptInsights
    );
    const estimatedFixComplexity = this.estimateFixComplexity(
      failureCategory,
      improvementRecommendations
    );

    const analysis: ScenarioFailureAnalysis = {
      scenarioId: scenario.id,
      scenarioName: scenario.name,
      failureCategory,
      rootCause,
      failedVerificationRules,
      transcriptInsights,
      improvementRecommendations,
      retryLikelihood,
      estimatedFixComplexity,
    };

    this.logAnalysisResults(analysis);
    return analysis;
  }

  private categorizeFailure(
    errors: string[],
    scenarioResult: any,
    transcript: any[]
  ): ScenarioFailureAnalysis['failureCategory'] {
    // Check for technical errors
    const technicalKeywords = [
      'timeout',
      'connection',
      'network',
      'database',
      'webassembly',
      'initialization',
    ];
    if (
      errors.some((error) =>
        technicalKeywords.some((keyword) => error.toLowerCase().includes(keyword))
      )
    ) {
      return 'technical';
    }

    // Check for API errors
    const apiKeywords = [
      'api',
      'authentication',
      'rate limit',
      'forbidden',
      '401',
      '403',
      '429',
      '500',
    ];
    if (
      errors.some((error) => apiKeywords.some((keyword) => error.toLowerCase().includes(keyword)))
    ) {
      return 'api';
    }

    // Check for configuration errors
    const configKeywords = ['environment', 'missing', 'not found', 'configuration', 'setting'];
    if (
      errors.some((error) =>
        configKeywords.some((keyword) => error.toLowerCase().includes(keyword))
      )
    ) {
      return 'configuration';
    }

    // Check for timeout issues
    if (
      errors.some((error) => error.toLowerCase().includes('timeout')) ||
      transcript.length === 0
    ) {
      return 'timeout';
    }

    // Check verification failures
    if (scenarioResult?.verificationResults?.some((v: any) => !v.passed)) {
      return 'verification';
    }

    return 'unknown';
  }

  private identifyRootCause(errors: string[], transcript: any[], category: string): string {
    if (errors.length > 0) {
      const primaryError = errors[0];

      switch (category) {
        case 'technical':
          if (primaryError.includes('WebAssembly')) {
            return 'PGLite WebAssembly initialization failure in Node.js environment';
          }
          if (primaryError.includes('database')) {
            return 'Database connection or initialization failure';
          }
          if (primaryError.includes('timeout')) {
            return 'Operation timeout due to slow system response';
          }
          return `Technical infrastructure issue: ${primaryError}`;

        case 'api':
          if (primaryError.includes('authentication')) {
            return 'API authentication failure - invalid or missing credentials';
          }
          if (primaryError.includes('rate limit')) {
            return 'API rate limit exceeded';
          }
          return `External API failure: ${primaryError}`;

        case 'configuration':
          if (primaryError.includes('environment')) {
            return 'Missing or invalid environment variables';
          }
          return `Configuration issue: ${primaryError}`;

        case 'timeout':
          return 'Scenario execution timeout - operations took longer than expected';

        default:
          return primaryError || 'Unknown failure cause';
      }
    }

    if (transcript.length === 0) {
      return 'No agent interactions recorded - possible initialization failure';
    }

    return 'Verification rules not met despite successful execution';
  }

  private extractFailedVerificationRules(scenarioResult: any): string[] {
    if (!scenarioResult?.verificationResults) {
      return [];
    }

    return scenarioResult.verificationResults
      .filter((v: any) => !v.passed)
      .map((v: any) => v.ruleId || v.ruleName || 'unknown_rule');
  }

  private analyzeTranscript(transcript: any[], scenario: any): TranscriptInsight[] {
    const insights: TranscriptInsight[] = [];

    // Check for missing interactions
    if (transcript.length === 0) {
      insights.push({
        type: 'missing_interaction',
        description: 'No agent interactions recorded in transcript',
        evidence: ['Empty transcript array'],
        impact: 'critical',
      });
    }

    // Check for incomplete responses
    const messageEvents = transcript.filter(
      (t) => t.type === 'message_sent' || t.type === 'message'
    );
    const expectedMessages =
      scenario.script?.steps?.filter((s: any) => s.type === 'message')?.length || 0;

    if (messageEvents.length < expectedMessages) {
      insights.push({
        type: 'incomplete_response',
        description: `Only ${messageEvents.length}/${expectedMessages} expected messages found in transcript`,
        evidence: [
          `Expected: ${expectedMessages} messages`,
          `Found: ${messageEvents.length} messages`,
        ],
        impact: 'major',
      });
    }

    // Check for error patterns
    const errorEvents = transcript.filter((t) => t.type === 'error' || t.type === 'step_error');
    if (errorEvents.length > 0) {
      insights.push({
        type: 'error_pattern',
        description: `${errorEvents.length} errors detected during execution`,
        evidence: errorEvents.map((e) => e.error || e.message || JSON.stringify(e)),
        impact: 'major',
      });
    }

    // Check for timeout issues
    const waitEvents = transcript.filter((t) => t.type === 'wait_complete');
    const totalWaitTime = waitEvents.reduce((sum, w) => sum + (w.duration || 0), 0);
    if (totalWaitTime > 30000) {
      // More than 30 seconds of waiting
      insights.push({
        type: 'timeout_issue',
        description: `Excessive wait time detected: ${totalWaitTime}ms`,
        evidence: [`Total wait time: ${totalWaitTime}ms`, `Wait events: ${waitEvents.length}`],
        impact: 'minor',
      });
    }

    // Check for configuration errors
    const configErrors = transcript.filter(
      (t) =>
        t.type === 'error' &&
        ((t.error && t.error.includes('environment')) ||
          (t.error && t.error.includes('configuration')) ||
          (t.error && t.error.includes('missing')))
    );
    if (configErrors.length > 0) {
      insights.push({
        type: 'configuration_error',
        description: 'Configuration-related errors detected in transcript',
        evidence: configErrors.map((e) => e.error || e.message),
        impact: 'critical',
      });
    }

    return insights;
  }

  private generateImprovementRecommendations(
    category: string,
    rootCause: string,
    insights: TranscriptInsight[],
    scenario: any
  ): ImprovementRecommendation[] {
    const recommendations: ImprovementRecommendation[] = [];

    // Category-specific recommendations
    switch (category) {
      case 'technical':
        if (rootCause.includes('WebAssembly')) {
          recommendations.push({
            category: 'infrastructure',
            priority: 'high',
            action: 'Replace PGLite with PostgreSQL for Node.js testing',
            implementation:
              'Set DATABASE_TYPE=postgresql and provide proper PostgreSQL connection string',
            expectedImpact: 'Eliminates WebAssembly compatibility issues in Node.js environment',
          });
        }
        if (rootCause.includes('database')) {
          recommendations.push({
            category: 'configuration',
            priority: 'high',
            action: 'Implement database connection retry logic with exponential backoff',
            implementation: 'Add connection retry mechanism in database adapter initialization',
            expectedImpact:
              'Improves reliability of database connections during scenario execution',
          });
        }
        break;

      case 'api':
        recommendations.push({
          category: 'configuration',
          priority: 'high',
          action: 'Validate API credentials before scenario execution',
          implementation: 'Add pre-flight API authentication check in scenario runner',
          expectedImpact: 'Prevents API authentication failures during scenario execution',
        });
        if (rootCause.includes('rate limit')) {
          recommendations.push({
            category: 'infrastructure',
            priority: 'medium',
            action: 'Implement API rate limit handling with retry delays',
            implementation: 'Add exponential backoff for rate-limited API calls',
            expectedImpact: 'Allows scenarios to recover from temporary rate limit issues',
          });
        }
        break;

      case 'configuration':
        recommendations.push({
          category: 'environment',
          priority: 'high',
          action: 'Add comprehensive environment variable validation',
          implementation: 'Create pre-scenario environment validation with clear error messages',
          expectedImpact:
            'Prevents configuration-related failures before scenario execution starts',
        });
        break;

      case 'timeout':
        recommendations.push({
          category: 'scenario_design',
          priority: 'medium',
          action: 'Increase scenario timeout limits for complex operations',
          implementation: 'Adjust scenario execution timeouts based on complexity rating',
          expectedImpact: 'Allows complex scenarios sufficient time to complete',
        });
        break;

      case 'verification':
        recommendations.push({
          category: 'verification_rules',
          priority: 'medium',
          action: 'Review and adjust verification rule success criteria',
          implementation: 'Analyze failed verification rules and adjust thresholds or criteria',
          expectedImpact: 'Improves verification rule accuracy and reduces false failures',
        });
        break;
    }

    // Insight-specific recommendations
    for (const insight of insights) {
      switch (insight.type) {
        case 'missing_interaction':
          recommendations.push({
            category: 'scenario_design',
            priority: 'high',
            action: 'Add fallback mechanism for failed agent initialization',
            implementation:
              'Implement agent health check and retry logic before scenario execution',
            expectedImpact: 'Ensures agent is properly initialized before scenario starts',
          });
          break;

        case 'incomplete_response':
          recommendations.push({
            category: 'scenario_design',
            priority: 'medium',
            action: 'Add intermediate verification checkpoints',
            implementation: 'Insert validation steps between major scenario phases',
            expectedImpact: 'Allows early detection of incomplete responses and recovery',
          });
          break;

        case 'error_pattern':
          if (insight.impact === 'critical') {
            recommendations.push({
              category: 'infrastructure',
              priority: 'high',
              action: 'Implement robust error recovery mechanisms',
              implementation:
                'Add try-catch blocks with specific error handling for common failure patterns',
              expectedImpact: 'Allows scenarios to continue execution despite recoverable errors',
            });
          }
          break;
      }
    }

    // Scenario-specific recommendations
    if (scenario.tags?.includes('github')) {
      recommendations.push({
        category: 'configuration',
        priority: 'medium',
        action: 'Add GitHub API connectivity test',
        implementation: 'Test GitHub API connectivity before executing GitHub-related scenarios',
        expectedImpact: 'Prevents GitHub scenario failures due to network or API issues',
      });
    }

    if (scenario.tags?.includes('production')) {
      recommendations.push({
        category: 'infrastructure',
        priority: 'medium',
        action: 'Implement production-grade monitoring and alerting',
        implementation:
          'Add comprehensive metrics collection and failure alerting for production scenarios',
        expectedImpact:
          'Enables proactive identification and resolution of production scenario issues',
      });
    }

    return recommendations;
  }

  private assessRetryLikelihood(
    category: string,
    rootCause: string,
    insights: TranscriptInsight[]
  ): 'high' | 'medium' | 'low' {
    // Configuration and API issues are often transient
    if (category === 'configuration' || category === 'api') {
      return 'high';
    }

    // Timeout issues might resolve on retry
    if (category === 'timeout') {
      return 'medium';
    }

    // Technical issues require fixes first
    if (category === 'technical') {
      if (rootCause.includes('WebAssembly') || rootCause.includes('database')) {
        return 'low'; // Needs infrastructure changes
      }
      return 'medium';
    }

    // Verification failures might pass with different LLM responses
    if (category === 'verification') {
      const criticalInsights = insights.filter((i) => i.impact === 'critical');
      if (criticalInsights.length === 0) {
        return 'high'; // Might just be LLM variability
      }
      return 'medium';
    }

    return 'low';
  }

  private estimateFixComplexity(
    category: string,
    recommendations: ImprovementRecommendation[]
  ): 'simple' | 'moderate' | 'complex' {
    const highPriorityRecs = recommendations.filter((r) => r.priority === 'high');
    const infrastructureRecs = recommendations.filter((r) => r.category === 'infrastructure');

    if (infrastructureRecs.length > 0 || highPriorityRecs.length > 2) {
      return 'complex';
    }

    if (category === 'configuration' || category === 'environment') {
      return 'simple';
    }

    if (highPriorityRecs.length > 0) {
      return 'moderate';
    }

    return 'simple';
  }

  private logAnalysisResults(analysis: ScenarioFailureAnalysis): void {
    logger.info(`\n🔍 FAILURE ANALYSIS: ${analysis.scenarioName}`);
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.info(`📊 Category: ${analysis.failureCategory.toUpperCase()}`);
    logger.info(`🎯 Root Cause: ${analysis.rootCause}`);
    logger.info(`🔄 Retry Likelihood: ${analysis.retryLikelihood.toUpperCase()}`);
    logger.info(`🛠️  Fix Complexity: ${analysis.estimatedFixComplexity.toUpperCase()}`);

    if (analysis.failedVerificationRules.length > 0) {
      logger.info(`❌ Failed Rules: ${analysis.failedVerificationRules.join(', ')}`);
    }

    if (analysis.transcriptInsights.length > 0) {
      logger.info('\n🔍 Key Insights:');
      analysis.transcriptInsights.forEach((insight, i) => {
        logger.info(`   ${i + 1}. ${insight.description} (${insight.impact})`);
      });
    }

    if (analysis.improvementRecommendations.length > 0) {
      logger.info('\n💡 Top Recommendations:');
      analysis.improvementRecommendations
        .filter((r) => r.priority === 'high')
        .slice(0, 3)
        .forEach((rec, i) => {
          logger.info(`   ${i + 1}. ${rec.action}`);
          logger.info(`      → ${rec.expectedImpact}`);
        });
    }

    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  }

  /**
   * Generate a comprehensive failure report for multiple scenarios
   */
  generateFailureReport(analyses: ScenarioFailureAnalysis[]): string {
    const report = [
      '# Scenario Failure Analysis Report',
      `Generated: ${new Date().toISOString()}`,
      '',
    ];

    // Summary statistics
    const categoryStats = analyses.reduce(
      (acc, a) => {
        acc[a.failureCategory] = (acc[a.failureCategory] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    report.push('## Summary');
    report.push(`Total failed scenarios: ${analyses.length}`);
    report.push('');
    report.push('### Failure Categories');
    Object.entries(categoryStats).forEach(([category, count]) => {
      report.push(`- **${category}**: ${count} scenarios`);
    });
    report.push('');

    // High-priority recommendations
    const allRecommendations = analyses.flatMap((a) => a.improvementRecommendations);
    const highPriorityRecs = allRecommendations.filter((r) => r.priority === 'high');

    report.push('## Priority Actions');
    const uniqueActions = [...new Set(highPriorityRecs.map((r) => r.action))];
    uniqueActions.forEach((action) => {
      const rec = highPriorityRecs.find((r) => r.action === action)!;
      report.push(`### ${action}`);
      report.push(`**Implementation**: ${rec.implementation}`);
      report.push(`**Expected Impact**: ${rec.expectedImpact}`);
      report.push('');
    });

    // Individual scenario details
    report.push('## Detailed Analysis');
    analyses.forEach((analysis) => {
      report.push(`### ${analysis.scenarioName}`);
      report.push(`- **Category**: ${analysis.failureCategory}`);
      report.push(`- **Root Cause**: ${analysis.rootCause}`);
      report.push(`- **Retry Likelihood**: ${analysis.retryLikelihood}`);
      report.push(`- **Fix Complexity**: ${analysis.estimatedFixComplexity}`);

      if (analysis.transcriptInsights.length > 0) {
        report.push('- **Key Insights**:');
        analysis.transcriptInsights.forEach((insight) => {
          report.push(`  - ${insight.description} (${insight.impact})`);
        });
      }
      report.push('');
    });

    return report.join('\n');
  }
}
