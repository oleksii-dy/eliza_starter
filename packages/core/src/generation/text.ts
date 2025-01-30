import { elizaLogger } from "../index";
import { getModelSettings } from "../models";
import { parseActionResponseFromText, parseBooleanFromText, parseJsonArrayFromText, parseJSONObjectFromText, parseShouldRespondFromText } from "../parsing";
import type { ActionResponse, Content } from "../types";
import { ModelProviderName } from "../types";
import * as providers from "./providers";
import type {
    GenerationModelSettings,
    GenerationOptions,
    ProviderOptions,
} from "./types";
import { trimTokens } from "./utils";

// Overloaded function signatures
export async function generateText(options: GenerationOptions): Promise<string>;
export async function generateText(provider: ModelProviderName, options: GenerationOptions): Promise<string>;
export async function generateText(
    providerOrOptions: ModelProviderName | GenerationOptions,
    options?: GenerationOptions
): Promise<string> {
    // Handle the case where only options are provided (backward compatibility)
    if (!options) {
        const opts = providerOrOptions as GenerationOptions;
        return generateTextInternal(opts.runtime.modelProvider, opts);
    }
    
    // Handle the case where provider and options are provided separately
    return generateTextInternal(providerOrOptions as ModelProviderName, options);
}

// Internal implementation
async function generateTextInternal(
    provider: ModelProviderName,
    options: GenerationOptions
): Promise<string> {
    const modelSettings = getModelSettings(provider, options.modelClass);
    const model = modelSettings.name;

    // Trim context to fit within model's token limit
    const context = await trimTokens(options.context, modelSettings.maxInputTokens, options.runtime);

    const modelOptions: GenerationModelSettings = {
        prompt: context,
        temperature: modelSettings.temperature,
        maxTokens: modelSettings.maxOutputTokens,
        frequencyPenalty: modelSettings.frequency_penalty,
        presencePenalty: modelSettings.presence_penalty,
        stop: options.stop || modelSettings.stop,
        experimental_telemetry: modelSettings.experimental_telemetry,
    };

    const providerOptions: ProviderOptions = {
        ...options,
        provider,
        model,
        apiKey: options.runtime.token,
        modelOptions,
    };

    switch (provider) {
        case ModelProviderName.OPENAI:
            return await providers.handleOpenAI(providerOptions);
        case ModelProviderName.ANTHROPIC:
            return await providers.handleAnthropic(providerOptions);
        case ModelProviderName.GROQ:
            return await providers.handleGroq(providerOptions);
        case ModelProviderName.GOOGLE:
            return await providers.handleGoogle(providerOptions);
        case ModelProviderName.MISTRAL:
            return await providers.handleMistral(providerOptions);
        case ModelProviderName.OLLAMA:
            return await providers.handleOllama(providerOptions);
        default:
            throw new Error(`Unsupported provider: ${provider}`);
    }
}

export async function generateCompletion(
    options: GenerationOptions
): Promise<string> {
    const modelSettings = getModelSettings(options.runtime.modelProvider, options.modelClass);
    const stop = Array.from(new Set([...(modelSettings.stop || []), ["\n"]])) as string[];

    return await generateText(options.runtime.modelProvider, {
        ...options,
        stop,
    });
}

export async function generateChat(
    options: GenerationOptions
): Promise<string> {
    return await generateText(options.runtime.modelProvider, options);
}

export async function generateStream(
    options: GenerationOptions
): Promise<ReadableStream<string>> {
    const modelSettings = getModelSettings(options.runtime.modelProvider, options.modelClass);
    const context = await trimTokens(options.context, modelSettings.maxInputTokens, options.runtime);

    return new ReadableStream({
        async start(controller) {
            try {
                const response = await generateText(options.runtime.modelProvider, {
                    ...options,
                    context,
                });

                controller.enqueue(response);
                controller.close();
            } catch (error) {
                controller.error(error);
            }
        },
    });
}

export async function generateShouldRespond(options: GenerationOptions): Promise<"RESPOND" | "IGNORE" | "STOP" | null> {
    let retryDelay = 1000;
    while (true) {
        try {
            const response = await generateText(options);
            const parsedResponse = parseShouldRespondFromText(response.trim());
            if (parsedResponse) {
                return parsedResponse;
            }
        } catch (error) {
            elizaLogger.error("Error in generateShouldRespond:", error);
        }
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
        retryDelay *= 2;
    }
}

export async function generateTrueOrFalse(options: GenerationOptions): Promise<boolean> {
    let retryDelay = 1000;
    const modelSettings = getModelSettings(options.runtime.modelProvider, options.modelClass);
    const stop = Array.from(new Set([...(modelSettings.stop || []), ["\n"]])) as string[];

    while (true) {
        try {
            const response = await generateText({ ...options, stop });
            const parsedResponse = parseBooleanFromText(response.trim());
            if (parsedResponse !== null) {
                return parsedResponse;
            }
        } catch (error) {
            elizaLogger.error("Error in generateTrueOrFalse:", error);
        }
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
        retryDelay *= 2;
    }
}

export async function generateTextArray(options: GenerationOptions): Promise<string[]> {
    if (!options.context) {
        elizaLogger.error("generateTextArray context is empty");
        return [];
    }
    let retryDelay = 1000;

    while (true) {
        try {
            const response = await generateText(options);
            const parsedResponse = parseJsonArrayFromText(response);
            if (parsedResponse) {
                return parsedResponse;
            }
        } catch (error) {
            elizaLogger.error("Error in generateTextArray:", error);
        }
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
        retryDelay *= 2;
    }
}

export async function generateObject(options: GenerationOptions): Promise<any> {
    if (!options.context) {
        elizaLogger.error("generateObject context is empty");
        return null;
    }
    let retryDelay = 1000;

    while (true) {
        try {
            const response = await generateText(options);
            const parsedResponse = parseJSONObjectFromText(response);
            if (parsedResponse) {
                return parsedResponse;
            }
        } catch (error) {
            elizaLogger.error("Error in generateObject:", error);
        }
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
        retryDelay *= 2;
    }
}

export async function generateMessageResponse(options: GenerationOptions): Promise<Content> {
    const modelSettings = getModelSettings(options.runtime.modelProvider, options.modelClass);
    const context = await trimTokens(options.context, modelSettings.maxInputTokens, options.runtime);
    
    let retryDelay = 1000;
    while (true) {
        try {
            const response = await generateText({ ...options, context });
            const parsedContent = parseJSONObjectFromText(response) as Content;
            if (parsedContent) {
                return parsedContent;
            }
        } catch (error) {
            elizaLogger.error("Error in generateMessageResponse:", error);
        }
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
        retryDelay *= 2;
    }
}

export async function generateTweetActions(options: GenerationOptions): Promise<ActionResponse | null> {
    let retryDelay = 1000;
    while (true) {
        try {
            const response = await generateText(options);
            const { actions } = parseActionResponseFromText(response.trim());
            if (actions) {
                return actions;
            }
        } catch (error) {
            elizaLogger.error("Error in generateTweetActions:", error);
        }
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
        retryDelay *= 2;
    }
} 


export async function generateObjectArray(options: GenerationOptions): Promise<any[]> {
    const response = await generateObject(options);
    return parseJsonArrayFromText(response);
}