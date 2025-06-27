import { Scenario, ScenarioActor, UUID } from '../types';

export const defiYieldOptimizationScenario: Scenario = {
  id: 'wallet-scenario-01',
  name: 'DeFi Yield Optimization Across Chains',
  description: 'User wants to maximize yield by splitting funds between Aave on Polygon and Marinade on Solana',
  category: 'defi-yield',
  tags: ['defi', 'yield', 'cross-chain', 'lending', 'staking'],
  
  actors: [
    {
      id: 'yield-optimizer' as UUID,
      name: 'YieldOptimizerAgent',
      role: 'subject',
      personality: {
        traits: ['analytical', 'risk-aware', 'efficient'],
        systemPrompt: 'You are a DeFi yield optimization expert. You help users maximize their returns by finding the best yield opportunities across multiple chains while considering gas costs and risks.'
      },
      plugins: [
        'plugin-evm',
        'plugin-solana', 
        'plugin-bridge',
        'plugin-defi-aggregator',
        'plugin-monitoring'
      ]
    }
  ],
  
  setup: {
    roomType: 'dm',
    context: 'User has $5000 USDC on Polygon and wants to optimize yield across chains',
    environment: {
      initialBalance: {
        polygon: {
          USDC: 5000
        }
      },
      chains: ['polygon', 'solana'],
      protocols: ['aave', 'marinade']
    }
  },
  
  execution: {
    maxDuration: 300000, // 5 minutes
    realApiCallsExpected: true,
    strategy: {
      steps: [
        {
          type: 'message',
          content: 'I have $5000 USDC on Polygon. I want to maximize yield by splitting it between Aave on Polygon and Marinade on Solana. Can you find the best rates, execute the strategy, and set up auto-compounding?'
        },
        {
          type: 'wait',
          waitTime: 10000,
          description: 'Wait for agent to analyze yields'
        },
        {
          type: 'assert',
          assertion: {
            type: 'custom',
            value: 'agent_queries_yields',
            description: 'Agent should query current APYs on both protocols'
          }
        },
        {
          type: 'assert',
          assertion: {
            type: 'custom',
            value: 'agent_calculates_optimal_split',
            description: 'Agent should calculate optimal allocation considering gas costs'
          }
        },
        {
          type: 'assert',
          assertion: {
            type: 'custom',
            value: 'agent_executes_strategy',
            description: 'Agent should execute the yield optimization strategy'
          }
        }
      ]
    }
  },
  
  verification: {
    rules: [
      {
        id: 'yield-comparison',
        type: 'api-verification',
        description: 'Verify that agent queried yields from both protocols',
        config: {
          expectedActions: ['query_aave_apy', 'query_marinade_apy'],
          requiredData: ['aave_apy', 'marinade_apy']
        }
      },
      {
        id: 'optimal-allocation',
        type: 'llm-evaluation',
        description: 'Verify that agent calculated optimal allocation',
        config: {
          criteria: 'Agent should have calculated the optimal split between protocols considering: 1) Current APYs, 2) Bridge costs, 3) Gas fees on each chain'
        }
      },
      {
        id: 'bridge-execution',
        type: 'api-verification',
        description: 'Verify bridge transaction was initiated',
        config: {
          expectedActions: ['bridge_usdc_to_solana'],
          requiredData: ['bridge_tx_hash', 'bridge_amount']
        }
      },
      {
        id: 'protocol-deposits',
        type: 'api-verification',
        description: 'Verify deposits to both protocols',
        config: {
          expectedActions: ['deposit_aave_polygon', 'deposit_marinade_solana'],
          requiredData: ['aave_deposit_tx', 'marinade_deposit_tx']
        }
      },
      {
        id: 'auto-compound-setup',
        type: 'api-verification',
        description: 'Verify auto-compounding mechanism was set up',
        config: {
          expectedActions: ['setup_auto_compound'],
          criteria: 'Agent should have set up automated compounding for both positions'
        }
      }
    ],
    expectedOutcomes: [
      {
        actorId: 'yield-optimizer',
        outcome: 'Successfully optimized yield across chains',
        verification: {
          id: 'final-state',
          type: 'storage-verification',
          description: 'Verify final positions',
          config: {
            expectedState: {
              positions: {
                aave_polygon: { active: true },
                marinade_solana: { active: true }
              },
              auto_compound: { enabled: true }
            }
          }
        }
      }
    ]
  },
  
  benchmarks: {
    maxDuration: 300000,
    customMetrics: [
      {
        name: 'yield_optimization_efficiency',
        target: {
          execution_time: '<60s',
          gas_efficiency: '>0.8',
          yield_improvement: '>5%'
        }
      }
    ]
  }
}; 