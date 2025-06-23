import {
    createPublicClient,
    http,
    type Address,
    type PublicClient,
    type Hex,
    parseAbiItem,
    decodeEventLog,
    formatUnits,
    parseUnits,
    type Chain
} from 'viem';
import { mainnet, polygon, arbitrum, optimism, base } from 'viem/chains';
import { elizaLogger as logger } from '@elizaos/core';
import axios from 'axios';
import { IAgentRuntime } from '@elizaos/core';
import type { NFTHolding } from '../core/interfaces/IWalletService';

// NFT Marketplace contracts
const MARKETPLACES = {
    opensea: {
        1: { // Mainnet
            seaport: '0x00000000000000ADc04C56Bf30aC9d3c0aAF14dC',
            wyvern: '0x7f268357A8c2552623316e2562D90e642bB538E5' // Legacy
        },
        137: { // Polygon
            seaport: '0x00000000000000ADc04C56Bf30aC9d3c0aAF14dC'
        }
    },
    blur: {
        1: {
            marketplace: '0x000000000000Ad05Ccc4F10045630fb830B95127'
        }
    },
    looksrare: {
        1: {
            exchange: '0x59728544B08AB483533076417FbBB2fD0B17CE3a'
        }
    },
    x2y2: {
        1: {
            exchange: '0x74312363e45DCaBA76c59ec49a7Aa8A65a67EeD3'
        }
    }
} as const;

// Standard NFT ABIs
const ERC721_ABI = [
    {
        inputs: [{ name: 'owner', type: 'address' }],
        name: 'balanceOf',
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function'
    },
    {
        inputs: [{ name: 'tokenId', type: 'uint256' }],
        name: 'ownerOf',
        outputs: [{ name: '', type: 'address' }],
        stateMutability: 'view',
        type: 'function'
    },
    {
        inputs: [{ name: 'tokenId', type: 'uint256' }],
        name: 'tokenURI',
        outputs: [{ name: '', type: 'string' }],
        stateMutability: 'view',
        type: 'function'
    },
    {
        inputs: [],
        name: 'name',
        outputs: [{ name: '', type: 'string' }],
        stateMutability: 'view',
        type: 'function'
    },
    {
        inputs: [],
        name: 'symbol',
        outputs: [{ name: '', type: 'string' }],
        stateMutability: 'view',
        type: 'function'
    },
    {
        inputs: [
            { name: 'from', type: 'address' },
            { name: 'to', type: 'address' },
            { name: 'tokenId', type: 'uint256' }
        ],
        name: 'transferFrom',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function'
    },
    {
        inputs: [
            { name: 'to', type: 'address' },
            { name: 'tokenId', type: 'uint256' }
        ],
        name: 'safeTransferFrom',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function'
    },
    {
        inputs: [
            { name: 'operator', type: 'address' },
            { name: 'approved', type: 'bool' }
        ],
        name: 'setApprovalForAll',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function'
    }
] as const;

const ERC1155_ABI = [
    {
        inputs: [
            { name: 'account', type: 'address' },
            { name: 'id', type: 'uint256' }
        ],
        name: 'balanceOf',
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function'
    },
    {
        inputs: [
            { name: 'accounts', type: 'address[]' },
            { name: 'ids', type: 'uint256[]' }
        ],
        name: 'balanceOfBatch',
        outputs: [{ name: '', type: 'uint256[]' }],
        stateMutability: 'view',
        type: 'function'
    },
    {
        inputs: [{ name: 'id', type: 'uint256' }],
        name: 'uri',
        outputs: [{ name: '', type: 'string' }],
        stateMutability: 'view',
        type: 'function'
    }
] as const;

export interface NFTMetadata {
    name?: string;
    description?: string;
    image?: string;
    animation_url?: string;
    external_url?: string;
    attributes?: Array<{
        trait_type: string;
        value: string | number;
        display_type?: string;
    }>;
    properties?: Record<string, any>;
}

