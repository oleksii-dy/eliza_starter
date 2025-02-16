import { elizaLogger, IAgentRuntime } from "@elizaos/core";
import { z } from "zod";

export const extractorEnvSchema = z.object({
    FIREWALL_SCORE_THRESHOLD: z
        .string()
        .min(1, "Firewall threshold is required"),
    FIREWALL_API_URL: z.string().min(1, "Firewall api url is required"),
    FIREWALL_API_KEY: z.string(),    
    FIREWALL_WELCOME: z.boolean(),
    FIREWALL_SCORE_FAIL: z.string().default("0.9"),
});

export type extractorConfig = z.infer<typeof extractorEnvSchema>;

export async function validateExtractorConfig(
    runtime: IAgentRuntime
): Promise<extractorConfig> {
    try {
        const config = {
            FIREWALL_SCORE_THRESHOLD: runtime.getSetting("FIREWALL_SCORE_THRESHOLD"),
            FIREWALL_API_URL: runtime.getSetting("FIREWALL_API_URL"),
            FIREWALL_API_KEY: runtime.getSetting("FIREWALL_API_KEY")
                ? runtime.getSetting("FIREWALL_API_KEY")
                : "",            
            FIREWALL_WELCOME: runtime.getSetting("FIREWALL_WELCOME")
                ? JSON.parse(runtime.getSetting("FIREWALL_WELCOME"))
                : false,
            FIREWALL_SCORE_FAIL: runtime.getSetting("FIREWALL_SCORE_FAIL")
        } as extractorConfig;

        return extractorEnvSchema.parse(config) as extractorConfig;
    } catch (error) {
        elizaLogger.log("Firewall config validation failed", error);
        if (error instanceof z.ZodError) {
            const errorMessages = error.errors
                .map((err) => `${err.path.join(".")}: ${err.message}`)
                .join("\n");
            throw new Error(
                `Firewall Configuration validation failed:\n${errorMessages}`
            );
        }
        throw error;
    }
}
