import { IAgentRuntime, logger } from '@elizaos/core';
import type { Address, Hex } from 'viem';
import { 
    formatUnits, 
    parseUnits, 
    getContract, 
    encodeFunctionData,
    decodeFunctionResult,
    erc20Abi,
    erc721Abi,
    erc1155Abi
} from 'viem';
import { ChainConfigService } from '../core/chains/config';
import { WalletDatabaseService } from '../core/database/service';

export interface TokenMetadata {
    address: Address;
    chainId: number;
    name: string;
    symbol: string;
    decimals: number;
    totalSupply?: bigint;
    logoUri?: string;
    priceUsd?: number;
    type: 'ERC20' | 'ERC721' | 'ERC1155';
}

export interface TokenBalance {
    token: TokenMetadata;
    balance: bigint;
    formattedBalance: string;
    valueUsd?: number;
}

export interface NFTMetadata {
    tokenId: string;
    name?: string;
    description?: string;
    image?: string;
    animationUrl?: string;
    attributes?: Array<{
        trait_type: string;
        value: string | number;
    }>;
    owner?: Address;
}

export interface TokenTransferParams {
    token: Address;
    from: Address;
    to: Address;
    amount: bigint;
    tokenId?: bigint; // For NFTs
    data?: Hex; // For ERC1155
}

export interface TokenApprovalParams {
    token: Address;
    spender: Address;
    amount: bigint;
    tokenId?: bigint; // For NFTs
}

export class TokenService {
    private chainService: ChainConfigService;
    private dbService: WalletDatabaseService;
    private tokenCache: Map<string, TokenMetadata> = new Map();
    private balanceCache: Map<string, { balance: TokenBalance; timestamp: number }> = new Map();
    private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

    constructor(
        private runtime: IAgentRuntime
    ) {
        this.chainService = new ChainConfigService(runtime);
        this.dbService = new WalletDatabaseService(runtime);
    }

