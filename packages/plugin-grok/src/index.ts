import {
  Service,
  defineService,
  BaseLanguageModel,
  ChatLanguageModel,
  LanguageModelInput,
  LanguageModelOutput,
  LanguageModelStream,
  ChatConfig,
  ChatMessage,
  ToolCall,
  logger,
} from '@elizaos/core';
import OpenAI from 'openai';

const GROK_API_BASE_URL = 'https://api.x.ai/v1';
const DEFAULT_GROK_MODEL = 'grok-3-latest'; // Or whatever the primary model is called

interface GrokPluginConfig {
  apiKey?: string;
  baseURL?: string;
  defaultModel?: string;
}

export class GrokLanguageModel extends ChatLanguageModel {
  private client: OpenAI;
  private modelName: string;

  constructor(config?: GrokPluginConfig) {
    super();
    const apiKey = config?.apiKey || process.env.XAI_API_KEY;
    const baseURL = config?.baseURL || GROK_API_BASE_URL;
    this.modelName = config?.defaultModel || DEFAULT_GROK_MODEL;

    if (!apiKey) {
      throw new Error(
        'XAI_API_KEY is not set in environment variables and no apiKey provided in config. Grok plugin cannot be initialized.'
      );
    }

    this.client = new OpenAI({
      apiKey: apiKey,
      baseURL: baseURL,
    });
  }

  async generate(
    messages: ChatMessage[],
    config?: ChatConfig,
    toolCalls?: ToolCall[] // Added toolCalls parameter
  ): Promise<LanguageModelOutput> {
    try {
      const modelToUse = config?.model || this.modelName;
      const openAIMessages: OpenAI.Chat.ChatCompletionMessageParam[] = messages.map((msg) => ({
        role: msg.role as 'system' | 'user' | 'assistant' | 'tool', // Cast to OpenAI's expected roles
        content: msg.content,
        // TODO: Handle tool_calls and tool_call_id if present in ChatMessage
      }));

      // Add tool_calls to the request if provided (OpenAI SDK format)
      const tools = toolCalls && toolCalls.length > 0 ? toolCalls.map(tc => ({ type: tc.type, function: tc.function })) : undefined;

      const completion = await this.client.chat.completions.create({
        model: modelToUse,
        messages: openAIMessages,
        temperature: config?.temperature,
        max_tokens: config?.maxTokens,
        stream: false,
        tools: tools, // Pass tools here
        tool_choice: config?.toolChoice // Pass tool_choice if provided
      });

      const choice = completion.choices[0];
      if (!choice || !choice.message) {
        throw new Error('No message choice returned from Grok API');
      }

      return {
        content: choice.message.content || '',
        model: modelToUse,
        usage: completion.usage
          ? {
              promptTokens: completion.usage.prompt_tokens,
              completionTokens: completion.usage.completion_tokens,
              totalTokens: completion.usage.total_tokens,
            }
          : undefined,
        // TODO: Map response tool_calls back to ElizaOS ToolCall[] format if needed
        toolCalls: choice.message.tool_calls?.map(tc => ({
          id: tc.id,
          type: tc.type as 'function', // Assuming 'function' for now
          function: {
            name: tc.function.name || '',
            arguments: tc.function.arguments || ''
          }
        }))
      };
    } catch (error: any) {
      logger.error('Error calling Grok API:', error.message);
      // Consider re-throwing a more specific error or an ElizaError
      throw error;
    }
  }

  async stream(
    messages: ChatMessage[],
    config?: ChatConfig,
    toolCalls?: ToolCall[] // Added toolCalls parameter
  ): Promise<LanguageModelStream> {
    // Similar to generate, but sets stream: true and handles the stream response
    // This requires more complex handling of the ReadableStream from OpenAI SDK
    // For now, let's log a TODO and throw a not implemented error
    logger.warn('Grok plugin stream method is not yet fully implemented.');

    const modelToUse = config?.model || this.modelName;
    const openAIMessages: OpenAI.Chat.ChatCompletionMessageParam[] = messages.map((msg) => ({
      role: msg.role as 'system' | 'user' | 'assistant' | 'tool',
      content: msg.content,
    }));

    const tools = toolCalls && toolCalls.length > 0 ? toolCalls.map(tc => ({ type: tc.type, function: tc.function })) : undefined;

    try {
      const stream = await this.client.chat.completions.create({
        model: modelToUse,
        messages: openAIMessages,
        temperature: config?.temperature,
        max_tokens: config?.maxTokens,
        stream: true,
        tools: tools,
        tool_choice: config?.toolChoice
      });

      // Transform the OpenAI stream into a LanguageModelStream
      // This is a simplified example; actual implementation needs robust error handling
      // and correct mapping of chunk types (content, tool_calls, etc.)
      const outputStream = new ReadableStream<LanguageModelOutput>({
        async start(controller) {
          try {
            for await (const chunk of stream) {
              const choice = chunk.choices[0];
              if (choice) {
                                const delta = choice.delta;
                                const finishReason = choice.finish_reason;

                                const outputChunk: LanguageModelOutput = {
                                    content: delta?.content || '',
                                    model: modelToUse, // Or from chunk if available
                                    isPartial: finishReason === null || finishReason === undefined,
                                    isFinal: finishReason !== null && finishReason !== undefined,
                                    finishReason: finishReason || undefined,
                                    // Map tool_calls if present in delta
                                    toolCalls: delta?.tool_calls?.map(tc => ({
                                        id: tc.id || '', // Ensure id is present
                                        index: tc.index, // OpenAI stream includes index for tool calls
                                        type: tc.type as 'function',
                                        function: {
                                            name: tc.function?.name || '',
                                            arguments: tc.function?.arguments || ''
                                        }
                                    })) || undefined,
                                    usage: chunk.usage ? { // Usage might appear in the last chunk with some models
                                        promptTokens: chunk.usage.prompt_tokens,
                                        completionTokens: chunk.usage.completion_tokens,
                                        totalTokens: chunk.usage.total_tokens,
                                    } : undefined,
                                };
                                controller.enqueue(outputChunk);
              }
              if (choice?.finish_reason) {
                controller.close();
                return;
              }
            }
            controller.close();
          } catch (err: any) {
            logger.error('Error processing Grok stream:', err.message);
            controller.error(err);
          }
        },
      });
      return outputStream;

    } catch (error: any) {
      logger.error('Error initiating Grok stream:', error.message);
      throw error;
    }
  }
}

// Define the service using the ElizaOS core helper
// This makes the GrokLanguageModel available as a service named 'grok'
export const GrokService = defineService<GrokLanguageModel>({
  serviceType: 'grok', // This will be the name used to refer to the service
  description: 'Provides access to Grok language models via xAI API (OpenAI compatible).',
  async start(): Promise<GrokLanguageModel> {
    // Here, you could add any async initialization if needed,
    // but for GrokLanguageModel, the constructor handles API key checks.
    // Config could be loaded from runtime settings if desired.
    return new GrokLanguageModel();
  },
  async stop(): Promise<void> {
    // Add any cleanup logic if necessary
    logger.info('Grok service stopped.');
  },
});

// Optional: export the model class directly if it's useful elsewhere
export default GrokLanguageModel;

// To make this plugin discoverable, it typically needs to be registered or
// included in a way that the ElizaOS system can find it.
// This might involve adding it to a list of known plugins,
// or updating the plugin registry mechanism if one exists for local plugins.
// For now, characters will reference it by its package name if installed locally,
// or by its serviceType 'grok' if registered globally.
