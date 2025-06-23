import { elizaLogger, type IAgentRuntime } from '@elizaos/core';
import { PlanningScenarioGenerator, type PlanningScenario, type PlanningTrainingExample } from './PlanningScenarioGenerator';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';
import path from 'path';

/**
 * PlanningBenchmarks - Evaluation suite for planning model performance
 * 
 * This module creates comprehensive benchmarks for evaluating planning model
 * performance across different domains and complexity levels. Integrates with
 * plugin-planning for realistic planning scenario evaluation.
 */

export interface BenchmarkScenario {
  id: string;
  name: string;
  description: string;
  domain: string;
  complexity: 'simple' | 'medium' | 'complex' | 'expert';
  scenario: PlanningScenario;
  expectedOutcomes: {
    min_steps: number;
    max_steps: number;
    required_considerations: string[];
    success_criteria: string[];
    risk_factors: string[];
  };
  evaluationCriteria: {
    completeness: number;      // 0-1
    feasibility: number;       // 0-1
    risk_awareness: number;    // 0-1
    resource_efficiency: number; // 0-1
    timeline_realism: number;  // 0-1
  };
  metadata: {
    difficulty_score: number;
    estimated_time: number;
    real_world_basis: boolean;
    plugin_planning_integration: boolean;
  };
}

export interface BenchmarkResult {
  scenario_id: string;
  model_response: any;
  scores: {
    completeness: number;
    feasibility: number;
    risk_awareness: number;
    resource_efficiency: number;
    timeline_realism: number;
    overall: number;
  };
  analysis: {
    steps_generated: number;
    considerations_covered: number;
    risks_identified: number;
    timeline_consistency: boolean;
    resource_allocation: boolean;
  };
  feedback: string[];
  timestamp: number;
}

export class PlanningBenchmarks {
  private scenarioGenerator: PlanningScenarioGenerator;
  private runtime?: IAgentRuntime;
  private benchmarkScenarios: Map<string, BenchmarkScenario> = new Map();

  constructor(runtime?: IAgentRuntime) {
    this.runtime = runtime;
    this.scenarioGenerator = new PlanningScenarioGenerator(runtime);
  }

  /**
   * Initialize standard benchmark scenarios
   */
  async initializeBenchmarks(): Promise<void> {
    elizaLogger.info('🧪 Initializing planning benchmark scenarios...');

    // Create diverse benchmark scenarios across domains and complexity levels
    const benchmarkSpecs = [
      // Software Development Benchmarks
      {
        domain: 'software_development',
        complexity: 'simple' as const,
        name: 'Feature Implementation',
        description: 'Implement a new user authentication feature',
        minSteps: 3,
        maxSteps: 6,
      },
      {
        domain: 'software_development', 
        complexity: 'complex' as const,
        name: 'System Migration',
        description: 'Migrate legacy monolith to microservices architecture',
        minSteps: 8,
        maxSteps: 15,
      },
      {
        domain: 'software_development',
        complexity: 'expert' as const,
        name: 'Enterprise Platform Overhaul',
        description: 'Complete replatforming of enterprise system with zero downtime',
        minSteps: 12,
        maxSteps: 25,
      },

      // Business Strategy Benchmarks
      {
        domain: 'business_strategy',
        complexity: 'medium' as const,
        name: 'Market Entry Strategy',
        description: 'Enter new geographic market with existing product line',
        minSteps: 5,
        maxSteps: 10,
      },
      {
        domain: 'business_strategy',
        complexity: 'complex' as const,
        name: 'Digital Transformation',
        description: 'Transform traditional business to digital-first operation',
        minSteps: 10,
        maxSteps: 18,
      },

      // AI Research Benchmarks
      {
        domain: 'ai_research',
        complexity: 'medium' as const,
        name: 'Model Development Pipeline',
        description: 'Develop and deploy new ML model for production use',
        minSteps: 6,
        maxSteps: 12,
      },
      {
        domain: 'ai_research',
        complexity: 'expert' as const,
        name: 'Novel Architecture Research',
        description: 'Research and validate entirely new neural architecture',
        minSteps: 15,
        maxSteps: 30,
      },

      // Project Management Benchmarks
      {
        domain: 'project_management',
        complexity: 'simple' as const,
        name: 'Team Coordination',
        description: 'Coordinate cross-functional team for quarterly deliverables',
        minSteps: 4,
        maxSteps: 8,
      },
      {
        domain: 'project_management',
        complexity: 'complex' as const,
        name: 'Multi-Site Implementation',
        description: 'Implement new system across multiple international offices',
        minSteps: 12,
        maxSteps: 20,
      },
    ];

    // Generate benchmark scenarios
    for (const spec of benchmarkSpecs) {
      try {
        const scenario = await this.scenarioGenerator.generatePlanningScenario(
          spec.domain,
          spec.complexity
        );

        const benchmark = await this.createBenchmarkScenario(scenario, spec);
        this.benchmarkScenarios.set(benchmark.id, benchmark);

        elizaLogger.debug(`✅ Created benchmark: ${spec.name} (${spec.complexity})`);
      } catch (error) {
        elizaLogger.warn(`Failed to create benchmark ${spec.name}:`, error);
      }
    }

    elizaLogger.info(`🎯 Initialized ${this.benchmarkScenarios.size} benchmark scenarios`);
  }

