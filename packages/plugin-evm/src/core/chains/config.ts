import {
  Chain,
  createPublicClient,
  createWalletClient,
  http,
  PublicClient,
  WalletClient,
} from 'viem';
import {
  mainnet,
  sepolia,
  goerli,
  polygon,
  polygonMumbai,
  arbitrum,
  arbitrumGoerli,
  optimism,
  optimismGoerli,
  avalanche,
  avalancheFuji as _avalancheFuji,
  bsc,
  bscTestnet as _bscTestnet,
  base,
  baseGoerli as _baseGoerli,
  fantom as _fantom,
  fantomTestnet as _fantomTestnet,
  gnosis as _gnosis,
  celo as _celo,
  celoAlfajores as _celoAlfajores,
  aurora as _aurora,
  auroraTestnet as _auroraTestnet,
  moonbeam as _moonbeam,
  moonriver as _moonriver,
  moonbaseAlpha as _moonbaseAlpha,
  metis as _metis,
  metisGoerli as _metisGoerli,
  cronos as _cronos,
  cronosTestnet as _cronosTestnet,
  mantle as _mantle,
  mantleTestnet as _mantleTestnet,
  linea as _linea,
  lineaTestnet as _lineaTestnet,
  scroll as _scroll,
  scrollSepolia as _scrollSepolia,
  polygonZkEvm as _polygonZkEvm,
  polygonZkEvmTestnet as _polygonZkEvmTestnet,
} from 'viem/chains';
import { IAgentRuntime } from '@elizaos/core';

export interface ChainConfig {
  chain: Chain;
  rpcUrl: string;
  wsUrl?: string;
  explorerUrl: string;
  explorerApiUrl?: string;
  explorerApiKey?: string;
  nativeWrappedToken: `0x${string}`;
  multicallAddress?: `0x${string}`;
  ensRegistry?: `0x${string}`;
  gasSettings?: {
    maxFeeMultiplier?: number;
    maxPriorityFeeMultiplier?: number;
    gasLimitMultiplier?: number;
  };
  confirmations?: number;
  archiveNode?: boolean;
}

export class ChainConfigService {
  private configs: Map<number, ChainConfig> = new Map();
  private publicClients: Map<number, PublicClient> = new Map();
  private walletClients: Map<number, WalletClient> = new Map();

  constructor(private runtime: IAgentRuntime) {
    this.initializeChains();
  }

