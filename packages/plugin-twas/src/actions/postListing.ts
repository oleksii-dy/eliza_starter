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
        websiteUrl: string;
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
                    description: "AI-powered solution with integrated blockchain technology",
                    websiteUrl: "www.invest.ai"
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
                      `   - Description: ${listing.entity.description}\n` +
                      `   - Website: ${listing.entity.websiteUrl}\n\n` +
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
                      listing.fundingRound.deliverables.map(d => `     * ${d}`).join('\n'),
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
                content: { text: "Generate the listing" }
            },
            {
                user: "Harambito",
                content: {
                    text: "Here is the Twas Protocol Listing: \n\n1. Entity:\n   - Name: PropChain\n   - Description: Decentralized real estate platform with fractional ownership\n   - Website: www.invest.ai\n\n2. Token:\n   - Name: PropChain Token\n   - Symbol: PROP\n   - Minted: 30,000,000\n   - Mint limit: 30,000,000\n\n3. Funding Round:\n   - Tokens: 30,000,000\n   - % of tokens up for sale: 15\n   - Price per token: 0.060 ETH\n   - Closing date: 4/30/2025\n   - Terms/Deliverables:\n     * Smart contract framework (90 days)\n     * Property tokenization system (120 days)\n     * Virtual tour platform (150 days)\n     * First property listing and sale\n\nThe listing is now complete and ready for review.",
                    action: "POST_LISTING",
                }
            }
        ],
        [
            {
                user: "{{user1}}",
                content: { text: "Create the listing for the NFT marketplace" }
            },
            {
                user: "Harambito",
                content: {
                    text: "Here is the Twas Protocol Listing: \n\n1. Entity:\n   - Name: ArtVerse\n   - Description: AI-curated NFT marketplace with creator royalties\n   - Website: www.invest.ai\n\n2. Token:\n   - Name: ArtVerse Token\n   - Symbol: ARTV\n   - Minted: 25,000,000\n   - Mint limit: 25,000,000\n\n3. Funding Round:\n   - Tokens: 25,000,000\n   - % of tokens up for sale: 12\n   - Price per token: 0.055 ETH\n   - Closing date: 5/15/2025\n   - Terms/Deliverables:\n     * Marketplace smart contracts (45 days)\n     * Creator tools suite (75 days)\n     * AI curation engine (90 days)\n     * Beta launch with selected artists\n\nThe listing is now complete and ready for review.",
                    action: "POST_LISTING",
                }
            }
        ],
        [
            {
                user: "{{user1}}",
                content: { text: "Please generate a listing for the DeFi lending platform" }
            },
            {
                user: "Harambito",
                content: {
                    text: "Here is the Twas Protocol Listing: \n\n1. Entity:\n   - Name: LendFlow\n   - Description: Decentralized lending platform with AI-powered risk assessment\n   - Website: www.invest.ai\n\n2. Token:\n   - Name: LendFlow Token\n   - Symbol: LEND\n   - Minted: 35,000,000\n   - Mint limit: 35,000,000\n\n3. Funding Round:\n   - Tokens: 35,000,000\n   - % of tokens up for sale: 18\n   - Price per token: 0.065 ETH\n   - Closing date: 4/1/2025\n   - Terms/Deliverables:\n     * Risk assessment AI development (60 days)\n     * Smart contract auditing (90 days)\n     * Lending pool implementation (120 days)\n     * Initial liquidity partnerships\n\nThe listing is now complete and ready for review.",
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