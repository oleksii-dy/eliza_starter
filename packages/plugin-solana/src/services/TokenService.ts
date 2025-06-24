import { IAgentRuntime, logger, Service } from '@elizaos/core';
import {
  Connection,
  PublicKey,
  ParsedAccountData,
  RpcResponseAndContext,
  AccountInfo,
} from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  getAccount,
  getMint,
  Mint,
} from '@solana/spl-token';
import axios from 'axios';

export interface TokenInfo {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
  tags?: string[];
  daily_volume?: number;
  created_at?: string;
  freeze_authority?: string;
  mint_authority?: string;
  permanent_delegate?: string;
  extensions?: any;
}

export interface TokenAccount {
  pubkey: PublicKey;
  mint: PublicKey;
  owner: PublicKey;
  amount: bigint;
  decimals: number;
  isNative: boolean;
}

export interface TokenListResponse {
  [mintAddress: string]: TokenInfo;
}

export class TokenService extends Service {
  static serviceName = 'token-service';
  static serviceType = 'token-service';
  capabilityDescription =
    'Comprehensive token metadata resolution, token list management, and token operations';

  private connection: Connection;
  private tokenListCache: Map<string, TokenInfo> = new Map();
  private lastTokenListUpdate: number = 0;
  private tokenListUpdateInterval = 3600000; // 1 hour
  private jupiterApiBase = 'https://tokens.jup.ag';

  constructor(runtime: IAgentRuntime) {
    super(runtime);

    const rpcService = runtime.getService('rpc-service') as any;
    if (rpcService && typeof rpcService.getConnection === 'function') {
      this.connection = rpcService.getConnection();
    } else {
      const rpcUrl = runtime.getSetting('SOLANA_RPC_URL') || 'https://api.mainnet-beta.solana.com';
      this.connection = new Connection(rpcUrl, 'confirmed');
    }

    logger.info('TokenService initialized');
  }

  static async start(runtime: IAgentRuntime): Promise<TokenService> {
    const service = new TokenService(runtime);
    await service.initialize();
    return service;
  }

  async initialize(): Promise<void> {
    // Load token list on startup
    await this.updateTokenList();

    // Set up periodic updates
    setInterval(() => {
      this.updateTokenList().catch((err) => logger.error('Failed to update token list:', err));
    }, this.tokenListUpdateInterval);
  }

  async stop(): Promise<void> {
    // Clean up any resources
    this.tokenListCache.clear();
    logger.info('TokenService stopped');
  }

  /**
   * Update the token list from Jupiter
   */
  private async updateTokenList(): Promise<void> {
    try {
      logger.info('Updating token list from Jupiter...');

      const response = await axios.get<TokenInfo[]>(`${this.jupiterApiBase}/tokens_list`, {
        timeout: 30000,
      });

      if (!response.data || !Array.isArray(response.data)) {
        throw new Error('Invalid token list response');
      }

      // Clear old cache
      this.tokenListCache.clear();

      // Populate cache
      for (const token of response.data) {
        this.tokenListCache.set(token.address, token);
      }

      this.lastTokenListUpdate = Date.now();
      logger.info(`Token list updated with ${this.tokenListCache.size} tokens`);
    } catch (error) {
      logger.error('Failed to update token list:', error);

      // If we have no cache at all, try a fallback
      if (this.tokenListCache.size === 0) {
        this.loadFallbackTokens();
      }
    }
  }

  /**
   * Load fallback tokens for common ones
   */
  private loadFallbackTokens(): void {
    const fallbackTokens: TokenInfo[] = [
      {
        address: 'So11111111111111111111111111111111111111112',
        symbol: 'SOL',
        name: 'Solana',
        decimals: 9,
        logoURI:
          'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
      },
      {
        address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        symbol: 'USDC',
        name: 'USD Coin',
        decimals: 6,
        logoURI:
          'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png',
      },
      {
        address: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
        symbol: 'USDT',
        name: 'USDT',
        decimals: 6,
        logoURI:
          'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB/logo.png',
      },
    ];

    for (const token of fallbackTokens) {
      this.tokenListCache.set(token.address, token);
    }
  }

