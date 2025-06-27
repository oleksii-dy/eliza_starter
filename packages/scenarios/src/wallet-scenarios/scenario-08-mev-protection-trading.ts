import { Scenario, ScenarioActor, UUID } from '../types';

export const mevProtectionTradingScenario: Scenario = {
  id: 'wallet-scenario-08',
  name: 'MEV Protection Trading System',
  description: 'Execute DCA strategy with MEV protection across multiple chains',
  category: 'mev-protection',
  tags: ['mev', 'dca', 'trading', 'privacy', 'cross-chain'],
  
  actors: [
    {
      id: 'mev-protected-trader' as UUID,
      name: 'MEVProtectionAgent',
      role: 'subject',
      personality: {
        traits: ['security-conscious', 'methodical', 'privacy-focused'],
        systemPrompt: 'You are a MEV protection specialist who helps users execute trades safely using private mempools and MEV protection services across different chains.'
      },
      plugins: [
        'plugin-evm',
        'plugin-solana',
        'plugin-mev-protection',
        'plugin-dex-aggregator',
        'plugin-monitoring'
      ]
    }
  ],
  
  setup: {
    roomType: 'dm',
    context: 'User wants to DCA into ETH with MEV protection',
    environment: {
      dailyBudget: 500, // $500 USDC daily
      targetAsset: 'ETH',
      chains: {
        arbitrum: { protocol: 'gmx', mempool: 'flashbots' },
        base: { protocol: 'aerodrome', mempool: 'private' },
        solana: { protocol: 'jupiter', mempool: 'jito' }
      },
      splitRatio: [0.334, 0.333, 0.333] // Equal split
    }
  },
  
  execution: {
    maxDuration: 600000, // 10 minutes
    realApiCallsExpected: true,
    strategy: {
      steps: [
        {
          type: 'message',
          content: "I want to DCA $500 daily into ETH, but I'm worried about MEV. Split my buys across Arbitrum (using GMX), Base (using Aerodrome), and Solana (buying wrapped ETH on Jupiter). Always use private mempools and report any suspicious slippage."
        },
        {
          type: 'wait',
          waitTime: 10000,
          description: 'Wait for MEV protection setup'
        },
        {
          type: 'assert',
          assertion: {
            type: 'custom',
            value: 'agent_configures_mev_protection',
            description: 'Agent sets up MEV protection on all chains'
          }
        },
        {
          type: 'assert',
          assertion: {
            type: 'custom',
            value: 'agent_calculates_split',
            description: 'Agent calculates daily allocation split'
          }
        },
        {
          type: 'assert',
          assertion: {
            type: 'custom',
            value: 'agent_executes_arbitrum_buy',
            description: 'Agent executes buy on Arbitrum via Flashbots'
          }
        },
        {
          type: 'assert',
          assertion: {
            type: 'custom',
            value: 'agent_executes_base_buy',
            description: 'Agent executes buy on Base with private mempool'
          }
        },
        {
          type: 'assert',
          assertion: {
            type: 'custom',
            value: 'agent_executes_solana_buy',
            description: 'Agent executes buy on Solana via Jito bundles'
          }
        },
        {
          type: 'assert',
          assertion: {
            type: 'custom',
            value: 'agent_monitors_execution',
            description: 'Agent monitors execution quality'
          }
        }
      ]
    }
  },
  
  verification: {
    rules: [
      {
        id: 'mev-protection-setup',
        type: 'api-verification',
        description: 'Verify MEV protection configuration',
        config: {
          expectedActions: ['configure_flashbots', 'configure_private_mempool', 'configure_jito'],
          requiredData: ['protection_endpoints', 'bundle_builders']
        }
      },
      {
        id: 'allocation-calculation',
        type: 'llm-evaluation',
        description: 'Verify DCA allocation logic',
        config: {
          criteria: 'Agent should: 1) Split $500 equally ($167 per chain), 2) Account for gas costs, 3) Calculate expected slippage, 4) Set appropriate deadlines'
        }
      },
      {
        id: 'arbitrum-execution',
        type: 'api-verification',
        description: 'Verify Arbitrum GMX execution via Flashbots',
        config: {
          expectedActions: ['send_flashbots_bundle', 'execute_gmx_swap'],
          requiredData: ['bundle_hash', 'execution_price', 'gas_price']
        }
      },
      {
        id: 'base-execution',
        type: 'api-verification',
        description: 'Verify Base Aerodrome execution',
        config: {
          expectedActions: ['send_private_tx', 'execute_aerodrome_swap'],
          requiredData: ['private_tx_hash', 'execution_price']
        }
      },
      {
        id: 'solana-execution',
        type: 'api-verification',
        description: 'Verify Solana Jupiter execution via Jito',
        config: {
          expectedActions: ['send_jito_bundle', 'execute_jupiter_swap'],
          requiredData: ['bundle_id', 'execution_price', 'tip_amount']
        }
      },
      {
        id: 'slippage-monitoring',
        type: 'api-verification',
        description: 'Verify slippage monitoring',
        config: {
          expectedActions: ['compare_oracle_prices', 'calculate_slippage'],
          criteria: 'Should flag any slippage > 1% as suspicious'
        }
      },
      {
        id: 'performance-analysis',
        type: 'storage-verification',
        description: 'Verify execution quality tracking',
        config: {
          expectedState: {
            daily_executions: { count: 3 },
            avg_slippage: '<0.5%',
            mev_incidents: 0,
            total_eth_accumulated: 'number'
          }
        }
      }
    ],
    expectedOutcomes: [
      {
        actorId: 'mev-protected-trader',
        outcome: 'Successfully executed MEV-protected DCA strategy',
        verification: {
          id: 'final-state',
          type: 'llm-evaluation',
          description: 'Verify complete MEV protection system',
          config: {
            criteria: 'Should have: 1) All trades executed via private mempools, 2) Slippage within acceptable range, 3) No MEV attacks detected, 4) Daily automation configured, 5) Performance tracking active'
          }
        }
      }
    ]
  },
  
  benchmarks: {
    maxDuration: 600000,
    customMetrics: [
      {
        name: 'mev_protection_metrics',
        target: {
          execution_time: '<30s_per_trade',
          slippage: '<0.5%',
          mev_protection_rate: '100%',
          cost_efficiency: '>95%'
        }
      }
    ]
  }
}; 