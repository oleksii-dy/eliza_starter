/**
 * Planning Model - REALM-style planning scenarios for strategic reasoning
 * 
 * This model trains on complex planning scenarios that require multi-step reasoning,
 * goal decomposition, and strategic thinking. Uses the largest available model
 * (Qwen R1 distill) for maximum reasoning capability.
 * 
 * Key features:
 * - REALM-style planning scenario generation
 * - Multi-domain expertise (software, business, AI research, project management)
 * - Complexity-based training (simple/medium/complex/expert)
 * - Comprehensive benchmarking and evaluation
 * - Integration with plugin-planning for realistic scenarios
 * - Strategic thinking with risk assessment and contingency planning
 * 
 * Model Target: Qwen/QwQ-32B-Preview (R1 distillation)
 */

export { 
  PlanningScenarioGenerator, 
  type PlanningScenario, 
  type PlanningTrainingExample 
} from './PlanningScenarioGenerator';

export { PlanningModelTrainer } from './PlanningModelTrainer';

export { 
  PlanningBenchmarks, 
  type BenchmarkScenario, 
  type BenchmarkResult 
} from './PlanningBenchmarks';

// Export configuration
export const PLANNING_MODEL_CONFIG = {
  TARGET_MODEL: 'Qwen/QwQ-32B-Preview', // R1 distillation for thinking
  MODEL_SIZE: '32B+',
  
  SCENARIO_GENERATION: {
    domains: ['software_development', 'business_strategy', 'ai_research', 'project_management'],
    complexity_levels: ['simple', 'medium', 'complex', 'expert'],
    scenarios_per_domain: 250,
    total_target: 1000,
  },

  TRAINING_FORMAT: 'instruction_following_with_thinking',
  
  COMPLEXITY_DISTRIBUTION: {
    simple: 0.2,    // 20% - Basic planning tasks
    medium: 0.4,    // 40% - Standard planning scenarios
    complex: 0.3,   // 30% - Advanced multi-step planning
    expert: 0.1,    // 10% - Highly complex strategic planning
  },

  SCENARIO_CHARACTERISTICS: {
    min_steps: {
      simple: 3,
      medium: 5,
      complex: 8,
      expert: 12,
    },
    max_steps: {
      simple: 6,
      medium: 10,
      complex: 15,
      expert: 25,
    },
    thinking_blocks: true,
    risk_assessment: true,
    contingency_planning: true,
    resource_planning: true,
  },
};

// Model deployment configuration for Together.ai
export const PLANNING_DEPLOYMENT_CONFIG = {
  base_model: 'Qwen/QwQ-32B-Preview',
  training_format: 'instruction_following_with_thinking',
  max_tokens: 4096,
  temperature: 0.3, // Lower temperature for more consistent planning
  
  system_prompt_template: `You are an expert strategic planner with deep expertise in multi-step reasoning and complex problem solving.

When presented with planning scenarios, you must:

1. Use <thinking> blocks to thoroughly analyze the situation
2. Consider all constraints, resources, and stakeholder needs
3. Develop comprehensive step-by-step plans with clear dependencies
4. Assess risks and create detailed contingency strategies
5. Provide realistic timelines and resource requirements
6. Ensure plans are actionable and measurable

Your planning approach should be:
- Strategic: Consider long-term implications and outcomes
- Systematic: Break complex problems into manageable steps
- Risk-aware: Identify potential issues and mitigation strategies
- Resource-conscious: Account for available resources and constraints
- Stakeholder-focused: Consider all affected parties and their needs

Use <thinking> blocks to work through your reasoning process before presenting your final strategic plan.`,

  fine_tuning_config: {
    learning_rate: 5e-6,
    batch_size: 1,
    epochs: 1,
    warmup_steps: 25,
    max_grad_norm: 0.3,
    gradient_accumulation_steps: 16,
    eval_steps: 50,
    save_steps: 100,
    max_seq_length: 4096,
  },
};

// Data processing configuration
export const PLANNING_DATA_CONFIG = {
  scenario_generation: {
    domains_per_complexity: 4,
    examples_per_scenario: 4, // Main + 3 variations
    sub_examples_per_scenario: 3, // Focused sub-problems
    total_examples_per_scenario: 7,
  },
  
  quality_filters: {
    min_step_count: 3,
    max_step_count: 30,
    min_thinking_length: 50,
    max_thinking_length: 2000,
    require_risk_assessment: true,
    require_contingencies: true,
    min_confidence: 0.6,
  },
  
  benchmark_integration: {
    plugin_planning_required: false, // Optional enhancement
    real_world_scenarios: true,
    evaluation_metrics: [
      'completeness',
      'feasibility', 
      'risk_awareness',
      'resource_efficiency',
      'timeline_realism',
    ],
  },
};

// Training data format specification
export interface PlanningModelTrainingFormat {
  instruction: string; // System prompt for strategic planning
  input: string; // Scenario description with constraints and context
  output: string; // Complete plan with thinking blocks
  metadata: {
    scenario_id: string;
    complexity: 'simple' | 'medium' | 'complex' | 'expert';
    domain: string;
    step_count: number;
    has_thinking: boolean;
    has_contingencies: boolean;
    has_risk_assessment: boolean;
    confidence_score: number;
    solution_quality: number;
  };
}

// Export utilities for integration
export const PLANNING_UTILS = {
  /**
   * Validate planning scenario completeness
   */
  validateScenario: (scenario: any): boolean => {
    return !!(
      scenario.objective &&
      scenario.constraints &&
      scenario.context &&
      scenario.expectedPlan &&
      scenario.expectedPlan.steps &&
      scenario.expectedPlan.steps.length >= 3
    );
  },

  /**
   * Calculate scenario difficulty score
   */
  calculateDifficulty: (complexity: string, constraintCount: number, stepCount: number): number => {
    const complexityWeight = { simple: 1, medium: 2, complex: 3, expert: 4 };
    return (complexityWeight[complexity as keyof typeof complexityWeight] || 2) * 10 + constraintCount + stepCount;
  },

  /**
   * Format for Together.ai fine-tuning
   */
  formatForTogether: (example: any) => ({
    instruction: PLANNING_DEPLOYMENT_CONFIG.system_prompt_template,
    input: example.input,
    output: example.output,
  }),

  /**
   * Validate training example quality
   */
  validateTrainingExample: (example: any): boolean => {
    return !!(
      example.input &&
      example.output &&
      example.output.includes('<thinking>') &&
      example.metadata &&
      example.metadata.step_count >= 3
    );
  },
};