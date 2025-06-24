import { fetch } from 'undici';
import { logger } from '@elizaos/core';
import type { DeepSeekConfig } from './environment';

// Define basic structures for DeepSeek API request and response
// These are based on common OpenAI-compatible structures and should be verified against DeepSeek's official documentation.
interface DeepSeekMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface DeepSeekResponseFormat {
  type: "text" | "json_object";
}

interface DeepSeekChatCompletionRequest {
  model: string;
  messages: DeepSeekMessage[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  stream?: boolean;
  // stop?: string | string[]; // Common parameter for stop sequences
  response_format?: DeepSeekResponseFormat; // For requesting JSON output
  // Add other parameters as supported by DeepSeek, e.g., frequency_penalty, presence_penalty
}

interface DeepSeekChatCompletionChoice {
  index: number;
  message: {
    role: 'assistant';
    content: string;
  };
  finish_reason: string;
}

interface DeepSeekChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: DeepSeekChatCompletionChoice[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  error?: {
      message: string;
      type: string;
      param: string | null;
      code: string | null;
  }
}

export class DeepSeekAPI {
  private apiKey: string;
  private baseUrl: string;

  constructor(config: DeepSeekConfig) {
    this.apiKey = config.DEEPSEEK_API_KEY;
    this.baseUrl = config.DEEPSEEK_BASE_URL;
  }

  /**
   * Generates text using the DeepSeek chat completion API.
   *
   * @param {string} prompt - The user's prompt.
   * @param {string} model - The model to use (e.g., 'deepseek-chat').
   * @param {object} options - Additional options like temperature, max_tokens.
   * @returns {Promise<string>} The generated text from the assistant.
   * @throws {Error} If the API request fails or returns an error.
   */
  async generateText(
    prompt: string, // User prompt
    model: string,
    options: {
      temperature?: number;
      max_tokens?: number;
      top_p?: number;
      system_prompt?: string; // Optional system prompt
      request_json_response?: boolean; // Hint to request JSON object
      /* other options */
    } = {},
  ): Promise<string> {
    const apiUrl = `${this.baseUrl}/chat/completions`;

    const messages: DeepSeekMessage[] = [];
    if (options.system_prompt) {
      messages.push({ role: 'system', content: options.system_prompt });
    }
    messages.push({ role: 'user', content: prompt });

    const requestBody: DeepSeekChatCompletionRequest = {
      model: model,
      messages: messages,
      temperature: options.temperature ?? 0.7, // Use ?? for defaults to allow 0
      max_tokens: options.max_tokens ?? 2048,
      top_p: options.top_p ?? 1.0, // Default top_p
      // stream: false, // Default to non-streaming for simpler initial implementation
    };

    if (options.request_json_response) {
      // This assumes DeepSeek supports OpenAI-like JSON mode.
      // This should be verified with DeepSeek's documentation.
      requestBody.response_format = { type: "json_object" };
      logger.debug('Requesting JSON object response format from DeepSeek API.');
    }

    logger.debug('Sending request to DeepSeek API:', {
      url: apiUrl,
      model: requestBody.model,
      promptLength: prompt.length,
      systemPromptLength: options.system_prompt?.length,
      temperature: requestBody.temperature,
      max_tokens: requestBody.max_tokens,
      top_p: requestBody.top_p,
      response_format: requestBody.response_format?.type
    });

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        logger.error('DeepSeek API request failed:', {
          status: response.status,
          statusText: response.statusText,
          body: errorBody,
        });
        // Try to parse error for more details
        try {
            const parsedError = JSON.parse(errorBody) as DeepSeekChatCompletionResponse;
            if (parsedError.error) {
                 throw new Error(`DeepSeek API Error: ${parsedError.error.message} (Type: ${parsedError.error.type}, Code: ${parsedError.error.code})`);
            }
        } catch (e) {
            // If parsing fails, throw with the original text
        }
        throw new Error(`DeepSeek API request failed with status ${response.status}: ${errorBody}`);
      }

      const responseData = (await response.json()) as DeepSeekChatCompletionResponse;
      logger.debug('Received response from DeepSeek API:', {
        id: responseData.id,
        model: responseData.model,
        choicesCount: responseData.choices?.length,
        usage: responseData.usage,
      });

      if (responseData.error) {
        logger.error('DeepSeek API returned an error:', responseData.error);
        throw new Error(`DeepSeek API Error: ${responseData.error.message} (Type: ${responseData.error.type}, Code: ${responseData.error.code})`);
      }

      if (!responseData.choices || responseData.choices.length === 0) {
        logger.warn('DeepSeek API returned no choices.', { responseData });
        throw new Error('DeepSeek API returned no choices.');
      }

      const assistantMessage = responseData.choices[0].message.content;
      logger.info('Successfully generated text with DeepSeek.');
      return assistantMessage.trim();
    } catch (error) {
      logger.error('Error during DeepSeek API call:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error; // Re-throw the error to be handled by the caller
    }
  }

  // TODO: Implement `generateEmbeddings` if DeepSeek offers an embedding API.
  // async generateEmbeddings(texts: string[], model: string): Promise<Array<number[]>> {
  //   // Implementation would be similar to generateText, but for the embedding endpoint
  // }
}