export interface NFTCollection {
    address: Address;
    name: string;
    symbol?: string;
    description?: string;
    imageUrl?: string;
    bannerUrl?: string;
    totalSupply?: number;
    floorPrice?: number;
    volume24h?: number;
    volumeTotal?: number;
    owners?: number;
    verified?: boolean;
    chainId: number;
}

export interface NFTActivity {
    type: 'sale' | 'transfer' | 'mint' | 'list' | 'bid' | 'cancel';
    transactionHash: Hex;
    blockNumber: number;
    timestamp: number;
    from: Address;
    to: Address;
    contractAddress: Address;
    tokenId: string;
    price?: number;
    currency?: Address;
    marketplace?: string;
}

export interface NFTListingParams {
    contractAddress: Address;
    tokenId: string;
    price: bigint;
    currency?: Address;
    duration?: number;
    marketplace: 'opensea' | 'blur' | 'looksrare' | 'x2y2';
}

export class NFTService {
    private publicClients: Map<number, PublicClient> = new Map();
    private alchemyApiKey?: string;
    private moralisApiKey?: string;
    private metadataCache: Map<string, { metadata: NFTMetadata; timestamp: number }> = new Map();
    private collectionCache: Map<string, { collection: NFTCollection; timestamp: number }> = new Map();
    private readonly CACHE_DURATION = 3600000; // 1 hour

    constructor() {
        // Initialize clients
        this.publicClients.set(1, createPublicClient({
            chain: mainnet,
            transport: http(process.env.ETHEREUM_RPC_URL || 'https://eth.llamarpc.com')
        }));
        this.publicClients.set(137, createPublicClient({
            chain: polygon,
            transport: http(process.env.POLYGON_RPC_URL || 'https://polygon.llamarpc.com')
        }));
        this.publicClients.set(42161, createPublicClient({
            chain: arbitrum,
            transport: http(process.env.ARBITRUM_RPC_URL || 'https://arbitrum.llamarpc.com')
        }));

        // API keys
        this.alchemyApiKey = process.env.ALCHEMY_API_KEY;
        this.moralisApiKey = process.env.MORALIS_API_KEY;
    }

    async getNFTHoldings(
        walletAddress: Address,
        chainIds?: number[]
    ): Promise<NFTHolding[]> {
        const chains = chainIds || [1, 137, 42161];
        const holdings: NFTHolding[] = [];

        for (const chainId of chains) {
            try {
                // Try Alchemy first
                if (this.alchemyApiKey) {
                    const alchemyHoldings = await this.getAlchemyNFTs(walletAddress, chainId);
                    holdings.push(...alchemyHoldings);
                } 
                // Fallback to Moralis
                else if (this.moralisApiKey) {
                    const moralisHoldings = await this.getMoralisNFTs(walletAddress, chainId);
                    holdings.push(...moralisHoldings);
                }
                // Fallback to on-chain scanning (limited)
                else {
                    const onChainHoldings = await this.scanOnChainNFTs(walletAddress, chainId);
                    holdings.push(...onChainHoldings);
                }
            } catch (error) {
                logger.error(`Error fetching NFTs on chain ${chainId}:`, error);
            }
        }

        // Enrich with additional metadata
        await this.enrichNFTMetadata(holdings);

        return holdings;
    }

