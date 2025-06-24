import { Connection, PublicKey, Transaction, Keypair, SystemProgram } from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createInitializeMintInstruction,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
  getAssociatedTokenAddress,
  getAccount,
  createTransferInstruction,
} from '@solana/spl-token';
import { IAgentRuntime, logger, Service } from '@elizaos/core';
import { SecureKeyManager } from './SecureKeyManager';
import { RateLimiter } from '../utils/rateLimiter';

interface NftMetadata {
  name: string;
  symbol: string;
  description: string;
  image: string;
  attributes?: Array<{
    trait_type: string;
    value: string | number;
  }>;
  properties?: {
    files?: Array<{
      uri: string;
      type: string;
    }>;
    category?: string;
  };
}

interface MarketplaceListing {
  nftMint: PublicKey;
  seller: PublicKey;
  price: number;
  marketplace: 'magiceden' | 'tensor' | 'solanart';
}

interface NftCreationResult {
  mint: PublicKey;
  tokenAccount: PublicKey;
  signature: string;
}

interface NftInfo {
  mint: PublicKey;
  account: PublicKey;
  amount: bigint;
}

export class NftService extends Service {
  static serviceName = 'nft';
  static serviceType = 'nft-service';
  capabilityDescription = 'NFT minting, transfer, and marketplace operations on Solana';

  private connection: Connection;
  protected runtime: IAgentRuntime;
  private keyManager: SecureKeyManager | null = null;
  private rateLimiter: RateLimiter;
  private marketplaceEndpoints: Record<string, string> = {
    magiceden: 'https://api-mainnet.magiceden.dev/v2',
    tensor: 'https://api.tensor.so/graphql',
  };
  private metaplexUrl = 'https://api.metaplex.com/v1';

  constructor(runtime: IAgentRuntime) {
    super();
    this.runtime = runtime;
    this.connection = new Connection(
      runtime.getSetting('SOLANA_RPC_URL') || 'https://api.mainnet-beta.solana.com'
    );
    this.rateLimiter = new RateLimiter({
      maxRequests: 30,
      windowMs: 60000,
    });
  }

  static async start(runtime: IAgentRuntime): Promise<NftService> {
    const service = new NftService(runtime);
    await service.initialize();
    return service;
  }

  async initialize(): Promise<void> {
    // Don't get key manager during initialization
    // It will be retrieved lazily when needed
    logger.info('NftService initialized');
  }

  private getKeyManager(): SecureKeyManager {
    if (!this.keyManager) {
      this.keyManager = this.runtime.getService('secure-key-manager') as SecureKeyManager;
      if (!this.keyManager) {
        throw new Error('SecureKeyManager service not available');
      }
    }
    return this.keyManager;
  }

  async stop(): Promise<void> {
    // No cleanup needed
  }

  /**
   * Create a simple NFT (Token with 0 decimals and supply of 1)
   * Note: This creates a basic NFT without Metaplex metadata
   * For full NFT functionality, Metaplex integration would be needed
   */
  async createBasicNft(
    name: string,
    symbol: string,
    recipient?: PublicKey
  ): Promise<{ mint: PublicKey; tokenAccount: PublicKey }> {
    await this.rateLimiter.checkLimit('nft-mint');

    const walletKeypair = await this.getKeyManager().getAgentKeypair();

    const mintKeypair = Keypair.generate();
    const recipientPubkey = recipient || walletKeypair.publicKey;

    // Get associated token account
    const associatedTokenAccount = await getAssociatedTokenAddress(
      mintKeypair.publicKey,
      recipientPubkey
    );

    const transaction = new Transaction();

    // Create mint account
    const mintRent = await this.connection.getMinimumBalanceForRentExemption(82);
    transaction.add(
      SystemProgram.createAccount({
        fromPubkey: walletKeypair.publicKey,
        newAccountPubkey: mintKeypair.publicKey,
        lamports: mintRent,
        space: 82,
        programId: TOKEN_PROGRAM_ID,
      })
    );

    // Initialize mint with 0 decimals
    transaction.add(
      createInitializeMintInstruction(
        mintKeypair.publicKey,
        0, // 0 decimals for NFT
        walletKeypair.publicKey,
        walletKeypair.publicKey
      )
    );

    // Create associated token account
    transaction.add(
      createAssociatedTokenAccountInstruction(
        walletKeypair.publicKey,
        associatedTokenAccount,
        recipientPubkey,
        mintKeypair.publicKey
      )
    );

    // Mint exactly 1 token
    transaction.add(
      createMintToInstruction(
        mintKeypair.publicKey,
        associatedTokenAccount,
        walletKeypair.publicKey,
        1
      )
    );

    // Send transaction
    const signature = await this.connection.sendTransaction(
      transaction,
      [walletKeypair, mintKeypair],
      { skipPreflight: false }
    );

    await this.connection.confirmTransaction(signature, 'confirmed');

    logger.info('Basic NFT created successfully', {
      mint: mintKeypair.publicKey.toString(),
      tokenAccount: associatedTokenAccount.toString(),
      signature,
    });

    return {
      mint: mintKeypair.publicKey,
      tokenAccount: associatedTokenAccount,
    };
  }

