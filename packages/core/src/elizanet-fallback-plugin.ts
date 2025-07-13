import {
  type DetokenizeTextParams,
  type GenerateTextParams,
  type IAgentRuntime,
  type ImageDescriptionParams,
  type ModelTypeName,
  type ObjectGenerationParams,
  type Plugin,
  type TextEmbeddingParams,
  type TokenizeTextParams,
} from './types';
import {
  EventType,
  logger,
  ModelType,
  safeReplacer,
  VECTOR_DIMS,
} from './index';
import {
  generateObject,
  generateText,
  JSONParseError,
  type JSONValue,
  type LanguageModelUsage,
} from 'ai';
import { encodingForModel, type TiktokenModel } from 'js-tiktoken';
import { fetch } from 'undici';
import { createOpenAI } from '@ai-sdk/openai';

/**
 * Retrieves a configuration setting from the runtime, falling back to environment variables or a default value if not found.
 *
 * @param key - The name of the setting to retrieve.
 * @param defaultValue - The value to return if the setting is not found in the runtime or environment.
 * @returns The resolved setting value, or {@link defaultValue} if not found.
 */
function getSetting(
  runtime: IAgentRuntime,
  key: string,
  defaultValue?: string
): string | undefined {
  return runtime.getSetting(key) ?? process.env[key] ?? defaultValue;
}

/**
 * Retrieves the ElizaNet API base URL from runtime settings, environment variables, or defaults.
 *
 * @returns The resolved base URL for ElizaNet API requests.
 */
function getBaseURL(runtime: IAgentRuntime): string {
  const baseURL = getSetting(runtime, 'ELIZANET_BASE_URL', 'http://elizanet.up.railway.app') as string;
  logger.debug(`[ElizaNet] Base URL: ${baseURL}`);
  return baseURL;
}

/**
 * Helper function to get the API key for ElizaNet
 *
 * @param runtime The runtime context
 * @returns The configured API key
 */
function getApiKey(runtime: IAgentRuntime): string | undefined {
  return getSetting(runtime, 'ELIZANET_API_KEY');
}

/**
 * Helper function to get the timeout for ElizaNet requests
 *
 * @param runtime The runtime context
 * @returns The configured timeout in milliseconds
 */
function getTimeout(runtime: IAgentRuntime): number {
  return parseInt(getSetting(runtime, 'ELIZANET_TIMEOUT', '30000') || '30000', 10);
}

/**
 * Helper function to get the small model name with fallbacks
 *
 * @param runtime The runtime context
 * @returns The configured small model name
 */
function getSmallModel(runtime: IAgentRuntime): string {
  return (
    getSetting(runtime, 'ELIZANET_SMALL_MODEL') ??
    getSetting(runtime, 'SMALL_MODEL') ??
    'gpt-4o-mini'
  );
}

/**
 * Helper function to get the large model name with fallbacks
 *
 * @param runtime The runtime context
 * @returns The configured large model name
 */
function getLargeModel(runtime: IAgentRuntime): string {
  return (
    getSetting(runtime, 'ELIZANET_LARGE_MODEL') ??
    getSetting(runtime, 'LARGE_MODEL') ??
    'gpt-4o'
  );
}

/**
 * Helper function to get the embedding model name with fallbacks
 *
 * @param runtime The runtime context
 * @returns The configured embedding model name
 */
function getEmbeddingModel(runtime: IAgentRuntime): string {
  return getSetting(runtime, 'ELIZANET_EMBEDDING_MODEL') ?? 'text-embedding-3-small';
}

/**
 * Helper function to get the image model name with fallbacks
 *
 * @param runtime The runtime context
 * @returns The configured image model name
 */
function getImageModel(runtime: IAgentRuntime): string {
  return getSetting(runtime, 'ELIZANET_IMAGE_MODEL') ?? 'dall-e-3';
}

/**
 * Create an OpenAI client for ElizaNet with proper configuration
 *
 * @param runtime The runtime context
 * @returns Configured OpenAI client
 */
function createElizaNetClient(runtime: IAgentRuntime) {
  return createOpenAI({
    apiKey: getApiKey(runtime) || 'dummy-key', // LiteLLM might not require API key
    baseURL: getBaseURL(runtime),
  });
}

