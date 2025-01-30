import type { ZodSchema } from "zod";
import type { ModelClass, IAgentRuntime, TelemetrySettings } from "../types";

export interface GenerationModelSettings {
    prompt: string;
    temperature: number;
    maxTokens: number;
    frequencyPenalty: number;
    presencePenalty: number;
    stop?: string[];
    experimental_telemetry?: TelemetrySettings;
}

export interface GenerationOptions {
    runtime: IAgentRuntime;
    context: string;
    modelClass: ModelClass;
    schema?: ZodSchema;
    schemaName?: string;
    schemaDescription?: string;
    stop?: string[];
    mode?: "auto" | "json" | "tool";
    experimental_providerMetadata?: Record<string, unknown>;
    verifiableInference?: boolean;
    verifiableInferenceAdapter?: any; // TODO: Add proper type
    verifiableInferenceOptions?: any; // TODO: Add proper type
    tools?: Record<string, unknown>;
    onStepFinish?: (step: number, total: number) => void;
    maxSteps?: number;
    customSystemPrompt?: string;
}

export interface ProviderOptions extends GenerationOptions {
    provider: string;
    model: any;
    apiKey: string;
    modelOptions: GenerationModelSettings;
}

export interface ImageGenerationOptions {
    prompt: string;
    width: number;
    height: number;
    count?: number;
    negativePrompt?: string;
    numIterations?: number;
    guidanceScale?: number;
    seed?: number;
    modelId?: string;
    jobId?: string;
    stylePreset?: string;
    hideWatermark?: boolean;
    safeMode?: boolean;
    cfgScale?: number;
}

export interface ImageGenerationResult {
    success: boolean;
    data?: string[];
    error?: any;
}

export interface CaptionGenerationOptions {
    imageUrl: string;
}

export interface CaptionGenerationResult {
    title: string;
    description: string;
} 