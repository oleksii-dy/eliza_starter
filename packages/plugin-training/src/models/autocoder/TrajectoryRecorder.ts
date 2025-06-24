import { elizaLogger, type IAgentRuntime, type Memory } from '@elizaos/core';
import { TrainingDatabaseManager } from '../../database/TrainingDatabaseManager';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';
import path from 'path';

/**
 * TrajectoryRecorder - Records complete trajectories of MCP plugin creation and code generation
 *
 * This recorder captures the entire process from user request to final implementation,
 * including all intermediate steps, decisions, and code iterations. It uses back-reasoning
 * from the final result to create optimal training trajectories.
 */

export interface CodeTrajectoryStep {
  step_id: string;
  step_number: number;
  step_type:
    | 'analysis'
    | 'planning'
    | 'implementation'
    | 'testing'
    | 'refinement'
    | 'documentation';
  timestamp: number;
  duration_ms: number;

  input: {
    user_request?: string;
    context: Record<string, any>;
    previous_code?: string;
    feedback?: string;
    test_results?: any;
  };

  reasoning: {
    thinking: string;
    approach: string;
    alternatives_considered: string[];
    decisions_made: string[];
    risks_identified: string[];
  };

  action: {
    action_type: string;
    description: string;
    code_generated?: string;
    files_created?: string[];
    tests_written?: string;
    documentation_added?: string;
  };

  output: {
    result: any;
    code_diff?: string;
    test_results?: any;
    success: boolean;
    error_messages?: string[];
  };

  metadata: {
    complexity_level: number; // 1-10
    confidence: number; // 0-1
    requires_human_review: boolean;
    tools_used: string[];
    knowledge_domains: string[];
  };
}

export interface CodeTrajectory {
  trajectory_id: string;
  session_id: string;
  user_request: string;
  project_type: 'mcp_plugin' | 'eliza_plugin' | 'code_generation' | 'debugging' | 'refactoring';

  context: {
    starting_state: Record<string, any>;
    requirements: string[];
    constraints: string[];
    success_criteria: string[];
    available_tools: string[];
    knowledge_base: string[];
  };

  trajectory: CodeTrajectoryStep[];

  final_result: {
    success: boolean;
    final_code: string;
    files_created: string[];
    tests_passing: boolean;
    documentation_complete: boolean;
    user_satisfaction: number; // 0-1
  };

  back_reasoning: {
    optimal_path: CodeTrajectoryStep[];
    inefficiencies_removed: string[];
    improvements_made: string[];
    lessons_learned: string[];
  };

  metadata: {
    total_duration_ms: number;
    total_steps: number;
    code_lines_generated: number;
    iterations_required: number;
    tools_effectiveness: Record<string, number>;
    knowledge_utilization: Record<string, number>;
    created_at: number;
    agent_id: string;
  };
}

export interface AutocoderTrainingExample {
  input: {
    user_request: string;
    context: Record<string, any>;
    available_tools: string[];
    constraints: string[];
    success_criteria: string[];
  };

  output: {
    thinking: string;
    approach: string;
    implementation_plan: {
      steps: Array<{
        step: string;
        reasoning: string;
        expected_outcome: string;
        tools_needed: string[];
        estimated_time: string;
      }>;
      total_timeline: string;
      success_criteria: string[];
    };
    code_generation: {
      files: Array<{
        path: string;
        content: string;
        purpose: string;
      }>;
      tests: Array<{
        file: string;
        content: string;
        coverage: string[];
      }>;
      documentation: string;
    };
    confidence: number;
  };

  metadata: {
    trajectory_id: string;
    project_type: string;
    complexity_level: number;
    success_rate: number;
    code_quality_score: number;
    iteration_count: number;
  };
}

export class TrajectoryRecorder {
  private activeTrajectories: Map<string, CodeTrajectory> = new Map();
  private dbManager: TrainingDatabaseManager;
  private runtime?: IAgentRuntime;

  constructor(runtime?: IAgentRuntime) {
    this.runtime = runtime;
    this.dbManager = new TrainingDatabaseManager(runtime);
  }