  /**
   * Create a benchmark scenario from generated planning scenario
   */
  private async createBenchmarkScenario(
    scenario: PlanningScenario,
    spec: any
  ): Promise<BenchmarkScenario> {
    const benchmarkId = uuidv4();

    return {
      id: benchmarkId,
      name: spec.name,
      description: spec.description,
      domain: scenario.domain,
      complexity: scenario.complexity,
      scenario,
      expectedOutcomes: {
        min_steps: spec.minSteps,
        max_steps: spec.maxSteps,
        required_considerations: this.getRequiredConsiderations(scenario.domain),
        success_criteria: scenario.context.success_criteria,
        risk_factors: this.getRiskFactors(scenario.domain, scenario.complexity),
      },
      evaluationCriteria: this.getEvaluationCriteria(scenario.complexity),
      metadata: {
        difficulty_score: scenario.metadata.difficulty_score,
        estimated_time: scenario.metadata.estimated_solution_time,
        real_world_basis: true,
        plugin_planning_integration: this.checkPluginPlanningIntegration(),
      },
    };
  }

  /**
   * Get required considerations for domain
   */
  private getRequiredConsiderations(domain: string): string[] {
    const considerationsMap: Record<string, string[]> = {
      software_development: [
        'security_implications',
        'scalability_requirements',
        'testing_strategy',
        'deployment_pipeline',
        'maintenance_overhead',
      ],
      business_strategy: [
        'market_analysis',
        'competitive_landscape',
        'financial_projections',
        'stakeholder_impact',
        'regulatory_compliance',
      ],
      ai_research: [
        'data_requirements',
        'computational_resources',
        'evaluation_metrics',
        'ethical_considerations',
        'reproducibility',
      ],
      project_management: [
        'resource_allocation',
        'timeline_management',
        'risk_mitigation',
        'stakeholder_communication',
        'quality_assurance',
      ],
    };

    return considerationsMap[domain] || ['thorough_analysis', 'risk_assessment', 'resource_planning'];
  }

  /**
   * Get risk factors by domain and complexity
   */
  private getRiskFactors(domain: string, complexity: string): string[] {
    const baseRisks = ['timeline_delays', 'resource_constraints', 'scope_creep'];
    
    const domainRisks: Record<string, string[]> = {
      software_development: ['technical_debt', 'integration_issues', 'security_vulnerabilities'],
      business_strategy: ['market_volatility', 'competitive_response', 'regulatory_changes'],
      ai_research: ['data_quality_issues', 'model_performance', 'computational_limitations'],
      project_management: ['stakeholder_conflicts', 'dependency_failures', 'communication_breakdowns'],
    };

    const complexityRisks: Record<string, string[]> = {
      simple: []
      medium: ['coordination_challenges'],
      complex: ['coordination_challenges', 'system_integration_risks'],
      expert: ['coordination_challenges', 'system_integration_risks', 'unknown_unknowns', 'cascade_failures'],
    };

    return [
      ...baseRisks,
      ...(domainRisks[domain] || []),
      ...(complexityRisks[complexity] || []),
    ];
  }

  /**
   * Get evaluation criteria based on complexity
   */
  private getEvaluationCriteria(complexity: string): BenchmarkScenario['evaluationCriteria'] {
    const baseCriteria = {
      completeness: 0.8,
      feasibility: 0.8,
      risk_awareness: 0.7,
      resource_efficiency: 0.7,
      timeline_realism: 0.8,
    };

    const complexityAdjustments: Record<string, Partial<BenchmarkScenario['evaluationCriteria']>> = {
      simple: { completeness: 0.9, risk_awareness: 0.6 },
      medium: { risk_awareness: 0.8, resource_efficiency: 0.8 },
      complex: { completeness: 0.85, risk_awareness: 0.9, resource_efficiency: 0.9 },
      expert: { completeness: 0.9, risk_awareness: 0.95, resource_efficiency: 0.95, timeline_realism: 0.9 },
    };

    return { ...baseCriteria, ...(complexityAdjustments[complexity] || {}) };
  }

