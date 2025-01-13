import { Provider, type IAgentRuntime, type Memory } from "@elizaos/core";
import { ReservoirService } from "../services/reservoir";
import { MarketIntelligenceService } from "../services/market-intelligence";
import { SocialAnalyticsService } from "../services/social-analytics";

export const createNftCollectionProvider = (
    nftService: ReservoirService,
    marketIntelligenceService: MarketIntelligenceService,
    socialAnalyticsService: SocialAnalyticsService
): Provider => {
    return {
        get: async (
            runtime: IAgentRuntime,
            message: Memory
        ): Promise<string> => {
            if (!nftService) {
                throw new Error("NFT service not found");
            }

            const collections = await nftService.getTopCollections(runtime, 10);
            let response = "Here are the top NFT collections:\n\n";

            for (const collection of collections) {
                response += `${collection.name}:\n`;
                response += `• Floor Price: ${collection.floorPrice} ETH\n`;
                response += `• 24h Volume: ${collection.volume24h} ETH\n`;
                response += `• Market Cap: ${collection.marketCap} ETH\n`;
                response += `• Holders: ${collection.holders}\n\n`;
            }

            // If a specific collection is mentioned in the message, get detailed information
            const collection = collections.find(
                (c) =>
                    message.content.text
                        .toLowerCase()
                        .includes(c.name.toLowerCase()) ||
                    message.content.text
                        .toLowerCase()
                        .includes(c.address.toLowerCase())
            );

            if (collection) {
                response += `\nDetailed information for ${collection.name}:\n\n`;

                // Market intelligence data (optional)
                if (marketIntelligenceService) {
                    try {
                        const marketIntelligence =
                            await marketIntelligenceService.getMarketIntelligence(
                                collection.address
                            );
                        response += "Market Intelligence:\n";
                        response += `• Best Offer: ${marketIntelligence.bestOffer || "N/A"} ETH\n`;
                        response += `• 24h Volume: ${marketIntelligence.volume24h || "N/A"} ETH\n`;
                        response += `• 7d Volume: ${marketIntelligence.volume7d || "N/A"} ETH\n`;
                        response += `• 30d Volume: ${marketIntelligence.volume30d || "N/A"} ETH\n\n`;
                    } catch (error) {
                        console.error(
                            "Failed to fetch market intelligence:",
                            error
                        );
                    }
                }

                // Social analytics data (optional)
                if (socialAnalyticsService) {
                    try {
                        const socialMetrics =
                            await socialAnalyticsService.getSocialMetrics(
                                collection.address
                            );

                        response += "Social Metrics:\n";
                        response += `• Twitter Followers: ${socialMetrics.twitterFollowers || "N/A"}\n`;
                        response += `• Twitter Engagement: ${socialMetrics.twitterEngagement || "N/A"}\n`;
                        response += `• Discord Members: ${socialMetrics.discordMembers || "N/A"}\n`;
                        response += `• Discord Active: ${socialMetrics.discordActive || "N/A"}\n`;
                        response += `• Telegram Members: ${socialMetrics.telegramMembers || "N/A"}\n`;
                        response += `• Telegram Active: ${socialMetrics.telegramActive || "N/A"}\n\n`;
                    } catch (error) {
                        console.error(
                            "Failed to fetch social analytics:",
                            error
                        );
                    }
                }
            }

            return response;
        },
    };
};
