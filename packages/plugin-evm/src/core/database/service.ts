import { IAgentRuntime, logger, asUUID } from '@elizaos/core';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq, and, or, gte, lte, desc, asc, inArray, isNull } from 'drizzle-orm';
import postgres from 'postgres';
import {
  wallets,
  sessions,
  transactionHistory,
  tokenBalances,
  defiPositions,
  nftHoldings,
  gasPriceCache,
  contractAbiCache,
  ensCache,
  type Wallet,
  type NewWallet,
  type Session,
  type NewSession,
  type TransactionHistory as DBTransactionHistory,
  type NewTransactionHistory,
  type TokenBalance,
  type DefiPosition as DBDefiPosition,
  type NFTHolding as DBNFTHolding,
  type GasPriceCache,
  type ContractAbiCache,
  type EnsCache,
} from './schema';
import type {
  WalletInstance,
  SessionKey,
  WalletFilter,
  TransactionHistory,
  DefiPosition,
  NFTHolding,
  SessionPermission,
} from '../interfaces/IWalletService';
import { createEncryptionService } from '../security/encryption';
import type { Address, Hash, Hex } from 'viem';
import type { Chain } from 'viem/chains';
import type { UUID } from '@elizaos/core';

export class WalletDatabaseService {
  private db: ReturnType<typeof drizzle>;
  private encryptionService;

  constructor(private runtime: IAgentRuntime) {
    // Initialize database connection
    const connectionString =
      runtime.getSetting('DATABASE_URL') || runtime.getSetting('POSTGRES_URL');

    if (!connectionString) {
      throw new Error('No database connection string provided');
    }

    const client = postgres(connectionString);
    this.db = drizzle(client);
    this.encryptionService = createEncryptionService(runtime);
  }

  // Wallet management methods
  async createWallet(
    wallet: Omit<WalletInstance, 'id'>,
    privateKey?: string,
    mnemonic?: string,
  ): Promise<WalletInstance> {
    try {
      // Encrypt sensitive data if provided
      let encryptedPrivateKey: string | null = null;
      let encryptedMnemonic: string | null = null;

      if (privateKey) {
        encryptedPrivateKey = await this.encryptionService.encrypt(privateKey);
      }
      if (mnemonic) {
        encryptedMnemonic = await this.encryptionService.encrypt(mnemonic);
      }

      const newWallet: NewWallet = {
        agentId: asUUID(this.runtime.agentId),
        address: wallet.address.toLowerCase(),
        type: wallet.type,
        name: wallet.name,
        chainId: wallet.chain,
        isActive: wallet.isActive,
        metadata: wallet.metadata,
        encryptedPrivateKey,
        encryptedMnemonic,
        owners: wallet.owners?.map((o) => o.toLowerCase()),
        threshold: wallet.threshold,
        createdAt: new Date(wallet.createdAt),
        lastUsedAt: new Date(wallet.lastUsedAt),
        updatedAt: new Date(),
      };

      const [created] = await this.db.insert(wallets).values(newWallet).returning();

      return this.mapDbWalletToWalletInstance(created);
    } catch (error) {
      logger.error('Failed to create wallet:', error);
      throw error;
    }
  }

  async getWallet(walletId: string): Promise<WalletInstance | null> {
    try {
      const [wallet] = await this.db
        .select()
        .from(wallets)
        .where(
          and(eq(wallets.id, asUUID(walletId)), eq(wallets.agentId, asUUID(this.runtime.agentId))),
        );

      return wallet ? this.mapDbWalletToWalletInstance(wallet) : null;
    } catch (error) {
      logger.error('Failed to get wallet:', error);
      throw error;
    }
  }

  async getWalletByAddress(address: string): Promise<WalletInstance | null> {
    try {
      const [wallet] = await this.db
        .select()
        .from(wallets)
        .where(
          and(
            eq(wallets.address, address.toLowerCase()),
            eq(wallets.agentId, asUUID(this.runtime.agentId)),
          ),
        );

      return wallet ? this.mapDbWalletToWalletInstance(wallet) : null;
    } catch (error) {
      logger.error('Failed to get wallet by address:', error);
      throw error;
    }
  }

