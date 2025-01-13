import { State } from "@elizaos/core";
import { HandlerCallback } from "@elizaos/core";
import { Action, IAgentRuntime, Memory, Provider } from "@elizaos/core";
import {
    CURATED_COLLECTIONS,
    CuratedCollection,
} from "../constants/curated-collections";
import { z } from "zod";
import fs from "fs/promises";
import path from "path";

// Enhanced Watchlist Entry Schema
const WatchlistEntrySchema = z.object({
    address: z.string(),
    name: z.string().optional(),
    maxThinnessThreshold: z.number().optional().default(15),
    minFloorPrice: z.number().optional(),
    maxFloorPrice: z.number().optional(),
    minProfitMargin: z.number().optional().default(2),
    maxListingPrice: z.number().optional(),
    minListingPrice: z.number().optional(),
    category: z
        .string()
        .refine(
            (val) =>
                [
                    "Gen Art",
                    "Photography",
                    "AI Inspired",
                    "Memetics",
                    "Iconic Gems",
                ].includes(val),
            { message: "Invalid category" }
        )
        .optional(),
    creator: z.string().optional(),
    webhookUrl: z.string().url().optional(),
    notificationPreferences: z
        .object({
            email: z.string().email().optional(),
            telegramId: z.string().optional(),
            discordWebhook: z.string().url().optional(),
        })
        .optional(),
    lastNotificationTimestamp: z.number().optional(),
    notificationCooldown: z.number().optional().default(3600000), // 1 hour
});

type WatchlistEntry = z.infer<typeof WatchlistEntrySchema>;

// Persistent Storage Manager
class PersistentStorageManager {
    private static STORAGE_PATH = path.join(
        process.cwd(),
        ".nft-watchlist.json"
    );

    static async saveData(data: any): Promise<void> {
        try {
            await fs.writeFile(
                this.STORAGE_PATH,
                JSON.stringify(data, null, 2)
            );
        } catch (error) {
            console.error("Failed to save watchlist:", error);
        }
    }

    static async loadData(): Promise<any> {
        try {
            const fileContents = await fs.readFile(this.STORAGE_PATH, "utf-8");
            return JSON.parse(fileContents);
        } catch (error) {
            // If file doesn't exist, return empty structure
            return { watchlist: [], webhooks: [] };
        }
    }
}

// Webhook Notification Service
class WebhookNotificationService {
    static async sendNotification(entry: WatchlistEntry, opportunityData: any) {
        const notifications = [];

        // Email Notification (Placeholder - would integrate with email service)
        if (entry.notificationPreferences?.email) {
            notifications.push(
                this.sendEmailNotification(entry, opportunityData)
            );
        }

        // Telegram Notification (Placeholder - would use Telegram Bot API)
        if (entry.notificationPreferences?.telegramId) {
            notifications.push(
                this.sendTelegramNotification(entry, opportunityData)
            );
        }

        // Discord Webhook
        if (entry.notificationPreferences?.discordWebhook) {
            notifications.push(
                this.sendDiscordNotification(entry, opportunityData)
            );
        }

        // Direct Webhook URL
        if (entry.webhookUrl) {
            notifications.push(this.sendGenericWebhook(entry, opportunityData));
        }

        await Promise.allSettled(notifications);
    }

    private static async sendEmailNotification(
        entry: WatchlistEntry,
        data: any
    ) {
        // Placeholder for email service integration
        console.log(
            `Email notification to ${entry.notificationPreferences?.email}`
        );
    }

    private static async sendTelegramNotification(
        entry: WatchlistEntry,
        data: any
    ) {
        // Placeholder for Telegram Bot API
        console.log(
            `Telegram notification to ${entry.notificationPreferences?.telegramId}`
        );
    }

