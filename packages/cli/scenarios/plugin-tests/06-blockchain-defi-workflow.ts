import type { Scenario } from '../../src/scenario-runner/types.js';

export const blockchainDefiWorkflowScenario: Scenario = {
  id: 'af2e3908-4868-4eb4-b662-fb3f3c03cb2b',
  name: 'Cross-Chain DeFi Operations and Portfolio Management',
  description:
    'Test Solana and EVM plugins performing complex DeFi operations across multiple chains',
  category: 'integration',
  tags: ['solana', 'evm', 'defi', 'blockchain', 'cross-chain'],

  actors: [
    {
      id: 'b601b923-444d-4ee5-a1f4-fe67be276fea',
      name: 'DeFi Agent',
      role: 'subject',
      script: { steps: [] },
    },
    {
      id: '96ac2cb9-8c68-43a8-ac18-e961f931cccd',
      name: 'DeFi Trader',
      role: 'tester',
      script: {
        steps: [
          {
            type: 'message',
            content:
              'Check my wallet balances on both Solana and Ethereum. I need to know my SOL, ETH, USDC balances on both chains.',
      },
          {
            type: 'wait',
            waitTime: 5000,
      },
          {
            type: 'message',
            content:
              'I want to swap 100 USDC for SOL on Solana using Jupiter aggregator. Find me the best route.',
      },
          {
            type: 'wait',
            waitTime: 8000,
      },
          {
            type: 'message',
            content:
              'Now on Ethereum, I want to provide liquidity to the ETH/USDC pool on Uniswap V3. Calculate the optimal range based on current volatility.',
      },
          {
            type: 'wait',
            waitTime: 10000,
      },
          {
            type: 'message',
            content:
              'Monitor my positions and alert me if any of them go outside the optimal range or if there are better yield opportunities.',
      },
          {
            type: 'wait',
            waitTime: 5000,
      },
          {
            type: 'message',
            content:
              'Create a summary report of my cross-chain DeFi positions and their current performance.',
          },
        ],
        personality: 'strategic, risk-aware, yield-focused trader',
        goals: [
          'optimize cross-chain yields',
          'manage DeFi positions',
          'minimize transaction costs',
        ],
      },
    },
  ],

  setup: {
    roomType: 'dm',
    roomName: 'DeFi Trading Desk',
    context: 'Managing DeFi positions across Solana and Ethereum blockchains',
    environment: {
      plugins: ['solana', 'evm', 'todo'],
      walletConnected: true,
      defiProtocols: ['jupiter', 'uniswap', 'raydium'],
    },
  },

  execution: {
    maxDuration: 240000, // 4 minutes
    maxSteps: 20,
    stopConditions: [
      {
        type: 'keyword',
        value: 'portfolio managed',
        description: 'Stop when DeFi portfolio is set up',
      },
    ],
  },

  verification: {
    rules: [
      {
        id: '7f54193f-3435-44b3-988a-31bc22d7bdb1',
        type: 'action_taken',
        description: 'Wallet balances were checked on both chains',
        config: {
          expectedValue: 'CHECK_WALLET_BALANCE',
        },
        weight: 2,
      },
      {
        id: '6c4c4387-e3ca-45b5-96ed-bb26161cbaee',
        type: 'action_taken',
        description: 'Swap was executed on Solana',
        config: {
          expectedValue: 'EXECUTE_SOLANA_SWAP',
        },
        weight: 3,
      },
      {
        id: '5c8065b4-a30f-48d1-8dd9-022358ce977e',
        type: 'action_taken',
        description: 'Liquidity was provided on Ethereum',
        config: {
          expectedValue: 'PROVIDE_LIQUIDITY_EVM',
        },
        weight: 3,
      },
      {
        id: 'e7dfc118-288c-4f01-9b19-d53652f0dc56',
        type: 'action_taken',
        description: 'Position monitoring was set up',
        config: {
          expectedValue: 'MONITOR_DEFI_POSITION',
        },
        weight: 2,
      },
      {
        id: '4c4fb62b-5f6c-4a8c-8ddf-f7fb0c3f1940',
        type: 'llm',
        description: 'Cross-chain balances were properly tracked',
        config: {
          criteria:
            'The agent successfully checked and reported balances across both Solana and Ethereum blockchains',
        },
        weight: 2,
      },
      {
        id: '0c897ac7-6254-4572-b72d-548e7b349325',
        type: 'llm',
        description: 'Optimal swap routes were found',
        config: {
          criteria:
            'The agent found and analyzed the best swap route on Jupiter for the USDC to SOL swap',
        },
        weight: 3,
      },
      {
        id: 'ad78b0a7-36ae-408f-9f61-902b30fd8792',
        type: 'llm',
        description: 'Optimal liquidity range was calculated',
        config: {
          criteria:
            'The agent calculated an optimal range for Uniswap V3 liquidity provision based on volatility analysis',
        },
        weight: 3,
      },
      {
        id: 'bddad951-0026-46db-9614-f8e798081c17',
        type: 'llm',
        description: 'Comprehensive portfolio summary was created',
        config: {
          criteria:
            'The agent created a comprehensive summary of cross-chain DeFi positions including performance metrics',
        },
        weight: 2,
      },
    ],
    expectedOutcomes: [
      {
        actorId: '96ac2cb9-8c68-43a8-ac18-e961f931cccd',
        outcome: 'Successfully managed cross-chain DeFi operations',
        verification: {
          id: '54d0d475-4b52-432c-a5cc-6ff0d0ae6976',
          type: 'llm',
          description: 'DeFi operations were executed successfully',
          config: {
            criteria:
              'Agent successfully executed swaps, provided liquidity, and managed positions across multiple blockchains',
          },
        },
      },
    ],
    groundTruth: {
      expectedBehavior: 'Agent manages complex DeFi operations across Solana and Ethereum',
      successCriteria: [
        'Multi-chain wallet balances checked',
        'Optimal swap route found and executed',
        'Liquidity position calculated and created',
        'Position monitoring established',
        'Cross-chain portfolio summary generated',
      ],
    },
  },

  benchmarks: {
    maxDuration: 240000,
    maxSteps: 20,
    maxTokens: 10000,
    targetAccuracy: 0.85,
    customMetrics: [{ name: 'transaction_efficiency' }, { name: 'route_optimization' }, { name: 'portfolio_tracking' }],
  },
};

export default blockchainDefiWorkflowScenario;
