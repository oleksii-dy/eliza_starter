import type { Address } from 'viem';
import {
  mainnet,
  polygon,
  arbitrum,
  optimism,
  base,
  bsc,
  avalanche,
  sepolia,
  baseSepolia,
  optimismSepolia,
  arbitrumSepolia,
} from 'viem/chains';
import { type IAgentRuntime, ModelType } from '@elizaos/core';
import { vi } from 'vitest';

// ========== CHAIN CONFIGURATIONS ==========

export const testnetChains = {
  sepolia,
  baseSepolia,
  optimismSepolia,
  arbitrumSepolia,
} as const;

export const mainnetChains = {
  mainnet,
  polygon,
  arbitrum,
  optimism,
  base,
  bsc,
  avalanche,
} as const;

// ========== TOKEN ADDRESSES ==========

// Testnet token addresses
export const TESTNET_TOKENS = {
  sepolia: {
    ETH: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' as Address,
    WETH: '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14' as Address,
    USDC: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238' as Address,
    USDT: '0x7169D38820dfd117C3FA1f22a697dBA58d90BA06' as Address,
    DAI: '0x68194a729C2450ad26072b3D33ADaCbcef39D574' as Address,
  },
  baseSepolia: {
    ETH: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' as Address,
    WETH: '0x4200000000000000000000000000000000000006' as Address,
    USDC: '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as Address,
  },
  optimismSepolia: {
    ETH: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' as Address,
    WETH: '0x4200000000000000000000000000000000000006' as Address,
    USDC: '0x5fd84259d66Cd46123540766Be93DFE6D43130D7' as Address,
  },
  arbitrumSepolia: {
    ETH: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' as Address,
    WETH: '0x980B62Da83eFf3D4576C647993b0c1D7faf17c73' as Address,
  },
} as const;

// Mainnet token addresses
export const MAINNET_TOKENS = {
  mainnet: {
    ETH: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' as Address,
    WETH: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' as Address,
    USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as Address,
    USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7' as Address,
    DAI: '0x6B175474E89094C44Da98b954EedeAC495271d0F' as Address,
    UNI: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984' as Address,
    AAVE: '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9' as Address,
    COMP: '0xc00e94Cb662C3520282E6f5717214004A7f26888' as Address,
    LINK: '0x514910771AF9Ca656af840dff83E8264EcF986CA' as Address,
    MKR: '0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2' as Address,
    SNX: '0xC011a73ee8576Fb46F5E1c5751cA3B9Fe0af2a6F' as Address,
  },
  polygon: {
    MATIC: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' as Address,
    WMATIC: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270' as Address,
    USDC: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174' as Address,
    USDT: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F' as Address,
    DAI: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063' as Address,
    AAVE: '0xD6DF932A45C0f255f85145f286eA0b292B21C90B' as Address,
  },
  arbitrum: {
    ETH: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' as Address,
    WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1' as Address,
    USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831' as Address,
    USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9' as Address,
    DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1' as Address,
    ARB: '0x912CE59144191C1204E64559FE8253a0e49E6548' as Address,
  },
  optimism: {
    ETH: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' as Address,
    WETH: '0x4200000000000000000000000000000000000006' as Address,
    USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85' as Address,
    USDT: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58' as Address,
    DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1' as Address,
    OP: '0x4200000000000000000000000000000000000042' as Address,
  },
  base: {
    ETH: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' as Address,
    WETH: '0x4200000000000000000000000000000000000006' as Address,
    USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as Address,
    DAI: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb' as Address,
  },
} as const;

// ========== GOVERNANCE CONTRACTS ==========

export const TESTNET_GOVERNORS = {
  sepolia: {
    governor: ('0x' + '1'.repeat(40)) as Address,
    timelock: ('0x' + '2'.repeat(40)) as Address,
    token: ('0x' + '3'.repeat(40)) as Address,
  },
  baseSepolia: {
    governor: ('0x' + '4'.repeat(40)) as Address,
    timelock: ('0x' + '5'.repeat(40)) as Address,
    token: ('0x' + '6'.repeat(40)) as Address,
  },
} as const;

