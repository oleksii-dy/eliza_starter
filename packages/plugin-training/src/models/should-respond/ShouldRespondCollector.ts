import { elizaLogger, type IAgentRuntime, type Memory, type State } from '@elizaos/core';
import { TrainingDatabaseManager } from '../../database/TrainingDatabaseManager';
import { type TrainingDataPoint } from '../../types';
import { v4 as uuidv4 } from 'uuid';

/**
 * ShouldRespondCollector - Collects training data for the ShouldRespond model
 *
 * This is the smallest model that decides whether the agent should respond to incoming messages.
 * We collect minimal context and the binary decision with reasoning for maximum efficiency.
 */
export class ShouldRespondCollector {
  private dbManager: TrainingDatabaseManager;
  private enabled: boolean;

  constructor(private runtime: IAgentRuntime) {
    this.enabled = runtime.getSetting('REASONING_SERVICE_COLLECT_TRAINING_DATA') === 'true';
    this.dbManager = new TrainingDatabaseManager(runtime);
  }

  /**
   * Collect ShouldRespond training data
   * @param runtime - Agent runtime
   * @param message - Incoming message
   * @param state - Current conversation state
   * @param decision - Whether agent should respond (true/false)
   * @param reasoning - Why this decision was made
   * @param confidence - Confidence in the decision (0-1)
   */
  async collectShouldRespondData(
    runtime: IAgentRuntime,
    message: Memory,
    state: State,
    decision: boolean,
    reasoning: string,
    confidence: number = 0.9
  ): Promise<void> {
    if (!this.enabled) {
      return;
    }

    try {
      // Initialize database if not already done
      const dbPath = runtime.getSetting('TRAINING_DATABASE_URL') || 'sqlite:./training.db';
      await this.dbManager.initializeSchema();

      // Extract minimal but sufficient context for decision-making
      const inputContext = this.extractShouldRespondContext(runtime, message, state);

      // Format training sample
      const trainingData: TrainingDataPoint = {
        id: uuidv4() as any,
        timestamp: Date.now(),
        modelType: 'should_respond' as const,
        input: {
          prompt: `Should the agent respond to this message?

Message: "${message.content.text || ''}"
From: ${this.extractSenderName(message, state)}
Channel Info: ${JSON.stringify(this.extractChannelInfo(message, state))}
Recent Activity: ${JSON.stringify(this.extractRecentActivity(state))}
Mentions Agent: ${this.checkMentionsAgent(message, runtime)}
Message Type: ${this.classifyMessageType(message)}
Context: ${JSON.stringify(inputContext.conversationContext)}`,
          messageText: message.content.text || '',
          conversationContext: inputContext.conversationContext,
        },
        output: {
          decision: decision ? 'RESPOND' : 'IGNORE',
          reasoning,
          confidence,
        },
        metadata: {
          agentId: runtime.agentId,
          roomId: message.roomId,
          messageId: message.id,
          responseTimeMs: Date.now() - (message.createdAt || Date.now()),
          tokensUsed: this.estimateTokens(inputContext),
          costUsd: 0.0001, // Minimal cost for ShouldRespond model
        },
      };

      // Store training data
      await this.dbManager.storeTrainingData(trainingData);

      // Also store as memory for runtime access
      await this.storeShouldRespondMemory(runtime, message, trainingData);

      elizaLogger.debug(
        `✅ ShouldRespond training data collected: ${decision ? 'RESPOND' : 'IGNORE'} (confidence: ${confidence})`
      );
    } catch (error) {
      elizaLogger.error('❌ Failed to collect ShouldRespond training data:', error);
    }
  }

