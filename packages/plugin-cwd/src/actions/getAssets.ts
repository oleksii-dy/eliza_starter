import {
    Action,
    ActionExample,
    elizaLogger,
    getEmbeddingZeroVector,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    State,
    stringToUuid,
    type AgentRuntime,
    type Content
} from "@elizaos/core";
import { getAssetsExamples } from "../examples";
import { createCWDService } from "../services";

export const getAssetsAction: Action = {
    name: "GET_ASSETS",
    similes: [
        "WALLET_UPDATE",
        "CHECK_PORTFORLIO",
        "LIST_ASSETS",
    ],
    description: "Get assets composition of a CWD wallet",
    validate: async (runtime: IAgentRuntime) => {
        return true;
    },
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback?: HandlerCallback,
        token?: string,
    ) => {
        if (!token) {
            throw new Error("JWT Token missing");
        }

        // Instantiate API service
        const cwdService = createCWDService(runtime as AgentRuntime);

        try {
            // Fetch assets from CWD API
            const usrId = message.userId;
            const roomId = message.roomId;
            elizaLogger.log(`Fetching assets for ${usrId} ...`);
            const assetsData = await cwdService.getAssets(token);
            elizaLogger.success(`Assets retrieved successfully!`);

            const text = `I found the following assets:\n${assetsData}`;

            const content: Content = {
                text,
                source: "cwd",
                inReplyTo: undefined,
            };
            const messageId = stringToUuid(Date.now().toString());
            const userMessage = {
                content,
                usrId,
                roomId,
                agentId: runtime.agentId,
            };

            // save response to memory
            const responseMessage: Memory = {
                id: stringToUuid(messageId + "-" + state.agentId),
                ...userMessage,
                userId: runtime.agentId,
                content,
                embedding: getEmbeddingZeroVector(),
                createdAt: Date.now(),
            };

            await runtime.messageManager.createMemory(responseMessage);

            await runtime.updateRecentMessageState(state);

            if (callback) {
                callback({
                    text: text,
                    content: assetsData,
                });

                return true;
            }
        } catch (error) {
            elizaLogger.error("Error in GET_ASSETS handler:", error);

            callback({
                text: `Error fetching assets: ${error.message}`,
                content: { error: error.message },
            });

            return false;
        }

        return;
    },
    examples: getAssetsExamples as ActionExample[][],
} as Action;