    /**
     * Get token metadata
     */
    async getTokenMetadata(
        tokenAddress: Address,
        chainId: number
    ): Promise<TokenMetadata> {
        const cacheKey = `${chainId}-${tokenAddress}`;
        
        // Check cache
        const cached = this.tokenCache.get(cacheKey);
        if (cached) {
            return cached;
        }

        try {
            const client = this.chainService.getPublicClient(chainId);
            
            // First, determine token type
            const tokenType = await this.detectTokenType(tokenAddress, chainId);
            
            let metadata: TokenMetadata;
            
            if (tokenType === 'ERC20') {
                // Get ERC20 metadata
                const contract = getContract({
                    address: tokenAddress,
                    abi: erc20Abi,
                    client
                });

                const [name, symbol, decimals, totalSupply] = await Promise.all([
                    contract.read.name().catch(() => 'Unknown Token'),
                    contract.read.symbol().catch(() => 'UNKNOWN'),
                    contract.read.decimals().catch(() => 18),
                    contract.read.totalSupply().catch(() => 0n)
                ]);

                metadata = {
                    address: tokenAddress,
                    chainId,
                    name,
                    symbol,
                    decimals: Number(decimals),
                    totalSupply,
                    type: 'ERC20'
                };
            } else if (tokenType === 'ERC721') {
                // Get ERC721 metadata
                const contract = getContract({
                    address: tokenAddress,
                    abi: erc721Abi,
                    client
                });

                const [name, symbol] = await Promise.all([
                    contract.read.name().catch(() => 'Unknown NFT'),
                    contract.read.symbol().catch(() => 'NFT')
                ]);

                metadata = {
                    address: tokenAddress,
                    chainId,
                    name,
                    symbol,
                    decimals: 0,
                    type: 'ERC721'
                };
            } else {
                // ERC1155
                metadata = {
                    address: tokenAddress,
                    chainId,
                    name: 'ERC1155 Token',
                    symbol: 'ERC1155',
                    decimals: 0,
                    type: 'ERC1155'
                };
            }

            // Cache the metadata
            this.tokenCache.set(cacheKey, metadata);
            
            // Also save to database
            await this.saveTokenToDatabase(metadata);

            return metadata;
        } catch (error) {
            logger.error(`Error getting token metadata for ${tokenAddress}:`, error);
            throw new Error(`Failed to get token metadata: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Get token balance for an address
     */
    async getTokenBalance(
        tokenAddress: Address,
        walletAddress: Address,
        chainId: number
    ): Promise<TokenBalance> {
        const cacheKey = `${chainId}-${tokenAddress}-${walletAddress}`;
        
        // Check cache
        const cached = this.balanceCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
            return cached.balance;
        }

        try {
            const metadata = await this.getTokenMetadata(tokenAddress, chainId);
            const client = this.chainService.getPublicClient(chainId);
            
            let balance: bigint;
            
            if (metadata.type === 'ERC20') {
                const contract = getContract({
                    address: tokenAddress,
                    abi: erc20Abi,
                    client
                });
                balance = await contract.read.balanceOf([walletAddress]);
            } else if (metadata.type === 'ERC721') {
                const contract = getContract({
                    address: tokenAddress,
                    abi: erc721Abi,
                    client
                });
                balance = await contract.read.balanceOf([walletAddress]);
            } else {
                // For ERC1155, we'd need to know specific token IDs
                // This is a simplified implementation
                balance = 0n;
            }

            const formattedBalance = formatUnits(balance, metadata.decimals);
            
            const tokenBalance: TokenBalance = {
                token: metadata,
                balance,
                formattedBalance,
                valueUsd: metadata.priceUsd ? parseFloat(formattedBalance) * metadata.priceUsd : undefined
            };

            // Cache the balance
            this.balanceCache.set(cacheKey, {
                balance: tokenBalance,
                timestamp: Date.now()
            });

            return tokenBalance;
        } catch (error) {
            logger.error(`Error getting token balance:`, error);
            throw new Error(`Failed to get token balance: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Get all token balances for a wallet
     */
    async getAllTokenBalances(
        walletAddress: Address,
        chainId: number,
        tokenAddresses?: Address[]
    ): Promise<TokenBalance[]> {
        try {
            // If no specific tokens provided, get from database
            if (!tokenAddresses) {
                const savedTokens = await this.dbService.getTokenBalances(walletAddress, chainId);
                tokenAddresses = savedTokens.map(t => t.tokenAddress as Address);
            }

            const balances = await Promise.all(
                tokenAddresses.map(tokenAddress => 
                    this.getTokenBalance(tokenAddress, walletAddress, chainId)
                        .catch(err => {
                            logger.warn(`Failed to get balance for ${tokenAddress}:`, err);
                            return null;
                        })
                )
            );

            return balances.filter((b): b is TokenBalance => b !== null && b.balance > 0n);
        } catch (error) {
            logger.error('Error getting all token balances:', error);
            return [];
        }
    }

    /**
     * Transfer tokens
     */
    async transfer(params: TokenTransferParams): Promise<Hex> {
        try {
            const metadata = await this.getTokenMetadata(params.token, 1); // Need chainId
            
            if (metadata.type === 'ERC20') {
                return encodeFunctionData({
                    abi: erc20Abi,
                    functionName: 'transfer',
                    args: [params.to, params.amount]
                });
            } else if (metadata.type === 'ERC721') {
                return encodeFunctionData({
                    abi: erc721Abi,
                    functionName: 'safeTransferFrom',
                    args: [params.from, params.to, params.tokenId!]
                });
            } else {
                // ERC1155
                return encodeFunctionData({
                    abi: erc1155Abi,
                    functionName: 'safeTransferFrom',
                    args: [params.from, params.to, params.tokenId!, params.amount, params.data || '0x']
                });
            }
        } catch (error) {
            logger.error('Error building transfer data:', error);
            throw new Error(`Failed to build transfer: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Approve token spending
     */
    async approve(params: TokenApprovalParams, chainId: number): Promise<Hex> {
        try {
            const metadata = await this.getTokenMetadata(params.token, chainId);
            
            if (metadata.type === 'ERC20') {
                return encodeFunctionData({
                    abi: erc20Abi,
                    functionName: 'approve',
                    args: [params.spender, params.amount]
                });
            } else if (metadata.type === 'ERC721') {
                return encodeFunctionData({
                    abi: erc721Abi,
                    functionName: 'approve',
                    args: [params.spender, params.tokenId!]
                });
            } else {
                // ERC1155 uses setApprovalForAll
                return encodeFunctionData({
                    abi: erc1155Abi,
                    functionName: 'setApprovalForAll',
                    args: [params.spender, true]
                });
            }
        } catch (error) {
            logger.error('Error building approval data:', error);
            throw new Error(`Failed to build approval: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Check token allowance
     */
    async getAllowance(
        tokenAddress: Address,
        owner: Address,
        spender: Address,
        chainId: number
    ): Promise<bigint> {
        try {
            const metadata = await this.getTokenMetadata(tokenAddress, chainId);
            const client = this.chainService.getPublicClient(chainId);
            
            if (metadata.type === 'ERC20') {
                const contract = getContract({
                    address: tokenAddress,
                    abi: erc20Abi,
                    client
                });
                return await contract.read.allowance([owner, spender]);
            } else if (metadata.type === 'ERC721') {
                const contract = getContract({
                    address: tokenAddress,
                    abi: erc721Abi,
                    client
                });
                const approved = await contract.read.getApproved([0n]); // Need specific tokenId
                return approved.toLowerCase() === spender.toLowerCase() ? 1n : 0n;
            } else {
                // ERC1155
                const contract = getContract({
                    address: tokenAddress,
                    abi: erc1155Abi,
                    client
                });
                const isApproved = await contract.read.isApprovedForAll([owner, spender]);
                return isApproved ? 2n ** 256n - 1n : 0n; // max uint256
            }
        } catch (error) {
            logger.error('Error checking allowance:', error);
            return 0n;
        }
    }

    /**
     * Get NFT metadata
     */
    async getNFTMetadata(
        contractAddress: Address,
        tokenId: bigint,
        chainId: number
    ): Promise<NFTMetadata> {
        try {
            const client = this.chainService.getPublicClient(chainId);
            const contract = getContract({
                address: contractAddress,
                abi: erc721Abi,
                client
            });

            // Get token URI
            const tokenUri = await contract.read.tokenURI([tokenId]);
            
            // Get owner
            const owner = await contract.read.ownerOf([tokenId]).catch(() => undefined);

            // Fetch metadata from URI
            let metadata: NFTMetadata = {
                tokenId: tokenId.toString(),
                owner
            };

            if (tokenUri) {
                try {
                    // Handle IPFS URIs
                    const uri = tokenUri.startsWith('ipfs://') 
                        ? `https://ipfs.io/ipfs/${tokenUri.slice(7)}`
                        : tokenUri;

                    const response = await fetch(uri);
                    const data = await response.json() as {
                        name?: string;
                        description?: string;
                        image?: string;
                        animation_url?: string;
                        attributes?: Array<{ trait_type: string; value: string | number }>;
                    };
                    
                    metadata = {
                        ...metadata,
                        name: data.name,
                        description: data.description,
                        image: data.image,
                        animationUrl: data.animation_url,
                        attributes: data.attributes
                    };
                } catch (err) {
                    logger.warn(`Failed to fetch NFT metadata from ${tokenUri}:`, err);
                }
            }

            return metadata;
        } catch (error) {
            logger.error('Error getting NFT metadata:', error);
            throw new Error(`Failed to get NFT metadata: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Detect token type by checking interfaces
     */
    private async detectTokenType(
        tokenAddress: Address,
        chainId: number
    ): Promise<'ERC20' | 'ERC721' | 'ERC1155'> {
        const client = this.chainService.getPublicClient(chainId);
        
        // Try ERC20 first (most common)
        try {
            const contract = getContract({
                address: tokenAddress,
                abi: erc20Abi,
                client
            });
            await contract.read.decimals();
            return 'ERC20';
        } catch {
            // Not ERC20
        }

        // Try ERC721
        try {
            const contract = getContract({
                address: tokenAddress,
                abi: [{
                    inputs: [{ name: 'interfaceId', type: 'bytes4' }],
                    name: 'supportsInterface',
                    outputs: [{ name: '', type: 'bool' }],
                    stateMutability: 'view',
                    type: 'function'
                }],
                client
            });
            
            // ERC721 interface ID
            const isERC721 = await contract.read.supportsInterface(['0x80ac58cd']);
            if (isERC721) return 'ERC721';
            
            // ERC1155 interface ID
            const isERC1155 = await contract.read.supportsInterface(['0xd9b67a26']);
            if (isERC1155) return 'ERC1155';
        } catch {
            // Fallback
        }

        // Default to ERC20
        return 'ERC20';
    }

    /**
     * Save token metadata to database
     */
    private async saveTokenToDatabase(metadata: TokenMetadata): Promise<void> {
        try {
            // This would save to the tokens table
            // Implementation depends on database schema
            logger.debug(`Saved token ${metadata.symbol} to database`);
        } catch (error) {
            logger.error('Error saving token to database:', error);
        }
    }

    /**
     * Format token amount for display
     */
    formatAmount(amount: bigint, decimals: number): string {
        return formatUnits(amount, decimals);
    }

    /**
     * Parse token amount from string
     */
    parseAmount(amount: string, decimals: number): bigint {
        return parseUnits(amount, decimals);
    }

    /**
     * Clear caches
     */
    clearCaches(): void {
        this.tokenCache.clear();
        this.balanceCache.clear();
        logger.debug('Token caches cleared');
    }

    /**
     * Check if a token is ERC20
     */
    async isERC20(tokenAddress: string): Promise<boolean> {
        try {
            const tokenType = await this.detectTokenType(tokenAddress as Address, 1); // Default to mainnet
            return tokenType === 'ERC20';
        } catch (error) {
            logger.error('Error checking if token is ERC20:', error);
            return false;
        }
    }
}

// Export factory function
export function createTokenService(runtime: IAgentRuntime): TokenService {
    return new TokenService(runtime);
}