  /**
   * Check if plugin-planning integration is available
   */
  private checkPluginPlanningIntegration(): boolean {
    if (!this.runtime) return false;
    
    try {
      // Check if planning plugin is loaded
      const planningService = this.runtime.getService('planning');
      return !!planningService;
    } catch {
      return false;
    }
  }

  /**
   * Evaluate a planning model response against benchmark
   */
  async evaluateResponse(
    benchmarkId: string,
    modelResponse: any
  ): Promise<BenchmarkResult> {
    const benchmark = this.benchmarkScenarios.get(benchmarkId);
    if (!benchmark) {
      throw new Error(`Benchmark scenario ${benchmarkId} not found`);
    }

    elizaLogger.info(`🔬 Evaluating response for benchmark: ${benchmark.name}`);

    // Extract plan from model response
    const plan = this.extractPlanFromResponse(modelResponse);
    
    // Evaluate each criterion
    const scores = {
      completeness: this.evaluateCompleteness(plan, benchmark),
      feasibility: this.evaluateFeasibility(plan, benchmark),
      risk_awareness: this.evaluateRiskAwareness(plan, benchmark),
      resource_efficiency: this.evaluateResourceEfficiency(plan, benchmark),
      timeline_realism: this.evaluateTimelineRealism(plan, benchmark),
      overall: 0, // Calculated below
    };

    // Calculate overall score (weighted average)
    scores.overall = (
      scores.completeness * 0.25 +
      scores.feasibility * 0.25 +
      scores.risk_awareness * 0.2 +
      scores.resource_efficiency * 0.15 +
      scores.timeline_realism * 0.15
    );

    // Detailed analysis
    const analysis = {
      steps_generated: plan.steps?.length || 0,
      considerations_covered: this.countCoveredConsiderations(plan, benchmark),
      risks_identified: this.countIdentifiedRisks(plan, benchmark),
      timeline_consistency: this.checkTimelineConsistency(plan),
      resource_allocation: this.checkResourceAllocation(plan),
    };

    // Generate feedback
    const feedback = this.generateFeedback(scores, analysis, benchmark);

    const result: BenchmarkResult = {
      scenario_id: benchmarkId,
      model_response: modelResponse,
      scores,
      analysis,
      feedback,
      timestamp: Date.now(),
    };

    elizaLogger.info(`📊 Evaluation complete. Overall score: ${Math.round(scores.overall * 100)}%`);
    return result;
  }

  /**
   * Extract plan from model response
   */
  private extractPlanFromResponse(response: any): any {
    // Handle different response formats
    if (response.plan) return response.plan;
    if (response.output?.plan) return response.output.plan;
    if (response.steps) return { steps: response.steps };
    
    // Try to parse from text if needed
    if (typeof response === 'string') {
      // Simple extraction - in real implementation, this would be more sophisticated
      return { 
        steps: []
        overview: response,
        success_criteria: []
        risk_assessment: '',
        contingencies: []
      };
    }

    return response;
  }

  /**
   * Evaluate completeness of the plan
   */
  private evaluateCompleteness(plan: any, benchmark: BenchmarkScenario): number {
    let score = 0.0;
    const checks = [];

    // Check if plan has required components
    if (plan.overview) { score += 0.2; checks.push('Has overview'); }
    if (plan.steps && plan.steps.length > 0) { score += 0.3; checks.push('Has steps'); }
    if (plan.success_criteria && plan.success_criteria.length > 0) { score += 0.2; checks.push('Has success criteria'); }
    if (plan.risk_assessment) { score += 0.15; checks.push('Has risk assessment'); }
    if (plan.contingencies && plan.contingencies.length > 0) { score += 0.15; checks.push('Has contingencies'); }

    // Check step count is reasonable
    const stepCount = plan.steps?.length || 0;
    if (stepCount >= benchmark.expectedOutcomes.min_steps && stepCount <= benchmark.expectedOutcomes.max_steps) {
      score += 0.1;
      checks.push('Appropriate step count');
    }

    elizaLogger.debug(`Completeness checks passed: ${checks.join(', ')}`);
    return Math.min(score, 1.0);
  }

