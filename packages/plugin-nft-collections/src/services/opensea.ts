import { z } from "zod";

export const OpenSeaNFTDataSchema = z.object({
    collection: z.object({
        name: z.string(),
        description: z.string().optional(),
        slug: z.string(),
        stats: z
            .object({
                floor_price: z.number().optional(),
                total_volume: z.number().optional(),
                total_sales: z.number().optional(),
                average_price: z.number().optional(),
                num_owners: z.number().optional(),
                market_cap: z.number().optional(),
                total_supply: z.number().optional(),
                one_day_volume: z.number().optional(),
                seven_day_volume: z.number().optional(),
                thirty_day_volume: z.number().optional(),
                percent_change_volume_7d: z.number().optional(),
                total_listed_items: z.number().optional(),
                total_unsold_items: z.number().optional(),
            })
            .optional(),
        primary_asset_contracts: z
            .array(
                z.object({
                    address: z.string(),
                    schema_name: z.string(),
                    symbol: z.string().optional(),
                    description: z.string().optional(),
                })
            )
            .optional(),
        royalty_fees: z
            .object({
                seller_fee_basis_points: z.number().optional(),
                opensea_fee_basis_points: z.number().optional(),
                total_fee_basis_points: z.number().optional(),
            })
            .optional(),
        social_links: z
            .object({
                twitter: z.string().optional(),
                discord: z.string().optional(),
                website: z.string().optional(),
                instagram: z.string().optional(),
                medium: z.string().optional(),
            })
            .optional(),
        created_date: z.string().optional(),
        is_verified: z.boolean().optional(),
        is_disabled: z.boolean().optional(),
        is_nsfw: z.boolean().optional(),
    }),
    traits: z
        .array(
            z.object({
                trait_type: z.string(),
                value: z.string(),
                count: z.number(),
                percentage: z.number().optional(),
                rarity_score: z.number().optional(),
            })
        )
        .optional(),
    rarity: z
        .object({
            total_supply: z.number().optional(),
            unique_owners_count: z.number().optional(),
            rarest_trait_percentage: z.number().optional(),
            most_common_trait: z
                .object({
                    type: z.string().optional(),
                    value: z.string().optional(),
                    percentage: z.number().optional(),
                })
                .optional(),
        })
        .optional(),
    performance_metrics: z
        .object({
            price_volatility: z.number().optional(),
            liquidity_score: z.number().optional(),
            trading_frequency: z.number().optional(),
            average_hold_time: z.number().optional(),
        })
        .optional(),
});

export type OpenSeaNFTData = z.infer<typeof OpenSeaNFTDataSchema>;

export class OpenSeaService {
    private baseUrl = "https://api.opensea.io/api/v2/";
    private apiKey?: string;

    constructor(apiKey?: string) {
        this.apiKey = apiKey;
    }