  /**
   * Get token metadata from on-chain data
   */
  async getTokenMetadata(mintAddress: string): Promise<{
    mint: string;
    decimals: number;
    supply: string;
    mintAuthority: string | null;
    freezeAuthority: string | null;
  } | null> {
    try {
      const mintPubkey = new PublicKey(mintAddress);
      const accountInfo = await this.connection.getParsedAccountInfo(mintPubkey);

      if (!accountInfo.value || !accountInfo.value.data) {
        return null;
      }

      const data = accountInfo.value.data as ParsedAccountData;
      const info = data.parsed.info;

      return {
        mint: mintAddress,
        decimals: info.decimals,
        supply: info.supply,
        mintAuthority: info.mintAuthority,
        freezeAuthority: info.freezeAuthority,
      };
    } catch (error) {
      logger.error(`Error fetching token metadata for ${mintAddress}:`, error);
      return null;
    }
  }

  /**
   * Get token info by mint address
   */
  async getTokenInfo(mintAddress: string): Promise<TokenInfo | null> {
    // Check cache first
    const cached = this.tokenListCache.get(mintAddress);
    if (cached) {
      return cached;
    }

    // Try to fetch from Jupiter API directly
    try {
      const response = await axios.get<TokenInfo>(`${this.jupiterApiBase}/token/${mintAddress}`, {
        timeout: 5000,
      });

      if (response.data) {
        // Cache it
        this.tokenListCache.set(mintAddress, response.data);
        return response.data;
      }
    } catch (error) {
      logger.debug(`Token not found in Jupiter: ${mintAddress}`);
    }

    // Fallback: Get basic info from chain
    try {
      const mintPubkey = new PublicKey(mintAddress);
      const mintInfo = await getMint(this.connection, mintPubkey);

      return {
        address: mintAddress,
        symbol: `${mintAddress.slice(0, 4)}...${mintAddress.slice(-4)}`,
        name: 'Unknown Token',
        decimals: mintInfo.decimals,
      };
    } catch (error) {
      logger.error(`Failed to get token info for ${mintAddress}:`, error);
      return null;
    }
  }

  /**
   * Get multiple token infos efficiently
   */
  async getMultipleTokenInfo(mintAddresses: string[]): Promise<Map<string, TokenInfo>> {
    const result = new Map<string, TokenInfo>();

    // Check cache first
    const uncached: string[] = [];
    for (const mint of mintAddresses) {
      const cached = this.tokenListCache.get(mint);
      if (cached) {
        result.set(mint, cached);
      } else {
        uncached.push(mint);
      }
    }

    // Fetch uncached tokens
    if (uncached.length > 0) {
      // Batch fetch from chain
      const mintPubkeys = uncached.map((m) => new PublicKey(m));
      const mintInfos = await this.connection.getMultipleAccountsInfo(mintPubkeys);

      for (let i = 0; i < uncached.length; i++) {
        const mintAddress = uncached[i];
        const accountInfo = mintInfos[i];

        if (accountInfo) {
          try {
            const mintInfo = await getMint(this.connection, new PublicKey(mintAddress));
            const tokenInfo: TokenInfo = {
              address: mintAddress,
              symbol: `${mintAddress.slice(0, 4)}...${mintAddress.slice(-4)}`,
              name: 'Unknown Token',
              decimals: mintInfo.decimals,
            };
            result.set(mintAddress, tokenInfo);
          } catch (error) {
            logger.debug(`Failed to parse mint ${mintAddress}`);
          }
        }
      }
    }

    return result;
  }

  /**
   * Search tokens by symbol or name
   */
  searchTokens(query: string, limit: number = 10): TokenInfo[] {
    const lowerQuery = query.toLowerCase();
    const results: TokenInfo[] = [];

    for (const token of this.tokenListCache.values()) {
      if (results.length >= limit) {
        break;
      }

      if (
        token.symbol.toLowerCase().includes(lowerQuery) ||
        token.name.toLowerCase().includes(lowerQuery)
      ) {
        results.push(token);
      }
    }

    // Sort by daily volume if available
    results.sort((a, b) => (b.daily_volume || 0) - (a.daily_volume || 0));

    return results;
  }

