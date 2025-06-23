import { IAgentRuntime, Service, logger } from '@elizaos/core';
import { Connection, PublicKey, VersionedTransaction, Keypair } from '@solana/web3.js';
import axios from 'axios';
import { TokenService } from './TokenService.js';
import { TransactionService } from './TransactionService.js';
import BigNumber from 'bignumber.js';

export interface SwapQuoteResponse {
    inputMint: string;
    inAmount: string;
    outputMint: string;
    outAmount: string;
    otherAmountThreshold: string;
    swapMode: string;
    slippageBps: number;
    platformFee: any;
    priceImpactPct: string;
    routePlan: any[];
}

export interface SwapTransactionResponse {
    swapTransaction: string;
    lastValidBlockHeight: number;
    prioritizationFeeLamports: number;
}

export class JupiterDexService extends Service {
    static serviceName = 'jupiter-dex';
    static serviceType = 'jupiter-dex';
    capabilityDescription = 'Jupiter DEX aggregator for token swaps on Solana';

    private readonly baseUrl = 'https://quote-api.jup.ag/v6';
    private tokenService: TokenService;
    private transactionService: TransactionService;
    private connection: Connection;

    constructor(runtime: IAgentRuntime) {
        super(runtime);
        
        const rpcUrl = runtime.getSetting('SOLANA_RPC_URL') || 'https://api.mainnet-beta.solana.com';
        this.connection = new Connection(rpcUrl);
        
        this.tokenService = runtime.getService<TokenService>('token-service') || new TokenService(runtime);
        this.transactionService = runtime.getService<TransactionService>('transaction-service') || new TransactionService(runtime);
    }

    async stop(): Promise<void> {
        // No cleanup needed
    }

