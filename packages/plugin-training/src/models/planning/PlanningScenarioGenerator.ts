import { elizaLogger, type IAgentRuntime, type Memory, type State } from '@elizaos/core';
import { TrainingDatabaseManager } from '../../database/TrainingDatabaseManager';
import { v4 as uuidv4 } from 'uuid';

/**
 * PlanningScenarioGenerator - Generates REALM-style planning scenarios for training
 *
 * This generator creates complex planning scenarios that require multi-step reasoning,
 * goal decomposition, and strategic thinking. Uses the largest available model (Qwen R1 distill)
 * for maximum reasoning capability.
 */

export interface PlanningScenario {
  id: string;
  title: string;
  description: string;
  complexity: 'simple' | 'medium' | 'complex' | 'expert';
  domain: string;
  objective: string;
  constraints: string[];
  context: {
    background: string;
    resources: string[];
    timeframe: string;
    stakeholders: string[];
    success_criteria: string[];
  };
  expectedPlan: {
    reasoning: string;
    steps: Array<{
      id: number;
      title: string;
      description: string;
      dependencies: number[];
      estimated_time: string;
      resources_needed: string[];
      success_metrics: string[];
      risks: string[];
      mitigation_strategies: string[];
    }>;
    timeline: string;
    contingency_plans: Array<{
      scenario: string;
      response: string;
      alternative_steps: number[];
    }>;
  };
  metadata: {
    created_at: number;
    scenario_type: string;
    difficulty_score: number;
    estimated_solution_time: number;
    tags: string[];
  };
}

export interface PlanningTrainingExample {
  input: {
    scenario: string;
    objective: string;
    constraints: string[];
    context: Record<string, any>;
    available_actions: string[];
    current_state: Record<string, any>;
  };
  output: {
    thinking: string;
    plan: {
      overview: string;
      steps: Array<{
        action: string;
        reasoning: string;
        expected_outcome: string;
        dependencies: string[];
        timeline: string;
      }>;
      success_criteria: string[];
      risk_assessment: string;
      contingencies: string[];
    };
    confidence: number;
  };
  metadata: {
    scenario_id: string;
    complexity: string;
    domain: string;
    solution_quality: number;
  };
}

export class PlanningScenarioGenerator {
  private dbManager: TrainingDatabaseManager;
  private runtime?: IAgentRuntime;
  private scenarioTemplates: Map<string, any> = new Map();

  constructor(runtime?: IAgentRuntime) {
    this.runtime = runtime;
    this.dbManager = new TrainingDatabaseManager(runtime);
    this.initializeScenarioTemplates();
  }

  /**
   * Initialize scenario templates for different domains
   */
  private initializeScenarioTemplates(): void {
    this.scenarioTemplates.set('software_development', {
      base_scenarios: [
        'Design and implement a new feature for an existing application',
        'Debug and fix a complex production issue',
        'Migrate a legacy system to modern architecture',
        'Optimize application performance under scale',
        'Implement security improvements across the system',
      ],
      constraints: [
        'Limited development time',
        'Backward compatibility required',
        'Zero downtime deployment',
        'Limited budget for infrastructure',
        'Team skill limitations',
        'Regulatory compliance requirements',
      ],
      resources: [
        'Development team (3-5 engineers)',
        'QA team (2 testers)',
        'DevOps engineer',
        'Product manager',
        'Existing codebase and documentation',
        'CI/CD pipeline',
        'Cloud infrastructure credits',
      ],
    });

    this.scenarioTemplates.set('business_strategy', {
      base_scenarios: [
        'Launch a new product in a competitive market',
        'Expand business operations to new geographic regions',
        'Pivot business model due to market changes',
        'Respond to new competitor entering the market',
        'Optimize operational efficiency while maintaining quality',
      ],
      constraints: [
        'Limited marketing budget',
        'Regulatory restrictions in target markets',
        'Current team capacity limitations',
        'Existing customer commitments',
        'Supply chain constraints',
        'Technology infrastructure limitations',
      ],
      resources: [
        'Marketing team',
        'Sales team',
        'Product development team',
        'Customer service team',
        'Market research data',
        'Customer feedback and analytics',
        'Partnership opportunities',
      ],
    });

    this.scenarioTemplates.set('ai_research', {
      base_scenarios: [
        'Develop a new machine learning model for specific domain',
        'Improve existing model performance while reducing costs',
        'Deploy AI system to production at scale',
        'Research and implement new AI technique from papers',
        'Create evaluation framework for AI system performance',
      ],
      constraints: [
        'Limited computational resources',
        'Data privacy and security requirements',
        'Model interpretability requirements',
        'Real-time inference constraints',
        'Limited labeled training data',
        'Ethical AI guidelines compliance',
      ],
      resources: [
        'Research team (AI/ML engineers)',
        'Data engineering team',
        'Computational resources (GPUs/TPUs)',
        'Datasets and data sources',
        'Literature and research papers',
        'Evaluation metrics and benchmarks',
        'Domain experts for validation',
      ],
    });

    this.scenarioTemplates.set('project_management', {
      base_scenarios: [
        'Coordinate cross-functional team project with tight deadline',
        'Manage project with changing requirements and stakeholder priorities',
        'Recover failing project and get it back on track',
        'Plan and execute complex multi-phase project rollout',
        'Manage project with distributed team across time zones',
      ],
      constraints: [
        'Fixed deadline that cannot be moved',
        'Limited budget and resources',
        'Dependencies on external vendors',
        'Stakeholder availability limitations',
        'Technical complexity and unknowns',
        'Compliance and approval processes',
      ],
      resources: [
        'Project team members',
        'Project management tools',
        'Budget allocation',
        'Stakeholder network',
        'Subject matter experts',
        'Historical project data',
        'Communication channels',
      ],
    });

    elizaLogger.info(`📋 Initialized ${this.scenarioTemplates.size} planning scenario templates`);
  }