  /**
   * Transfer an NFT
   */
  async transferNft(nftMint: PublicKey, recipient: PublicKey): Promise<string> {
    await this.rateLimiter.checkLimit('nft-transfer');

    const walletKeypair = await this.getKeyManager().getAgentKeypair();

    // Get source and destination token accounts
    const sourceTokenAccount = await getAssociatedTokenAddress(nftMint, walletKeypair.publicKey);

    const destinationTokenAccount = await getAssociatedTokenAddress(nftMint, recipient);

    // Check if destination account exists
    let destinationAccountInfo;
    try {
      destinationAccountInfo = await getAccount(this.connection, destinationTokenAccount);
    } catch (error) {
      // Account doesn't exist, need to create it
      destinationAccountInfo = null;
    }

    const transaction = new Transaction();

    // Create destination account if needed
    if (!destinationAccountInfo) {
      transaction.add(
        createAssociatedTokenAccountInstruction(
          walletKeypair.publicKey,
          destinationTokenAccount,
          recipient,
          nftMint
        )
      );
    }

    // Transfer NFT
    transaction.add(
      createTransferInstruction(
        sourceTokenAccount,
        destinationTokenAccount,
        walletKeypair.publicKey,
        1
      )
    );

    const signature = await this.connection.sendTransaction(transaction, [walletKeypair], {
      skipPreflight: false,
    });

    await this.connection.confirmTransaction(signature, 'confirmed');

    logger.info('NFT transferred successfully', {
      mint: nftMint.toString(),
      recipient: recipient.toString(),
      signature,
    });

    return signature;
  }

  /**
   * Get user's NFT collection (tokens with 0 decimals and amount of 1)
   */
  async getUserNfts(owner: PublicKey): Promise<Array<{ mint: PublicKey; account: PublicKey }>> {
    await this.rateLimiter.checkLimit('nft-collection');

    const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(owner, {
      programId: TOKEN_PROGRAM_ID,
    });

    const nfts: Array<{ mint: PublicKey; account: PublicKey }> = [];

    for (const account of tokenAccounts.value) {
      const parsedInfo = account.account.data.parsed.info;

      // Check if it's an NFT (amount = 1, decimals = 0)
      if (parsedInfo.tokenAmount.uiAmount === 1 && parsedInfo.tokenAmount.decimals === 0) {
        nfts.push({
          mint: new PublicKey(parsedInfo.mint),
          account: account.pubkey,
        });
      }
    }

    return nfts;
  }

  /**
   * List NFT on marketplace (placeholder - requires marketplace SDK integration)
   */
  async listNftOnMarketplace(
    nftMint: PublicKey,
    price: number,
    marketplace: 'magiceden' | 'tensor' = 'magiceden'
  ): Promise<string> {
    await this.rateLimiter.checkLimit('nft-list');

    logger.info('Listing NFT on marketplace', {
      mint: nftMint.toString(),
      price,
      marketplace,
    });

    // In production, this would integrate with marketplace SDKs
    // For now, return a placeholder
    return `${marketplace}-listing-${Date.now()}`;
  }

  /**
   * Search NFTs on marketplaces (placeholder)
   */
  async searchMarketplace(
    query: string,
    marketplace: 'magiceden' | 'tensor' = 'magiceden',
    maxResults: number = 20
  ): Promise<MarketplaceListing[]> {
    await this.rateLimiter.checkLimit('nft-search');

    logger.info('Searching marketplace', {
      query,
      marketplace,
      maxResults,
    });

    // In production, this would use actual marketplace APIs
    return [];
  }

  /**
   * Buy NFT from marketplace (placeholder)
   */
  async buyNftFromMarketplace(listing: MarketplaceListing): Promise<string> {
    await this.rateLimiter.checkLimit('nft-buy');

    logger.info('Buying NFT from marketplace', {
      mint: listing.nftMint.toString(),
      price: listing.price,
      marketplace: listing.marketplace,
    });

    // In production, this would use marketplace SDKs
    return `${listing.marketplace}-buy-${Date.now()}`;
  }
}
