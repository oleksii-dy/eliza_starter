import { Scenario, ScenarioActor, UUID } from '../types';

export const gamingDefiComboScenario: Scenario = {
  id: 'wallet-scenario-04',
  name: 'Gaming & DeFi Combo',
  description: 'Manage gaming earnings with automated DeFi strategies',
  category: 'gaming-defi',
  tags: ['gaming', 'defi', 'cross-chain', 'liquidity', 'aurory'],
  
  actors: [
    {
      id: 'gaming-defi-manager' as UUID,
      name: 'GamingDeFiAgent',
      role: 'subject',
      personality: {
        traits: ['strategic', 'gaming-savvy', 'yield-focused'],
        systemPrompt: 'You are a gaming DeFi specialist who helps gamers maximize their in-game earnings through automated DeFi strategies. You understand both gaming economies and DeFi protocols.'
      },
      plugins: [
        'plugin-solana',
        'plugin-evm',
        'plugin-bridge',
        'plugin-dex-aggregator',
        'plugin-monitoring'
      ]
    }
  ],
  
  setup: {
    roomType: 'dm',
    context: 'User plays Aurory and wants to optimize AURY token earnings',
    environment: {
      initialBalance: {
        solana: {
          AURY: 10000
        }
      },
      gameWallet: 'aurory-game-wallet',
      targetPool: 'AURY-ETH',
      targetDex: 'UniswapV3',
      targetChain: 'base'
    }
  },
  
  execution: {
    maxDuration: 600000, // 10 minutes
    realApiCallsExpected: true,
    strategy: {
      steps: [
        {
          type: 'message',
          content: "I'm playing Aurory on Solana and earning AURY tokens. Can you automatically convert 50% of my daily earnings to provide liquidity on Uniswap V3 (Base) in the AURY-ETH pool, and use the other 50% to buy loot boxes in the game?"
        },
        {
          type: 'wait',
          waitTime: 10000,
          description: 'Wait for strategy setup'
        },
        {
          type: 'assert',
          assertion: {
            type: 'custom',
            value: 'agent_monitors_earnings',
            description: 'Agent sets up monitoring for Aurory earnings'
          }
        },
        {
          type: 'assert',
          assertion: {
            type: 'custom',
            value: 'agent_splits_tokens',
            description: 'Agent implements 50/50 split strategy'
          }
        },
        {
          type: 'assert',
          assertion: {
            type: 'custom',
            value: 'agent_bridges_to_base',
            description: 'Agent bridges 50% to Base chain'
          }
        },
        {
          type: 'assert',
          assertion: {
            type: 'custom',
            value: 'agent_creates_uniswap_position',
            description: 'Agent creates concentrated liquidity position'
          }
        },
        {
          type: 'assert',
          assertion: {
            type: 'custom',
            value: 'agent_purchases_lootboxes',
            description: 'Agent uses remaining 50% for in-game purchases'
          }
        }
      ]
    }
  },
  
  verification: {
    rules: [
      {
        id: 'earnings-monitoring',
        type: 'api-verification',
        description: 'Verify earnings monitoring is active',
        config: {
          expectedActions: ['monitor_aurory_wallet', 'setup_daily_harvest'],
          requiredData: ['monitoring_interval', 'harvest_schedule']
        }
      },
      {
        id: 'token-split-logic',
        type: 'llm-evaluation',
        description: 'Verify proper token splitting logic',
        config: {
          criteria: 'Agent should: 1) Calculate 50/50 split, 2) Account for bridge fees, 3) Plan liquidity provision amounts, 4) Reserve tokens for loot boxes'
        }
      },
      {
        id: 'bridge-execution',
        type: 'api-verification',
        description: 'Verify bridge to Base chain',
        config: {
          expectedActions: ['bridge_aury_to_base'],
          requiredData: ['bridge_tx_hash', 'destination_amount']
        }
      },
      {
        id: 'uniswap-v3-position',
        type: 'api-verification',
        description: 'Verify Uniswap V3 position creation',
        config: {
          expectedActions: ['create_concentrated_position', 'set_price_range'],
          requiredData: ['position_id', 'liquidity_amount', 'price_range']
        }
      },
      {
        id: 'game-integration',
        type: 'api-verification',
        description: 'Verify in-game purchases',
        config: {
          expectedActions: ['purchase_lootboxes'],
          requiredData: ['purchase_tx', 'lootbox_count', 'remaining_balance']
        }
      },
      {
        id: 'roi-tracking',
        type: 'storage-verification',
        description: 'Verify ROI tracking for both strategies',
        config: {
          expectedState: {
            defi_roi: { tracked: true },
            gaming_roi: { tracked: true },
            comparison_metrics: { enabled: true }
          }
        }
      }
    ],
    expectedOutcomes: [
      {
        actorId: 'gaming-defi-manager',
        outcome: 'Successfully set up automated gaming earnings management',
        verification: {
          id: 'final-state',
          type: 'llm-evaluation',
          description: 'Verify complete system',
          config: {
            criteria: 'Should have: 1) Active earnings monitoring, 2) Automated 50/50 split, 3) Uniswap V3 position generating fees, 4) Regular loot box purchases, 5) ROI tracking for both strategies'
          }
        }
      }
    ]
  },
  
  benchmarks: {
    maxDuration: 600000,
    customMetrics: [
      {
        name: 'gaming_defi_efficiency',
        target: {
          processing_time: '<30s',
          bridge_cost_ratio: '<2%',
          liquidity_efficiency: '>90%',
          automation_reliability: '>95%'
        }
      }
    ]
  }
}; 