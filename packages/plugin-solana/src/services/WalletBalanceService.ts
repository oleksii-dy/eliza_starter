import {
    IAgentRuntime,
    Service,
    logger,
} from '@elizaos/core';
import {
    Connection,
    PublicKey,
    LAMPORTS_PER_SOL,
    ParsedAccountData,
} from '@solana/web3.js';
import {
    TOKEN_PROGRAM_ID,
    getMint,
} from '@solana/spl-token';
import type { TokenBalance } from '../types';
import { TokenService, TokenInfo } from './TokenService.js';
import { RpcService } from './RpcService.js';

export interface WalletBalance {
    sol: {
        balance: string;
        uiAmount: number;
        decimals: number;
        symbol: string;
    };
    tokens: TokenBalance[];
    totalValueUSD?: number;
}

export class WalletBalanceService extends Service {
    static serviceName = 'wallet-balance';
    static serviceType = 'wallet-balance';
    capabilityDescription = 'Provides wallet balance information for Solana wallets with enhanced token metadata';
    
    private connection: Connection;
    private network: string;
    private tokenService?: TokenService;
    private rpcService?: RpcService;

    constructor(runtime: IAgentRuntime) {
        super(runtime);
        
        // Get network from environment or default to mainnet
        this.network = runtime.getSetting('SOLANA_NETWORK') || 'mainnet-beta';
        
        // Try to get RpcService first
        this.rpcService = runtime.getService<RpcService>('rpc-service') || undefined;
        
        if (this.rpcService) {
            // Use RpcService for better connection management
            this.connection = this.rpcService.getConnection();
            logger.info(`WalletBalanceService using RpcService for connections`);
        } else {
            // Fallback to direct connection
            const rpcUrl = this.getRpcUrl();
            this.connection = new Connection(rpcUrl, 'confirmed');
            logger.info(`WalletBalanceService initialized on ${this.network} with RPC: ${rpcUrl}`);
        }
        
        // Try to get TokenService
        this.tokenService = runtime.getService<TokenService>('token-service') || undefined;
    }

    private getRpcUrl(): string {
        const customRpc = this.runtime.getSetting('SOLANA_RPC_URL');
        if (customRpc) return customRpc;

        switch (this.network) {
            case 'testnet':
                return 'https://api.testnet.solana.com';
            case 'devnet':
                return 'https://api.devnet.solana.com';
            case 'mainnet-beta':
            default:
                return 'https://api.mainnet-beta.solana.com';
        }
    }

    async getWalletBalance(walletAddress: string): Promise<WalletBalance> {
        try {
            const publicKey = new PublicKey(walletAddress);
            
            // Use RpcService if available for failover support
            let solBalance: number;
            if (this.rpcService) {
                solBalance = await this.rpcService.executeWithFailover(
                    conn => conn.getBalance(publicKey)
                );
            } else {
                solBalance = await this.connection.getBalance(publicKey);
            }
            
            const solUiAmount = solBalance / LAMPORTS_PER_SOL;
            
            // Get token accounts
            const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(
                publicKey,
                { programId: TOKEN_PROGRAM_ID }
            );

            const tokens: TokenBalance[] = [];
            const mintAddresses: string[] = [];
            
            // First pass - collect all mints and basic info
            for (const { account } of tokenAccounts.value) {
                const parsedData = account.data as ParsedAccountData;
                const tokenData = parsedData.parsed.info;
                
                if (tokenData.tokenAmount.uiAmount > 0) {
                    mintAddresses.push(tokenData.mint);
                    tokens.push({
                        address: tokenData.mint,
                        symbol: tokenData.mint.slice(0, 6), // Default symbol
                        name: `Token ${tokenData.mint.slice(0, 6)}`, // Default name
                        decimals: tokenData.tokenAmount.decimals,
                        balance: tokenData.tokenAmount.amount,
                        uiAmount: tokenData.tokenAmount.uiAmount,
                    });
                }
            }

            // Second pass - enhance with metadata from TokenService
            if (this.tokenService && mintAddresses.length > 0) {
                const tokenInfoMap = await this.tokenService.getMultipleTokenInfo(mintAddresses);
                
                for (const token of tokens) {
                    const tokenInfo = tokenInfoMap.get(token.address);
                    if (tokenInfo) {
                        token.symbol = tokenInfo.symbol;
                        token.name = tokenInfo.name;
                        // Add logo if available
                        if (tokenInfo.logoURI) {
                            (token as any).logoURI = tokenInfo.logoURI;
                        }
                    }
                }
            }

            // Calculate total value (would need price data)
            let totalValueUSD = 0;
            
            // Add SOL value (would need SOL price)
            // totalValueUSD += solUiAmount * solPriceUSD;
            
            // Add token values
            // for (const token of tokens) {
            //     totalValueUSD += token.uiAmount * token.priceUsd;
            // }

            // Sort tokens by value or amount
            tokens.sort((a, b) => b.uiAmount - a.uiAmount);

            return {
                sol: {
                    balance: solBalance.toString(),
                    uiAmount: solUiAmount,
                    decimals: 9,
                    symbol: 'SOL',
                },
                tokens,
                totalValueUSD,
            };
        } catch (error) {
            logger.error('Error fetching wallet balance:', error);
            throw error;
        }
    }

