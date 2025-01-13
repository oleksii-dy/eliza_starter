import { Action, IAgentRuntime, Memory, Provider, State } from "@elizaos/core";
import { ReservoirService } from "../services/reservoir";
import { HandlerCallback } from "@elizaos/core";
import { z } from "zod";

// Helper function to extract NFT listing details from the message
function extractListingDetails(text: string): {
    tokenId: string | null;
    collectionAddress: string | null;
    price?: number | null;
    arbitrageMode?: boolean;
} {
    const addressMatch = text.match(/(?:collection|from)\s*(0x[a-fA-F0-9]+)/i);
    const tokenIdMatch = text.match(/(?:token|nft)\s*#?\s*(\d+)/i);
    const priceMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:eth|Ξ)/i);
    const arbitrageModeMatch = text.match(/(?:arbitrage|auto)/i);

    return {
        collectionAddress: addressMatch ? addressMatch[1] : null,
        tokenId: tokenIdMatch ? tokenIdMatch[1] : null,
        price: priceMatch ? parseFloat(priceMatch[1]) : undefined,
        arbitrageMode: !!arbitrageModeMatch,
    };
}

// Extended interface to handle potential methods
interface ExtendedReservoirService extends ReservoirService {
    getLastSalePrice?: (params: {
        collectionAddress: string;
        tokenId: string;
    }) => Promise<number | undefined>;
}

// Offer Acceptance Schema
const OfferAcceptanceSchema = z.object({
    tokenId: z.string(),
    collection: z.string(),
    offerPrice: z.number(),
    listingPrice: z.number(),
    acceptanceThreshold: z.number().optional().default(0.95), // 5% below listing price
    maxAcceptanceDiscount: z.number().optional().default(0.1), // Max 10% below listing
});

