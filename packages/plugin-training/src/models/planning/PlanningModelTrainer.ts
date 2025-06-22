import { elizaLogger, type IAgentRuntime } from '@elizaos/core';
import { PlanningScenarioGenerator, type PlanningScenario, type PlanningTrainingExample } from './PlanningScenarioGenerator';
import { TrainingDatabaseManager } from '../../database/TrainingDatabaseManager';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';
import path from 'path';

/**
 * PlanningModelTrainer - Trains the planning model using REALM-style scenarios
 * 
 * This trainer generates comprehensive planning scenarios and creates training data
 * specifically designed for the largest available model (Qwen R1 distill) to handle
 * complex multi-step reasoning and strategic planning tasks.
 */
export class PlanningModelTrainer {
  private scenarioGenerator: PlanningScenarioGenerator;
  private dbManager: TrainingDatabaseManager;
  private runtime?: IAgentRuntime;

  constructor(runtime?: IAgentRuntime) {
    this.runtime = runtime;
    this.scenarioGenerator = new PlanningScenarioGenerator(runtime);
    this.dbManager = new TrainingDatabaseManager(runtime);
  }

  /**
   * Generate a comprehensive training dataset for planning scenarios
   */
  async generatePlanningDataset(
    totalScenarios: number = 1000,
    outputDir: string = './planning_training_data'
  ): Promise<{
    totalScenarios: number;
    totalExamples: number;
    complexityDistribution: Record<string, number>;
    domainDistribution: Record<string, number>;
    datasetPath: string;
  }> {
    elizaLogger.info(`🧠 Generating planning dataset with ${totalScenarios} scenarios`);

    await fs.mkdir(outputDir, { recursive: true });

    const allExamples: PlanningTrainingExample[] = [];
    const complexityDistribution: Record<string, number> = {};
    const domainDistribution: Record<string, number> = {};

    // Define target distribution for complexity levels
    const complexityTargets = {
      simple: Math.floor(totalScenarios * 0.2),    // 20%
      medium: Math.floor(totalScenarios * 0.4),    // 40%
      complex: Math.floor(totalScenarios * 0.3),   // 30%
      expert: Math.floor(totalScenarios * 0.1),    // 10%
    };

    // Generate scenarios across all domains and complexity levels
    const domains = ['software_development', 'business_strategy', 'ai_research', 'project_management'];
    const complexities = ['simple', 'medium', 'complex', 'expert'] as const;

    for (const complexity of complexities) {
      const targetCount = complexityTargets[complexity];
      const scenariosPerDomain = Math.ceil(targetCount / domains.length);

      for (const domain of domains) {
        const domainScenarios = Math.min(scenariosPerDomain, targetCount - (complexityDistribution[complexity] || 0));

        for (let i = 0; i < domainScenarios; i++) {
          try {
            // Generate scenario
            const scenario = await this.scenarioGenerator.generatePlanningScenario(domain, complexity);
            
            // Generate training examples from scenario
            const examples = await this.scenarioGenerator.generateTrainingExamples(scenario);
            allExamples.push(...examples);

            // Update distributions
            complexityDistribution[complexity] = (complexityDistribution[complexity] || 0) + 1;
            domainDistribution[domain] = (domainDistribution[domain] || 0) + 1;

            if ((complexityDistribution[complexity] + domainDistribution[domain]) % 50 === 0) {
              elizaLogger.info(`📊 Generated ${Object.values(complexityDistribution).reduce((a, b) => a + b, 0)} scenarios so far...`);
            }

          } catch (error) {
            elizaLogger.warn(`Failed to generate ${complexity} ${domain} scenario:`, error);
          }
        }
      }
    }

    // Store examples in database if runtime available
    if (this.runtime) {
      await this.storeInDatabase(allExamples);
    }

    // Create dataset files
    const datasetPath = await this.createDatasetFiles(allExamples, outputDir);

    const result = {
      totalScenarios: Object.values(complexityDistribution).reduce((a, b) => a + b, 0),
      totalExamples: allExamples.length,
      complexityDistribution,
      domainDistribution,
      datasetPath,
    };

    elizaLogger.info(`🎉 Planning dataset generation complete:`, result);
    return result;
  }