  async listWallets(filter?: WalletFilter): Promise<WalletInstance[]> {
    try {
      let query = this.db
        .select()
        .from(wallets)
        .where(eq(wallets.agentId, asUUID(this.runtime.agentId)));

      // Apply filters
      const conditions = [eq(wallets.agentId, asUUID(this.runtime.agentId))];
      if (filter?.type) {
        conditions.push(eq(wallets.type, filter.type));
      }
      if (filter?.chain !== undefined) {
        conditions.push(eq(wallets.chainId, filter.chain));
      }
      if (filter?.isActive !== undefined) {
        conditions.push(eq(wallets.isActive, filter.isActive));
      }
      if (filter?.owner) {
        // For filtering multisig wallets by owner
        conditions.push(
          // @ts-ignore - JSON contains operator exists in drizzle
          wallets.owners.contains([filter.owner.toLowerCase()]),
        );
      }

      if (conditions.length > 1) {
        query = this.db
          .select()
          .from(wallets)
          .where(and(...conditions));
      }

      const results = await query.orderBy(desc(wallets.createdAt));
      return results.map((w) => this.mapDbWalletToWalletInstance(w));
    } catch (error) {
      logger.error('Failed to list wallets:', error);
      throw error;
    }
  }

  async updateWallet(walletId: string, updates: Partial<WalletInstance>): Promise<WalletInstance> {
    try {
      const updateData: Record<string, any> = {
        name: updates.name,
        isActive: updates.isActive,
        metadata: updates.metadata,
        lastUsedAt: updates.lastUsedAt ? new Date(updates.lastUsedAt) : undefined,
        updatedAt: new Date(),
      };

      // Remove undefined values
      Object.keys(updateData).forEach((key) => {
        if (updateData[key as keyof typeof updateData] === undefined) {
          delete updateData[key as keyof typeof updateData];
        }
      });

      const [updated] = await this.db
        .update(wallets)
        .set(updateData)
        .where(
          and(eq(wallets.id, asUUID(walletId)), eq(wallets.agentId, asUUID(this.runtime.agentId))),
        )
        .returning();

      if (!updated) {
        throw new Error('Wallet not found');
      }

      return this.mapDbWalletToWalletInstance(updated);
    } catch (error) {
      logger.error('Failed to update wallet:', error);
      throw error;
    }
  }

  async deleteWallet(walletId: string): Promise<boolean> {
    try {
      const result = await this.db
        .delete(wallets)
        .where(
          and(eq(wallets.id, asUUID(walletId)), eq(wallets.agentId, asUUID(this.runtime.agentId))),
        );

      return true;
    } catch (error) {
      logger.error('Failed to delete wallet:', error);
      throw error;
    }
  }

  async getWalletPrivateKey(walletId: string): Promise<string | null> {
    try {
      const [wallet] = await this.db
        .select({ encryptedPrivateKey: wallets.encryptedPrivateKey })
        .from(wallets)
        .where(
          and(eq(wallets.id, asUUID(walletId)), eq(wallets.agentId, asUUID(this.runtime.agentId))),
        );

      if (!wallet?.encryptedPrivateKey) {
        return null;
      }

      return await this.encryptionService.decrypt(wallet.encryptedPrivateKey);
    } catch (error) {
      logger.error('Failed to get wallet private key:', error);
      throw error;
    }
  }

  async getWalletMnemonic(walletId: string): Promise<string | null> {
    try {
      const [wallet] = await this.db
        .select({ encryptedMnemonic: wallets.encryptedMnemonic })
        .from(wallets)
        .where(
          and(eq(wallets.id, asUUID(walletId)), eq(wallets.agentId, asUUID(this.runtime.agentId))),
        );

      if (!wallet?.encryptedMnemonic) {
        return null;
      }

      return await this.encryptionService.decrypt(wallet.encryptedMnemonic);
    } catch (error) {
      logger.error('Failed to get wallet mnemonic:', error);
      throw error;
    }
  }

