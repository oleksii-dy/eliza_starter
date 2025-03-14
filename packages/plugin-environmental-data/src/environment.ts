// src/environment.ts
import { IAgentRuntime } from "@elizaos/core";
import { z } from "zod";
import { elizaLogger } from "@elizaos/core";

export const meersensEnvSchema = z.object({
    MEERSENS_API_KEY: z.string().min(32, "Meersens API key should be at least 32 characters"),
});

export type MeersensConfig = z.infer<typeof meersensEnvSchema>;

export async function validateMeersensConfig(
    runtime: IAgentRuntime
): Promise<MeersensConfig> {
    elizaLogger.info("Validating Meersens configuration");
    try {
        const apiKey = runtime.getSetting("MEERSENS_API_KEY");
        
        if (!apiKey) {
            elizaLogger.error("MEERSENS_API_KEY not found in runtime settings");
            throw new Error("MEERSENS_API_KEY is required but not found in settings");
        }

        elizaLogger.info("Found API key:", apiKey.substring(0, 4) + "...");
        
        const config = {
            MEERSENS_API_KEY: apiKey,
        };
        
        const validatedConfig = meersensEnvSchema.parse(config);
        elizaLogger.success("Meersens configuration validated successfully");
        return validatedConfig;
    } catch (error) {
        if (error instanceof z.ZodError) {
            const errorMessages = error.errors
                .map((err) => `${err.path.join(".")}: ${err.message}`)
                .join("\n");
            elizaLogger.error("Validation failed:", errorMessages);
            throw new Error(
                `Meersens configuration validation failed:\n${errorMessages}`
            );
        }
        elizaLogger.error("Unexpected error during config validation:", error);
        throw error;
    }
}