import {
    Connection,
    PublicKey,
    Transaction,
    Keypair,
    SystemProgram,
} from '@solana/web3.js';
import {
    TOKEN_2022_PROGRAM_ID,
    createInitializeMintInstruction,
    createInitializeTransferFeeConfigInstruction,
    createInitializeMetadataPointerInstruction,
    createInitializeMintCloseAuthorityInstruction,
    createInitializeInterestBearingMintInstruction,
    createAssociatedTokenAccountIdempotent,
    createMintToInstruction,
    createTransferCheckedWithFeeInstruction,
    getMint,
    getAccount,
    ExtensionType,
    getMintLen,
    getExtensionData,
    getTransferFeeConfig,
    getInterestBearingMintConfigState,
    getTransferFeeAmount
} from '@solana/spl-token';
import { IAgentRuntime, logger, Service } from '@elizaos/core';
import { SecureKeyManager } from './SecureKeyManager';
import { RateLimiter } from '../utils/rateLimiter';

interface Token22Extensions {
    transferFees?: {
        transferFeeBasisPoints: number;
        maximumFee: bigint;
    };
    interestBearing?: {
        rate: number;
    };
    mintCloseAuthority?: boolean;
    metadataPointer?: PublicKey;
    permanentDelegate?: PublicKey;
}

interface Token22Info {
    mint: PublicKey;
    decimals: number;
    supply: bigint;
    extensions: string[];
    transferFeeConfig?: any;
    interestConfig?: any;
}

interface Token22Config {
    transferFeeConfig?: {
        feeBasisPoints: number;
        maxFee: bigint;
        transferFeeConfigAuthority?: PublicKey;
        withdrawWithheldAuthority?: PublicKey;
    };
    interestBearingConfig?: {
        rate: number;
        rateAuthority?: PublicKey;
    };
    nonTransferable?: boolean;
    defaultAccountState?: 'initialized' | 'frozen';
}

export class Token22Service extends Service {
    static serviceName = "token22";
    static serviceType = "token22-service";
    capabilityDescription = "SPL Token-2022 operations with extensions";

    private connection: Connection;
    protected runtime: IAgentRuntime;
    private keyManager: SecureKeyManager | null = null;
    private rateLimiter: RateLimiter;

    constructor(runtime: IAgentRuntime) {
        super();
        this.runtime = runtime;
        this.connection = new Connection(
            runtime.getSetting("SOLANA_RPC_URL") || "https://api.mainnet-beta.solana.com"
        );
        this.rateLimiter = new RateLimiter({ maxRequests: 10, windowMs: 60000 });
    }

    static async start(runtime: IAgentRuntime): Promise<Token22Service> {
        const service = new Token22Service(runtime);
        await service.initialize();
        return service;
    }

    async initialize(): Promise<void> {
        // Don't get key manager during initialization
        // It will be retrieved lazily when needed
        logger.info("Token22Service initialized");
    }

    private getKeyManager(): SecureKeyManager {
        if (!this.keyManager) {
            this.keyManager = this.runtime.getService("secure-key-manager") as SecureKeyManager;
            if (!this.keyManager) {
                throw new Error("SecureKeyManager service not available");
            }
        }
        return this.keyManager;
    }

    async stop(): Promise<void> {
        // No cleanup needed
    }