  // Session management methods
  async createSession(session: Omit<SessionKey, 'id'>, privateKey: string): Promise<SessionKey> {
    try {
      const encryptedPrivateKey = await this.encryptionService.encrypt(privateKey);

      const newSession: NewSession = {
        walletId: asUUID((session as any).walletId || (session as any).walletAddress),
        publicKey: session.publicKey,
        encryptedPrivateKey,
        permissions: session.permissions,
        spendingLimits: (session as any).spendingLimit || (session as any).spendingLimits,
        allowedContracts: (session as any).allowedContracts,
        allowedMethods: (session as any).allowedMethods,
        expiresAt: new Date(session.expiresAt),
        isActive: session.isActive,
        usageCount: session.usageCount,
        lastUsedAt: session.lastUsedAt ? new Date(session.lastUsedAt) : null,
        createdAt: new Date(session.createdAt),
      };

      const [created] = await this.db.insert(sessions).values(newSession).returning();

      return this.mapDbSessionToSessionKey(created);
    } catch (error) {
      logger.error('Failed to create session:', error);
      throw error;
    }
  }

  async getSession(sessionId: string): Promise<SessionKey | null> {
    try {
      const [session] = await this.db
        .select()
        .from(sessions)
        .where(eq(sessions.id, asUUID(sessionId)));

      return session ? this.mapDbSessionToSessionKey(session) : null;
    } catch (error) {
      logger.error('Failed to get session:', error);
      throw error;
    }
  }

  async listSessions(walletId?: string): Promise<SessionKey[]> {
    try {
      const query = this.db.select().from(sessions);

      if (walletId) {
        const results = await this.db
          .select()
          .from(sessions)
          .where(eq(sessions.walletId, asUUID(walletId)))
          .orderBy(desc(sessions.createdAt));
        return results.map((s) => this.mapDbSessionToSessionKey(s));
      }

      const results = await query.orderBy(desc(sessions.createdAt));
      return results.map((s) => this.mapDbSessionToSessionKey(s));
    } catch (error) {
      logger.error('Failed to list sessions:', error);
      throw error;
    }
  }

  async updateSession(sessionId: string, updates: Partial<SessionKey>): Promise<SessionKey> {
    try {
      const updateData: Record<string, any> = {
        permissions: updates.permissions,
        isActive: updates.isActive,
        usageCount: updates.usageCount,
        lastUsedAt: updates.lastUsedAt ? new Date(updates.lastUsedAt) : undefined,
      };

      // Remove undefined values
      Object.keys(updateData).forEach((key) => {
        if (updateData[key as keyof typeof updateData] === undefined) {
          delete updateData[key as keyof typeof updateData];
        }
      });

      const [updated] = await this.db
        .update(sessions)
        .set(updateData)
        .where(eq(sessions.id, asUUID(sessionId)))
        .returning();

      if (!updated) {
        throw new Error('Session not found');
      }

      return this.mapDbSessionToSessionKey(updated);
    } catch (error) {
      logger.error('Failed to update session:', error);
      throw error;
    }
  }

  async revokeSession(sessionId: string): Promise<void> {
    try {
      await this.db
        .update(sessions)
        .set({
          isActive: false,
          revokedAt: new Date(),
        })
        .where(eq(sessions.id, asUUID(sessionId)));
    } catch (error) {
      logger.error('Failed to revoke session:', error);
      throw error;
    }
  }

  async getSessionPrivateKey(sessionId: string): Promise<string | null> {
    try {
      const [session] = await this.db
        .select({ encryptedPrivateKey: sessions.encryptedPrivateKey })
        .from(sessions)
        .where(eq(sessions.id, asUUID(sessionId)));

      if (!session?.encryptedPrivateKey) {
        return null;
      }

      return await this.encryptionService.decrypt(session.encryptedPrivateKey);
    } catch (error) {
      logger.error('Failed to get session private key:', error);
      throw error;
    }
  }

