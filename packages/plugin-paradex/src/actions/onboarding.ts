import {
    Action,
    IAgentRuntime,
    Memory,
    State,
    elizaLogger,
} from "@elizaos/core";
import { onboardUser, authenticate } from "../utils/paradex-ts/api";
import {
    getParadexConfig,
    getAccount,
} from "../utils/paradexUtils";

interface OnboardingResult {
    success: boolean;
    results: Array<{
        success: boolean;
        network: string;
        account_address?: string;
        ethereum_account?: string;
        error?: string;
        details?: string;
    }>;
    error?: string;
    details?: string;
}

export class ParadexOnboardingError extends Error {
    constructor(message: string, public details?: any) {
        super(message);
        this.name = "ParadexOnboardingError";
        elizaLogger.error("ParadexOnboardingError:", message, details);
    }
}

async function performOnboarding(
    account,
    config,
    network: "testnet" | "prod"
): Promise<OnboardingResult> {
    elizaLogger.info(`Starting onboarding process for ${network}`);

    try {
        // Perform onboarding
        elizaLogger.info(`Onboarding user for ${network}`);
        await onboardUser(config, account);

        // Verify onboarding by attempting authentication
        elizaLogger.info(
            `Verifying onboarding with authentication for ${network}`
        );
        const jwtToken = await authenticate(config, account);

        if (!jwtToken) {
            throw new ParadexOnboardingError(
                `Authentication failed after onboarding for ${network}`
            );
        }

        elizaLogger.success(`Onboarding successful for ${network}`);
        return {
            success: true,
            results: [
                {
                    success: true,
                    network,
                    account_address: account.address,
                    ethereum_account: account.ethereumAccount,
                },
            ],
        };
    } catch (error) {
        elizaLogger.error(`Onboarding failed for ${network}:`, error);
        return {
            success: false,
            results: [
                {
                    success: false,
                    network,
                    error:
                        error instanceof Error ? error.message : String(error),
                    details:
                        error instanceof ParadexOnboardingError
                            ? error.details
                            : undefined,
                },
            ],
        };
    }
}

export const paradexOnboardingAction: Action = {
    name: "PARADEX_ONBOARDING",
    similes: ["ONBOARD_PARADEX", "SETUP_PARADEX", "INITIALIZE_PARADEX"],
    description:
        "Performs initial onboarding for a Paradex account on both testnet and mainnet",
    suppressInitialMessage: true,

    validate: async (runtime: IAgentRuntime, message: Memory) => {
        return true;
    },

    handler: async (runtime: IAgentRuntime, message: Memory, state?: State) => {
        elizaLogger.info("Starting Paradex onboarding handler");

        if (!state) {
            elizaLogger.info("No state provided, composing new state");
            state = await runtime.composeState(message);
        }

        const config = getParadexConfig();

        // Initialize account
        const account = await getAccount(runtime);
        elizaLogger.success("Account initialized");

        try {
            // Perform onboarding for testnet and prod
            const networks: Array<"testnet" | "prod"> = ["testnet", "prod"];
            let overallSuccess = false;

            for (const network of networks) {
                elizaLogger.info(`Starting onboarding for ${network}`);
                const result = await performOnboarding(
                    config,
                    account,
                    network
                );

                if (result.success) {
                    overallSuccess = true;
                    elizaLogger.info(
                        `Onboarding successD for ${network}:`,
                        result
                    );
                }
            }

            elizaLogger.info("Onboarding process completed", {
                overallSuccess,
            });

            return overallSuccess;
        } catch (error) {
            elizaLogger.error("Handler error:", error);
            if (error instanceof ParadexOnboardingError) {
                elizaLogger.error("Onboarding details:", error.details);
            }
            return false;
        }
    },

    examples: [
        [
            {
                user: "{{user1}}",
                content: { text: "Setup my Paradex account" },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "Onboarding completed successfully on all networks.",
                    action: "PARADEX_ONBOARDING",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: { text: "Initialize Paradex" },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "Account onboarding successful on both testnet and mainnet.",
                    action: "PARADEX_ONBOARDING",
                },
            },
        ],
    ],
};
