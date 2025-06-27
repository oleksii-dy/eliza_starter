import { Scenario, ScenarioActor, UUID } from '../types';

export const crossChainPerpetualsScenario: Scenario = {
  id: 'wallet-scenario-10',
  name: 'Cross-Chain Perpetuals & Spot Arbitrage',
  description: 'Execute market-neutral strategies using perpetuals and spot across chains',
  category: 'perpetuals-arbitrage',
  tags: ['perpetuals', 'arbitrage', 'cross-chain', 'market-neutral', 'funding'],
  
  actors: [
    {
      id: 'perps-arbitrageur' as UUID,
      name: 'PerpetualsArbitrageAgent',
      role: 'subject',
      personality: {
        traits: ['quantitative', 'risk-neutral', 'precise'],
        systemPrompt: 'You are a perpetuals arbitrage specialist who executes market-neutral strategies by taking advantage of funding rate differentials and spot-perp basis trades across different chains and protocols.'
      },
      plugins: [
        'plugin-evm',
        'plugin-solana',
        'plugin-perpetuals',
        'plugin-dex-aggregator',
        'plugin-monitoring'
      ]
    }
  ],
  
  setup: {
    roomType: 'dm',
    context: 'User wants to execute funding rate arbitrage strategies',
    environment: {
      initialBalance: {
        arbitrum: { USDC: 50000 },
        solana: { USDC: 50000 }
      },
      strategies: {
        ethStrategy: {
          perps: { protocol: 'dydx', chain: 'arbitrum' },
          spot: { protocol: 'gmx', chain: 'arbitrum' }
        },
        solStrategy: {
          perps: { protocol: 'drift', chain: 'solana' },
          spot: { protocol: 'jupiter', chain: 'solana' }
        }
      },
      fundingThreshold: 0.0005, // 0.05% funding rate differential
      maxLeverage: 2
    }
  },
  
  execution: {
    maxDuration: 720000, // 12 minutes
    realApiCallsExpected: true,
    strategy: {
      steps: [
        {
          type: 'message',
          content: "Set up a market-neutral strategy: Long ETH perps on dYdX (Arbitrum) and short spot ETH on GMX (Arbitrum), while simultaneously doing the reverse on Drift (Solana) with SOL. Rebalance when funding rates diverge by more than 0.05%."
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
            value: 'agent_analyzes_funding_rates',
            description: 'Agent analyzes funding rates across protocols'
          }
        },
        {
          type: 'assert',
          assertion: {
            type: 'custom',
            value: 'agent_calculates_position_sizes',
            description: 'Agent calculates optimal position sizes'
          }
        },
        {
          type: 'assert',
          assertion: {
            type: 'custom',
            value: 'agent_opens_eth_positions',
            description: 'Agent opens ETH perp long and spot short'
          }
        },
        {
          type: 'assert',
          assertion: {
            type: 'custom',
            value: 'agent_opens_sol_positions',
            description: 'Agent opens SOL perp short and spot long'
          }
        },
        {
          type: 'assert',
          assertion: {
            type: 'custom',
            value: 'agent_monitors_funding',
            description: 'Agent monitors funding rate differentials'
          }
        },
        {
          type: 'assert',
          assertion: {
            type: 'custom',
            value: 'agent_rebalances_positions',
            description: 'Agent rebalances on threshold breach'
          }
        }
      ]
    }
  },
  
  verification: {
    rules: [
      {
        id: 'funding-analysis',
        type: 'api-verification',
        description: 'Verify funding rate analysis',
        config: {
          expectedActions: ['query_dydx_funding', 'query_gmx_funding', 'query_drift_funding'],
          requiredData: ['eth_funding_rates', 'sol_funding_rates', 'rate_differentials']
        }
      },
      {
        id: 'position-calculation',
        type: 'llm-evaluation',
        description: 'Verify position size calculations',
        config: {
          criteria: 'Agent should: 1) Calculate market-neutral positions, 2) Consider available margin, 3) Account for fees and slippage, 4) Maintain leverage <= 2x'
        }
      },
      {
        id: 'eth-positions',
        type: 'api-verification',
        description: 'Verify ETH position execution',
        config: {
          expectedActions: ['open_dydx_long', 'open_gmx_short'],
          requiredData: ['perp_position_size', 'spot_position_size', 'net_exposure']
        }
      },
      {
        id: 'sol-positions',
        type: 'api-verification',
        description: 'Verify SOL position execution',
        config: {
          expectedActions: ['open_drift_short', 'buy_sol_jupiter'],
          requiredData: ['perp_position_size', 'spot_position_size', 'net_exposure']
        }
      },
      {
        id: 'funding-monitoring',
        type: 'api-verification',
        description: 'Verify funding rate monitoring',
        config: {
          expectedActions: ['monitor_funding_rates', 'calculate_pnl'],
          criteria: 'Should track: 1) Real-time funding rates, 2) Cumulative funding P&L, 3) Rebalance triggers'
        }
      },
      {
        id: 'rebalancing',
        type: 'api-verification',
        description: 'Verify position rebalancing',
        config: {
          expectedActions: ['check_rebalance_trigger', 'execute_rebalance'],
          requiredData: ['trigger_event', 'rebalance_trades', 'new_position_sizes']
        }
      },
      {
        id: 'risk-metrics',
        type: 'storage-verification',
        description: 'Verify risk management metrics',
        config: {
          expectedState: {
            net_exposure: '<1%',
            max_drawdown: '<5%',
            sharpe_ratio: '>2',
            total_pnl: 'number',
            funding_captured: 'number'
          }
        }
      },
      {
        id: 'position-limits',
        type: 'api-verification',
        description: 'Verify position limit compliance',
        config: {
          criteria: 'All positions should respect: 1) Max 2x leverage, 2) Position limits per protocol, 3) Margin requirements'
        }
      }
    ],
    expectedOutcomes: [
      {
        actorId: 'perps-arbitrageur',
        outcome: 'Successfully executed cross-chain perpetuals arbitrage',
        verification: {
          id: 'final-state',
          type: 'llm-evaluation',
          description: 'Verify complete arbitrage system',
          config: {
            criteria: 'Should have: 1) Market-neutral positions across chains, 2) Active funding rate monitoring, 3) Automated rebalancing on divergence, 4) Positive funding P&L, 5) Risk limits enforced'
          }
        }
      }
    ]
  },
  
  benchmarks: {
    maxDuration: 720000,
    customMetrics: [
      {
        name: 'perpetuals_arbitrage_metrics',
        target: {
          execution_time: '<60s',
          market_neutrality: '>99%',
          funding_capture_rate: '>80%',
          max_drawdown: '<3%',
          sharpe_ratio: '>2.5'
        }
      }
    ]
  }
}; 