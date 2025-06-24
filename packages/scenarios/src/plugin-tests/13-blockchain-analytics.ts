import type { Scenario } from '../types.js';
import { v4 as uuidv4 } from 'uuid';

export const blockchainAnalyticsScenario: Scenario = {
  id: uuidv4() as any,
  name: 'Cross-Chain DeFi Analytics and Risk Assessment',
  description:
    'Analyze DeFi protocols across Solana and EVM chains, research risks, and create comprehensive reports',
  category: 'blockchain',
  tags: ['solana', 'evm', 'research', 'knowledge', 'analytics', 'defi'],

  actors: [
    {
      id: uuidv4() as any,
      name: 'DeFi Analyst Agent',
      role: 'subject',
      script: { steps: [] },
    },
    {
      id: uuidv4() as any,
      name: 'DeFi Trader',
      role: 'subject',
      script: {
        steps: [
          {
            type: 'message',
            content:
              'I need a comprehensive analysis of the top DeFi lending protocols on Solana. Check their TVL, APY rates, and risk factors.',
          },
          {
            type: 'wait',
            waitTime: 10000,
          },
          {
            type: 'message',
            content:
              'Now compare these with similar protocols on Ethereum and Arbitrum. Focus on cross-chain yield opportunities.',
          },
          {
            type: 'wait',
            waitTime: 12000,
          },
          {
            type: 'message',
            content:
              'Research the historical exploit data for these protocols and create a risk assessment matrix.',
          },
          {
            type: 'wait',
            waitTime: 15000,
          },
          {
            type: 'message',
            content:
              'Store all findings in the knowledge base and create a summary report with actionable insights.',
          },
          {
            type: 'wait',
            waitTime: 8000,
          },
          {
            type: 'message',
            content:
              'Based on the analysis, what would be the optimal cross-chain yield farming strategy with acceptable risk?',
          },
        ],
        personality: 'analytical, risk-aware, profit-focused DeFi trader',
        goals: [
          'identify profitable DeFi opportunities',
          'minimize risk exposure',
          'optimize cross-chain yields',
        ],
      },
    },
  ],

  setup: {
    roomType: 'dm',
    roomName: 'DeFi Analytics',
    context: 'Professional DeFi trading and risk analysis environment',
    environment: {
      plugins: ['solana', 'evm', 'research', 'knowledge', 'message-handling'],
      defiProtocols: ['marinade', 'kamino', 'aave', 'compound', 'gmx'],
      analysisDepth: 'comprehensive',
    },
  },

  execution: {
    maxDuration: 240000, // 4 minutes
    maxSteps: 30,
    stopConditions: [
      {
        type: 'keyword',
        value: 'analysis complete',
        description: 'Stop when comprehensive analysis is done',
      },
    ],
  },

  verification: {
    rules: [
      {
        id: uuidv4() as any,
        type: 'llm',
        description: 'Solana DeFi protocol data was fetched',
        config: {
          expectedValue: 'FETCH_SOLANA_DEFI_DATA',
        },
        weight: 3,
      },
      {
        id: uuidv4() as any,
        type: 'llm',
        description: 'EVM chain DeFi data was fetched',
        config: {
          expectedValue: 'FETCH_EVM_DEFI_DATA',
        },
        weight: 3,
      },
      {
        id: uuidv4() as any,
        type: 'llm',
        description: 'Research project for exploit history was started',
        config: {
          expectedValue: 'START_RESEARCH',
        },
        weight: 2,
      },
      {
        id: uuidv4() as any,
        type: 'llm',
        description: 'Risk assessment matrix was created',
        config: {
          criteria:
            'The agent should create and present a risk assessment matrix or risk matrix in their response',
        },
        weight: 3,
      },
      {
        id: uuidv4() as any,
        type: 'llm',
        description: 'Analytics findings stored in knowledge base',
        config: {
          expectedValue: 'STORE_KNOWLEDGE',
        },
        weight: 2,
      },
      {
        id: uuidv4() as any,
        type: 'llm',
        description: 'Cross-chain protocols were properly compared',
        config: {
          criteria:
            'The agent compared DeFi protocols across Solana and EVM chains, analyzing yields and risks',
        },
        weight: 3,
      },
      {
        id: uuidv4() as any,
        type: 'llm',
        description: 'Optimal yield strategy was recommended',
        config: {
          criteria:
            'The agent provided specific, actionable cross-chain yield farming recommendations based on the analysis',
        },
        weight: 4,
      },
    ],
    expectedOutcomes: [
      {
        actorId: uuidv4() as any,
        outcome: 'Comprehensive DeFi analytics report with cross-chain insights',
        verification: {
          id: uuidv4() as any,
          type: 'llm',
          description: 'Complete DeFi analysis workflow executed',
          config: {
            criteria:
              'Agent fetched data from multiple chains, analyzed risks, stored findings, and provided strategic recommendations',
          },
        },
      },
    ],
    groundTruth: {
      expectedBehavior:
        'Agent performs comprehensive cross-chain DeFi analysis with risk assessment',
      successCriteria: [
        'Solana protocol data analyzed',
        'EVM protocol data compared',
        'Historical exploit research completed',
        'Risk matrix created',
        'Knowledge base updated',
        'Strategic recommendations provided',
      ],
    },
  },

  benchmarks: {
    maxDuration: 240000,
    maxSteps: 30,
    maxTokens: 15000,
    targetAccuracy: 0.85,
    customMetrics: [
      { name: 'data_completeness', threshold: 0.8 },
      { name: 'risk_assessment_quality', threshold: 0.85 },
      { name: 'strategy_viability', threshold: 0.9 },
    ],
  },
};

export default blockchainAnalyticsScenario;