  /**
   * Evaluate feasibility of the plan
   */
  private evaluateFeasibility(plan: any, benchmark: BenchmarkScenario): number {
    let score = 0.7; // Base feasibility score

    // Check for unrealistic timelines
    if (plan.steps) {
      const hasRealisticTimelines = plan.steps.every((step: any) => 
        step.timeline && !step.timeline.includes('1 day') // Overly optimistic
      );
      if (hasRealisticTimelines) score += 0.1;
    }

    // Check for resource consideration
    if (plan.steps && plan.steps.some((step: any) => step.resources_needed || step.resource_requirements)) {
      score += 0.1;
    }

    // Check for dependency management
    if (plan.steps && plan.steps.some((step: any) => step.dependencies)) {
      score += 0.1;
    }

    return Math.min(score, 1.0);
  }

  /**
   * Evaluate risk awareness
   */
  private evaluateRiskAwareness(plan: any, benchmark: BenchmarkScenario): number {
    let score = 0.0;

    // Check if risks are identified
    if (plan.risk_assessment && plan.risk_assessment.length > 10) {
      score += 0.4;
    }

    // Check for contingency plans
    if (plan.contingencies && plan.contingencies.length > 0) {
      score += 0.3;
    }

    // Check if steps include risk mitigation
    if (plan.steps && plan.steps.some((step: any) => step.risks || step.mitigation_strategies)) {
      score += 0.3;
    }

    return Math.min(score, 1.0);
  }

  /**
   * Evaluate resource efficiency
   */
  private evaluateResourceEfficiency(plan: any, benchmark: BenchmarkScenario): number {
    let score = 0.5; // Base score

    // Check if resources are explicitly considered
    if (plan.steps && plan.steps.some((step: any) => step.resources_needed)) {
      score += 0.25;
    }

    // Check for parallel execution where possible
    if (plan.steps && plan.steps.some((step: any) => 
      !step.dependencies || step.dependencies.length === 0
    )) {
      score += 0.25;
    }

    return Math.min(score, 1.0);
  }

  /**
   * Evaluate timeline realism
   */
  private evaluateTimelineRealism(plan: any, benchmark: BenchmarkScenario): number {
    let score = 0.6; // Base score

    // Check if timelines are provided
    if (plan.steps && plan.steps.every((step: any) => step.timeline)) {
      score += 0.2;
    }

    // Check for overall timeline
    if (plan.timeline) {
      score += 0.2;
    }

    return Math.min(score, 1.0);
  }

  /**
   * Count covered considerations
   */
  private countCoveredConsiderations(plan: any, benchmark: BenchmarkScenario): number {
    const planText = JSON.stringify(plan).toLowerCase();
    return benchmark.expectedOutcomes.required_considerations.filter(consideration =>
      planText.includes(consideration.replace(/_/g, ' '))
    ).length;
  }

  /**
   * Count identified risks
   */
  private countIdentifiedRisks(plan: any, benchmark: BenchmarkScenario): number {
    const planText = JSON.stringify(plan).toLowerCase();
    return benchmark.expectedOutcomes.risk_factors.filter(risk =>
      planText.includes(risk.replace(/_/g, ' '))
    ).length;
  }

  /**
   * Check timeline consistency
   */
  private checkTimelineConsistency(plan: any): boolean {
    if (!plan.steps || plan.steps.length === 0) return false;
    
    // Simple check - all steps should have timelines
    return plan.steps.every((step: any) => step.timeline);
  }

  /**
   * Check resource allocation
   */
  private checkResourceAllocation(plan: any): boolean {
    if (!plan.steps || plan.steps.length === 0) return false;
    
    // Check if at least half the steps consider resources
    const stepsWithResources = plan.steps.filter((step: any) => 
      step.resources_needed || step.resource_requirements
    ).length;
    
    return stepsWithResources >= plan.steps.length / 2;
  }

  /**
   * Generate detailed feedback
   */
  private generateFeedback(
    scores: BenchmarkResult['scores'],
    analysis: BenchmarkResult['analysis'],
    benchmark: BenchmarkScenario
  ): string[] {
    const feedback: string[] = [];

    // Overall performance feedback
    if (scores.overall >= 0.9) {
      feedback.push('🎉 Excellent planning performance! The plan is comprehensive and well-structured.');
    } else if (scores.overall >= 0.7) {
      feedback.push('✅ Good planning performance with room for improvement in some areas.');
    } else if (scores.overall >= 0.5) {
      feedback.push('⚠️ Adequate planning but several important areas need attention.');
    } else {
      feedback.push('❌ Planning performance needs significant improvement.');
    }

    // Specific feedback
    if (scores.completeness < 0.7) {
      feedback.push('The plan is missing key components. Ensure all sections are included.');
    }

    if (scores.risk_awareness < 0.7) {
      feedback.push('Risk awareness is insufficient. Consider more potential risks and mitigation strategies.');
    }

    if (scores.feasibility < 0.7) {
      feedback.push('Some aspects of the plan may not be feasible. Review timelines and resource requirements.');
    }

    if (analysis.steps_generated < benchmark.expectedOutcomes.min_steps) {
      feedback.push(`Plan has too few steps (${analysis.steps_generated}). Consider breaking down into more detailed steps.`);
    }

    if (analysis.considerations_covered < benchmark.expectedOutcomes.required_considerations.length / 2) {
      feedback.push('Important considerations are missing from the plan. Review domain-specific requirements.');
    }

    return feedback;
  }

