import { IAgentRuntime } from '@elizaos/core';

// Define types locally since they're not exported
interface ActionSpec {
  name: string;
  description: string;
  parameters?: Record<string, any>;
}

interface ProviderSpec {
  name: string;
  description: string;
  dataStructure?: Record<string, any>;
}

interface ServiceSpec {
  name: string;
  description: string;
  methods?: string[];
}

interface PluginSpecification {
  name: string;
  description: string;
  version?: string;
  actions?: ActionSpec[];
  providers?: ProviderSpec[];
  services?: ServiceSpec[];
  evaluators?: any[];
  environmentVariables?: any[];
  dependencies?: string[];
}

// Define all the plugin specifications we need
export const pluginSpecifications: PluginSpecification[] = [
  // Plugin: Bridge
  {
    name: 'plugin-bridge',
    description: 'Cross-chain bridge integration supporting Wormhole, Hop, and Synapse protocols',
    version: '1.0.0',
    actions: [
      {
        name: 'BRIDGE_TOKENS',
        description: 'Bridge tokens between chains using the optimal bridge protocol',
        parameters: {
          token: 'string',
          amount: 'string',
          fromChain: 'string',
          toChain: 'string',
          recipient: 'string',
          bridge: 'string' // 'auto' | 'wormhole' | 'hop' | 'synapse'
        }
      },
      {
        name: 'CHECK_BRIDGE_STATUS',
        description: 'Check the status of a bridge transaction',
        parameters: {
          txHash: 'string',
          bridge: 'string'
        }
      },
      {
        name: 'ESTIMATE_BRIDGE_FEES',
        description: 'Estimate fees for bridging tokens',
        parameters: {
          token: 'string',
          amount: 'string',
          fromChain: 'string',
          toChain: 'string',
          bridge: 'string'
        }
      }
    ],
    services: [
      {
        name: 'BridgeService',
        description: 'Service for managing cross-chain bridges',
        methods: ['getBestBridge', 'executeBridge', 'trackBridgeStatus']
      }
    ],
    dependencies: ['ethers', '@wormhole-foundation/sdk', '@hop-protocol/sdk', '@synapseprotocol/sdk-router']
  },

  // Plugin: DeFi Aggregator
  {
    name: 'plugin-defi-aggregator',
    description: 'DeFi yield aggregator for finding and optimizing yields across protocols',
    version: '1.0.0',
    actions: [
      {
        name: 'FIND_BEST_YIELDS',
        description: 'Find best yield opportunities across multiple protocols and chains',
        parameters: {
          token: 'string',
          amount: 'string',
          chains: 'string[]',
          minApy: 'number',
          riskLevel: 'string' // 'low' | 'medium' | 'high'
        }
      },
      {
        name: 'OPTIMIZE_YIELD_STRATEGY',
        description: 'Create optimal yield strategy across protocols',
        parameters: {
          capital: 'string',
          tokens: 'string[]',
          chains: 'string[]',
          targetApy: 'number'
        }
      },
      {
        name: 'AUTO_COMPOUND',
        description: 'Set up auto-compounding for positions',
        parameters: {
          positions: 'object[]',
          frequency: 'string' // 'daily' | 'weekly' | 'monthly'
        }
      }
    ],
    providers: [
      {
        name: 'YIELD_PROVIDER',
        description: 'Provides current yield data across protocols',
        dataStructure: {
          yields: 'Map<protocol, APY>',
          risks: 'Map<protocol, riskScore>'
        }
      }
    ],
    services: [
      {
        name: 'YieldAggregatorService',
        description: 'Service for yield aggregation and optimization',
        methods: ['fetchYields', 'calculateOptimalAllocation', 'executeStrategy']
      }
    ],
    dependencies: ['@defillama/sdk', 'ethers', '@solana/web3.js']
  },

  // Plugin: Lending
  {
    name: 'plugin-lending',
    description: 'Multi-protocol lending integration for Aave, Compound, Radiant, and Solend',
    version: '1.0.0',
    actions: [
      {
        name: 'DEPOSIT_LENDING',
        description: 'Deposit assets into lending protocol',
        parameters: {
          protocol: 'string', // 'aave' | 'compound' | 'radiant' | 'solend'
          asset: 'string',
          amount: 'string',
          chain: 'string'
        }
      },
      {
        name: 'BORROW_LENDING',
        description: 'Borrow assets from lending protocol',
        parameters: {
          protocol: 'string',
          asset: 'string',
          amount: 'string',
          collateral: 'string',
          chain: 'string'
        }
      },
      {
        name: 'REPAY_LENDING',
        description: 'Repay borrowed assets',
        parameters: {
          protocol: 'string',
          asset: 'string',
          amount: 'string',
          chain: 'string'
        }
      },
      {
        name: 'WITHDRAW_LENDING',
        description: 'Withdraw deposited assets',
        parameters: {
          protocol: 'string',
          asset: 'string',
          amount: 'string',
          chain: 'string'
        }
      },
      {
        name: 'CHECK_HEALTH_FACTOR',
        description: 'Check health factor of lending position',
        parameters: {
          protocol: 'string',
          account: 'string',
          chain: 'string'
        }
      }
    ],
    services: [
      {
        name: 'LendingService',
        description: 'Service for multi-protocol lending operations',
        methods: ['getProtocolAdapter', 'calculateHealthFactor', 'monitorPositions']
      }
    ],
    dependencies: ['@aave/core-v3', '@compound-finance/compound-js', 'ethers', '@solana/web3.js']
  },

  // Plugin: DEX Aggregator
  {
    name: 'plugin-dex-aggregator',
    description: 'DEX aggregator for optimal swap routing across chains',
    version: '1.0.0',
    actions: [
      {
        name: 'FIND_BEST_ROUTE',
        description: 'Find best swap route across DEXes',
        parameters: {
          tokenIn: 'string',
          tokenOut: 'string',
          amountIn: 'string',
          chain: 'string',
          slippageTolerance: 'number'
        }
      },
      {
        name: 'EXECUTE_SWAP_AGGREGATED',
        description: 'Execute swap through optimal route',
        parameters: {
          route: 'object',
          amountIn: 'string',
          minAmountOut: 'string',
          deadline: 'number'
        }
      }
    ],
    services: [
      {
        name: 'DexAggregatorService',
        description: 'Service for DEX aggregation',
        methods: ['findRoutes', 'executeSwap', 'estimateGas']
      }
    ],
    dependencies: ['@1inch/sdk', '@jup-ag/api', 'ethers']
  },

  // Plugin: Options
  {
    name: 'plugin-options',
    description: 'Options trading integration for Lyra and other protocols',
    version: '1.0.0',
    actions: [
      {
        name: 'BUY_OPTION',
        description: 'Buy call or put options',
        parameters: {
          protocol: 'string',
          underlying: 'string',
          strike: 'string',
          expiry: 'number',
          optionType: 'string', // 'call' | 'put'
          amount: 'number'
        }
      },
      {
        name: 'SELL_OPTION',
        description: 'Sell call or put options',
        parameters: {
          protocol: 'string',
          underlying: 'string',
          strike: 'string',
          expiry: 'number',
          optionType: 'string',
          amount: 'number'
        }
      },
      {
        name: 'GET_OPTION_GREEKS',
        description: 'Get option Greeks (delta, gamma, theta, vega)',
        parameters: {
          protocol: 'string',
          optionId: 'string'
        }
      }
    ],
    services: [
      {
        name: 'OptionsService',
        description: 'Service for options trading',
        methods: ['calculatePremium', 'getGreeks', 'managePositions']
      }
    ],
    dependencies: ['@lyrafinance/sdk', 'ethers']
  },

  // Plugin: Perpetuals
  {
    name: 'plugin-perpetuals',
    description: 'Perpetual futures trading for dYdX, GMX, and Drift',
    version: '1.0.0',
    actions: [
      {
        name: 'OPEN_PERP_POSITION',
        description: 'Open perpetual position',
        parameters: {
          protocol: 'string', // 'dydx' | 'gmx' | 'drift'
          market: 'string',
          side: 'string', // 'long' | 'short'
          size: 'string',
          leverage: 'number',
          chain: 'string'
        }
      },
      {
        name: 'CLOSE_PERP_POSITION',
        description: 'Close perpetual position',
        parameters: {
          protocol: 'string',
          positionId: 'string',
          chain: 'string'
        }
      },
      {
        name: 'GET_FUNDING_RATE',
        description: 'Get current funding rate',
        parameters: {
          protocol: 'string',
          market: 'string',
          chain: 'string'
        }
      }
    ],
    services: [
      {
        name: 'PerpetualsService',
        description: 'Service for perpetual futures trading',
        methods: ['monitorFunding', 'calculatePnL', 'manageRisk']
      }
    ],
    dependencies: ['@dydxprotocol/v4-client', '@gmx-io/sdk', '@drift-labs/sdk']
  },

  // Plugin: NFT Trading
  {
    name: 'plugin-nft-trading',
    description: 'NFT trading across OpenSea and Magic Eden',
    version: '1.0.0',
    actions: [
      {
        name: 'BUY_NFT',
        description: 'Buy NFT from marketplace',
        parameters: {
          marketplace: 'string', // 'opensea' | 'magiceden'
          collection: 'string',
          tokenId: 'string',
          price: 'string',
          chain: 'string'
        }
      },
      {
        name: 'LIST_NFT',
        description: 'List NFT on marketplace',
        parameters: {
          marketplace: 'string',
          collection: 'string',
          tokenId: 'string',
          price: 'string',
          chain: 'string'
        }
      },
      {
        name: 'GET_FLOOR_PRICE',
        description: 'Get collection floor price',
        parameters: {
          marketplace: 'string',
          collection: 'string',
          chain: 'string'
        }
      }
    ],
    services: [
      {
        name: 'NFTTradingService',
        description: 'Service for NFT trading',
        methods: ['monitorFloorPrices', 'detectArbitrage', 'executeTrade']
      }
    ],
    dependencies: ['opensea-js', '@magiceden-oss/open_creator_protocol', 'ethers']
  },

  // Plugin: Monitoring
  {
    name: 'plugin-monitoring',
    description: 'Comprehensive monitoring for DeFi positions and market data',
    version: '1.0.0',
    actions: [
      {
        name: 'MONITOR_POSITION',
        description: 'Monitor DeFi position health',
        parameters: {
          protocol: 'string',
          positionId: 'string',
          alerts: 'object'
        }
      },
      {
        name: 'TRACK_PRICE_FEED',
        description: 'Track real-time price feeds',
        parameters: {
          tokens: 'string[]',
          interval: 'number'
        }
      },
      {
        name: 'SET_ALERT',
        description: 'Set price or condition alerts',
        parameters: {
          type: 'string', // 'price' | 'apy' | 'health' | 'funding'
          condition: 'object',
          action: 'string'
        }
      }
    ],
    providers: [
      {
        name: 'MONITORING_PROVIDER',
        description: 'Provides monitoring data and alerts',
        dataStructure: {
          positions: 'Map<positionId, health>',
          alerts: 'Alert[]',
          priceFeeds: 'Map<token, price>'
        }
      }
    ],
    services: [
      {
        name: 'MonitoringService',
        description: 'Service for position and market monitoring',
        methods: ['subscribeToFeeds', 'checkAlerts', 'generateReports']
      }
    ],
    dependencies: ['@chainlink/contracts', 'ws', 'node-cron']
  },

  // Plugin: MEV Protection  
  {
    name: 'plugin-mev-protection',
    description: 'MEV protection for transactions across chains',
    version: '1.0.0',
    actions: [
      {
        name: 'SEND_PRIVATE_TX',
        description: 'Send transaction through private mempool',
        parameters: {
          transaction: 'object',
          chain: 'string',
          provider: 'string' // 'flashbots' | 'mev-share' | 'jito'
        }
      },
      {
        name: 'ESTIMATE_MEV_RISK',
        description: 'Estimate MEV risk for transaction',
        parameters: {
          transaction: 'object',
          chain: 'string'
        }
      }
    ],
    services: [
      {
        name: 'MEVProtectionService', 
        description: 'Service for MEV protection',
        methods: ['sendPrivateTransaction', 'monitorMEV', 'calculateOptimalGas']
      }
    ],
    dependencies: ['@flashbots/ethers-provider-bundle', 'jito-ts']
  }
];

