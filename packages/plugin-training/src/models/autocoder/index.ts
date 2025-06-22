/**
 * Autocoder/Code Model - Records entire trajectory of MCP plugin creation and code generation
 * 
 * This model captures the complete process from user request to final implementation,
 * including all intermediate steps, decisions, and iterations. It uses back-reasoning
 * from the final result to create optimal training trajectories for code generation.
 * 
 * Key features:
 * - Complete trajectory recording of coding sessions
 * - MCP plugin creation process capture
 * - Self-generated code plugin development tracking
 * - Back-reasoning from final result to optimal path
 * - Error recovery and iteration tracking
 * - Integration with autocoder system
 * - Code quality and testing validation
 * 
 * Model Target: Largest available model on Together.ai
 */

export { 
  TrajectoryRecorder, 
  type CodeTrajectory, 
  type CodeTrajectoryStep, 
  type AutocoderTrainingExample 
} from './TrajectoryRecorder';

export { 
  AutocoderIntegration, 
  type AutocoderSession 
} from './AutocoderIntegration';

// Export configuration
export const AUTOCODER_MODEL_CONFIG = {
  TARGET_MODEL: 'largest_available', // Use largest model on Together.ai
  MODEL_SIZE: 'largest',
  
  PROJECT_TYPES: [
    'mcp_plugin',
    'eliza_plugin', 
    'code_generation',
    'debugging',
    'refactoring',
  ],

  STEP_TYPES: [
    'analysis',
    'planning',
    'implementation',
    'testing',
    'refinement',
    'documentation',
  ],

  TRAJECTORY_RECORDING: {
    capture_thinking: true,
    capture_alternatives: true,
    capture_decisions: true,
    capture_risks: true,
    capture_code_diffs: true,
    capture_test_results: true,
    back_reasoning_enabled: true,
  },

  TRAINING_FORMAT: 'code_generation_with_trajectory',
};

// Model deployment configuration for Together.ai
export const AUTOCODER_DEPLOYMENT_CONFIG = {
  base_model: 'largest_available', // Will be set to largest model available
  training_format: 'instruction_following_with_code',
  max_tokens: 8192,
  temperature: 0.2, // Lower temperature for more precise code generation
  
  system_prompt_template: `You are an expert software developer and autocoder with deep expertise in:
- MCP (Model Context Protocol) plugin development
- ElizaOS plugin architecture and development
- TypeScript/JavaScript programming
- Code generation and automation
- Debugging and refactoring
- Test-driven development
- Documentation generation

When given a coding task, you should:

1. Analyze the requirements thoroughly
2. Plan your approach step by step
3. Implement clean, well-structured code
4. Write comprehensive tests
5. Create clear documentation
6. Handle errors gracefully
7. Follow best practices and patterns

Your code should be:
- Production-ready and robust
- Well-commented and documented
- Following TypeScript/JavaScript best practices
- Compatible with the target framework (MCP, ElizaOS, etc.)
- Thoroughly tested with appropriate test coverage
- Easily maintainable and extensible

Always think through your approach before implementing, and explain your reasoning for key decisions.`,

  fine_tuning_config: {
    learning_rate: 1e-5,
    batch_size: 1,
    epochs: 1,
    warmup_steps: 20,
    max_grad_norm: 0.5,
    gradient_accumulation_steps: 32,
    eval_steps: 25,
    save_steps: 50,
    max_seq_length: 8192,
    special_tokens: {
      thinking_start: '<thinking>',
      thinking_end: '</thinking>',
      code_start: '```typescript',
      code_end: '```',
    },
  },
};

// Data processing configuration
export const AUTOCODER_DATA_CONFIG = {
  trajectory_capture: {
    min_steps: 3,
    max_steps: 50,
    capture_failed_attempts: true,
    capture_iterations: true,
    capture_user_feedback: true,
    back_reasoning_required: true,
  },
  
  quality_filters: {
    min_code_lines: 10,
    max_code_lines: 5000,
    require_tests: false, // Optional but preferred
    require_documentation: false, // Optional but preferred
    min_confidence: 0.5,
    max_iterations: 10,
  },
  
  code_analysis: {
    analyze_complexity: true,
    analyze_quality: true,
    analyze_patterns: true,
    extract_best_practices: true,
    identify_common_mistakes: true,
  },
  
  integration_points: {
    autocoder_events: true,
    mcp_sdk_integration: true,
    eliza_plugin_system: true,
    test_framework_integration: true,
    documentation_tools: true,
  },
};

// Training data format specification
export interface AutocoderModelTrainingFormat {
  instruction: string; // System prompt for code generation
  input: string; // User request with context and constraints
  output: string; // Complete implementation with thinking, code, tests, docs
  metadata: {
    trajectory_id: string;
    session_id: string;
    project_type: 'mcp_plugin' | 'eliza_plugin' | 'code_generation' | 'debugging' | 'refactoring';
    complexity_level: number; // 1-10
    step_count: number;
    iteration_count: number;
    success_rate: number;
    code_quality_score: number;
    has_tests: boolean;
    has_documentation: boolean;
    tools_used: string[];
    knowledge_domains: string[];
  };
}