export const MAINNET_GOVERNORS = {
  mainnet: {
    compound: {
      governor: '0xc0Da02939E1441F497fd74F78cE7Decb17B66529' as Address,
      timelock: '0x6d903f6003cca6255D85CcA4D3B5E5146dC33925' as Address,
      token: '0xc00e94Cb662C3520282E6f5717214004A7f26888' as Address,
    },
    uniswap: {
      governor: '0x408ED6354d4973f66138C91495F2f2FCbd8724C3' as Address,
      timelock: '0x1a9C8182C09F50C8318d769245beA52c32BE35BC' as Address,
      token: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984' as Address,
    },
    aave: {
      governor: '0xEC568fffba86c094cf06b22134B23074DFE2252c' as Address,
      shortExecutor: '0xEE56e2B3D491590B5b31738cC34d5232F378a8D5' as Address,
      longExecutor: '0x79426A1c24B2978D90d7A5070a46C65B07bC4299' as Address,
      token: '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9' as Address,
    },
    maker: {
      chief: '0x0a3f6849f78076aefaDf113F5BED87720274dDC0' as Address,
      token: '0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2' as Address,
    },
  },
  polygon: {
    aave: {
      governor: '0x8a2Efd9A790199F4c94c6effE210fce0B4724f52' as Address,
      token: '0xD6DF932A45C0f255f85145f286eA0b292B21C90B' as Address,
    },
  },
  arbitrum: {
    arbitrum: {
      coreGovernor: '0xf07DeD9dC292157749B6Fd268E37DF6EA38395B9' as Address,
      treasuryGovernor: '0x789fC99093B09aD01C34DC7251D0C89ce743e5a4' as Address,
      token: '0x912CE59144191C1204E64559FE8253a0e49E6548' as Address,
    },
  },
  optimism: {
    optimism: {
      token: '0x4200000000000000000000000000000000000042' as Address,
    },
  },
} as const;

// ========== DEX CONTRACTS ==========

export const TESTNET_DEXES = {
  sepolia: {
    uniswapV3Router: '0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E' as Address,
  },
  baseSepolia: {},
} as const;

export const MAINNET_DEXES = {
  mainnet: {
    uniswapV2Router: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D' as Address,
    uniswapV3Router: '0xE592427A0AEce92De3Edee1F18E0157C05861564' as Address,
    sushiswapRouter: '0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F' as Address,
    oneInchRouter: '0x1111111254EEB25477B68fb85Ed929f73A960582' as Address,
  },
  polygon: {
    quickswapRouter: '0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff' as Address,
    sushiswapRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506' as Address,
  },
  arbitrum: {
    uniswapV3Router: '0xE592427A0AEce92De3Edee1F18E0157C05861564' as Address,
    sushiswapRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506' as Address,
    camelotRouter: '0xc873fEcbd354f5A56E00E710B90EF4201db2448d' as Address,
  },
} as const;

// ========== TEST CONFIGURATION ==========

export const TESTNET_CONFIG = {
  minBalances: {
    ETH: '0.01',
    USDC: '10',
    USDT: '10',
  },
  testAmounts: {
    smallTransfer: '0.0001',
    mediumTransfer: '0.001',
    smallSwap: '1',
    mediumSwap: '10',
  },
  governance: {
    proposalDescription: 'Test Proposal #',
    votingDelay: 1,
    votingPeriod: 50,
    minDelay: 60,
  },
} as const;

export const MAINNET_TEST_REQUIREMENTS = {
  minBalances: {
    ETH: '0.1',
    USDC: '100',
    USDT: '100',
  },
  testAmounts: {
    smallTransfer: '0.001',
    mediumTransfer: '0.01',
    smallSwap: '10',
    mediumSwap: '100',
  },
} as const;

// ========== HELPER FUNCTIONS ==========

export function shouldRunExpensiveTests(): boolean {
  return process.env.RUN_EXPENSIVE_TESTS === 'true';
}

export function shouldRunMainnetTests(): boolean {
  return process.env.RUN_MAINNET_TESTS === 'true';
}

export function shouldRunMainnetSwapTests(): boolean {
  return process.env.RUN_MAINNET_SWAP_TESTS === 'true';
}

export function getTestnetRpcUrl(chain: keyof typeof testnetChains): string {
  const rpcUrls = {
    sepolia: process.env.SEPOLIA_RPC_URL || 'https://sepolia.drpc.org',
    baseSepolia: process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org',
    optimismSepolia: process.env.OP_SEPOLIA_RPC_URL || 'https://sepolia.optimism.io',
    arbitrumSepolia: process.env.ARB_SEPOLIA_RPC_URL || 'https://sepolia-rollup.arbitrum.io/rpc',
  };

  return rpcUrls[chain];
}

