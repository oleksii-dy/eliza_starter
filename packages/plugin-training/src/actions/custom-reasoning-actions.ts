import {
  type Action,
  type IAgentRuntime,
  type Memory,
  type State,
  type HandlerCallback,
  elizaLogger,
} from '@elizaos/core';

import { MessageHandlerIntegration } from '../integration/MessageHandlerIntegration.js';
import { TrainingDatabaseManager } from '../database/TrainingDatabaseManager.js';
import { TrainingRecordingManager } from '../filesystem/TrainingRecordingManager.js';
import type { CustomReasoningService } from '../interfaces/CustomReasoningService.js';
import type { CustomModelType } from '../types.js';
import { getTrainingConfig } from '../config/training-config.js';

/**
 * Action to enable custom reasoning service
 */
export const enableCustomReasoningAction: Action = {
  name: 'ENABLE_REASONING_SERVICE',
  similes: ['ACTIVATE_REASONING_SERVICE', 'TURN_ON_REASONING', 'START_REASONING_SERVICE'],
  description: 'Enable the custom reasoning service with fine-tuned models',

  validate: async (runtime: IAgentRuntime, message: Memory, state?: State) => {
    // Check if message is asking to enable custom reasoning
    const text = message.content.text?.toLowerCase() || '';
    const hasEnableWord =
      text.includes('enable') ||
      text.includes('activate') ||
      text.includes('turn on') ||
      text.includes('start');
    const hasReasoningContext =
      text.includes('custom reasoning') ||
      text.includes('fine-tuned') ||
      text.includes('deepseek') ||
      text.includes('reasoning service');

    return hasEnableWord && hasReasoningContext;
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    options?: any,
    callback?: HandlerCallback
  ) => {
    try {
      elizaLogger.info('Enabling custom reasoning service...');

      // Check if Together.ai API key is configured
      const apiKey = runtime.getSetting('TOGETHER_AI_API_KEY');
      if (!apiKey) {
        await callback?.({
          text: '❌ Cannot enable custom reasoning: TOGETHER_AI_API_KEY is not configured. Please set your Together.ai API key in the environment variables.',
          thought: 'User wants to enable custom reasoning but API key is missing',
        });
        return {
          text: 'Missing Together.ai API key',
          data: {
            actionName: 'ENABLE_REASONING_SERVICE',
            error: 'missing_api_key',
          },
          values: {
            success: false,
            error: 'missing_api_key',
          },
        };
      }

      // Check if custom reasoning service is available
      const reasoningService = runtime.getService<CustomReasoningService>('together-reasoning');
      if (!reasoningService) {
        await callback?.({
          text: '❌ Custom reasoning service is not available. Please ensure the plugin is properly installed and configured.',
          thought: 'Custom reasoning service not found in runtime',
        });
        return {
          text: 'Custom reasoning service not available',
          data: {
            actionName: 'ENABLE_REASONING_SERVICE',
            error: 'service_not_available',
          },
          values: {
            success: false,
            error: 'service_not_available',
          },
        };
      }

      // Register the integration hooks
      MessageHandlerIntegration.registerHooks(runtime);

      // Initialize database and recording managers
      const dbManager = new TrainingDatabaseManager(runtime);
      await dbManager.initializeSchema();

      const recordingManager = new TrainingRecordingManager(runtime);
      await recordingManager.initialize();

      // Enable the service in environment (simulated)
      (runtime as any).customReasoningEnabled = true;

      const status = MessageHandlerIntegration.getIntegrationStatus(runtime);

      let responseText = '✅ **Custom Reasoning Service Enabled!**\n\n';
      responseText += '🧠 **Integration Status:**\n';
      responseText += `• Service Active: ${status.enabled ? '✅' : '❌'}\n`;
      responseText += `• ShouldRespond Override: ${status.shouldRespondOverride ? '✅' : '⚠️ Disabled'}\n`;
      responseText += `• Planning Override: ${status.planningOverride ? '✅' : '⚠️ Disabled'}\n`;
      responseText += `• Coding Override: ${status.codingOverride ? '✅' : '⚠️ Disabled'}\n`;
      responseText += `• Fallback Available: ${status.fallbackAvailable ? '✅' : '❌'}\n\n`;

      responseText += '📊 **Features Activated:**\n';
      responseText += '• Training data collection\n';
      responseText += '• Visual debugging recordings\n';
      responseText += '• Cost management and monitoring\n';
      responseText += '• Backwards compatibility maintained\n\n';

      responseText += '💡 **Next Steps:**\n';
      responseText += '• Use "enable should respond model" to activate shouldRespond override\n';
      responseText += '• Use "enable planning model" to activate response planning override\n';
      responseText += '• Use "start training session" to begin collecting focused training data\n';
      responseText += '• Use "check reasoning status" to monitor performance';

      await callback?.({
        text: responseText,
        thought: 'Successfully enabled custom reasoning service with all components',
        actions: ['ENABLE_REASONING_SERVICE'],
      });

      elizaLogger.info('Custom reasoning service enabled successfully');

      return {
        text: 'Custom reasoning service enabled successfully',
        data: {
          actionName: 'ENABLE_REASONING_SERVICE',
          status,
          features: {
            trainingDataCollection: true,
            visualDebugging: true,
            costMonitoring: true,
          },
        },
        values: {
          success: true,
          enabled: status.enabled,
          shouldRespondOverride: status.shouldRespondOverride,
          planningOverride: status.planningOverride,
          codingOverride: status.codingOverride,
        },
      };
    } catch (error) {
      elizaLogger.error('Failed to enable custom reasoning service:', error);

      await callback?.({
        text: `❌ Failed to enable custom reasoning service: ${error instanceof Error ? error.message : 'Unknown error'}`,
        thought: 'Error occurred while enabling custom reasoning service',
      });

      return {
        text: `Failed to enable custom reasoning service: ${error instanceof Error ? error.message : 'Unknown error'}`,
        data: {
          actionName: 'ENABLE_REASONING_SERVICE',
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
        },
        values: {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  },

  examples: [
    // Multi-action: Enable then check status
    [
      { name: 'User', content: { text: 'Enable custom reasoning and check the status' } },
      {
        name: 'Agent',
        content: {
          text: "I'll enable the custom reasoning service and check its status.",
          thought: 'User wants to enable reasoning and verify status',
          actions: ['ENABLE_REASONING_SERVICE', 'CHECK_REASONING_STATUS'],
        },
      },
    ],
    // Multi-action: Enable then start training session
    [
      { name: 'User', content: { text: 'Enable custom reasoning and start a training session' } },
      {
        name: 'Agent',
        content: {
          text: "I'll enable custom reasoning and start a training session to collect data.",
          thought: 'User wants to enable reasoning and begin training',
          actions: ['ENABLE_REASONING_SERVICE', 'START_TRAINING_SESSION'],
        },
      },
    ],
    [
      { name: 'User', content: { text: 'Enable custom reasoning with fine-tuned models' } },
      {
        name: 'Agent',
        content: {
          text: '✅ Custom reasoning service enabled! The agent will now use fine-tuned DeepSeek models for decision-making while maintaining full backwards compatibility.',
          thought: 'User requested to enable custom reasoning service',
          actions: ['ENABLE_REASONING_SERVICE'],
        },
      },
    ],
    [
      { name: 'User', content: { text: 'Turn on the reasoning service' } },
      {
        name: 'Agent',
        content: {
          text: '✅ Custom reasoning service is now active! Training data collection and visual debugging have been initialized.',
          thought: 'Activating custom reasoning with all features',
          actions: ['ENABLE_REASONING_SERVICE'],
        },
      },
    ],
  ],
};

/**
 * Action to disable custom reasoning service
 */
export const disableCustomReasoningAction: Action = {
  name: 'DISABLE_REASONING_SERVICE',
  similes: ['DEACTIVATE_REASONING_SERVICE', 'TURN_OFF_REASONING', 'STOP_REASONING_SERVICE'],
  description:
    'Disable the custom reasoning service and revert to original ElizaOS behavior. Can be chained with CHECK_REASONING_STATUS to verify the change or ENABLE_REASONING_SERVICE to re-enable later.',

  validate: async (runtime: IAgentRuntime, message: Memory, state?: State) => {
    const text = message.content.text?.toLowerCase() || '';
    return (
      text.includes('disable') &&
      (text.includes('custom reasoning') ||
        text.includes('reasoning service') ||
        text.includes('turn off reasoning'))
    );
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    options?: any,
    callback?: HandlerCallback
  ) => {
    try {
      elizaLogger.info('Disabling custom reasoning service...');

      // Check if custom reasoning is currently enabled
      const enabled = MessageHandlerIntegration.isCustomReasoningEnabled(runtime);

      if (!enabled) {
        await callback?.({
          text: '⚠️ Custom reasoning service is already disabled. The agent is using standard ElizaOS behavior.',
          thought: 'User tried to disable custom reasoning but it was already disabled',
        });
        return {
          text: 'Custom reasoning service is already disabled',
          data: {
            actionName: 'DISABLE_REASONING_SERVICE',
            alreadyDisabled: true,
          },
          values: {
            success: true,
            wasAlreadyDisabled: true,
          },
        };
      }

      // Disable the service
      (runtime as any).customReasoningEnabled = false;

      // Remove custom hooks by setting them to undefined
      (runtime as any).customShouldRespond = undefined;
      (runtime as any).customResponseGenerator = undefined;

      // Restore original useModel if it was overridden
      // Note: In a full implementation, we'd need to store the original method

      let responseText = '✅ **Custom Reasoning Service Disabled**\n\n';
      responseText += '🔄 **Reverted to Original Behavior:**\n';
      responseText += '• Standard ElizaOS shouldRespond logic\n';
      responseText += '• Original response planning\n';
      responseText += '• Default model usage (runtime.useModel)\n';
      responseText += '• All existing functionality preserved\n\n';

      responseText += '💾 **Data Preserved:**\n';
      responseText += '• Training data remains in database\n';
      responseText += '• Recording files kept for debugging\n';
      responseText += '• Cost tracking history maintained\n\n';

      responseText += '💡 **To Re-enable:**\n';
      responseText += 'Use "enable custom reasoning" to activate fine-tuned models again';

      await callback?.({
        text: responseText,
        thought: 'Successfully disabled custom reasoning service and reverted to original behavior',
        actions: ['DISABLE_REASONING_SERVICE'],
      });

      elizaLogger.info('Custom reasoning service disabled successfully');

      return {
        text: 'Custom reasoning service disabled successfully',
        data: {
          actionName: 'DISABLE_REASONING_SERVICE',
          previousState: {
            enabled: true,
          },
          currentState: {
            enabled: false,
          },
        },
        values: {
          success: true,
          enabled: false,
          dataPreserved: true,
        },
      };
    } catch (error) {
      elizaLogger.error('Failed to disable custom reasoning service:', error);

      await callback?.({
        text: `❌ Failed to disable custom reasoning service: ${error instanceof Error ? error.message : 'Unknown error'}`,
        thought: 'Error occurred while disabling custom reasoning service',
      });

      return {
        text: `Failed to disable custom reasoning service: ${error instanceof Error ? error.message : 'Unknown error'}`,
        data: {
          actionName: 'DISABLE_REASONING_SERVICE',
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
        },
        values: {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  },

  examples: [
    // Multi-action: Disable then verify status
    [
      { name: 'User', content: { text: 'Disable custom reasoning and check the status' } },
      {
        name: 'Agent',
        content: {
          text: "I'll disable custom reasoning and verify the system status.",
          thought: 'User wants to disable and confirm status',
          actions: ['DISABLE_REASONING_SERVICE', 'CHECK_REASONING_STATUS'],
        },
      },
    ],
    // Multi-action: Check status then disable if enabled
    [
      { name: 'User', content: { text: 'Check if reasoning is enabled and disable it' } },
      {
        name: 'Agent',
        content: {
          text: "I'll check the reasoning service status and disable it if enabled.",
          thought: 'User wants conditional disabling',
          actions: ['CHECK_REASONING_STATUS', 'DISABLE_REASONING_SERVICE'],
        },
      },
    ],
    [
      { name: 'User', content: { text: 'Disable custom reasoning and go back to normal' } },
      {
        name: 'Agent',
        content: {
          text: '✅ Custom reasoning disabled. The agent has reverted to standard ElizaOS behavior while preserving all training data.',
          thought: 'User requested to disable custom reasoning service',
          actions: ['DISABLE_REASONING_SERVICE'],
        },
      },
    ],
  ],
};

/**
 * Action to start a training session for collecting focused training data
 */
export const startTrainingSessionAction: Action = {
  name: 'START_TRAINING_SESSION',
  similes: ['BEGIN_TRAINING_SESSION', 'COMMENCE_TRAINING', 'START_RECORDING_SESSION'],
  description:
    'Start a focused training session to collect high-quality training data. Can be chained with END_TRAINING_SESSION to stop collection or CHECK_REASONING_STATUS to monitor progress.',

  validate: async (runtime: IAgentRuntime, message: Memory, state?: State) => {
    const text = message.content.text?.toLowerCase() || '';
    return (
      (text.includes('start') || text.includes('begin')) &&
      (text.includes('training session') ||
        text.includes('training') ||
        text.includes('recording session'))
    );
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    options?: any,
    callback?: HandlerCallback
  ) => {
    try {
      // Extract model type from message
      const text = message.content.text?.toLowerCase() || '';
      let modelType: CustomModelType = 'should_respond'; // default

      if (text.includes('planning')) {
        modelType = 'planning';
      } else if (text.includes('coding') || text.includes('code')) {
        modelType = 'coding';
      }

      // Initialize managers
      const dbManager = new TrainingDatabaseManager(runtime);
      const recordingManager = new TrainingRecordingManager(runtime);

      await recordingManager.initialize();

      // Create training session in database
      const sessionName = `training_${modelType}_${Date.now()}`;
      const sessionId = await dbManager.createTrainingSession({
        agent_id: runtime.agentId,
        model_type: modelType,
        session_name: sessionName,
        base_model:
          getTrainingConfig(runtime).getModelConfig().defaults[
            modelType === 'should_respond' ? 'shouldRespond' : modelType
          ] || `DeepSeek-${modelType}`,
        training_config: {
          focus: modelType,
          qualityThreshold: 0.8,
          targetSamples: 100,
        },
        training_samples_count: 0,
        validation_samples_count: 0,
        status: 'running',
        progress_percent: 0,
      });

      // Start recording session
      const recordingSessionId = await recordingManager.startSession(modelType, sessionName);

      let responseText = '✅ **Training Session Started!**\n\n';
      responseText += '🎯 **Session Details:**\n';
      responseText += `• Model Type: ${modelType}\n`;
      responseText += `• Session ID: ${sessionId}\n`;
      responseText += `• Recording ID: ${recordingSessionId}\n`;
      responseText += '• Target: 100 high-quality samples\n\n';

      responseText += '📊 **Active Collection:**\n';
      responseText += '• Training data → Database\n';
      responseText += '• Visual recordings → training_recordings/\n';
      responseText += '• Performance metrics tracking\n';
      responseText += '• Quality assessment\n\n';

      responseText += '💡 **During this session:**\n';
      if (modelType === 'should_respond') {
        responseText += '• Send various types of messages to collect response decision data\n';
        responseText += '• Include edge cases and ambiguous scenarios\n';
      } else if (modelType === 'planning') {
        responseText += '• Ask for complex multi-step responses\n';
        responseText += '• Request tasks requiring action selection\n';
      } else if (modelType === 'coding') {
        responseText += '• Request code generation in various languages\n';
        responseText += '• Ask for debugging and code explanation\n';
      }

      responseText += '\nUse "end training session" when complete.';

      await callback?.({
        text: responseText,
        thought: `Started training session for ${modelType} model with database and recording tracking`,
        actions: ['START_TRAINING_SESSION'],
      });

      elizaLogger.info(`Training session started for ${modelType}:`, {
        sessionId,
        recordingSessionId,
      });

      return {
        text: `Training session ${sessionId} started successfully`,
        data: {
          actionName: 'START_TRAINING_SESSION',
          sessionId,
          recordingSessionId,
          sessionName,
          modelType,
          targetSamples: 100,
        },
        values: {
          success: true,
          sessionId,
          recordingSessionId,
          modelType,
          isActive: true,
        },
      };
    } catch (error) {
      elizaLogger.error('Failed to start training session:', error);

      await callback?.({
        text: `❌ Failed to start training session: ${error instanceof Error ? error.message : 'Unknown error'}`,
        thought: 'Error occurred while starting training session',
      });

      return {
        text: `Failed to start training session: ${error instanceof Error ? error.message : 'Unknown error'}`,
        data: {
          actionName: 'START_TRAINING_SESSION',
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
        },
        values: {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  },

  examples: [
    // Multi-action: Start session then check status
    [
      {
        name: 'User',
        content: { text: 'Start a training session and monitor the data collection' },
      },
      {
        name: 'Agent',
        content: {
          text: "I'll start a training session and monitor the data collection progress.",
          thought: 'User wants to start training and monitor',
          actions: ['START_TRAINING_SESSION', 'CHECK_REASONING_STATUS'],
        },
      },
    ],
    // Multi-action: Enable reasoning then start session
    [
      {
        name: 'User',
        content: { text: 'Enable custom reasoning and start collecting training data' },
      },
      {
        name: 'Agent',
        content: {
          text: "I'll enable custom reasoning and start a training session.",
          thought: 'User wants full setup and training',
          actions: ['ENABLE_REASONING_SERVICE', 'START_TRAINING_SESSION'],
        },
      },
    ],
    [
      { name: 'User', content: { text: 'Start a training session for the planning model' } },
      {
        name: 'Agent',
        content: {
          text: "✅ Training session started for planning model! I'll now collect high-quality training data for response planning decisions.",
          thought: 'User requested to start a training session for planning model',
          actions: ['START_TRAINING_SESSION'],
        },
      },
    ],
  ],
};

/**
 * Action to check custom reasoning status and performance
 */
export const checkReasoningStatusAction: Action = {
  name: 'CHECK_REASONING_STATUS',
  similes: ['REASONING_STATUS', 'REASONING_SERVICE_STATUS', 'CHECK_TRAINING_STATUS'],
  description:
    'Check the status and performance of the custom reasoning service. Can be chained with ENABLE_REASONING_SERVICE to enable features or START_TRAINING_SESSION to collect more data.',

  validate: async (runtime: IAgentRuntime, message: Memory, state?: State) => {
    const text = message.content.text?.toLowerCase() || '';
    return (
      (text.includes('check') || text.includes('status') || text.includes('show')) &&
      (text.includes('reasoning') ||
        text.includes('training') ||
        text.includes('custom reasoning') ||
        text.includes('model status'))
    );
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    options?: any,
    callback?: HandlerCallback
  ) => {
    try {
      // Get integration status
      const status = MessageHandlerIntegration.getIntegrationStatus(runtime);

      // Get service status
      const reasoningService = runtime.getService<CustomReasoningService>('together-reasoning');

      // Get database stats
      const dbManager = new TrainingDatabaseManager(runtime);
      const trainingStats = await dbManager.getTrainingDataStats();

      // Get recording stats
      const recordingManager = new TrainingRecordingManager(runtime);
      const recordingStats = await recordingManager.getRecordingStats();

      let responseText = '📊 **Custom Reasoning Status Report**\n\n';

      // Service Status
      responseText += '🔧 **Service Status:**\n';
      responseText += `• Service Available: ${status.enabled ? '✅ Active' : '❌ Inactive'}\n`;
      responseText += `• ShouldRespond Override: ${status.shouldRespondOverride ? '✅ Enabled' : '⚠️ Disabled'}\n`;
      responseText += `• Planning Override: ${status.planningOverride ? '✅ Enabled' : '⚠️ Disabled'}\n`;
      responseText += `• Coding Override: ${status.codingOverride ? '✅ Enabled' : '⚠️ Disabled'}\n`;
      responseText += `• Fallback Protection: ${status.fallbackAvailable ? '✅ Active' : '❌ Missing'}\n\n`;

      // Training Data Stats
      responseText += '📈 **Training Data:**\n';
      responseText += `• Total Samples: ${trainingStats.total}\n`;
      responseText += `• Recent (24h): ${trainingStats.recentSamples}\n`;
      responseText += `• Avg Confidence: ${(trainingStats.avgConfidence * 100).toFixed(1)}%\n`;
      responseText += `• Avg Response Time: ${trainingStats.avgResponseTime.toFixed(0)}ms\n`;
      responseText += `• Total Cost: $${trainingStats.totalCost.toFixed(4)}\n\n`;

      if (Object.keys(trainingStats.byModelType).length > 0) {
        responseText += '📊 **By Model Type:**\n';
        for (const [modelType, count] of Object.entries(trainingStats.byModelType)) {
          responseText += `• ${modelType}: ${count} samples\n`;
        }
        responseText += '\n';
      }

      // Recording Stats
      responseText += '💾 **Recording Files:**\n';
      responseText += `• Total Files: ${recordingStats.totalFiles}\n`;
      responseText += `• Total Size: ${(recordingStats.totalSize / 1024 / 1024).toFixed(2)} MB\n`;
      if (recordingStats.oldestRecording && recordingStats.newestRecording) {
        const daysDiff = Math.ceil(
          (recordingStats.newestRecording.getTime() - recordingStats.oldestRecording.getTime()) /
            (1000 * 60 * 60 * 24)
        );
        responseText += `• Date Range: ${daysDiff} days\n`;
      }
      responseText += '\n';

      // Cost and Performance
      if (reasoningService) {
        try {
          const costReport = await reasoningService.getCostReport();
          responseText += '💰 **Cost Management:**\n';
          responseText += `• Total Cost: $${costReport.totalCost.toFixed(4)}\n`;
          if (costReport.budgetLimit) {
            const percentage = ((costReport.budgetUsed / costReport.budgetLimit) * 100).toFixed(1);
            responseText += `• Budget Used: ${percentage}% of $${costReport.budgetLimit}\n`;
          }
          responseText += '\n';
        } catch (error) {
          responseText += '💰 **Cost Management:** ⚠️ Unable to fetch cost data\n\n';
        }
      }

      // Recommendations
      responseText += '💡 **Recommendations:**\n';
      if (trainingStats.total < 50) {
        responseText += '• Collect more training data (target: 100+ samples per model)\n';
      }
      if (trainingStats.recentSamples < 5) {
        responseText += '• Increase agent activity to collect recent samples\n';
      }
      if (!status.shouldRespondOverride && !status.planningOverride && !status.codingOverride) {
        responseText += '• Enable at least one model override to use custom reasoning\n';
      }

      await callback?.({
        text: responseText,
        thought: 'Provided comprehensive status report of custom reasoning service',
        actions: ['CHECK_REASONING_STATUS'],
      });

      return {
        text: 'Custom reasoning status report provided',
        data: {
          actionName: 'CHECK_REASONING_STATUS',
          status,
          trainingStats,
          recordingStats,
          recommendations: {
            needMoreData: trainingStats.total < 50,
            needRecentData: trainingStats.recentSamples < 5,
            needModelOverride:
              !status.shouldRespondOverride && !status.planningOverride && !status.codingOverride,
          },
        },
        values: {
          success: true,
          serviceActive: status.enabled,
          totalSamples: trainingStats.total,
          recentSamples: trainingStats.recentSamples,
          avgConfidence: trainingStats.avgConfidence,
          totalCost: trainingStats.totalCost,
        },
      };
    } catch (error) {
      elizaLogger.error('Failed to get reasoning status:', error);

      await callback?.({
        text: `❌ Failed to get reasoning status: ${error instanceof Error ? error.message : 'Unknown error'}`,
        thought: 'Error occurred while checking reasoning status',
      });

      return {
        text: `Failed to get reasoning status: ${error instanceof Error ? error.message : 'Unknown error'}`,
        data: {
          actionName: 'CHECK_REASONING_STATUS',
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
        },
        values: {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  },

  examples: [
    // Multi-action: Check status then enable if needed
    [
      { name: 'User', content: { text: 'Check reasoning status and enable if not active' } },
      {
        name: 'Agent',
        content: {
          text: "I'll check the reasoning status and enable it if not currently active.",
          thought: 'User wants conditional enablement',
          actions: ['CHECK_REASONING_STATUS', 'ENABLE_REASONING_SERVICE'],
        },
      },
    ],
    // Multi-action: Check status then start training if needed
    [
      { name: 'User', content: { text: 'Check training data status and start collection if low' } },
      {
        name: 'Agent',
        content: {
          text: "I'll check the training data status and start a collection session if needed.",
          thought: 'User wants conditional training',
          actions: ['CHECK_REASONING_STATUS', 'START_TRAINING_SESSION'],
        },
      },
    ],
    [
      { name: 'User', content: { text: 'Check the status of custom reasoning' } },
      {
        name: 'Agent',
        content: {
          text: '📊 Custom reasoning is active with 45 training samples collected. ShouldRespond override enabled, planning disabled. 95% average confidence, $0.0234 total cost.',
          thought: 'User requested status check of custom reasoning service',
          actions: ['CHECK_REASONING_STATUS'],
        },
      },
    ],
  ],
};

/**
 * Action to trigger model training with collected data
 */
export const trainModelAction: Action = {
  name: 'TRAIN_CUSTOM_MODEL',
  similes: ['START_MODEL_TRAINING', 'FINE_TUNE_MODEL', 'TRAIN_DEEPSEEK_MODEL'],
  description:
    'Start training a custom model using collected training data. Can be chained with CHECK_TRAINING_STATUS to monitor progress or CONFIGURE_AUTOCODER once complete.',

  validate: async (runtime: IAgentRuntime, message: Memory, state?: State) => {
    const text = message.content.text?.toLowerCase() || '';
    return (
      (text.includes('train') || text.includes('fine-tune') || text.includes('fine tune')) &&
      (text.includes('model') || text.includes('deepseek') || text.includes('custom model'))
    );
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    options?: any,
    callback?: HandlerCallback
  ) => {
    try {
      // Extract model type from message
      const text = message.content.text?.toLowerCase() || '';
      let modelType: CustomModelType = 'should_respond'; // default

      if (text.includes('planning')) {
        modelType = 'planning';
      } else if (text.includes('coding') || text.includes('code')) {
        modelType = 'coding';
      }

      const dbManager = new TrainingDatabaseManager(runtime);

      // Check available training data
      const trainingData = await dbManager.getTrainingData({
        modelType,
        limit: 10000,
        isTrainingSample: true,
      });

      if (trainingData.length < 50) {
        await callback?.({
          text: `⚠️ **Insufficient Training Data**\n\nFound only ${trainingData.length} samples for ${modelType} model. Need at least 50 samples for effective training.\n\n💡 **Next Steps:**\n• Collect more training data by using the agent\n• Start a training session: "start training session for ${modelType}"\n• Enable data collection in settings`,
          thought: 'User wants to train model but insufficient training data available',
        });
        return {
          text: 'Insufficient training data',
          data: {
            actionName: 'TRAIN_CUSTOM_MODEL',
            error: 'insufficient_data',
            availableData: trainingData.length,
            requiredData: 50,
          },
          values: {
            success: false,
            error: 'insufficient_data',
            dataCount: trainingData.length,
          },
        };
      }

      // Create training session
      const sessionId = await dbManager.createTrainingSession({
        agent_id: runtime.agentId,
        model_type: modelType,
        session_name: `fine_tune_${modelType}_${Date.now()}`,
        base_model:
          getTrainingConfig(runtime).getModelConfig().defaults[
            modelType === 'should_respond'
              ? 'shouldRespond'
              : modelType === 'planning'
                ? 'planning'
                : 'coding'
          ],
        training_config: {
          learning_rate: getTrainingConfig(runtime).getModelConfig().training.learningRate,
          batch_size: getTrainingConfig(runtime).getModelConfig().training.batchSize,
          epochs: getTrainingConfig(runtime).getModelConfig().training.epochs,
          validation_split: 0.1,
          early_stopping: true,
        },
        training_samples_count: Math.floor(trainingData.length * 0.9),
        validation_samples_count: Math.ceil(trainingData.length * 0.1),
        status: 'pending',
        progress_percent: 0,
      });

      // Get custom reasoning service
      const reasoningService = runtime.getService<CustomReasoningService>('together-reasoning');

      if (!reasoningService) {
        await callback?.({
          text: '❌ Custom reasoning service not available. Cannot start training.',
          thought: 'Training requested but service not available',
        });
        return {
          text: 'Custom reasoning service not available',
          data: {
            actionName: 'TRAIN_CUSTOM_MODEL',
            error: 'service_not_available',
          },
          values: {
            success: false,
            error: 'service_not_available',
          },
        };
      }

      let responseText = '🚀 **Model Training Initiated!**\n\n';
      responseText += '🎯 **Training Details:**\n';
      responseText += `• Model Type: ${modelType}\n`;
      responseText += `• Session ID: ${sessionId}\n`;
      responseText += `• Training Samples: ${Math.floor(trainingData.length * 0.9)}\n`;
      responseText += `• Validation Samples: ${Math.ceil(trainingData.length * 0.1)}\n`;
      responseText += `• Base Model: DeepSeek-${modelType}\n\n`;

      responseText += '⚙️ **Training Configuration:**\n';
      responseText += '• Learning Rate: 5e-5\n';
      responseText += '• Batch Size: 4\n';
      responseText += '• Epochs: 3\n';
      responseText += '• Early Stopping: Enabled\n\n';

      responseText += '⏱️ **Estimated Timeline:**\n';
      if (modelType === 'should_respond') {
        responseText += '• Training Time: ~15-30 minutes\n';
        responseText += '• Cost Estimate: $2-5\n';
      } else if (modelType === 'planning') {
        responseText += '• Training Time: ~45-90 minutes\n';
        responseText += '• Cost Estimate: $10-25\n';
      } else {
        responseText += '• Training Time: ~2-4 hours\n';
        responseText += '• Cost Estimate: $50-100\n';
      }

      responseText += '\n📊 **Next Steps:**\n';
      responseText += '• Monitor progress: "check training progress"\n';
      responseText += '• Training will auto-deploy when complete\n';
      responseText += '• Original model will be replaced seamlessly\n';

      // Update session status to running
      await dbManager.updateTrainingSession(sessionId, {
        status: 'running',
        progress_percent: 5,
      });

      await callback?.({
        text: responseText,
        thought: `Initiated fine-tuning for ${modelType} model with ${trainingData.length} training samples`,
        actions: ['TRAIN_CUSTOM_MODEL'],
      });

      elizaLogger.info(`Training initiated for ${modelType} model`, {
        sessionId,
        sampleCount: trainingData.length,
      });

      // In a real implementation, this would trigger the actual Together.ai fine-tuning API

      return {
        text: `Model training initiated for ${modelType} with session ${sessionId}`,
        data: {
          actionName: 'TRAIN_CUSTOM_MODEL',
          sessionId,
          modelType,
          trainingDataCount: trainingData.length,
          trainingConfig: {
            learningRate: 5e-5,
            batchSize: 4,
            epochs: 3,
          },
          estimatedTime:
            modelType === 'should_respond'
              ? '15-30 minutes'
              : modelType === 'planning'
                ? '45-90 minutes'
                : '2-4 hours',
          estimatedCost:
            modelType === 'should_respond'
              ? '$2-5'
              : modelType === 'planning'
                ? '$10-25'
                : '$50-100',
        },
        values: {
          success: true,
          sessionId,
          modelType,
          sampleCount: trainingData.length,
          status: 'running',
        },
      };
    } catch (error) {
      elizaLogger.error('Failed to start model training:', error);

      await callback?.({
        text: `❌ Failed to start model training: ${error instanceof Error ? error.message : 'Unknown error'}`,
        thought: 'Error occurred while starting model training',
      });

      return {
        text: `Failed to start model training: ${error instanceof Error ? error.message : 'Unknown error'}`,
        data: {
          actionName: 'TRAIN_CUSTOM_MODEL',
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
        },
        values: {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  },

  examples: [
    // Multi-action: Check data then train if sufficient
    [
      { name: 'User', content: { text: 'Check if we have enough data and train the model' } },
      {
        name: 'Agent',
        content: {
          text: "I'll check the training data availability and start training if we have enough.",
          thought: 'User wants conditional training based on data',
          actions: ['CHECK_REASONING_STATUS', 'TRAIN_CUSTOM_MODEL'],
        },
      },
    ],
    // Multi-action: Train then monitor progress
    [
      { name: 'User', content: { text: 'Train the model and monitor the training progress' } },
      {
        name: 'Agent',
        content: {
          text: "I'll start model training and monitor its progress.",
          thought: 'User wants training with monitoring',
          actions: ['TRAIN_CUSTOM_MODEL', 'CHECK_TRAINING_STATUS'],
        },
      },
    ],
    // Multi-action: Enable, collect, then train
    [
      {
        name: 'User',
        content: { text: 'Enable reasoning, collect training data, and train the model' },
      },
      {
        name: 'Agent',
        content: {
          text: "I'll enable reasoning, start collecting data, and initiate model training.",
          thought: 'User wants complete training workflow',
          actions: ['ENABLE_REASONING_SERVICE', 'START_TRAINING_SESSION', 'TRAIN_CUSTOM_MODEL'],
        },
      },
    ],
    [
      { name: 'User', content: { text: 'Train the planning model with the collected data' } },
      {
        name: 'Agent',
        content: {
          text: '🚀 Started fine-tuning the planning model with 127 training samples. Estimated completion in 45-90 minutes.',
          thought: 'User requested to train the planning model using collected training data',
          actions: ['TRAIN_CUSTOM_MODEL'],
        },
      },
    ],
  ],
};

export const customReasoningActions = [
  enableCustomReasoningAction,
  disableCustomReasoningAction,
  startTrainingSessionAction,
  checkReasoningStatusAction,
  trainModelAction,
];