    /**
     * Get a swap quote from Jupiter
     */
    async getSwapQuote(
        inputMint: string,
        outputMint: string,
        amount: number,
        slippageBps: number = 50
    ): Promise<SwapQuoteResponse> {
        try {
            // Resolve token addresses if symbols provided
            const inputToken = await this.tokenService.getTokenInfo(inputMint);
            const outputToken = await this.tokenService.getTokenInfo(outputMint);
            
            if (!inputToken || !outputToken) {
                throw new Error(`Token not found: ${!inputToken ? inputMint : outputMint}`);
            }
            
            const inputAddress = inputToken.address;
            const outputAddress = outputToken.address;
            
            // Convert amount to lamports/smallest unit
            const amountInSmallestUnit = new BigNumber(amount)
                .multipliedBy(10 ** inputToken.decimals)
                .toFixed(0);

            const params = new URLSearchParams({
                inputMint: inputAddress,
                outputMint: outputAddress,
                amount: amountInSmallestUnit,
                slippageBps: slippageBps.toString(),
                // Optional: add more parameters
                onlyDirectRoutes: 'false',
                asLegacyTransaction: 'false',
            });

            const response = await axios.get(`${this.baseUrl}/quote?${params}`);
            
            if (!response.data) {
                throw new Error('No quote data received from Jupiter');
            }

            return response.data;
        } catch (error) {
            logger.error('Error getting swap quote:', error);
            throw new Error(`Failed to get swap quote: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Execute a swap using Jupiter
     */
    async executeSwap(
        walletPublicKey: PublicKey,
        quote: SwapQuoteResponse
    ): Promise<string> {
        try {
            // Get the serialized transaction from Jupiter
            const swapResponse = await this.getSwapTransaction(walletPublicKey, quote);
            
            // Deserialize the transaction
            const swapTransactionBuf = Buffer.from(swapResponse.swapTransaction, 'base64');
            const transaction = VersionedTransaction.deserialize(swapTransactionBuf);
            
            // Get recent blockhash if not included
            if (!transaction.message.recentBlockhash) {
                const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash();
                transaction.message.recentBlockhash = blockhash;
            }
            
            // Get keypair from runtime
            const walletKeypair = await this.getWalletKeypair();
            
            // Sign the transaction
            transaction.sign([walletKeypair]);
            
            // Send the transaction
            const signature = await this.connection.sendTransaction(transaction, {
                skipPreflight: false,
                preflightCommitment: 'confirmed',
                maxRetries: 3,
            });
            
            // Wait for confirmation
            await this.connection.confirmTransaction(signature, 'confirmed');
            
            logger.info(`Swap executed successfully: ${signature}`);
            return signature;
        } catch (error) {
            logger.error('Error executing swap:', error);
            throw new Error(`Failed to execute swap: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Get wallet keypair from runtime
     */
    private async getWalletKeypair(): Promise<Keypair> {
        const privateKey = this.runtime.getSetting('SOLANA_PRIVATE_KEY') || 
                          this.runtime.getSetting('WALLET_PRIVATE_KEY') ||
                          this.runtime.getSetting('WALLET_SECRET_KEY');
                          
        if (!privateKey) {
            throw new Error('No wallet private key configured');
        }
        
        // Import bs58 for decoding
        const bs58 = (await import('bs58')).default;
        
        try {
            const secretKey = bs58.decode(privateKey);
            return Keypair.fromSecretKey(secretKey);
        } catch (error) {
            throw new Error('Invalid private key format');
        }
    }

    /**
     * Get swap transaction from Jupiter
     */
    private async getSwapTransaction(
        walletPublicKey: PublicKey,
        quote: SwapQuoteResponse
    ): Promise<SwapTransactionResponse> {
        try {
            const requestBody = {
                quoteResponse: quote,
                userPublicKey: walletPublicKey.toString(),
                wrapAndUnwrapSol: true,
                // Optional: add priority fees
                prioritizationFeeLamports: 'auto',
                dynamicComputeUnitLimit: true,
            };

            const response = await axios.post(
                `${this.baseUrl}/swap`,
                requestBody,
                {
                    headers: {
                        'Content-Type': 'application/json',
                    },
                }
            );

            if (!response.data) {
                throw new Error('No swap transaction received from Jupiter');
            }

            return response.data;
        } catch (error) {
            logger.error('Error getting swap transaction:', error);
            throw new Error(`Failed to get swap transaction: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Get all available token pairs/routes
     */
    async getAvailableRoutes(tokenMint?: string): Promise<string[]> {
        try {
            // If specific token provided, get its valid pairs
            if (tokenMint) {
                const token = await this.tokenService.getTokenInfo(tokenMint);
                if (!token) {
                    throw new Error(`Token not found: ${tokenMint}`);
                }
                // In production, you'd call Jupiter's route API
                // For now, return common pairs
                return ['SOL', 'USDC', 'USDT', 'BONK', 'JUP', 'RAY'];
            }
            
            // Return common tokens
            return ['SOL', 'USDC', 'USDT', 'BONK', 'JUP', 'RAY', 'mSOL', 'stSOL', 'ORCA', 'MNDE'];
        } catch (error) {
            logger.error('Error getting available routes:', error);
            return [];
        }
    }

    /**
     * Calculate price impact for a swap
     */
    async calculatePriceImpact(
        inputMint: string,
        outputMint: string,
        amount: number
    ): Promise<{
        priceImpactPct: number;
        minimumReceived: number;
        rate: number;
    }> {
        try {
            const quote = await this.getSwapQuote(inputMint, outputMint, amount);
            const outputToken = await this.tokenService.getTokenInfo(outputMint);
            
            if (!outputToken) {
                throw new Error(`Output token not found: ${outputMint}`);
            }
            
            const outputAmount = new BigNumber(quote.outAmount)
                .dividedBy(10 ** outputToken.decimals)
                .toNumber();
            
            const rate = outputAmount / amount;
            
            return {
                priceImpactPct: parseFloat(quote.priceImpactPct),
                minimumReceived: outputAmount,
                rate,
            };
        } catch (error) {
            logger.error('Error calculating price impact:', error);
            throw error;
        }
    }

    /**
     * Get swap history (would need indexer in production)
     */
    async getSwapHistory(walletAddress: string, limit: number = 10): Promise<any[]> {
        // In production, this would query an indexer or transaction history service
        logger.warn('Swap history not implemented - would need indexer service');
        return [];
    }

    /**
     * Start the Jupiter DEX service
     */
    static async start(runtime: IAgentRuntime): Promise<JupiterDexService> {
        logger.info('Starting JupiterDexService...');
        return new JupiterDexService(runtime);
    }
} 