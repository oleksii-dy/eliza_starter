/**
 * Testnet Configuration for Wallet Scenarios
 * Contains real testnet endpoints, faucets, and test tokens
 */

export interface ChainConfig {
  name: string;
  chainId: number;
  rpcUrl: string;
  explorerUrl: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  testTokens?: {
    [symbol: string]: {
      address: string;
      decimals: number;
      faucet?: string;
    };
  };
  protocols?: {
    [name: string]: {
      address?: string;
      router?: string;
      factory?: string;
    };
  };
}

// EVM Testnet Configurations
export const evmTestnets: Record<string, ChainConfig> = {
  // Ethereum Sepolia
  ethereumSepolia: {
    name: 'Ethereum Sepolia',
    chainId: 11155111,
    rpcUrl: 'https://ethereum-sepolia-rpc.publicnode.com',
    explorerUrl: 'https://sepolia.etherscan.io',
    nativeCurrency: {
      name: 'Sepolia ETH',
      symbol: 'ETH',
      decimals: 18
    },
    testTokens: {
      USDC: {
        address: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
        decimals: 6,
        faucet: 'https://faucet.circle.com/'
      },
      WETH: {
        address: '0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9',
        decimals: 18
      }
    },
    protocols: {
      uniswapV3: {
        router: '0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E',
        factory: '0x0227628f3F023bb0B980b67D528571c95c6DaC1c'
      },
      aave: {
        address: '0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951'
      }
    }
  },

  // Polygon Mumbai
  polygonMumbai: {
    name: 'Polygon Mumbai',
    chainId: 80001,
    rpcUrl: 'https://polygon-mumbai-bor-rpc.publicnode.com',
    explorerUrl: 'https://mumbai.polygonscan.com',
    nativeCurrency: {
      name: 'Mumbai MATIC',
      symbol: 'MATIC',
      decimals: 18
    },
    testTokens: {
      USDC: {
        address: '0x9999f7Fea5938fD3b1E26A12c3f2fb024e194f97',
        decimals: 6
      },
      WMATIC: {
        address: '0x9c3C9283D3e44854697Cd22D3Faa240Cfb032889',
        decimals: 18
      }
    },
    protocols: {
      quickswap: {
        router: '0x8954AfA98594b838bda56FE4C12a09D7739D179b',
        factory: '0x5757371414417b8C6CAad45bAeF941aBc7d3Ab32'
      },
      aave: {
        address: '0x6C9fB0D5bD9429eb9Cd96B85B81d872281771E6B'
      }
    }
  },

  // Arbitrum Sepolia
  arbitrumSepolia: {
    name: 'Arbitrum Sepolia',
    chainId: 421614,
    rpcUrl: 'https://arbitrum-sepolia.blockpi.network/v1/rpc/public',
    explorerUrl: 'https://sepolia.arbiscan.io',
    nativeCurrency: {
      name: 'Arbitrum Sepolia ETH',
      symbol: 'ETH',
      decimals: 18
    },
    testTokens: {
      USDC: {
        address: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d',
        decimals: 6
      }
    },
    protocols: {
      gmx: {
        router: '0x7452c558d45f8afC8c83dAe62C3f8A5BE19c71f6'
      },
      radiant: {
        address: '0x9D0464d07FaDE3D0c9530Ac27Cf433765b1Fa528'
      }
    }
  },

  // Base Sepolia
  baseSepolia: {
    name: 'Base Sepolia',
    chainId: 84532,
    rpcUrl: 'https://sepolia.base.org',
    explorerUrl: 'https://sepolia.basescan.org',
    nativeCurrency: {
      name: 'Base Sepolia ETH',
      symbol: 'ETH',
      decimals: 18
    },
    testTokens: {
      USDC: {
        address: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
        decimals: 6
      }
    },
    protocols: {
      aerodrome: {
        router: '0xDc3D1be7a4849245Bf7C0E2455d1fd8ceFD35D46'
      }
    }
  }
};

// Solana Configuration
export const solanaTestnet = {
  name: 'Solana Testnet',
  cluster: 'testnet',
  rpcUrl: 'https://api.testnet.solana.com',
  wsUrl: 'wss://api.testnet.solana.com',
  explorerUrl: 'https://explorer.solana.com/?cluster=testnet',
  faucet: 'https://faucet.solana.com',
  tokens: {
    USDC: {
      mint: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
      decimals: 6
    },
    WSOL: {
      mint: 'So11111111111111111111111111111111111111112',
      decimals: 9
    }
  },
  protocols: {
    jupiter: {
      api: 'https://quote-api.jup.ag/v6'
    },
    marinade: {
      program: 'MarBmsSgKXdrN1egZf5sqe1TMai9K1rChYNDJgjq7aD'
    },
    solend: {
      program: 'So1endDq2YkqhipRh3WViPa8hdiSpxWy6z3Z6tMCpAo'
    },
    drift: {
      program: 'dRiftyHA39MWEi3m9aunc5MzRF1JYuBsbn6VPcn33UH'
    }
  }
};

// Mainnet Configurations (for reference)
export const mainnetConfigs = {
  ethereum: {
    chainId: 1,
    rpcUrl: process.env.ETHEREUM_RPC_URL || 'https://eth.llamarpc.com',
    explorerUrl: 'https://etherscan.io'
  },
  polygon: {
    chainId: 137,
    rpcUrl: process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com',
    explorerUrl: 'https://polygonscan.com'
  },
  arbitrum: {
    chainId: 42161,
    rpcUrl: process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc',
    explorerUrl: 'https://arbiscan.io'
  },
  base: {
    chainId: 8453,
    rpcUrl: process.env.BASE_RPC_URL || 'https://mainnet.base.org',
    explorerUrl: 'https://basescan.org'
  },
  solana: {
    cluster: 'mainnet-beta',
    rpcUrl: process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
    explorerUrl: 'https://explorer.solana.com'
  }
};

// Test Wallets (DO NOT USE IN PRODUCTION)
export const testWallets = {
  evm: {
    // Test wallet for EVM chains - funded on testnets only
    address: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD7F',
    // WARNING: This is a well-known test private key - DO NOT USE WITH REAL FUNDS
    privateKey: '0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
  },
  solana: {
    // Test wallet for Solana - use Solana CLI to generate for actual testing
    publicKey: 'HVqfaSWEMxvbZSAzFsZFCnJq4sZcXY7Z1C8YFwDgYNkK'
  }
};

// Faucet URLs
export const faucets = {
  ethereum: 'https://sepoliafaucet.com/',
  polygon: 'https://faucet.polygon.technology/',
  arbitrum: 'https://faucet.arbitrum.io/',
  base: 'https://docs.base.org/docs/tools/network-faucets/',
  solana: 'https://faucet.solana.com/'
};

// Helper function to get chain config
export function getChainConfig(chainName: string): ChainConfig | null {
  return evmTestnets[chainName] || null;
}

// Helper to get all testnet RPCs
export function getAllTestnetRPCs(): Record<string, string> {
  const rpcs: Record<string, string> = {};
  
  for (const [key, config] of Object.entries(evmTestnets)) {
    rpcs[`${key.toUpperCase()}_RPC_URL`] = config.rpcUrl;
  }
  
  rpcs.SOLANA_RPC_URL = solanaTestnet.rpcUrl;
  
  return rpcs;
} 