export function getTokenInfo(
  chain: keyof typeof MAINNET_TOKENS,
  symbol: string
): Address | undefined {
  const tokens = MAINNET_TOKENS[chain];
  return tokens?.[symbol as keyof typeof tokens];
}

export function estimateTestCosts(
  gasPrice: bigint,
  ethPrice: number
): {
  transfer: string;
  swap: string;
  bridge: string;
  governance: string;
  total: string;
} {
  const costs = {
    transfer: 21000n * gasPrice,
    swap: 150000n * gasPrice,
    bridge: 200000n * gasPrice,
    governance: 100000n * gasPrice,
  };

  const total = costs.transfer + costs.swap + costs.bridge + costs.governance;
  const ethToUsd = (wei: bigint) => ((Number(wei) / 1e18) * ethPrice).toFixed(2);

  return {
    transfer: `$${ethToUsd(costs.transfer)}`,
    swap: `$${ethToUsd(costs.swap)}`,
    bridge: `$${ethToUsd(costs.bridge)}`,
    governance: `$${ethToUsd(costs.governance)}`,
    total: `$${ethToUsd(total)}`,
  };
}

// ========== TEST UTILITIES ==========

export const testPrivateKey =
  '0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef' as const;

export function createMockRuntime(): IAgentRuntime {
  // Mock getSetting to return proper test values
  const mockGetSetting = vi.fn().mockImplementation((key: string) => {
    const settings: Record<string, string> = {
      EVM_PRIVATE_KEY: testPrivateKey,
      WALLET_DATABASE_URL: 'sqlite::memory:',
      DATABASE_URL: 'sqlite::memory:',
      POSTGRES_URL: 'sqlite::memory:',

      // Legacy format for backward compatibility
      SEPOLIA_RPC_URL: 'https://sepolia.drpc.org',
      BASE_SEPOLIA_RPC_URL: 'https://sepolia.base.org',
      OP_SEPOLIA_RPC_URL: 'https://sepolia.optimism.io',
      ARB_SEPOLIA_RPC_URL: 'https://sepolia-rollup.arbitrum.io/rpc',
      ETHEREUM_RPC_URL: 'https://ethereum-rpc.publicnode.com',
      POLYGON_RPC_URL: 'https://polygon-rpc.com',
      ARBITRUM_RPC_URL: 'https://arb1.arbitrum.io/rpc',
      OPTIMISM_RPC_URL: 'https://mainnet.optimism.io',
      BASE_RPC_URL: 'https://mainnet.base.org',
      BSC_RPC_URL: 'https://bsc-dataseed1.binance.org',
      AVALANCHE_RPC_URL: 'https://api.avax.network/ext/bc/C/rpc',

      // New format used by genChainsFromRuntime
      ETHEREUM_PROVIDER_SEPOLIA: 'https://sepolia.drpc.org',
      ETHEREUM_PROVIDER_BASESEPOLIA: 'https://sepolia.base.org',
      ETHEREUM_PROVIDER_OPTIMISMSEPOLIA: 'https://sepolia.optimism.io',
      ETHEREUM_PROVIDER_ARBITRUMSEPOLIA: 'https://sepolia-rollup.arbitrum.io/rpc',
      ETHEREUM_PROVIDER_MAINNET: 'https://ethereum-rpc.publicnode.com',
      ETHEREUM_PROVIDER_POLYGON: 'https://polygon-rpc.com',
      ETHEREUM_PROVIDER_ARBITRUM: 'https://arb1.arbitrum.io/rpc',
      ETHEREUM_PROVIDER_OPTIMISM: 'https://mainnet.optimism.io',
      ETHEREUM_PROVIDER_BASE: 'https://mainnet.base.org',

      // EVM Provider format fallback
      EVM_PROVIDER_SEPOLIA: 'https://sepolia.drpc.org',
      EVM_PROVIDER_BASESEPOLIA: 'https://sepolia.base.org',
      EVM_PROVIDER_OPTIMISMSEPOLIA: 'https://sepolia.optimism.io',
      EVM_PROVIDER_ARBITRUMSEPOLIA: 'https://sepolia-rollup.arbitrum.io/rpc',
      EVM_PROVIDER_MAINNET: 'https://ethereum-rpc.publicnode.com',
      EVM_PROVIDER_POLYGON: 'https://polygon-rpc.com',
      EVM_PROVIDER_ARBITRUM: 'https://arb1.arbitrum.io/rpc',
      EVM_PROVIDER_OPTIMISM: 'https://mainnet.optimism.io',
      EVM_PROVIDER_BASE: 'https://mainnet.base.org',
    };
    return settings[key] || '';
  });

  // Mock cache implementation
  const mockCache = new Map<string, any>();
  const mockGetCache = vi.fn().mockImplementation(async (key: string) => {
    return mockCache.get(key);
  });

  const mockSetCache = vi.fn().mockImplementation(async (key: string, value: any) => {
    mockCache.set(key, value);
  });

  const mockDeleteCache = vi.fn().mockImplementation(async (key: string) => {
    return mockCache.delete(key);
  });

  return {
    agentId: 'test-agent-id',
    serverUrl: 'http://localhost:3000',
    actions: [],
    evaluators: [],
    providers: [],
    plugins: [],
    services: new Map(),
    events: new Map(),
    routes: [],
    getPlugin: vi.fn(),
    getProvider: vi.fn(),
    getService: vi.fn(),
    registerAction: vi.fn(),
    registerEvaluator: vi.fn(),
    registerProvider: vi.fn(),
    registerService: vi.fn(),
    registerPlugin: vi.fn(),
    unregisterAction: vi.fn(),
    unregisterEvaluator: vi.fn(),
    unregisterProvider: vi.fn(),
    unregisterService: vi.fn(),
    buildActionInstruction: vi.fn(),
    buildMessageInstruction: vi.fn(),
    processActions: vi.fn(),
    evaluate: vi.fn(),
    ensureConnection: vi.fn(),
    useModel: vi.fn().mockResolvedValue(''),
    getSetting: mockGetSetting,

    // Cache methods
    getCache: mockGetCache,
    setCache: mockSetCache,
    deleteCache: mockDeleteCache,

    // Memory methods
    createMemory: vi.fn().mockResolvedValue('memory-id'),
    getMemories: vi.fn().mockResolvedValue([]),
    searchMemories: vi.fn().mockResolvedValue([]),
    updateMemory: vi.fn().mockResolvedValue(true),
    deleteMemory: vi.fn().mockResolvedValue(true),

    // Additional methods
    processMessage: vi.fn().mockResolvedValue(true),
    handleMessage: vi.fn().mockResolvedValue(true),

    character: {
      name: 'Test Agent',
      bio: 'A test agent for EVM testing',
      messageExamples: [],
      postExamples: [],
      topics: [],
      knowledge: [],
      plugins: [],
      settings: {
        secrets: {},
        chains: {
          evm: [
            'sepolia',
            'baseSepolia',
            'optimismSepolia',
            'arbitrumSepolia',
            'mainnet',
            'polygon',
            'arbitrum',
            'optimism',
            'base',
          ],
        },
      },
      style: {
        all: [],
        chat: [],
        post: [],
      },
    },
    databaseAdapter: {} as any,
    token: 'test-token',
    fetch: vi.fn(),
    bun: {} as any,
    logger: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    } as any,
    cacheManager: {} as any,
    getConversationLength: vi.fn(),
    processGoal: vi.fn(),
    updateRecentMessageState: vi.fn(),
    composeState: vi.fn().mockResolvedValue({
      values: {},
      data: {},
      text: '',
    }),
    messageManager: {} as any,
    descriptionManager: {} as any,
    loreManager: {} as any,
    documentsManager: {} as any,
    knowledgeManager: {} as any,
    memoryManager: {} as any,
  } as unknown as IAgentRuntime;
}

export async function fundWallet(address: Address): Promise<void> {
  // Mock funding function - in real tests this would need actual funding
  console.log(`Mock funding wallet ${address}`);
}

// Test proposal data
export const MOCK_PROPOSAL = {
  targets: ['0x1111111111111111111111111111111111111111'] as Address[],
  values: ['0'],
  calldatas: ['0x'] as `0x${string}`[],
  description: 'Test Proposal for unit tests',
} as const;

// Test chains configuration
export function getTestChains() {
  return {
    sepolia: testnetChains.sepolia,
    baseSepolia: testnetChains.baseSepolia,
    optimismSepolia: testnetChains.optimismSepolia,
    arbitrumSepolia: testnetChains.arbitrumSepolia,
    mainnet: mainnetChains.mainnet,
    polygon: mainnetChains.polygon,
    arbitrum: mainnetChains.arbitrum,
    optimism: mainnetChains.optimism,
    base: mainnetChains.base,
    bsc: mainnetChains.bsc,
    avalanche: mainnetChains.avalanche,
  };
}
