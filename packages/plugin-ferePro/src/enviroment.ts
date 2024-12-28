import { IAgentRuntime } from "@elizaos/core";
import { z } from "zod";

export const fereProEnvSchema = z.object({
    FERE_USER_ID: z.string().min(1, "FerePro User ID is required"),
    FERE_API_KEY: z.string().min(1, "FerePro API key is required"),
});

export type FereProConfig = z.infer<typeof fereProEnvSchema>;

export async function validateFereProConfig(
    runtime: IAgentRuntime
): Promise<FereProConfig> {
    try {
        const config = {
            FERE_USER_ID:
                runtime.getSetting("FERE_USER_ID") || process.env.FERE_USER_ID,
            FERE_API_KEY:
                runtime.getSetting("FERE_API_KEY") || process.env.FERE_API_KEY,
            FERE_STREAM:
                runtime.getSetting("FERE_STREAM") || process.env.FERE_STREAM,
        };

        return fereProEnvSchema.parse(config);
    } catch (error) {
        if (error instanceof z.ZodError) {
            const errorMessages = error.errors
                .map((err) => `${err.path.join(".")}: ${err.message}`)
                .join("\n");
            throw new Error(
                `FerePro configuration validation failed:\n${errorMessages}`
            );
        }
        throw error;
    }
}