  /**
   * Create dataset files in various formats
   */
  private async createDatasetFiles(
    examples: PlanningTrainingExample[],
    outputDir: string
  ): Promise<string> {
    const datasetsDir = path.join(outputDir, 'datasets');
    await fs.mkdir(datasetsDir, { recursive: true });

    // Main JSONL dataset for fine-tuning
    const mainDataset = {
      model_type: 'planning',
      target_model: 'Qwen/QwQ-32B-Preview',
      description: 'REALM-style planning scenarios for strategic multi-step reasoning',
      format: 'instruction_following_with_thinking',
      samples: examples.map(ex => this.formatForTraining(ex)),
      metadata: {
        total_samples: examples.length,
        complexity_distribution: this.calculateComplexityDistribution(examples),
        domain_distribution: this.calculateDomainDistribution(examples),
        avg_steps_per_plan: this.calculateAvgStepsPerPlan(examples),
        thinking_block_usage: this.calculateThinkingUsage(examples),
        exported_at: Date.now(),
        target_model_size: '32B+',
        fine_tuning_config: {
          learning_rate: 1e-5,
          batch_size: 2,
          epochs: 1,
          warmup_steps: 50,
          max_grad_norm: 0.5,
          gradient_accumulation_steps: 8,
        },
      },
    };

    // Write JSONL training data
    const jsonlPath = path.join(datasetsDir, 'planning_training.jsonl');
    const jsonlLines = mainDataset.samples.map(sample => JSON.stringify(sample)).join('\n');
    await fs.writeFile(jsonlPath, jsonlLines);

    // Write metadata
    const metadataPath = path.join(datasetsDir, 'planning_metadata.json');
    await fs.writeFile(metadataPath, JSON.stringify(mainDataset.metadata, null, 2));

    // Create complexity-specific subsets
    await this.createComplexitySubsets(examples, datasetsDir);

    // Create domain-specific subsets
    await this.createDomainSubsets(examples, datasetsDir);

    elizaLogger.info(`💾 Created planning datasets in ${datasetsDir}`);
    return datasetsDir;
  }

  /**
   * Format training example for fine-tuning
   */
  private formatForTraining(example: PlanningTrainingExample) {
    const { input, output } = example;

    // Create comprehensive system prompt
    const systemPrompt = `You are an expert strategic planner capable of complex multi-step reasoning. 
When presented with planning scenarios, you must:

1. Analyze the situation thoroughly using <thinking> blocks
2. Consider all constraints and available resources
3. Develop a comprehensive step-by-step plan
4. Assess risks and create contingency strategies
5. Provide clear success criteria and timelines

Use <thinking> blocks to work through your reasoning process before presenting your final plan.`;

    // Format input scenario
    const scenarioPrompt = `Scenario: ${input.scenario}

Objective: ${input.objective}

Constraints:
${input.constraints.map(c => `- ${c}`).join('\n')}

Context:
- Background: ${input.context.background}
- Available Resources: ${input.context.resources.join(', ')}
- Timeframe: ${input.context.timeframe}
- Stakeholders: ${input.context.stakeholders.join(', ')}
- Success Criteria: ${input.context.success_criteria.join(', ')}

Available Actions: ${input.available_actions.join(', ')}

Create a comprehensive strategic plan to achieve the objective while respecting all constraints.`;

    // Format output with thinking process
    let responseText = '';
    if (output.thinking) {
      responseText += `<thinking>\n${output.thinking}\n</thinking>\n\n`;
    }

    responseText += `# Strategic Plan\n\n## Overview\n${output.plan.overview}\n\n## Implementation Steps\n`;
    
    output.plan.steps.forEach((step, index) => {
      responseText += `\n### Step ${index + 1}: ${step.action}\n`;
      responseText += `**Reasoning:** ${step.reasoning}\n`;
      responseText += `**Expected Outcome:** ${step.expected_outcome}\n`;
      responseText += `**Timeline:** ${step.timeline}\n`;
      if (step.dependencies.length > 0) {
        responseText += `**Dependencies:** ${step.dependencies.join(', ')}\n`;
      }
    });

    responseText += `\n## Success Criteria\n${output.plan.success_criteria.map(c => `- ${c}`).join('\n')}`;
    responseText += `\n\n## Risk Assessment\n${output.plan.risk_assessment}`;
    responseText += `\n\n## Contingency Plans\n${output.plan.contingencies.map(c => `- ${c}`).join('\n')}`;
    responseText += `\n\n**Confidence Level:** ${Math.round(output.confidence * 100)}%`;

    return {
      instruction: systemPrompt,
      input: scenarioPrompt,
      output: responseText,
      metadata: {
        scenario_id: example.metadata.scenario_id,
        complexity: example.metadata.complexity,
        domain: example.metadata.domain,
        solution_quality: example.metadata.solution_quality,
        has_thinking: !!output.thinking,
        step_count: output.plan.steps.length,
        confidence_score: output.confidence,
      },
    };
  }

  /**
   * Create complexity-specific dataset subsets
   */
  private async createComplexitySubsets(examples: PlanningTrainingExample[], outputDir: string): Promise<void> {
    const complexities = ['simple', 'medium', 'complex', 'expert'];

    for (const complexity of complexities) {
      const subset = examples.filter(ex => ex.metadata.complexity === complexity);
      if (subset.length === 0) continue;

      const subsetPath = path.join(outputDir, `planning_${complexity}.jsonl`);
      const jsonlLines = subset.map(ex => JSON.stringify(this.formatForTraining(ex))).join('\n');
      await fs.writeFile(subsetPath, jsonlLines);

      elizaLogger.debug(`📁 Created ${complexity} subset: ${subset.length} examples`);
    }
  }

