import {
    IAgentRuntime,
    Memory,
    State,
    type Action,
} from "@elizaos/core";

interface TwasListing {
    entity: {
        name: string;
        description: string;
    };
    token: {
        name: string;
        symbol: string;
        minted: number;
        mintLimit: number;
    };
    fundingRound: {
        tokens: number;
        percentageForSale: number;
        pricePerToken: number;
        closingDate: string;
        deliverables: string[];
    };
}

export const GenerateListingAction: Action = {
    name: "GENERATE",
    similes: ["GENERATE", "CREATE_LISTING", "LIST", "MAKE_LISTING"],
    description: "Generate a formal Twas Protocol listing based on the brainstormed idea",
    handler: async (runtime: IAgentRuntime, message: Memory) => {
        try {
            const listing: TwasListing = {
                entity: {
                    name: "Innovation Venture",
                    description: "AI-powered solution with integrated blockchain technology"
                },
                token: {
                    name: "Innovation Token",
                    symbol: "INNOV",
                    minted: 10000000,
                    mintLimit: 10000000
                },
                fundingRound: {
                    tokens: 10000000,
                    percentageForSale: 10,
                    pricePerToken: 0.075,
                    closingDate: "3/1/2025",
                    deliverables: [
                        "Core technology development (30 days)",
                        "Platform MVP launch (60 days)",
                        "Partner integration (90 days)",
                        "Market launch in key regions"
                    ]
                }
            };

            const response = {
                text: `Based on our brainstorming, I'll create a Twas Protocol listing with this structure:\n\n` +
                      `1. Entity:\n` +
                      `   - Name: ${listing.entity.name}\n` +
                      `   - Description: ${listing.entity.description}\n\n` +
                      `2. Token:\n` +
                      `   - Name: ${listing.token.name}\n` +
                      `   - Symbol: ${listing.token.symbol}\n` +
                      `   - Minted: ${listing.token.minted.toLocaleString()}\n` +
                      `   - Mint limit: ${listing.token.mintLimit.toLocaleString()}\n\n` +
                      `3. Funding Round:\n` +
                      `   - Tokens: ${listing.fundingRound.tokens.toLocaleString()}\n` +
                      `   - % of tokens up for sale: ${listing.fundingRound.percentageForSale}\n` +
                      `   - Price per token: ${listing.fundingRound.pricePerToken} ETH\n` +
                      `   - Closing date: ${listing.fundingRound.closingDate}\n` +
                      `   - Terms/Deliverables:\n` +
                      listing.fundingRound.deliverables.map(d => `     * ${d}`).join('\n') +
                      `\n\nShall I proceed with creating the full listing?`,
                action: "POST_LISTING",
            };

            return response;
        } catch (error) {
            console.error("Error in GenerateListingAction handler:", error);
            return {
                text: "I encountered an error while generating the listing. Could you please confirm the details you'd like to include?",
                action: null
            };
        }
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: { text: "Let's generate the listing for our enhanced fitness app" }
            },
            {
                user: "Harambito",
                content: {
                    text: "🚀 Excited to unveil our Twas Protocol listing for Bottled Foreign Policy: \n\n1. Entity:\n   - Name: PropChain\n   - Description: Decentralized real estate platform with fractional ownership\n\n2. Token:\n   - Name: PropChain Token\n   - Symbol: PROP\n   - Minted: 30,000,000\n   - Mint limit: 30,000,000\n\n3. Funding Round:\n   - Tokens: 30,000,000\n   - % of tokens up for sale: 15\n   - Price per token: 0.060 ETH\n   - Closing date: 4/30/2025\n   - Terms/Deliverables:\n     * Smart contract framework (90 days)\n     * Property tokenization system (120 days)\n     * Virtual tour platform (150 days)\n     * First property listing and sale\n\nThe listing is now complete and ready for review.",
                    action: "POST_LISTING",
                }
            }
        ]
    ],
    validate: function (runtime: IAgentRuntime, message: Memory, state?: State): Promise<boolean> {
        const triggerWords = ["generate", "create listing", "make listing", "proceed"];
        const messageText = message.content.text.toLowerCase();
        return Promise.resolve(
            triggerWords.some(word => messageText.includes(word))
        );
    }
};