  /**
   * Extract minimal context needed for ShouldRespond decision
   */
  private extractShouldRespondContext(runtime: IAgentRuntime, message: Memory, state: State) {
    // Get last 3 messages for minimal context (keep model small)
    const recentMessages = state.data?.recentMessages || [];
    const contextMessages = recentMessages.slice(-3).map((msg: any) => ({
      text: msg.content?.text?.substring(0, 100) || '', // Limit length
      sender: msg.entityId === message.agentId ? 'agent' : 'user',
      timestamp: msg.createdAt,
    }));

    return {
      conversationContext: contextMessages,
      messageCount: recentMessages.length,
      lastAgentResponse: this.findLastAgentMessage(
        recentMessages,
        message.agentId || runtime.agentId
      ),
    };
  }

  /**
   * Extract decision factors for training
   */
  private extractDecisionFactors(message: Memory, state: State, runtime: IAgentRuntime) {
    return {
      mentionsAgent: this.checkMentionsAgent(message, runtime),
      isDirectMessage: state.data?.roomType === 'DM',
      hasQuestion: /\?/.test(message.content.text || ''),
      hasGreeting: /\b(hello|hi|hey|good morning|good afternoon|good evening)\b/i.test(
        message.content.text || ''
      ),
      isCommand: /^[!/.]/.test(message.content.text || ''),
      messageLength: (message.content.text || '').length,
      timeSinceLastResponse: this.getTimeSinceLastResponse(state, runtime.agentId),
      conversationActive: this.isConversationActive(state),
      userEngagement: this.assessUserEngagement(state, message.entityId),
    };
  }

  /**
   * Store as shouldRespond memory type for runtime access
   */
  private async storeShouldRespondMemory(
    runtime: IAgentRuntime,
    originalMessage: Memory,
    trainingData: TrainingDataPoint
  ): Promise<void> {
    try {
      const shouldRespondMemory: Memory = {
        id: uuidv4() as any,
        entityId: runtime.agentId,
        agentId: runtime.agentId,
        roomId: originalMessage.roomId,
        content: {
          text: `ShouldRespond Decision: ${trainingData.output.decision}`,
          type: 'shouldRespond',
          metadata: {
            originalMessageId: originalMessage.id,
            decision: trainingData.output.decision,
            reasoning: trainingData.output.reasoning,
            confidence: trainingData.output.confidence,
            inputContext: trainingData.input,
          },
        },
        createdAt: Date.now(),
        metadata: {
          type: 'shouldRespond',
          trainingData: true,
          modelType: 'should_respond',
        },
      };

      await runtime.createMemory(shouldRespondMemory, 'shouldRespond');
    } catch (error) {
      elizaLogger.warn('Failed to store shouldRespond memory:', error);
    }
  }

  // Helper methods
  private extractSenderName(message: Memory, state: State): string {
    // Try to get sender name from state or default to entity ID
    const entities = state.data?.entities || [];
    const sender = entities.find((e: any) => e.id === message.entityId);
    return sender?.name || `User_${message.entityId.substring(0, 8)}`;
  }

  private extractChannelInfo(message: Memory, state: State) {
    return {
      roomId: message.roomId,
      type: state.data?.roomType || 'unknown',
      participantCount: state.data?.participants?.length || 1,
    };
  }

  private extractRecentActivity(state: State) {
    const recentMessages = state.data?.recentMessages || [];
    return {
      messageCount: recentMessages.length,
      timeSpan: this.getConversationTimeSpan(recentMessages),
      uniqueSenders: this.countUniqueSenders(recentMessages),
    };
  }

  private checkMentionsAgent(message: Memory, runtime: IAgentRuntime): boolean {
    const text = message.content.text || '';
    const agentName = runtime.character?.name || '';
    return (
      text.includes(`@${runtime.agentId}`) ||
      text.toLowerCase().includes(agentName.toLowerCase()) ||
      text.includes('<@') || // Discord mention format
      /\b(hey|hi|hello)\s+(agent|bot|assistant|eliza)\b/i.test(text)
    );
  }

