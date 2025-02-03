import { IAgentRuntime } from "@elizaos/core";
import { z } from "zod";

export const elfaAiEnvSchema = z.object({
    ELFA_AI_BASE_URL: z.string().min(1, "Base URL is required for interacting with Elfa AI"),
    ELFA_AI_API_KEY: z
        .string()
        .min(1, "API key is required for interacting with Elfa AI"),
});

export type ElfaAiConfig = z.infer<typeof elfaAiEnvSchema>;

export async function validateElfaAiConfig(
    runtime: IAgentRuntime
): Promise<ElfaAiConfig> {
    try {
        const config = {
            ELFA_AI_BASE_URL:
                runtime.getSetting("ELFA_AI_BASE_URL") ||
                process.env.ELFA_AI_BASE_URL,
            ELFA_AI_API_KEY:
                runtime.getSetting("ELFA_AI_API_KEY") ||
                process.env.ELFA_AI_API_KEY,
        };
        return elfaAiEnvSchema.parse(config);
    } catch (error) {
        if (error instanceof z.ZodError) {
            const errorMessages = error.errors
                .map((err) => `${err.path.join(".")}: ${err.message}`)
                .join("\n");
            throw new Error(
                `Elfa AI configuration validation failed:\n${errorMessages}`
            );
        }
        throw error;
    }
}