    private static async sendDiscordNotification(
        entry: WatchlistEntry,
        data: any
    ) {
        try {
            const response = await fetch(
                entry.notificationPreferences!.discordWebhook!,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        content: `Thin Floor Opportunity for ${data.address}:
                    Lowest Price: ${data.lowestPrice} ETH
                    Thinness: ${data.floorThinnessPercentage.toFixed(2)}%`,
                    }),
                }
            );
        } catch (error) {
            console.error("Discord webhook failed:", error);
        }
    }

    private static async sendGenericWebhook(entry: WatchlistEntry, data: any) {
        try {
            const response = await fetch(entry.webhookUrl!, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
        } catch (error) {
            console.error("Generic webhook failed:", error);
        }
    }
}

// Advanced Filtering Utility
class WatchlistFilter {
    private static VALID_CATEGORIES = [
        "Gen Art",
        "Photography",
        "AI Inspired",
        "Memetics",
        "Iconic Gems",
    ];

    // Complex filter method with multiple comparison strategies
    static filter(
        entries: WatchlistEntry[],
        criteria: Partial<WatchlistEntry> & {
            priceRange?: { min?: number; max?: number };
            thinnessRange?: { min?: number; max?: number };
            searchText?: string;
            sortBy?: keyof WatchlistEntry;
            sortOrder?: "asc" | "desc";
        }
    ): WatchlistEntry[] {
        let filteredEntries = [...entries];

        // Normalize and validate category
        if (criteria.category) {
            const normalizedCategory = this.normalizeCategory(
                criteria.category
            );
            if (normalizedCategory) {
                criteria.category = normalizedCategory;
            } else {
                // If category is invalid, return empty array
                return [];
            }
        }

        // Text search across multiple fields
        if (criteria.searchText) {
            const searchTerm = criteria.searchText.toLowerCase();
            filteredEntries = filteredEntries.filter(
                (entry) =>
                    entry.address.toLowerCase().includes(searchTerm) ||
                    entry.name?.toLowerCase().includes(searchTerm) ||
                    entry.creator?.toLowerCase().includes(searchTerm) ||
                    entry.category?.toLowerCase().includes(searchTerm)
            );
        }

        // Basic field matching
        Object.entries(criteria).forEach(([key, value]) => {
            if (
                [
                    "priceRange",
                    "thinnessRange",
                    "searchText",
                    "sortBy",
                    "sortOrder",
                ].includes(key)
            )
                return;

            filteredEntries = filteredEntries.filter(
                (entry) => entry[key as keyof WatchlistEntry] === value
            );
        });

        // Price Range Filter
        if (criteria.priceRange) {
            filteredEntries = filteredEntries.filter((entry) => {
                const floorPrice = entry.minFloorPrice;
                return (
                    (criteria.priceRange?.min === undefined ||
                        floorPrice === undefined ||
                        floorPrice >= criteria.priceRange.min) &&
                    (criteria.priceRange?.max === undefined ||
                        floorPrice === undefined ||
                        floorPrice <= criteria.priceRange.max)
                );
            });
        }

        // Thinness Range Filter
        if (criteria.thinnessRange) {
            filteredEntries = filteredEntries.filter((entry) => {
                const thinness = entry.maxThinnessThreshold;
                return (
                    (criteria.thinnessRange?.min === undefined ||
                        thinness === undefined ||
                        thinness >= criteria.thinnessRange.min) &&
                    (criteria.thinnessRange?.max === undefined ||
                        thinness === undefined ||
                        thinness <= criteria.thinnessRange.max)
                );
            });
        }

        // Sorting
        if (criteria.sortBy) {
            filteredEntries.sort((a, b) => {
                const aValue = a[criteria.sortBy!];
                const bValue = b[criteria.sortBy!];

                if (aValue === undefined) return 1;
                if (bValue === undefined) return -1;

                return criteria.sortOrder === "desc"
                    ? bValue > aValue
                        ? 1
                        : -1
                    : aValue > bValue
                      ? 1
                      : -1;
            });
        }

        return filteredEntries;
    }

    // Helper method to normalize category
    static normalizeCategory(category: string): string | null {
        const normalizedInput = category.toLowerCase().trim();
        const matchedCategory = this.VALID_CATEGORIES.find(
            (validCat) => validCat.toLowerCase() === normalizedInput
        );
        return matchedCategory || null;
    }

