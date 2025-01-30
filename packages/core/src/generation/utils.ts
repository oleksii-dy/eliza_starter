import { encodingForModel, type TiktokenModel } from "js-tiktoken";
import { AutoTokenizer } from "@huggingface/transformers";
import type { IAgentRuntime } from "../types";
import { elizaLogger } from "../index";
import { TokenizerType } from "../types";

export function getCloudflareGatewayBaseURL(
    runtime: IAgentRuntime,
    provider: string
): string | undefined {
    const isCloudflareEnabled = runtime.getSetting("CLOUDFLARE_GW_ENABLED") === "true";
    const cloudflareAccountId = runtime.getSetting("CLOUDFLARE_AI_ACCOUNT_ID");
    const cloudflareGatewayId = runtime.getSetting("CLOUDFLARE_AI_GATEWAY_ID");

    elizaLogger.debug("Cloudflare Gateway Configuration:", {
        isEnabled: isCloudflareEnabled,
        hasAccountId: !!cloudflareAccountId,
        hasGatewayId: !!cloudflareGatewayId,
        provider: provider,
    });

    if (!isCloudflareEnabled) {
        elizaLogger.debug("Cloudflare Gateway is not enabled");
        return undefined;
    }

    if (!cloudflareAccountId || !cloudflareGatewayId) {
        elizaLogger.warn("Cloudflare Gateway is enabled but missing configuration");
        return undefined;
    }

    const baseURL = `https://gateway.ai.cloudflare.com/v1/${cloudflareAccountId}/${cloudflareGatewayId}/${provider.toLowerCase()}`;
    elizaLogger.info("Using Cloudflare Gateway:", { provider, baseURL });

    return baseURL;
}

export async function trimTokens(
    context: string,
    maxTokens: number,
    runtime: IAgentRuntime
): Promise<string> {
    if (!context) return "";
    if (maxTokens <= 0) throw new Error("maxTokens must be positive");

    const tokenizerModel = runtime.getSetting("TOKENIZER_MODEL");
    const tokenizerType = runtime.getSetting("TOKENIZER_TYPE");

    if (!tokenizerModel || !tokenizerType) {
        return truncateTiktoken("gpt-4o", context, maxTokens);
    }

    if (tokenizerType === TokenizerType.Auto) {
        return truncateAuto(tokenizerModel, context, maxTokens);
    }

    if (tokenizerType === TokenizerType.TikToken) {
        return truncateTiktoken(tokenizerModel as TiktokenModel, context, maxTokens);
    }

    elizaLogger.warn(`Unsupported tokenizer type: ${tokenizerType}`);
    return truncateTiktoken("gpt-4o", context, maxTokens);
}

async function truncateAuto(
    modelPath: string,
    context: string,
    maxTokens: number
): Promise<string> {
    try {
        const tokenizer = await AutoTokenizer.from_pretrained(modelPath);
        const tokens = tokenizer.encode(context);

        if (tokens.length <= maxTokens) {
            return context;
        }

        const truncatedTokens = tokens.slice(-maxTokens);
        return tokenizer.decode(truncatedTokens);
    } catch (error) {
        elizaLogger.error("Error in truncateAuto:", error);
        return context.slice(-maxTokens * 4);
    }
}

async function truncateTiktoken(
    model: TiktokenModel,
    context: string,
    maxTokens: number
): Promise<string> {
    try {
        const encoding = encodingForModel(model);
        const tokens = encoding.encode(context);

        if (tokens.length <= maxTokens) {
            return context;
        }

        const truncatedTokens = tokens.slice(-maxTokens);
        return encoding.decode(truncatedTokens);
    } catch (error) {
        elizaLogger.error("Error in truncateTiktoken:", error);
        return context.slice(-maxTokens * 4);
    }
}

/**
 * Splits content into chunks of specified size with optional overlapping bleed sections
 * @param content The text content to split into chunks
 * @param chunkSize The maximum size of each chunk in tokens
 * @param bleed Number of characters to overlap between chunks (default: 100)
 * @returns Promise resolving to array of text chunks with bleed sections
 */
export async function splitChunks(
    content: string,
    chunkSize: number = 512,
    bleed: number = 20
): Promise<string[]> {
    if (!content) return [];
    
    // Split content into sentences
    const sentences = content.split(/(?<=[.!?])\s+/);
    const chunks: string[] = [];
    let currentChunk = "";
    
    for (const sentence of sentences) {
        if ((`${currentChunk} ${sentence}`).length <= chunkSize) {
            currentChunk = currentChunk ? `${currentChunk} ${sentence}` : sentence;
        } else {
            if (currentChunk) {
                chunks.push(currentChunk);
                // Start new chunk with bleed from previous chunk
                const words = currentChunk.split(" ");
                const bleedText = words.slice(-bleed).join(" ");
                currentChunk = `${bleedText} ${sentence}`;
            } else {
                chunks.push(sentence);
                currentChunk = "";
            }
        }
    }
    
    if (currentChunk) {
        chunks.push(currentChunk);
    }
    
    return chunks;
} 