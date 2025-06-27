import { Scenario, ScenarioActor, UUID } from '../types';

export const socialTradingScenario: Scenario = {
  id: 'wallet-scenario-06',
  name: 'Social Trading Mirror Strategy',
  description: 'Copy successful trader strategies with risk management and auto-conversion',
  category: 'social-trading',
  tags: ['social', 'copy-trading', 'risk-management', 'cross-chain'],
  
  actors: [
    {
      id: 'social-trader' as UUID,
      name: 'SocialTradingAgent',
      role: 'subject',
      personality: {
        traits: ['observant', 'risk-conscious', 'adaptive'],
        systemPrompt: 'You are a social trading specialist who helps users safely copy successful traders while implementing proper risk management and profit-taking strategies.'
      },
      plugins: [
        'plugin-evm',
        'plugin-solana',
        'plugin-monitoring',
        'plugin-dex-aggregator',
        'plugin-bridge'
      ]
    }
  ],
  
  setup: {
    roomType: 'dm',
    context: 'User wants to copy DegenSpartan trades with safety limits',
    environment: {
      initialBalance: {
        ethereum: { ETH: 10 },
        polygon: { USDC: 5000 },
        arbitrum: { ETH: 2 }
      },
      targetTrader: 'DegenSpartan',
      copyScale: 0.1, // 10% of target trader size
      stopLossPercent: 20,
      profitDestination: 'solana'
    }
  },
  
  execution: {
    maxDuration: 720000, // 12 minutes
    realApiCallsExpected: true,
    strategy: {
      steps: [
        {
          type: 'message',
          content: "I want to copy DegenSpartan's trades but with safety limits. Mirror his EVM trades on a 10% scale, but if any position loses 20%, exit and convert to stSOL on Solana for safe yield."
        },
        {
          type: 'wait',
          waitTime: 10000,
          description: 'Wait for copy trading setup'
        },
        {
          type: 'assert',
          assertion: {
            type: 'custom',
            value: 'agent_monitors_target_wallet',
            description: 'Agent sets up monitoring for target trader'
          }
        },
        {
          type: 'assert',
          assertion: {
            type: 'custom',
            value: 'agent_configures_copy_params',
            description: 'Agent configures 10% scale and 20% stop loss'
          }
        },
        {
          type: 'wait',
          waitTime: 30000,
          description: 'Wait for trade detection'
        },
        {
          type: 'assert',
          assertion: {
            type: 'custom',
            value: 'agent_replicates_trade',
            description: 'Agent copies detected trade at 10% scale'
          }
        },
        {
          type: 'assert',
          assertion: {
            type: 'custom',
            value: 'agent_monitors_stop_loss',
            description: 'Agent monitors position for stop loss'
          }
        },
        {
          type: 'assert',
          assertion: {
            type: 'custom',
            value: 'agent_executes_exit_strategy',
            description: 'Agent exits losing positions and converts to stSOL'
          }
        }
      ]
    }
  },
  
  verification: {
    rules: [
      {
        id: 'wallet-monitoring',
        type: 'api-verification',
        description: 'Verify target wallet monitoring',
        config: {
          expectedActions: ['monitor_wallet', 'subscribe_to_mempool'],
          requiredData: ['target_address', 'monitoring_active', 'chains_monitored']
        }
      },
      {
        id: 'copy-configuration',
        type: 'llm-evaluation',
        description: 'Verify copy trading parameters',
        config: {
          criteria: 'Agent should: 1) Set 10% position scaling, 2) Configure 20% stop loss, 3) Monitor across all EVM chains, 4) Plan exit strategy to Solana'
        }
      },
      {
        id: 'trade-replication',
        type: 'api-verification',
        description: 'Verify trade copying execution',
        config: {
          expectedActions: ['copy_trade'],
          requiredData: ['original_trade', 'copied_trade', 'scale_factor', 'execution_price']
        }
      },
      {
        id: 'risk-management',
        type: 'api-verification',
        description: 'Verify stop loss monitoring',
        config: {
          expectedActions: ['monitor_pnl', 'set_stop_triggers'],
          criteria: 'Should track: 1) Real-time P&L, 2) Stop loss levels, 3) Gas costs impact'
        }
      },
      {
        id: 'exit-execution',
        type: 'api-verification',
        description: 'Verify exit and conversion',
        config: {
          expectedActions: ['exit_position', 'bridge_to_solana', 'stake_sol'],
          requiredData: ['exit_price', 'bridge_tx', 'staking_tx', 'stsol_amount']
        }
      },
      {
        id: 'performance-tracking',
        type: 'storage-verification',
        description: 'Verify performance dashboard',
        config: {
          expectedState: {
            copy_trades: { count: '>0' },
            win_rate: 'number',
            avg_return: 'number',
            total_pnl: 'number',
            comparison_vs_target: 'object'
          }
        }
      }
    ],
    expectedOutcomes: [
      {
        actorId: 'social-trader',
        outcome: 'Successfully set up social trading with risk management',
        verification: {
          id: 'final-state',
          type: 'llm-evaluation',
          description: 'Verify complete copy trading system',
          config: {
            criteria: 'Should have: 1) Active wallet monitoring, 2) Successful trade replication, 3) Working stop loss system, 4) Automated exit to stSOL, 5) Performance tracking dashboard'
          }
        }
      }
    ]
  },
  
  benchmarks: {
    maxDuration: 720000,
    customMetrics: [
      {
        name: 'copy_trading_efficiency',
        target: {
          detection_latency: '<2s',
          execution_slippage: '<1%',
          stop_loss_reliability: '100%',
          risk_adjusted_return: '>0'
        }
      }
    ]
  }
};