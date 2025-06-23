import {
    Connection,
    PublicKey,
    Transaction,
    Keypair,
    SystemProgram,
    TransactionInstruction,
} from '@solana/web3.js';
import { IAgentRuntime, logger, Service } from '@elizaos/core';
import { SecureKeyManager } from './SecureKeyManager';
import { RateLimiter } from '../utils/rateLimiter';
import bs58 from 'bs58';

interface MultiSigWallet {
    address: PublicKey;
    owners: PublicKey[];
    threshold: number;
    nonce: number;
    ownerSetSeqno: number;
}

interface MultiSigTransaction {
    index: number;
    signers: boolean[];
    owners: PublicKey[];
    data: Buffer;
    didExecute: boolean;
}

interface PendingTransaction {
    id: string;
    wallet: PublicKey;
    transaction: Transaction;
    signers: PublicKey[];
    executed: boolean;
}

export class MultiSigService extends Service {
    static serviceName = "multisig";
    static serviceType = "multisig-service";
    capabilityDescription = "Multi-signature wallet operations on Solana";

    private connection: Connection;
    protected runtime: IAgentRuntime;
    private keyManager: SecureKeyManager | null = null;
    private rateLimiter: RateLimiter;
    
    // Serum multisig program ID
    private readonly MULTISIG_PROGRAM_ID = new PublicKey('msigmtwzgXJHj2ext4XJjCDmpbcMuufFb5cHuwg6Xdt');

    constructor(runtime: IAgentRuntime) {
        super();
        this.runtime = runtime;
        this.connection = new Connection(
            runtime.getSetting("SOLANA_RPC_URL") || "https://api.mainnet-beta.solana.com"
        );
        this.rateLimiter = new RateLimiter({ maxRequests: 10, windowMs: 60000 });
    }

    static async start(runtime: IAgentRuntime): Promise<MultiSigService> {
        const service = new MultiSigService(runtime);
        await service.initialize();
        return service;
    }

