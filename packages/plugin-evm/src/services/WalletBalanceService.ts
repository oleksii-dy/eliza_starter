import type { IAgentRuntime } from '@elizaos/core';
import { type Address, formatUnits } from 'viem';
import { initWalletProvider } from '../providers/wallet';
import type { SupportedChain } from '../types';

export interface TokenBalance {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  balance: string;
  uiAmount: number;
}

export interface WalletBalance {
  eth: {
    balance: string;
    uiAmount: number;
  };
  tokens: TokenBalance[];
  totalValueUSD?: number;
}

export interface RecentAction {
  id: string;
  type: 'transfer' | 'swap' | 'bridge' | 'governance';
  timestamp: number;
  status: 'pending' | 'success' | 'failed';
  details: {
    from?: string;
    to?: string;
    amount?: string;
    token?: string;
    fromChain?: string;
    toChain?: string;
    hash?: string;
  };
}

export class WalletBalanceService {
  private runtime: IAgentRuntime;
  private recentActions: RecentAction[] = [];
  private maxRecentActions = 50;

  constructor(runtime: IAgentRuntime) {
    this.runtime = runtime;
  }

  async getWalletBalance(chain?: SupportedChain): Promise<{
    network: string;
    address: string;
    balance: WalletBalance;
  }> {
    const walletProvider = await initWalletProvider(this.runtime);
    const address = walletProvider.getAddress();

    // Default to first supported chain if not specified
    const targetChain = chain || walletProvider.getSupportedChains()[0];
    const publicClient = walletProvider.getPublicClient(targetChain);

    // Get native balance
    const nativeBalance = await publicClient.getBalance({ address });
    const chainConfig = walletProvider.getChainConfigs(targetChain);

    // Get token balances (would need to implement token list)
    const tokens: TokenBalance[] = [];

    // TODO: Implement token balance fetching
    // This would involve:
    // 1. Getting a list of common tokens for the chain
    // 2. Calling balanceOf for each token
    // 3. Getting token metadata (symbol, name, decimals)

    return {
      network: chainConfig.name,
      address,
      balance: {
        eth: {
          balance: nativeBalance.toString(),
          uiAmount: Number(formatUnits(nativeBalance, 18)),
        },
        tokens,
        totalValueUSD: undefined, // Would need price data
      },
    };
  }

  getRecentActions(limit = 10): Promise<RecentAction[]> {
    const actions = this.recentActions.slice(0, limit);
    return Promise.resolve(actions);
  }

  addRecentAction(action: Omit<RecentAction, 'id' | 'timestamp'>): void {
    const newAction: RecentAction = {
      ...action,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    };

    this.recentActions.unshift(newAction);

    // Keep only the most recent actions
    if (this.recentActions.length > this.maxRecentActions) {
      this.recentActions = this.recentActions.slice(0, this.maxRecentActions);
    }
  }

  updateActionStatus(actionId: string, status: RecentAction['status'], hash?: string): void {
    const action = this.recentActions.find((a) => a.id === actionId);
    if (action) {
      action.status = status;
      if (hash) {
        action.details.hash = hash;
      }
    }
  }

  clearRecentActions(): void {
    this.recentActions = [];
  }

  async getTokenBalances(address: string, chain: string): Promise<TokenBalance[]> {
    try {
      const walletProvider = await initWalletProvider(this.runtime);
      const publicClient = walletProvider.getPublicClient(chain as SupportedChain);

      // Get common tokens for the chain
      const tokens = this.getCommonTokensForChain(chain);
      if (tokens.length === 0) {
        return [];
      }

      const balances: TokenBalance[] = [];

      // Use multicall for efficiency
      const erc20Abi = [
        {
          inputs: [{ name: 'account', type: 'address' }],
          name: 'balanceOf',
          outputs: [{ name: '', type: 'uint256' }],
          stateMutability: 'view',
          type: 'function',
        },
      ] as const;

      const calls = tokens.map((token) => ({
        address: token.address as Address,
        abi: erc20Abi,
        functionName: 'balanceOf' as const,
        args: [address as Address] as const,
      }));

      const results = await publicClient.multicall({ contracts: calls });

      for (let i = 0; i < tokens.length; i++) {
        if (results[i].status === 'success') {
          const balance = results[i].result as bigint;
          if (balance > 0n) {
            balances.push({
              address: tokens[i].address,
              symbol: tokens[i].symbol,
              name: tokens[i].name,
              decimals: tokens[i].decimals,
              balance: balance.toString(),
              uiAmount: Number(formatUnits(balance, tokens[i].decimals)),
            });
          }
        }
      }

      return balances;
    } catch (_error) {
      console.error('Error fetching token balances:', _error);
      return [];
    }
  }

  private getCommonTokensForChain(chain: string): Array<{
    address: string;
    symbol: string;
    name: string;
    decimals: number;
  }> {
    // Common tokens by chain
    const tokens: Record<
      string,
      Array<{
        address: string;
        symbol: string;
        name: string;
        decimals: number;
      }>
    > = {
      sepolia: [
        {
          address: '0x7169D38820dfd117C3FA1f22a697dBA58d90BA06',
          symbol: 'USDT',
          name: 'Tether USD',
          decimals: 6,
        },
        {
          address: '0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8',
          symbol: 'USDC',
          name: 'USD Coin',
          decimals: 6,
        },
      ],
      ethereum: [
        {
          address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
          symbol: 'USDC',
          name: 'USD Coin',
          decimals: 6,
        },
        {
          address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
          symbol: 'USDT',
          name: 'Tether USD',
          decimals: 6,
        },
        {
          address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
          symbol: 'DAI',
          name: 'Dai Stablecoin',
          decimals: 18,
        },
      ],
      'base-sepolia': [
        {
          address: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
          symbol: 'USDC',
          name: 'USD Coin',
          decimals: 6,
        },
      ],
      polygon: [
        {
          address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
          symbol: 'USDC',
          name: 'USD Coin',
          decimals: 6,
        },
        {
          address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
          symbol: 'USDT',
          name: 'Tether USD',
          decimals: 6,
        },
      ],
    };

    return tokens[chain] || [];
  }
}