  /**
   * Start recording a new code generation trajectory
   */
  async startTrajectory(
    sessionId: string,
    userRequest: string,
    projectType: CodeTrajectory['project_type'],
    context: CodeTrajectory['context']
  ): Promise<string> {
    const trajectoryId = uuidv4();

    const trajectory: CodeTrajectory = {
      trajectory_id: trajectoryId,
      session_id: sessionId,
      user_request: userRequest,
      project_type: projectType,
      context,
      trajectory: [],
      final_result: {
        success: false,
        final_code: '',
        files_created: [],
        tests_passing: false,
        documentation_complete: false,
        user_satisfaction: 0,
      },
      back_reasoning: {
        optimal_path: [],
        inefficiencies_removed: [],
        improvements_made: [],
        lessons_learned: [],
      },
      metadata: {
        total_duration_ms: 0,
        total_steps: 0,
        code_lines_generated: 0,
        iterations_required: 0,
        tools_effectiveness: {},
        knowledge_utilization: {},
        created_at: Date.now(),
        agent_id: this.runtime?.agentId || 'unknown',
      },
    };

    this.activeTrajectories.set(trajectoryId, trajectory);

    elizaLogger.info(`📝 Started trajectory recording: ${trajectoryId} for "${userRequest}"`);
    return trajectoryId;
  }

  /**
   * Record a step in the trajectory
   */
  async recordStep(
    trajectoryId: string,
    stepType: CodeTrajectoryStep['step_type'],
    input: CodeTrajectoryStep['input'],
    reasoning: CodeTrajectoryStep['reasoning'],
    action: CodeTrajectoryStep['action'],
    output: CodeTrajectoryStep['output'],
    metadata: CodeTrajectoryStep['metadata']
  ): Promise<void> {
    const trajectory = this.activeTrajectories.get(trajectoryId);
    if (!trajectory) {
      throw new Error(`Trajectory ${trajectoryId} not found`);
    }

    const stepId = uuidv4();
    const stepNumber = trajectory.trajectory.length + 1;
    const timestamp = Date.now();

    const step: CodeTrajectoryStep = {
      step_id: stepId,
      step_number: stepNumber,
      step_type: stepType,
      timestamp,
      duration_ms: 0, // Will be updated when step completes
      input,
      reasoning,
      action,
      output,
      metadata,
    };

    trajectory.trajectory.push(step);
    trajectory.metadata.total_steps = stepNumber;

    // Update tools effectiveness
    for (const tool of metadata.tools_used) {
      trajectory.metadata.tools_effectiveness[tool] =
        (trajectory.metadata.tools_effectiveness[tool] || 0) + metadata.confidence;
    }

    // Update knowledge utilization
    for (const domain of metadata.knowledge_domains) {
      trajectory.metadata.knowledge_utilization[domain] =
        (trajectory.metadata.knowledge_utilization[domain] || 0) + 1;
    }

    elizaLogger.debug(
      `📋 Recorded step ${stepNumber} (${stepType}) for trajectory ${trajectoryId}`
    );
  }

  /**
   * Complete a trajectory and perform back-reasoning
   */
  async completeTrajectory(
    trajectoryId: string,
    finalResult: CodeTrajectory['final_result']
  ): Promise<CodeTrajectory> {
    const trajectory = this.activeTrajectories.get(trajectoryId);
    if (!trajectory) {
      throw new Error(`Trajectory ${trajectoryId} not found`);
    }

    trajectory.final_result = finalResult;
    trajectory.metadata.total_duration_ms = Date.now() - trajectory.metadata.created_at;
    trajectory.metadata.code_lines_generated = this.countCodeLines(trajectory);
    trajectory.metadata.iterations_required = this.countIterations(trajectory);

    // Perform back-reasoning to create optimal path
    trajectory.back_reasoning = await this.performBackReasoning(trajectory);

    // Store in database
    if (this.runtime) {
      await this.storeTrajectory(trajectory);
    }

    // Remove from active trajectories
    this.activeTrajectories.delete(trajectoryId);

    elizaLogger.info(`✅ Completed trajectory ${trajectoryId}. Success: ${finalResult.success}`);
    return trajectory;
  }

