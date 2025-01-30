import { Buffer } from "node:buffer";
import OpenAI from "openai";
import Together from "together-ai";
import { fal } from "@fal-ai/client";
import { elizaLogger } from "../index";
import { getImageModelSettings } from "../models";
import { ModelProviderName, type IAgentRuntime } from "../types";
import type { CaptionGenerationOptions, CaptionGenerationResult, ImageGenerationOptions, ImageGenerationResult } from "./types";

interface TogetherAIImageResponse {
    data: Array<{
        url: string;
        content_type?: string;
        image_type?: string;
    }>;
}

export async function generateImage(
    options: ImageGenerationOptions,
    runtime: IAgentRuntime
): Promise<ImageGenerationResult> {
    const modelSettings = getImageModelSettings(runtime.imageModelProvider);
    const model = modelSettings.name;
    elizaLogger.info("Generating image with options:", {
        imageModelProvider: model,
    });

    const apiKey = runtime.imageModelProvider === runtime.modelProvider
        ? runtime.token
        : getProviderApiKey(runtime);

    try {
        switch (runtime.imageModelProvider) {
            case ModelProviderName.HEURIST:
                return await handleHeuristImageGeneration(options, apiKey, model);
            case ModelProviderName.TOGETHER:
            case ModelProviderName.LLAMACLOUD:
                return await handleTogetherImageGeneration(options, apiKey, model);
            case ModelProviderName.FAL:
                return await handleFalImageGeneration(options, apiKey, model, runtime);
            case ModelProviderName.VENICE:
                return await handleVeniceImageGeneration(options, apiKey, model);
            case ModelProviderName.NINETEEN_AI:
                return await handleNineteenAIImageGeneration(options, apiKey, model);
            case ModelProviderName.LIVEPEER:
                return await handleLivepeerImageGeneration(options, apiKey, model);
            default:
                return await handleOpenAIImageGeneration(options, runtime);
        }
    } catch (error) {
        elizaLogger.error("Error in generateImage:", error);
        return { success: false, error };
    }
}

function getProviderApiKey(runtime: IAgentRuntime): string {
    switch (runtime.imageModelProvider) {
        case ModelProviderName.HEURIST:
            return runtime.getSetting("HEURIST_API_KEY");
        case ModelProviderName.TOGETHER:
            return runtime.getSetting("TOGETHER_API_KEY");
        case ModelProviderName.FAL:
            return runtime.getSetting("FAL_API_KEY");
        case ModelProviderName.OPENAI:
            return runtime.getSetting("OPENAI_API_KEY");
        case ModelProviderName.VENICE:
            return runtime.getSetting("VENICE_API_KEY");
        case ModelProviderName.LIVEPEER:
            return runtime.getSetting("LIVEPEER_GATEWAY_URL");
        default:
            return runtime.getSetting("HEURIST_API_KEY") ||
                runtime.getSetting("NINETEEN_AI_API_KEY") ||
                runtime.getSetting("TOGETHER_API_KEY") ||
                runtime.getSetting("FAL_API_KEY") ||
                runtime.getSetting("OPENAI_API_KEY") ||
                runtime.getSetting("VENICE_API_KEY") ||
                runtime.getSetting("LIVEPEER_GATEWAY_URL");
    }
}

async function handleHeuristImageGeneration(
    options: ImageGenerationOptions,
    apiKey: string,
    model: string
): Promise<ImageGenerationResult> {
    const response = await fetch("http://sequencer.heurist.xyz/submit_job", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            job_id: options.jobId || crypto.randomUUID(),
            model_input: {
                SD: {
                    prompt: options.prompt,
                    neg_prompt: options.negativePrompt,
                    num_iterations: options.numIterations || 20,
                    width: options.width || 512,
                    height: options.height || 512,
                    guidance_scale: options.guidanceScale || 3,
                    seed: options.seed || -1,
                },
            },
            model_id: model,
            deadline: 60,
            priority: 1,
        }),
    });

    if (!response.ok) {
        throw new Error(`Heurist image generation failed: ${response.statusText}`);
    }

    const imageURL = await response.json();
    return { success: true, data: [imageURL] };
}

