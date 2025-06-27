import { Scenario, ScenarioActor, UUID } from '../types';

export const nftArbitrageScenario: Scenario = {
  id: 'wallet-scenario-02',
  name: 'NFT Arbitrage Bot',
  description: 'Monitor and execute profitable NFT arbitrage between OpenSea and Magic Eden',
  category: 'nft-trading',
  tags: ['nft', 'arbitrage', 'cross-chain', 'trading', 'opensea', 'magiceden'],
  
  actors: [
    {
      id: 'nft-arbitrage-bot' as UUID,
      name: 'NFTArbitrageAgent',
      role: 'subject',
      personality: {
        traits: ['opportunistic', 'fast-acting', 'analytical'],
        systemPrompt: 'You are an NFT arbitrage specialist. You monitor floor prices across marketplaces and execute profitable arbitrage trades, accounting for gas costs and bridge fees.'
      },
      plugins: [
        'plugin-evm',
        'plugin-solana',
        'plugin-bridge',
        'plugin-nft-trading',
        'plugin-monitoring'
      ]
    }
  ],
  
  setup: {
    roomType: 'dm',
    context: 'User wants to set up NFT arbitrage between Ethereum and Solana',
    environment: {
      initialBalance: {
        ethereum: {
          ETH: 5
        },
        solana: {
          SOL: 100
        }
      },
      targetCollection: 'pudgy-penguins',
      marketplaces: ['opensea', 'magiceden']
    }
  },
  
  execution: {
    maxDuration: 600000, // 10 minutes
    realApiCallsExpected: true,
    strategy: {
      steps: [
        {
          type: 'message',
          content: 'I noticed Pudgy Penguins floor prices differ between OpenSea (Ethereum) and Magic Eden (Solana wrapped). Can you create a bot that monitors price differences and executes profitable arbitrage trades automatically?'
        },
        {
          type: 'wait',
          waitTime: 15000,
          description: 'Wait for agent to set up monitoring'
        },
        {
          type: 'assert',
          assertion: {
            type: 'custom',
            value: 'agent_starts_monitoring',
            description: 'Agent should start monitoring floor prices on both platforms'
          }
        },
        {
          type: 'wait',
          waitTime: 30000,
          description: 'Wait for price difference detection'
        },
        {
          type: 'assert',
          assertion: {
            type: 'custom',
            value: 'agent_calculates_profitability',
            description: 'Agent should calculate profitability including all fees'
          }
        },
        {
          type: 'assert',
          assertion: {
            type: 'custom',
            value: 'agent_executes_arbitrage',
            description: 'Agent should execute arbitrage if profitable'
          }
        }
      ]
    }
  },
  
  verification: {
    rules: [
      {
        id: 'price-monitoring-setup',
        type: 'api-verification',
        description: 'Verify price monitoring is active on both marketplaces',
        config: {
          expectedActions: ['monitor_opensea_floor', 'monitor_magiceden_floor'],
          requiredData: ['opensea_floor_price', 'magiceden_floor_price']
        }
      },
      {
        id: 'arbitrage-calculation',
        type: 'llm-evaluation',
        description: 'Verify profitability calculation',
        config: {
          criteria: 'Agent should calculate: 1) Price difference between marketplaces, 2) Gas costs on Ethereum, 3) Bridge fees, 4) Transaction costs on Solana, 5) Net profit after all fees'
        }
      },
      {
        id: 'nft-purchase',
        type: 'api-verification',
        description: 'Verify NFT purchase on cheaper marketplace',
        config: {
          expectedActions: ['buy_nft'],
          requiredData: ['purchase_tx_hash', 'nft_token_id', 'purchase_price']
        }
      },
      {
        id: 'bridge-nft',
        type: 'api-verification',
        description: 'Verify NFT bridge transaction',
        config: {
          expectedActions: ['bridge_nft'],
          requiredData: ['bridge_tx_hash', 'destination_chain']
        }
      },
      {
        id: 'nft-listing',
        type: 'api-verification',
        description: 'Verify NFT listing on higher-priced marketplace',
        config: {
          expectedActions: ['list_nft'],
          requiredData: ['listing_price', 'marketplace', 'listing_id']
        }
      },
      {
        id: 'profit-tracking',
        type: 'storage-verification',
        description: 'Verify P&L tracking',
        config: {
          expectedState: {
            arbitrage_trades: {
              count: '>0',
              total_profit: 'number',
              success_rate: 'number'
            }
          }
        }
      }
    ],
    expectedOutcomes: [
      {
        actorId: 'nft-arbitrage-bot',
        outcome: 'Successfully set up and executed NFT arbitrage',
        verification: {
          id: 'final-state',
          type: 'llm-evaluation',
          description: 'Verify complete arbitrage system',
          config: {
            criteria: 'The bot should have: 1) Active price monitoring, 2) Executed at least one profitable trade, 3) Proper P&L tracking, 4) Automated execution system'
          }
        }
      }
    ]
  },
  
  benchmarks: {
    maxDuration: 600000,
    customMetrics: [
      {
        name: 'arbitrage_efficiency',
        target: {
          monitoring_latency: '<5s',
          execution_speed: '<30s',
          profit_margin: '>2%',
          success_rate: '>80%'
        }
      }
    ]
  }
}; 