/**
 * Emits a model usage event
 * @param runtime The runtime context
 * @param type The model type
 * @param prompt The prompt used
 * @param usage The LLM usage data
 */
function emitModelUsageEvent(
  runtime: IAgentRuntime,
  type: ModelTypeName,
  prompt: string,
  usage: LanguageModelUsage
) {
  runtime.emitEvent(EventType.MODEL_USED, {
    provider: 'elizanet-fallback',
    type,
    prompt,
    tokens: {
      prompt: usage.promptTokens,
      completion: usage.completionTokens,
      total: usage.totalTokens,
    },
  });
}

/**
 * ElizaNet text generation handler
 */
async function elizaNetTextGeneration(
  runtime: IAgentRuntime,
  params: GenerateTextParams
): Promise<string> {
  const baseUrl = getBaseURL(runtime);
  const apiKey = getApiKey(runtime);
  const timeout = getTimeout(runtime);
  const modelName = params.prompt ? getSmallModel(runtime) : getLargeModel(runtime);
  
  logger.debug(`[ElizaNet] Text generation request for ${modelName}`, {
    baseUrl,
    hasApiKey: !!apiKey,
    timeout,
  });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const messages = [
      ...(runtime.character.system ? [{ role: 'system', content: runtime.character.system }] : []),
      { role: 'user', content: params.prompt },
    ];

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const response = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: modelName,
        messages,
        max_tokens: params.maxTokens || 1000,
        temperature: params.temperature || 0.7,
        top_p: 1,
        frequency_penalty: params.frequencyPenalty || 0,
        presence_penalty: params.presencePenalty || 0,
        stop: params.stopSequences || null,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`ElizaNet API error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as {
      choices: Array<{ message: { content: string } }>;
      usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
    };

    if (
      !data?.choices ||
      !Array.isArray(data.choices) ||
      !data.choices[0] ||
      !data.choices[0].message
    ) {
      throw new Error('Invalid response from ElizaNet API');
    }

    if (data.usage) {
      emitModelUsageEvent(runtime, ModelType.TEXT_SMALL, params.prompt, {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      });
    }

    return data.choices[0].message.content || '';
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error(`ElizaNet API timeout after ${timeout}ms`);
    }
    throw error;
  }
}

/**
 * ElizaNet embedding handler
 */
async function elizaNetEmbedding(
  runtime: IAgentRuntime,
  params: TextEmbeddingParams | string | null
): Promise<number[]> {
  const embeddingModelName = getEmbeddingModel(runtime);
  const embeddingDimension = Number.parseInt(
    getSetting(runtime, 'ELIZANET_EMBEDDING_DIMENSIONS', '1536') || '1536',
    10
  ) as (typeof VECTOR_DIMS)[keyof typeof VECTOR_DIMS];

  logger.debug(
    `[ElizaNet] Using embedding model: ${embeddingModelName} with dimension: ${embeddingDimension}`
  );

  if (!Object.values(VECTOR_DIMS).includes(embeddingDimension)) {
    const errorMsg = `Invalid embedding dimension: ${embeddingDimension}. Must be one of: ${Object.values(VECTOR_DIMS).join(', ')}`;
    logger.error(errorMsg);
    throw new Error(errorMsg);
  }

  if (params === null) {
    logger.debug('Creating test embedding for initialization');
    const testVector = Array(embeddingDimension).fill(0);
    testVector[0] = 0.1;
    return testVector;
  }

  let text: string;
  if (typeof params === 'string') {
    text = params;
  } else if (typeof params === 'object' && params.text) {
    text = params.text;
  } else {
    logger.warn('Invalid input format for embedding');
    const fallbackVector = Array(embeddingDimension).fill(0);
    fallbackVector[0] = 0.2;
    return fallbackVector;
  }

  if (!text.trim()) {
    logger.warn('Empty text for embedding');
    const emptyVector = Array(embeddingDimension).fill(0);
    emptyVector[0] = 0.3;
    return emptyVector;
  }

  const baseUrl = getBaseURL(runtime);
  const apiKey = getApiKey(runtime);
  const timeout = getTimeout(runtime);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const response = await fetch(`${baseUrl}/v1/embeddings`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: embeddingModelName,
        input: text,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      logger.error(`ElizaNet Embedding API error: ${response.status} - ${response.statusText}`);
      const errorVector = Array(embeddingDimension).fill(0);
      errorVector[0] = 0.4;
      return errorVector;
    }

    const data = (await response.json()) as {
      data: [{ embedding: number[] }];
      usage?: { prompt_tokens: number; total_tokens: number };
    };

    if (!data?.data?.[0]?.embedding) {
      logger.error('Invalid embedding response from ElizaNet API');
      const errorVector = Array(embeddingDimension).fill(0);
      errorVector[0] = 0.5;
      return errorVector;
    }

    const embedding = data.data[0].embedding;

    if (data.usage) {
      emitModelUsageEvent(runtime, ModelType.TEXT_EMBEDDING, text, {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: 0,
        totalTokens: data.usage.total_tokens,
      });
    }

    logger.log(`Got valid embedding with length ${embedding.length}`);
    return embedding;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error(`ElizaNet Embedding API timeout after ${timeout}ms`);
    }
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Error generating embedding: ${message}`);
    const errorVector = Array(embeddingDimension).fill(0);
    errorVector[0] = 0.6;
    return errorVector;
  }
}