  /**
   * Generate a planning scenario for training
   */
  async generatePlanningScenario(
    domain: string = 'random',
    complexity: 'simple' | 'medium' | 'complex' | 'expert' = 'medium'
  ): Promise<PlanningScenario> {
    // Select domain
    const selectedDomain = domain === 'random' ? this.getRandomDomain() : domain;

    const template = this.scenarioTemplates.get(selectedDomain);
    if (!template) {
      throw new Error(`Unknown planning domain: ${selectedDomain}`);
    }

    // Generate scenario
    const scenario = await this.createScenarioFromTemplate(template, selectedDomain, complexity);

    elizaLogger.debug(`🎯 Generated planning scenario: ${scenario.title} (${complexity})`);
    return scenario;
  }

  /**
   * Create scenario from template
   */
  private async createScenarioFromTemplate(
    template: any,
    domain: string,
    complexity: string
  ): Promise<PlanningScenario> {
    const baseScenario = this.selectRandom(template.base_scenarios);
    const constraints = this.selectRandomSubset(
      template.constraints,
      this.getConstraintCount(complexity)
    ) as string[];
    const resources = this.selectRandomSubset(
      template.resources,
      this.getResourceCount(complexity)
    );

    // Generate scenario details
    const scenarioId = uuidv4();
    const title = this.generateScenarioTitle(baseScenario as string, domain);
    const description = this.generateScenarioDescription(
      baseScenario as string,
      constraints as string[],
      complexity as string
    );
    const objective = this.generateObjective(baseScenario as string);

    // Generate context
    const context = await this.generateScenarioContext(domain, complexity, resources as string[]);

    // Generate expected solution
    const expectedPlan = await this.generateExpectedPlan(
      baseScenario as string,
      constraints as string[],
      resources as string[],
      complexity as string
    );

    const scenario: PlanningScenario = {
      id: scenarioId,
      title,
      description,
      complexity: complexity as any,
      domain,
      objective,
      constraints,
      context,
      expectedPlan,
      metadata: {
        created_at: Date.now(),
        scenario_type: 'planning',
        difficulty_score: this.calculateDifficultyScore(
          complexity,
          constraints.length,
          expectedPlan.steps.length
        ),
        estimated_solution_time: this.estimateSolutionTime(complexity, expectedPlan.steps.length),
        tags: [domain, complexity, 'planning', 'multi_step'],
      },
    };

    return scenario;
  }

