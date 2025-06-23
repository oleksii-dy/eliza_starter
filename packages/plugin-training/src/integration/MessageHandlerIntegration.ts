import {
  type IAgentRuntime,
  type Memory,
  type State,
  type Content,
  type HandlerCallback,
  composePromptFromState,
  parseKeyValueXml,
  shouldRespondTemplate,
  messageHandlerTemplate,
  ModelType,
  elizaLogger,
} from '@elizaos/core';

import { ReasoningHooks } from '../hooks/ReasoningHooks.js';
import type { CustomReasoningService } from '../interfaces/CustomReasoningService.js';

/**
 * Non-breaking integration with ElizaOS message handling that preserves all original behavior
 */
export class MessageHandlerIntegration {
  /**
   * Register custom reasoning hooks with the runtime without breaking existing functionality
   */
  static registerHooks(runtime: IAgentRuntime): void {
    // Store original methods for fallback
    const originalUseModel = runtime.useModel.bind(runtime);
    const originalProcessActions = runtime.processActions?.bind(runtime);

    // Override useModel only when custom reasoning is enabled and available
    runtime.useModel = async function <T extends any, R = any>(
      modelType: T,
      params: any
    ): Promise<R> {
      const customReasoningEnabled = this.getSetting('REASONING_SERVICE_ENABLED') === 'true';
      const reasoningService = this.getService<CustomReasoningService>('together-reasoning');

      // Only use custom reasoning if explicitly enabled and service is available
      if (customReasoningEnabled && reasoningService) {
        try {
          // Check if this is a coding-related request that should use custom coding model
          if (
            modelType === ModelType.TEXT_LARGE &&
            MessageHandlerIntegration.isCodingRequest(params)
          ) {
            const codingEnabled = this.getSetting('REASONING_SERVICE_CODING_ENABLED') === 'true';
            if (codingEnabled) {
              const result = await reasoningService.generateCode({
                prompt: params.prompt || params.text || '',
                maxTokens: params.maxTokens,
                temperature: params.temperature,
              });
              return result.code as R;
            }
          }
        } catch (error) {
          elizaLogger.warn('Custom reasoning failed, falling back to original model:', error);
        }
      }

      // Always fall back to original behavior
      return originalUseModel(modelType as any, params);
    };

    // Add custom message processing hooks
    (runtime as any).customShouldRespond = async (
      runtime: IAgentRuntime,
      message: Memory,
      state: State
    ): Promise<boolean> => {
      const customReasoningEnabled = runtime.getSetting('REASONING_SERVICE_ENABLED') === 'true';
      const shouldRespondEnabled =
        runtime.getSetting('REASONING_SERVICE_SHOULD_RESPOND_ENABLED') === 'true';

      if (!customReasoningEnabled || !shouldRespondEnabled) {
        // Fall back to original shouldRespond logic
        return MessageHandlerIntegration.originalShouldRespond(runtime, message, state);
      }

      try {
        return await ReasoningHooks.overrideShouldRespond(runtime, message, state, () =>
          MessageHandlerIntegration.originalShouldRespond(runtime, message, state)
        );
      } catch (error) {
        elizaLogger.warn('Custom shouldRespond failed, using original logic:', error);
        return MessageHandlerIntegration.originalShouldRespond(runtime, message, state);
      }
    };

    (runtime as any).customResponseGenerator = async (
      runtime: IAgentRuntime,
      message: Memory,
      state: State
    ): Promise<Content> => {
      const customReasoningEnabled = runtime.getSetting('REASONING_SERVICE_ENABLED') === 'true';
      const planningEnabled = runtime.getSetting('REASONING_SERVICE_PLANNING_ENABLED') === 'true';

      if (!customReasoningEnabled || !planningEnabled) {
        // Fall back to original planning logic
        return MessageHandlerIntegration.originalResponseGeneration(runtime, message, state);
      }

      try {
        const actionNames = runtime.actions?.map((action) => action.name) || [];
        return await ReasoningHooks.overridePlanning(runtime, message, state, actionNames, () =>
          MessageHandlerIntegration.originalResponseGeneration(runtime, message, state)
        );
      } catch (error) {
        elizaLogger.warn('Custom planning failed, using original logic:', error);
        return MessageHandlerIntegration.originalResponseGeneration(runtime, message, state);
      }
    };

    elizaLogger.info('Custom reasoning hooks registered with backward compatibility');
  }