    // Predefined filter methods for common use cases
    static filterByCategory(entries: WatchlistEntry[], category: string) {
        const normalizedCategory = this.normalizeCategory(category);
        return normalizedCategory
            ? this.filter(entries, { category: normalizedCategory })
            : [];
    }

    static filterByPriceRange(
        entries: WatchlistEntry[],
        min?: number,
        max?: number
    ) {
        return this.filter(entries, { priceRange: { min, max } });
    }

    static filterByThinnessRange(
        entries: WatchlistEntry[],
        min?: number,
        max?: number
    ) {
        return this.filter(entries, { thinnessRange: { min, max } });
    }
}

// Enhanced NFT Watchlist with Persistent Storage
class NFTWatchlist {
    private static instance: NFTWatchlist;
    private watchlist: WatchlistEntry[] = [];

    private constructor() {
        this.loadWatchlist();
    }

    public static getInstance(): NFTWatchlist {
        if (!NFTWatchlist.instance) {
            NFTWatchlist.instance = new NFTWatchlist();
        }
        return NFTWatchlist.instance;
    }

    private async loadWatchlist() {
        try {
            const data = await PersistentStorageManager.loadData();
            this.watchlist = data.watchlist.map((entry) =>
                WatchlistEntrySchema.parse(entry)
            );
        } catch (error) {
            console.error("Failed to load watchlist:", error);
        }
    }

    public async addToWatchlist(entry: WatchlistEntry): Promise<boolean> {
        try {
            const validatedEntry = WatchlistEntrySchema.parse(entry);

            const exists = this.watchlist.some(
                (item) =>
                    item.address.toLowerCase() ===
                    validatedEntry.address.toLowerCase()
            );

            if (!exists) {
                this.watchlist.push(validatedEntry);
                await this.saveWatchlist();
                return true;
            }
            return false;
        } catch (error) {
            console.error("Invalid watchlist entry:", error);
            return false;
        }
    }

    public async removeFromWatchlist(address: string): Promise<boolean> {
        const initialLength = this.watchlist.length;
        this.watchlist = this.watchlist.filter(
            (item) => item.address.toLowerCase() !== address.toLowerCase()
        );

        if (initialLength !== this.watchlist.length) {
            await this.saveWatchlist();
            return true;
        }
        return false;
    }

    private async saveWatchlist() {
        await PersistentStorageManager.saveData({
            watchlist: this.watchlist,
        });
    }

    public getWatchlist(
        filters?: Parameters<typeof WatchlistFilter.filter>[1]
    ): WatchlistEntry[] {
        if (!filters) return [...this.watchlist];

        return WatchlistFilter.filter(this.watchlist, filters);
    }

    // New method to get filter suggestions
    public getFilterSuggestions(): {
        categories: string[];
        creators: string[];
        priceRanges: { min: number; max: number };
        thinnessRanges: { min: number; max: number };
    } {
        return {
            categories: [
                ...new Set(
                    this.watchlist
                        .map((entry) => entry.category)
                        .filter(Boolean)
                ),
            ],
            creators: [
                ...new Set(
                    this.watchlist.map((entry) => entry.creator).filter(Boolean)
                ),
            ],
            priceRanges: {
                min: Math.min(
                    ...this.watchlist
                        .map((entry) => entry.minFloorPrice || Infinity)
                        .filter(Boolean)
                ),
                max: Math.max(
                    ...this.watchlist
                        .map((entry) => entry.maxFloorPrice || -Infinity)
                        .filter(Boolean)
                ),
            },
            thinnessRanges: {
                min: Math.min(
                    ...this.watchlist
                        .map((entry) => entry.maxThinnessThreshold || Infinity)
                        .filter(Boolean)
                ),
                max: Math.max(
                    ...this.watchlist
                        .map((entry) => entry.maxThinnessThreshold || -Infinity)
                        .filter(Boolean)
                ),
            },
        };
    }
}

