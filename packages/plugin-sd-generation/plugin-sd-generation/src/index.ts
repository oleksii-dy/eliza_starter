import { elizaLogger } from "@elizaos/core";
import {
    Action,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    Plugin,
    State,
} from "@elizaos/core";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { IMAGE_GENERATION_CONSTANTS } from "./constants";
import { Buffer } from "buffer";

const decodeImage = (base64Image: string): string => {
    const imageBuffer = Buffer.from(base64Image, "base64");
    const fileName = `generated_image_${Date.now()}.png`;
    const filePath = path.join(__dirname, "content_cache", fileName);

    fs.writeFileSync(filePath, imageBuffer);
    return filePath;
};

const generateImage = async (prompt: string, runtime: IAgentRuntime) => {
    const API_KEY = runtime.getSetting(IMAGE_GENERATION_CONSTANTS.API_KEY_SETTING);

    try {
        elizaLogger.log("Starting image generation with prompt:", prompt);

        const response = await fetch(IMAGE_GENERATION_CONSTANTS.API_URL, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${API_KEY}`,
                accept: "application/json",
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                input: {
                    api_name: "txt2img",
                    id: crypto.randomUUID(),
                    task_id: `task_${Date.now()}`,
                    webhook: null,
                    prompt,
                    steps: 25,
                },
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            elizaLogger.error("Image generation API error:", {
                status: response.status,
                statusText: response.statusText,
                error: errorText,
            });
            throw new Error(
                `Image generation API error: ${response.statusText} - ${errorText}`
            );
        }

        const data = await response.json();
        elizaLogger.log("Generation request successful, received response:", data);

        if (!data.output?.images || data.output.images.length === 0) {
            throw new Error("No images returned in the response");
        }

        const imagePath = decodeImage(data.output.images[0]);
        return {
            success: true,
            imagePath,
            additionalData: {
                delayTime: data.delayTime,
                executionTime: data.executionTime,
                id: data.id,
            },
        };
    } catch (error) {
        elizaLogger.error("Image generation error:", error);
        return {
            success: false,
            error: error.message || "Unknown error occurred",
        };
    }
};

const imageGeneration: Action = {
    name: "GENERATE_IMAGE",
    similes: [
        "IMAGE_GENERATION",
        "IMAGE_GEN",
        "CREATE_IMAGE",
        "MAKE_IMAGE",
        "GENERATE_PICTURE",
        "PICTURE_GEN",
        "IMAGE_CREATE",
        "DRAW_IMAGE",
    ],
    description: "Generate an image based on a text prompt",
    validate: async (runtime: IAgentRuntime, _message: Memory) => {
        elizaLogger.log("Validating image generation action");
        const apiKey = runtime.getSetting(IMAGE_GENERATION_CONSTANTS.API_KEY_SETTING);
        elizaLogger.log("IMAGE_GEN_API_KEY present:", !!apiKey);
        return !!apiKey;
    },
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        _state: State,
        _options: any,
        callback: HandlerCallback
    ) => {
        elizaLogger.log("Image generation request:", message);

        const imagePrompt = message.content.text
            .replace(/<@\d+>/g, "") // Удаляем упоминания
            .replace(
                /generate image|create image|make image|draw image/gi,
                ""
            ) // Удаляем команды
            .trim();

        if (!imagePrompt || imagePrompt.length < 5) {
            callback({
                text: "Please provide more details about the image you'd like me to generate. For example: 'Generate an image of a futuristic city' or 'Create a picture of a sunny beach.'",
            });
            return;
        }

        elizaLogger.log("Image prompt:", imagePrompt);

        callback({
            text: `I'll generate an image based on your prompt: "${imagePrompt}". This might take a few moments...`,
        });

        try {
            const result = await generateImage(imagePrompt, runtime);

            if (result.success) {
                const { imagePath, additionalData } = result;

                callback(
                    {
                        text: `Here's your generated image (Execution time: ${additionalData.executionTime}ms):`,
                        attachments: [
                            {
                                id: crypto.randomUUID(),
                                url: `file://${imagePath}`, // Локальный путь к изображению
                                title: "Generated Image",
                                source: "imageGeneration",
                                description: imagePrompt,
                                text: imagePrompt,
                            },
                        ],
                    },
                    [imagePath]
                );
            } else {
                callback({
                    text: `Image generation failed: ${result.error}`,
                    error: true,
                });
            }
        } catch (error) {
            elizaLogger.error(`Failed to generate image. Error: ${error}`);
            callback({
                text: `Image generation failed: ${error.message}`,
                error: true,
            });
        }
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: { text: "Generate an image of a cat in space" },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "I'll create an image of a cat in space for you",
                    action: "GENERATE_IMAGE",
                },
            },
        ],
    ],
} as Action;

export const imageSDGenerationPlugin: Plugin = {
    name: "imageSDGeneration",
    description: "Generate images using your custom API",
    actions: [imageGeneration],
    evaluators: [],
    providers: [],
};
