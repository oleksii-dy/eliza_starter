import { IAgentRuntime } from "@elizaos/core";
import { z } from "zod";

export const roochEnvSchema = z.object({
    BITCOIN_PRIVATE_KEY: z.string().min(1, "Bitcoin private key is required"),
    ROOCH_NETWORK: z.enum(["mainnet", "testnet"]),
});

export type RoochConfig = z.infer<typeof roochEnvSchema>;

export async function validateRoochConfig(
    runtime: IAgentRuntime
): Promise<RoochConfig> {
    try {
        const config = {
            BITCOIN_PRIVATE_KEY:
                runtime.getSetting("BITCOIN_PRIVATE_KEY") ||
                process.env.BITCOIN_PRIVATE_KEY,
            ROOCH_NETWORK:
                runtime.getSetting("ROOCH_NETWORK") || process.env.ROOCH_NETWORK,
        };

        return roochEnvSchema.parse(config);
    } catch (error) {
        if (error instanceof z.ZodError) {
            const errorMessages = error.errors
                .map((err) => `${err.path.join(".")}: ${err.message}`)
                .join("\n");
            throw new Error(
                `Rooch configuration validation failed:\n${errorMessages}`
            );
        }
        throw error;
    }
}