  /**
   * Get or create associated token account
   */
  async getOrCreateTokenAccount(
    mint: PublicKey,
    owner: PublicKey,
    payer?: PublicKey
  ): Promise<{ address: PublicKey; instruction?: any }> {
    const ata = await getAssociatedTokenAddress(mint, owner);

    try {
      // Check if account exists
      await getAccount(this.connection, ata);
      return { address: ata };
    } catch (error) {
      // Account doesn't exist, create instruction
      if (!payer) {
        throw new Error('Payer required to create token account');
      }

      const instruction = createAssociatedTokenAccountInstruction(payer, ata, owner, mint);

      return { address: ata, instruction };
    }
  }

  /**
   * Get all token accounts for a wallet, optionally filtered by mint
   */
  async getTokenAccounts(walletAddress: string, mintAddress?: string): Promise<TokenAccount[]> {
    try {
      const walletPubkey = new PublicKey(walletAddress);
      const tokenAccounts: TokenAccount[] = [];

      if (mintAddress) {
        // Filter by specific mint
        const mintPubkey = new PublicKey(mintAddress);
        const accounts = await this.connection.getParsedTokenAccountsByOwner(walletPubkey, {
          mint: mintPubkey,
        });

        for (const { pubkey, account } of accounts.value) {
          const data = account.data as ParsedAccountData;
          const info = data.parsed.info;

          tokenAccounts.push({
            pubkey,
            mint: new PublicKey(info.mint),
            owner: new PublicKey(info.owner),
            amount: BigInt(info.tokenAmount.amount),
            decimals: info.tokenAmount.decimals,
            isNative: info.isNative || false,
          });
        }

        return tokenAccounts;
      }

      // Get all token accounts
      const accounts = await this.connection.getParsedTokenAccountsByOwner(walletPubkey, {
        programId: TOKEN_PROGRAM_ID,
      });

      // Get Token2022 accounts
      const token2022Accounts = await this.connection.getParsedTokenAccountsByOwner(walletPubkey, {
        programId: TOKEN_2022_PROGRAM_ID,
      });

      const allAccounts = [...accounts.value, ...token2022Accounts.value];

      for (const { pubkey, account } of allAccounts) {
        const data = account.data as ParsedAccountData;
        const info = data.parsed.info;

        tokenAccounts.push({
          pubkey,
          mint: new PublicKey(info.mint),
          owner: new PublicKey(info.owner),
          amount: BigInt(info.tokenAmount.amount),
          decimals: info.tokenAmount.decimals,
          isNative: info.isNative || false,
        });
      }

      return tokenAccounts;
    } catch (error) {
      logger.error('Error fetching token accounts:', error);
      return [];
    }
  }

  /**
   * Check if a mint is a Token2022
   */
  async isToken2022(mint: PublicKey): Promise<boolean> {
    try {
      const accountInfo = await this.connection.getAccountInfo(mint);
      return accountInfo?.owner.equals(TOKEN_2022_PROGRAM_ID) || false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get mint info with proper program handling
   */
  async getMintInfo(mintAddress: string): Promise<Mint | null> {
    try {
      const mintPubkey = new PublicKey(mintAddress);

      // First try standard token program
      try {
        return await getMint(this.connection, mintPubkey, undefined, TOKEN_PROGRAM_ID);
      } catch {
        // Try Token2022
        return await getMint(this.connection, mintPubkey, undefined, TOKEN_2022_PROGRAM_ID);
      }
    } catch (error) {
      logger.error(`Failed to get mint info for ${mintAddress}:`, error);
      return null;
    }
  }

  /**
   * Get popular tokens
   */
  getPopularTokens(limit: number = 20): TokenInfo[] {
    const tokens = Array.from(this.tokenListCache.values())
      .filter((t) => t.daily_volume && t.daily_volume > 0)
      .sort((a, b) => (b.daily_volume || 0) - (a.daily_volume || 0))
      .slice(0, limit);

    return tokens;
  }

  /**
   * Validate token address
   */
  isValidTokenAddress(address: string): boolean {
    try {
      const pubkey = new PublicKey(address);
      return PublicKey.isOnCurve(pubkey);
    } catch {
      return false;
    }
  }
}
