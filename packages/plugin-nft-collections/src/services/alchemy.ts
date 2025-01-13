export class AlchemyService {
    private baseUrl = "https://eth-mainnet.g.alchemy.com/v2/";
    private apiKey: string;

    constructor(apiKey?: string) {
        this.apiKey = apiKey || process.env.ALCHEMY_API_KEY || "";
        if (!this.apiKey) {
            throw new Error("Alchemy API key is required");
        }
    }

    private async fetchAlchemyAPI<T>(
        method: string,
        params: any = {}
    ): Promise<T> {
        const response = await fetch(`${this.baseUrl}${this.apiKey}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                jsonrpc: "2.0",
                id: 1,
                method,
                params: [params],
            }),
        });

        if (!response.ok) {
            throw new Error(`Alchemy API error: ${response.statusText}`);
        }

        const data = await response.json();
        return data.result;
    }

    async getNFTOwnershipData(
        contractAddress: string,
        options: {
            tokenId?: string;
            owner?: string;
            includeMetadata?: boolean;
        } = {}
    ) {
        try {
            const params = {
                contractAddress,
                tokenId: options.tokenId,
                owner: options.owner,
                withMetadata: options.includeMetadata,
            };

            const ownersData = await this.fetchAlchemyAPI<{
                owners: Array<{
                    ownerAddress: string;
                    tokenBalances: Array<{ tokenId: string }>;
                }>;
                totalSupply?: number;
                metadata?: any;
            }>("alchemy_getOwnersForContract", params);

            return {
                owners: ownersData.owners.map((owner) => ({
                    address: owner.ownerAddress,
                    tokenIds: owner.tokenBalances.map((tb) => tb.tokenId),
                    balance: owner.tokenBalances.length,
                })),
                metadata: ownersData.metadata,
            };
        } catch (error) {
            console.error("Error fetching NFT ownership data:", error);
            return { owners: [] };
        }
    }

    async getTokenMetadata(contractAddress: string, tokenId: string) {
        try {
            return await this.fetchAlchemyAPI("alchemy_getNFTMetadata", {
                contractAddress,
                tokenId,
            });
        } catch (error) {
            console.error("Error fetching token metadata:", error);
            return {};
        }
    }

    async getNFTTransferHistory(
        contractAddress: string,
        options: {
            tokenId?: string;
            fromBlock?: number;
            toBlock?: number;
            limit?: number;
        } = {}
    ) {
        try {
            const transfers = await this.fetchAlchemyAPI<any[]>(
                "alchemy_getNFTSales",
                {
                    contractAddress,
                    tokenId: options.tokenId,
                    fromBlock: options.fromBlock,
                    toBlock: options.toBlock,
                    limit: options.limit || 100,
                }
            );

            return transfers.map((sale: any) => ({
                from: sale.sellerAddress,
                to: sale.buyerAddress,
                tokenId: sale.tokenId,
                blockNumber: sale.blockNumber,
                timestamp: new Date(sale.timestamp).toISOString(),
                transactionHash: sale.transactionHash,
                price: sale.price,
                marketplace: sale.marketplace,
            }));
        } catch (error) {
            console.error("Error fetching NFT transfer history:", error);
            return [];
        }
    }

    async getCollectionInsights(contractAddress: string) {
        try {
            const [owners, attributes] = await Promise.all([
                this.fetchAlchemyAPI<{
                    owners: Array<{
                        ownerAddress: string;
                        tokenBalances: Array<any>;
                    }>;
                    totalSupply: number;
                }>("alchemy_getOwnersForContract", { contractAddress }),
                this.fetchAlchemyAPI<{
                    attributeDistribution: Record<
                        string,
                        {
                            count: number;
                            percentage: number;
                        }
                    >;
                }>("alchemy_getNFTAttributeSummary", { contractAddress }),
            ]);

            const sortedOwners = owners.owners
                .map((owner) => ({
                    address: owner.ownerAddress,
                    tokenCount: owner.tokenBalances.length,
                    percentage:
                        (owner.tokenBalances.length / owners.totalSupply) * 100,
                }))
                .sort((a, b) => b.tokenCount - a.tokenCount)
                .slice(0, 10);

            return {
                totalUniqueOwners: owners.owners.length,
                holdingDistribution: [
                    {
                        ownerType: "individual",
                        percentage: 100,
                        count: owners.owners.length,
                    },
                ],
                topHolders: sortedOwners,
                tokenTypeBreakdown: Object.entries(
                    attributes.attributeDistribution || {}
                ).map(([type, data]) => ({
                    type,
                    count: data.count,
                    percentage: data.percentage,
                })),
            };
        } catch (error) {
            console.error("Error fetching collection insights:", error);
            return {
                totalUniqueOwners: 0,
                holdingDistribution: [],
                topHolders: [],
                tokenTypeBreakdown: [],
            };
        }
    }

    async getNFTMarketAnalytics(
        contractAddress: string,
        options: { timeframe?: "7d" | "30d" | "90d" } = {}
    ) {
        try {
            const [floorPrice, sales] = await Promise.all([
                this.fetchAlchemyAPI<{
                    openSea?: { floorPrice: number };
                }>("alchemy_getFloorPrice", { contractAddress }),
                this.fetchAlchemyAPI<Array<{ price: number }>>(
                    "alchemy_getNFTSales",
                    {
                        contractAddress,
                        timeframe: options.timeframe || "30d",
                    }
                ),
            ]);

            const prices = sales.map((sale) => sale.price);

            return {
                floorPrice: floorPrice.openSea?.floorPrice || 0,
                volumeTraded: sales.reduce((sum, sale) => sum + sale.price, 0),
                averageSalePrice: prices.length
                    ? prices.reduce((sum, price) => sum + price, 0) /
                      prices.length
                    : 0,
                salesCount: sales.length,
                priceRange: {
                    min: prices.length ? Math.min(...prices) : 0,
                    max: prices.length ? Math.max(...prices) : 0,
                    median: prices.length
                        ? prices.sort((a, b) => a - b)[
                              Math.floor(prices.length / 2)
                          ]
                        : 0,
                },
                marketTrends: [], // Alchemy doesn't provide direct market trends
            };
        } catch (error) {
            console.error("Error fetching NFT market analytics:", error);
            return {
                floorPrice: 0,
                volumeTraded: 0,
                averageSalePrice: 0,
                salesCount: 0,
                priceRange: { min: 0, max: 0, median: 0 },
                marketTrends: [],
            };
        }
    }

    async getTokenRarityScore(contractAddress: string, tokenId: string) {
        try {
            const [metadata, attributeSummary] = await Promise.all([
                this.fetchAlchemyAPI<{
                    attributes?: Array<{
                        trait_type: string;
                        value: string;
                    }>;
                }>("alchemy_getNFTMetadata", {
                    contractAddress,
                    tokenId,
                }),
                this.fetchAlchemyAPI<{
                    attributeDistribution: Record<
                        string,
                        {
                            percentage: number;
                        }
                    >;
                }>("alchemy_getNFTAttributeSummary", { contractAddress }),
            ]);

            const traitBreakdown = (metadata.attributes || []).map((attr) => {
                const attrSummary =
                    attributeSummary.attributeDistribution?.[attr.trait_type];
                const rarityScore = attrSummary
                    ? (1 / attrSummary.percentage) * 100
                    : 0;

                return {
                    trait: attr.trait_type,
                    value: attr.value,
                    rarityScore,
                };
            });

            const rarityScore = traitBreakdown.reduce(
                (sum, trait) => sum + trait.rarityScore,
                0
            );

            return {
                rarityScore,
                rarityRank: 0, // Alchemy doesn't provide direct rarity ranking
                traitBreakdown,
            };
        } catch (error) {
            console.error("Error fetching token rarity score:", error);
            return {
                rarityScore: 0,
                rarityRank: 0,
                traitBreakdown: [],
            };
        }
    }

    async searchCollections(query: string, options: { limit?: number } = {}) {
        try {
            const contracts = await this.fetchAlchemyAPI<
                Array<{
                    name: string;
                    address: string;
                    description: string;
                }>
            >("alchemy_searchContractMetadata", {
                query,
                limit: options.limit || 10,
            });

            return contracts.map((contract) => ({
                collection: {
                    name: contract.name,
                    address: contract.address,
                    description: contract.description,
                },
            }));
        } catch (error) {
            console.error("Error searching Alchemy collections:", error);
            return [];
        }
    }
}

// Optional: Create a singleton instance
export const alchemyService = new AlchemyService(process.env.ALCHEMY_API_KEY);
