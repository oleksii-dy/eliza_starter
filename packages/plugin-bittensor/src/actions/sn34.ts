import {
    ActionExample,
    IAgentRuntime,
    Memory,
    State,
    HandlerCallback,
    type Action,
} from "@elizaos/core";
import { elizaLogger } from "@elizaos/core";

export const detectImage: Action = {
    name: "DETECT_IMAGE",
    similes: ["ANALYZE_IMAGE", "BITMIND_DETECTION", "AI_DETECTION", "REAL_OR_FAKE"],
    validate: async (runtime: IAgentRuntime, message: Memory) => {
        elizaLogger.log("🔍 BitMind: Validating image input...");
        
        const urlMatch = message?.content?.text?.match(/https?:\/\/[^\s]+/);
        if (!urlMatch) {
            elizaLogger.error("❌ BitMind: No image URL found in message");
            return false;
        }

        if (!runtime?.character?.settings?.secrets?.bitmind) {
            elizaLogger.error("❌ BitMind: API token not configured");
            return false;
        }

        elizaLogger.log("✅ BitMind: Image URL and token found");
        return true;
    },
    description: "Detect if an image is AI-generated using BitMind API",
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        options: any,
        callback: HandlerCallback
    ): Promise<void> => {
        if (state['isImageAnalyzing']) {
            return;
        }
        state['isImageAnalyzing'] = true;

        elizaLogger.log("🤖 BitMind: Starting image detection...");
        
        if (!runtime.character?.settings?.secrets?.bitmind) {
            throw new Error("BitMind API token not configured");
        }
        const token = runtime.character.settings.secrets.bitmind;

        const urlMatch = message.content.text.match(/https?:\/\/[^\s]+/);

        if (!urlMatch) {
            throw new Error("No image URL found in message");
        }
        const imageUrl = urlMatch[0];

        elizaLogger.log(`📸 BitMind: Analyzing image: ${imageUrl}`);

        try {
            const response = await fetch("https://subnet-api.bitmindlabs.ai/detect-image", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ image: imageUrl })
            });

            if (!response.ok) {
                elizaLogger.error("❌ BitMind: API request failed:", response.statusText);
                throw new Error(`BitMind API request failed: ${response.statusText}`);
            }

            const result = await response.json();
            elizaLogger.log("✅ BitMind: Detection complete", {
                isAI: result.isAI,
                confidence: result.confidence
            });

            const confidencePercent = (result.confidence * 100).toFixed(2);
            const confidenceNum = parseFloat(confidencePercent);
            const responseText = `🔍 Trinity Matrix Deepfake Analysis
Powered by BitMind Subnet (SN34) on Bittensor

${result.isAI ? '🤖 AI Generated' : '📸 Natural Image'}
${confidencePercent}% AI Influence Rating
${confidenceNum > 75 
    ? "⚠️ High synthetic probability detected. Approach with caution." 
    : confidenceNum > 40 
        ? "⚡ Moderate AI patterns present. Verification recommended." 
        : "✅ Low synthetic markers. Likely authentic content."}

—————————————————`;
            callback({
                text: responseText,
                isAI: result.isAI,
                confidence: result.confidence
            });

        } catch (error) {
            elizaLogger.error("❌ BitMind: Detection error:", error);
            throw new Error(`Failed to detect image: ${error.message}`);
        }
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: { text: "analyze this image: https://example.com/image.jpg" }
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "I'll analyze that image for you...",
                    action: "DETECT_IMAGE"
                }
            }
        ],
        [
            {
                user: "{{user1}}",
                content: { text: "is this image AI generated?" }
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "Let me check if that image is AI generated...",
                    action: "DETECT_IMAGE"
                }
            }
        ]
    ] as ActionExample[][],
} as Action;