export const getCollectionsAction = (
    nftCollectionProvider: Provider
): Action => {
    return {
        name: "GET_NFT_COLLECTIONS",
        similes: ["LIST_NFT_COLLECTIONS", "SHOW_NFT_COLLECTIONS"],
        description:
            "Fetches information about curated NFT collections on Ethereum",
        validate: async (runtime: IAgentRuntime, message: Memory) => {
            return message.content.text
                .toLowerCase()
                .includes("nft collections");
        },
        handler: async (
            runtime: IAgentRuntime,
            message: Memory,
            state: State,
            options: any,
            callback: HandlerCallback
        ) => {
            try {
                const response = await nftCollectionProvider.get(
                    runtime,
                    message
                );
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
                console.error("Error fetching NFT collections:", error);
                await runtime.messageManager.createMemory({
                    id: message.id,
                    content: { text: "Failed to fetch NFT collection data." },
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
                        text: "Can you tell me about the top NFT collections?",
                    },
                },
                {
                    user: "{{user2}}",
                    content: {
                        text: "Certainly! Here are the top NFT collections on Ethereum:",
                        action: "GET_NFT_COLLECTIONS",
                    },
                },
            ],
            [
                {
                    user: "{{user1}}",
                    content: {
                        text: "Can you show me a list of NFT collections?",
                    },
                },
                {
                    user: "{{user2}}",
                    content: {
                        text: "Sure! Here are some curated NFT collections on Ethereum:",
                        action: "GET_NFT_COLLECTIONS",
                    },
                },
            ],
            [
                {
                    user: "{{user1}}",
                    content: {
                        text: "Do you know the best NFT collections?",
                    },
                },
                {
                    user: "{{user2}}",
                    content: {
                        text: "Absolutely! Here's a list of top NFT collections on Ethereum:",
                        action: "GET_NFT_COLLECTIONS",
                    },
                },
            ],
            [
                {
                    user: "{{user1}}",
                    content: {
                        text: "Can you fetch Ethereum NFT collections for me?",
                    },
                },
                {
                    user: "{{user2}}",
                    content: {
                        text: "Of course! Fetching NFT collections on Ethereum:",
                        action: "GET_NFT_COLLECTIONS",
                    },
                },
            ],
            [
                {
                    user: "{{user1}}",
                    content: {
                        text: "I'm curious about NFTs. What are some collections I should look into?",
                    },
                },
                {
                    user: "{{user2}}",
                    content: {
                        text: "Here are some NFT collections you might find interesting:",
                        action: "GET_NFT_COLLECTIONS",
                    },
                },
            ],
            [
                {
                    user: "{{user1}}",
                    content: {
                        text: "Tell me about the trending Ethereum NFT collections.",
                    },
                },
                {
                    user: "{{user2}}",
                    content: {
                        text: "Here's information on trending Ethereum NFT collections:",
                        action: "GET_NFT_COLLECTIONS",
                    },
                },
            ],
            [
                {
                    user: "{{user1}}",
                    content: {
                        text: "What are some cool NFT collections right now?",
                    },
                },
                {
                    user: "{{user2}}",
                    content: {
                        text: "Let me show you some popular NFT collections:",
                        action: "GET_NFT_COLLECTIONS",
                    },
                },
            ],
        ],
    };
};

