import { IAgentRuntime } from "@elizaos/core";
import { z } from "zod";

export const seiEnvSchema = z.object({
    SEI_RPC_URL: z.string().min(1, "SEI RPC URL is required"),
    SEI_PRIVATE_KEY: z.string().min(1, "SEI private key is required"),
    OPENAI_API_KEY: z.string().min(1, "OpenAI API key is required"),
}); 

export async function validateSeiConfig(runtime: IAgentRuntime) {
    try {
        const config = {
            SEI_RPC_URL: runtime.getSetting("SEI_RPC_URL") || process.env.SEI_RPC_URL,
            SEI_PRIVATE_KEY: runtime.getSetting("SEI_PRIVATE_KEY") || process.env.SEI_PRIVATE_KEY,
            OPENAI_API_KEY: runtime.getSetting("OPENAI_API_KEY") || process.env.OPENAI_API_KEY,
        };
        return seiEnvSchema.parse(config);
    } catch (error) {
        if (error instanceof z.ZodError) {
            const errorMessages = error.errors
                .map((err) => `${err.path.join(".")}: ${err.message}`)
                .join("\n");
            throw new Error(`SEI configuration validation failed:\n${errorMessages}`);
        }
        throw error;
    }
}