async function handleTogetherImageGeneration(
    options: ImageGenerationOptions,
    apiKey: string,
    model: string
): Promise<ImageGenerationResult> {
    const together = new Together({ apiKey });
    const response = await together.images.create({
        model,
        prompt: options.prompt,
        width: options.width,
        height: options.height,
        steps: 4,
        n: options.count,
    });

    const togetherResponse = response as unknown as TogetherAIImageResponse;
    if (!togetherResponse.data || !Array.isArray(togetherResponse.data)) {
        throw new Error("Invalid response format from Together AI");
    }

    const base64s = await Promise.all(
        togetherResponse.data.map(async (image) => {
            if (!image.url) {
                throw new Error("Missing URL in Together AI response");
            }

            const imageResponse = await fetch(image.url);
            if (!imageResponse.ok) {
                throw new Error(`Failed to fetch image: ${imageResponse.statusText}`);
            }

            const blob = await imageResponse.blob();
            const arrayBuffer = await blob.arrayBuffer();
            const base64 = Buffer.from(arrayBuffer).toString("base64");
            return `data:image/jpeg;base64,${base64}`;
        })
    );

    return { success: true, data: base64s };
}

async function handleFalImageGeneration(
    options: ImageGenerationOptions,
    apiKey: string,
    model: string,
    runtime: IAgentRuntime
): Promise<ImageGenerationResult> {
    fal.config({
        credentials: apiKey,
    });

    const input = {
        prompt: options.prompt,
        image_size: "square" as const,
        num_inference_steps: 50,
        guidance_scale: options.guidanceScale || 3.5,
        num_images: options.count,
        enable_safety_checker: runtime.getSetting("FAL_AI_ENABLE_SAFETY_CHECKER") === "true",
        safety_tolerance: Number(runtime.getSetting("FAL_AI_SAFETY_TOLERANCE") || "2"),
        output_format: "png" as const,
        seed: options.seed ?? 6252023,
        ...(runtime.getSetting("FAL_AI_LORA_PATH") ? {
            loras: [{
                path: runtime.getSetting("FAL_AI_LORA_PATH"),
                scale: 1,
            }],
        } : {}),
    };

    const result = await fal.subscribe(model, {
        input,
        logs: true,
        onQueueUpdate: (update) => {
            if (update.status === "IN_PROGRESS") {
                elizaLogger.info(update.logs.map((log) => log.message));
            }
        },
    });

    const base64s = await Promise.all(
        result.data.images.map(async (image) => {
            const response = await fetch(image.url);
            const blob = await response.blob();
            const buffer = await blob.arrayBuffer();
            const base64 = Buffer.from(buffer).toString("base64");
            return `data:${image.content_type};base64,${base64}`;
        })
    );

    return { success: true, data: base64s };
}

async function handleVeniceImageGeneration(
    options: ImageGenerationOptions,
    apiKey: string,
    model: string
): Promise<ImageGenerationResult> {
    const response = await fetch("https://api.venice.ai/api/v1/image/generate", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            model,
            prompt: options.prompt,
            cfg_scale: options.guidanceScale,
            negative_prompt: options.negativePrompt,
            width: options.width,
            height: options.height,
            steps: options.numIterations,
            safe_mode: options.safeMode,
            seed: options.seed,
            style_preset: options.stylePreset,
            hide_watermark: options.hideWatermark,
        }),
    });

    const result = await response.json();
    if (!result.images || !Array.isArray(result.images)) {
        throw new Error("Invalid response format from Venice AI");
    }

    const base64s = result.images.map((base64String) => {
        if (!base64String) {
            throw new Error("Empty base64 string in Venice AI response");
        }
        return `data:image/png;base64,${base64String}`;
    });

    return { success: true, data: base64s };
}