    private async getAlchemyNFTs(walletAddress: Address, chainId: number): Promise<NFTHolding[]> {
        const chainNames: Record<number, string> = {
            1: 'eth-mainnet',
            137: 'polygon-mainnet',
            42161: 'arb-mainnet',
            10: 'opt-mainnet',
            8453: 'base-mainnet'
        };

        const chainName = chainNames[chainId];
        if (!chainName || !this.alchemyApiKey) {
            return [];
        }

        try {
            const url = `https://${chainName}.g.alchemy.com/nft/v3/${this.alchemyApiKey}/getNFTsForOwner`;
            const response = await axios.get(url, {
                params: {
                    owner: walletAddress,
                    withMetadata: true,
                    pageSize: 100
                }
            });

            const holdings: NFTHolding[] = [];
            for (const nft of response.data.ownedNfts) {
                const holding: NFTHolding = {
                    contractAddress: nft.contract.address as Address,
                    tokenId: nft.tokenId,
                    name: nft.name || nft.title,
                    description: nft.description,
                    imageUrl: nft.image?.cachedUrl || nft.image?.originalUrl,
                    animationUrl: nft.animation?.cachedUrl,
                    attributes: this.parseAttributes(nft.metadata?.attributes),
                    chain: this.getChainFromId(chainId),
                    owner: walletAddress,
                    collection: nft.collection ? {
                        name: nft.contract.name,
                        slug: nft.contract.collection_slug || nft.contract.name.toLowerCase().replace(/\s+/g, '-'),
                        imageUrl: nft.contract.image_url,
                        floorPrice: nft.floor_price
                    } : undefined
                };
                holdings.push(holding);
            }

            // Handle pagination if needed
            if (response.data.pageKey) {
                // Would implement pagination here
            }

            return holdings;
        } catch (error) {
            logger.error('Error fetching NFTs from Alchemy:', error);
            return [];
        }
    }

    private async getMoralisNFTs(walletAddress: Address, chainId: number): Promise<NFTHolding[]> {
        if (!this.moralisApiKey) {
            return [];
        }

        const chainNames: Record<number, string> = {
            1: 'eth',
            137: 'polygon',
            56: 'bsc',
            43114: 'avalanche',
            250: 'fantom'
        };

        const chain = chainNames[chainId];
        if (!chain) {
            return [];
        }

        try {
            const response = await axios.get(`https://deep-index.moralis.io/api/v2.2/${walletAddress}/nft`, {
                headers: {
                    'X-API-Key': this.moralisApiKey
                },
                params: {
                    chain,
                    format: 'decimal',
                    media_items: true
                }
            });

            const holdings: NFTHolding[] = [];
            for (const nft of response.data.result) {
                const holding: NFTHolding = {
                    contractAddress: nft.token_address as Address,
                    tokenId: nft.token_id,
                    name: nft.name,
                    description: nft.description,
                    imageUrl: nft.cached_file_url,
                    animationUrl: nft.cached_animation_url,
                    attributes: nft.metadata?.attributes || [],
                    chain: this.getChainFromId(chainId),
                    owner: walletAddress,
                    collection: nft.collection ? {
                        name: nft.collection.name,
                        slug: nft.collection.slug,
                        imageUrl: nft.collection.image_url,
                        floorPrice: nft.collection.floor_price_usd
                    } : undefined
                };
                holdings.push(holding);
            }

            return holdings;
        } catch (error) {
            logger.error('Error fetching NFTs from Moralis:', error);
            return [];
        }
    }

    private async scanOnChainNFTs(walletAddress: Address, chainId: number): Promise<NFTHolding[]> {
        const client = this.publicClients.get(chainId);
        if (!client) {
            return [];
        }

        const holdings: NFTHolding[] = [];

        // This is a simplified approach - in production would use event logs
        // or known contract lists
        const knownContracts: Address[] = [
            // Add known NFT contracts here
        ];

        for (const contractAddress of knownContracts) {
            try {
                const balance = await client.readContract({
                    address: contractAddress,
                    abi: ERC721_ABI,
                    functionName: 'balanceOf',
                    args: [walletAddress]
                });

                if (balance > 0n) {
                    // Would need to enumerate tokens owned
                    // This is complex without indexed data
                }
            } catch (error) {
                // Skip if not ERC721
                continue;
            }
        }

        return holdings;
    }

    async getNFTMetadata(
        contractAddress: Address,
        tokenId: string,
        chainId: number
    ): Promise<NFTMetadata | null> {
        const cacheKey = `${chainId}-${contractAddress}-${tokenId}`;
        const cached = this.metadataCache.get(cacheKey);
        
        if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
            return cached.metadata;
        }

        const client = this.publicClients.get(chainId);
        if (!client) {
            return null;
        }

