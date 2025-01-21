import { IAgentRuntime } from "@elizaos/core";
import { z } from "zod";

/**
 * Schema for validating TRON blockchain configuration.
 * All values must be provided through environment variables.
 * DO NOT provide default values or hardcode any sensitive information.
 */
export const tronEnvSchema = z.object({
    // Private key must never be logged or exposed
    TRON_PRIVATE_KEY: z.string()
        .min(64, "TRON_PRIVATE_KEY must be a valid private key")
        .max(64, "TRON_PRIVATE_KEY must be a valid private key")
        .regex(/^[0-9a-fA-F]{64}$/, "TRON_PRIVATE_KEY must be a valid hex string")
        .describe("Private key for TRON wallet - NEVER log or expose this value"),

    // Contract addresses must be valid TRON addresses
    TRON_WRAPPED_ADDRESS: z.string()
        .min(34, "TRON_WRAPPED_ADDRESS must be a valid TRON address")
        .max(34, "TRON_WRAPPED_ADDRESS must be a valid TRON address")
        .regex(/^T[0-9A-Za-z]{33}$/, "TRON_WRAPPED_ADDRESS must be a valid TRON address"),
    
    TRON_SUNSWAP_ROUTER: z.string()
        .min(34, "TRON_SUNSWAP_ROUTER must be a valid TRON address")
        .max(34, "TRON_SUNSWAP_ROUTER must be a valid TRON address")
        .regex(/^T[0-9A-Za-z]{33}$/, "TRON_SUNSWAP_ROUTER must be a valid TRON address"),
    
    TRON_SUNSWAP_FACTORY: z.string()
        .min(34, "TRON_SUNSWAP_FACTORY must be a valid TRON address")
        .max(34, "TRON_SUNSWAP_FACTORY must be a valid TRON address")
        .regex(/^T[0-9A-Za-z]{33}$/, "TRON_SUNSWAP_FACTORY must be a valid TRON address"),

    // API endpoint must be HTTPS
    TRON_SYMBIOSIS_API: z.string()
        .url("TRON_SYMBIOSIS_API must be a valid URL")
        .startsWith("https://", "TRON_SYMBIOSIS_API must use HTTPS"),
});

export type TronConfig = z.infer<typeof tronEnvSchema>;

/**
 * Validates TRON blockchain configuration from environment.
 * Throws detailed errors if validation fails.
 * Never logs sensitive information.
 */
export async function validateTronConfig(
    runtime: IAgentRuntime
): Promise<TronConfig> {
    try {
        const config = {
            TRON_PRIVATE_KEY: runtime.getSetting("TRON_PRIVATE_KEY"),
            TRON_WRAPPED_ADDRESS: runtime.getSetting("TRON_WRAPPED_ADDRESS"),
            TRON_SUNSWAP_ROUTER: runtime.getSetting("TRON_SUNSWAP_ROUTER"),
            TRON_SUNSWAP_FACTORY: runtime.getSetting("TRON_SUNSWAP_FACTORY"),
            TRON_SYMBIOSIS_API: runtime.getSetting("TRON_SYMBIOSIS_API"),
        };

        // Validate configuration
        const validatedConfig = tronEnvSchema.parse(config);

        // Ensure we never log sensitive information
        const safeConfig = { ...validatedConfig };
        delete safeConfig.TRON_PRIVATE_KEY;

        // Log safe configuration for debugging
        console.debug("TRON configuration validated:", safeConfig);

        return validatedConfig;
    } catch (error) {
        if (error instanceof z.ZodError) {
            // Ensure error messages don't leak sensitive data
            const errorMessages = error.errors
                .map((err) => {
                    const path = err.path.join(".");
                    // Mask sensitive fields in error messages
                    if (path.toLowerCase().includes("key") || 
                        path.toLowerCase().includes("private")) {
                        return `${path}: Invalid format`;
                    }
                    return `${path}: ${err.message}`;
                })
                .join("\n");
            throw new Error(
                `TRON configuration validation failed:\n${errorMessages}`
            );
        }
        throw error;
    }
}