    private async fetch<T>(
        endpoint: string,
        params: Record<string, any> = {},
        method: "GET" | "POST" = "GET"
    ): Promise<T> {
        const headers: Record<string, string> = {
            accept: "application/json",
            "x-api-key": this.apiKey || "",
        };

        const queryString = new URLSearchParams(params).toString();
        const url = `${this.baseUrl}${endpoint}${queryString ? `?${queryString}` : ""}`;

        try {
            const response = await fetch(url, {
                method,
                headers,
            });

            if (!response.ok) {
                throw new Error(`OpenSea API error: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error("OpenSea API fetch error:", error);
            throw error;
        }
    }

    async getCollectionDetails(
        slug: string,
        options: {
            includeTraits?: boolean;
            includeRarity?: boolean;
            includePerformanceMetrics?: boolean;
        } = {}
    ): Promise<OpenSeaNFTData | null> {
        try {
            // Fetch collection details
            const collectionData = await this.fetch<OpenSeaNFTData>(
                `collections/${slug}`
            );

            // Optionally fetch traits
            if (options.includeTraits) {
                const traitsData = await this.getCollectionTraits(slug);
                (collectionData as any).traits = traitsData;
            }

            // Optionally fetch rarity data
            if (options.includeRarity) {
                const rarityData = await this.getCollectionRarity(slug);
                (collectionData as any).rarity = rarityData;
            }

            // Optionally fetch performance metrics
            if (options.includePerformanceMetrics) {
                const performanceData =
                    await this.getCollectionPerformanceMetrics(slug);
                (collectionData as any).performance_metrics = performanceData;
            }

            return collectionData;
        } catch (error) {
            console.error("Error fetching OpenSea collection details:", error);
            return null;
        }
    }

    async getCollectionTraits(slug: string): Promise<any[]> {
        try {
            const data = await this.fetch<{ traits: any[] }>(
                `collections/${slug}/traits`
            );
            return data.traits.map((trait) => ({
                ...trait,
                rarity_score: this.calculateTraitRarityScore(trait),
            }));
        } catch (error) {
            console.error("Error fetching OpenSea collection traits:", error);
            return [];
        }
    }

    private calculateTraitRarityScore(trait: any): number {
        // Simple rarity score calculation
        // Lower percentage means higher rarity
        return trait.count && trait.percentage
            ? (1 / trait.percentage) * 100
            : 0;
    }

    async getCollectionRarity(slug: string): Promise<{
        total_supply?: number;
        unique_owners_count?: number;
        rarest_trait_percentage?: number;
        most_common_trait?: {
            type?: string;
            value?: string;
            percentage?: number;
        };
    }> {
        try {
            const data = await this.fetch<any>(`collections/${slug}/rarity`);

            // Find most common trait
            const traits = await this.getCollectionTraits(slug);
            const mostCommonTrait = traits.reduce((max, trait) =>
                (max.percentage || 0) < (trait.percentage || 0) ? trait : max
            );

            return {
                total_supply: data.total_supply,
                unique_owners_count: data.unique_owners_count,
                rarest_trait_percentage: Math.min(
                    ...traits.map((t) => t.percentage || 0)
                ),
                most_common_trait: {
                    type: mostCommonTrait.trait_type,
                    value: mostCommonTrait.value,
                    percentage: mostCommonTrait.percentage,
                },
            };
        } catch (error) {
            console.error("Error fetching OpenSea collection rarity:", error);
            return {};
        }
    }

    async getCollectionPerformanceMetrics(slug: string): Promise<{
        price_volatility?: number;
        liquidity_score?: number;
        trading_frequency?: number;
        average_hold_time?: number;
    }> {
        try {
            // This would typically require multiple API calls or advanced analytics
            const salesHistory = await this.getCollectionSalesHistory(slug);

            // Calculate performance metrics
            const prices = salesHistory.map((sale) => sale.price);
            const holdTimes = this.calculateHoldTimes(salesHistory);

            return {
                price_volatility: this.calculatePriceVolatility(prices),
                liquidity_score: this.calculateLiquidityScore(salesHistory),
                trading_frequency: salesHistory.length,
                average_hold_time: this.calculateAverageHoldTime(holdTimes),
            };
        } catch (error) {
            console.error("Error calculating performance metrics:", error);
            return {};
        }
    }

    private calculatePriceVolatility(prices: number[]): number {
        if (prices.length < 2) return 0;

        const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
        const variance =
            prices.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) /
            prices.length;

        return Math.sqrt(variance) / mean; // Coefficient of variation
    }

    private calculateLiquidityScore(sales: any[]): number {
        // Simple liquidity score based on recent sales volume and frequency
        const recentSales = sales.filter(
            (sale) =>
                new Date(sale.timestamp) >
                new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        );

        return recentSales.length / 30; // Sales per day
    }

    private calculateHoldTimes(sales: any[]): number[] {
        // Sort sales by timestamp
        const sortedSales = sales.sort(
            (a, b) =>
                new Date(a.timestamp).getTime() -
                new Date(b.timestamp).getTime()
        );

        // Calculate hold times between sales
        return sortedSales.slice(1).map(
            (sale, index) =>
                (new Date(sale.timestamp).getTime() -
                    new Date(sortedSales[index].timestamp).getTime()) /
                (24 * 60 * 60 * 1000) // Convert to days
        );
    }

    private calculateAverageHoldTime(holdTimes: number[]): number {
        return holdTimes.length > 0
            ? holdTimes.reduce((a, b) => a + b, 0) / holdTimes.length
            : 0;
    }

    async getCollectionSalesHistory(
        slug: string,
        options: {
            limit?: number;
            timeframe?: "7d" | "30d" | "90d";
        } = {}
    ): Promise<any[]> {
        try {
            const data = await this.fetch<{ sales: any[] }>(
                `collections/${slug}/sales`,
                {
                    limit: options.limit || 100,
                    timeframe: options.timeframe || "30d",
                }
            );
            return data.sales;
        } catch (error) {
            console.error(
                "Error fetching OpenSea collection sales history:",
                error
            );
            return [];
        }
    }

    async getCollectionListings(
        slug: string,
        options: {
            limit?: number;
            sortBy?: "price_asc" | "price_desc";
        } = {}
    ): Promise<any[]> {
        try {
            const data = await this.fetch<{ listings: any[] }>(
                `collections/${slug}/listings`,
                {
                    limit: options.limit || 50,
                    sort: options.sortBy || "price_asc",
                }
            );
            return data.listings;
        } catch (error) {
            console.error("Error fetching OpenSea collection listings:", error);
            return [];
        }
    }

    async searchCollections(
        query: string,
        options: {
            limit?: number;
        } = {}
    ): Promise<OpenSeaNFTData[]> {
        try {
            const data = await this.fetch<{ collections: OpenSeaNFTData[] }>(
                "collections/search",
                {
                    query,
                    limit: options.limit || 10,
                }
            );
            return data.collections;
        } catch (error) {
            console.error("Error searching OpenSea collections:", error);
            return [];
        }
    }
}

// Optional: Create a singleton instance
export const openSeaService = new OpenSeaService(process.env.OPENSEA_API_KEY);