        try {
            // Get token URI
            const tokenURI = await client.readContract({
                address: contractAddress,
                abi: ERC721_ABI,
                functionName: 'tokenURI',
                args: [BigInt(tokenId)]
            });

            // Fetch metadata
            const metadata = await this.fetchTokenMetadata(tokenURI as string);
            
            if (metadata) {
                this.metadataCache.set(cacheKey, {
                    metadata,
                    timestamp: Date.now()
                });
            }

            return metadata;
        } catch (error) {
            logger.error('Error fetching NFT metadata:', error);
            return null;
        }
    }

    private async fetchTokenMetadata(uri: string): Promise<NFTMetadata | null> {
        try {
            // Handle IPFS URIs
            if (uri.startsWith('ipfs://')) {
                uri = `https://ipfs.io/ipfs/${uri.slice(7)}`;
            }

            const response = await axios.get(uri, {
                timeout: 10000,
                headers: {
                    'Accept': 'application/json'
                }
            });

            return response.data;
        } catch (error) {
            logger.error('Error fetching token metadata:', error);
            return null;
        }
    }

    async getCollectionStats(
        contractAddress: Address,
        chainId: number
    ): Promise<NFTCollection | null> {
        const cacheKey = `${chainId}-${contractAddress}`;
        const cached = this.collectionCache.get(cacheKey);
        
        if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
            return cached.collection;
        }

        // Try OpenSea API
        if (process.env.OPENSEA_API_KEY) {
            const stats = await this.getOpenSeaCollectionStats(contractAddress, chainId);
            if (stats) {
                this.collectionCache.set(cacheKey, {
                    collection: stats,
                    timestamp: Date.now()
                });
                return stats;
            }
        }

        // Fallback to on-chain data
        const client = this.publicClients.get(chainId);
        if (!client) {
            return null;
        }

        try {
            const [name, symbol] = await Promise.all([
                client.readContract({
                    address: contractAddress,
                    abi: ERC721_ABI,
                    functionName: 'name'
                }),
                client.readContract({
                    address: contractAddress,
                    abi: ERC721_ABI,
                    functionName: 'symbol'
                })
            ]);

            return {
                address: contractAddress,
                name: name as string,
                symbol: symbol as string,
                chainId
            };
        } catch (error) {
            logger.error('Error fetching collection stats:', error);
            return null;
        }
    }

    private async getOpenSeaCollectionStats(
        contractAddress: Address,
        chainId: number
    ): Promise<NFTCollection | null> {
        try {
            const chainName = chainId === 1 ? 'ethereum' : chainId === 137 ? 'matic' : null;
            if (!chainName) return null;

            const response = await axios.get(
                `https://api.opensea.io/api/v2/collections/${contractAddress}`,
                {
                    headers: {
                        'X-API-KEY': process.env.OPENSEA_API_KEY
                    }
                }
            );

            const data = response.data;
            return {
                address: contractAddress,
                name: data.name,
                symbol: data.symbol,
                description: data.description,
                imageUrl: data.image_url,
                bannerUrl: data.banner_image_url,
                totalSupply: data.total_supply,
                floorPrice: data.stats.floor_price,
                volume24h: data.stats.one_day_volume,
                volumeTotal: data.stats.total_volume,
                owners: data.stats.num_owners,
                verified: data.safelist_request_status === 'verified',
                chainId
            };
        } catch (error) {
            logger.error('Error fetching OpenSea collection stats:', error);
            return null;
        }
    }

    async getActivityHistory(
        contractAddress: Address,
        tokenId?: string,
        chainId?: number
    ): Promise<NFTActivity[]> {
        const activities: NFTActivity[] = [];
        
        // Would implement fetching from:
        // 1. Alchemy/Moralis activity endpoints
        // 2. OpenSea activity API
        // 3. On-chain event logs
        
        return activities;
    }

    async transferNFT(
        contractAddress: Address,
        tokenId: string,
        from: Address,
        to: Address,
        chainId: number
    ): Promise<Hex> {
        // This would build the transfer transaction
        // In production, would be executed by wallet service
        
        logger.info(`Preparing NFT transfer: ${contractAddress} #${tokenId} from ${from} to ${to}`);
        return '0x' + '0'.repeat(64) as Hex;
    }

    async listNFT(params: NFTListingParams): Promise<Hex> {
        // This would create a listing on the specified marketplace
        // Each marketplace has different interfaces
        
        logger.info(`Listing NFT on ${params.marketplace}:`, params);
        return '0x' + '0'.repeat(64) as Hex;
    }

    async estimateNFTValue(
        contractAddress: Address,
        tokenId: string,
        chainId: number
    ): Promise<{
        estimatedValue: number;
        floorPrice: number;
        lastSalePrice?: number;
        confidence: 'high' | 'medium' | 'low';
    }> {
        // Get collection floor price
        const collection = await this.getCollectionStats(contractAddress, chainId);
        const floorPrice = collection?.floorPrice || 0;

        // Would also check:
        // 1. Recent sales of similar traits
        // 2. Rarity score
        // 3. Historical sales data
        
        return {
            estimatedValue: floorPrice,
            floorPrice,
            confidence: 'medium'
        };
    }

    private parseAttributes(attributes: any): Record<string, any> {
        if (!attributes || !Array.isArray(attributes)) {
            return {};
        }

        const parsed: Record<string, any> = {};
        for (const attr of attributes) {
            if (attr.trait_type) {
                parsed[attr.trait_type] = attr.value;
            }
        }
        return parsed;
    }

    private async enrichNFTMetadata(holdings: NFTHolding[]): Promise<void> {
        // Enrich holdings with additional data in parallel
        const enrichmentPromises = holdings.map(async (holding) => {
            try {
                // Get collection stats if not present
                if (!holding.collection?.floorPrice) {
                    const stats = await this.getCollectionStats(holding.contractAddress, holding.chain.id);
                    if (stats) {
                        holding.collection = {
                            name: stats.name,
                            slug: stats.name.toLowerCase().replace(/\s+/g, '-'), // Generate slug from name
                            imageUrl: stats.imageUrl,
                            floorPrice: stats.floorPrice
                        };
                    }
                }

                // Get metadata if not present
                if (!holding.name && holding.tokenId) {
                    const metadata = await this.getNFTMetadata(
                        holding.contractAddress,
                        holding.tokenId,
                        holding.chain.id
                    );
                    if (metadata) {
                        holding.name = metadata.name;
                        holding.description = metadata.description;
                        holding.imageUrl = holding.imageUrl || metadata.image;
                        holding.animationUrl = holding.animationUrl || metadata.animation_url;
                        holding.attributes = this.parseAttributes(metadata.attributes);
                    }
                }

                // Estimate value
                if (holding.tokenId) {
                    const valuation = await this.estimateNFTValue(
                        holding.contractAddress,
                        holding.tokenId,
                        holding.chain.id
                    );
                    
                    // Store valuation in collection or attributes if needed
                    if (!holding.attributes) {
                        holding.attributes = {};
                    }
                    (holding.attributes as any).estimatedValue = valuation.estimatedValue;
                }
            } catch (error) {
                // Don't fail entire enrichment for one NFT
                logger.error(`Error enriching NFT ${holding.contractAddress}:`, error);
            }
        });

        await Promise.all(enrichmentPromises);
    }

    async searchCollections(
        query: string,
        chainId?: number
    ): Promise<NFTCollection[]> {
        // Would implement search across:
        // 1. OpenSea collections API
        // 2. Alchemy collections API
        // 3. Local database of known collections
        
        return [];
    }

    clearCache(): void {
        this.metadataCache.clear();
        this.collectionCache.clear();
        logger.debug('NFT cache cleared');
    }

    private getChainFromId(chainId: number): Chain {
        const chainMapping: Record<number, Chain> = {
            1: mainnet,
            137: polygon,
            42161: arbitrum,
            10: optimism,
            8453: base
        };
        return chainMapping[chainId] || mainnet; // Default to mainnet if unknown
    }
}

// Export factory function
export function createNFTService(): NFTService {
    return new NFTService();
}

