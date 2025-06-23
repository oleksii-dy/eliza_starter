import {
    IAgentRuntime,
    logger,
    UUID,
} from '@elizaos/core';
import {
    Service,
    ServiceType,
    IUniversalWalletService,
    UniversalPortfolio,
    UniversalTokenBalance,
    UniversalTransferParams,
    SwapParams,
    BridgeParams,
    UniversalTransactionParams,
    UniversalTransactionResult,
    SimulationResult,
    GasEstimate,
    ChainInfo,
    WalletCapability,
    ChainAdapter,
    PaymentRequestParams,
    UniversalPaymentRequest,
    PaymentResult,
    PaymentVerification,
    WalletCreationParams,
    WalletImportParams,
    WalletInstance,
    WalletFilter,
    SessionParams,
    SessionKey,
} from '@elizaos/core';
import {
    Connection,
    PublicKey,
    Transaction,
    SystemProgram,
    LAMPORTS_PER_SOL,
    sendAndConfirmTransaction,
    Keypair,
    VersionedTransaction,
    TransactionSignature,
    ParsedTransactionWithMeta,
    ConfirmedSignatureInfo,
} from '@solana/web3.js';
import {
    createTransferInstruction,
    getAssociatedTokenAddress,
    TOKEN_PROGRAM_ID,
    getAccount,
    createAssociatedTokenAccountInstruction,
} from '@solana/spl-token';
import bs58 from 'bs58';
import { WalletBalanceService, WalletBalance } from './WalletBalanceService.js';
import { RpcService } from './RpcService.js';
import { JupiterDexService } from './JupiterDexService.js';
import { TokenService } from './TokenService.js';

/**
 * Solana Chain Adapter implementing the universal chain adapter interface
 */
export class SolanaChainAdapter implements ChainAdapter {
    readonly chainId = 'solana';
    readonly name = 'Solana';
    readonly nativeToken = 'SOL';
    readonly capabilities: WalletCapability[] = [
        WalletCapability.TRANSFER,
        WalletCapability.SWAP,
        WalletCapability.STAKING,
        WalletCapability.NFT,
        WalletCapability.DEFI,
    ];

    constructor(
        private connection: Connection,
        private runtime: IAgentRuntime,
        private walletBalanceService?: WalletBalanceService,
        private jupiterService?: JupiterDexService,
        private tokenService?: TokenService
    ) {}

    async getBalance(address: string, tokenAddress?: string): Promise<UniversalTokenBalance> {
        try {
            const publicKey = new PublicKey(address);

            if (!tokenAddress) {
                // Native SOL balance
                const balance = await this.connection.getBalance(publicKey);
                const uiAmount = balance / LAMPORTS_PER_SOL;

                return {
                    address: 'native',
                    symbol: 'SOL',
                    name: 'Solana',
                    decimals: 9,
                    balance: balance.toString(),
                    balanceFormatted: uiAmount.toFixed(9),
                    valueUsd: undefined, // Would need price service
                    priceUsd: undefined,
                    chain: 'solana',
                    isNative: true,
                };
            } else {
                // SPL Token balance
                if (this.walletBalanceService) {
                    const tokenBalance = await this.walletBalanceService.getTokenBalance(address, tokenAddress);
                    if (tokenBalance) {
                        return {
                            address: tokenBalance.address,
                            symbol: tokenBalance.symbol,
                            name: tokenBalance.name,
                            decimals: tokenBalance.decimals,
                            balance: tokenBalance.balance,
                            balanceFormatted: tokenBalance.uiAmount.toString(),
                            valueUsd: undefined,
                            priceUsd: undefined,
                            chain: 'solana',
                            isNative: false,
                        };
                    }
                }

                // Fallback: direct token balance check
                try {
                    const mintPublicKey = new PublicKey(tokenAddress);
                    const tokenAccount = await getAssociatedTokenAddress(mintPublicKey, publicKey);
                    const accountInfo = await getAccount(this.connection, tokenAccount);

                    return {
                        address: tokenAddress,
                        symbol: tokenAddress.slice(0, 6),
                        name: `Token ${tokenAddress.slice(0, 6)}`,
                        decimals: 6, // Default, would need mint info for actual decimals
                        balance: accountInfo.amount.toString(),
                        balanceFormatted: (Number(accountInfo.amount) / Math.pow(10, 6)).toString(),
                        valueUsd: undefined,
                        priceUsd: undefined,
                        chain: 'solana',
                        isNative: false,
                    };
                } catch (error) {
                    // Return zero balance if token account doesn't exist
                    return {
                        address: tokenAddress,
                        symbol: tokenAddress.slice(0, 6),
                        name: `Token ${tokenAddress.slice(0, 6)}`,
                        decimals: 6,
                        balance: '0',
                        balanceFormatted: '0',
                        valueUsd: 0,
                        priceUsd: undefined,
                        chain: 'solana',
                        isNative: false,
                    };
                }
            }
        } catch (error) {
            logger.error('Error getting Solana balance:', error);
            throw error;
        }
    }