  /**
   * Perform back-reasoning to create optimal training path
   */
  private async performBackReasoning(
    trajectory: CodeTrajectory
  ): Promise<CodeTrajectory['back_reasoning']> {
    const originalSteps = trajectory.trajectory;
    const optimalPath: CodeTrajectoryStep[] = [];
    const inefficiencies: string[] = [];
    const improvements: string[] = [];
    const lessons: string[] = [];

    // Analyze the trajectory for inefficiencies
    const currentStep = 0;
    const stepsByType = this.groupStepsByType(originalSteps);

    // Remove redundant analysis steps
    if (stepsByType.analysis && stepsByType.analysis.length > 1) {
      const bestAnalysis = stepsByType.analysis.reduce((best, current) =>
        current.metadata.confidence > best.metadata.confidence ? current : best
      );
      optimalPath.push(bestAnalysis);
      inefficiencies.push(`Removed ${stepsByType.analysis.length - 1} redundant analysis steps`);
    } else if (stepsByType.analysis && stepsByType.analysis.length === 1) {
      optimalPath.push(stepsByType.analysis[0]);
    }

    // Include best planning step
    if (stepsByType.planning && stepsByType.planning.length > 0) {
      const bestPlanning = stepsByType.planning.reduce((best, current) =>
        current.metadata.confidence > best.metadata.confidence ? current : best
      );
      optimalPath.push(bestPlanning);
      if (stepsByType.planning.length > 1) {
        inefficiencies.push(
          `Removed ${stepsByType.planning.length - 1} redundant planning iterations`
        );
      }
    }

    // Include only successful implementation steps
    if (stepsByType.implementation) {
      const successfulImplementations = stepsByType.implementation.filter(
        (step) => step.output.success && !step.output.error_messages?.length
      );

      if (successfulImplementations.length > 0) {
        // Take the final successful implementation
        optimalPath.push(successfulImplementations[successfulImplementations.length - 1]);

        const failedAttempts = stepsByType.implementation.length - successfulImplementations.length;
        if (failedAttempts > 0) {
          lessons.push(`${failedAttempts} implementation attempts failed before success`);
        }
      } else {
        // Include the best attempt even if failed
        const bestAttempt = stepsByType.implementation.reduce((best, current) =>
          current.metadata.confidence > best.metadata.confidence ? current : best
        );
        optimalPath.push(bestAttempt);
        lessons.push('Implementation required multiple iterations to achieve success');
      }
    }

    // Include testing steps only if they added value
    if (stepsByType.testing) {
      const valuableTests = stepsByType.testing.filter(
        (step) => step.output.test_results && step.output.success
      );
      if (valuableTests.length > 0) {
        optimalPath.push(valuableTests[valuableTests.length - 1]);
      }

      const redundantTests = stepsByType.testing.length - valuableTests.length;
      if (redundantTests > 0) {
        inefficiencies.push(`Removed ${redundantTests} redundant or failed test steps`);
      }
    }

    // Include final refinement if it improved the result
    if (stepsByType.refinement && stepsByType.refinement.length > 0) {
      const lastRefinement = stepsByType.refinement[stepsByType.refinement.length - 1];
      if (lastRefinement.metadata.confidence > 0.7) {
        optimalPath.push(lastRefinement);
        improvements.push('Final refinement step improved code quality');
      } else {
        inefficiencies.push('Refinement steps did not significantly improve result');
      }
    }

    // Include documentation if complete
    if (stepsByType.documentation && stepsByType.documentation.length > 0) {
      const lastDoc = stepsByType.documentation[stepsByType.documentation.length - 1];
      if (lastDoc.output.success) {
        optimalPath.push(lastDoc);
      }
    }

    // Generate improvement suggestions
    if (trajectory.final_result.success) {
      improvements.push('Trajectory achieved successful completion');

      if (optimalPath.length < originalSteps.length * 0.7) {
        improvements.push(
          `Optimal path reduced steps by ${Math.round((1 - optimalPath.length / originalSteps.length) * 100)}%`
        );
      }
    } else {
      lessons.push('Trajectory did not achieve complete success - identify blocking factors');
    }

    // Add insights about tool effectiveness
    const mostEffectiveTool = Object.entries(trajectory.metadata.tools_effectiveness).sort(
      ([, a], [, b]) => b - a
    )[0];

    if (mostEffectiveTool) {
      improvements.push(
        `Most effective tool: ${mostEffectiveTool[0]} (score: ${mostEffectiveTool[1].toFixed(2)})`
      );
    }

    return {
      optimal_path: optimalPath,
      inefficiencies_removed: inefficiencies,
      improvements_made: improvements,
      lessons_learned: lessons,
    };
  }

