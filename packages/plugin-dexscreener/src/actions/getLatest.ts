import {
    Action,
    elizaLogger,
    IAgentRuntime,
    Memory,
    HandlerCallback,
    State,
} from "@elizaos/core";

interface TokenProfile {
    url: string;
    description?: string;
    chainId: string;
    tokenAddress: string;
}

export const getLatestTokensAction: Action = {
    name: "GET_LATEST_TOKENS",
    description: "Get the latest tokens from DexScreener API",
    validate: async (runtime: IAgentRuntime, _message: Memory) => {
        elizaLogger.log("Validating runtime for GET_LATEST_TOKENS...");
        return true; // No API key required for this endpoint
    },
    handler: async (
        runtime: IAgentRuntime,
        _message: Memory,
        state: State,
        _options: any,
        callback: HandlerCallback
    ) => {
        elizaLogger.log("Starting GET_LATEST_TOKENS handler...");

        try {
            const response = await fetch(
                "https://api.dexscreener.com/token-profiles/latest/v1",
                {
                    method: "GET",
                    headers: {
                        accept: "application/json",
                    },
                }
            );

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const tokens: TokenProfile[] = await response.json();

            // Format the output with URL and Description
            const formattedOutput = tokens
                .map((token) => {
                    const description =
                        token.description || "No description available";
                    return `Chain: ${token.chainId}\nToken Address: ${token.tokenAddress}\nURL: ${token.url}\nDescription: ${description}\n\n`;
                })
                .join("");

            callback(
                {
                    text: formattedOutput,
                },
                []
            );
        } catch (error) {
            elizaLogger.error("Error fetching latest tokens:", error);
            callback(
                {
                    text: "Failed to fetch latest tokens. Please check the logs for more details.",
                },
                []
            );
        }
    },
    examples: [],
    similes: [
        "GET_LATEST_TOKENS",
        "FETCH_NEW_TOKENS",
        "CHECK_RECENT_TOKENS",
        "LIST_NEW_TOKENS",
    ],
};
