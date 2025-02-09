import { IAgentRuntime } from "@elizaos/core";
import { z } from "zod";

export const extractorEnvSchema = z.object({
    FIREWALL_RISKS_THRESHOLD: z.string().min(1, "Firewall threshold is required"),
    FIREWALL_RISKS_API: z.string().min(1, "Firewall api url is required"),
    FIREWALL_API_KEY: z.string().min(1, "Firewall api url is required"),
});

export type extractorConfig = z.infer<typeof extractorEnvSchema>;

export async function validateExtractorConfig(
    runtime: IAgentRuntime
): Promise<extractorConfig> {
    try {
        const config = {
            FIREWALL_RISKS_THRESHOLD: runtime.getSetting(
                "FIREWALL_RISKS_THRESHOLD"
            ),
            FIREWALL_RISKS_API: runtime.getSetting("FIREWALL_RISKS_API"),
            FIREWALL_API_KEY: runtime.getSetting("FIREWALL_API_KEY"),
        };
        console.log("config: ", config);
        return extractorEnvSchema.parse(config);
    } catch (error) {
        console.log("error::::", error);
        if (error instanceof z.ZodError) {
            const errorMessages = error.errors
                .map((err) => `${err.path.join(".")}: ${err.message}`)
                .join("\n");
            throw new Error(
                `Extractor firewall API configuration validation failed:\n${errorMessages}`
            );
        }
        throw error;
    }
}
