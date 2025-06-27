import { Scenario, ScenarioActor, UUID } from '../types';

export const optionsStrategyScenario: Scenario = {
  id: 'wallet-scenario-05',
  name: 'Options Strategy with DeFi Integration',
  description: 'Execute covered call options strategy with automated premium compounding',
  category: 'options-defi',
  tags: ['options', 'defi', 'cross-chain', 'yield', 'lyra'],
  
  actors: [
    {
      id: 'options-strategist' as UUID,
      name: 'OptionsStrategyAgent',
      role: 'subject',
      personality: {
        traits: ['analytical', 'risk-aware', 'options-expert'],
        systemPrompt: 'You are an options trading specialist who helps users generate income through covered calls and other options strategies, with automated DeFi integration for premium optimization.'
      },
      plugins: [
        'plugin-evm',
        'plugin-options',
        'plugin-bridge',
        'plugin-defi-aggregator',
        'plugin-monitoring'
      ]
    }
  ],
  
  setup: {
    roomType: 'dm',
    context: 'User wants to sell covered calls on ETH and compound premiums',
    environment: {
      initialBalance: {
        arbitrum: {
          ETH: 5
        }
      },
      optionsProtocol: 'lyra',
      targetStrike: 'ATM+5%',
      expiry: 'weekly',
      premiumStrategy: 'beefy-polygon'
    }
  },
  
  execution: {
    maxDuration: 480000, // 8 minutes
    realApiCallsExpected: true,
    strategy: {
      steps: [
        {
          type: 'message',
          content: "ETH is at $2000. I want to sell covered calls on Lyra (Arbitrum) using my 5 ETH, collect premiums in USDC, and automatically deposit those premiums into the Beefy optimizer on Polygon for compound yield."
        },
        {
          type: 'wait',
          waitTime: 10000,
          description: 'Wait for options analysis'
        },
        {
          type: 'assert',
          assertion: {
            type: 'custom',
            value: 'agent_deposits_collateral',
            description: 'Agent deposits ETH into Lyra'
          }
        },
        {
          type: 'assert',
          assertion: {
            type: 'custom',
            value: 'agent_calculates_options',
            description: 'Agent calculates optimal strike and premium'
          }
        },
        {
          type: 'assert',
          assertion: {
            type: 'custom',
            value: 'agent_sells_calls',
            description: 'Agent sells covered calls'
          }
        },
        {
          type: 'assert',
          assertion: {
            type: 'custom',
            value: 'agent_bridges_premium',
            description: 'Agent bridges USDC premium to Polygon'
          }
        },
        {
          type: 'assert',
          assertion: {
            type: 'custom',
            value: 'agent_deposits_beefy',
            description: 'Agent deposits into Beefy vault'
          }
        },
        {
          type: 'assert',
          assertion: {
            type: 'custom',
            value: 'agent_monitors_position',
            description: 'Agent sets up position monitoring'
          }
        }
      ]
    }
  },
  
  verification: {
    rules: [
      {
        id: 'collateral-deposit',
        type: 'api-verification',
        description: 'Verify ETH deposit into Lyra',
        config: {
          expectedActions: ['deposit_lyra_collateral'],
          requiredData: ['deposit_tx', 'collateral_amount']
        }
      },
      {
        id: 'options-calculation',
        type: 'llm-evaluation',
        description: 'Verify options pricing and Greeks',
        config: {
          criteria: 'Agent should: 1) Calculate strike at 5% OTM, 2) Price option using Black-Scholes, 3) Calculate Greeks (delta, gamma, theta, vega), 4) Determine optimal size'
        }
      },
      {
        id: 'covered-call-sale',
        type: 'api-verification',
        description: 'Verify covered call execution',
        config: {
          expectedActions: ['sell_covered_call'],
          requiredData: ['option_id', 'strike', 'expiry', 'premium_collected']
        }
      },
      {
        id: 'premium-bridge',
        type: 'api-verification',
        description: 'Verify premium bridge to Polygon',
        config: {
          expectedActions: ['bridge_usdc_to_polygon'],
          requiredData: ['bridge_tx', 'destination_amount']
        }
      },
      {
        id: 'beefy-deposit',
        type: 'api-verification',
        description: 'Verify Beefy vault deposit',
        config: {
          expectedActions: ['deposit_beefy_vault'],
          requiredData: ['vault_address', 'moo_tokens_received', 'current_apy']
        }
      },
      {
        id: 'risk-monitoring',
        type: 'api-verification',
        description: 'Verify risk monitoring setup',
        config: {
          expectedActions: ['monitor_greeks', 'set_alerts'],
          criteria: 'Should monitor: 1) Option Greeks, 2) Underlying price, 3) Assignment risk, 4) Premium yields'
        }
      },
      {
        id: 'weekly-renewal',
        type: 'storage-verification',
        description: 'Verify weekly strategy renewal',
        config: {
          expectedState: {
            auto_renewal: { enabled: true },
            strategy_params: {
              strike_offset: '5%',
              expiry: 'weekly',
              compound_premiums: true
            }
          }
        }
      }
    ],
    expectedOutcomes: [
      {
        actorId: 'options-strategist',
        outcome: 'Successfully executed covered call strategy with DeFi integration',
        verification: {
          id: 'final-state',
          type: 'llm-evaluation',
          description: 'Verify complete options system',
          config: {
            criteria: 'Should have: 1) Active covered call position, 2) Premium collected and bridged, 3) Compounding in Beefy vault, 4) Risk monitoring active, 5) Weekly renewal scheduled'
          }
        }
      }
    ]
  },
  
  benchmarks: {
    maxDuration: 480000,
    customMetrics: [
      {
        name: 'options_strategy_efficiency',
        target: {
          execution_time: '<60s',
          premium_capture: '>95%',
          bridge_efficiency: '>98%',
          compound_apy: '>base_rate+5%'
        }
      }
    ]
  }
}; 