  /**
   * Generate training examples from scenario
   */
  async generateTrainingExamples(scenario: PlanningScenario): Promise<PlanningTrainingExample[]> {
    const examples: PlanningTrainingExample[] = [];

    // Main scenario example
    const mainExample = await this.createMainTrainingExample(scenario);
    examples.push(mainExample);

    // Generate variations with different contexts
    for (let i = 0; i < 3; i++) {
      const variation = await this.createScenarioVariation(scenario, i);
      examples.push(variation);
    }

    // Generate sub-problem examples
    const subExamples = await this.createSubProblemExamples(scenario);
    examples.push(...subExamples);

    elizaLogger.debug(
      `📚 Generated ${examples.length} training examples from scenario ${scenario.title}`
    );
    return examples;
  }

  /**
   * Create main training example from scenario
   */
  private async createMainTrainingExample(
    scenario: PlanningScenario
  ): Promise<PlanningTrainingExample> {
    const input = {
      scenario: scenario.description,
      objective: scenario.objective,
      constraints: scenario.constraints,
      context: {
        background: scenario.context.background,
        resources: scenario.context.resources,
        timeframe: scenario.context.timeframe,
        stakeholders: scenario.context.stakeholders,
        success_criteria: scenario.context.success_criteria,
      },
      available_actions: this.generateAvailableActions(scenario.domain),
      current_state: this.generateCurrentState(scenario.domain),
    };

    const thinking = this.generateThinkingProcess(scenario);

    const output = {
      thinking,
      plan: {
        overview: scenario.expectedPlan.reasoning,
        steps: scenario.expectedPlan.steps.map((step) => ({
          action: step.title,
          reasoning: step.description,
          expected_outcome: `Complete ${step.title} successfully`,
          dependencies: step.dependencies.map(
            (d) => scenario.expectedPlan.steps[d - 1]?.title || ''
          ),
          timeline: step.estimated_time,
        })),
        success_criteria: scenario.context.success_criteria,
        risk_assessment: this.generateRiskAssessment(scenario),
        contingencies: scenario.expectedPlan.contingency_plans.map((cp) => cp.response),
      },
      confidence: this.calculatePlanConfidence(
        scenario.complexity,
        scenario.expectedPlan.steps.length
      ),
    };

    return {
      input,
      output,
      metadata: {
        scenario_id: scenario.id,
        complexity: scenario.complexity,
        domain: scenario.domain,
        solution_quality: 0.9, // High quality for main example
      },
    };
  }

  /**
   * Create scenario variation
   */
  private async createScenarioVariation(
    scenario: PlanningScenario,
    variation: number
  ): Promise<PlanningTrainingExample> {
    // Modify constraints or context slightly
    const modifiedConstraints = [...scenario.constraints];
    if (variation === 0) {
      modifiedConstraints.push('Additional budget constraints');
    } else if (variation === 1) {
      modifiedConstraints.push('Accelerated timeline required');
    } else {
      modifiedConstraints.push('New regulatory requirements');
    }

    const input = {
      scenario: scenario.description,
      objective: scenario.objective,
      constraints: modifiedConstraints,
      context: scenario.context,
      available_actions: this.generateAvailableActions(scenario.domain),
      current_state: this.generateCurrentState(scenario.domain),
    };

    // Adapt plan to new constraints
    const adaptedPlan = this.adaptPlanToConstraints(scenario.expectedPlan, modifiedConstraints);
    const thinking = this.generateAdaptedThinking(scenario, modifiedConstraints);

    const output = {
      thinking,
      plan: adaptedPlan,
      confidence: Math.max(
        0.6,
        this.calculatePlanConfidence(scenario.complexity, adaptedPlan.steps.length) - 0.1
      ),
    };

    return {
      input,
      output,
      metadata: {
        scenario_id: `${scenario.id}_var_${variation}`,
        complexity: scenario.complexity,
        domain: scenario.domain,
        solution_quality: 0.8, // Slightly lower for variations
      },
    };
  }

