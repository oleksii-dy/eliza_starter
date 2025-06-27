import { Scenario, ScenarioActor, UUID } from '../types';

export const governanceMiningScenario: Scenario = {
  id: 'wallet-scenario-09',
  name: 'Governance Mining & Bribing Strategy',
  description: 'Accumulate governance tokens and optimize voting for maximum bribes',
  category: 'governance-defi',
  tags: ['governance', 'mining', 'bribes', 'curve', 'voting'],
  
  actors: [
    {
      id: 'governance-strategist' as UUID,
      name: 'GovernanceStrategyAgent',
      role: 'subject',
      personality: {
        traits: ['strategic', 'politically-aware', 'yield-focused'],
        systemPrompt: 'You are a governance strategy specialist who helps users maximize returns through governance token accumulation, strategic voting, and bribe optimization across DeFi protocols.'
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
    context: 'User wants to accumulate CRV and maximize bribe income',
    environment: {
      initialBalance: {
        ethereum: {
          ETH: 20,
          USDC: 50000
        }
      },
      targetProtocol: 'curve',
      targetToken: 'CRV',
      votingStrategy: 'maximize-bribes',
      exitStrategy: 'stake-sol-jito'
    }
  },
  
  execution: {
    maxDuration: 900000, // 15 minutes
    realApiCallsExpected: true,
    strategy: {
      steps: [
        {
          type: 'message',
          content: "I want to accumulate CRV tokens by providing liquidity on Curve (Ethereum), use them to vote for gauge weights that benefit my positions on Polygon, and sell any bribes received for SOL to stake on Jito."
        },
        {
          type: 'wait',
          waitTime: 10000,
          description: 'Wait for strategy analysis'
        },
        {
          type: 'assert',
          assertion: {
            type: 'custom',
            value: 'agent_analyzes_curve_pools',
            description: 'Agent analyzes high-yield Curve pools'
          }
        },
        {
          type: 'assert',
          assertion: {
            type: 'custom',
            value: 'agent_provides_liquidity',
            description: 'Agent provides liquidity to optimal pools'
          }
        },
        {
          type: 'assert',
          assertion: {
            type: 'custom',
            value: 'agent_locks_crv',
            description: 'Agent locks CRV for veCRV'
          }
        },
        {
          type: 'assert',
          assertion: {
            type: 'custom',
            value: 'agent_monitors_bribes',
            description: 'Agent monitors bribe marketplaces'
          }
        },
        {
          type: 'assert',
          assertion: {
            type: 'custom',
            value: 'agent_votes_gauges',
            description: 'Agent votes for optimal gauge weights'
          }
        },
        {
          type: 'assert',
          assertion: {
            type: 'custom',
            value: 'agent_claims_bribes',
            description: 'Agent claims and converts bribes'
          }
        },
        {
          type: 'assert',
          assertion: {
            type: 'custom',
            value: 'agent_stakes_sol',
            description: 'Agent bridges to Solana and stakes on Jito'
          }
        }
      ]
    }
  },
  
  verification: {
    rules: [
      {
        id: 'pool-analysis',
        type: 'api-verification',
        description: 'Verify Curve pool analysis',
        config: {
          expectedActions: ['analyze_curve_pools', 'calculate_crv_rewards'],
          requiredData: ['pool_apys', 'crv_emission_rates', 'selected_pools']
        }
      },
      {
        id: 'liquidity-provision',
        type: 'api-verification',
        description: 'Verify liquidity provision to Curve',
        config: {
          expectedActions: ['add_liquidity_curve'],
          requiredData: ['lp_tokens_received', 'pool_addresses', 'deposit_amounts']
        }
      },
      {
        id: 'crv-locking',
        type: 'api-verification',
        description: 'Verify CRV locking for veCRV',
        config: {
          expectedActions: ['lock_crv_for_vecrv'],
          requiredData: ['vecrv_amount', 'lock_duration', 'voting_power']
        }
      },
      {
        id: 'bribe-monitoring',
        type: 'api-verification',
        description: 'Verify bribe marketplace monitoring',
        config: {
          expectedActions: ['monitor_votium', 'monitor_hidden_hand'],
          requiredData: ['available_bribes', 'bribe_values', 'optimal_votes']
        }
      },
      {
        id: 'gauge-voting',
        type: 'api-verification',
        description: 'Verify gauge weight voting',
        config: {
          expectedActions: ['vote_gauge_weights'],
          requiredData: ['votes_cast', 'gauges_voted', 'expected_bribes']
        }
      },
      {
        id: 'bribe-claim-conversion',
        type: 'api-verification',
        description: 'Verify bribe claiming and conversion',
        config: {
          expectedActions: ['claim_bribes', 'swap_to_sol', 'bridge_to_solana'],
          requiredData: ['bribes_claimed', 'sol_received', 'bridge_tx']
        }
      },
      {
        id: 'jito-staking',
        type: 'api-verification',
        description: 'Verify SOL staking on Jito',
        config: {
          expectedActions: ['stake_sol_jito'],
          requiredData: ['jitosol_received', 'mev_rewards_enabled', 'stake_tx']
        }
      },
      {
        id: 'roi-tracking',
        type: 'storage-verification',
        description: 'Verify complete ROI tracking',
        config: {
          expectedState: {
            crv_accumulated: 'number',
            vecrv_balance: 'number',
            total_bribes_earned: 'number',
            jito_staking_balance: 'number',
            total_roi: '>20%'
          }
        }
      }
    ],
    expectedOutcomes: [
      {
        actorId: 'governance-strategist',
        outcome: 'Successfully executed governance mining strategy',
        verification: {
          id: 'final-state',
          type: 'llm-evaluation',
          description: 'Verify complete governance system',
          config: {
            criteria: 'Should have: 1) Active LP positions earning CRV, 2) veCRV locked and voting, 3) Optimal gauge votes for bribes, 4) Automated bribe claiming, 5) SOL staking on Jito for MEV rewards'
          }
        }
      }
    ]
  },
  
  benchmarks: {
    maxDuration: 900000,
    customMetrics: [
      {
        name: 'governance_strategy_metrics',
        target: {
          execution_time: '<300s',
          bribe_capture_rate: '>90%',
          voting_efficiency: '>95%',
          total_yield: '>25%_apy'
        }
      }
    ]
  }
}; 