  // Transaction history methods
  async saveTransaction(
    tx: TransactionHistory & { chainId: number },
    walletId: string,
    sessionId?: string,
  ): Promise<void> {
    try {
      const newTx: NewTransactionHistory = {
        walletId: asUUID(walletId),
        chainId: tx.chainId,
        hash: tx.hash.toLowerCase(),
        from: tx.from.toLowerCase(),
        to: tx.to.toLowerCase(),
        value: tx.value,
        data: tx.data,
        blockNumber: tx.blockNumber,
        timestamp: new Date(tx.timestamp),
        gasUsed: tx.gasUsed,
        gasPrice: tx.gasPrice,
        status: tx.status,
        method: tx.method,
        decodedInput: tx.decodedInput,
        logs: tx.logs,
        sessionId: sessionId ? asUUID(sessionId) : undefined,
        nonce: (tx as any).nonce,
      };

      await this.db.insert(transactionHistory).values(newTx);
    } catch (error) {
      logger.error('Failed to save transaction:', error);
      throw error;
    }
  }

  async getTransactionHistory(
    walletAddress: Address,
    chains?: Chain[],
    limit = 100,
    offset = 0,
  ): Promise<(TransactionHistory & { chainId: number })[]> {
    try {
      // First get wallet IDs for this address
      const walletsForAddress = await this.db
        .select({ id: wallets.id })
        .from(wallets)
        .where(
          and(
            eq(wallets.address, walletAddress.toLowerCase()),
            eq(wallets.agentId, asUUID(this.runtime.agentId)),
          ),
        );

      if (walletsForAddress.length === 0) {
        return [];
      }

      const walletIds = walletsForAddress.map((w) => w.id);

      if (chains && chains.length > 0) {
        const chainIds = chains.map((c) => c.id);
        const results = await this.db
          .select()
          .from(transactionHistory)
          .where(
            and(
              inArray(transactionHistory.walletId, walletIds),
              inArray(transactionHistory.chainId, chainIds),
            ),
          )
          .orderBy(desc(transactionHistory.timestamp))
          .limit(limit)
          .offset(offset);

        return results.map((tx) => ({
          hash: tx.hash as Hash,
          from: tx.from as Address,
          to: tx.to as Address,
          value: tx.value,
          data: tx.data as Hash | undefined,
          blockNumber: Number(tx.blockNumber),
          timestamp: tx.timestamp.getTime(),
          gasUsed: tx.gasUsed,
          gasPrice: tx.gasPrice,
          status: tx.status as 'success' | 'failed' | 'pending',
          method: tx.method || undefined,
          decodedInput: tx.decodedInput,
          logs: (tx.logs as any) || [],
          chainId: tx.chainId,
          nonce: tx.nonce || undefined,
        }));
      }

      const results = await this.db
        .select()
        .from(transactionHistory)
        .where(inArray(transactionHistory.walletId, walletIds))
        .orderBy(desc(transactionHistory.timestamp))
        .limit(limit)
        .offset(offset);

      return results.map((tx) => ({
        hash: tx.hash as Hash,
        from: tx.from as Address,
        to: tx.to as Address,
        value: tx.value,
        data: tx.data as Hash | undefined,
        blockNumber: Number(tx.blockNumber),
        timestamp: tx.timestamp.getTime(),
        gasUsed: tx.gasUsed,
        gasPrice: tx.gasPrice,
        status: tx.status as 'success' | 'failed' | 'pending',
        method: tx.method || undefined,
        decodedInput: tx.decodedInput,
        logs: (tx.logs || []) as any[],
        chainId: tx.chainId,
        nonce: tx.nonce || undefined,
      }));
    } catch (error) {
      logger.error('Failed to get transaction history:', error);
      throw error;
    }
  }