  /**
   * Create sub-problem examples
   */
  private async createSubProblemExamples(
    scenario: PlanningScenario
  ): Promise<PlanningTrainingExample[]> {
    const examples: PlanningTrainingExample[] = [];

    // Take first 2-3 steps and create focused examples
    const mainSteps = scenario.expectedPlan.steps.slice(0, 3);

    for (const step of mainSteps) {
      const subExample: PlanningTrainingExample = {
        input: {
          scenario: `Focus on: ${step.title}`,
          objective: step.description,
          constraints: step.risks,
          context: {
            step_context: `Part of larger plan: ${scenario.objective}`,
            resources_available: step.resources_needed,
            dependencies: step.dependencies.map(
              (d) => scenario.expectedPlan.steps[d - 1]?.title || ''
            ),
          },
          available_actions: step.resources_needed,
          current_state: { step_number: step.id, total_steps: scenario.expectedPlan.steps.length },
        },
        output: {
          thinking: `I need to focus on ${step.title}. ${step.description}`,
          plan: {
            overview: step.description,
            steps: [
              {
                action: step.title,
                reasoning: step.description,
                expected_outcome: `${step.title} completed successfully`,
                dependencies: step.dependencies.map(
                  (d) => scenario.expectedPlan.steps[d - 1]?.title || ''
                ),
                timeline: step.estimated_time,
              },
            ],
            success_criteria: step.success_metrics,
            risk_assessment: step.risks.join(', '),
            contingencies: step.mitigation_strategies,
          },
          confidence: 0.85,
        },
        metadata: {
          scenario_id: `${scenario.id}_step_${step.id}`,
          complexity: 'simple',
          domain: scenario.domain,
          solution_quality: 0.85,
        },
      };

      examples.push(subExample);
    }

    return examples;
  }

  // Helper methods
  private getRandomDomain(): string {
    const domains = Array.from(this.scenarioTemplates.keys());
    return domains[Math.floor(Math.random() * domains.length)];
  }

  private selectRandom<T>(items: T[]): T {
    return items[Math.floor(Math.random() * items.length)];
  }

