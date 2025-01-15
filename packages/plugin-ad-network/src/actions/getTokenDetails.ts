import { Action, IAgentRuntime, Memory, State } from "@elizaos/core";
import { AdNetworkActionContent, TokenDetails } from "../types/types.ts";
import { adNetworkProvider } from "../providers/adNetworkProvider.ts";

export const getTokenDetailsAction: Action = {
    name: "GET_AIRDROP_PROMOTION_CONTENT",
    description:
        "Generates promotional content for airdrop tokens in the portfolio.",
    similes: [
        "PROMOTION_GENERATOR",
        "AIRDROP_TOKEN_MARKETER",
        "TOKEN_PORTFOLIO_PROMOTER",
        "AI-DRIVEN_PROMOTION_CREATOR",
    ],
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "I want to create a promotional post about an airdrop token in my portfolio.",
                } as AdNetworkActionContent,
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "The token 'VAIN' is on the 'base' chain and focuses on AI investments. It's a perfect choice for an innovative airdrop promotion.",
                    action: "GET_AIRDROP_PROMOTION_CONTENT",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Can you help create a promotion for the next token airdrop?",
                } as AdNetworkActionContent,
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "The token 'VAIN', operating on the 'base' chain, is a unique AI investment opportunity. Let's craft a compelling airdrop promotion around its innovation-driven approach.",
                    action: "GET_AIRDROP_PROMOTION_CONTENT",
                },
            },
        ],
    ],

    validate: async (
        runtime: IAgentRuntime,
        message: Memory,
        state?: State
    ): Promise<boolean> => {
        try {
            const content = message.content as AdNetworkActionContent;
            return (
                typeof content.text === "string" &&
                content.text.toLowerCase().includes("promotion")
            );
        } catch {
            return false;
        }
    },

    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state?: State
    ): Promise<string> => {
        try {
            const response = await adNetworkProvider.get(
                runtime,
                message,
                state
            );

            if (!response.success || !response.data) {
                return `Sorry, I couldn't retrieve token details for the promotion. ${response.error || ""}`;
            }

            const data: TokenDetails = response.data;

            return `The token '${data.token}' is on the '${data.chain}' chain. It is described as: "${data.context}". This makes it an excellent candidate for airdrop promotions that highlight AI-driven innovation and blockchain scalability.`;
        } catch (error) {
            return `Sorry, there was an error processing your token promotion request: ${
                error instanceof Error ? error.message : "Unknown error"
            }`;
        }
    },
};
