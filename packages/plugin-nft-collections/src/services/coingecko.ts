import { z } from "zod";

export const CoinGeckoNFTDataSchema = z.object({
    id: z.string(),
    contract_address: z.string(),
    name: z.string(),
    asset_platform_id: z.string(),
    symbol: z.string(),

    // Market Metrics
    market_cap_usd: z.number().optional(),
    volume_24h_usd: z.number().optional(),
    floor_price_usd: z.number().optional(),
    floor_price_eth: z.number().optional(),

    // Supply Metrics
    total_supply: z.number().optional(),
    max_supply: z.number().optional(),
    circulating_supply: z.number().optional(),

    // Price Metrics
    current_price_usd: z.number().optional(),
    current_price_eth: z.number().optional(),
    price_change_percentage_24h: z.number().optional(),

    // Ownership Metrics
    number_of_unique_addresses: z.number().optional(),
    number_of_unique_currencies: z.number().optional(),

    // Collection Specific
    description: z.string().optional(),
    homepage: z.string().optional(),
    blockchain: z.string().optional(),

    // Historical Performance
    all_time_high: z
        .object({
            price_usd: z.number().optional(),
            timestamp: z.string().optional(),
        })
        .optional(),

    // Rarity and Trading
    total_volume: z.number().optional(),
    total_trades: z.number().optional(),
    average_trade_price: z.number().optional(),

    // Social Metrics
    twitter_followers: z.number().optional(),
    discord_members: z.number().optional(),
});

export type CoinGeckoNFTData = z.infer<typeof CoinGeckoNFTDataSchema>;

export class CoinGeckoService {
    private baseUrl = "https://api.coingecko.com/api/v3";
    private apiKey?: string;
    private rateLimitDelay = 1000; // 1 second between requests

    constructor(apiKey?: string) {
        this.apiKey = apiKey;
    }

    private async delay(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    private async fetch<T>(
        endpoint: string,
        params: Record<string, any> = {},
        options: {
            retries?: number;
            backoff?: number;
        } = { retries: 3, backoff: 1000 }
    ): Promise<T> {
        await this.delay(this.rateLimitDelay);

        if (this.apiKey) {
            params.x_cg_pro_api_key = this.apiKey;
        }

        const queryString = new URLSearchParams(params).toString();
        const url = `${this.baseUrl}${endpoint}${queryString ? `?${queryString}` : ""}`;

        for (let attempt = 1; attempt <= (options.retries || 3); attempt++) {
            try {
                const response = await fetch(url, {
                    headers: {
                        accept: "application/json",
                    },
                });

                if (!response.ok) {
                    throw new Error(
                        `CoinGecko API error: ${response.statusText}`
                    );
                }

                return await response.json();
            } catch (error) {
                if (attempt === (options.retries || 3)) {
                    console.error(
                        `Failed to fetch after ${attempt} attempts:`,
                        error
                    );
                    throw error;
                }
                await this.delay(options.backoff || 1000 * attempt);
            }
        }

        throw new Error("Unexpected fetch failure");
    }

    async getNFTMarketData(
        contractAddress: string,
        options: {
            includeDescription?: boolean;
            includeHistoricalData?: boolean;
        } = {}
    ): Promise<CoinGeckoNFTData | null> {
        try {
            // First, list NFTs to find the specific collection
            const collections = await this.fetch<CoinGeckoNFTData[]>(
                "/nfts/list",
                {
                    asset_platform: "ethereum",
                }
            );

            const nft = collections.find(
                (n) =>
                    n.contract_address.toLowerCase() ===
                    contractAddress.toLowerCase()
            );

            if (!nft) return null;

            // Fetch detailed data
            const details = await this.fetch<CoinGeckoNFTData>(
                `/nfts/${nft.id}`
            );

            // Optionally fetch additional details
            if (options.includeDescription) {
                const additionalInfo = await this.fetch<any>(
                    `/nfts/${nft.id}/info`
                );
                details.description = additionalInfo.description;
                details.homepage = additionalInfo.homepage;
            }

            // Optionally fetch historical data
            if (options.includeHistoricalData) {
                const historicalData = await this.fetch<any>(
                    `/nfts/${nft.id}/historical`
                );
                details.all_time_high = {
                    price_usd: historicalData.all_time_high?.price,
                    timestamp: historicalData.all_time_high?.timestamp,
                };
            }

            return details;
        } catch (error) {
            console.error("Error fetching CoinGecko NFT data:", error);
            return null;
        }
    }

    async getCollectionTrends(
        options: {
            timeframe?: "24h" | "7d" | "30d";
            sortBy?: "market_cap" | "volume" | "sales";
        } = {}
    ): Promise<CoinGeckoNFTData[]> {
        const params = {
            order:
                options.sortBy === "market_cap"
                    ? "market_cap_usd_desc"
                    : options.sortBy === "volume"
                      ? "volume_24h_usd_desc"
                      : "market_cap_usd_desc",
            per_page: "50",
            page: "1",
            timeframe: options.timeframe || "24h",
        };

        const trendingCollections = await this.fetch<CoinGeckoNFTData[]>(
            "/nfts/list",
            params
        );
        return trendingCollections;
    }

    async getGlobalNFTStats(): Promise<{
        total_market_cap_usd: number;
        total_volume_24h_usd: number;
        market_cap_change_24h: number;
        volume_change_24h: number;
        number_of_unique_currencies: number;
        number_of_unique_addresses: number;
        top_collections: CoinGeckoNFTData[];
    }> {
        const data = await this.fetch<any>("/global/nft");

        // Fetch top collections to enrich global stats
        const topCollections = await this.getCollectionTrends();

        return {
            ...data.data,
            top_collections: topCollections,
        };
    }
}