  // Token balance methods
  async updateTokenBalance(
    walletId: string,
    chainId: number,
    tokenAddress: string,
    balance: bigint,
    tokenInfo: {
      symbol: string;
      name?: string;
      decimals: number;
      valueUSD?: number;
    },
  ): Promise<void> {
    try {
      await this.db
        .insert(tokenBalances)
        .values({
          walletId: asUUID(walletId),
          chainId,
          tokenAddress: tokenAddress.toLowerCase(),
          tokenSymbol: tokenInfo.symbol,
          tokenName: tokenInfo.name,
          tokenDecimals: tokenInfo.decimals,
          balance,
          valueUSD: tokenInfo.valueUSD,
          lastUpdated: new Date(),
        })
        .onConflictDoUpdate({
          target: [tokenBalances.walletId, tokenBalances.chainId, tokenBalances.tokenAddress],
          set: {
            balance,
            valueUSD: tokenInfo.valueUSD,
            lastUpdated: new Date(),
          },
        });
    } catch (error) {
      logger.error('Failed to update token balance:', error);
      throw error;
    }
  }

  async getTokenBalances(walletId: string, chainId?: number): Promise<TokenBalance[]> {
    try {
      if (chainId !== undefined) {
        const results = await this.db
          .select()
          .from(tokenBalances)
          .where(
            and(eq(tokenBalances.walletId, asUUID(walletId)), eq(tokenBalances.chainId, chainId)),
          )
          .orderBy(desc(tokenBalances.valueUSD));
        return results;
      }

      const results = await this.db
        .select()
        .from(tokenBalances)
        .where(eq(tokenBalances.walletId, asUUID(walletId)))
        .orderBy(desc(tokenBalances.valueUSD));

      return results;
    } catch (error) {
      logger.error('Failed to get token balances:', error);
      throw error;
    }
  }

  // DeFi position methods
  async updateDefiPosition(position: DefiPosition, walletId: string): Promise<void> {
    try {
      await this.db
        .insert(defiPositions)
        .values({
          walletId: asUUID(walletId),
          chainId: position.chain.id,
          protocol: position.protocol,
          protocolId: position.protocolId,
          positionType: position.type,
          positionData: position.positions,
          totalValueUSD: position.totalValueUSD,
          claimableRewards: position.claimableRewards,
          lastUpdated: new Date(),
        })
        .onConflictDoUpdate({
          target: [
            defiPositions.walletId,
            defiPositions.chainId,
            defiPositions.protocol,
            defiPositions.protocolId,
          ],
          set: {
            positionData: position.positions,
            totalValueUSD: position.totalValueUSD,
            claimableRewards: position.claimableRewards,
            lastUpdated: new Date(),
          },
        });
    } catch (error) {
      logger.error('Failed to update DeFi position:', error);
      throw error;
    }
  }

  async getDefiPositions(walletId: string, chainIds?: number[]): Promise<DBDefiPosition[]> {
    try {
      if (chainIds && chainIds.length > 0) {
        const results = await this.db
          .select()
          .from(defiPositions)
          .where(
            and(
              eq(defiPositions.walletId, asUUID(walletId)),
              inArray(defiPositions.chainId, chainIds),
            ),
          )
          .orderBy(desc(defiPositions.totalValueUSD));
        return results;
      }

      const results = await this.db
        .select()
        .from(defiPositions)
        .where(eq(defiPositions.walletId, asUUID(walletId)))
        .orderBy(desc(defiPositions.totalValueUSD));

      return results;
    } catch (error) {
      logger.error('Failed to get DeFi positions:', error);
      throw error;
    }
  }