    async getMultipleWalletBalances(walletAddresses: string[]): Promise<Map<string, WalletBalance>> {
        const balances = new Map<string, WalletBalance>();
        
        // Fetch balances in parallel with rate limiting
        const batchSize = 5;
        for (let i = 0; i < walletAddresses.length; i += batchSize) {
            const batch = walletAddresses.slice(i, i + batchSize);
            const batchResults = await Promise.all(
                batch.map(async (address) => {
                    try {
                        const balance = await this.getWalletBalance(address);
                        return { address, balance };
                    } catch (error) {
                        logger.error(`Failed to fetch balance for ${address}:`, error);
                        return { address, balance: null };
                    }
                })
            );
            
            for (const { address, balance } of batchResults) {
                if (balance) {
                    balances.set(address, balance);
                }
            }
            
            // Rate limiting
            if (i + batchSize < walletAddresses.length) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
        
        return balances;
    }

    async getTokenBalance(walletAddress: string, tokenMint: string): Promise<TokenBalance | null> {
        try {
            const walletPubkey = new PublicKey(walletAddress);
            const mintPubkey = new PublicKey(tokenMint);
            
            // Find the associated token account
            const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(
                walletPubkey,
                { mint: mintPubkey }
            );
            
            if (tokenAccounts.value.length === 0) {
                return null;
            }
            
            const account = tokenAccounts.value[0];
            const parsedData = account.account.data as ParsedAccountData;
            const tokenData = parsedData.parsed.info;
            
            // Get token metadata if available
            let tokenInfo: TokenInfo | null = null;
            if (this.tokenService) {
                tokenInfo = await this.tokenService.getTokenInfo(tokenMint);
            }
            
            return {
                address: tokenMint,
                symbol: tokenInfo?.symbol || tokenMint.slice(0, 6),
                name: tokenInfo?.name || `Token ${tokenMint.slice(0, 6)}`,
                decimals: tokenData.tokenAmount.decimals,
                balance: tokenData.tokenAmount.amount,
                uiAmount: tokenData.tokenAmount.uiAmount,
            };
        } catch (error) {
            logger.error(`Error fetching token balance for ${tokenMint}:`, error);
            return null;
        }
    }

    async getSolBalance(walletAddress: string): Promise<number> {
        try {
            const publicKey = new PublicKey(walletAddress);
            
            let balance: number;
            if (this.rpcService) {
                balance = await this.rpcService.executeWithFailover(
                    conn => conn.getBalance(publicKey)
                );
            } else {
                balance = await this.connection.getBalance(publicKey);
            }
            
            return balance / LAMPORTS_PER_SOL;
        } catch (error) {
            logger.error('Error fetching SOL balance:', error);
            throw error;
        }
    }

    getNetwork(): string {
        return this.network;
    }

    getConnection(): Connection {
        // If using RpcService, get fresh connection each time
        if (this.rpcService) {
            return this.rpcService.getConnection();
        }
        return this.connection;
    }

    static async start(runtime: IAgentRuntime): Promise<WalletBalanceService> {
        logger.info('Starting WalletBalanceService...');
        const service = new WalletBalanceService(runtime);
        
        // Initialize TokenService if not already available
        if (!service.tokenService) {
            try {
                service.tokenService = runtime.getService<TokenService>('token-service') || undefined;
            } catch (error) {
                logger.warn('TokenService not available, using basic token info');
            }
        }
        
        return service;
    }

    async stop(): Promise<void> {
        logger.info('Stopping WalletBalanceService...');
        // Clean up any resources if needed
    }
} 