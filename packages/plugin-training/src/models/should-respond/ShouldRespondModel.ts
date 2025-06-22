import { elizaLogger, type IAgentRuntime, type Memory, type State } from '@elizaos/core';
import { ShouldRespondCollector } from './ShouldRespondCollector';
import { TogetherAIClient } from '../../lib/together-client';

/**
 * ShouldRespondModel - Handles both data collection and inference for ShouldRespond decisions
 * 
 * This model is designed to be the smallest possible model that can make binary decisions
 * about whether the agent should respond to incoming messages.
 */
export class ShouldRespondModel {
  private collector: ShouldRespondCollector;
  private togetherClient?: TogetherAIClient;
  private customModelEnabled: boolean;
  private customModelName?: string;

  constructor(runtime: IAgentRuntime) {
    this.collector = new ShouldRespondCollector(runtime);
    this.customModelEnabled = runtime.getSetting('CUSTOM_REASONING_SHOULD_RESPOND_ENABLED') === 'true';
    
    if (this.customModelEnabled) {
      const apiKey = runtime.getSetting('TOGETHER_AI_API_KEY');
      if (apiKey) {
        this.togetherClient = new TogetherAIClient(apiKey);
        this.customModelName = runtime.getSetting('CUSTOM_REASONING_SHOULD_RESPOND_MODEL') || 'user/eliza-should-respond-v1';
      }
    }
  }

  /**
   * Make ShouldRespond decision with data collection
   * This replaces the default shouldRespond logic when custom model is enabled
   */
  async shouldRespond(
    runtime: IAgentRuntime,
    message: Memory,
    state?: State
  ): Promise<{ shouldRespond: boolean; reasoning: string; confidence: number }> {
    const startTime = Date.now();
    
    try {
      let decision: boolean;
      let reasoning: string;
      let confidence: number;

      if (this.customModelEnabled && this.togetherClient && this.customModelName) {
        // Use custom trained model
        const result = await this.inferWithCustomModel(message, state || { values: {}, data: {}, text: '' });
        decision = result.decision;
        reasoning = result.reasoning;
        confidence = result.confidence;
      } else {
        // Use default heuristic logic with enhanced reasoning
        const result = await this.defaultShouldRespondLogic(runtime, message, state || { values: {}, data: {}, text: '' });
        decision = result.decision;
        reasoning = result.reasoning;
        confidence = result.confidence;
      }

      // Always collect training data regardless of which method was used
      await this.collector.collectShouldRespondData(
        runtime,
        message,
        state || { values: {}, data: {}, text: '' },
        decision,
        reasoning,
        confidence
      );

      const responseTime = Date.now() - startTime;
      elizaLogger.debug(`🤖 ShouldRespond decision: ${decision ? 'RESPOND' : 'IGNORE'} (${responseTime}ms, confidence: ${confidence})`);

      return { shouldRespond: decision, reasoning, confidence };
      
    } catch (error) {
      elizaLogger.error('❌ ShouldRespond model error:', error);
      
      // Fallback to safe default
      const fallbackResult = { shouldRespond: false, reasoning: 'Error in processing, defaulting to no response', confidence: 0.1 };
      
      // Still try to collect the error case
      try {
        await this.collector.collectShouldRespondData(
          runtime,
          message,
          state || { values: {}, data: {}, text: '' },
          false,
          `Error: ${error}`,
          0.1
        );
      } catch (collectError) {
        elizaLogger.warn('Failed to collect error case data:', collectError);
      }
      
      return fallbackResult;
    }
  }

  /**
   * Use custom trained model for inference
   */
  private async inferWithCustomModel(message: Memory, state: State): Promise<{ decision: boolean; reasoning: string; confidence: number }> {
    if (!this.togetherClient || !this.customModelName) {
      throw new Error('Custom model not properly configured');
    }

    // Format input for the model
    const modelInput = this.formatInputForModel(message, state);
    
    // Call the fine-tuned model
    const response = await this.togetherClient.testInference(
      this.customModelName,
      JSON.stringify(modelInput),
      200 // Small max tokens for binary decision
    );

    // Parse model response
    return this.parseModelResponse(response);
  }