// Function to generate plugins using the autocoder
export async function generateMissingPlugins(runtime: IAgentRuntime) {
  const pluginCreationService = runtime.getService('plugin_creation') as any;
  
  if (!pluginCreationService) {
    throw new Error('Plugin creation service not available');
  }

  const jobIds: Map<string, string> = new Map();

  for (const spec of pluginSpecifications) {
    console.log(`🔨 Creating plugin: ${spec.name}`);
    try {
      const jobId = await pluginCreationService.createPlugin(spec);
      jobIds.set(spec.name, jobId);
      console.log(`✅ Started job ${jobId} for ${spec.name}`);
    } catch (error) {
      console.error(`❌ Failed to create ${spec.name}:`, error);
    }
  }

  return jobIds;
}

// Helper to check job statuses
export async function checkPluginGenerationStatus(runtime: IAgentRuntime, jobIds: Map<string, string>) {
  const pluginCreationService = runtime.getService('plugin_creation') as any;
  
  if (!pluginCreationService) {
    throw new Error('Plugin creation service not available');
  }

  const statuses = new Map<string, any>();

  for (const [pluginName, jobId] of jobIds.entries()) {
    const job = pluginCreationService.getJobStatus(jobId);
    statuses.set(pluginName, {
      status: job?.status || 'unknown',
      error: job?.error,
      outputPath: job?.outputPath
    });
  }

  return statuses;
} 