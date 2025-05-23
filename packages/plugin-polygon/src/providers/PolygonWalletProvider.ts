import {
  createPublicClient,
  createTestClient,
  createWalletClient,
  formatUnits,
  http,
  publicActions,
  walletActions,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import {
  type IAgentRuntime,
  type Provider,
  type Memory,
  type State,
  elizaLogger,
  type ProviderResult,
} from '@elizaos/core';
import type {
  Address,
  WalletClient,
  PublicClient,
  Chain,
  HttpTransport,
  Account,
  PrivateKeyAccount,
  TestClient,
} from 'viem';
import * as viemChains from 'viem/chains';
import { PhalaDeriveKeyProvider } from '@elizaos/plugin-tee';
import NodeCache from 'node-cache';
import * as path from 'node:path';

import type { SupportedChain } from '../types';

export class WalletProvider {
  private cache: NodeCache;
  private cacheKey = 'polygon/wallet';
  private currentChain: SupportedChain = 'mainnet';
  private CACHE_EXPIRY_SEC = 5;
  chains: Record<string, Chain> = {};
  account: PrivateKeyAccount;
  runtime: IAgentRuntime;
  private l1ChainName: string | undefined; // Store the configured L1 chain name

  constructor(
    accountOrPrivateKey: PrivateKeyAccount | `0x${string}`,
    runtime: IAgentRuntime,
    chainsConfig?: { l1ChainName: string; polygonChainName: string; chains: Record<string, Chain> }
  ) {
    this.setAccount(accountOrPrivateKey);
    this.runtime = runtime;

    if (chainsConfig) {
      this.l1ChainName = chainsConfig.l1ChainName;
      this.setChains(chainsConfig.chains);
      if (Object.keys(chainsConfig.chains).length > 0) {
        // Prioritize setting current chain to Polygon if available, else L1, else first in list
        if (chainsConfig.polygonChainName && chainsConfig.chains[chainsConfig.polygonChainName]) {
          this.setCurrentChain(chainsConfig.polygonChainName as SupportedChain);
        } else if (chainsConfig.l1ChainName && chainsConfig.chains[chainsConfig.l1ChainName]) {
          this.setCurrentChain(chainsConfig.l1ChainName as SupportedChain);
        } else {
          this.setCurrentChain(Object.keys(chainsConfig.chains)[0] as SupportedChain);
        }
      }
    }

    this.cache = new NodeCache({ stdTTL: this.CACHE_EXPIRY_SEC });
  }

  // Helper to resolve aliases like "ethereum" to the configured L1 chain name
  private resolveChainName(chainName: SupportedChain): string {
    const lowerChainName = chainName.toLowerCase();
    if (lowerChainName === 'ethereum' && this.l1ChainName && this.chains[this.l1ChainName]) {
      return this.l1ChainName;
    }
    // Add more aliases if needed, e.g., for Polygon
    if (lowerChainName === 'matic' && this.chains['polygon']) {
      // Assuming polygon is always 'polygon'
      return 'polygon';
    }
    if (!this.chains[chainName]) {
      elizaLogger.warn(
        `Chain name "${chainName}" not directly found in configured chains. Attempting to find a viem standard chain.`
      );
      // Attempt to fall back to a standard viem chain name if not in configured this.chains
      // This is a failsafe and might indicate a configuration issue if hit often.
      // throw new Error(`Chain "${chainName}" not found in configured chains and fallback to standard viem chains without explicit RPC is disabled.`);
    }
    return chainName;
  }

  getAddress(): Address {
    return this.account.address;
  }

  getCurrentChain(): Chain {
    return this.chains[this.currentChain];
  }

  getPublicClient(
    chainName: SupportedChain
  ): PublicClient<HttpTransport, Chain, Account | undefined> {
    const resolvedChainName = this.resolveChainName(chainName);
    const transport = this.createHttpTransport(resolvedChainName as SupportedChain);

    const publicClient = createPublicClient({
      chain: this.chains[resolvedChainName],
      transport,
    });
    return publicClient;
  }

  getWalletClient(chainName: SupportedChain): WalletClient {
    const resolvedChainName = this.resolveChainName(chainName);
    const transport = this.createHttpTransport(resolvedChainName as SupportedChain);

    const walletClient = createWalletClient({
      chain: this.chains[resolvedChainName],
      transport,
      account: this.account,
    });

    return walletClient;
  }

  getTestClient(): TestClient {
    return createTestClient({
      chain: viemChains.hardhat,
      mode: 'hardhat',
      transport: http(),
    })
      .extend(publicActions)
      .extend(walletActions);
  }

  getChainConfigs(chainName: SupportedChain): Chain {
    const resolvedChainName = this.resolveChainName(chainName);
    // Prefer configured chain if available
    if (this.chains[resolvedChainName]) {
      return this.chains[resolvedChainName];
    }
    // Fallback to viemChains if not in this.chains (e.g. for LiFi SDK needs)
    const chain = viemChains[resolvedChainName as keyof typeof viemChains];

    if (!chain?.id) {
      throw new Error(`Invalid chain name: ${resolvedChainName}`);
    }

    return chain;
  }

  async getWalletBalance(): Promise<string | null> {
    try {
      const client = this.getPublicClient(this.currentChain);
      const balance = await client.getBalance({
        address: this.account.address,
      });
      const balanceFormatted = formatUnits(balance, 18);
      elizaLogger.log('Wallet balance cached for chain: ', this.currentChain);
      return balanceFormatted;
    } catch (error) {
      console.error('Error getting wallet balance:', error);
      return null;
    }
  }

  async getWalletBalanceForChain(chainName: SupportedChain): Promise<string | null> {
    try {
      const client = this.getPublicClient(chainName);
      const balance = await client.getBalance({
        address: this.account.address,
      });
      return formatUnits(balance, 18);
    } catch (error) {
      console.error('Error getting wallet balance:', error);
      return null;
    }
  }

  addChain(chain: Record<string, Chain>) {
    this.setChains(chain);
  }

  switchChain(chainName: SupportedChain, customRpcUrl?: string) {
    const resolvedChainName = this.resolveChainName(chainName);
    if (!this.chains[resolvedChainName]) {
      const chain = WalletProvider.genChainFromName(resolvedChainName, customRpcUrl);
      this.addChain({ [resolvedChainName]: chain }); // Use resolved name for adding
    }
    this.setCurrentChain(resolvedChainName as SupportedChain);
  }

  private setAccount = (accountOrPrivateKey: PrivateKeyAccount | `0x${string}`) => {
    if (typeof accountOrPrivateKey === 'string') {
      this.account = privateKeyToAccount(accountOrPrivateKey);
    } else {
      this.account = accountOrPrivateKey;
    }
  };

  private setChains = (chains?: Record<string, Chain>) => {
    if (!chains) {
      return;
    }
    for (const chain of Object.keys(chains)) {
      this.chains[chain] = chains[chain];
    }
  };

  private setCurrentChain = (chain: SupportedChain) => {
    this.currentChain = chain;
  };

  private createHttpTransport = (chainName: SupportedChain) => {
    const resolvedChainName = this.resolveChainName(chainName);
    const chain = this.chains[resolvedChainName];

    if (!chain) {
      throw new Error(
        `Chain configuration not found for resolved name: ${resolvedChainName} (original: ${chainName})`
      );
    }

    if (chain.rpcUrls.custom?.http && chain.rpcUrls.custom.http.length > 0) {
      return http(chain.rpcUrls.custom.http[0]);
    }
    return http(chain.rpcUrls.default.http[0]);
  };

  static genChainFromName(chainName: string, customRpcUrl?: string | null): Chain {
    const baseChain = viemChains[chainName];

    if (!baseChain?.id) {
      throw new Error('Invalid chain name');
    }

    const viemChain: Chain = customRpcUrl
      ? {
          ...baseChain,
          rpcUrls: {
            ...baseChain.rpcUrls,
            custom: {
              http: [customRpcUrl],
            },
          },
        }
      : baseChain;

    return viemChain;
  }
}

// --- Adjusted Chain Configuration Logic --- //

const genChainsFromRuntime = (
  runtime: IAgentRuntime
): { l1ChainName?: string; polygonChainName?: string; chains: Record<string, Chain> } => {
  const chains: Record<string, Chain> = {};
  let l1ChainName: string | undefined;
  let polygonChainName: string | undefined;

  // 1. Get L2 Polygon RPC URL
  const polyRpcUrl = runtime.getSetting('POLYGON_RPC_URL');
  const configuredPolygonName =
    runtime.getSetting('POLYGON_CHAIN_NAME')?.toLowerCase() || 'polygon';

  if (polyRpcUrl) {
    try {
      // Use configured name or default to 'polygon' / 'polygonMumbai' based on URL
      const actualPolygonChainKey = viemChains[configuredPolygonName as keyof typeof viemChains]
        ? configuredPolygonName
        : !/mumbai/i.test(polyRpcUrl)
          ? 'polygon'
          : 'polygonMumbai';
      const chain = WalletProvider.genChainFromName(actualPolygonChainKey, polyRpcUrl);
      chains[actualPolygonChainKey] = chain;
      polygonChainName = actualPolygonChainKey;
      elizaLogger.info(`Configured Polygon chain: ${actualPolygonChainKey}`);
    } catch (error) {
      elizaLogger.error(`Error configuring Polygon chain (${configuredPolygonName}):`, error);
    }
  } else {
    elizaLogger.warn('POLYGON_RPC_URL setting not found.');
  }

  // 2. Get L1 Ethereum RPC URL
  const ethRpcUrl = runtime.getSetting('ETHEREUM_RPC_URL');
  const configuredEthName = runtime.getSetting('ETHEREUM_CHAIN_NAME')?.toLowerCase() || 'mainnet';

  if (ethRpcUrl) {
    try {
      // Use configured name or default to 'mainnet' / 'sepolia' based on URL
      const actualEthChainKey = viemChains[configuredEthName as keyof typeof viemChains]
        ? configuredEthName
        : !/(sepolia|goerli|ropsten|kovan)/i.test(ethRpcUrl)
          ? 'mainnet'
          : 'sepolia';
      const chain = WalletProvider.genChainFromName(actualEthChainKey, ethRpcUrl);
      chains[actualEthChainKey] = chain;
      l1ChainName = actualEthChainKey;
      elizaLogger.info(`Configured Ethereum L1 chain: ${actualEthChainKey}`);
    } catch (error) {
      elizaLogger.error(`Error configuring Ethereum L1 chain (${configuredEthName}):`, error);
    }
  } else {
    elizaLogger.warn('ETHEREUM_RPC_URL setting not found.');
  }

  if (Object.keys(chains).length === 0) {
    elizaLogger.error('No chains could be configured. WalletProvider may not function correctly.');
  }
  return { l1ChainName, polygonChainName, chains };
};

export const initWalletProvider = async (
  runtime: IAgentRuntime
): Promise<WalletProvider | null> => {
  elizaLogger.info('Initializing WalletProvider...');
  try {
    const pkSetting = runtime.getSetting('WALLET_PRIVATE_KEY');
    const encryptedPk = runtime.getSetting('WALLET_ENCRYPTED_PRIVATE_KEY');
    let privateKey: `0x${string}` | null = null;

    if (encryptedPk) {
      elizaLogger.info('Found encrypted private key. Attempting to derive...');
      try {
        const phalaProvider = new PhalaDeriveKeyProvider(runtime);
        privateKey = (await phalaProvider.deriveKey(encryptedPk)) as `0x${string}`;
        if (privateKey && privateKey.startsWith('0x') && privateKey.length === 66) {
          elizaLogger.info('Successfully derived private key from encrypted key.');
        } else {
          elizaLogger.error(
            'Derived key is not a valid private key format. Falling back or failing.'
          );
          privateKey = null; // Ensure it's null if derivation was not successful
        }
      } catch (deriveError) {
        elizaLogger.error('Error deriving private key with PhalaDeriveKeyProvider:', deriveError);
        // Fall through to try WALLET_PRIVATE_KEY if derivation fails
      }
    }

    // Fallback to direct private key if encrypted key is not present or derivation failed
    if (!privateKey && pkSetting) {
      elizaLogger.info(
        'Using direct WALLET_PRIVATE_KEY (encryption/derivation not used or failed).'
      );
      if (pkSetting.startsWith('0x') && pkSetting.length === 66) {
        privateKey = pkSetting as `0x${string}`;
      } else {
        elizaLogger.error(
          'WALLET_PRIVATE_KEY is not a valid hex private key. It must be 66 characters long and start with 0x.'
        );
        // Do not proceed if the direct PK is invalid and no encrypted one worked
        if (!encryptedPk) return null; // Or if encryptedPk was present but failed derivation
      }
    }

    if (!privateKey) {
      elizaLogger.error(
        'Private key not available (neither WALLET_PRIVATE_KEY nor derivable WALLET_ENCRYPTED_PRIVATE_KEY found or valid). WalletProvider cannot be initialized.'
      );
      return null;
    }

    elizaLogger.info('PRIVATE_KEY setting retrieved (not showing actual key for security)');
    const chainsConfig = genChainsFromRuntime(runtime);
    const provider = new WalletProvider(privateKey, runtime, chainsConfig);
    elizaLogger.info('Initialized WalletProvider using PRIVATE_KEY setting.');
    return provider;
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : String(e);
    elizaLogger.error('Failed to initialize WalletProvider:', errMsg, e);
    return null;
  }
};

// Fallback function to fetch wallet data directly
async function directFetchWalletData(
  runtime: IAgentRuntime,
  state?: State
): Promise<ProviderResult> {
  try {
    const walletProvider = await initWalletProvider(runtime);
    if (!walletProvider) {
      throw new Error('Failed to initialize wallet provider');
    }

    const address = walletProvider.getAddress();

    // Get balance for each configured chain
    const chainBalances: Record<string, string> = {};
    for (const chainName of Object.keys(walletProvider.chains)) {
      try {
        const balance = await walletProvider.getWalletBalanceForChain(chainName as SupportedChain);
        if (balance) {
          chainBalances[chainName] = balance;
        }
      } catch (error) {
        elizaLogger.error(`Error getting balance for chain ${chainName}:`, error);
      }
    }

    const agentName = state?.agentName || 'The agent';

    // Format balances for all chains
    const chainDetails = Object.entries(chainBalances).map(([chainName, balance]) => {
      const chain = walletProvider.chains[chainName];
      return {
        chainName,
        balance,
        symbol: chain.nativeCurrency.symbol,
        chainId: chain.id,
        name: chain.name,
      };
    });

    // Create a text representation of all chain balances
    const balanceText = chainDetails
      .map((chain) => `${chain.name}: ${chain.balance} ${chain.symbol}`)
      .join('\n');

    return {
      text: `${agentName}'s Polygon Wallet Address: ${address}\n\nBalances:\n${balanceText}`,
      data: {
        address,
        chains: chainDetails,
      },
      values: {
        address: address as string,
        chains: JSON.stringify(chainDetails),
      },
    };
  } catch (error) {
    elizaLogger.error('Error fetching wallet data directly:', error);
    return {
      text: `Error getting Polygon wallet provider: ${error instanceof Error ? error.message : String(error)}`,
      data: { error: error instanceof Error ? error.message : String(error) },
      values: { error: error instanceof Error ? error.message : String(error) },
    };
  }
}

export const polygonWalletProvider: Provider = {
  name: 'PolygonWalletProvider',
  async get(runtime: IAgentRuntime, _message: Memory, state?: State): Promise<ProviderResult> {
    try {
      // Always use the direct fetch method for consistency
      return await directFetchWalletData(runtime, state);
    } catch (error) {
      elizaLogger.error('Error in Polygon wallet provider:', error);
      const errorText = error instanceof Error ? error.message : String(error);
      return {
        text: `Error in Polygon wallet provider: ${errorText}`,
        data: { error: errorText },
        values: { error: errorText },
      };
    }
  },
};
