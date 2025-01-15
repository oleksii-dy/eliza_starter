import { Provider, IAgentRuntime, Memory, elizaLogger } from "@elizaos/core";
import { AIME_CONSTANTS } from "../constants";

const ONCHAIN_AIME_ADDRESS_TEST = "0x1F45A918807De7F3654B61dE9faa817953210E66";

export const dnaProvider: Provider = {
    get: async (runtime: IAgentRuntime, message: Memory) => {
        try {
            // Get recent messages for context
            const messages = await runtime.messageManager.getMemories({
                roomId: message.roomId,
                count: 5,
            });
            const context = messages
                .map((m) => `- ${m.content.text}`)
                .join("\n");

            // Call NFT retrieval API
            const response = await fetch(AIME_CONSTANTS.AIME_ENDPOINT, {
                method: "POST",
                headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        onchain_aime_address: AIME_CONSTANTS.ONCHAIN_AIME_ADDRESS_TEST,
                        context: context,
                        message: message.content.text,
                    }),
                }
            );

            if (!response.ok) {
                throw new Error(`API request failed: ${response.statusText}`);
            }

            const rawData = await response.json();

            elizaLogger.debug("AIME ONCHAIN response", rawData);

            // Validate API response using Zod schema

            // Format and return the response
            return `#NFT context\n${rawData.context ? rawData.context : "No context available"}`;
        } catch (error) {
            // Log the error and return error message
            console.error("AIME ONCHAIN error:", error);
            return {
                error: "Failed to retrieve NFT information",
                details:
                    error instanceof Error ? error.message : "Unknown error",
            };
        }
    },
};