  private initializeChains() {
    // Ethereum Mainnet
    this.addChain({
      chain: mainnet,
      rpcUrl: this.getRpcUrl('ETHEREUM_RPC_URL', 'https://eth.llamarpc.com'),
      wsUrl: this.runtime.getSetting('ETHEREUM_WS_URL'),
      explorerUrl: 'https://etherscan.io',
      explorerApiUrl: 'https://api.etherscan.io/api',
      explorerApiKey: this.runtime.getSetting('ETHERSCAN_API_KEY'),
      nativeWrappedToken: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH
      ensRegistry: '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e',
      gasSettings: {
        maxFeeMultiplier: 1.2,
        maxPriorityFeeMultiplier: 1.1,
        gasLimitMultiplier: 1.1,
      },
      confirmations: 2,
      archiveNode: this.runtime.getSetting('ETHEREUM_ARCHIVE_NODE') === 'true',
    });

    // Ethereum Sepolia
    this.addChain({
      chain: sepolia,
      rpcUrl: this.getRpcUrl('SEPOLIA_RPC_URL', 'https://ethereum-sepolia.publicnode.com'),
      explorerUrl: 'https://sepolia.etherscan.io',
      explorerApiUrl: 'https://api-sepolia.etherscan.io/api',
      explorerApiKey: this.runtime.getSetting('ETHERSCAN_API_KEY'),
      nativeWrappedToken: '0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9', // WETH
      confirmations: 1,
    });

    // Polygon
    this.addChain({
      chain: polygon,
      rpcUrl: this.getRpcUrl('POLYGON_RPC_URL', 'https://polygon-rpc.com'),
      wsUrl: this.runtime.getSetting('POLYGON_WS_URL'),
      explorerUrl: 'https://polygonscan.com',
      explorerApiUrl: 'https://api.polygonscan.com/api',
      explorerApiKey: this.runtime.getSetting('POLYGONSCAN_API_KEY'),
      nativeWrappedToken: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270', // WMATIC
      gasSettings: {
        maxFeeMultiplier: 1.5,
        maxPriorityFeeMultiplier: 1.5,
        gasLimitMultiplier: 1.2,
      },
      confirmations: 5,
    });

    // Arbitrum
    this.addChain({
      chain: arbitrum,
      rpcUrl: this.getRpcUrl('ARBITRUM_RPC_URL', 'https://arb1.arbitrum.io/rpc'),
      wsUrl: this.runtime.getSetting('ARBITRUM_WS_URL'),
      explorerUrl: 'https://arbiscan.io',
      explorerApiUrl: 'https://api.arbiscan.io/api',
      explorerApiKey: this.runtime.getSetting('ARBISCAN_API_KEY'),
      nativeWrappedToken: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', // WETH
      gasSettings: {
        maxFeeMultiplier: 1.1,
        gasLimitMultiplier: 2.0, // Arbitrum often needs higher gas limits
      },
      confirmations: 1,
    });

    // Optimism
    this.addChain({
      chain: optimism,
      rpcUrl: this.getRpcUrl('OPTIMISM_RPC_URL', 'https://mainnet.optimism.io'),
      wsUrl: this.runtime.getSetting('OPTIMISM_WS_URL'),
      explorerUrl: 'https://optimistic.etherscan.io',
      explorerApiUrl: 'https://api-optimistic.etherscan.io/api',
      explorerApiKey: this.runtime.getSetting('OPTIMISM_ETHERSCAN_API_KEY'),
      nativeWrappedToken: '0x4200000000000000000000000000000000000006', // WETH
      gasSettings: {
        maxFeeMultiplier: 1.1,
        gasLimitMultiplier: 1.5,
      },
      confirmations: 1,
    });

    // Base
    this.addChain({
      chain: base,
      rpcUrl: this.getRpcUrl('BASE_RPC_URL', 'https://mainnet.base.org'),
      wsUrl: this.runtime.getSetting('BASE_WS_URL'),
      explorerUrl: 'https://basescan.org',
      explorerApiUrl: 'https://api.basescan.org/api',
      explorerApiKey: this.runtime.getSetting('BASESCAN_API_KEY'),
      nativeWrappedToken: '0x4200000000000000000000000000000000000006', // WETH
      gasSettings: {
        maxFeeMultiplier: 1.1,
        gasLimitMultiplier: 1.5,
      },
      confirmations: 1,
    });

    // Avalanche
    this.addChain({
      chain: avalanche,
      rpcUrl: this.getRpcUrl('AVALANCHE_RPC_URL', 'https://api.avax.network/ext/bc/C/rpc'),
      wsUrl: this.runtime.getSetting('AVALANCHE_WS_URL'),
      explorerUrl: 'https://snowtrace.io',
      explorerApiUrl: 'https://api.snowtrace.io/api',
      explorerApiKey: this.runtime.getSetting('SNOWTRACE_API_KEY'),
      nativeWrappedToken: '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7', // WAVAX
      gasSettings: {
        maxFeeMultiplier: 1.3,
        gasLimitMultiplier: 1.2,
      },
      confirmations: 1,
    });

    // BSC
    this.addChain({
      chain: bsc,
      rpcUrl: this.getRpcUrl('BSC_RPC_URL', 'https://bsc-dataseed.binance.org'),
      wsUrl: this.runtime.getSetting('BSC_WS_URL'),
      explorerUrl: 'https://bscscan.com',
      explorerApiUrl: 'https://api.bscscan.com/api',
      explorerApiKey: this.runtime.getSetting('BSCSCAN_API_KEY'),
      nativeWrappedToken: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', // WBNB
      gasSettings: {
        maxFeeMultiplier: 1.1,
        gasLimitMultiplier: 1.1,
      },
      confirmations: 3,
    });

    // Add testnets if enabled
    if (this.runtime.getSetting('ENABLE_TESTNETS') === 'true') {
      this.initializeTestnets();
    }
  }

  private initializeTestnets() {
    // Goerli
    this.addChain({
      chain: goerli,
      rpcUrl: this.getRpcUrl('GOERLI_RPC_URL', 'https://ethereum-goerli.publicnode.com'),
      explorerUrl: 'https://goerli.etherscan.io',
      explorerApiUrl: 'https://api-goerli.etherscan.io/api',
      explorerApiKey: this.runtime.getSetting('ETHERSCAN_API_KEY'),
      nativeWrappedToken: '0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6', // WETH
      confirmations: 1,
    });

    // Mumbai
    this.addChain({
      chain: polygonMumbai,
      rpcUrl: this.getRpcUrl('MUMBAI_RPC_URL', 'https://rpc-mumbai.maticvigil.com'),
      explorerUrl: 'https://mumbai.polygonscan.com',
      explorerApiUrl: 'https://api-testnet.polygonscan.com/api',
      explorerApiKey: this.runtime.getSetting('POLYGONSCAN_API_KEY'),
      nativeWrappedToken: '0x9c3C9283D3e44854697Cd22D3Faa240Cfb032889', // WMATIC
      confirmations: 3,
    });

    // Arbitrum Goerli
    this.addChain({
      chain: arbitrumGoerli,
      rpcUrl: this.getRpcUrl('ARBITRUM_GOERLI_RPC_URL', 'https://goerli-rollup.arbitrum.io/rpc'),
      explorerUrl: 'https://goerli.arbiscan.io',
      nativeWrappedToken: '0xe39Ab88f8A4777030A534146A9Ca3B52bd5D43A3', // WETH
      confirmations: 1,
    });

    // Add other testnets...
  }