  /**
   * Group trajectory steps by type
   */
  private groupStepsByType(steps: CodeTrajectoryStep[]): Record<string, CodeTrajectoryStep[]> {
    const grouped: Record<string, CodeTrajectoryStep[]> = {};

    for (const step of steps) {
      if (!grouped[step.step_type]) {
        grouped[step.step_type] = [];
      }
      grouped[step.step_type].push(step);
    }

    return grouped;
  }

  /**
   * Count total lines of code generated
   */
  private countCodeLines(trajectory: CodeTrajectory): number {
    let totalLines = 0;

    for (const step of trajectory.trajectory) {
      if (step.action.code_generated) {
        totalLines += step.action.code_generated.split('\n').length;
      }
    }

    return totalLines;
  }

  /**
   * Count number of iterations (failed attempts)
   */
  private countIterations(trajectory: CodeTrajectory): number {
    return (
      trajectory.trajectory.filter(
        (step) => step.step_type === 'implementation' && !step.output.success
      ).length + 1
    ); // +1 for final success
  }

  /**
   * Generate training examples from completed trajectory
   */
  async generateTrainingExamples(trajectory: CodeTrajectory): Promise<AutocoderTrainingExample[]> {
    const examples: AutocoderTrainingExample[] = [];

    // Main trajectory example (optimal path)
    const mainExample = await this.createMainTrainingExample(trajectory);
    examples.push(mainExample);

    // Sub-problem examples for each step type
    const stepTypeExamples = await this.createStepTypeExamples(trajectory);
    examples.push(...stepTypeExamples);

    // Error recovery examples
    const errorExamples = await this.createErrorRecoveryExamples(trajectory);
    examples.push(...errorExamples);

    elizaLogger.info(
      `📚 Generated ${examples.length} training examples from trajectory ${trajectory.trajectory_id}`
    );
    return examples;
  }

  /**
   * Create main training example from optimal path
   */
  private async createMainTrainingExample(
    trajectory: CodeTrajectory
  ): Promise<AutocoderTrainingExample> {
    const optimalSteps = trajectory.back_reasoning.optimal_path;

    // Create comprehensive thinking process
    const thinking = this.generateMainThinking(trajectory);

    // Create implementation plan from optimal path
    const implementationPlan = {
      steps: optimalSteps.map((step, index) => ({
        step: `${step.step_type}: ${step.action.description}`,
        reasoning: step.reasoning.thinking,
        expected_outcome: this.extractExpectedOutcome(step),
        tools_needed: step.metadata.tools_used,
        estimated_time: this.estimateStepTime(step),
      })),
      total_timeline: this.calculateTotalTimeline(optimalSteps),
      success_criteria: trajectory.context.success_criteria,
    };

    // Create code generation output
    const codeGeneration = {
      files: this.extractGeneratedFiles(optimalSteps),
      tests: this.extractGeneratedTests(optimalSteps),
      documentation: this.extractDocumentation(optimalSteps),
    };

    const example: AutocoderTrainingExample = {
      input: {
        user_request: trajectory.user_request,
        context: trajectory.context.starting_state,
        available_tools: trajectory.context.available_tools,
        constraints: trajectory.context.constraints,
        success_criteria: trajectory.context.success_criteria,
      },
      output: {
        thinking,
        approach: this.summarizeApproach(trajectory),
        implementation_plan: implementationPlan,
        code_generation: codeGeneration,
        confidence: this.calculateOverallConfidence(trajectory),
      },
      metadata: {
        trajectory_id: trajectory.trajectory_id,
        project_type: trajectory.project_type,
        complexity_level: this.calculateComplexityLevel(trajectory),
        success_rate: trajectory.final_result.success ? 1.0 : 0.5,
        code_quality_score: this.calculateCodeQuality(trajectory),
        iteration_count: trajectory.metadata.iterations_required,
      },
    };

    return example;
  }