export const manageWatchlistAction = (reservoirService: any): Action => {
    const watchlist = NFTWatchlist.getInstance();

    return {
        name: "MANAGE_NFT_WATCHLIST",
        similes: [
            "ADD_NFT_COLLECTION",
            "REMOVE_NFT_COLLECTION",
            "NFT_WATCHLIST",
        ],
        description:
            "Manage a watchlist of NFT collections for thin floor opportunities",
        validate: async (runtime: IAgentRuntime, message: Memory) => {
            const lowercaseText = message.content.text.toLowerCase();
            return ["watchlist", "add collection", "remove collection"].some(
                (term) => lowercaseText.includes(term)
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
                const text = message.content.text.toLowerCase();

                // Advanced filtering command
                if (text.includes("filter watchlist")) {
                    const filters: Parameters<
                        typeof WatchlistFilter.filter
                    >[1] = {};

                    // Parse category filter
                    const categoryMatch = text.match(/category:\s*(\w+)/i);
                    if (categoryMatch) {
                        const category = categoryMatch[1].replace(/\s+/g, " ");
                        const validCategories = [
                            "Gen Art",
                            "Photography",
                            "AI Inspired",
                            "Memetics",
                            "Iconic Gems",
                        ];
                        const matchedCategory = validCategories.find(
                            (validCat) =>
                                validCat.toLowerCase() ===
                                category.toLowerCase()
                        );

                        if (matchedCategory) {
                            filters.category = matchedCategory;
                        }
                    }

                    // Parse price range filter
                    const priceRangeMatch = text.match(/price:\s*(\d+)-(\d+)/);
                    if (priceRangeMatch) {
                        filters.priceRange = {
                            min: parseFloat(priceRangeMatch[1]),
                            max: parseFloat(priceRangeMatch[2]),
                        };
                    }

                    // Parse thinness range filter
                    const thinnessRangeMatch = text.match(
                        /thinness:\s*(\d+)-(\d+)/
                    );
                    if (thinnessRangeMatch) {
                        filters.thinnessRange = {
                            min: parseFloat(thinnessRangeMatch[1]),
                            max: parseFloat(thinnessRangeMatch[2]),
                        };
                    }

                    // Parse sorting
                    const sortMatch = text.match(
                        /sort by:\s*(\w+)\s*(asc|desc)?/i
                    );
                    if (sortMatch) {
                        filters.sortBy = sortMatch[1] as keyof WatchlistEntry;
                        filters.sortOrder = (
                            sortMatch[2] || "asc"
                        ).toLowerCase() as "asc" | "desc";
                    }

                    // Perform filtering
                    const filteredEntries = watchlist.getWatchlist(filters);

                    callback({
                        text:
                            filteredEntries.length > 0
                                ? "Filtered Watchlist:\n" +
                                  filteredEntries
                                      .map(
                                          (entry) =>
                                              `${entry.address} (Category: ${entry.category || "N/A"}, ` +
                                              `Thinness: ${entry.maxThinnessThreshold}%)`
                                      )
                                      .join("\n")
                                : "No entries match the filter criteria.",
                    });
                    return true;
                }

                // Get filter suggestions
                if (text.includes("filter suggestions")) {
                    const suggestions = watchlist.getFilterSuggestions();

                    callback({
                        text: `Filter Suggestions:
Categories: ${suggestions.categories.join(", ")}
Creators: ${suggestions.creators.join(", ")}
Price Range: ${suggestions.priceRanges.min} - ${suggestions.priceRanges.max} ETH
Thinness Range: ${suggestions.thinnessRanges.min}% - ${suggestions.thinnessRanges.max}%`,
                    });
                    return true;
                }

                if (text.includes("add collection")) {
                    const addressMatch = text.match(/0x[a-fA-F0-9]{40}/);
                    if (!addressMatch) {
                        callback({
                            text: "Please provide a valid Ethereum contract address.",
                        });
                        return false;
                    }

                    const address = addressMatch[0];
                    const thinnessMatch = text.match(/(\d+)%/);
                    const thinnessThreshold = thinnessMatch
                        ? parseFloat(thinnessMatch[1])
                        : 15;

                    // Optional: Extract webhook URL
                    const webhookMatch = text.match(/(https?:\/\/\S+)/);
                    const webhookUrl = webhookMatch
                        ? webhookMatch[1]
                        : undefined;

                    const entry: WatchlistEntry = {
                        address,
                        maxThinnessThreshold: thinnessThreshold,
                        webhookUrl,
                        notificationPreferences: {
                            discordWebhook: webhookUrl,
                        },
                    };

                    const result = await watchlist.addToWatchlist(entry);

                    callback({
                        text: result
                            ? `Collection ${address} added to watchlist with ${thinnessThreshold}% thinness threshold.`
                            : "Collection already exists in watchlist.",
                    });
                    return result;
                }

                if (text.includes("remove collection")) {
                    const addressMatch = text.match(/0x[a-fA-F0-9]{40}/);
                    if (!addressMatch) {
                        callback({
                            text: "Please provide a valid Ethereum contract address to remove.",
                        });
                        return false;
                    }

                    const address = addressMatch[0];
                    const result = await watchlist.removeFromWatchlist(address);

                    callback({
                        text: result
                            ? `Collection ${address} removed from watchlist.`
                            : "Collection not found in watchlist.",
                    });
                    return result;
                }

                if (text.includes("show watchlist")) {
                    const currentWatchlist = watchlist.getWatchlist();
                    callback({
                        text:
                            currentWatchlist.length > 0
                                ? "Current Watchlist:\n" +
                                  currentWatchlist
                                      .map(
                                          (entry) =>
                                              `${entry.address} (Thinness: ${entry.maxThinnessThreshold}%)`
                                      )
                                      .join("\n")
                                : "Watchlist is empty.",
                    });
                    return true;
                }

                callback({ text: "Invalid watchlist command." });
                return false;
            } catch (error) {
                console.error("Watchlist management error:", error);
                callback({ text: "Error managing watchlist." });
                return false;
            }
        },
        examples: [
            [
                {
                    user: "{{user1}}",
                    content: { text: "Add collection 0x1234... to watchlist" },
                },
                {
                    user: "{{user2}}",
                    content: { text: "Collection added successfully." },
                },
            ],
            [
                {
                    user: "{{user1}}",
                    content: {
                        text: "Remove collection 0x1234... from watchlist",
                    },
                },
                {
                    user: "{{user2}}",
                    content: { text: "Collection removed successfully." },
                },
            ],
            [
                {
                    user: "{{user1}}",
                    content: { text: "Filter watchlist by category:Gen Art" },
                },
                {
                    user: "{{user2}}",
                    content: { text: "Filtered watchlist results..." },
                },
            ],
            [
                {
                    user: "{{user1}}",
                    content: {
                        text: "Filter watchlist price:0.1-1 thinness:10-20",
                    },
                },
                {
                    user: "{{user2}}",
                    content: { text: "Filtered watchlist results..." },
                },
            ],
            [
                {
                    user: "{{user1}}",
                    content: { text: "Get filter suggestions" },
                },
                {
                    user: "{{user2}}",
                    content: { text: "Available filter options..." },
                },
            ],
        ],
    };
};

