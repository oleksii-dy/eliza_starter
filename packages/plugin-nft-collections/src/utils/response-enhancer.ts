import { State } from "@elizaos/core";
import { NFTKnowledge } from "../types";

type EnhancementConfig = {
    maxAdditionalPrompts?: number;
    separator?: string;
};

export function enhanceResponse(
    response: string,
    state: State,
    config: EnhancementConfig = {}
): string {
    const { maxAdditionalPrompts = 3, separator = " " } = config;

    const nftKnowledge = state.nftKnowledge as NFTKnowledge;
    if (!nftKnowledge) return response;

    const enhancements = [
        {
            condition: nftKnowledge.mentionsCollection,
            prompt: "Would you like to know more about specific NFT collections?",
        },
        {
            condition: nftKnowledge.mentionsFloorPrice,
            prompt: "I can provide information on floor prices for popular collections.",
        },
        {
            condition: nftKnowledge.mentionsVolume,
            prompt: "I can share recent trading volume data for NFT collections.",
        },
        {
            condition: nftKnowledge.mentionsRarity,
            prompt: "I can explain rarity factors in NFT collections if you're interested.",
        },
        {
            condition: nftKnowledge.mentionsMarketTrends,
            prompt: "I can show you the latest market trends and price movements.",
        },
        {
            condition: nftKnowledge.mentionsTraders,
            prompt: "Would you like to see recent whale activity and notable trades?",
        },
        {
            condition: nftKnowledge.mentionsSentiment,
            prompt: "I can provide current market sentiment analysis and trader mood indicators.",
        },
        {
            condition: nftKnowledge.mentionsMarketCap,
            prompt: "I can show you market cap rankings and valuation metrics.",
        },
        {
            condition: nftKnowledge.mentionsArtist,
            prompt: "I can provide detailed information about the artist, their background, and previous collections.",
        },
        {
            condition: nftKnowledge.mentionsOnChainData,
            prompt: "I can show you detailed on-chain analytics including holder distribution and trading patterns.",
        },
        {
            condition: nftKnowledge.mentionsNews,
            prompt: "I can share the latest news and announcements about this collection.",
        },
        {
            condition: nftKnowledge.mentionsSocial,
            prompt: "I can provide social media metrics and community engagement data.",
        },
        {
            condition: nftKnowledge.mentionsContract,
            prompt: "I can show you contract details including standards, royalties, and verification status.",
        },
    ];

    const additionalPrompts = enhancements
        .filter((enhancement) => enhancement.condition)
        .slice(0, maxAdditionalPrompts)
        .map((enhancement) => enhancement.prompt);

    return additionalPrompts.length > 0
        ? `${response}${separator}${additionalPrompts.join(separator)}`
        : response;
}