  /**
   * Create step-type specific examples
   */
  private async createStepTypeExamples(
    trajectory: CodeTrajectory
  ): Promise<AutocoderTrainingExample[]> {
    const examples: AutocoderTrainingExample[] = [];
    const stepTypes = ['analysis', 'planning', 'implementation', 'testing'];

    for (const stepType of stepTypes) {
      const stepsOfType = trajectory.trajectory.filter((step) => step.step_type === stepType);
      if (stepsOfType.length === 0) {
        continue;
      }

      const bestStep = stepsOfType.reduce((best, current) =>
        current.metadata.confidence > best.metadata.confidence ? current : best
      );

      const example = await this.createStepSpecificExample(trajectory, bestStep);
      if (example) {
        examples.push(example);
      }
    }

    return examples;
  }

  /**
   * Create error recovery examples
   */
  private async createErrorRecoveryExamples(
    trajectory: CodeTrajectory
  ): Promise<AutocoderTrainingExample[]> {
    const examples: AutocoderTrainingExample[] = [];

    // Find steps that failed but had recovery
    const failedSteps = trajectory.trajectory.filter(
      (step) =>
        !step.output.success && step.output.error_messages && step.output.error_messages.length > 0
    );

    for (const failedStep of failedSteps) {
      // Find the recovery step
      const recoveryStep = trajectory.trajectory.find(
        (step) =>
          step.step_number > failedStep.step_number &&
          step.step_type === failedStep.step_type &&
          step.output.success
      );

      if (recoveryStep) {
        const example = await this.createErrorRecoveryExample(trajectory, failedStep, recoveryStep);
        if (example) {
          examples.push(example);
        }
      }
    }

    return examples;
  }

  /**
   * Store trajectory in database
   */
  private async storeTrajectory(trajectory: CodeTrajectory): Promise<void> {
    if (!this.runtime) {
      return;
    }

    try {
      const dbPath = this.runtime.getSetting('TRAINING_DATABASE_URL') || 'sqlite:./training.db';
      await this.dbManager.initializeSchema();

      // Generate training examples
      const trainingExamples = await this.generateTrainingExamples(trajectory);

      // Store each training example
      for (const example of trainingExamples) {
        const trainingData = {
          id: uuidv4() as any,
          modelType: 'autocoder' as const,
          input: {
            prompt: `Generate code based on: ${example.input.user_request}`,
            ...example.input,
          },
          output: example.output,
          conversationContext: [], // No conversation context for code generation
          stateData: {
            trajectory_id: trajectory.trajectory_id,
            session_id: trajectory.session_id,
            project_type: trajectory.project_type,
          },
          metadata: {
            ...example.metadata,
            agentId: this.runtime.agentId,
            timestamp: Date.now(),
            target_model: 'largest_available', // Use largest model for code generation
          },
          tags: [
            'autocoder',
            'code_generation',
            trajectory.project_type,
            `complexity_${example.metadata.complexity_level}`,
          ],
          timestamp: Date.now(),
        };

        await this.dbManager.storeTrainingData(trainingData);
      }

      elizaLogger.info(
        `💾 Stored ${trainingExamples.length} autocoder examples from trajectory ${trajectory.trajectory_id}`
      );
    } catch (error) {
      elizaLogger.error('Failed to store trajectory in database:', error);
    }
  }

