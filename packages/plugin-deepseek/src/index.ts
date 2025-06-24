import type {
  IAgentRuntime,
  Plugin,
  GenerateTextParams,
  ModelProvider,
  ModelType,
  ObjectGenerationParams,
} from '@elizaos/core';
import { logger } from '@elizaos/core';
import { validateConfig, type DeepSeekConfig } from './environment';
import { DeepSeekAPI } from './deepseek-api';

let deepSeekApiInstance: DeepSeekAPI | null = null;
let pluginConfig: DeepSeekConfig | null = null;

export const deepSeekPlugin: Plugin = {
  name: 'deepseek',
  description: 'A plugin for integrating DeepSeek AI models with ElizaOS.',

  async init(config: Record<string, any>) {
    logger.info('Initializing DeepSeek plugin...');
    try {
      pluginConfig = validateConfig(config);
      logger.debug('DeepSeek plugin configuration validated:', {
        // Be careful not to log the full API key
        DEEPSEEK_BASE_URL: pluginConfig.DEEPSEEK_BASE_URL,
        DEEPSEEK_CHAT_MODEL: pluginConfig.DEEPSEEK_CHAT_MODEL,
        hasApiKey: !!pluginConfig.DEEPSEEK_API_KEY,
      });

      deepSeekApiInstance = new DeepSeekAPI(pluginConfig);
      logger.success('DeepSeek plugin initialized successfully.');
    } catch (error) {
      logger.error('Failed to initialize DeepSeek plugin:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error; // Re-throw to prevent ElizaOS from loading a misconfigured plugin
    }
  },

  models: {
    [ModelType.TEXT_SMALL]: async (
      _runtime: IAgentRuntime,
      params: GenerateTextParams,
    ): Promise<string> => {
      if (!deepSeekApiInstance || !pluginConfig) {
        throw new Error('DeepSeek plugin not initialized or configured.');
      }
      logger.debug(`Using DeepSeek model for TEXT_SMALL: ${pluginConfig.DEEPSEEK_CHAT_MODEL}`);
      try {
        const response = await deepSeekApiInstance.generateText(
          params.prompt,
          pluginConfig.DEEPSEEK_CHAT_MODEL, // Use configured model
          {
            temperature: params.temperature,
            max_tokens: params.maxTokens,
            top_p: params.topP,
            system_prompt: params.system, // Pass system prompt from GenerateTextParams
            // TODO: Map other params like stopSequences if supported by DeepSeek
          },
        );
        return response;
      } catch (error) {
        logger.error('DeepSeek TEXT_SMALL generation failed:', error);
        throw error;
      }
    },

    [ModelType.TEXT_LARGE]: async (
      _runtime: IAgentRuntime,
      params: GenerateTextParams,
    ): Promise<string> => {
      if (!deepSeekApiInstance || !pluginConfig) {
        throw new Error('DeepSeek plugin not initialized or configured.');
      }
      logger.debug(`Using DeepSeek model for TEXT_LARGE: ${pluginConfig.DEEPSEEK_CHAT_MODEL}`);
      // For now, TEXT_LARGE uses the same model as TEXT_SMALL.
      // This can be configured differently in environment.ts or if DeepSeek offers various model sizes.
      try {
        const response = await deepSeekApiInstance.generateText(
          params.prompt,
          pluginConfig.DEEPSEEK_CHAT_MODEL, // Use configured model
          {
            temperature: params.temperature,
            max_tokens: params.maxTokens,
            top_p: params.topP,
            system_prompt: params.system, // Pass system prompt from GenerateTextParams
            // TODO: Map other params like stopSequences if supported by DeepSeek
          },
        );
        return response;
      } catch (error) {
        logger.error('DeepSeek TEXT_LARGE generation failed:', error);
        throw error;
      }
    },

    [ModelType.OBJECT_SMALL]: async (
        _runtime: IAgentRuntime,
        params: ObjectGenerationParams,
    ): Promise<Record<string, any>> => {
        if (!deepSeekApiInstance || !pluginConfig) {
            throw new Error('DeepSeek plugin not initialized or configured.');
        }
        logger.debug(`Using DeepSeek model for OBJECT_SMALL: ${pluginConfig.DEEPSEEK_CHAT_MODEL}`);
        try {
            // Construct a prompt that asks for JSON output according to the schema
            // This is a simplified approach. More sophisticated schema-to-prompt generation might be needed.
            const schemaDescription = params.schema
                ? ` The output MUST be a valid JSON object adhering to the following JSON schema: \`\`\`json\n${JSON.stringify(params.schema, null, 2)}\n\`\`\``
                : ' The output MUST be a valid JSON object.';

            const fullPrompt = `${params.prompt}\n${schemaDescription}\nRespond ONLY with the JSON object.`;

            const textResponse = await deepSeekApiInstance.generateText(
                fullPrompt,
                pluginConfig.DEEPSEEK_CHAT_MODEL,
                {
                    temperature: params.temperature,
                    max_tokens: params.maxTokens,
                    top_p: params.topP,
                    system_prompt: params.system, // Pass system prompt from ObjectGenerationParams
                    request_json_response: true, // Hint to API layer to request JSON
                },
            );

            // Attempt to parse the response as JSON
            try {
                // Extract JSON from potential markdown code blocks
                const jsonRegex = /```(?:json)?\s*([\s\S]*?)\s*```/;
                const match = textResponse.match(jsonRegex);
                const jsonString = match && match[1] ? match[1].trim() : textResponse.trim();

                return JSON.parse(jsonString);
            } catch (e) {
                logger.error('Failed to parse DeepSeek response as JSON for OBJECT_SMALL:', {
                    error: e instanceof Error ? e.message : String(e),
                    response: textResponse,
                });
                throw new Error('DeepSeek response was not valid JSON.');
            }
        } catch (error) {
            logger.error('DeepSeek OBJECT_SMALL generation failed:', error);
            throw error;
        }
    },
    // TODO: Implement TEXT_EMBEDDING if DeepSeek offers an embedding API
    // TODO: Implement OBJECT_LARGE similarly to OBJECT_SMALL
  } as Partial<ModelProvider>, // Use Partial as not all ModelTypes might be implemented initially

  // TODO: Add tests suite if needed by ElizaOS plugin structure,
  // though AGENTS.md prefers Vitest unit tests within the plugin.
};

export default deepSeekPlugin;
