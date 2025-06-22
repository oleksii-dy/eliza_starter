/**
 * Conversation/Reply Model - Training on Discord conversations for natural dialogue
 * 
 * This model trains on actual Discord conversations from the elizaOS community
 * and other sources to learn natural conversation patterns and response generation.
 * 
 * Key features:
 * - Parse Discord JSON exports into training data
 * - Create character profiles for each user based on their messaging patterns
 * - Format training data exactly like ElizaOS prompt structure
 * - Handle <thinking> blocks for reasoning
 * - Support both 8B and 32B model sizes
 * - Preserve authentic communication styles
 * 
 * Model Sizes:
 * - 8B Model: Casual conversations, simple interactions, quick responses
 * - 32B Model: Complex discussions, technical content, detailed explanations with thinking
 */

export { DiscordConversationParser, type ConversationTrainingExample, type DiscordMessage, type DiscordConversationExport } from './DiscordConversationParser';
export { ConversationDatasetBuilder } from './ConversationDatasetBuilder';

// Export configuration
export const CONVERSATION_MODEL_CONFIG = {
  MODEL_SIZES: {
    '8B': {
      target_model: 'Qwen/Qwen2.5-8B-Instruct',
      max_context_length: 2048,
      use_thinking: false,
      complexity_threshold: 'simple',
      conversation_types: ['casual', 'questions', 'greetings', 'simple_responses'],
    },
    '32B': {
      target_model: 'Qwen/QwQ-32B-Preview', // R1 distillation
      max_context_length: 8192,
      use_thinking: true,
      complexity_threshold: 'complex',
      conversation_types: ['technical', 'detailed_explanations', 'complex_reasoning', 'multi_turn'],
    },
  },
  TRAINING_FORMAT: 'instruction_following_with_character_profiles',
  DATA_SOURCES: ['discord_exports', 'community_conversations'],
  CHARACTER_GENERATION: true,
  THINKING_BLOCKS: true,
};

// Training data format specification
export interface ConversationModelTrainingFormat {
  instruction: string; // System prompt with character profile
  input: string; // Conversation history + current context
  output: string; // Response (with optional <thinking> blocks)
  metadata: {
    user_id: string;
    character_profile: string; // Character file reference
    conversation_id: string;
    response_type: string;
    model_size: '8B' | '32B';
    has_thinking: boolean;
    has_actions: boolean;
    context_length: number;
  };
}

// Model deployment configuration for Together.ai
export const CONVERSATION_DEPLOYMENT_CONFIG = {
  '8B': {
    base_model: 'Qwen/Qwen2.5-8B-Instruct',
    training_format: 'instruction_following',
    max_tokens: 512,
    temperature: 0.7,
    system_prompt_template: `You are {character_name}, responding naturally in a conversation. Match your established communication style and personality.

Your traits: {character_traits}
Your interests: {character_topics}
Your style: {character_style}

Respond naturally and authentically as this person would.`,
    
    fine_tuning_config: {
      learning_rate: 2e-5,
      batch_size: 8,
      epochs: 2,
      warmup_steps: 200,
      max_grad_norm: 1.0,
    },
  },
  
  '32B': {
    base_model: 'Qwen/QwQ-32B-Preview', // R1 distillation for thinking
    training_format: 'instruction_following_with_thinking',
    max_tokens: 2048,
    temperature: 0.6,
    system_prompt_template: `You are {character_name}, an intelligent conversationalist with access to reasoning capabilities.

{character_bio}

Your personality: {character_traits}
Your expertise: {character_topics}
Your communication style: {character_style}

When responding to complex topics, use <thinking> blocks to reason through your response:
<thinking>
Consider the context, analyze the question, think through implications, plan your response...
</thinking>

Then provide your natural response as {character_name} would.`,
    
    fine_tuning_config: {
      learning_rate: 1e-5,
      batch_size: 4,
      epochs: 1,
      warmup_steps: 100,
      max_grad_norm: 0.5,
      gradient_accumulation_steps: 4,
    },
  },
};

// Data processing configuration
export const DATA_PROCESSING_CONFIG = {
  discord_parsing: {
    max_context_messages: 10,
    min_message_length: 5,
    max_message_length: 2000,
    skip_bot_messages: true,
    preserve_mentions: true,
    preserve_replies: true,
    extract_actions: true,
  },
  
  character_generation: {
    min_messages_for_profile: 10,
    analyze_writing_style: true,
    extract_topics: true,
    generate_examples: true,
    include_bio: true,
  },
  
  quality_filters: {
    min_context_length: 2,
    max_context_length: 20,
    min_response_length: 10,
    max_response_length: 1000,
    filter_spam: true,
    filter_empty: true,
    require_meaningful_content: true,
  },
};