/**
 * ElizaNet image generation handler
 */
async function elizaNetImageGeneration(
  runtime: IAgentRuntime,
  params: {
    prompt: string;
    n?: number;
    size?: string;
    quality?: string;
    style?: string;
  }
): Promise<{ url: string }[]> {
  const baseUrl = getBaseURL(runtime);
  const apiKey = getApiKey(runtime);
  const timeout = getTimeout(runtime);
  const modelName = getImageModel(runtime);

  logger.debug(`[ElizaNet] Image generation request for ${modelName}`, {
    baseUrl,
    hasApiKey: !!apiKey,
    timeout,
  });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const response = await fetch(`${baseUrl}/v1/images/generations`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: modelName,
        prompt: params.prompt,
        n: params.n || 1,
        size: params.size || '1024x1024',
        quality: params.quality || 'standard',
        style: params.style || 'vivid',
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`ElizaNet Image API error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as {
      data: Array<{ url: string }>;
    };

    if (!data?.data || !Array.isArray(data.data) || !data.data[0] || !data.data[0].url) {
      throw new Error('Invalid image response from ElizaNet API');
    }

    return data.data.map((item: any) => ({ url: item.url }));
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error(`ElizaNet Image API timeout after ${timeout}ms`);
    }
    throw error;
  }
}

/**
 * Asynchronously tokenizes the given text based on the specified model and prompt.
 *
 * @param {ModelTypeName} model - The type of model to use for tokenization.
 * @param {string} prompt - The text prompt to tokenize.
 * @returns {number[]} - An array of tokens representing the encoded prompt.
 */
async function tokenizeText(model: ModelTypeName, prompt: string) {
  const modelName =
    model === ModelType.TEXT_SMALL
      ? 'gpt-4o-mini'
      : 'gpt-4o';
  const encoding = encodingForModel(modelName as TiktokenModel);
  const tokens = encoding.encode(prompt);
  return tokens;
}

/**
 * Detokenize a sequence of tokens back into text using the specified model.
 *
 * @param {ModelTypeName} model - The type of model to use for detokenization.
 * @param {number[]} tokens - The sequence of tokens to detokenize.
 * @returns {string} The detokenized text.
 */
async function detokenizeText(model: ModelTypeName, tokens: number[]) {
  const modelName =
    model === ModelType.TEXT_SMALL
      ? 'gpt-4o-mini'
      : 'gpt-4o';
  const encoding = encodingForModel(modelName as TiktokenModel);
  return encoding.decode(tokens);
}

/**
 * Helper function to generate objects using specified model type
 */
async function generateObjectByModelType(
  runtime: IAgentRuntime,
  params: ObjectGenerationParams,
  modelType: string,
  getModelFn: (runtime: IAgentRuntime) => string
): Promise<JSONValue> {
  const client = createElizaNetClient(runtime);
  const modelName = getModelFn(runtime);
  logger.log(`[ElizaNet] Using ${modelType} model: ${modelName}`);
  const temperature = params.temperature ?? 0;

  try {
    const { object, usage } = await generateObject({
      model: client.languageModel(modelName),
      output: 'no-schema',
      prompt: params.prompt,
      temperature: temperature,
      experimental_repairText: getJsonRepairFunction(),
    });

    if (usage) {
      emitModelUsageEvent(runtime, modelType as ModelTypeName, params.prompt, usage);
    }
    return object;
  } catch (error: unknown) {
    if (error instanceof JSONParseError) {
      logger.error(`[generateObject] Failed to parse JSON: ${error.message}`);

      const repairFunction = getJsonRepairFunction();
      const repairedJsonString = await repairFunction({
        text: error.text,
        error,
      });

      if (repairedJsonString) {
        try {
          const repairedObject = JSON.parse(repairedJsonString);
          logger.info('[generateObject] Successfully repaired JSON.');
          return repairedObject;
        } catch (repairParseError: unknown) {
          const message =
            repairParseError instanceof Error
              ? repairParseError.message
              : String(repairParseError);
          logger.error(`[generateObject] Failed to parse repaired JSON: ${message}`);
          throw repairParseError;
        }
      } else {
        logger.error('[generateObject] JSON repair failed.');
        throw error;
      }
    } else {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`[generateObject] Unknown error: ${message}`);
      throw error;
    }
  }
}

/**
 * Returns a function to repair JSON text
 */
function getJsonRepairFunction(): (params: {
  text: string;
  error: unknown;
}) => Promise<string | null> {
  return async ({ text, error }: { text: string; error: unknown }) => {
    try {
      if (error instanceof JSONParseError) {
        const cleanedText = text.replace(/```json\n|\n```|```/g, '');
        JSON.parse(cleanedText);
        return cleanedText;
      }
      return null;
    } catch (jsonError: unknown) {
      const message = jsonError instanceof Error ? jsonError.message : String(jsonError);
      logger.warn(`Failed to repair JSON text: ${message}`);
      return null;
    }
  };
}

