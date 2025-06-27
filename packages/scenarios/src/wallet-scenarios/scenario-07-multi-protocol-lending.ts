import { Scenario, ScenarioActor, UUID } from '../types';

export const multiProtocolLendingScenario: Scenario = {
  id: 'wallet-scenario-07',
  name: 'Multi-Protocol Lending Optimization',
  description: 'Automatically optimize lending positions across multiple protocols and chains',
  category: 'lending-optimization',
  tags: ['lending', 'defi', 'cross-chain', 'optimization', 'yield'],
  
  actors: [
    {
      id: 'lending-optimizer' as UUID,
      name: 'LendingOptimizerAgent',
      role: 'subject',
      personality: {
        traits: ['analytical', 'efficient', 'yield-maximizing'],
        systemPrompt: 'You are a lending optimization specialist who helps users maximize yields by automatically moving funds between lending protocols based on rates, while maintaining safety and liquidity requirements.'
      },
      plugins: [
        'plugin-evm',
        'plugin-solana',
        'plugin-lending',
        'plugin-bridge',
        'plugin-monitoring'
      ]
    }
  ],
  
  setup: {
    roomType: 'dm',
    context: 'User has assets spread across multiple lending protocols',
    environment: {
      initialPositions: {
        ethereum: {
          compound: { USDC: 10000 }
        },
        polygon: {
          aave: { USDC: 15000 }
        },
        solana: {
          solend: { USDC: 5000 }
        }
      },
      constraints: {
        minSolanaAllocation: 0.3, // 30% must stay on Solana
        rebalanceThreshold: 0.02 // 2% APY difference triggers rebalance
      }
    }
  },
  
  execution: {
    maxDuration: 600000, // 10 minutes
    realApiCallsExpected: true,
    strategy: {
      steps: [
        {
          type: 'message',
          content: "I have assets spread across Compound (Ethereum), Aave (Polygon), and Solend (Solana). Create a system that automatically moves my funds to wherever I can get the best lending rates, but keep at least 30% on Solana for quick access."
        },
        {
          type: 'wait',
          waitTime: 10000,
          description: 'Wait for rate analysis'
        },
        {
          type: 'assert',
          assertion: {
            type: 'custom',
            value: 'agent_queries_all_rates',
            description: 'Agent queries lending rates across all protocols'
          }
        },
        {
          type: 'assert',
          assertion: {
            type: 'custom',
            value: 'agent_calculates_optimal_distribution',
            description: 'Agent calculates optimal distribution with constraints'
          }
        },
        {
          type: 'assert',
          assertion: {
            type: 'custom',
            value: 'agent_executes_rebalancing',
            description: 'Agent executes rebalancing transactions'
          }
        },
        {
          type: 'assert',
          assertion: {
            type: 'custom',
            value: 'agent_sets_monitoring',
            description: 'Agent sets up automated monitoring'
          }
        }
      ]
    }
  },
  
  verification: {
    rules: [
      {
        id: 'rate-monitoring',
        type: 'api-verification',
        description: 'Verify rate monitoring across protocols',
        config: {
          expectedActions: ['query_compound_apy', 'query_aave_apy', 'query_solend_apy'],
          requiredData: ['compound_rate', 'aave_rate', 'solend_rate']
        }
      },
      {
        id: 'optimization-logic',
        type: 'llm-evaluation',
        description: 'Verify optimization calculation',
        config: {
          criteria: 'Agent should: 1) Compare rates across all protocols, 2) Calculate gas/bridge costs, 3) Respect 30% Solana constraint, 4) Only rebalance if difference > 2%'
        }
      },
      {
        id: 'withdrawal-execution',
        type: 'api-verification',
        description: 'Verify withdrawals from lower-yield protocols',
        config: {
          expectedActions: ['withdraw_compound', 'withdraw_aave'],
          requiredData: ['withdrawal_amounts', 'withdrawal_txs']
        }
      },
      {
        id: 'bridge-operations',
        type: 'api-verification',
        description: 'Verify cross-chain transfers',
        config: {
          expectedActions: ['bridge_funds'],
          requiredData: ['bridge_routes', 'bridge_amounts', 'bridge_fees']
        }
      },
      {
        id: 'deposit-execution',
        type: 'api-verification',
        description: 'Verify deposits to higher-yield protocols',
        config: {
          expectedActions: ['deposit_lending'],
          requiredData: ['deposit_protocol', 'deposit_amount', 'new_apy']
        }
      },
      {
        id: 'constraint-validation',
        type: 'storage-verification',
        description: 'Verify Solana allocation constraint',
        config: {
          expectedState: {
            solana_allocation: '>=0.3',
            total_value_locked: 'number',
            weighted_avg_apy: 'number'
          }
        }
      },
      {
        id: 'automation-setup',
        type: 'api-verification',
        description: 'Verify automated monitoring setup',
        config: {
          expectedActions: ['setup_rate_monitor', 'configure_auto_rebalance'],
          criteria: 'Should monitor rates hourly and trigger rebalance when threshold met'
        }
      }
    ],
    expectedOutcomes: [
      {
        actorId: 'lending-optimizer',
        outcome: 'Successfully optimized lending across protocols',
        verification: {
          id: 'final-state',
          type: 'llm-evaluation',
          description: 'Verify complete optimization system',
          config: {
            criteria: 'Should have: 1) Optimal distribution based on rates, 2) Respected 30% Solana constraint, 3) Automated monitoring active, 4) Rebalancing rules configured, 5) Historical performance tracking'
          }
        }
      }
    ]
  },
  
  benchmarks: {
    maxDuration: 600000,
    customMetrics: [
      {
        name: 'lending_optimization_metrics',
        target: {
          execution_time: '<120s',
          apy_improvement: '>1%',
          gas_efficiency: '>0.9',
          constraint_compliance: '100%'
        }
      }
    ]
  }
}; 