  // Helper methods for generating training examples
  private generateMainThinking(trajectory: CodeTrajectory): string {
    const optimalSteps = trajectory.back_reasoning.optimal_path;

    let thinking = `I need to analyze this ${trajectory.project_type} request: "${trajectory.user_request}"\n\n`;

    thinking += 'Key requirements:\n';
    for (const req of trajectory.context.requirements) {
      thinking += `- ${req}\n`;
    }

    thinking += '\nConstraints to consider:\n';
    for (const constraint of trajectory.context.constraints) {
      thinking += `- ${constraint}\n`;
    }

    thinking += '\nSuccess criteria:\n';
    for (const criterion of trajectory.context.success_criteria) {
      thinking += `- ${criterion}\n`;
    }

    thinking += '\nMy approach will be:\n';
    for (let i = 0; i < optimalSteps.length; i++) {
      const step = optimalSteps[i];
      thinking += `${i + 1}. ${step.step_type}: ${step.reasoning.approach}\n`;
    }

    thinking +=
      '\nThis approach should achieve the desired outcome efficiently while meeting all constraints.';

    return thinking;
  }

  private summarizeApproach(trajectory: CodeTrajectory): string {
    const projectType = trajectory.project_type.replace('_', ' ');
    const stepTypes = [...new Set(trajectory.back_reasoning.optimal_path.map((s) => s.step_type))];

    return `Systematic ${projectType} development using ${stepTypes.join(' -> ')} approach`;
  }

  private calculateOverallConfidence(trajectory: CodeTrajectory): number {
    const avgConfidence =
      trajectory.back_reasoning.optimal_path.reduce(
        (sum, step) => sum + step.metadata.confidence,
        0
      ) / trajectory.back_reasoning.optimal_path.length;

    const successBonus = trajectory.final_result.success ? 0.1 : 0;
    const qualityBonus = trajectory.final_result.tests_passing ? 0.05 : 0;

    return Math.min(avgConfidence + successBonus + qualityBonus, 0.95);
  }

  private calculateComplexityLevel(trajectory: CodeTrajectory): number {
    const stepCount = trajectory.metadata.total_steps;
    const iterationCount = trajectory.metadata.iterations_required;
    const codeLines = trajectory.metadata.code_lines_generated;

    // Complexity score 1-10 based on various factors
    let complexity = 1;

    if (stepCount > 10) {
      complexity += 2;
    }
    if (stepCount > 20) {
      complexity += 2;
    }
    if (iterationCount > 3) {
      complexity += 1;
    }
    if (iterationCount > 6) {
      complexity += 2;
    }
    if (codeLines > 500) {
      complexity += 1;
    }
    if (codeLines > 2000) {
      complexity += 2;
    }

    return Math.min(complexity, 10);
  }

  private calculateCodeQuality(trajectory: CodeTrajectory): number {
    let quality = 0.5; // Base quality

    if (trajectory.final_result.tests_passing) {
      quality += 0.2;
    }
    if (trajectory.final_result.documentation_complete) {
      quality += 0.1;
    }
    if (trajectory.final_result.user_satisfaction > 0.8) {
      quality += 0.2;
    }

    return Math.min(quality, 1.0);
  }

  // Additional helper methods would be implemented here for:
  // - extractExpectedOutcome()
  // - estimateStepTime()
  // - calculateTotalTimeline()
  // - extractGeneratedFiles()
  // - extractGeneratedTests()
  // - extractDocumentation()
  // - createStepSpecificExample()
  // - createErrorRecoveryExample()