    /**
     * Create a Token22 mint with extensions
     */
    async createToken22(
        decimals: number,
        extensions?: Token22Extensions
    ): Promise<{ mint: PublicKey; signature: string }> {
        await this.rateLimiter.checkLimit('token22-create');
        
        const walletKeypair = await this.getKeyManager().getAgentKeypair();
        const mintKeypair = Keypair.generate();
        
        try {
            // Calculate required extensions
            const requiredExtensions: ExtensionType[] = [];
            
            if (extensions?.transferFees) {
                requiredExtensions.push(ExtensionType.TransferFeeConfig);
            }
            if (extensions?.interestBearing) {
                requiredExtensions.push(ExtensionType.InterestBearingConfig);
            }
            if (extensions?.mintCloseAuthority) {
                requiredExtensions.push(ExtensionType.MintCloseAuthority);
            }
            if (extensions?.metadataPointer) {
                requiredExtensions.push(ExtensionType.MetadataPointer);
            }
            if (extensions?.permanentDelegate) {
                requiredExtensions.push(ExtensionType.PermanentDelegate);
            }
            
            // Calculate mint size
            const mintLen = getMintLen(requiredExtensions);
            const lamports = await this.connection.getMinimumBalanceForRentExemption(mintLen);
            
            const transaction = new Transaction();
            
            // Create mint account
            transaction.add(
                SystemProgram.createAccount({
                    fromPubkey: walletKeypair.publicKey,
                    newAccountPubkey: mintKeypair.publicKey,
                    space: mintLen,
                    lamports,
                    programId: TOKEN_2022_PROGRAM_ID,
                })
            );
            
            // Initialize extensions before mint
            if (extensions?.transferFees) {
                transaction.add(
                    createInitializeTransferFeeConfigInstruction(
                        mintKeypair.publicKey,
                        walletKeypair.publicKey,
                        walletKeypair.publicKey,
                        extensions.transferFees.transferFeeBasisPoints,
                        extensions.transferFees.maximumFee,
                        TOKEN_2022_PROGRAM_ID
                    )
                );
            }
            
            if (extensions?.interestBearing) {
                transaction.add(
                    createInitializeInterestBearingMintInstruction(
                        mintKeypair.publicKey,
                        walletKeypair.publicKey,
                        extensions.interestBearing.rate,
                        TOKEN_2022_PROGRAM_ID
                    )
                );
            }
            
            if (extensions?.mintCloseAuthority) {
                transaction.add(
                    createInitializeMintCloseAuthorityInstruction(
                        mintKeypair.publicKey,
                        walletKeypair.publicKey,
                        TOKEN_2022_PROGRAM_ID
                    )
                );
            }
            
            if (extensions?.metadataPointer) {
                transaction.add(
                    createInitializeMetadataPointerInstruction(
                        mintKeypair.publicKey,
                        walletKeypair.publicKey,
                        extensions.metadataPointer,
                        TOKEN_2022_PROGRAM_ID
                    )
                );
            }
            
            // Initialize mint
            transaction.add(
                createInitializeMintInstruction(
                    mintKeypair.publicKey,
                    decimals,
                    walletKeypair.publicKey,
                    walletKeypair.publicKey,
                    TOKEN_2022_PROGRAM_ID
                )
            );
            
            const signature = await this.connection.sendTransaction(
                transaction,
                [walletKeypair, mintKeypair],
                { skipPreflight: false }
            );
            
            await this.connection.confirmTransaction(signature, 'confirmed');
            
            logger.info('Token22 created successfully', {
                mint: mintKeypair.publicKey.toString(),
                decimals,
                extensions: requiredExtensions.map(e => ExtensionType[e]),
                signature,
            });
            
            return {
                mint: mintKeypair.publicKey,
                signature,
            };
        } catch (error) {
            logger.error('Failed to create Token22', { error });
            throw error;
        }
    }

    /**
     * Check if a mint is Token22 and get its extensions
     */
    async getToken22Info(mint: PublicKey): Promise<Token22Info | null> {
        await this.rateLimiter.checkLimit('token22-info');
        
        try {
            const accountInfo = await this.connection.getAccountInfo(mint);
            if (!accountInfo) {
                return null;
            }
            
            // Check if it's Token22
            if (!accountInfo.owner.equals(TOKEN_2022_PROGRAM_ID)) {
                return null;
            }
            
            const mintInfo = await getMint(
                this.connection,
                mint,
                'confirmed',
                TOKEN_2022_PROGRAM_ID
            );
            
            const extensions: string[] = [];
            let transferFeeConfig;
            let interestConfig;
            
            // Check for transfer fees
            try {
                transferFeeConfig = getTransferFeeConfig(mintInfo);
                if (transferFeeConfig) {
                    extensions.push('TransferFees');
                }
            } catch (e) {
                // No transfer fee extension
            }
            
            // Check for interest bearing
            try {
                interestConfig = getInterestBearingMintConfigState(mintInfo);
                if (interestConfig) {
                    extensions.push('InterestBearing');
                }
            } catch (e) {
                // No interest bearing extension
            }
            
            return {
                mint,
                decimals: mintInfo.decimals,
                supply: mintInfo.supply,
                extensions,
                transferFeeConfig,
                interestConfig,
            };
        } catch (error) {
            logger.error('Failed to get Token22 info', { error, mint: mint.toString() });
            return null;
        }
    }

