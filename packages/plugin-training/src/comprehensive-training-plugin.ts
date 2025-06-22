/**
 * Comprehensive Training Plugin - Complete Training Data Generation and Model Training
 * 
 * This plugin provides the full training pipeline from data generation to model deployment:
 * - Repository cloning and code analysis
 * - Training scenario generation with thinking processes
 * - Together.ai model training and monitoring
 * - Auto-coder integration with reasoning proxy
 * - Comprehensive progress tracking and statistics
 */

import type { Plugin, IAgentRuntime } from '@elizaos/core';
import { elizaLogger } from '@elizaos/core';
// import { ReasoningService } from './services/reasoning'; // Not implemented yet
import { ReasoningProxyService } from './services/reasoning-proxy';
import { generateTrainingDataAction } from './actions/generate-training-data';
import { trainModelAction } from './actions/train-model';
import { checkTrainingStatusAction } from './actions/check-training-status';
import { configureAutoCoderAction } from './actions/configure-autocoder';

export const comprehensiveTrainingPlugin: Plugin = {
  name: '@elizaos/plugin-training-comprehensive',
  description: 'Complete training pipeline: data generation, model training, and auto-coder integration',
  
  services: [ReasoningProxyService as any],
  
  actions: [
    generateTrainingDataAction,
    trainModelAction,
    checkTrainingStatusAction,
    configureAutoCoderAction
  ],

  async init(config: Record<string, string>, runtime: IAgentRuntime): Promise<void> {
    elizaLogger.info('🚀 Initializing Comprehensive Training Plugin...');
    elizaLogger.info('');

    // Check core requirements
    const coreRequirements = ['OPENAI_API_KEY'];
    const missingCore = coreRequirements.filter(req => !runtime.getSetting(req));
    
    if (missingCore.length > 0) {
      elizaLogger.error(`❌ Missing core requirements: ${missingCore.join(', ')}`);
      elizaLogger.error('   Training data generation requires OpenAI API access');
      return;
    }

    // Check Together.ai configuration
    const togetherApiKey = runtime.getSetting('TOGETHER_API_KEY');
    if (!togetherApiKey) {
      elizaLogger.warn('⚠️  TOGETHER_API_KEY not found');
      elizaLogger.warn('   Model training and auto-coder features will be limited');
      elizaLogger.warn('   Get your API key from: https://api.together.xyz/');
    } else {
      elizaLogger.info('✅ Together.ai API key configured');
    }

    // Check optional GitHub configuration for advanced features
    const githubToken = runtime.getSetting('GITHUB_TOKEN');
    if (!githubToken) {
      elizaLogger.warn('⚠️  GITHUB_TOKEN not configured');
      elizaLogger.warn('   Repository cloning may hit rate limits');
      elizaLogger.warn('   Set a personal access token for better performance');
    } else {
      elizaLogger.info('✅ GitHub token configured for repository access');
    }

    // Initialize services
    elizaLogger.info('');
    elizaLogger.info('🔧 Initializing services...');
    
    const reasoningService = runtime.getService('reasoning');
    if (reasoningService) {
      elizaLogger.info('✅ Reasoning service ready');
    } else {
      elizaLogger.warn('⚠️  Reasoning service not available');
    }

    const proxyService = runtime.getService('reasoning_proxy');
    if (proxyService) {
      elizaLogger.info('✅ Reasoning proxy service ready');
      
      const status = (proxyService as any).getStatus?.();
      if (status?.enabled && status?.healthy) {
        elizaLogger.info('🚀 Auto-coder integration active');
      } else if (status?.enabled && !status?.healthy) {
        elizaLogger.info('🔧 Auto-coder integration enabled but needs configuration');
      } else {
        elizaLogger.info('💤 Auto-coder integration disabled');
      }
    } else {
      elizaLogger.warn('⚠️  Reasoning proxy service not available');
    }

    elizaLogger.info('');
    elizaLogger.info('📚 Available Actions:');
    elizaLogger.info('   GENERATE_TRAINING_DATA - Create comprehensive training datasets');
    elizaLogger.info('   TRAIN_MODEL           - Fine-tune models on Together.ai');
    elizaLogger.info('   CHECK_TRAINING_STATUS - Monitor training progress');
    elizaLogger.info('   CONFIGURE_AUTOCODER   - Setup auto-coder integration');

    elizaLogger.info('');
    elizaLogger.info('🎯 Quick Start Guide:');
    elizaLogger.info('   1. "Generate training data for ElizaOS"');
    elizaLogger.info('   2. "Train a model using the generated data"');
    elizaLogger.info('   3. "Check training status"');
    elizaLogger.info('   4. "Configure auto-coder with the trained model"');

    elizaLogger.info('');
    elizaLogger.info('⚙️  Configuration Options:');
    elizaLogger.info('   Environment Variables:');
    elizaLogger.info('   - TOGETHER_API_KEY: Together.ai API key for model training');
    elizaLogger.info('   - GITHUB_TOKEN: GitHub personal access token (optional)');
    elizaLogger.info('   - ELIZAOS_FINETUNED_MODEL: Specific model ID to use');
    elizaLogger.info('   - REASONING_PROXY_ENABLED: Enable/disable auto-coder proxy');
    elizaLogger.info('   - REASONING_TEMPERATURE: Model temperature (default: 0.1)');
    elizaLogger.info('   - REASONING_MAX_TOKENS: Max tokens per request (default: 4000)');

    elizaLogger.info('');
    elizaLogger.info('📊 Training Pipeline Features:');
    elizaLogger.info('   ✅ ElizaOS core repository analysis');
    elizaLogger.info('   ✅ Plugin repository discovery and cloning');
    elizaLogger.info('   ✅ Comprehensive file extraction and analysis');
    elizaLogger.info('   ✅ Realistic user scenario generation');
    elizaLogger.info('   ✅ Detailed thinking process creation');
    elizaLogger.info('   ✅ Together.ai JSONL format export');
    elizaLogger.info('   ✅ Model training job management');
    elizaLogger.info('   ✅ Training progress monitoring');
    elizaLogger.info('   ✅ Auto-coder integration with proxy');
    elizaLogger.info('   ✅ Automatic fallback to base models');

    elizaLogger.info('');
    elizaLogger.info('🎉 Comprehensive Training Plugin initialized successfully!');
    
    // Log current model status if available
    if (togetherApiKey && proxyService) {
      try {
        const availableModels = await (proxyService as any).getAvailableModels?.();
        if (availableModels && availableModels.length > 0) {
          elizaLogger.info('');
          elizaLogger.info(`🤖 Available fine-tuned models: ${availableModels.length}`);
          elizaLogger.info(`   Latest: ${availableModels[0]}`);
        }
      } catch (error) {
        // Silently ignore - this is just informational
      }
    }
  }
};

export default comprehensiveTrainingPlugin;

// Export all components for external use
export { generateTrainingDataAction } from './actions/generate-training-data';
export { trainModelAction } from './actions/train-model';
export { checkTrainingStatusAction } from './actions/check-training-status';
export { configureAutoCoderAction } from './actions/configure-autocoder';
// export { ReasoningService } from './services/reasoning'; // Not implemented yet
export { ReasoningProxyService } from './services/reasoning-proxy';

// Export training generator infrastructure
export { TrainingOrchestrator } from './training-generator/training-orchestrator';
export { RepositoryCloner } from './training-generator/core/repo-cloner';
export { FileExtractor } from './training-generator/core/file-extractor';
export { ScenarioGenerator } from './training-generator/core/scenario-generator';
export { PluginProcessor } from './training-generator/plugins/plugin-processor';
export { DatasetBuilder } from './training-generator/output/dataset-builder';

// Export types
export type { 
  TrainingScenario,
  TrainingGenerationConfig,
  GenerationProgress,
  GenerationResult
} from './training-generator/training-orchestrator';

export type {
  ExtractedFile,
  ExtractionResult
} from './training-generator/core/file-extractor';

export type {
  ReasoningProxyConfig
} from './services/reasoning-proxy';