// Trajectory step categories for training
export const TRAJECTORY_STEP_CATEGORIES = {
  analysis: {
    description: 'Analyze requirements and understand the problem',
    typical_duration: '5-30 minutes',
    outputs: ['requirements_analysis', 'technical_constraints', 'success_criteria'],
  },
  
  planning: {
    description: 'Plan the implementation approach and architecture',
    typical_duration: '10-60 minutes',
    outputs: ['implementation_plan', 'architecture_design', 'file_structure'],
  },
  
  implementation: {
    description: 'Write the actual code and implement functionality',
    typical_duration: '30 minutes - 8 hours',
    outputs: ['source_code', 'configuration_files', 'build_scripts'],
  },
  
  testing: {
    description: 'Write and run tests to validate functionality',
    typical_duration: '15 minutes - 3 hours',
    outputs: ['test_files', 'test_results', 'coverage_reports'],
  },
  
  refinement: {
    description: 'Improve code quality, performance, and maintainability',
    typical_duration: '10 minutes - 2 hours',
    outputs: ['refactored_code', 'performance_improvements', 'code_cleanup'],
  },
  
  documentation: {
    description: 'Create documentation and usage examples',
    typical_duration: '15 minutes - 2 hours',
    outputs: ['readme_files', 'api_documentation', 'usage_examples'],
  },
};

// Back-reasoning optimization strategies
export const BACK_REASONING_STRATEGIES = {
  remove_redundant_steps: {
    description: 'Eliminate unnecessary repetition and false starts',
    impact: 'Reduces training time and improves efficiency',
  },
  
  identify_optimal_path: {
    description: 'Extract the most effective sequence of steps',
    impact: 'Creates cleaner training examples',
  },
  
  capture_decision_points: {
    description: 'Record key decisions and their reasoning',
    impact: 'Improves model decision-making capabilities',
  },
  
  extract_error_patterns: {
    description: 'Identify common mistakes and recovery strategies',
    impact: 'Improves error handling and debugging skills',
  },
  
  optimize_for_success: {
    description: 'Focus on patterns that lead to successful outcomes',
    impact: 'Increases success rate of generated code',
  },
};

// Export utilities for integration
export const AUTOCODER_UTILS = {
  /**
   * Validate trajectory completeness
   */
  validateTrajectory: (trajectory: any): boolean => {
    return !!(
      trajectory.trajectory_id &&
      trajectory.user_request &&
      trajectory.trajectory &&
      trajectory.trajectory.length >= 3 &&
      trajectory.final_result
    );
  },

  /**
   * Calculate trajectory efficiency score
   */
  calculateEfficiency: (trajectory: any): number => {
    const totalSteps = trajectory.trajectory.length;
    const optimalSteps = trajectory.back_reasoning?.optimal_path?.length || totalSteps;
    return optimalSteps / totalSteps;
  },

  /**
   * Extract code quality metrics
   */
  extractCodeMetrics: (trajectory: any) => {
    const codeSteps = trajectory.trajectory.filter((step: any) => 
      step.step_type === 'implementation' && step.action.code_generated
    );
    
    const totalLines = codeSteps.reduce((sum: number, step: any) => 
      sum + (step.action.code_generated?.split('\n').length || 0), 0
    );
    
    return {
      total_lines: totalLines,
      implementation_steps: codeSteps.length,
      avg_lines_per_step: totalLines / Math.max(codeSteps.length, 1),
      has_tests: trajectory.trajectory.some((step: any) => step.step_type === 'testing'),
      has_documentation: trajectory.trajectory.some((step: any) => step.step_type === 'documentation'),
    };
  },

  /**
   * Format for Together.ai fine-tuning
   */
  formatForTogether: (example: any) => ({
    instruction: AUTOCODER_DEPLOYMENT_CONFIG.system_prompt_template,
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
      example.metadata &&
      example.metadata.trajectory_id &&
      example.metadata.complexity_level >= 1 &&
      example.metadata.complexity_level <= 10
    );
  },

  /**
   * Extract project type from user request
   */
  detectProjectType: (userRequest: string): string => {
    const text = userRequest.toLowerCase();
    
    if (text.includes('mcp') || text.includes('model context protocol')) {
      return 'mcp_plugin';
    }
    if (text.includes('eliza') || text.includes('plugin')) {
      return 'eliza_plugin';
    }
    if (text.includes('debug') || text.includes('fix') || text.includes('error')) {
      return 'debugging';
    }
    if (text.includes('refactor') || text.includes('improve') || text.includes('optimize')) {
      return 'refactoring';
    }
    
    return 'code_generation';
  },

  /**
   * Calculate complexity level from trajectory
   */
  calculateComplexity: (trajectory: any): number => {
    let complexity = 1;
    
    const stepCount = trajectory.trajectory?.length || 0;
    const iterationCount = trajectory.metadata?.iterations_required || 0;
    const codeLines = trajectory.metadata?.code_lines_generated || 0;
    const toolsUsed = Object.keys(trajectory.metadata?.tools_effectiveness || {}).length;
    
    // Factor in various complexity indicators
    if (stepCount > 10) complexity += 2;
    if (stepCount > 20) complexity += 2;
    if (iterationCount > 3) complexity += 1;
    if (iterationCount > 6) complexity += 2;
    if (codeLines > 500) complexity += 1;
    if (codeLines > 2000) complexity += 2;
    if (toolsUsed > 5) complexity += 1;
    
    return Math.min(complexity, 10);
  },
};