/**
 * Defines the ElizaNet fallback plugin with its name, description, and configuration options.
 * @type {Plugin}
 */
export const elizaNetFallbackPlugin: Plugin = {
  name: 'elizanet-fallback',
  description: 'ElizaNet LiteLLM fallback plugin for rate limiting and network errors',
  config: {
    ELIZANET_BASE_URL: process.env.ELIZANET_BASE_URL,
    ELIZANET_API_KEY: process.env.ELIZANET_API_KEY,
    ELIZANET_TIMEOUT: process.env.ELIZANET_TIMEOUT,
    ELIZANET_SMALL_MODEL: process.env.ELIZANET_SMALL_MODEL,
    ELIZANET_LARGE_MODEL: process.env.ELIZANET_LARGE_MODEL,
    ELIZANET_EMBEDDING_MODEL: process.env.ELIZANET_EMBEDDING_MODEL,
    ELIZANET_EMBEDDING_DIMENSIONS: process.env.ELIZANET_EMBEDDING_DIMENSIONS,
    ELIZANET_IMAGE_MODEL: process.env.ELIZANET_IMAGE_MODEL,
    ELIZANET_FALLBACK_ENABLED: process.env.ELIZANET_FALLBACK_ENABLED,
  },
  async init(_config, runtime) {
    // Validate configuration in the background
    new Promise<void>(async (resolve) => {
      resolve();
      try {
        const baseURL = getBaseURL(runtime);
        const apiKey = getApiKey(runtime);
        const enabled = getSetting(runtime, 'ELIZANET_FALLBACK_ENABLED', 'true') !== 'false';
        
        if (!enabled) {
          logger.info('ElizaNet fallback is disabled');
          return;
        }

        logger.info(`ElizaNet fallback plugin initialized with base URL: ${baseURL}`);
        
        // Optional: Test connection
        try {
          const testResponse = await fetch(`${baseURL}/v1/models`, {
            method: 'GET',
            headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
            signal: AbortSignal.timeout(5000),
          });
          
          if (testResponse.ok) {
            logger.info('ElizaNet fallback connection test successful');
          } else {
            logger.warn(`ElizaNet fallback connection test failed: ${testResponse.status}`);
          }
        } catch (testError: unknown) {
          const message = testError instanceof Error ? testError.message : String(testError);
          logger.warn(`ElizaNet fallback connection test error: ${message}`);
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        logger.warn(`ElizaNet fallback plugin initialization warning: ${message}`);
      }
    });
  },
  priority: -1, // Lower priority so it acts as a fallback
  models: {
    [ModelType.TEXT_EMBEDDING]: elizaNetEmbedding,
    [ModelType.TEXT_TOKENIZER_ENCODE]: async (
      _runtime,
      { prompt, modelType = ModelType.TEXT_LARGE }: TokenizeTextParams
    ) => {
      return await tokenizeText(modelType ?? ModelType.TEXT_LARGE, prompt);
    },
    [ModelType.TEXT_TOKENIZER_DECODE]: async (
      _runtime,
      { tokens, modelType = ModelType.TEXT_LARGE }: DetokenizeTextParams
    ) => {
      return await detokenizeText(modelType ?? ModelType.TEXT_LARGE, tokens);
    },
    [ModelType.TEXT_SMALL]: elizaNetTextGeneration,
    [ModelType.TEXT_LARGE]: elizaNetTextGeneration,
    [ModelType.IMAGE]: elizaNetImageGeneration,
    [ModelType.OBJECT_SMALL]: async (runtime: IAgentRuntime, params: ObjectGenerationParams) => {
      return generateObjectByModelType(runtime, params, ModelType.OBJECT_SMALL, getSmallModel);
    },
    [ModelType.OBJECT_LARGE]: async (runtime: IAgentRuntime, params: ObjectGenerationParams) => {
      return generateObjectByModelType(runtime, params, ModelType.OBJECT_LARGE, getLargeModel);
    },
  },
  tests: [
    {
      name: 'elizanet_fallback_plugin_tests',
      tests: [
        {
          name: 'elizanet_test_connection',
          fn: async (runtime: IAgentRuntime) => {
            const baseURL = getBaseURL(runtime);
            const apiKey = getApiKey(runtime);
            
            const headers: Record<string, string> = {};
            if (apiKey) {
              headers['Authorization'] = `Bearer ${apiKey}`;
            }
            
            const response = await fetch(`${baseURL}/v1/models`, {
              headers,
              signal: AbortSignal.timeout(5000),
            });
            
            if (!response.ok) {
              throw new Error(`Failed to connect to ElizaNet: ${response.statusText}`);
            }
            
            logger.log('ElizaNet connection test passed');
          },
        },
        {
          name: 'elizanet_test_text_generation',
          fn: async (runtime: IAgentRuntime) => {
            try {
              const response = await elizaNetTextGeneration(runtime, {
                prompt: 'Say hello in exactly 5 words',
                maxTokens: 100,
                temperature: 0.7,
              });
              
              if (!response || typeof response !== 'string' || response.length === 0) {
                throw new Error('Invalid text generation response');
              }
              
              logger.log('ElizaNet text generation test passed:', response);
            } catch (error: unknown) {
              const message = error instanceof Error ? error.message : String(error);
              logger.error(`ElizaNet text generation test failed: ${message}`);
              throw error;
            }
          },
        },
        {
          name: 'elizanet_test_embedding',
          fn: async (runtime: IAgentRuntime) => {
            try {
              const embedding = await elizaNetEmbedding(runtime, 'Hello, world!');
              
              if (!Array.isArray(embedding) || embedding.length === 0) {
                throw new Error('Invalid embedding response');
              }
              
              logger.log('ElizaNet embedding test passed with length:', embedding.length);
            } catch (error: unknown) {
              const message = error instanceof Error ? error.message : String(error);
              logger.error(`ElizaNet embedding test failed: ${message}`);
              throw error;
            }
          },
        },
      ],
    },
  ],
};

export default elizaNetFallbackPlugin;