    async transfer(params: UniversalTransferParams): Promise<UniversalTransactionResult> {
        try {
            const fromKeypair = this.getWalletKeypair();
            const toPublicKey = new PublicKey(params.to);
            const amount = BigInt(params.amount);

            let transaction: Transaction;
            let signature: TransactionSignature;

            if (!params.tokenAddress) {
                // Native SOL transfer
                transaction = new Transaction().add(
                    SystemProgram.transfer({
                        fromPubkey: fromKeypair.publicKey,
                        toPubkey: toPublicKey,
                        lamports: Number(amount),
                    })
                );

                signature = await sendAndConfirmTransaction(this.connection, transaction, [fromKeypair]);
            } else {
                // SPL Token transfer
                const mintPublicKey = new PublicKey(params.tokenAddress);
                const fromTokenAccount = await getAssociatedTokenAddress(mintPublicKey, fromKeypair.publicKey);
                const toTokenAccount = await getAssociatedTokenAddress(mintPublicKey, toPublicKey);

                transaction = new Transaction();

                // Check if recipient token account exists, create if not
                try {
                    await getAccount(this.connection, toTokenAccount);
                } catch (error) {
                    transaction.add(
                        createAssociatedTokenAccountInstruction(
                            fromKeypair.publicKey,
                            toTokenAccount,
                            toPublicKey,
                            mintPublicKey
                        )
                    );
                }

                transaction.add(
                    createTransferInstruction(
                        fromTokenAccount,
                        toTokenAccount,
                        fromKeypair.publicKey,
                        Number(amount)
                    )
                );

                signature = await sendAndConfirmTransaction(this.connection, transaction, [fromKeypair]);
            }

            return {
                hash: signature,
                status: 'confirmed',
                chain: 'solana',
                blockNumber: undefined, // Solana uses slots, not block numbers
                gasUsed: undefined, // Would need to parse transaction for compute units
                gasPrice: undefined,
                fee: undefined, // Would need to calculate from transaction
                confirmations: 1,
                timestamp: Date.now(),
            };
        } catch (error) {
            logger.error('Error executing Solana transfer:', error);
            return {
                hash: '',
                status: 'failed',
                chain: 'solana',
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }

    async sendTransaction(params: UniversalTransactionParams): Promise<UniversalTransactionResult> {
        try {
            // For Solana, we'll interpret this as a direct transaction
            // This is more complex as Solana doesn't have the same transaction format as EVM
            throw new Error('Direct transaction sending not implemented for Solana. Use transfer() for token transfers.');
        } catch (error) {
            logger.error('Error sending Solana transaction:', error);
            return {
                hash: '',
                status: 'failed',
                chain: 'solana',
                error: error instanceof Error ? error.message : 'Not implemented',
            };
        }
    }

    async estimateGas(params: UniversalTransactionParams): Promise<GasEstimate> {
        // Solana uses compute units instead of gas
        // For basic transactions, we can provide estimates
        const baseComputeUnits = 5000; // Typical for simple transfers
        const priorityFee = 0.000005; // 5 microlamports

        return {
            gasLimit: baseComputeUnits.toString(),
            gasPrice: priorityFee.toString(),
            estimatedCost: (baseComputeUnits * priorityFee).toString(),
            estimatedCostUsd: undefined, // Would need SOL price
            estimatedTime: 1, // Solana block time ~0.4s
        };
    }

    async simulateTransaction(params: UniversalTransactionParams): Promise<SimulationResult> {
        try {
            // Solana simulation would require constructing the actual transaction
            // For now, return a basic simulation result
            return {
                success: true,
                gasUsed: '5000', // Typical compute units
                gasPrice: '0.000005',
                changes: [] // Would need to implement state change detection
                warnings: ['Simulation not fully implemented for Solana'],
            };
        } catch (error) {
            return {
                success: false,
                gasUsed: '0',
                gasPrice: '0',
                changes: []
                error: error instanceof Error ? error.message : 'Simulation failed',
            };
        }
    }

    async swap(params: SwapParams): Promise<UniversalTransactionResult> {
        if (!this.jupiterService) {
            throw new Error('Jupiter service not available for swaps');
        }

        try {
            // TODO: Implement Jupiter service integration with correct method signature
            // const swapResult = await this.jupiterService.swap({
            //     fromToken: params.fromToken,
            //     toToken: params.toToken,
            //     amount: params.amount,
            //     slippage: params.slippage || 1,
            //     userPublicKey: this.getWalletKeypair().publicKey.toString(),
            // });

            // For now, throw error until Jupiter integration is properly implemented
            throw new Error('Jupiter swap integration needs to be updated for new interface');
        } catch (error) {
            logger.error('Error executing Solana swap:', error);
            return {
                hash: '',
                status: 'failed',
                chain: 'solana',
                error: error instanceof Error ? error.message : 'Swap failed',
            };
        }
    }

    private getWalletKeypair(): Keypair {
        const privateKeyString = this.runtime.getSetting('SOLANA_PRIVATE_KEY');
        if (!privateKeyString) {
            throw new Error('SOLANA_PRIVATE_KEY not configured');
        }

        try {
            // Try base58 format first
            const privateKeyBytes = bs58.decode(privateKeyString);
            return Keypair.fromSecretKey(privateKeyBytes);
        } catch (error) {
            try {
                // Try JSON array format
                const privateKeyArray = JSON.parse(privateKeyString);
                return Keypair.fromSecretKey(new Uint8Array(privateKeyArray));
            } catch (error2) {
                throw new Error('Invalid SOLANA_PRIVATE_KEY format. Must be base58 or JSON array.');
            }
        }
    }
}

/**
 * Solana Universal Wallet Service
 * Implements the IUniversalWalletService interface for Solana blockchain
 */
export class SolanaUniversalWalletService extends Service implements IUniversalWalletService {
    static serviceName = 'solana-universal-wallet';
    static serviceType = 'solana-universal-wallet-service';
    capabilityDescription = 'Universal wallet operations for Solana, including balance checking, transfers, and token operations';
    
    readonly chainSupport = ['solana'];
    readonly capabilities: WalletCapability[] = [
        WalletCapability.TRANSFER,
        WalletCapability.SWAP,
        WalletCapability.STAKING,
        WalletCapability.NFT,
        WalletCapability.DEFI,
    ];

    private connection: Connection;
    private walletBalanceService?: WalletBalanceService;
    private rpcService?: RpcService;
    private jupiterService?: JupiterDexService;
    private tokenService?: TokenService;
    private solanaAdapter: SolanaChainAdapter;
    
    constructor(runtime: IAgentRuntime) {
        super(runtime);
        
        // Initialize connection
        this.rpcService = runtime.getService<RpcService>('rpc-service') || undefined;
        if (this.rpcService) {
            this.connection = this.rpcService.getConnection();
        } else {
            const rpcUrl = this.getRpcUrl();
            this.connection = new Connection(rpcUrl, 'confirmed');
        }

        // Get other services
        this.walletBalanceService = runtime.getService<WalletBalanceService>('wallet-balance') || undefined;
        this.jupiterService = runtime.getService<JupiterDexService>('jupiter-dex') || undefined;
        this.tokenService = runtime.getService<TokenService>('token-service') || undefined;

        // Create Solana adapter
        this.solanaAdapter = new SolanaChainAdapter(
            this.connection,
            runtime,
            this.walletBalanceService,
            this.jupiterService,
            this.tokenService
        );
    }

    private getRpcUrl(): string {
        const customRpc = this.runtime?.getSetting('SOLANA_RPC_URL');
        if (customRpc) return customRpc;

        const network = this.runtime?.getSetting('SOLANA_NETWORK') || 'mainnet-beta';
        switch (network) {
            case 'testnet':
                return 'https://api.testnet.solana.com';
            case 'devnet':
                return 'https://api.devnet.solana.com';
            case 'mainnet-beta':
            default:
                return 'https://api.mainnet-beta.solana.com';
        }
    }

    // Core required methods
    async transfer(params: UniversalTransferParams): Promise<UniversalTransactionResult> {
        const chain = params.chain || 'solana';
        if (chain !== 'solana') {
            throw new Error(`Unsupported chain: ${chain}`);
        }
        return await this.solanaAdapter.transfer(params);
    }

    async sendTransaction(params: UniversalTransactionParams): Promise<UniversalTransactionResult> {
        if (params.chain !== 'solana') {
            throw new Error(`Unsupported chain: ${params.chain}`);
        }
        return await this.solanaAdapter.sendTransaction(params);
    }

    async getBalance(assetAddress: string, owner?: string): Promise<UniversalTokenBalance> {
        const walletAddress = owner || await this.getDefaultAddress();
        return await this.solanaAdapter.getBalance(walletAddress, assetAddress === 'native' ? undefined : assetAddress);
    }

    // Enhanced implementations using Solana services
    async getPortfolio(owner?: string): Promise<UniversalPortfolio> {
        try {
            const walletAddress = owner || await this.getDefaultAddress();
            
            if (this.walletBalanceService) {
                // Use enhanced wallet balance service
                const balance = await this.walletBalanceService.getWalletBalance(walletAddress);
                
                // Convert to universal format
                const assets: UniversalTokenBalance[] = [
                    {
                        address: 'native',
                        symbol: 'SOL',
                        name: 'Solana',
                        decimals: 9,
                        balance: balance.sol.balance,
                        balanceFormatted: balance.sol.uiAmount.toString(),
                        valueUsd: undefined,
                        priceUsd: undefined,
                        chain: 'solana',
                        isNative: true,
                    },
                    ...balance.tokens.map(token => ({
                        address: token.address,
                        symbol: token.symbol,
                        name: token.name,
                        decimals: token.decimals,
                        balance: token.balance,
                        balanceFormatted: token.uiAmount.toString(),
                        valueUsd: undefined,
                        priceUsd: undefined,
                        chain: 'solana' as const,
                        isNative: false,
                    }))
                ];

                return {
                    totalValueUsd: balance.totalValueUSD || 0,
                    chains: ['solana'],
                    assets,
                    breakdown: {
                        tokens: balance.totalValueUSD || 0,
                        defi: 0, // TODO: Implement DeFi position tracking
                        nfts: 0, // TODO: Implement NFT value tracking
                        staked: 0, // TODO: Implement staking position tracking
                    },
                    change24h: { amount: 0, percent: 0 }, // TODO: Implement price change tracking
                };
            } else {
                // Fallback to basic implementation
                return await this.getBasicPortfolio(owner);
            }
        } catch (error) {
            logger.error('Error getting Solana portfolio:', error);
            throw error;
        }
    }

    async swap(params: SwapParams): Promise<UniversalTransactionResult> {
        if (params.chain !== 'solana') {
            throw new Error(`Unsupported chain: ${params.chain}`);
        }
        return await this.solanaAdapter.swap!(params);
    }

    async getTransaction(hash: string, chain?: string): Promise<UniversalTransactionResult> {
        try {
            const signature = hash;
            const transaction = await this.connection.getTransaction(signature, {
                commitment: 'confirmed',
                maxSupportedTransactionVersion: 0,
            });

            if (!transaction) {
                throw new Error(`Transaction ${signature} not found`);
            }

            return {
                hash: signature,
                status: transaction.meta?.err ? 'failed' : 'confirmed',
                chain: 'solana',
                blockNumber: transaction.slot,
                gasUsed: transaction.meta?.computeUnitsConsumed?.toString(),
                gasPrice: undefined, // Solana doesn't have direct gas price equivalent
                fee: transaction.meta?.fee?.toString(),
                confirmations: 1, // Solana confirmation model is different
                timestamp: transaction.blockTime ? transaction.blockTime * 1000 : undefined,
                error: transaction.meta?.err ? JSON.stringify(transaction.meta.err) : undefined,
            };
        } catch (error) {
            logger.error('Error getting Solana transaction:', error);
            throw error;
        }
    }

    protected async getDefaultAddress(): Promise<string> {
        const publicKey = this.runtime?.getSetting('SOLANA_PUBLIC_KEY');
        if (!publicKey) {
            // Try to derive from private key
            const privateKey = this.runtime?.getSetting('SOLANA_PRIVATE_KEY');
            if (privateKey) {
                try {
                    const keypair = this.solanaAdapter['getWalletKeypair']();
                    return keypair.publicKey.toString();
                } catch (error) {
                    throw new Error('Could not derive public key from private key');
                }
            }
            throw new Error('No Solana wallet configured');
        }
        return publicKey;
    }

    // Service lifecycle
    static async start(runtime: IAgentRuntime): Promise<SolanaUniversalWalletService> {
        logger.info('Starting SolanaUniversalWalletService...');
        
        const service = new SolanaUniversalWalletService(runtime);
        
        // Validate wallet configuration
        try {
            await service.getDefaultAddress();
            logger.info('Solana universal wallet service initialized successfully');
        } catch (error) {
            logger.warn('Solana wallet not properly configured:', error);
        }
        
        return service;
    }

    async stop(): Promise<void> {
        logger.info('Stopping SolanaUniversalWalletService...');
        // Cleanup any resources if needed
    }

    // Additional required methods from IUniversalWalletService  
    async getSupportedChains(): Promise<ChainInfo[]> {
        return [{
            id: 'solana',
            name: 'Solana',
            nativeToken: {
                symbol: 'SOL',
                name: 'Solana',
                decimals: 9,
            },
            rpcUrls: [this.getRpcUrl()],
            blockExplorerUrls: ['https://solscan.io'],
            isTestnet: this.getRpcUrl().includes('testnet') || this.getRpcUrl().includes('devnet'),
            bridgeSupport: ['wormhole', 'allbridge'],
        }];
    }

    async switchChain(chainId: string): Promise<void> {
        if (chainId !== 'solana') {
            throw new Error(`Unsupported chain: ${chainId}. Solana service only supports 'solana'`);
        }
        // No action needed as we only support one chain
    }

    isChainSupported(chainId: string): boolean {
        return chainId === 'solana';
    }

    // Missing methods from IUniversalWalletService that need to be implemented
    async getBalances(owner?: string): Promise<UniversalTokenBalance[]> {
        const walletAddress = owner || await this.getDefaultAddress();
        const nativeBalance = await this.solanaAdapter.getBalance(walletAddress);
        
        // For now, just return native balance, but could be expanded
        return [nativeBalance];
    }

    private async getBasicPortfolio(owner?: string): Promise<UniversalPortfolio> {
        const balances = await this.getBalances(owner);
        const totalValue = balances.reduce((sum, balance) => sum + (balance.valueUsd || 0), 0);
        
        return {
            totalValueUsd: totalValue,
            chains: ['solana'],
            assets: balances,
            breakdown: {
                tokens: totalValue,
                defi: 0,
                nfts: 0,
                staked: 0,
            },
        };
    }

    // Transaction utilities required by interface
    async simulateTransaction(params: UniversalTransactionParams): Promise<SimulationResult> {
        return await this.solanaAdapter.simulateTransaction(params);
    }

    async estimateGas(params: UniversalTransactionParams): Promise<GasEstimate> {
        return await this.solanaAdapter.estimateGas(params);
    }

    // Optional payment methods (can throw "not implemented" for now)
    async createPaymentRequest?(params: PaymentRequestParams): Promise<UniversalPaymentRequest> {
        throw new Error('Payment requests not implemented for Solana service');
    }

    async processPayment?(request: UniversalPaymentRequest): Promise<PaymentResult> {
        throw new Error('Payment processing not implemented for Solana service');
    }

    async verifyPayment?(paymentId: string): Promise<PaymentVerification> {
        throw new Error('Payment verification not implemented for Solana service');
    }

    // Optional wallet management methods
    async createWallet?(params: WalletCreationParams): Promise<WalletInstance> {
        throw new Error('Wallet creation not implemented for Solana service');
    }

    async importWallet?(params: WalletImportParams): Promise<WalletInstance> {
        throw new Error('Wallet import not implemented for Solana service');
    }

    async getWallets?(filter?: WalletFilter): Promise<WalletInstance[]> {
        return [];
    }

    async deleteWallet?(walletId: UUID): Promise<boolean> {
        throw new Error('Wallet deletion not implemented for Solana service');
    }

    // Optional session management methods
    async createSession?(params: SessionParams): Promise<SessionKey> {
        throw new Error('Session creation not implemented for Solana service');
    }

    async validateSession?(sessionId: string, operation: string): Promise<boolean> {
        return false;
    }

    async revokeSession?(sessionId: string): Promise<void> {
        throw new Error('Session revocation not implemented for Solana service');
    }

    async listSessions?(walletId?: string): Promise<SessionKey[]> {
        return [];
    }

    // Bridge method implementation
    async bridge(params: BridgeParams): Promise<UniversalTransactionResult> {
        throw new Error('Bridge operations not implemented for Solana service');
    }
}

export default SolanaUniversalWalletService;