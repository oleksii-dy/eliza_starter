import { Scenario, ScenarioActor, UUID } from '../types';

export const leveragedFarmingScenario: Scenario = {
  id: 'wallet-scenario-03',
  name: 'Leveraged Farming Strategy',
  description: 'Execute 3x leveraged yield farming using cross-chain lending and liquidity provision',
  category: 'defi-advanced',
  tags: ['defi', 'leverage', 'farming', 'cross-chain', 'lending', 'liquidity'],
  
  actors: [
    {
      id: 'leverage-farmer' as UUID,
      name: 'LeverageFarmingAgent',
      role: 'subject',
      personality: {
        traits: ['strategic', 'risk-aware', 'yield-focused'],
        systemPrompt: 'You are a DeFi strategist specializing in leveraged yield farming. You help users maximize returns through careful leverage management and cross-chain optimization while monitoring risk parameters.'
      },
      plugins: [
        'plugin-evm',
        'plugin-bridge',
        'plugin-lending',
        'plugin-defi-aggregator',
        'plugin-monitoring'
      ]
    }
  ],
  
  setup: {
    roomType: 'dm',
    context: 'User wants to farm ETH-MATIC pool with 3x leverage',
    environment: {
      initialBalance: {
        arbitrum: {
          ETH: 10
        }
      },
      targetPool: 'ETH-MATIC',
      targetDex: 'QuickSwap',
      targetChain: 'polygon',
      leverageProtocol: 'Radiant',
      leverageChain: 'arbitrum',
      targetLeverage: 3
    }
  },
  
  execution: {
    maxDuration: 480000, // 8 minutes
    realApiCallsExpected: true,
    strategy: {
      steps: [
        {
          type: 'message',
          content: 'I want to farm the new ETH-MATIC pool on QuickSwap with 3x leverage. Use my 10 ETH collateral on Arbitrum, borrow on Radiant, bridge to Polygon, and farm. When APY drops below 20%, unwind everything and convert profits to SOL.'
        },
        {
          type: 'wait',
          waitTime: 10000,
          description: 'Wait for strategy planning'
        },
        {
          type: 'assert',
          assertion: {
            type: 'custom',
            value: 'agent_deposits_collateral',
            description: 'Agent should deposit ETH as collateral on Radiant'
          }
        },
        {
          type: 'assert',
          assertion: {
            type: 'custom',
            value: 'agent_borrows_assets',
            description: 'Agent should borrow stablecoins at optimal LTV'
          }
        },
        {
          type: 'assert',
          assertion: {
            type: 'custom',
            value: 'agent_bridges_to_polygon',
            description: 'Agent should bridge borrowed assets to Polygon'
          }
        },
        {
          type: 'assert',
          assertion: {
            type: 'custom',
            value: 'agent_creates_lp_position',
            description: 'Agent should create LP position and stake'
          }
        },
        {
          type: 'assert',
          assertion: {
            type: 'custom',
            value: 'agent_monitors_apy',
            description: 'Agent should set up APY monitoring'
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
        description: 'Verify ETH deposit on Radiant',
        config: {
          expectedActions: ['deposit_radiant'],
          requiredData: ['deposit_tx_hash', 'collateral_amount']
        }
      },
      {
        id: 'leverage-calculation',
        type: 'llm-evaluation',
        description: 'Verify leverage calculations',
        config: {
          criteria: 'Agent should: 1) Calculate safe borrow amount for 3x leverage, 2) Consider liquidation risk, 3) Account for interest rates, 4) Plan for gas costs across chains'
        }
      },
      {
        id: 'borrow-execution',
        type: 'api-verification',
        description: 'Verify borrow transaction',
        config: {
          expectedActions: ['borrow_radiant'],
          requiredData: ['borrow_tx_hash', 'borrowed_amount', 'health_factor']
        }
      },
      {
        id: 'bridge-to-polygon',
        type: 'api-verification',
        description: 'Verify bridge to Polygon',
        config: {
          expectedActions: ['bridge_to_polygon'],
          requiredData: ['bridge_tx_hash', 'destination_amount']
        }
      },
      {
        id: 'lp-creation',
        type: 'api-verification',
        description: 'Verify LP token creation and farming',
        config: {
          expectedActions: ['swap_to_eth_matic', 'add_liquidity', 'stake_lp_tokens'],
          requiredData: ['lp_token_amount', 'farm_apy', 'stake_tx_hash']
        }
      },
      {
        id: 'monitoring-setup',
        type: 'api-verification',
        description: 'Verify monitoring and auto-unwind setup',
        config: {
          expectedActions: ['setup_apy_monitor', 'setup_health_monitor'],
          criteria: 'Should monitor: 1) Farm APY, 2) Health factor, 3) Set auto-unwind at 20% APY'
        }
      },
      {
        id: 'risk-management',
        type: 'storage-verification',
        description: 'Verify risk parameters',
        config: {
          expectedState: {
            position: {
              leverage: 3,
              health_factor: '>1.5',
              liquidation_price: 'number',
              auto_unwind_apy: 20
            }
          }
        }
      }
    ],
    expectedOutcomes: [
      {
        actorId: 'leverage-farmer',
        outcome: 'Successfully executed leveraged farming strategy',
        verification: {
          id: 'final-state',
          type: 'llm-evaluation',
          description: 'Verify complete leveraged position',
          config: {
            criteria: 'Should have: 1) Active 3x leveraged position, 2) LP tokens staked and earning, 3) Health factor >1.5, 4) Auto-unwind mechanism active, 5) Profit conversion plan to SOL'
          }
        }
      }
    ]
  },
  
  benchmarks: {
    maxDuration: 480000,
    customMetrics: [
      {
        name: 'leverage_efficiency',
        target: {
          execution_time: '<120s',
          actual_leverage: '2.8-3.2x',
          gas_optimization: '>0.85',
          health_factor: '>1.5'
        }
      }
    ]
  }
}; 