import { Action, IAgentRuntime, Memory, Provider } from "@elizaos/core";
import { State } from "@elizaos/core";
import { HandlerCallback } from "@elizaos/core";
import { NFTWatchlist } from "./get-collections";
import { detectThinFloorOpportunities } from "./get-collections";

export const publishDailyNFTOpportunitiesTweetAction = (
    nftCollectionProvider: Provider,
    reservoirService: any,
    twitterClient: any
): Action => {
    const watchlist = NFTWatchlist.getInstance();

    return {
        name: "PUBLISH_DAILY_NFT_OPPORTUNITIES_TWEET",
        similes: ["NFT_DAILY_INSIGHTS", "TWEET_FLOOR_GEMS"],
        description:
            "Publish daily tweet about discovered NFT buying opportunities",
        validate: async (runtime: IAgentRuntime, message: Memory) => {
            const lowercaseText = message.content.text.toLowerCase();
            return (
                lowercaseText.includes("publish daily tweet") ||
                lowercaseText.includes("tweet nft opportunities")
            );
        },
        handler: async (
            runtime: IAgentRuntime,
            message: Memory,
            state: State,
            options: any,
            callback: HandlerCallback
        ) => {
            try {
                // Fetch opportunities from watchlist
                const watchlistCollections = watchlist.getWatchlist();
                const opportunities = await detectThinFloorOpportunities(
                    watchlistCollections,
                    reservoirService
                );

                // Select top 3 opportunities for the tweet
                const topOpportunities = opportunities.slice(0, 3);

                if (topOpportunities.length === 0) {
                    callback({
                        text: "No significant NFT opportunities found today.",
                    });
                    return false;
                }

                // Craft an engaging tweet
                const tweetContent = `🔥 Daily NFT Floor Gems on @IkigaiLabs 🖼️

Discover today's top arbitrage opportunities:

${topOpportunities
    .map(
        (opp, index) => `
${index + 1}. ${opp.name || "Mystery Collection"}
💰 Lowest: ${opp.lowestPrice.toFixed(3)} ETH
📈 Potential Profit: ${((opp.potentialProfit - 1) * 100).toFixed(2)}%
🔗 https://ikigailabs.xyz/collection/${opp.collection}`
    )
    .join("\n")}

#NFT #Arbitrage #CryptoArt`;

                // Publish tweet
                const tweetResponse =
                    await twitterClient.v2.tweet(tweetContent);

                // Callback and logging
                callback({
                    text: `Daily NFT opportunities tweet published. Tweet ID: ${tweetResponse.data.id}`,
                });

                // Optional: Log tweet details
                console.log("Daily NFT Opportunities Tweet:", {
                    tweetId: tweetResponse.data.id,
                    opportunities: topOpportunities.map(
                        (opp) => opp.collection
                    ),
                });

                return true;
            } catch (error) {
                console.error(
                    "Error publishing daily NFT opportunities tweet:",
                    error
                );
                callback({
                    text: "Failed to publish daily NFT opportunities tweet.",
                });
                return false;
            }
        },
        examples: [
            [
                {
                    user: "{{user1}}",
                    content: {
                        text: "Publish daily tweet about NFT opportunities",
                    },
                },
                {
                    user: "{{user2}}",
                    content: {
                        text: "Daily NFT opportunities tweet published successfully.",
                    },
                },
            ],
        ],
    };
};