  private selectRandomSubset<T>(items: T[], count: number): T[] {
    const shuffled = [...items].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, Math.min(count, items.length));
  }

  private getConstraintCount(complexity: string): number {
    switch (complexity) {
      case 'simple':
        return 2;
      case 'medium':
        return 3;
      case 'complex':
        return 4;
      case 'expert':
        return 5;
      default:
        return 3;
    }
  }

  private getResourceCount(complexity: string): number {
    switch (complexity) {
      case 'simple':
        return 3;
      case 'medium':
        return 4;
      case 'complex':
        return 5;
      case 'expert':
        return 6;
      default:
        return 4;
    }
  }

  private generateScenarioTitle(baseScenario: string, domain: string): string {
    return `${domain.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}: ${baseScenario}`;
  }

  private generateScenarioDescription(
    baseScenario: string,
    constraints: string[],
    complexity: string
  ): string {
    const complexityPrefix = {
      simple: 'You have been asked to',
      medium: 'Your team needs to',
      complex: 'The organization faces a challenge where you must',
      expert: 'In a critical situation, you are responsible for',
    };

    return `${complexityPrefix[complexity as keyof typeof complexityPrefix]} ${baseScenario.toLowerCase()}. You must work within the following constraints: ${constraints.join(', ')}.`;
  }

  private generateObjective(baseScenario: string): string {
    return `Successfully ${baseScenario.toLowerCase()} while meeting all requirements and constraints.`;
  }

  private async generateScenarioContext(
    domain: string,
    complexity: string,
    resources: string[]
  ): Promise<any> {
    return {
      background: `This is a ${complexity} ${domain.replace('_', ' ')} scenario requiring strategic planning and execution.`,
      resources,
      timeframe: this.generateTimeframe(complexity),
      stakeholders: this.generateStakeholders(domain),
      success_criteria: this.generateSuccessCriteria(domain, complexity),
    };
  }

  private generateTimeframe(complexity: string): string {
    const timeframes = {
      simple: '2-4 weeks',
      medium: '1-3 months',
      complex: '3-6 months',
      expert: '6-12 months',
    };
    return timeframes[complexity as keyof typeof timeframes];
  }

  private generateStakeholders(domain: string): string[] {
    const stakeholderMap: Record<string, string[]> = {
      software_development: [
        'Product Manager',
        'Engineering Team',
        'QA Team',
        'DevOps',
        'End Users',
      ],
      business_strategy: [
        'Executive Team',
        'Board of Directors',
        'Customers',
        'Partners',
        'Employees',
      ],
      ai_research: [
        'Research Team',
        'Data Scientists',
        'Product Team',
        'Ethics Committee',
        'End Users',
      ],
      project_management: [
        'Project Sponsor',
        'Project Team',
        'Stakeholders',
        'End Users',
        'Vendors',
      ],
    };
    return stakeholderMap[domain] || ['Team Lead', 'Team Members', 'Stakeholders'];
  }

  private generateSuccessCriteria(domain: string, complexity: string): string[] {
    const baseCriteria = [
      'Project completed on time',
      'All requirements met',
      'Quality standards achieved',
      'Budget constraints respected',
    ];

    if (complexity === 'complex' || complexity === 'expert') {
      baseCriteria.push('Stakeholder satisfaction achieved', 'Risk mitigation successful');
    }

    return baseCriteria;
  }

  private async generateExpectedPlan(
    baseScenario: string,
    constraints: string[],
    resources: string[],
    complexity: string
  ): Promise<any> {
    const stepCount = this.getStepCount(complexity);
    const steps = [];

    for (let i = 1; i <= stepCount; i++) {
      steps.push({
        id: i,
        title: `Step ${i}: ${this.generateStepTitle(baseScenario, i, stepCount)}`,
        description: `Detailed implementation of step ${i}`,
        dependencies: i > 1 ? [i - 1] : [],
        estimated_time: this.generateStepTime(complexity),
        resources_needed: this.selectRandomSubset(resources, 2),
        success_metrics: [`Step ${i} completion criteria met`],
        risks: [`Risk associated with step ${i}`],
        mitigation_strategies: [`Mitigation strategy for step ${i}`],
      });
    }

    return {
      reasoning: `This plan addresses ${baseScenario} by breaking it down into ${stepCount} manageable steps.`,
      steps,
      timeline: this.generateTimeframe(complexity),
      contingency_plans: [
        {
          scenario: 'Delayed timeline',
          response: 'Prioritize critical path items and parallel execution',
          alternative_steps: [1, 2],
        },
      ],
    };
  }

  private getStepCount(complexity: string): number {
    switch (complexity) {
      case 'simple':
        return 3;
      case 'medium':
        return 5;
      case 'complex':
        return 7;
      case 'expert':
        return 10;
      default:
        return 5;
    }
  }

  private generateStepTitle(baseScenario: string, stepNumber: number, totalSteps: number): string {
    const phase =
      stepNumber <= totalSteps / 3
        ? 'Planning'
        : stepNumber <= (2 * totalSteps) / 3
          ? 'Implementation'
          : 'Completion';
    return `${phase} Phase - Activity ${stepNumber}`;
  }

  private generateStepTime(complexity: string): string {
    const times = {
      simple: ['1-2 days', '2-3 days', '1 week'],
      medium: ['3-5 days', '1 week', '2 weeks'],
      complex: ['1-2 weeks', '2-3 weeks', '1 month'],
      expert: ['2-4 weeks', '1-2 months', '2-3 months'],
    };
    const timeArray = times[complexity as keyof typeof times] || times.medium;
    return timeArray[Math.floor(Math.random() * timeArray.length)];
  }

  private generateAvailableActions(domain: string): string[] {
    const actionMap: Record<string, string[]> = {
      software_development: [
        'ANALYZE_REQUIREMENTS',
        'DESIGN_ARCHITECTURE',
        'IMPLEMENT_CODE',
        'WRITE_TESTS',
        'DEPLOY_SYSTEM',
        'MONITOR_PERFORMANCE',
      ],
      business_strategy: [
        'MARKET_RESEARCH',
        'STAKEHOLDER_ANALYSIS',
        'STRATEGY_FORMULATION',
        'EXECUTION_PLANNING',
        'RISK_ASSESSMENT',
        'PERFORMANCE_MONITORING',
      ],
      ai_research: [
        'LITERATURE_REVIEW',
        'DATA_COLLECTION',
        'MODEL_DEVELOPMENT',
        'EXPERIMENTATION',
        'EVALUATION',
        'PUBLICATION',
      ],
      project_management: [
        'PROJECT_PLANNING',
        'RESOURCE_ALLOCATION',
        'TEAM_COORDINATION',
        'PROGRESS_TRACKING',
        'RISK_MANAGEMENT',
        'STAKEHOLDER_COMMUNICATION',
      ],
    };
    return actionMap[domain] || ['PLAN', 'EXECUTE', 'MONITOR', 'ADJUST', 'COMPLETE'];
  }

  private generateCurrentState(domain: string): Record<string, any> {
    return {
      phase: 'planning',
      progress: 0,
      resources_allocated: false,
      team_ready: true,
      risks_identified: false,
    };
  }

  private generateThinkingProcess(scenario: PlanningScenario): string {
    return `I need to analyze this ${scenario.domain} scenario carefully. The objective is: ${scenario.objective}

Key constraints to consider:
${scenario.constraints.map((c) => `- ${c}`).join('\n')}

Available resources:
${scenario.context.resources.map((r) => `- ${r}`).join('\n')}

Let me break this down into a strategic plan with clear steps, dependencies, and risk mitigation strategies.`;
  }

  private generateRiskAssessment(scenario: PlanningScenario): string {
    return `Risk analysis for ${scenario.title}: Consider constraints (${scenario.constraints.join(', ')}) and potential failure points in each step.`;
  }

  private calculatePlanConfidence(complexity: string, stepCount: number): number {
    const baseConfidence = {
      simple: 0.9,
      medium: 0.85,
      complex: 0.8,
      expert: 0.75,
    };

    const base = baseConfidence[complexity as keyof typeof baseConfidence] || 0.8;
    const stepPenalty = Math.max(0, (stepCount - 5) * 0.02);

    return Math.max(0.6, base - stepPenalty);
  }

  private calculateDifficultyScore(
    complexity: string,
    constraintCount: number,
    stepCount: number
  ): number {
    const complexityScore = { simple: 1, medium: 2, complex: 3, expert: 4 };
    return (
      (complexityScore[complexity as keyof typeof complexityScore] || 2) * 10 +
      constraintCount +
      stepCount
    );
  }

  private estimateSolutionTime(complexity: string, stepCount: number): number {
    const baseTime = { simple: 10, medium: 20, complex: 45, expert: 90 }; // minutes
    return (baseTime[complexity as keyof typeof baseTime] || 20) + stepCount * 2;
  }

  private adaptPlanToConstraints(originalPlan: any, newConstraints: string[]): any {
    // Simplified adaptation logic
    return {
      overview: `${originalPlan.reasoning} Adapted for additional constraints: ${newConstraints.slice(-1)[0]}`,
      steps: originalPlan.steps,
      success_criteria: originalPlan.steps[0]?.success_metrics || [],
      risk_assessment: `Increased risk due to: ${newConstraints.slice(-1)[0]}`,
      contingencies: [`Address constraint: ${newConstraints.slice(-1)[0]}`],
    };
  }

  private generateAdaptedThinking(scenario: PlanningScenario, newConstraints: string[]): string {
    return `${this.generateThinkingProcess(scenario)}

Additional constraint to address: ${newConstraints.slice(-1)[0]}
I need to adapt my approach to accommodate this new limitation.`;
  }

  /**
   * Export planning training data
   */
  async exportPlanningDataset(limit: number = 5000): Promise<any> {
    try {
      const data = await this.dbManager.getTrainingData({ modelType: 'planning', limit });

      const formattedData = data.map((item) => {
        const input = JSON.parse(item.input_data);
        const output = JSON.parse(item.output_data);

        return {
          input,
          output,
          metadata: JSON.parse(item.metadata || '{}'),
        };
      });

      elizaLogger.info(`📊 Exported ${formattedData.length} planning training samples`);

      return {
        model_type: 'planning',
        format: 'realm_style_planning',
        samples: formattedData,
        metadata: {
          total_samples: formattedData.length,
          complexity_distribution: this.calculateComplexityDistribution(formattedData),
          domain_distribution: this.calculateDomainDistribution(formattedData),
          exported_at: Date.now(),
          target_model: 'Qwen/QwQ-32B-Preview',
        },
      };
    } catch (error) {
      elizaLogger.error('❌ Failed to export planning dataset:', error);
      throw error;
    }
  }

  private calculateComplexityDistribution(data: any[]): Record<string, number> {
    const distribution: Record<string, number> = {};
    for (const item of data) {
      const complexity = item.metadata?.complexity || 'unknown';
      distribution[complexity] = (distribution[complexity] || 0) + 1;
    }
    return distribution;
  }

  private calculateDomainDistribution(data: any[]): Record<string, number> {
    const distribution: Record<string, number> = {};
    for (const item of data) {
      const domain = item.metadata?.domain || 'unknown';
      distribution[domain] = (distribution[domain] || 0) + 1;
    }
    return distribution;
  }
}
