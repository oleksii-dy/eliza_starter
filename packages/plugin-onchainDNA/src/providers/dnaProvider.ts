import { Provider, IAgentRuntime, Memory, elizaLogger } from "@elizaos/core";

const CHARACTER_ID = "b00918728e0a4e5f80f0d9233eca4040";

export const NFTRetrievalProvider: Provider = {
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
            const response = await fetch(
                "https://api.aime.bot/api/v2/nft/retrieve",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        character_id: CHARACTER_ID,
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