  /**
   * Record a complete code generation trajectory
   */
  async recordTrajectory(trajectory: any): Promise<void> {
    elizaLogger.info(`📝 Recording trajectory for session: ${trajectory.sessionId}`);

    // Convert test trajectory to CodeTrajectory format
    const codeTrajectory: CodeTrajectory = {
      trajectory_id: uuidv4(),
      session_id: trajectory.sessionId,
      user_request: trajectory.initialPrompt,
      project_type: trajectory.requestType,

      context: {
        starting_state: trajectory.metadata || {},
        available_tools: ['file_system', 'code_editor', 'test_runner'],
        constraints: ['typescript_only', 'no_external_dependencies'],
        requirements: [trajectory.initialPrompt],
        success_criteria: ['code_compiles', 'tests_pass', 'meets_requirements'],
        knowledge_base: ['typescript', 'node.js', 'eliza_framework'],
      },

      trajectory: trajectory.steps.map((step: any, index: number) => ({
        step_id: step.stepId,
        step_number: index + 1,
        step_type: step.type as any,
        timestamp: step.timestamp,
        duration_ms: 1000, // Default duration

        input: {
          user_request: step.input,
          context: {},
        },

        reasoning: {
          thinking: step.output || 'Processing step',
          approach: step.type,
          alternatives_considered: [],
          decisions_made: [],
          risks_identified: [],
        },

        action: {
          action_type: step.type,
          description: step.input,
          code_generated: step.type === 'implementation' ? step.output : undefined,
        },

        output: {
          result: step.output,
          success: step.success,
          error_messages: step.success ? [] : ['Step failed'],
        },

        metadata: {
          confidence: 0.8,
          complexity_level: 3,
          knowledge_domains: ['coding'],
          tools_used: ['code_editor'],
        },
      })),

      final_result: {
        success: true,
        final_code: trajectory.finalCode || '',
        files_created: ['main.ts'],
        tests_passing: true,
        documentation_complete: false,
        user_satisfaction: 0.9,
      },

      back_reasoning: {
        optimal_path: [],
        inefficiencies_removed: [],
        improvements_made: [],
        lessons_learned: [],
      },

      metadata: {
        total_duration_ms: trajectory.metadata?.duration || 45000,
        total_steps: trajectory.steps.length,
        code_lines_generated: trajectory.finalCode?.split('\n').length || 50,
        iterations_required: 1,
        tools_effectiveness: { code_editor: 0.9 },
        knowledge_utilization: { typescript: 0.8 },
        created_at: Date.now(),
        agent_id: this.runtime?.agentId || 'test-agent',
      },
    };

    // Store the trajectory
    await this.storeTrajectory(codeTrajectory);

    elizaLogger.info(`✅ Trajectory recorded successfully: ${codeTrajectory.trajectory_id}`);
  }

  /**
   * Export training dataset for Together.ai fine-tuning
   */
  async exportTrainingDataset(
    format: 'together_ai' | 'huggingface' | 'openai' = 'together_ai',
    limit: number = 1000
  ): Promise<any> {
    try {
      const data = await this.dbManager.getTrainingData({ modelType: 'autocoder', limit });

      const formattedData = data.map((item) => {
        const input = JSON.parse(item.input_data);
        const output = JSON.parse(item.output_data);

        return {
          input,
          output,
          metadata: JSON.parse(item.metadata || '{}'),
        };
      });

      elizaLogger.info(
        `📊 Exported ${formattedData.length} autocoder training samples for ${format}`
      );

      return {
        model_type: 'autocoder',
        format: `${format}_compatible`,
        target_model: 'DeepSeek-Coder-V2-Instruct-236B',
        samples: formattedData,
        metadata: {
          total_samples: formattedData.length,
          exported_at: Date.now(),
          intended_use: 'code_generation_and_mcp_plugin_creation',
        },
      };
    } catch (error) {
      elizaLogger.error('❌ Failed to export autocoder training dataset:', error);
      throw error;
    }
  }

  /**
   * Export autocoder training data
   */
  async exportAutocoderDataset(limit: number = 5000): Promise<any> {
    try {
      const data = await this.dbManager.getTrainingData({ modelType: 'autocoder', limit });

      const formattedData = data.map((item) => {
        const input = JSON.parse(item.input_data);
        const output = JSON.parse(item.output_data);

        return {
          input,
          output,
          metadata: JSON.parse(item.metadata || '{}'),
        };
      });

      elizaLogger.info(`📊 Exported ${formattedData.length} autocoder training samples`);

      return {
        model_type: 'autocoder',
        format: 'code_generation_with_trajectory',
        target_model: 'largest_available',
        samples: formattedData,
        metadata: {
          total_samples: formattedData.length,
          project_type_distribution: this.calculateProjectTypeDistribution(formattedData),
          complexity_distribution: this.calculateComplexityDistribution(formattedData),
          exported_at: Date.now(),
        },
      };
    } catch (error) {
      elizaLogger.error('❌ Failed to export autocoder dataset:', error);
      throw error;
    }
  }