    async initialize(): Promise<void> {
        // Don't get key manager during initialization
        // It will be retrieved lazily when needed
        logger.info("MultiSigService initialized");
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
     * Create a new multi-sig wallet
     */
    async createMultiSig(
        owners: PublicKey[]
        threshold: number
    ): Promise<{ multiSig: PublicKey; transaction: string }> {
        await this.rateLimiter.checkLimit('multisig-create');
        
        if (owners.length < threshold) {
            throw new Error('Threshold cannot be greater than number of owners');
        }
        
        if (threshold < 1) {
            throw new Error('Threshold must be at least 1');
        }
        
        const walletKeypair = await this.getKeyManager().getAgentKeypair();
        
        try {
            // Generate multisig account
            const multiSigKeypair = Keypair.generate();
            
            // Calculate space for multisig account
            const space = this.getMultiSigSpace(owners.length);
            const rent = await this.connection.getMinimumBalanceForRentExemption(space);
            
            const transaction = new Transaction();
            
            // Create multisig account
            transaction.add(
                SystemProgram.createAccount({
                    fromPubkey: walletKeypair.publicKey,
                    newAccountPubkey: multiSigKeypair.publicKey,
                    lamports: rent,
                    space,
                    programId: this.MULTISIG_PROGRAM_ID,
                })
            );
            
            // Initialize multisig
            transaction.add(
                this.createInitMultiSigInstruction(
                    multiSigKeypair.publicKey,
                    owners,
                    threshold
                )
            );
            
            const signature = await this.connection.sendTransaction(
                transaction,
                [walletKeypair, multiSigKeypair],
                { skipPreflight: false }
            );
            
            await this.connection.confirmTransaction(signature, 'confirmed');
            
            logger.info('Multi-sig wallet created', {
                multiSig: multiSigKeypair.publicKey.toString(),
                owners: owners.map(o => o.toString()),
                threshold,
                signature,
            });
            
            return {
                multiSig: multiSigKeypair.publicKey,
                transaction: signature,
            };
        } catch (error) {
            logger.error('Failed to create multi-sig', { error });
            throw error;
        }
    }

    /**
     * Create a transaction proposal for multi-sig
     */
    async createTransaction(
        multiSig: PublicKey,
        instructions: TransactionInstruction[]
    ): Promise<{ transactionAccount: PublicKey; signature: string }> {
        await this.rateLimiter.checkLimit('multisig-tx-create');
        
        const walletKeypair = await this.getKeyManager().getAgentKeypair();
        
        try {
            // Get multisig info
            const multiSigInfo = await this.getMultiSigInfo(multiSig);
            if (!multiSigInfo) {
                throw new Error('Multi-sig wallet not found');
            }
            
            // Check if we're an owner
            const isOwner = multiSigInfo.owners.some(owner => 
                owner.equals(walletKeypair.publicKey)
            );
            
            if (!isOwner) {
                throw new Error('Not an owner of this multi-sig wallet');
            }
            
            // Create transaction account
            const transactionKeypair = Keypair.generate();
            const transactionSize = 1000 + instructions.length * 100; // Estimate
            const rent = await this.connection.getMinimumBalanceForRentExemption(transactionSize);
            
            const transaction = new Transaction();
            
            // Create transaction account
            transaction.add(
                SystemProgram.createAccount({
                    fromPubkey: walletKeypair.publicKey,
                    newAccountPubkey: transactionKeypair.publicKey,
                    lamports: rent,
                    space: transactionSize,
                    programId: this.MULTISIG_PROGRAM_ID,
                })
            );
            
            // Create transaction proposal
            transaction.add(
                this.createCreateTransactionInstruction(
                    multiSig,
                    transactionKeypair.publicKey,
                    walletKeypair.publicKey,
                    instructions
                )
            );
            
            const signature = await this.connection.sendTransaction(
                transaction,
                [walletKeypair, transactionKeypair],
                { skipPreflight: false }
            );
            
            await this.connection.confirmTransaction(signature, 'confirmed');
            
            logger.info('Multi-sig transaction created', {
                multiSig: multiSig.toString(),
                transactionAccount: transactionKeypair.publicKey.toString(),
                signature,
            });
            
            return {
                transactionAccount: transactionKeypair.publicKey,
                signature,
            };
        } catch (error) {
            logger.error('Failed to create multi-sig transaction', { error });
            throw error;
        }
    }

    /**
     * Approve a multi-sig transaction
     */
    async approveTransaction(
        multiSig: PublicKey,
        transactionAccount: PublicKey
    ): Promise<string> {
        await this.rateLimiter.checkLimit('multisig-approve');
        
        const walletKeypair = await this.getKeyManager().getAgentKeypair();
        
        try {
            // Get multisig info
            const multiSigInfo = await this.getMultiSigInfo(multiSig);
            if (!multiSigInfo) {
                throw new Error('Multi-sig wallet not found');
            }
            
            // Check if we're an owner
            const ownerIndex = multiSigInfo.owners.findIndex(owner => 
                owner.equals(walletKeypair.publicKey)
            );
            
            if (ownerIndex === -1) {
                throw new Error('Not an owner of this multi-sig wallet');
            }
            
            const transaction = new Transaction();
            
            transaction.add(
                this.createApproveInstruction(
                    multiSig,
                    transactionAccount,
                    walletKeypair.publicKey
                )
            );
            
            const signature = await this.connection.sendTransaction(
                transaction,
                [walletKeypair],
                { skipPreflight: false }
            );
            
            await this.connection.confirmTransaction(signature, 'confirmed');
            
            logger.info('Multi-sig transaction approved', {
                multiSig: multiSig.toString(),
                transactionAccount: transactionAccount.toString(),
                approver: walletKeypair.publicKey.toString(),
                signature,
            });
            
            return signature;
        } catch (error) {
            logger.error('Failed to approve multi-sig transaction', { error });
            throw error;
        }
    }

    /**
     * Execute an approved multi-sig transaction
     */
    async executeTransaction(
        multiSig: PublicKey,
        transactionAccount: PublicKey
    ): Promise<string> {
        await this.rateLimiter.checkLimit('multisig-execute');
        
        const walletKeypair = await this.getKeyManager().getAgentKeypair();
        
        try {
            // Get transaction info
            const txInfo = await this.getTransactionInfo(transactionAccount);
            if (!txInfo) {
                throw new Error('Transaction not found');
            }
            
            if (txInfo.didExecute) {
                throw new Error('Transaction already executed');
            }
            
            // Count approvals
            const approvalCount = txInfo.signers.filter(s => s).length;
            const multiSigInfo = await this.getMultiSigInfo(multiSig);
            
            if (!multiSigInfo) {
                throw new Error('Multi-sig wallet not found');
            }
            
            if (approvalCount < multiSigInfo.threshold) {
                throw new Error(
                    `Not enough approvals. Need ${multiSigInfo.threshold}, have ${approvalCount}`
                );
            }
            
            const transaction = new Transaction();
            
            transaction.add(
                this.createExecuteTransactionInstruction(
                    multiSig,
                    transactionAccount,
                    walletKeypair.publicKey
                )
            );
            
            const signature = await this.connection.sendTransaction(
                transaction,
                [walletKeypair],
                { skipPreflight: false }
            );
            
            await this.connection.confirmTransaction(signature, 'confirmed');
            
            logger.info('Multi-sig transaction executed', {
                multiSig: multiSig.toString(),
                transactionAccount: transactionAccount.toString(),
                signature,
            });
            
            return signature;
        } catch (error) {
            logger.error('Failed to execute multi-sig transaction', { error });
            throw error;
        }
    }

    /**
     * Get multi-sig wallet info
     */
    async getMultiSigInfo(multiSig: PublicKey): Promise<MultiSigWallet | null> {
        await this.rateLimiter.checkLimit('multisig-info');
        
        try {
            const accountInfo = await this.connection.getAccountInfo(multiSig);
            if (!accountInfo) {
                return null;
            }
            
            // Parse multisig account data
            // This is simplified - actual parsing would depend on the program's data layout
            const data = accountInfo.data;
            
            // Mock implementation - replace with actual parsing
            return {
                address: multiSig,
                owners: [] // Parse from data
                threshold: 2, // Parse from data
                nonce: 0, // Parse from data
                ownerSetSeqno: 0, // Parse from data
            };
        } catch (error) {
            logger.error('Failed to get multi-sig info', { error });
            return null;
        }
    }

    /**
     * Get transaction info
     */
    private async getTransactionInfo(
        transactionAccount: PublicKey
    ): Promise<MultiSigTransaction | null> {
        try {
            const accountInfo = await this.connection.getAccountInfo(transactionAccount);
            if (!accountInfo) {
                return null;
            }
            
            // Parse transaction account data
            // This is simplified - actual parsing would depend on the program's data layout
            return {
                index: 0,
                signers: [true, false], // Parse from data
                owners: [] // Parse from data
                data: Buffer.alloc(0), // Parse from data
                didExecute: false, // Parse from data
            };
        } catch (error) {
            logger.error('Failed to get transaction info', { error });
            return null;
        }
    }

    /**
     * Get all pending transactions for a multi-sig
     */
    async getPendingTransactions(multiSig: PublicKey): Promise<PublicKey[]> {
        await this.rateLimiter.checkLimit('multisig-pending');
        
        try {
            // This would query all transaction accounts for the multisig
            // For now, return empty array
            return [];
        } catch (error) {
            logger.error('Failed to get pending transactions', { error });
            return [];
        }
    }

    // Helper methods for creating instructions
    
    private getMultiSigSpace(numOwners: number): number {
        // Base size + owners array
        return 355 + numOwners * 32;
    }
    
    private createInitMultiSigInstruction(
        multiSig: PublicKey,
        owners: PublicKey[]
        threshold: number
    ): TransactionInstruction {
        // This would create the actual instruction
        // Simplified for example
        return new TransactionInstruction({
            programId: this.MULTISIG_PROGRAM_ID,
            keys: [
                { pubkey: multiSig, isSigner: false, isWritable: true },
                ...owners.map(owner => ({
                    pubkey: owner,
                    isSigner: false,
                    isWritable: false,
                })),
            ],
            data: Buffer.from([0, threshold]), // Instruction discriminator + threshold
        });
    }
    
    private createCreateTransactionInstruction(
        multiSig: PublicKey,
        transaction: PublicKey,
        proposer: PublicKey,
        instructions: TransactionInstruction[]
    ): TransactionInstruction {
        // Serialize instructions
        // This is simplified - actual implementation would properly serialize
        return new TransactionInstruction({
            programId: this.MULTISIG_PROGRAM_ID,
            keys: [
                { pubkey: multiSig, isSigner: false, isWritable: true },
                { pubkey: transaction, isSigner: false, isWritable: true },
                { pubkey: proposer, isSigner: true, isWritable: false },
            ],
            data: Buffer.from([1]), // Create transaction instruction
        });
    }
    
    private createApproveInstruction(
        multiSig: PublicKey,
        transaction: PublicKey,
        owner: PublicKey
    ): TransactionInstruction {
        return new TransactionInstruction({
            programId: this.MULTISIG_PROGRAM_ID,
            keys: [
                { pubkey: multiSig, isSigner: false, isWritable: false },
                { pubkey: transaction, isSigner: false, isWritable: true },
                { pubkey: owner, isSigner: true, isWritable: false },
            ],
            data: Buffer.from([2]), // Approve instruction
        });
    }
    
    private createExecuteTransactionInstruction(
        multiSig: PublicKey,
        transaction: PublicKey,
        payer: PublicKey
    ): TransactionInstruction {
        return new TransactionInstruction({
            programId: this.MULTISIG_PROGRAM_ID,
            keys: [
                { pubkey: multiSig, isSigner: false, isWritable: true },
                { pubkey: transaction, isSigner: false, isWritable: true },
                { pubkey: payer, isSigner: true, isWritable: false },
            ],
            data: Buffer.from([3]), // Execute instruction
        });
    }
} 