    /**
     * Transfer Token22 with fee calculation
     */
    async transferToken22WithFee(
        mint: PublicKey,
        destination: PublicKey,
        amount: bigint,
        decimals: number
    ): Promise<string> {
        await this.rateLimiter.checkLimit('token22-transfer');
        
        const walletKeypair = await this.getKeyManager().getAgentKeypair();
        
        try {
            // Get mint info
            const mintInfo = await getMint(
                this.connection,
                mint,
                'confirmed',
                TOKEN_2022_PROGRAM_ID
            );
            
            // Get or create associated token accounts
            const sourceAccount = await createAssociatedTokenAccountIdempotent(
                this.connection,
                walletKeypair,
                mint,
                walletKeypair.publicKey,
                {},
                TOKEN_2022_PROGRAM_ID
            );
            
            const destinationAccount = await createAssociatedTokenAccountIdempotent(
                this.connection,
                walletKeypair,
                mint,
                destination,
                {},
                TOKEN_2022_PROGRAM_ID
            );
            
            // Check for transfer fees
            let transferFeeConfig;
            try {
                transferFeeConfig = getTransferFeeConfig(mintInfo);
            } catch (e) {
                // No transfer fee
            }
            
            const transaction = new Transaction();
            
            if (transferFeeConfig) {
                // Use transfer with fee instruction
                const fee = this.calculateTransferFee(
                    amount,
                    transferFeeConfig.newerTransferFee.transferFeeBasisPoints,
                    BigInt(transferFeeConfig.newerTransferFee.maximumFee.toString())
                );
                
                transaction.add(
                    createTransferCheckedWithFeeInstruction(
                        sourceAccount,
                        mint,
                        destinationAccount,
                        walletKeypair.publicKey,
                        amount,
                        decimals,
                        fee,
                        []
                        TOKEN_2022_PROGRAM_ID
                    )
                );
                
                logger.info('Transfer with fee calculated', {
                    amount: amount.toString(),
                    fee: fee.toString(),
                });
            } else {
                // Regular transfer
                const { createTransferCheckedInstruction } = await import('@solana/spl-token');
                transaction.add(
                    createTransferCheckedInstruction(
                        sourceAccount,
                        mint,
                        destinationAccount,
                        walletKeypair.publicKey,
                        amount,
                        decimals,
                        []
                        TOKEN_2022_PROGRAM_ID
                    )
                );
            }
            
            const signature = await this.connection.sendTransaction(
                transaction,
                [walletKeypair],
                { skipPreflight: false }
            );
            
            await this.connection.confirmTransaction(signature, 'confirmed');
            
            logger.info('Token22 transferred successfully', {
                mint: mint.toString(),
                destination: destination.toString(),
                amount: amount.toString(),
                signature,
            });
            
            return signature;
        } catch (error) {
            logger.error('Failed to transfer Token22', { error });
            throw error;
        }
    }