  private calculateProjectTypeDistribution(data: any[]): Record<string, number> {
    const distribution: Record<string, number> = {};
    for (const item of data) {
      const projectType = item.metadata?.project_type || 'unknown';
      distribution[projectType] = (distribution[projectType] || 0) + 1;
    }
    return distribution;
  }

  private calculateComplexityDistribution(data: any[]): Record<string, number> {
    const distribution: Record<string, number> = {};
    for (const item of data) {
      const complexity = `level_${item.metadata?.complexity_level || 1}`;
      distribution[complexity] = (distribution[complexity] || 0) + 1;
    }
    return distribution;
  }

  private extractExpectedOutcome(step: CodeTrajectoryStep): string {
    if (step.action.description) {
      return step.action.description;
    }
    return `Complete ${step.step_type} phase successfully`;
  }

  private estimateStepTime(step: CodeTrajectoryStep): string {
    const complexity = step.metadata.complexity_level;
    const timeEstimates = {
      analysis: ['5 minutes', '15 minutes', '30 minutes'],
      planning: ['10 minutes', '30 minutes', '1 hour'],
      implementation: ['30 minutes', '2 hours', '8 hours'],
      testing: ['15 minutes', '1 hour', '3 hours'],
      refinement: ['10 minutes', '30 minutes', '1 hour'],
      documentation: ['15 minutes', '45 minutes', '2 hours'],
    };

    const times = timeEstimates[step.step_type as keyof typeof timeEstimates] || [
      '30 minutes',
      '1 hour',
      '3 hours',
    ];
    const index = Math.min(Math.floor(complexity / 4), times.length - 1);
    return times[index];
  }

  private calculateTotalTimeline(steps: CodeTrajectoryStep[]): string {
    const totalComplexity = steps.reduce((sum, step) => sum + step.metadata.complexity_level, 0);

    if (totalComplexity < 20) {
      return '2-4 hours';
    }
    if (totalComplexity < 40) {
      return '1-2 days';
    }
    if (totalComplexity < 60) {
      return '3-5 days';
    }
    return '1-2 weeks';
  }

  private extractGeneratedFiles(
    steps: CodeTrajectoryStep[]
  ): Array<{ path: string; content: string; purpose: string }> {
    const files: Array<{ path: string; content: string; purpose: string }> = [];

    for (const step of steps) {
      if (step.action.code_generated && step.action.files_created) {
        for (const filePath of step.action.files_created) {
          files.push({
            path: filePath,
            content: step.action.code_generated,
            purpose: step.action.description,
          });
        }
      }
    }

    return files;
  }

  private extractGeneratedTests(
    steps: CodeTrajectoryStep[]
  ): Array<{ file: string; content: string; coverage: string[] }> {
    const tests: Array<{ file: string; content: string; coverage: string[] }> = [];

    for (const step of steps) {
      if (step.step_type === 'testing' && step.action.tests_written) {
        tests.push({
          file: `${step.action.description}.test.ts`,
          content: step.action.tests_written,
          coverage: step.metadata.knowledge_domains,
        });
      }
    }

    return tests;
  }

  private extractDocumentation(steps: CodeTrajectoryStep[]): string {
    const docSteps = steps.filter((step) => step.step_type === 'documentation');

    if (docSteps.length === 0) {
      return '';
    }

    return docSteps.map((step) => step.action.documentation_added).join('\n\n');
  }

  private async createStepSpecificExample(
    trajectory: CodeTrajectory,
    step: CodeTrajectoryStep
  ): Promise<AutocoderTrainingExample | null> {
    // Implementation would create focused examples for specific step types
    // This is a simplified placeholder
    return null;
  }

  private async createErrorRecoveryExample(
    trajectory: CodeTrajectory,
    failedStep: CodeTrajectoryStep,
    recoveryStep: CodeTrajectoryStep
  ): Promise<AutocoderTrainingExample | null> {
    // Implementation would create examples showing error recovery patterns
    // This is a simplified placeholder
    return null;
  }
}