  /**
   * Default heuristic logic with enhanced reasoning
   */
  private async defaultShouldRespondLogic(
    runtime: IAgentRuntime,
    message: Memory,
    state: State
  ): Promise<{ decision: boolean; reasoning: string; confidence: number }> {
    const factors = [];
    let score = 0;
    const text = message.content.text || '';

    // Direct mention or addressing agent
    if (this.checkMentionsAgent(message, runtime)) {
      score += 0.8;
      factors.push('mentioned_agent');
    }

    // Direct message channel
    if (state.data?.roomType === 'DM') {
      score += 0.7;
      factors.push('direct_message');
    }

    // Contains question
    if (/\?/.test(text)) {
      score += 0.4;
      factors.push('contains_question');
    }

    // Greeting
    if (/\b(hello|hi|hey|good morning|good afternoon|good evening)\b/i.test(text)) {
      score += 0.3;
      factors.push('greeting');
    }

    // Command format
    if (/^[!/.]/.test(text)) {
      score += 0.6;
      factors.push('command_format');
    }

    // Recent conversation activity
    const timeSinceLastResponse = this.getTimeSinceLastResponse(state, runtime.agentId);
    if (timeSinceLastResponse < 2 * 60 * 1000) { // 2 minutes
      score += 0.2;
      factors.push('recent_activity');
    }

    // Very short messages might be reactions/emotes
    if (text.length < 5) {
      score -= 0.3;
      factors.push('very_short_message');
    }

    // Empty or whitespace only
    if (/^\s*$/.test(text)) {
      score -= 0.8;
      factors.push('empty_message');
    }

    // Determine decision
    const decision = score > 0.3;
    const confidence = Math.min(Math.abs(score), 0.95); // Cap confidence
    
    const reasoning = `Score: ${score.toFixed(2)} based on factors: ${factors.join(', ')}. Decision: ${decision ? 'respond' : 'ignore'} (threshold: 0.3)`;

    return { decision, reasoning, confidence };
  }

  /**
   * Format message and context for the model
   */
  private formatInputForModel(message: Memory, state: State) {
    const recentMessages = state.data?.recentMessages || [];
    const context = recentMessages.slice(-3).map((msg: any) => ({
      text: msg.content?.text?.substring(0, 100) || '',
      sender: msg.entityId === message.agentId ? 'agent' : 'user',
    }));

    return {
      message: message.content.text || '',
      context: context,
      channel_type: state.data?.roomType || 'unknown',
      mentions_agent: message.content.text?.includes('@') || false,
      message_length: (message.content.text || '').length,
    };
  }

  /**
   * Parse model response into structured output
   */
  private parseModelResponse(response: string): { decision: boolean; reasoning: string; confidence: number } {
    try {
      // Try to parse as JSON first
      const parsed = JSON.parse(response);
      return {
        decision: parsed.decision === 'RESPOND' || parsed.decision === true,
        reasoning: parsed.reasoning || 'Custom model decision',
        confidence: parsed.confidence || 0.8,
      };
    } catch {
      // Fallback to text parsing
      const decision = /respond|yes|true/i.test(response);
      const confidenceMatch = response.match(/confidence[:\s]*([\d.]+)/i);
      const confidence = confidenceMatch ? parseFloat(confidenceMatch[1]) : 0.7;
      
      return {
        decision,
        reasoning: response.substring(0, 200), // Truncate reasoning
        confidence: Math.min(confidence, 0.95),
      };
    }
  }

  // Helper methods
  private checkMentionsAgent(message: Memory, runtime: IAgentRuntime): boolean {
    const text = message.content.text || '';
    const agentName = runtime.character?.name || '';
    return text.includes(`@${runtime.agentId}`) || 
           text.toLowerCase().includes(agentName.toLowerCase()) ||
           text.includes('<@') || // Discord mention format
           /\b(hey|hi|hello)\s+(agent|bot|assistant|eliza)\b/i.test(text);
  }

  private getTimeSinceLastResponse(state: State, agentId: string): number {
    const recentMessages = state.data?.recentMessages || [];
    for (let i = recentMessages.length - 1; i >= 0; i--) {
      if (recentMessages[i].entityId === agentId) {
        return Date.now() - recentMessages[i].createdAt;
      }
    }
    return Infinity;
  }

  /**
   * Export collected training data
   */
  async exportTrainingDataset(limit: number = 10000) {
    return await this.collector.exportShouldRespondDataset(limit);
  }
}