  // NFT holding methods
  async updateNFTHolding(nft: NFTHolding, walletId: string): Promise<void> {
    try {
      await this.db
        .insert(nftHoldings)
        .values({
          walletId: asUUID(walletId),
          chainId: nft.chain.id,
          contractAddress: nft.contractAddress.toLowerCase(),
          tokenId: nft.tokenId,
          tokenType: 'ERC721', // Default, could be detected
          balance: 1,
          name: nft.name,
          description: nft.description,
          imageUrl: nft.imageUrl,
          animationUrl: nft.animationUrl,
          attributes: nft.attributes,
          collection: nft.collection,
          lastUpdated: new Date(),
        })
        .onConflictDoUpdate({
          target: [
            nftHoldings.walletId,
            nftHoldings.chainId,
            nftHoldings.contractAddress,
            nftHoldings.tokenId,
          ],
          set: {
            name: nft.name,
            description: nft.description,
            imageUrl: nft.imageUrl,
            animationUrl: nft.animationUrl,
            attributes: nft.attributes,
            collection: nft.collection,
            lastUpdated: new Date(),
          },
        });
    } catch (error) {
      logger.error('Failed to update NFT holding:', error);
      throw error;
    }
  }

  async getNFTHoldings(walletId: string, chainIds?: number[]): Promise<DBNFTHolding[]> {
    try {
      if (chainIds && chainIds.length > 0) {
        const results = await this.db
          .select()
          .from(nftHoldings)
          .where(
            and(eq(nftHoldings.walletId, asUUID(walletId)), inArray(nftHoldings.chainId, chainIds)),
          )
          .orderBy(desc(nftHoldings.lastUpdated));
        return results;
      }

      const results = await this.db
        .select()
        .from(nftHoldings)
        .where(eq(nftHoldings.walletId, asUUID(walletId)))
        .orderBy(desc(nftHoldings.lastUpdated));

      return results;
    } catch (error) {
      logger.error('Failed to get NFT holdings:', error);
      throw error;
    }
  }

  // Gas price cache methods
  async updateGasPrice(
    chainId: number,
    prices: {
      slow: bigint;
      standard: bigint;
      fast: bigint;
      instant: bigint;
      baseFee?: bigint;
      priorityFee?: bigint;
    },
    blockNumber: number,
  ): Promise<void> {
    try {
      await this.db
        .insert(gasPriceCache)
        .values({
          chainId,
          slow: prices.slow,
          standard: prices.standard,
          fast: prices.fast,
          instant: prices.instant,
          baseFee: prices.baseFee,
          priorityFee: prices.priorityFee,
          lastBlock: blockNumber,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: gasPriceCache.chainId,
          set: {
            slow: prices.slow,
            standard: prices.standard,
            fast: prices.fast,
            instant: prices.instant,
            baseFee: prices.baseFee,
            priorityFee: prices.priorityFee,
            lastBlock: blockNumber,
            updatedAt: new Date(),
          },
        });
    } catch (error) {
      logger.error('Failed to update gas price:', error);
      throw error;
    }
  }

  async getGasPrice(chainId: number): Promise<GasPriceCache | null> {
    try {
      const [gasPrice] = await this.db
        .select()
        .from(gasPriceCache)
        .where(eq(gasPriceCache.chainId, chainId));

      return gasPrice || null;
    } catch (error) {
      logger.error('Failed to get gas price:', error);
      throw error;
    }
  }

  // Contract ABI cache methods
  async saveContractAbi(
    address: string,
    chainId: number,
    abi: any[],
    metadata: {
      contractName?: string;
      isVerified?: boolean;
      implementation?: string;
      source?: string;
    },
  ): Promise<void> {
    try {
      await this.db
        .insert(contractAbiCache)
        .values({
          address: address.toLowerCase(),
          chainId,
          abi,
          contractName: metadata.contractName,
          isVerified: metadata.isVerified ?? false,
          implementation: metadata.implementation?.toLowerCase(),
          source: metadata.source,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [contractAbiCache.address, contractAbiCache.chainId],
          set: {
            abi,
            contractName: metadata.contractName,
            isVerified: metadata.isVerified ?? false,
            implementation: metadata.implementation?.toLowerCase(),
            source: metadata.source,
            updatedAt: new Date(),
          },
        });
    } catch (error) {
      logger.error('Failed to save contract ABI:', error);
      throw error;
    }
  }

