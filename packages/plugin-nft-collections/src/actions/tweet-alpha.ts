import { Action, IAgentRuntime, Memory, Provider, State } from "@elizaos/core";
import { HandlerCallback } from "@elizaos/core";
import { NFTWatchlist } from "./get-collections";
import { detectThinFloorOpportunities } from "./get-collections";
import { CURATED_COLLECTIONS } from "../constants/curated-collections";

interface CuratedCollection {
    address?: string;
    name?: string;
    description?: string;
    category?:
        | "Gen Art"
        | "Photography"
        | "AI Inspired"
        | "Memetics"
        | "Iconic Gems";
    creator?: string;
    tokenIdRange?: { start?: string; end?: string };
}

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

                // Craft an engaging and creative tweet
                const tweetContent = `🕵️‍♂️ NFT Arbitrage Hunters: Today's Hidden Gems 💎

Uncover the market's best-kept secrets before anyone else:

${topOpportunities
    .map(
        (opp, index) => `
${index + 1}. ${opp.name || "Mystery Collection"} 🎨
💸 Floor Price Hack: ${opp.lowestPrice.toFixed(3)} ETH
🚀 Profit Potential: ${((opp.potentialProfit - 1) * 100).toFixed(2)}%
💡 Last Sale Whispers: ${opp.historicalSales[0].latestSalePrice.toFixed(3)} ETH
🔍 Dive deeper: https://ikigailabs.xyz/collection/${opp.collection}`
    )
    .join("\n")}

💡 Pro Tip: Speed is your ally in the NFT arbitrage game!

Powered by Ikigai Labs 🔥`;

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

export const publishDailyCuratedCollectionTweetAction = (
    nftCollectionProvider: Provider,
    reservoirService: any,
    twitterClient: any
): Action => {
    return {
        name: "PUBLISH_DAILY_CURATED_COLLECTION_TWEET",
        similes: ["NFT_COLLECTION_SPOTLIGHT", "DAILY_ART_SHOWCASE"],
        description:
            "Publish a daily tweet highlighting a curated NFT collection",
        validate: async (runtime: IAgentRuntime, message: Memory) => {
            const lowercaseText = message.content.text.toLowerCase();
            return (
                lowercaseText.includes("daily collection") ||
                lowercaseText.includes("curated collection tweet")
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
                // Select a random curated collection
                const collection =
                    CURATED_COLLECTIONS[
                        Math.floor(Math.random() * CURATED_COLLECTIONS.length)
                    ];

                // Fetch additional collection insights
                const [floorListings, salesHistory] = await Promise.all([
                    reservoirService.getFloorListings({
                        collection: collection.address,
                        limit: 5,
                    }),
                    reservoirService.getSalesHistory({
                        collection: collection.address,
                        limit: 20,
                    }),
                ]);

                // Calculate sales statistics
                const salesStats = {
                    totalVolume: salesHistory.reduce(
                        (sum, sale) => sum + sale.price,
                        0
                    ),
                    averagePrice:
                        salesHistory.length > 0
                            ? salesHistory.reduce(
                                  (sum, sale) => sum + sale.price,
                                  0
                              ) / salesHistory.length
                            : 0,
                    totalSales: salesHistory.length,
                    floorPrice:
                        floorListings.length > 0 ? floorListings[0].price : 0,
                };

                // Craft an engaging tweet
                const tweetContent = `🎨 Curated Collection Spotlight: ${collection.name} 💎

Dive into the story behind today's digital masterpiece:

🖌️ Artist: ${collection.creator || "Anonymous"}
🌟 Collection Essence: ${collection.description || "A unique digital art experience that pushes the boundaries of creativity"}
📊 Floor Price: ${salesStats.floorPrice.toFixed(3)} ETH
💸 Total Volume: ${salesStats.totalVolume.toFixed(3)} ETH
🔢 Total Sales: ${salesStats.totalSales}

Explore the art: https://ikigailabs.xyz/collection/${collection.address}

Powered by Ikigai Labs 🔥`;

                // Publish tweet
                const tweetResponse =
                    await twitterClient.v2.tweet(tweetContent);

                // Callback and logging
                callback({
                    text: `Daily curated collection tweet published for ${collection.name}. Tweet ID: ${tweetResponse.data.id}`,
                });

                // Optional: Log tweet details
                console.log("Daily Curated Collection Tweet:", {
                    tweetId: tweetResponse.data.id,
                    collection: collection.name,
                    collectionAddress: collection.address,
                });

                return true;
            } catch (error) {
                console.error(
                    "Error publishing daily curated collection tweet:",
                    error
                );
                callback({
                    text: "Failed to publish daily curated collection tweet.",
                });
                return false;
            }
        },
        examples: [
            [
                {
                    user: "{{user1}}",
                    content: {
                        text: "Publish daily collection tweet",
                    },
                },
                {
                    user: "{{user2}}",
                    content: {
                        text: "Daily curated collection tweet published successfully.",
                    },
                },
            ],
        ],
    };
};
