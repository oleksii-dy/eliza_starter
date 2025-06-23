import {
  elizaLogger,
  type IAgentRuntime,
  type Memory,
  type State,
  type Provider,
} from '@elizaos/core';
import { ShouldRespondModel } from './ShouldRespondModel';

/**
 * ShouldRespondProvider - Provides enhanced shouldRespond decisions with data collection
 *
 * This provider intercepts shouldRespond decisions and enhances them with:
 * - Custom model inference (when enabled)
 * - Comprehensive data collection for training
 * - Detailed reasoning and confidence scores
 */
export const shouldRespondProvider: Provider = {
  name: 'SHOULD_RESPOND_ENHANCED',
  description: 'Enhanced shouldRespond decision-making with training data collection',
  position: -100, // Run very early in the provider chain

  async get(runtime: IAgentRuntime, message: Memory, state: State) {
    try {
      // Only run for actual user messages, not agent's own messages
      if (message.entityId === runtime.agentId) {
        return { text: '', values: {} };
      }

      // Initialize ShouldRespond model
      const shouldRespondModel = new ShouldRespondModel(runtime);

      // Get enhanced shouldRespond decision
      const result = await shouldRespondModel.shouldRespond(runtime, message, state);

      // Store decision in state for other providers/actions to use
      const enhancedState = {
        ...state,
        values: {
          ...state.values,
          shouldRespondDecision: result.shouldRespond,
          shouldRespondReasoning: result.reasoning,
          shouldRespondConfidence: result.confidence,
        },
        data: {
          ...state.data,
          shouldRespondAnalysis: {
            decision: result.shouldRespond,
            reasoning: result.reasoning,
            confidence: result.confidence,
            timestamp: Date.now(),
            modelUsed:
              runtime.getSetting('REASONING_SERVICE_SHOULD_RESPOND_ENABLED') === 'true'
                ? 'custom'
                : 'heuristic',
          },
        },
      };

      // Return enhanced decision information
      return {
        text: `[SHOULD RESPOND ANALYSIS]
Decision: ${result.shouldRespond ? 'RESPOND' : 'IGNORE'}
Confidence: ${(result.confidence * 100).toFixed(1)}%
Reasoning: ${result.reasoning}
[/SHOULD RESPOND ANALYSIS]`,
        values: {
          shouldRespondDecision: result.shouldRespond,
          shouldRespondReasoning: result.reasoning,
          shouldRespondConfidence: result.confidence,
        },
        data: {
          shouldRespondAnalysis: enhancedState.data.shouldRespondAnalysis,
        },
      };
    } catch (error) {
      elizaLogger.error('❌ ShouldRespond provider error:', error);

      // Return safe default
      return {
        text: '[SHOULD RESPOND ANALYSIS]\nDecision: IGNORE\nReasoning: Error in analysis, defaulting to no response\n[/SHOULD RESPOND ANALYSIS]',
        values: {
          shouldRespondDecision: false,
          shouldRespondReasoning: 'Error in analysis',
          shouldRespondConfidence: 0.1,
        },
      };
    }
  },
};

/**
 * ShouldRespondEvaluator - Post-processing evaluator for shouldRespond decisions
 *
 * This evaluator runs after message processing to collect additional training data
 * based on whether the agent actually responded and how the conversation evolved.
 */
export const shouldRespondEvaluator = {
  name: 'SHOULD_RESPOND_FEEDBACK',
  description: 'Collects feedback on shouldRespond decisions for training improvement',
  alwaysRun: false, // Only run periodically to avoid overhead

  async validate(runtime: IAgentRuntime, message: Memory, state: State): Promise<boolean> {
    // Run every 5th message to collect feedback
    const messageCount = state.data?.recentMessages?.length || 0;
    return messageCount % 5 === 0;
  },

  async handler(runtime: IAgentRuntime, message: Memory, state: State) {
    try {
      // Check if we have a shouldRespond analysis from earlier
      const analysis = state.data?.shouldRespondAnalysis;
      if (!analysis) {
        return;
      }

      // Check if agent actually responded after the decision
      const recentMessages = state.data?.recentMessages || [];
      const messageIndex = recentMessages.findIndex((msg: any) => msg.id === message.id);

      if (messageIndex === -1) {
        return;
      }

      // Look for agent responses after this message
      const subsequentMessages = recentMessages.slice(messageIndex + 1);
      const agentResponded = subsequentMessages.some(
        (msg: any) => msg.entityId === runtime.agentId
      );

      // Collect feedback data
      const feedbackData = {
        originalDecision: analysis.decision,
        actuallyResponded: agentResponded,
        decisionCorrect: analysis.decision === agentResponded,
        confidence: analysis.confidence,
        reasoning: analysis.reasoning,
        messageText: message.content.text || '',
        timestamp: Date.now(),
      };

      // Store feedback memory for future analysis
      await runtime.createMemory(
        {
          id: `feedback-${message.id}` as any,
          entityId: runtime.agentId,
          agentId: runtime.agentId,
          roomId: message.roomId,
          content: {
            text: `ShouldRespond Feedback: Decision ${feedbackData.decisionCorrect ? 'correct' : 'incorrect'}`,
            type: 'shouldRespondFeedback',
            metadata: feedbackData,
          },
          createdAt: Date.now(),
        },
        'shouldRespondFeedback'
      );

      elizaLogger.debug(
        `📊 ShouldRespond feedback collected: ${feedbackData.decisionCorrect ? 'correct' : 'incorrect'} decision`
      );
    } catch (error) {
      elizaLogger.warn('Failed to collect shouldRespond feedback:', error);
    }
  },
};