  async getContractAbi(address: string, chainId: number): Promise<ContractAbiCache | null> {
    try {
      const [abi] = await this.db
        .select()
        .from(contractAbiCache)
        .where(
          and(
            eq(contractAbiCache.address, address.toLowerCase()),
            eq(contractAbiCache.chainId, chainId),
          ),
        );

      return abi || null;
    } catch (error) {
      logger.error('Failed to get contract ABI:', error);
      throw error;
    }
  }

  // ENS cache methods
  async saveENSData(name: string, data: Partial<EnsCache>): Promise<void> {
    try {
      await this.db
        .insert(ensCache)
        .values({
          name: name.toLowerCase(),
          address: data.address?.toLowerCase(),
          resolver: data.resolver?.toLowerCase(),
          contentHash: data.contentHash,
          avatar: data.avatar,
          description: data.description,
          twitter: data.twitter,
          github: data.github,
          discord: data.discord,
          email: data.email,
          url: data.url,
          metadata: data.metadata,
          expiresAt: data.expiresAt,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [ensCache.name],
          set: {
            address: data.address?.toLowerCase(),
            resolver: data.resolver?.toLowerCase(),
            contentHash: data.contentHash,
            avatar: data.avatar,
            description: data.description,
            twitter: data.twitter,
            github: data.github,
            discord: data.discord,
            email: data.email,
            url: data.url,
            metadata: data.metadata,
            expiresAt: data.expiresAt,
            updatedAt: new Date(),
          },
        });
    } catch (error) {
      logger.error('Failed to save ENS data:', error);
      throw error;
    }
  }

  async getENSData(name: string): Promise<EnsCache | null> {
    try {
      const [ens] = await this.db
        .select()
        .from(ensCache)
        .where(eq(ensCache.name, name.toLowerCase()));

      return ens || null;
    } catch (error) {
      logger.error('Failed to get ENS data:', error);
      throw error;
    }
  }

  async getENSByAddress(address: string): Promise<EnsCache | null> {
    try {
      const [ens] = await this.db
        .select()
        .from(ensCache)
        .where(eq(ensCache.address, address.toLowerCase()))
        .orderBy(desc(ensCache.updatedAt))
        .limit(1);

      return ens || null;
    } catch (error) {
      logger.error('Failed to get ENS by address:', error);
      throw error;
    }
  }

  // Helper methods
  private mapDbWalletToWalletInstance(wallet: Wallet): WalletInstance {
    return {
      id: wallet.id as UUID,
      address: wallet.address as Address,
      type: wallet.type as 'eoa' | 'safe' | 'aa' | 'multisig',
      name: wallet.name || undefined,
      metadata: (wallet.metadata as Record<string, any>) || {},
      createdAt: wallet.createdAt.getTime(),
      lastUsedAt: wallet.lastUsedAt.getTime(),
      isActive: wallet.isActive,
      chain: wallet.chainId || undefined,
      owners: wallet.owners?.map((o) => o as Address),
      threshold: wallet.threshold || undefined,
    };
  }

  private mapDbSessionToSessionKey(session: Session): SessionKey {
    return {
      id: session.id as UUID,
      publicKey: session.publicKey as Hex,
      permissions: session.permissions as SessionPermission[],
      expiresAt: session.expiresAt.getTime(),
      createdAt: session.createdAt.getTime(),
      isActive: session.isActive,
      usageCount: session.usageCount,
      lastUsedAt: session.lastUsedAt ? session.lastUsedAt.getTime() : undefined,
    };
  }
}

// Export factory function
export function createWalletDatabaseService(runtime: IAgentRuntime): WalletDatabaseService {
  return new WalletDatabaseService(runtime);
}