  /**
   * Run complete benchmark suite
   */
  async runBenchmarkSuite(): Promise<{
    results: BenchmarkResult[];
    summary: {
      total_scenarios: number;
      avg_overall_score: number;
      domain_performance: Record<string, number>;
      complexity_performance: Record<string, number>;
    };
  }> {
    elizaLogger.info('🧪 Running complete planning benchmark suite...');

    if (this.benchmarkScenarios.size === 0) {
      await this.initializeBenchmarks();
    }

    const results: BenchmarkResult[] = [];
    const domainScores: Record<string, number[]> = {};
    const complexityScores: Record<string, number[]> = {};

    // This would integrate with actual model inference in real implementation
    for (const [id, benchmark] of this.benchmarkScenarios) {
      // Generate mock response for demonstration
      const mockResponse = await this.generateMockResponse(benchmark);
      
      const result = await this.evaluateResponse(id, mockResponse);
      results.push(result);

      // Track domain performance
      if (!domainScores[benchmark.domain]) domainScores[benchmark.domain] = [];
      domainScores[benchmark.domain].push(result.scores.overall);

      // Track complexity performance
      if (!complexityScores[benchmark.complexity]) complexityScores[benchmark.complexity] = [];
      complexityScores[benchmark.complexity].push(result.scores.overall);
    }

    // Calculate summary statistics
    const avgOverallScore = results.reduce((sum, r) => sum + r.scores.overall, 0) / results.length;
    
    const domainPerformance: Record<string, number> = {};
    for (const [domain, scores] of Object.entries(domainScores)) {
      domainPerformance[domain] = scores.reduce((a, b) => a + b, 0) / scores.length;
    }

    const complexityPerformance: Record<string, number> = {};
    for (const [complexity, scores] of Object.entries(complexityScores)) {
      complexityPerformance[complexity] = scores.reduce((a, b) => a + b, 0) / scores.length;
    }

    const summary = {
      total_scenarios: results.length,
      avg_overall_score: avgOverallScore,
      domain_performance: domainPerformance,
      complexity_performance: complexityPerformance,
    };

    elizaLogger.info(`🎯 Benchmark suite complete. Average score: ${Math.round(avgOverallScore * 100)}%`);
    return { results, summary };
  }

  /**
   * Generate mock response for demonstration (would be replaced with actual model inference)
   */
  private async generateMockResponse(benchmark: BenchmarkScenario): Promise<any> {
    // This is a simplified mock response for demonstration
    // In real implementation, this would call the actual planning model
    return {
      thinking: `I need to analyze this ${benchmark.complexity} ${benchmark.domain} scenario carefully...`,
      plan: {
        overview: `Strategic plan for ${benchmark.description}`,
        steps: Array.from({ length: benchmark.expectedOutcomes.min_steps + 1 }, (_, i) => ({
          action: `Step ${i + 1}: Implementation phase`,
          reasoning: `This step addresses key requirements`,
          expected_outcome: `Phase ${i + 1} completion`,
          dependencies: i > 0 ? [`Step ${i}`] : []
          timeline: '2-3 weeks',
          resources_needed: ['team', 'budget'],
        })),
        success_criteria: benchmark.expectedOutcomes.success_criteria,
        risk_assessment: 'Standard project risks apply',
        contingencies: ['Fallback plan available'],
      },
      confidence: 0.8,
    };
  }

  /**
   * Export benchmark scenarios and results
   */
  async exportBenchmarks(outputDir: string = './planning_benchmarks'): Promise<void> {
    await fs.mkdir(outputDir, { recursive: true });

    // Export benchmark scenarios
    const scenariosPath = path.join(outputDir, 'benchmark_scenarios.json');
    const scenarios = Array.from(this.benchmarkScenarios.values());
    await fs.writeFile(scenariosPath, JSON.stringify(scenarios, null, 2));

    elizaLogger.info(`📁 Exported ${scenarios.length} benchmark scenarios to ${outputDir}`);
  }

  /**
   * Get all benchmark scenarios
   */
  getBenchmarkScenarios(): BenchmarkScenario[] {
    return Array.from(this.benchmarkScenarios.values());
  }
}