  /**
   * Create domain-specific dataset subsets
   */
  private async createDomainSubsets(examples: PlanningTrainingExample[], outputDir: string): Promise<void> {
    const domains = ['software_development', 'business_strategy', 'ai_research', 'project_management'];

    for (const domain of domains) {
      const subset = examples.filter(ex => ex.metadata.domain === domain);
      if (subset.length === 0) continue;

      const subsetPath = path.join(outputDir, `planning_${domain}.jsonl`);
      const jsonlLines = subset.map(ex => JSON.stringify(this.formatForTraining(ex))).join('\n');
      await fs.writeFile(subsetPath, jsonlLines);

      elizaLogger.debug(`📁 Created ${domain} subset: ${subset.length} examples`);
    }
  }

  /**
   * Store examples in training database
   */
  private async storeInDatabase(examples: PlanningTrainingExample[]): Promise<void> {
    if (!this.runtime) return;

    try {
      const dbPath = this.runtime.getSetting('TRAINING_DATABASE_URL') || 'sqlite:./training.db';
      await this.dbManager.initializeSchema();

      for (const example of examples) {
        const trainingData = {
          id: uuidv4() as any,
          modelType: 'planning' as const,
          input: {
            prompt: `Create a plan for: ${example.input.scenario}`,
            ...example.input,
          },
          output: example.output,
          conversationContext: [],
          stateData: {
            scenario_context: example.input.context,
            complexity: example.metadata.complexity,
            domain: example.metadata.domain,
          },
          metadata: {
            ...example.metadata,
            agentId: this.runtime.agentId,
            timestamp: Date.now(),
            target_model: 'Qwen/QwQ-32B-Preview',
          },
          tags: ['planning', 'realm_style', example.metadata.complexity, example.metadata.domain],
          timestamp: Date.now(),
        };

        await this.dbManager.storeTrainingData(trainingData);
      }

      elizaLogger.info(`💾 Stored ${examples.length} planning examples in database`);
      
    } catch (error) {
      elizaLogger.error('Failed to store planning data in database:', error);
    }
  }

  // Helper calculation methods
  private calculateComplexityDistribution(examples: PlanningTrainingExample[]): Record<string, number> {
    const distribution: Record<string, number> = {};
    for (const example of examples) {
      const complexity = example.metadata.complexity;
      distribution[complexity] = (distribution[complexity] || 0) + 1;
    }
    return distribution;
  }

  private calculateDomainDistribution(examples: PlanningTrainingExample[]): Record<string, number> {
    const distribution: Record<string, number> = {};
    for (const example of examples) {
      const domain = example.metadata.domain;
      distribution[domain] = (distribution[domain] || 0) + 1;
    }
    return distribution;
  }

  private calculateAvgStepsPerPlan(examples: PlanningTrainingExample[]): number {
    const totalSteps = examples.reduce((sum, ex) => sum + ex.output.plan.steps.length, 0);
    return Math.round(totalSteps / examples.length);
  }

  private calculateThinkingUsage(examples: PlanningTrainingExample[]): { 
    with_thinking: number; 
    without_thinking: number; 
    percentage: number;
  } {
    const withThinking = examples.filter(ex => !!ex.output.thinking).length;
    const withoutThinking = examples.length - withThinking;
    return {
      with_thinking: withThinking,
      without_thinking: withoutThinking,
      percentage: Math.round((withThinking / examples.length) * 100),
    };
  }

  /**
   * Export planning training data for external use
   */
  async exportForTraining(format: 'together_ai' | 'huggingface' | 'openai' = 'together_ai'): Promise<any> {
    try {
      const data = await this.dbManager.getTrainingData({ modelType: 'planning', limit: 5000 });
      
      const formattedData = data.map(item => {
        const input = JSON.parse(item.input_data);
        const output = JSON.parse(item.output_data);
        
        return this.formatForTraining({ input, output, metadata: JSON.parse(item.metadata || '{}') });
      });

      elizaLogger.info(`📊 Exported ${formattedData.length} planning training samples for ${format}`);
      
      return {
        model_type: 'planning',
        format: `${format}_compatible`,
        target_model: 'Qwen/QwQ-32B-Preview',
        samples: formattedData,
        metadata: {
          total_samples: formattedData.length,
          complexity_distribution: this.calculateComplexityFromMetadata(data),
          exported_at: Date.now(),
          intended_use: 'strategic_planning_and_multi_step_reasoning',
        },
      };
      
    } catch (error) {
      elizaLogger.error('❌ Failed to export planning training data:', error);
      throw error;
    }
  }

  private calculateComplexityFromMetadata(data: any[]): Record<string, number> {
    const distribution: Record<string, number> = {};
    for (const item of data) {
      const metadata = JSON.parse(item.metadata || '{}');
      const complexity = metadata.complexity || 'unknown';
      distribution[complexity] = (distribution[complexity] || 0) + 1;
    }
    return distribution;
  }
}