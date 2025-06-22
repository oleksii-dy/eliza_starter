/**
 * Generate Training Data Action - Main Interface for Training Data Generation
 * 
 * Provides an action interface to trigger comprehensive training data generation
 * for ElizaOS core and plugins. Creates realistic scenarios with thinking processes.
 */

import type { Action, IAgentRuntime, Memory, State, HandlerCallback } from '@elizaos/core';
import { elizaLogger } from '@elizaos/core';
import { TrainingOrchestrator, type TrainingGenerationConfig, type GenerationProgress } from '../training-generator/training-orchestrator';
import { getTrainingConfig } from '../config/training-config.js';

export const generateTrainingDataAction: Action = {
  name: 'GENERATE_TRAINING_DATA',
  similes: ['CREATE_TRAINING_DATA', 'BUILD_TRAINING_DATASET', 'GENERATE_SCENARIOS'],
  description: 'Generate comprehensive training dataset from ElizaOS core and plugins with realistic scenarios and thinking processes',

  validate: async (runtime: IAgentRuntime, message: Memory) => {
    // Check if user is requesting training data generation
    const text = message.content.text?.toLowerCase() || '';
    
    return text.includes('training') && 
           (text.includes('generate') || text.includes('create') || text.includes('build')) &&
           (text.includes('data') || text.includes('dataset') || text.includes('scenarios'));
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    options?: { [key: string]: unknown },
    callback?: HandlerCallback
  ) => {
    try {
      elizaLogger.info('🚀 Starting training data generation...');

      // Extract configuration from message with system defaults
      const config = extractConfigFromMessage(message, runtime);
      
      // Send initial response
      await callback?.({
        text: `🚀 Starting comprehensive training data generation for ElizaOS...\n\nConfiguration:\n- Workspace: ${config.workspaceDir}\n- Output: ${config.outputDir}\n- Max scenarios per plugin: ${config.maxScenariosPerPlugin}\n- Max scenarios for core: ${config.maxScenariosPerCore}\n- Include complex files: ${config.includeComplex}\n\nThis will:\n1. Clone ElizaOS core repository\n2. Discover and clone all plugin repositories\n3. Extract and analyze all code files\n4. Generate realistic user scenarios\n5. Create detailed thinking processes\n6. Export training data in Together.ai format\n\nProgress updates will follow...`,
        thought: 'Initiating comprehensive training data generation pipeline',
        actions: ['GENERATE_TRAINING_DATA']
      });

      // Create orchestrator
      const orchestrator = new TrainingOrchestrator(runtime, config);

      // Progress tracking
      let lastUpdate = 0;
      const progressCallback = async (progress: GenerationProgress) => {
        const now = Date.now();
        if (now - lastUpdate > 5000) { // Update every 5 seconds
          await callback?.({
            text: `📊 Progress Update: ${progress.phase}\n${progress.current}/${progress.total} (${Math.round(progress.current/progress.total*100)}%)\n${progress.message}`,
            thought: `Training data generation progress: ${progress.phase}`,
            actions: ['GENERATE_TRAINING_DATA']
          });
          lastUpdate = now;
        }
      };

      // Generate training dataset
      const result = await orchestrator.generateTrainingDataset(progressCallback);

      // Format final results
      const summary = formatGenerationSummary(result);

      await callback?.({
        text: `🎉 Training data generation completed successfully!\n\n${summary}\n\n📁 Output files:\n${result.outputPaths.map(p => `- ${p}`).join('\n')}\n\n💡 Next steps:\n1. Review the generated datasets\n2. Upload to Together.ai for model training\n3. Configure auto-coder to use the trained model\n4. Test the reasoning capabilities`,
        thought: 'Training data generation completed successfully with comprehensive results',
        actions: ['GENERATE_TRAINING_DATA']
      });

      // Cleanup workspace if requested
      if (config.cleanupAfter) {
        await orchestrator.cleanup();
        await callback?.({
          text: '🧹 Workspace cleaned up successfully.',
          thought: 'Workspace cleanup completed'
        });
      }

      return {
        text: `Successfully generated ${result.totalScenarios} training scenarios`,
        data: {
          result,
          outputPaths: result.outputPaths,
          statistics: result.statistics
        }
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      elizaLogger.error('❌ Training data generation failed:', error);

      await callback?.({
        text: `❌ Training data generation failed: ${errorMessage}\n\nPlease check the logs for more details. Common issues:\n- Network connectivity for repository cloning\n- Insufficient disk space\n- Missing dependencies\n- API rate limits`,
        thought: `Training data generation failed: ${errorMessage}`,
        actions: ['GENERATE_TRAINING_DATA']
      });

      throw error;
    }
  },

  examples: [
    [
      {
        name: 'User',
        content: {
          text: 'Generate training data for ElizaOS to train our reasoning model'
        }
      },
      {
        name: 'Assistant',
        content: {
          text: '🚀 Starting comprehensive training data generation for ElizaOS...',
          thought: 'User wants to generate training data for model fine-tuning',
          actions: ['GENERATE_TRAINING_DATA']
        }
      }
    ],
    [
      {
        name: 'User',
        content: {
          text: 'Create a training dataset from all ElizaOS plugins and core code with detailed scenarios'
        }
      },
      {
        name: 'Assistant',
        content: {
          text: '🚀 Starting comprehensive training data generation for ElizaOS...',
          thought: 'User requests comprehensive dataset creation with detailed scenarios',
          actions: ['GENERATE_TRAINING_DATA']
        }
      }
    ],
    [
      {
        name: 'User',
        content: {
          text: 'Build training scenarios for fine-tuning a coding model on ElizaOS patterns'
        }
      },
      {
        name: 'Assistant',
        content: {
          text: '🚀 Starting comprehensive training data generation for ElizaOS...',
          thought: 'User wants to create training data for coding model fine-tuning',
          actions: ['GENERATE_TRAINING_DATA']
        }
      }
    ]
  ]
};

/**
 * Extract configuration from user message with system defaults
 */
function extractConfigFromMessage(message: Memory, runtime: IAgentRuntime): Partial<TrainingGenerationConfig> & { cleanupAfter?: boolean } {
  const text = message.content.text?.toLowerCase() || '';
  const systemConfig = getTrainingConfig(runtime);
  const dataConfig = systemConfig.getDataConfig();
  
  // Start with system defaults
  const config: Partial<TrainingGenerationConfig> & { cleanupAfter?: boolean } = {
    workspaceDir: dataConfig.paths.temp,
    outputDir: dataConfig.paths.datasets,
    maxScenariosPerPlugin: Math.floor(dataConfig.processing.maxDataPoints / 20), // Distribute across plugins
    maxScenariosPerCore: dataConfig.processing.maxDataPoints,
    includeComplex: true,
    includeTests: false,
    includeConfig: false,
    temperature: 0.7,
  };

  // Extract workspace directory
  const workspaceMatch = text.match(/workspace[:\s]+([^\s]+)/i);
  if (workspaceMatch) {
    config.workspaceDir = workspaceMatch[1];
  }

  // Extract output directory
  const outputMatch = text.match(/output[:\s]+([^\s]+)/i);
  if (outputMatch) {
    config.outputDir = outputMatch[1];
  }

  // Extract max scenarios
  const maxScenariosMatch = text.match(/(?:max|maximum)\s+scenarios?[:\s]+(\d+)/i);
  if (maxScenariosMatch) {
    const maxScenarios = parseInt(maxScenariosMatch[1]);
    config.maxScenariosPerPlugin = Math.floor(maxScenarios / 10); // Distribute across plugins
    config.maxScenariosPerCore = maxScenarios;
  }

  // Check for inclusion flags
  if (text.includes('include test') || text.includes('with test')) {
    config.includeTests = true;
  }
  if (text.includes('include config') || text.includes('with config')) {
    config.includeConfig = true;
  }
  if (text.includes('simple only') || text.includes('exclude complex')) {
    config.includeComplex = false;
  }

  // Check for cleanup preference
  if (text.includes('cleanup') || text.includes('clean up')) {
    config.cleanupAfter = true;
  }

  // Extract temperature
  const tempMatch = text.match(/temperature[:\s]+([\d.]+)/i);
  if (tempMatch) {
    config.temperature = parseFloat(tempMatch[1]);
  }

  return config;
}

/**
 * Format generation results summary
 */
function formatGenerationSummary(result: any): string {
  const { totalScenarios, coreScenarios, pluginScenarios, docScenarios, totalTokens, processingTime, statistics } = result;

  const processingTimeStr = processingTime > 60000 
    ? `${Math.round(processingTime / 60000)}m ${Math.round((processingTime % 60000) / 1000)}s`
    : `${Math.round(processingTime / 1000)}s`;

  const tokenCountStr = totalTokens > 1000000 
    ? `${(totalTokens / 1000000).toFixed(1)}M`
    : `${Math.round(totalTokens / 1000)}K`;

  return `📊 Generation Summary:
• Total Scenarios: ${totalScenarios.toLocaleString()}
  - Core Framework: ${coreScenarios.toLocaleString()}
  - Plugins: ${pluginScenarios.toLocaleString()}
  - Documentation: ${docScenarios.toLocaleString()}

• Token Count: ${tokenCountStr} tokens
• Processing Time: ${processingTimeStr}

• Repositories Processed:
  - Core: ${statistics.repositories.core}
  - Plugins: ${statistics.repositories.plugins}
  - Failed: ${statistics.repositories.failed}

• Files Analyzed:
  - Total: ${statistics.files.total.toLocaleString()}
  - TypeScript: ${statistics.files.typescript.toLocaleString()}
  - JavaScript: ${statistics.files.javascript.toLocaleString()}
  - Markdown: ${statistics.files.markdown.toLocaleString()}

• Scenario Complexity:
  - Simple: ${statistics.scenarios.simple.toLocaleString()}
  - Medium: ${statistics.scenarios.medium.toLocaleString()}
  - Complex: ${statistics.scenarios.complex.toLocaleString()}

• ElizaOS Components:
  - Actions: ${statistics.components.actions}
  - Providers: ${statistics.components.providers}
  - Evaluators: ${statistics.components.evaluators}
  - Services: ${statistics.components.services}`;
}

elizaLogger.info('✅ Generate training data action loaded');