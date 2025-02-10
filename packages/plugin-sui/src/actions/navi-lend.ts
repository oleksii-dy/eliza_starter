import {
    ActionExample,
    Content,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    ModelClass,
    ServiceType,
    State,
    composeContext,
    elizaLogger,
    generateObject,
    type Action,
} from "@elizaos/core";
import { NaviService } from "../services/navi";
import { z } from "zod";
import { OptionType } from "@navi-labs/sdk";

export interface LendPayload extends Content {
    operation: "supply" | "withdraw";
    token_symbol: string;
    amount: string | number;
}

const lendTemplate = `Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined.

Example response:
\`\`\`json
{
    "operation": "supply",
    "token_symbol": "sui",
    "amount": "1"
}
\`\`\`

{{recentMessages}}

Given the recent messages, extract the following information about the lending operation:
- Operation type (supply or withdraw)
- Token symbol
- Amount to supply/withdraw

Respond with a JSON markdown block containing only the extracted values.`;

export default {
    name: "NAVI_LEND",
    similes: ["NAVI_SUPPLY", "NAVI_WITHDRAW"],
    validate: async (runtime: IAgentRuntime, message: Memory) => {
        console.log("Validating navi lending operation from user:", message.userId);
        return true;
    },
    description: "Supply or withdraw tokens from Navi protocol",
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback?: HandlerCallback
    ): Promise<boolean> => {
        elizaLogger.log("Starting NAVI_LEND handler...");

        const service = runtime.getService<NaviService>(ServiceType.TRANSCRIPTION);

        if (!state) {
            state = (await runtime.composeState(message)) as State;
        } else {
            state = await runtime.updateRecentMessageState(state);
        }

        const lendSchema = z.object({
            operation: z.enum(["supply", "withdraw"]),
            token_symbol: z.string(),
            amount: z.union([z.string(), z.number()]),
        });

        const lendContext = composeContext({
            state,
            template: lendTemplate,
        });

        const content = await generateObject({
            runtime,
            context: lendContext,
            schema: lendSchema,
            modelClass: ModelClass.SMALL,
        });

        const lendContent = content.object as LendPayload;
        elizaLogger.info("Lend content:", lendContent);

        try {
            // Get token metadata
            const tokenInfo = {
                symbol: lendContent.token_symbol.toUpperCase(),
                address: "", // This will be filled by the SDK
                decimal: 9,
            };

            // Get health factor before operation
            const healthFactor = await service.getHealthFactor(service.getAddress());
            elizaLogger.info("Current health factor:", healthFactor);

            // Get dynamic health factor for the operation
            const dynamicHealthFactor = await service.getDynamicHealthFactor(
                service.getAddress(),
                tokenInfo,
                lendContent.operation === "supply" ? Number(lendContent.amount) : 0,
                0,
                lendContent.operation === "supply"
            );
            elizaLogger.info("Dynamic health factor:", dynamicHealthFactor);

            // Get available rewards
            const rewards = await service.getAvailableRewards(
                undefined,
                lendContent.operation === "supply"
                    ? OptionType.OptionSupply
                    : OptionType.OptionWithdraw
            );
            elizaLogger.info("Available rewards:", rewards);

            callback({
                text: `Operation details:
                - Operation: ${lendContent.operation}
                - Token: ${lendContent.token_symbol}
                - Amount: ${lendContent.amount}
                - Current Health Factor: ${healthFactor}
                - Projected Health Factor: ${dynamicHealthFactor}
                - Available Rewards: ${JSON.stringify(rewards)}`,
                content: lendContent,
            });

            return true;
        } catch (error) {
            elizaLogger.error("Error in lending operation:", error);
            callback({
                text: `Failed to perform ${lendContent.operation} operation: ${error}`,
                content: { error: `Failed to ${lendContent.operation}` },
            });
            return false;
        }
    },

    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "I want to supply 1 SUI to Navi",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "I'll help you supply 1 SUI to Navi protocol...",
                    action: "NAVI_LEND",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Successfully supplied 1 SUI to Navi protocol",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Withdraw 0.5 SUI from Navi",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "I'll help you withdraw 0.5 SUI from Navi protocol...",
                    action: "NAVI_LEND",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Successfully withdrew 0.5 SUI from Navi protocol",
                },
            },
        ],
    ] as ActionExample[][],
} as Action; 