export const listNFTAction = (nftService: ExtendedReservoirService): Action => {
    return {
        name: "LIST_NFT",
        similes: ["SELL_NFT", "CREATE_LISTING", "ARBITRAGE_LISTING"],
        description:
            "Lists an NFT for sale on ikigailabs.xyz marketplace, with optional arbitrage mode for automatic 2x pricing.",

        validate: async (runtime: IAgentRuntime, message: Memory) => {
            const content = message.content.text.toLowerCase();
            return (
                (content.includes("list") ||
                    content.includes("sell") ||
                    content.includes("arbitrage")) &&
                content.includes("nft") &&
                (content.includes("0x") ||
                    content.includes("token") ||
                    content.includes("#"))
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
                const {
                    collectionAddress,
                    tokenId,
                    price: userSpecifiedPrice,
                    arbitrageMode,
                } = extractListingDetails(message.content.text);

                if (!collectionAddress || !tokenId) {
                    throw new Error(
                        "Please provide the collection address and token ID"
                    );
                }

                if (!nftService) {
                    throw new Error("NFT service not found");
                }

                // Verify ownership before listing
                const ownedNFTs = await nftService.getOwnedNFTs(message.userId);
                const ownedNFT = ownedNFTs.find(
                    (nft) =>
                        nft.collectionAddress.toLowerCase() ===
                            collectionAddress.toLowerCase() &&
                        nft.tokenId === tokenId
                );

                if (!ownedNFT) {
                    throw new Error("You don't own this NFT");
                }

                // Determine listing price
                let listingPrice: number;
                if (userSpecifiedPrice) {
                    listingPrice = userSpecifiedPrice;
                } else if (arbitrageMode) {
                    // In arbitrage mode, try to get the last sale price and double it
                    let lastSalePrice: number | undefined;

                    // Check if the method exists, otherwise use a fallback
                    if (typeof nftService.getLastSalePrice === "function") {
                        lastSalePrice = await nftService.getLastSalePrice({
                            collectionAddress,
                            tokenId,
                        });
                    }

                    // Fallback: use floor price
                    if (!lastSalePrice) {
                        const floorListings = await nftService.getFloorListings(
                            {
                                collection: collectionAddress,
                                limit: 1,
                                sortBy: "price",
                            }
                        );

                        lastSalePrice =
                            floorListings.length > 0
                                ? floorListings[0].price
                                : undefined;
                    }

                    listingPrice = lastSalePrice ? lastSalePrice * 2 : 0;
                } else {
                    listingPrice = 0; // Default to market price
                }

                // Create the listing on ikigailabs
                const listing = await nftService.createListing({
                    tokenId,
                    collectionAddress,
                    price: listingPrice,
                    marketplace: "ikigailabs",
                    expirationTime:
                        Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60, // 30 days
                });

                const response =
                    `Successfully created listing on ikigailabs.xyz:\n` +
                    `• Collection: ${collectionAddress}\n` +
                    `• Token ID: ${tokenId}\n` +
                    `• Listing Price: ${listingPrice.toFixed(3)} ETH\n` +
                    `• Listing Mode: ${arbitrageMode ? "Arbitrage" : "Standard"}\n` +
                    `• Status: ${listing.status}\n` +
                    `• Listing URL: ${listing.marketplaceUrl}\n` +
                    (listing.transactionHash
                        ? `• Transaction: ${listing.transactionHash}\n`
                        : "");

                callback({
                    text: response,
                });

                await runtime.messageManager.createMemory({
                    id: message.id,
                    content: { text: response },
                    roomId: message.roomId,
                    userId: message.userId,
                    agentId: runtime.agentId,
                });

                return true;
            } catch (error) {
                console.error("NFT listing failed:", error);
                await runtime.messageManager.createMemory({
                    id: message.id,
                    content: {
                        text: `Failed to list NFT: ${error.message}`,
                    },
                    roomId: message.roomId,
                    userId: message.userId,
                    agentId: runtime.agentId,
                });
                return false;
            }
        },

        examples: [
            [
                {
                    user: "{{user1}}",
                    content: {
                        text: "List token #123 from collection 0x1234...abcd in arbitrage mode",
                    },
                },
                {
                    user: "{{user2}}",
                    content: {
                        text: "Creating arbitrage listing on ikigailabs.xyz at 2x last sale price...",
                        action: "LIST_NFT",
                    },
                },
            ],
            [
                {
                    user: "{{user1}}",
                    content: {
                        text: "List token #123 from collection 0x1234...abcd for 5 ETH",
                    },
                },
                {
                    user: "{{user2}}",
                    content: {
                        text: "Creating listing on ikigailabs.xyz with specified price...",
                        action: "LIST_NFT",
                    },
                },
            ],
        ],
    };
};

