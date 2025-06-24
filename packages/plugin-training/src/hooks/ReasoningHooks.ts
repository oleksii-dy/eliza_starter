import {
  type IAgentRuntime,
  type Memory,
  type State,
  type Content,
  shouldRespondTemplate,
  messageHandlerTemplate,
  composePromptFromState,
  parseKeyValueXml,
  ModelType,
  elizaLogger,
} from '@elizaos/core';

import type {
  CustomReasoningService,
  ShouldRespondContext,
  PlanningContext,
  CodingContext,
} from '../interfaces/CustomReasoningService.js';

/**
 * Hooks that integrate custom reasoning into ElizaOS message handling
 */
export class ReasoningHooks {
  /**
   * Override the shouldRespond decision with custom reasoning model
   */
  static async overrideShouldRespond(
    runtime: IAgentRuntime,
    message: Memory,
    state: State,
    originalShouldRespond: () => Promise<boolean>
  ): Promise<boolean> {
    const reasoningService = runtime.getService<CustomReasoningService>('together-reasoning');

    if (!reasoningService) {
      elizaLogger.debug('Custom reasoning service not available, using original shouldRespond');
      return originalShouldRespond();
    }

    try {
      const context: ShouldRespondContext = {
        runtime,
        message,
        state,
        conversationHistory: await runtime.getMemories({
          roomId: message.roomId,
          count: 10,
          tableName: 'messages',
        }),
      };

      const result = await reasoningService.shouldRespond(context);

      elizaLogger.debug(
        `Custom shouldRespond decision: ${result.decision} (confidence: ${result.confidence})`,
        {
          reasoning: result.reasoning,
          messageText: message.content.text?.substring(0, 100),
        }
      );

      // Log the decision for monitoring
      elizaLogger.info('Custom shouldRespond decision logged', {
        entityId: runtime.agentId,
        roomId: message.roomId,
        messageId: message.id,
        decision: result.decision,
        reasoning: result.reasoning,
        confidence: result.confidence,
        type: 'custom-shouldrespond-decision',
      });

      return result.decision === 'RESPOND';
    } catch (error) {
      elizaLogger.error('Error in custom shouldRespond, falling back to original:', error);
      return originalShouldRespond();
    }
  }

  /**
   * Override the planning/response generation with custom reasoning model
   */
  static async overridePlanning(
    runtime: IAgentRuntime,
    message: Memory,
    state: State,
    actionNames: string[],
    originalPlanning: () => Promise<Content>
  ): Promise<Content> {
    const reasoningService = runtime.getService<CustomReasoningService>('together-reasoning');

    if (!reasoningService) {
      elizaLogger.debug('Custom reasoning service not available, using original planning');
      return originalPlanning();
    }

    try {
      const context: PlanningContext = {
        runtime,
        message,
        state,
        actionNames,
      };

      const result = await reasoningService.planResponse(context);

      elizaLogger.debug('Custom planning result:', {
        thought: result.thought,
        actions: result.actions,
        providers: result.providers,
        textLength: result.text.length,
      });

      // Log the planning decision for monitoring
      elizaLogger.info('Custom planning decision logged', {
        entityId: runtime.agentId,
        roomId: message.roomId,
        messageId: message.id,
        thought: result.thought,
        actions: result.actions,
        providers: result.providers,
        type: 'custom-planning-decision',
      });

      return {
        thought: result.thought,
        actions: result.actions,
        providers: result.providers,
        text: result.text,
      };
    } catch (error) {
      elizaLogger.error('Error in custom planning, falling back to original:', error);
      return originalPlanning();
    }
  }

  /**
   * Override coding generation for autocoder integration
   */
  static async overrideCoding(
    runtime: IAgentRuntime,
    prompt: string,
    language?: string,
    context?: string,
    originalCoding?: () => Promise<string>
  ): Promise<string> {
    const reasoningService = runtime.getService<CustomReasoningService>('together-reasoning');

    if (!reasoningService) {
      elizaLogger.debug('Custom reasoning service not available, using original coding');
      return originalCoding ? originalCoding() : prompt;
    }

    try {
      const codingContext: CodingContext = {
        prompt,
        language,
        context,
      };

      const result = await reasoningService.generateCode(codingContext);

      elizaLogger.debug('Custom coding result:', {
        codeLength: result.code.length,
        language,
        hasExplanation: !!result.explanation,
      });

      // Log the coding decision for monitoring
      elizaLogger.info('Custom coding generation logged', {
        entityId: runtime.agentId,
        roomId: runtime.agentId, // Use agent ID for coding logs
        prompt: prompt.substring(0, 500), // Truncate for storage
        language,
        codeLength: result.code.length,
        hasExplanation: !!result.explanation,
        type: 'custom-coding-generation',
      });

      return result.code;
    } catch (error) {
      elizaLogger.error('Error in custom coding, falling back to original:', error);
      return originalCoding ? originalCoding() : prompt;
    }
  }

  /**
   * Check if custom reasoning service is available and enabled
   */
  static isCustomReasoningAvailable(runtime: IAgentRuntime): boolean {
    const service = runtime.getService<CustomReasoningService>('together-reasoning');
    return !!service;
  }

  /**
   * Get custom reasoning service status
   */
  static async getCustomReasoningStatus(runtime: IAgentRuntime): Promise<{
    available: boolean;
    enabledModels: string[];
    costs?: any;
  }> {
    const service = runtime.getService<CustomReasoningService>('together-reasoning');

    if (!service) {
      return {
        available: false,
        enabledModels: [],
      };
    }

    try {
      const costs = await service.getCostReport();
      const enabledModels: string[] = [];

      // Check which models are enabled
      for (const modelType of ['should_respond', 'planning', 'coding']) {
        try {
          const status = await service.getModelStatus(modelType as any);
          if (status.enabled) {
            enabledModels.push(modelType);
          }
        } catch (error) {
          // Model not configured
        }
      }

      return {
        available: true,
        enabledModels,
        costs,
      };
    } catch (error) {
      elizaLogger.error('Error getting custom reasoning status:', error);
      return {
        available: true,
        enabledModels: [],
      };
    }
  }

  /**
   * Build the original shouldRespond logic for fallback
   */
  static async buildOriginalShouldRespond(
    runtime: IAgentRuntime,
    message: Memory,
    state: State
  ): Promise<() => Promise<boolean>> {
    return async () => {
      const shouldRespondState = await runtime.composeState(message, ['SHOULD_RESPOND']);
      const prompt = composePromptFromState({
        state: shouldRespondState,
        template: shouldRespondTemplate,
      });

      const response = await runtime.useModel(ModelType.TEXT_LARGE, { prompt });
      const responseObject = parseKeyValueXml(response);

      const nonResponseActions = ['IGNORE', 'NONE'];
      return (
        responseObject?.action && !nonResponseActions.includes(responseObject.action.toUpperCase())
      );
    };
  }

  /**
   * Build the original planning logic for fallback
   */
  static async buildOriginalPlanning(
    runtime: IAgentRuntime,
    message: Memory,
    state: State
  ): Promise<() => Promise<Content>> {
    return async () => {
      const planningState = await runtime.composeState(message, ['ACTIONS']);
      const prompt = composePromptFromState({
        state: planningState,
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
          : [],
        text: responseObject?.text || '',
      };
    };
  }
}