export const getThinFloorNFTsAction = (
    nftCollectionProvider: Provider,
    reservoirService: any
): Action => {
    const watchlist = NFTWatchlist.getInstance();

    // Enhanced Arbitrage Detection Logic
    const detectThinFloorOpportunities = async (
        watchlistCollections: WatchlistEntry[]
    ) => {
        const opportunities: Array<{
            collection: string;
            lowestPrice: number;
            secondLowestPrice: number;
            thinnessPercentage: number;
            potentialProfit: number;
            tokenIds: string[];
            name?: string;
            category?: string;
        }> = [];

        for (const collection of watchlistCollections) {
            try {
                // Fetch detailed listings with more context
                const listings = await reservoirService.getListings({
                    collection: collection.address,
                    sortBy: "price_asc",
                    limit: 10, // Fetch multiple listings for comprehensive analysis
                    includeTokenDetails: true,
                });

                // Sort listings by price
                const sortedListings = listings
                    .sort((a, b) => a.price - b.price)
                    .filter((listing) => listing.status === "active");

                // Detect thin floor opportunities with more sophisticated logic
                if (sortedListings.length >= 2) {
                    const [lowestListing, secondLowestListing] = sortedListings;

                    const lowestPrice = lowestListing.price;
                    const secondLowestPrice = secondLowestListing.price;

                    const priceDifference = secondLowestPrice - lowestPrice;
                    const thinnessPercentage =
                        (priceDifference / lowestPrice) * 100;
                    const potentialProfit = secondLowestPrice / lowestPrice;

                    // More flexible threshold checking
                    const thinnessThreshold =
                        collection.maxThinnessThreshold || 15;
                    const profitThreshold = collection.minProfitMargin || 2;

                    if (
                        thinnessPercentage > thinnessThreshold &&
                        potentialProfit >= profitThreshold
                    ) {
                        opportunities.push({
                            collection: collection.address,
                            lowestPrice,
                            secondLowestPrice,
                            thinnessPercentage,
                            potentialProfit,
                            tokenIds: [
                                lowestListing.tokenId,
                                secondLowestListing.tokenId,
                            ],
                            name: collection.name,
                            category: collection.category,
                        });
                    }
                }
            } catch (error) {
                console.error(
                    `Thin floor detection error for ${collection.address}:`,
                    error
                );
            }
        }

        // Sort opportunities by potential profit
        return opportunities.sort(
            (a, b) => b.potentialProfit - a.potentialProfit
        );
    };

    return {
        name: "GET_THIN_FLOOR_NFTS",
        similes: ["FIND_NFT_ARBITRAGE", "THIN_FLOOR_OPPORTUNITIES"],
        description: "Advanced thin floor NFT arbitrage detection",
        validate: async (runtime: IAgentRuntime, message: Memory) => {
            const lowercaseText = message.content.text.toLowerCase();
            return [
                "thin floor",
                "arbitrage",
                "nft opportunity",
                "watchlist",
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
                const watchlistCollections = watchlist.getWatchlist();

                if (watchlistCollections.length === 0) {
                    callback({
                        text: "Watchlist is empty. Add collections first.",
                    });
                    return false;
                }

                // Detect opportunities
                const opportunities =
                    await detectThinFloorOpportunities(watchlistCollections);

                // Enhanced notification and logging
                if (opportunities.length > 0) {
                    // Prepare detailed opportunity report
                    const opportunityReports = opportunities
                        .map(
                            (opp) => `
🔥 Arbitrage Opportunity 🔥
${opp.name ? `Collection: ${opp.name} (${opp.collection})` : `Collection: ${opp.collection}`}
${opp.category ? `Category: ${opp.category}` : ""}
Lowest Price: ${opp.lowestPrice.toFixed(3)} ETH
Second Lowest: ${opp.secondLowestPrice.toFixed(3)} ETH
Thinness: ${opp.thinnessPercentage.toFixed(2)}%
Potential Profit: ${((opp.potentialProfit - 1) * 100).toFixed(2)}%
Token IDs: ${opp.tokenIds.join(", ")}
                    `
                        )
                        .join("\n\n");

                    // Send notifications to each collection's configured channels
                    await Promise.all(
                        opportunities.map(async (opportunity) => {
                            const collectionEntry = watchlistCollections.find(
                                (entry) =>
                                    entry.address === opportunity.collection
                            );

                            if (collectionEntry) {
                                await WebhookNotificationService.sendNotification(
                                    collectionEntry,
                                    opportunity
                                );
                            }
                        })
                    );

                    // Callback with opportunities
                    callback({
                        text: `Thin Floor Arbitrage Opportunities Detected:\n${opportunityReports}`,
                    });

                    return true;
                } else {
                    callback({
                        text: "No significant thin floor opportunities found in watchlist.",
                    });
                    return false;
                }
            } catch (error) {
                console.error("Error finding thin floor NFTs:", error);
                callback({
                    text: "Failed to find thin floor NFT opportunities.",
                });
                return false;
            }
        },
        examples: [
            [
                {
                    user: "{{user1}}",
                    content: { text: "Find NFT arbitrage opportunities" },
                },
                {
                    user: "{{user2}}",
                    content: {
                        text: "Here are the top thin floor NFT opportunities...",
                    },
                },
            ],
        ],
    };
};