export const acceptNFTOfferAction = (
    nftCollectionProvider: Provider,
    reservoirService: any
): Action => {
    return {
        name: "ACCEPT_NFT_OFFER",
        similes: ["SELL_NFT", "PROCESS_OFFER"],
        description:
            "Intelligently accept NFT offers based on pricing strategy",
        validate: async (runtime: IAgentRuntime, message: Memory) => {
            const lowercaseText = message.content.text.toLowerCase();
            return [
                "accept offer",
                "sell nft",
                "process offer",
                "accept bid",
            ].some((term) => lowercaseText.includes(term));
        },
        handler: async (
            runtime: IAgentRuntime,
            message: Memory,
            state: State,
            options: any,
            callback: HandlerCallback
        ) => {
            try {
                // Extract offer details from message
                const offerDetails = await extractOfferDetails(
                    message.content.text,
                    reservoirService
                );

                // Validate offer details
                const validatedOffer = OfferAcceptanceSchema.parse({
                    tokenId: offerDetails.tokenId,
                    collection: offerDetails.collection,
                    offerPrice: offerDetails.offerPrice,
                    listingPrice: offerDetails.listingPrice,
                });

                // Fetch current market context
                const [currentListings, recentSales] = await Promise.all([
                    reservoirService.getListings({
                        collection: validatedOffer.collection,
                        limit: 10,
                    }),
                    reservoirService.getSalesHistory({
                        collection: validatedOffer.collection,
                        limit: 20,
                    }),
                ]);

                // Calculate market average price
                const averageSalePrice =
                    recentSales.length > 0
                        ? recentSales.reduce(
                              (sum, sale) => sum + sale.price,
                              0
                          ) / recentSales.length
                        : validatedOffer.listingPrice;

                // Intelligent offer acceptance logic
                const shouldAcceptOffer =
                    // Offer is at or above 95% of listing price
                    validatedOffer.offerPrice >=
                        validatedOffer.listingPrice *
                            validatedOffer.acceptanceThreshold ||
                    // Offer is within 10% of average recent sale price
                    (validatedOffer.offerPrice >=
                        averageSalePrice *
                            (1 - validatedOffer.maxAcceptanceDiscount) &&
                        validatedOffer.offerPrice <=
                            averageSalePrice *
                                (1 + validatedOffer.maxAcceptanceDiscount));

                if (shouldAcceptOffer) {
                    // Execute offer acceptance
                    const acceptanceResult = await reservoirService.acceptOffer(
                        {
                            tokenId: validatedOffer.tokenId,
                            collection: validatedOffer.collection,
                            offerPrice: validatedOffer.offerPrice,
                        }
                    );

                    // Prepare response
                    const responseText = `✅ Offer Accepted!
🏷️ Collection: ${validatedOffer.collection}
🖼️ Token ID: ${validatedOffer.tokenId}
💰 Offer Price: ${validatedOffer.offerPrice.toFixed(3)} ETH
📊 Market Context: Avg Recent Sale ${averageSalePrice.toFixed(3)} ETH`;

                    callback({ text: responseText });

                    // Optional: Log the transaction
                    console.log("NFT Offer Accepted:", {
                        collection: validatedOffer.collection,
                        tokenId: validatedOffer.tokenId,
                        offerPrice: validatedOffer.offerPrice,
                        marketAveragePrice: averageSalePrice,
                    });

                    return true;
                } else {
                    callback({
                        text: `❌ Offer Rejected.
Offer Price: ${validatedOffer.offerPrice.toFixed(3)} ETH
Listing Price: ${validatedOffer.listingPrice.toFixed(3)} ETH
Market Average: ${averageSalePrice.toFixed(3)} ETH`,
                    });
                    return false;
                }
            } catch (error) {
                console.error("Error processing NFT offer:", error);
                callback({ text: "Failed to process NFT offer." });
                return false;
            }
        },
        examples: [
            [
                {
                    user: "{{user1}}",
                    content: {
                        text: "Accept offer for token 123 in collection 0x...",
                    },
                },
                {
                    user: "{{user2}}",
                    content: { text: "Offer accepted successfully!" },
                },
            ],
        ],
    };
};

// Fetch current listing price for a specific token
async function fetchCurrentListingPrice(
    collection: string,
    tokenId: string,
    reservoirService: any
) {
    try {
        const listings = await reservoirService.getListings({
            collection,
            tokenId,
            limit: 1,
        });
        return listings.length > 0 ? listings[0].price : null;
    } catch (error) {
        console.error("Error fetching listing price:", error);
        return null;
    }
}

// Helper function to extract offer details from message
async function extractOfferDetails(messageText: string, reservoirService: any) {
    // Implement intelligent parsing of offer details
    // This is a placeholder and should be enhanced with more robust parsing
    const tokenIdMatch = messageText.match(/token\s*(\d+)/i);
    const collectionMatch = messageText.match(/0x[a-fA-F0-9]{40}/);
    const priceMatch = messageText.match(/(\d+(\.\d+)?)\s*ETH/i);

    if (!tokenIdMatch || !collectionMatch || !priceMatch) {
        throw new Error("Insufficient offer details");
    }

    return {
        tokenId: tokenIdMatch[1],
        collection: collectionMatch[0],
        offerPrice: parseFloat(priceMatch[1]),
        listingPrice: await fetchCurrentListingPrice(
            collectionMatch[0],
            tokenIdMatch[1],
            reservoirService
        ),
    };
}
