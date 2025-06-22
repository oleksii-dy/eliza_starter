/**
 * ShouldRespond Model - Smallest possible model for binary response decisions
 * 
 * This model handles the fundamental question: "Should the agent respond to this message?"
 * 
 * Key features:
 * - Minimal model size (target: 1B-3B parameters)
 * - Binary classification (RESPOND/IGNORE)
 * - Real-time inference capability
 * - Comprehensive training data collection
 * - Feedback loop for continuous improvement
 * 
 * Model Training:
 * - Input: Message text, context, channel info, mention status
 * - Output: Binary decision + confidence + reasoning
 * - Training on actual shouldRespond decisions from production
 * - Balanced dataset with positive/negative examples
 */

export { ShouldRespondCollector } from './ShouldRespondCollector';
export { ShouldRespondModel } from './ShouldRespondModel';
export { shouldRespondProvider, shouldRespondEvaluator } from './ShouldRespondProvider';

// Export configuration helpers
export const SHOULD_RESPOND_CONFIG = {
  MODEL_SIZE_TARGET: 'small', // 1B-3B parameters
  MAX_CONTEXT_MESSAGES: 3,
  DECISION_THRESHOLD: 0.3,
  MAX_INFERENCE_TIME_MS: 100, // Fast response required
  TRAINING_DATA_COLLECTION: true,
  FEEDBACK_COLLECTION_INTERVAL: 5, // Every 5th message
};

// Export training data format specification
export interface ShouldRespondTrainingExample {
  input: {
    message: string;
    sender: string;
    mentions_agent: boolean;
    message_type: string;
    recent_activity: {
      messageCount: number;
      timeSpan: number;
      uniqueSenders: number;
    };
    conversation_context: Array<{
      text: string;
      sender: 'agent' | 'user';
    }>;
  };
  output: {
    decision: 'RESPOND' | 'IGNORE';
    confidence: number;
    reasoning: string;
  };
}

// Model deployment configuration for Together.ai
export const SHOULD_RESPOND_DEPLOYMENT_CONFIG = {
  base_model: 'Qwen/Qwen2.5-1.5B-Instruct', // Small, fast model
  training_format: 'instruction_following',
  max_tokens: 200,
  temperature: 0.1, // Low temperature for consistent binary decisions
  system_prompt: `You are a highly efficient binary classifier that decides whether an AI agent should respond to incoming messages.

Analyze the message and context, then respond with a JSON object:
{
  "decision": "RESPOND" or "IGNORE",
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation"
}

Respond when:
- Agent is directly mentioned or addressed
- Message is a direct question
- Message is a command or request
- Message is in a DM channel
- Message is a greeting to the agent

Ignore when:
- Message is empty or spam
- Message is not directed at agent
- Message is purely conversational between others
- Message is a reaction or emoji only`,
  
  fine_tuning_config: {
    learning_rate: 1e-5,
    batch_size: 16,
    epochs: 3,
    warmup_steps: 100,
  },
};