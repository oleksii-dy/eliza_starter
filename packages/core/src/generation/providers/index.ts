import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createGroq } from "@ai-sdk/groq";
import { createMistral } from "@ai-sdk/mistral";
import { createOpenAI } from "@ai-sdk/openai";
import { createOllama } from "ollama-ai-provider";
import { models } from "../../models";
import type { ProviderOptions } from "../types";
import { generateObject } from "../text";
import { getCloudflareGatewayBaseURL } from "../utils";

export async function handleOpenAI({
    model,
    apiKey,
    schema,
    schemaName,
    schemaDescription,
    mode = "json",
    modelOptions,
    runtime,
    modelClass,
}: ProviderOptions): Promise<string> {
    const baseURL = getCloudflareGatewayBaseURL(runtime, "openai") || models.openai.endpoint;
    const openai = createOpenAI({ apiKey, baseURL });
    const result = await generateObject({
        runtime,
        context: modelOptions.prompt,
        modelClass,
        schema,
        schemaName,
        schemaDescription,
        mode,
        experimental_providerMetadata: {
            model: openai.languageModel(model),
            ...modelOptions,
        }
    });
    return result;
}

export async function handleAnthropic({
    model,
    apiKey,
    schema,
    schemaName,
    schemaDescription,
    mode = "json",
    modelOptions,
    runtime,
    modelClass,
}: ProviderOptions): Promise<string> {
    const baseURL = getCloudflareGatewayBaseURL(runtime, "anthropic");
    const anthropic = createAnthropic({ apiKey, baseURL });
    const result = await generateObject({
        runtime,
        context: modelOptions.prompt,
        modelClass,
        schema,
        schemaName,
        schemaDescription,
        mode,
        experimental_providerMetadata: {
            model: anthropic.languageModel(model),
            ...modelOptions,
        }
    });
    return result;
}

export async function handleGroq({
    model,
    apiKey,
    schema,
    schemaName,
    schemaDescription,
    mode = "json",
    modelOptions,
    runtime,
    modelClass,
}: ProviderOptions): Promise<string> {
    const baseURL = getCloudflareGatewayBaseURL(runtime, "groq");
    const groq = createGroq({ apiKey, baseURL });
    const result = await generateObject({
        runtime,
        context: modelOptions.prompt,
        modelClass,
        schema,
        schemaName,
        schemaDescription,
        mode,
        experimental_providerMetadata: {
            model: groq.languageModel(model),
            ...modelOptions,
        }
    });
    return result;
}

export async function handleGoogle({
    model,
    schema,
    schemaName,
    schemaDescription,
    mode = "json",
    modelOptions,
    runtime,
    modelClass,
}: ProviderOptions): Promise<string> {
    const google = createGoogleGenerativeAI();
    const result = await generateObject({
        runtime,
        context: modelOptions.prompt,
        modelClass,
        schema,
        schemaName,
        schemaDescription,
        mode,
        experimental_providerMetadata: {
            model: google(model),
            ...modelOptions,
        }
    });
    return result;
}

export async function handleMistral({
    model,
    schema,
    schemaName,
    schemaDescription,
    mode,
    modelOptions,
    runtime,
    modelClass,
}: ProviderOptions): Promise<string> {
    const mistral = createMistral();
    const result = await generateObject({
        runtime,
        context: modelOptions.prompt,
        modelClass,
        schema,
        schemaName,
        schemaDescription,
        mode,
        experimental_providerMetadata: {
            model: mistral(model),
            ...modelOptions,
        }
    });
    return result;
}

export async function handleOllama({
    model,
    schema,
    schemaName,
    schemaDescription,
    mode = "json",
    modelOptions,
    provider,
    runtime,
    modelClass,
}: ProviderOptions): Promise<string> {
    const ollamaProvider = createOllama({
        baseURL: `${models[provider].endpoint}/api`,
    });
    const ollama = ollamaProvider(model);
    const result = await generateObject({
        runtime,
        context: modelOptions.prompt,
        modelClass,
        schema,
        schemaName,
        schemaDescription,
        mode,
        experimental_providerMetadata: {
            model: ollama,
            ...modelOptions,
        }
    });
    return result;
} 