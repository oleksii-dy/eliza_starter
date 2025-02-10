import type { IAgentRuntime } from "@elizaos/core";
import { z } from "zod";

export const naviEnvSchema = z.object({
    NAVI_PRIVATE_KEY: z.string().min(1, "NAVI private key is required"),
    NAVI_NETWORK: z.enum(["mainnet", "devnet", "localnet"]).or(z.string().min(1, "NAVI NETWORK is required")) // rpc url,
});

export type NaviConfig = z.infer<typeof naviEnvSchema>;

export async function validateNaviConfig(
    runtime: IAgentRuntime
): Promise<NaviConfig> {
    try {
        const config = {
            NAVI_PRIVATE_KEY:
                runtime.getSetting("NAVI_PRIVATE_KEY") ||
                process.env.NAVI_PRIVATE_KEY,
            NAVI_NETWORK:
                runtime.getSetting("NAVI_NETWORK") || process.env.NAVI_NETWORK,
        };

        return naviEnvSchema.parse(config);
    } catch (error) {
        if (error instanceof z.ZodError) {
            const errorMessages = error.errors
                .map((err) => `${err.path.join(".")}: ${err.message}`)
                .join("\n");
            throw new Error(
                `NAVI configuration validation failed:\n${errorMessages}`
            );
        }
        throw error;
    }
}