  private getRpcUrl(envKey: string, fallback: string): string {
    return this.runtime.getSetting(envKey) || fallback;
  }

  private addChain(config: ChainConfig) {
    this.configs.set(config.chain.id, config);
  }

  // Public methods
  getChain(chainId: number): ChainConfig | undefined {
    return this.configs.get(chainId);
  }

  getSupportedChains(): Chain[] {
    return Array.from(this.configs.values()).map((c) => c.chain);
  }

  getSupportedChainIds(): number[] {
    return Array.from(this.configs.keys());
  }

  isChainSupported(chainId: number): boolean {
    return this.configs.has(chainId);
  }

  getPublicClient(chainId: number): PublicClient {
    if (!this.publicClients.has(chainId)) {
      const config = this.getChain(chainId);
      if (!config) {
        throw new Error(`Chain ${chainId} not supported`);
      }

      const client = createPublicClient({
        chain: config.chain,
        transport: config.wsUrl
          ? http(config.rpcUrl, {
              // Fallback to HTTP if WebSocket fails
              retryCount: 3,
              retryDelay: 1000,
            })
          : http(config.rpcUrl),
      });

      this.publicClients.set(chainId, client);
    }

    return this.publicClients.get(chainId)!;
  }

  getWalletClient(chainId: number, _account?: `0x${string}`): WalletClient {
    if (!this.walletClients.has(chainId)) {
      const config = this.getChain(chainId);
      if (!config) {
        throw new Error(`Chain ${chainId} not supported`);
      }

      const client = createWalletClient({
        chain: config.chain,
        transport: http(config.rpcUrl),
      });

      this.walletClients.set(chainId, client);
    }

    return this.walletClients.get(chainId)!;
  }

  getExplorerUrl(chainId: number, type: 'tx' | 'address' | 'block', value: string): string {
    const config = this.getChain(chainId);
    if (!config) {
      throw new Error(`Chain ${chainId} not supported`);
    }

    return `${config.explorerUrl}/${type}/${value}`;
  }

  async getGasPrice(chainId: number): Promise<{
    gasPrice?: bigint;
    maxFeePerGas?: bigint;
    maxPriorityFeePerGas?: bigint;
  }> {
    const client = this.getPublicClient(chainId);
    const config = this.getChain(chainId)!;

    try {
      const gasPrice = await client.getGasPrice();

      // For EIP-1559 chains
      if (config.chain.fees?.baseFeeMultiplier) {
        const block = await client.getBlock();
        const baseFee = block.baseFeePerGas || gasPrice;

        const maxPriorityFeePerGas = gasPrice / 10n; // 10% of gas price as priority fee
        const maxFeePerGas = baseFee * 2n + maxPriorityFeePerGas;

        return {
          maxFeePerGas: BigInt(
            Math.ceil(Number(maxFeePerGas) * (config.gasSettings?.maxFeeMultiplier || 1.2))
          ),
          maxPriorityFeePerGas: BigInt(
            Math.ceil(
              Number(maxPriorityFeePerGas) * (config.gasSettings?.maxPriorityFeeMultiplier || 1.1)
            )
          ),
        };
      }

      // For legacy chains
      return {
        gasPrice: BigInt(
          Math.ceil(Number(gasPrice) * (config.gasSettings?.maxFeeMultiplier || 1.1))
        ),
      };
    } catch (_error) {
      // Fallback gas prices
      if (config.chain.fees?.baseFeeMultiplier) {
        return {
          maxFeePerGas: 30000000000n, // 30 gwei
          maxPriorityFeePerGas: 2000000000n, // 2 gwei
        };
      }
      return {
        gasPrice: 20000000000n, // 20 gwei
      };
    }
  }

  getNativeTokenSymbol(chainId: number): string {
    const config = this.getChain(chainId);
    return config?.chain.nativeCurrency.symbol || 'ETH';
  }

  getNativeTokenDecimals(chainId: number): number {
    const config = this.getChain(chainId);
    return config?.chain.nativeCurrency.decimals || 18;
  }

  getWrappedNativeToken(chainId: number): `0x${string}` | undefined {
    const config = this.getChain(chainId);
    return config?.nativeWrappedToken;
  }