async function handleNineteenAIImageGeneration(
    options: ImageGenerationOptions,
    apiKey: string,
    model: string
): Promise<ImageGenerationResult> {
    const response = await fetch("https://api.nineteen.ai/v1/text-to-image", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            model,
            prompt: options.prompt,
            negative_prompt: options.negativePrompt,
            width: options.width,
            height: options.height,
            steps: options.numIterations,
            cfg_scale: options.guidanceScale || 3,
        }),
    });

    const result = await response.json();
    if (!result.images || !Array.isArray(result.images)) {
        throw new Error("Invalid response format from Nineteen AI");
    }

    const base64s = result.images.map((base64String) => {
        if (!base64String) {
            throw new Error("Empty base64 string in Nineteen AI response");
        }
        return `data:image/png;base64,${base64String}`;
    });

    return { success: true, data: base64s };
}

async function handleLivepeerImageGeneration(
    options: ImageGenerationOptions,
    apiKey: string,
    model: string
): Promise<ImageGenerationResult> {
    if (!apiKey) {
        throw new Error("Livepeer Gateway is not defined");
    }

    try {
        const baseUrl = new URL(apiKey);
        if (!baseUrl.protocol.startsWith("http")) {
            throw new Error("Invalid Livepeer Gateway URL protocol");
        }

        const response = await fetch(`${baseUrl.toString()}text-to-image`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer eliza-app-img",
            },
            body: JSON.stringify({
                model_id: options.modelId || "ByteDance/SDXL-Lightning",
                prompt: options.prompt,
                width: options.width || 1024,
                height: options.height || 1024,
            }),
        });

        const result = await response.json();
        if (!result.images?.length) {
            throw new Error("No images generated");
        }

        const base64Images = await Promise.all(
            result.images.map(async (image) => {
                let imageUrl = image.url.includes("http") ? image.url : `${apiKey}${image.url}`;
                const imageResponse = await fetch(imageUrl);
                if (!imageResponse.ok) {
                    throw new Error(`Failed to fetch image: ${imageResponse.statusText}`);
                }
                const blob = await imageResponse.blob();
                const arrayBuffer = await blob.arrayBuffer();
                const base64 = Buffer.from(arrayBuffer).toString("base64");
                return `data:image/jpeg;base64,${base64}`;
            })
        );

        return { success: true, data: base64Images };
    } catch (error) {
        elizaLogger.error("Error in Livepeer image generation:", error);
        return { success: false, error };
    }
}

async function handleOpenAIImageGeneration(
    options: ImageGenerationOptions,
    runtime: IAgentRuntime
): Promise<ImageGenerationResult> {
    let targetSize = `${options.width}x${options.height}`;
    if (
        targetSize !== "1024x1024" &&
        targetSize !== "1792x1024" &&
        targetSize !== "1024x1792"
    ) {
        targetSize = "1024x1024";
    }

    const openaiApiKey = runtime.getSetting("OPENAI_API_KEY");
    if (!openaiApiKey) {
        throw new Error("OPENAI_API_KEY is not set");
    }

    const openai = new OpenAI({ apiKey: openaiApiKey });
    const response = await openai.images.generate({
        model: "dall-e-3",
        prompt: options.prompt,
        size: targetSize as "1024x1024" | "1792x1024" | "1024x1792",
        n: options.count,
        response_format: "b64_json",
    });

    const base64s = response.data.map(
        (image) => `data:image/png;base64,${image.b64_json}`
    );

    return { success: true, data: base64s };
} 

export async function generateCaption(
    options: CaptionGenerationOptions,
    runtime: IAgentRuntime
): Promise<CaptionGenerationResult | null> {
    // TODO: Implement caption generation
    return {
        title: "",
        description: "",
    };
}