    /**
     * Mint Token22 tokens
     */
    async mintToken22(
        mint: PublicKey,
        destination: PublicKey,
        amount: bigint
    ): Promise<string> {
        await this.rateLimiter.checkLimit('token22-mint');
        
        const walletKeypair = await this.getKeyManager().getAgentKeypair();
        
        try {
            // Get or create associated token account
            const destinationAccount = await createAssociatedTokenAccountIdempotent(
                this.connection,
                walletKeypair,
                mint,
                destination,
                {},
                TOKEN_2022_PROGRAM_ID
            );
            
            const transaction = new Transaction();
            
            transaction.add(
                createMintToInstruction(
                    mint,
                    destinationAccount,
                    walletKeypair.publicKey,
                    amount,
                    []
                    TOKEN_2022_PROGRAM_ID
                )
            );
            
            const signature = await this.connection.sendTransaction(
                transaction,
                [walletKeypair],
                { skipPreflight: false }
            );
            
            await this.connection.confirmTransaction(signature, 'confirmed');
            
            logger.info('Token22 minted successfully', {
                mint: mint.toString(),
                destination: destination.toString(),
                amount: amount.toString(),
                signature,
            });
            
            return signature;
        } catch (error) {
            logger.error('Failed to mint Token22', { error });
            throw error;
        }
    }

    /**
     * Get Token22 account balance with interest calculation
     */
    async getToken22Balance(
        mint: PublicKey,
        owner: PublicKey
    ): Promise<{ balance: bigint; withInterest?: bigint }> {
        await this.rateLimiter.checkLimit('token22-balance');
        
        try {
            // Get mint info
            const mintInfo = await getMint(
                this.connection,
                mint,
                'confirmed',
                TOKEN_2022_PROGRAM_ID
            );
            
            // Check for interest bearing
            let interestConfig;
            try {
                interestConfig = getInterestBearingMintConfigState(mintInfo);
            } catch (e) {
                // No interest bearing
            }
            
            // Get token account
            const { getAssociatedTokenAddress } = await import('@solana/spl-token');
            const tokenAccount = await getAssociatedTokenAddress(
                mint,
                owner,
                false,
                TOKEN_2022_PROGRAM_ID
            );
            
            const accountInfo = await getAccount(
                this.connection,
                tokenAccount,
                'confirmed',
                TOKEN_2022_PROGRAM_ID
            );
            
            const balance = accountInfo.amount;
            
            if (interestConfig) {
                // Calculate interest
                const currentTimestamp = Math.floor(Date.now() / 1000);
                const timeDiff = currentTimestamp - Number(interestConfig.initializationTimestamp);
                const rateBasicPoints = Number((interestConfig as any).rateBasicPoints || 0);
                const rate = rateBasicPoints / 10000; // Convert basis points
                const withInterest = balance + (balance * BigInt(Math.floor(rate * timeDiff)));
                
                return { balance, withInterest };
            }
            
            return { balance };
        } catch (error) {
            logger.error('Failed to get Token22 balance', { error });
            return { balance: 0n };
        }
    }

    /**
     * Calculate transfer fee
     */
    private calculateTransferFee(
        amount: bigint,
        feeBasisPoints: number,
        maximumFee: bigint
    ): bigint {
        const fee = (amount * BigInt(feeBasisPoints)) / 10000n;
        return fee > maximumFee ? maximumFee : fee;
    }

    /**
     * Check if a mint has specific extension
     */
    async hasExtension(
        mint: PublicKey,
        extensionType: ExtensionType
    ): Promise<boolean> {
        const info = await this.getToken22Info(mint);
        if (!info) return false;
        
        const extensionName = ExtensionType[extensionType];
        return info.extensions.includes(extensionName);
    }

    /**
     * Get all Token22 accounts for a wallet
     */
    async getToken22Accounts(owner: PublicKey): Promise<Array<{
        mint: PublicKey;
        account: PublicKey;
        balance: bigint;
        extensions: string[];
    }>> {
        await this.rateLimiter.checkLimit('token22-accounts');
        
        try {
            const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(
                owner,
                { programId: TOKEN_2022_PROGRAM_ID }
            );
            
            const accounts = [];
            
            for (const account of tokenAccounts.value) {
                const mint = new PublicKey(account.account.data.parsed.info.mint);
                const info = await this.getToken22Info(mint);
                
                if (info) {
                    accounts.push({
                        mint,
                        account: account.pubkey,
                        balance: BigInt(account.account.data.parsed.info.tokenAmount.amount),
                        extensions: info.extensions,
                    });
                }
            }
            
            return accounts;
        } catch (error) {
            logger.error('Failed to get Token22 accounts', { error });
            return [];
        }
    }
} 