  getConfirmations(chainId: number): number {
    const config = this.getChain(chainId);
    return config?.confirmations || 1;
  }

  getMulticallAddress(chainId: number): `0x${string}` | undefined {
    const config = this.getChain(chainId);
    return (
      config?.multicallAddress ||
      (config?.chain.contracts?.multicall3?.address as `0x${string}` | undefined)
    );
  }

  getENSRegistry(chainId: number): `0x${string}` | undefined {
    const config = this.getChain(chainId);
    return (
      config?.ensRegistry ||
      (config?.chain.contracts?.ensRegistry?.address as `0x${string}` | undefined)
    );
  }

  supportsEIP1559(chainId: number): boolean {
    const config = this.getChain(chainId);
    return config?.chain.fees?.baseFeeMultiplier !== undefined;
  }

  async isContractDeployed(chainId: number, address: `0x${string}`): Promise<boolean> {
    const client = this.getPublicClient(chainId);
    const code = await client.getBytecode({ address });
    return code !== undefined && code !== '0x';
  }

  async getLatestBlock(chainId: number): Promise<bigint> {
    const client = this.getPublicClient(chainId);
    const block = await client.getBlockNumber();
    return block;
  }

  waitForTransaction(chainId: number, hash: `0x${string}`, confirmations?: number): Promise<any> {
    const client = this.getPublicClient(chainId);
    const config = this.getChain(chainId);
    const requiredConfirmations = confirmations || config?.confirmations || 1;

    return client.waitForTransactionReceipt({
      hash,
      confirmations: requiredConfirmations,
    });
  }

  // Cleanup method
  cleanup() {
    // Close any WebSocket connections
    for (const _client of this.publicClients.values()) {
      // Viem clients handle cleanup internally
    }
    this.publicClients.clear();
    this.walletClients.clear();
  }

  // Validate chain configuration
  validateChainConfig(chainIdOrName: string | number): boolean {
    if (typeof chainIdOrName === 'number') {
      return this.isChainSupported(chainIdOrName);
    }

    // Check by chain name
    const chainName = chainIdOrName.toLowerCase();
    for (const config of this.configs.values()) {
      if (config.chain.name.toLowerCase() === chainName) {
        return true;
      }
    }

    return false;
  }
}

// Export factory function
export function createChainConfigService(runtime: IAgentRuntime): ChainConfigService {
  return new ChainConfigService(runtime);
}

// Standalone function to get chain config by ID
export function getChainConfig(chainId: number): ChainConfig {
  // Create a minimal chain config based on viem chains
  const chains = {
    1: {
      chain: mainnet,
      rpcUrl: 'https://eth.llamarpc.com',
      nativeWrappedToken: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    },
    11155111: {
      chain: sepolia,
      rpcUrl: 'https://ethereum-sepolia.publicnode.com',
      nativeWrappedToken: '0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9',
    },
    137: {
      chain: polygon,
      rpcUrl: 'https://polygon-rpc.com',
      nativeWrappedToken: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
    },
    80001: {
      chain: polygonMumbai,
      rpcUrl: 'https://rpc-mumbai.maticvigil.com',
      nativeWrappedToken: '0x9c3C9283D3e44854697Cd22D3Faa240Cfb032889',
    },
    42161: {
      chain: arbitrum,
      rpcUrl: 'https://arb1.arbitrum.io/rpc',
      nativeWrappedToken: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
    },
    421613: {
      chain: arbitrumGoerli,
      rpcUrl: 'https://goerli-rollup.arbitrum.io/rpc',
      nativeWrappedToken: '0xe39Ab88f8A4777030A534146A9Ca3B52bd5D43A3',
    },
    10: {
      chain: optimism,
      rpcUrl: 'https://mainnet.optimism.io',
      nativeWrappedToken: '0x4200000000000000000000000000000000000006',
    },
    420: {
      chain: optimismGoerli,
      rpcUrl: 'https://goerli.optimism.io',
      nativeWrappedToken: '0x4200000000000000000000000000000000000006',
    },
    8453: {
      chain: base,
      rpcUrl: 'https://mainnet.base.org',
      nativeWrappedToken: '0x4200000000000000000000000000000000000006',
    },
    56: {
      chain: bsc,
      rpcUrl: 'https://bsc-dataseed.binance.org',
      nativeWrappedToken: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
    },
  } as const;

  const config = chains[chainId as keyof typeof chains];
  if (!config) {
    throw new Error(`Chain config not found for chain ID ${chainId}`);
  }

  return {
    chain: config.chain,
    rpcUrl: config.rpcUrl,
    explorerUrl: `https://${config.chain.blockExplorers?.default.url || 'etherscan.io'}`,
    nativeWrappedToken: config.nativeWrappedToken as `0x${string}`,
  };
}