  private classifyMessageType(message: Memory): string {
    const text = message.content.text || '';

    if (/^\s*$/.test(text)) {
      return 'empty';
    }
    if (/^[!/.]/.test(text)) {
      return 'command';
    }
    if (/\?/.test(text)) {
      return 'question';
    }
    if (/\b(hello|hi|hey|good morning|good afternoon|good evening)\b/i.test(text)) {
      return 'greeting';
    }
    if (/\b(thanks|thank you|bye|goodbye|see you|ttyl)\b/i.test(text)) {
      return 'closing';
    }
    if (text.length > 500) {
      return 'long_message';
    }
    if (text.length < 10) {
      return 'short_message';
    }

    return 'statement';
  }

  private findLastAgentMessage(messages: any[], agentId: string) {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].entityId === agentId) {
        return {
          text: messages[i].content?.text?.substring(0, 50) || '',
          timestamp: messages[i].createdAt,
          timeSince: Date.now() - messages[i].createdAt,
        };
      }
    }
    return null;
  }

  private getTimeSinceLastResponse(state: State, agentId: string): number {
    const lastResponse = this.findLastAgentMessage(state.data?.recentMessages || [], agentId);
    return lastResponse ? Date.now() - lastResponse.timestamp : Infinity;
  }

  private isConversationActive(state: State): boolean {
    const recentMessages = state.data?.recentMessages || [];
    if (recentMessages.length === 0) {
      return false;
    }

    const lastMessage = recentMessages[recentMessages.length - 1];
    const timeSinceLastMessage = Date.now() - (lastMessage.createdAt || 0);

    return timeSinceLastMessage < 5 * 60 * 1000; // Active if within 5 minutes
  }

  private assessUserEngagement(state: State, userId: string): string {
    const recentMessages = state.data?.recentMessages || [];
    const userMessages = recentMessages.filter((msg: any) => msg.entityId === userId);

    if (userMessages.length >= 3) {
      return 'high';
    }
    if (userMessages.length >= 1) {
      return 'medium';
    }
    return 'low';
  }

  private getConversationTimeSpan(messages: any[]): number {
    if (messages.length < 2) {
      return 0;
    }
    const first = messages[0].createdAt || 0;
    const last = messages[messages.length - 1].createdAt || 0;
    return last - first;
  }

  private countUniqueSenders(messages: any[]): number {
    const senders = new Set(messages.map((msg: any) => msg.entityId));
    return senders.size;
  }

  private estimateTokens(context: any): number {
    // Rough estimation for ShouldRespond model (very small)
    const textLength = JSON.stringify(context).length;
    return Math.ceil(textLength / 4); // ~4 chars per token
  }

  /**
   * Export ShouldRespond training dataset
   */
  async exportShouldRespondDataset(limit: number = 10000): Promise<any> {
    try {
      const data = await this.dbManager.getTrainingData({
        modelType: 'should_respond',
        limit,
      });

      // Format for training (minimal input/output pairs)
      const formattedData = data.map((item) => {
        const input = item.input_data;
        const output = item.output_data;

        return {
          input: {
            message: input.messageText,
            sender: input.senderName,
            mentions_agent: input.mentionsAgent,
            message_type: input.messageType,
            recent_activity: input.recentActivity,
            conversation_context: input.conversationContext.slice(-2), // Only last 2 messages
          },
          output: {
            decision: output.decision,
            confidence: output.confidence,
            reasoning: output.reasoning,
          },
        };
      });

      elizaLogger.info(`📊 Exported ${formattedData.length} ShouldRespond training samples`);
      return {
        model_type: 'should_respond',
        format: 'binary_classification',
        samples: formattedData,
        metadata: {
          total_samples: formattedData.length,
          positive_samples: formattedData.filter((s) => s.output.decision === 'RESPOND').length,
          negative_samples: formattedData.filter((s) => s.output.decision === 'IGNORE').length,
          exported_at: Date.now(),
          model_size_target: 'small', // 1B-3B parameters
          use_case: 'real_time_response_filtering',
        },
      };
    } catch (error) {
      elizaLogger.error('❌ Failed to export ShouldRespond dataset:', error);
      throw error;
    }
  }
}