  /**
   * Original shouldRespond logic as fallback
   */
  private static async originalShouldRespond(
    runtime: IAgentRuntime,
    message: Memory,
    state: State
  ): Promise<boolean> {
    try {
      const shouldRespondState = await runtime.composeState(message, ['SHOULD_RESPOND']);
      const prompt = composePromptFromState({
        state: shouldRespondState,
        template: shouldRespondTemplate,
      });

      const response = await runtime.useModel(ModelType.TEXT_LARGE, { prompt });
      const responseObject = parseKeyValueXml(response);

      const nonResponseActions = ['IGNORE', 'NONE', 'STOP'];
      return (
        responseObject?.action && !nonResponseActions.includes(responseObject.action.toUpperCase())
      );
    } catch (error) {
      elizaLogger.error('Error in original shouldRespond logic:', error);
      return false;
    }
  }

  /**
   * Original response generation logic as fallback
   */
  private static async originalResponseGeneration(
    runtime: IAgentRuntime,
    message: Memory,
    state: State
  ): Promise<Content> {
    try {
      const responseState = await runtime.composeState(message, ['ACTIONS']);
      const prompt = composePromptFromState({
        state: responseState,
        template: messageHandlerTemplate,
      });

      const response = await runtime.useModel(ModelType.TEXT_LARGE, { prompt });
      const responseObject = parseKeyValueXml(response);

      return {
        thought: responseObject?.thought || '',
        actions: responseObject?.actions
          ? responseObject.actions.split(',').map((a: string) => a.trim())
          : ['IGNORE'],
        providers: responseObject?.providers
          ? responseObject.providers.split(',').map((p: string) => p.trim())
          : []
        text: responseObject?.text || '',
      };
    } catch (error) {
      elizaLogger.error('Error in original response generation:', error);
      return {
        thought: 'Error occurred during response generation',
        actions: ['IGNORE'],
        providers: []
        text: 'I encountered an error while processing your message.',
      };
    }
  }

  /**
   * Detect if a request is coding-related
   */
  private static isCodingRequest(params: any): boolean {
    const text = params.prompt || params.text || '';
    const codingKeywords = [
      'write code',
      'generate code',
      'create a function',
      'implement',
      'javascript',
      'typescript',
      'python',
      'java',
      'c++',
      'rust',
      'function',
      'class',
      'method',
      'algorithm',
      'script',
      '```',
      'code block',
      'programming',
    ];

    const lowerText = text.toLowerCase();
    return codingKeywords.some((keyword) => lowerText.includes(keyword));
  }

  /**
   * Check if custom reasoning is enabled and available
   */
  static isCustomReasoningEnabled(runtime: IAgentRuntime): boolean {
    const enabled = runtime.getSetting('REASONING_SERVICE_ENABLED') === 'true';
    const service = runtime.getService<CustomReasoningService>('together-reasoning');
    return enabled && !!service;
  }

  /**
   * Get status of custom reasoning integration
   */
  static getIntegrationStatus(runtime: IAgentRuntime): {
    enabled: boolean;
    shouldRespondOverride: boolean;
    planningOverride: boolean;
    codingOverride: boolean;
    fallbackAvailable: boolean;
  } {
    const enabled = runtime.getSetting('REASONING_SERVICE_ENABLED') === 'true';
    const service = runtime.getService<CustomReasoningService>('together-reasoning');

    return {
      enabled: enabled && !!service,
      shouldRespondOverride:
        runtime.getSetting('REASONING_SERVICE_SHOULD_RESPOND_ENABLED') === 'true',
      planningOverride: runtime.getSetting('REASONING_SERVICE_PLANNING_ENABLED') === 'true',
      codingOverride: runtime.getSetting('REASONING_SERVICE_CODING_ENABLED') === 'true',
      fallbackAvailable: true, // Always available
    };
  }
}
