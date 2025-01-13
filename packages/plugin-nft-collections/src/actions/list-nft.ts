import { Action, IAgentRuntime, Memory, State } from "@elizaos/core";
import { ReservoirService } from "../services/reservoir";
import { HandlerCallback } from "@elizaos/core";

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
