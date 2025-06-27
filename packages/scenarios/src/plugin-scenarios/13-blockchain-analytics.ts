import type { Scenario } from '../types.js';
import { v4 as uuidv4 } from 'uuid';

export const blockchainAnalyticsScenario: Scenario = {
  id: uuidv4() as any,
  name: 'Blockchain Transaction Analysis and DeFi Research',
  description: 'Test blockchain analytics capabilities including wallet analysis, DeFi protocol research, and cross-chain tracking',
  category: 'integration',
  tags: ['blockchain', 'analytics', 'defi', 'research'],

  actors: [
    {
      id: uuidv4() as any,
      name: 'Blockchain Analyst',
      role: 'subject',
      bio: 'A blockchain analytics expert specializing in DeFi and cross-chain analysis',
      system:
        'You are a blockchain analytics expert. When analyzing blockchain data, use these tools: 1) ANALYZE_WALLET to examine wallet transactions and holdings, 2) RESEARCH to find information about DeFi protocols and projects, 3) TRACK_TRANSACTION to follow cross-chain transfers, 4) CREATE_KNOWLEDGE to store important findings about wallets and protocols. Provide detailed insights and risk assessments.',
      plugins: ['@elizaos/plugin-evm', '@elizaos/plugin-solana', '@elizaos/plugin-research', '@elizaos/plugin-knowledge'],
      script: { steps: [] },
    },
    {
      id: uuidv4() as any,
      name: 'DeFi Investor',
      role: 'assistant',
      script: {
        steps: [
          {
            type: 'message',
            content: 'I need you to analyze wallet address 0x742d35Cc6634C0532925a3b844Bc9e7595f5b9Ee. What can you tell me about its transaction history and DeFi interactions?',
          },
          {
            type: 'wait',
            waitTime: 8000,
          },
          {
            type: 'message',
            content: 'Research the top DeFi protocols this wallet has interacted with. I want to understand their safety and legitimacy.',
          },
          {
            type: 'wait',
            waitTime: 8000,
          },
          {
            type: 'message',
            content: 'Check if there are any cross-chain transfers or bridge transactions. Track where funds have moved across different blockchains.',
          },
          {
            type: 'wait',
            waitTime: 6000,
          },
          {
            type: 'message',
            content: 'Store your key findings about this wallet and the protocols it uses. Include any risk factors or red flags you discovered.',
          },
          {
            type: 'wait',
            waitTime: 5000,
          },
          {
            type: 'message',
            content: 'Based on your analysis, what is your risk assessment of this wallet and its DeFi activities?',
          },
        ],
      },
    },
  ],

  setup: {
    roomType: 'dm',
    roomName: 'Blockchain Analytics Lab',
    context: 'DeFi investment analysis and risk assessment',
  },

  execution: {
    maxDuration: 150000,
    maxSteps: 40,
    stopConditions: [
      {
        type: 'message_count',
        value: 10,
        description: 'Stop after 10 messages exchanged',
      },
    ],
  },

  verification: {
    rules: [
      {
        id: 'rule-1',
        type: 'llm',
        description: 'Agent must analyze wallet',
        config: {
          criteria: 'Check if the agent used blockchain analysis tools to examine the wallet address',
          expectedValue: 'Wallet analysis was performed',
        },
      },
      {
        id: 'rule-2',
        type: 'llm',
        description: 'Agent must research DeFi protocols',
        config: {
          criteria: 'Verify that the agent researched DeFi protocols the wallet interacted with',
          expectedValue: 'DeFi protocol research was conducted',
        },
      },
      {
        id: 'rule-3',
        type: 'llm',
        description: 'Agent must track cross-chain activity',
        config: {
          criteria: 'Confirm that the agent checked for cross-chain transfers and bridge transactions',
          expectedValue: 'Cross-chain tracking was performed',
        },
      },
      {
        id: 'rule-4',
        type: 'llm',
        description: 'Agent must store findings',
        config: {
          criteria: 'The agent should have stored key findings in the knowledge base',
          expectedValue: 'Findings were documented',
        },
      },
      {
        id: 'rule-5',
        type: 'llm',
        description: 'Agent must provide risk assessment',
        config: {
          criteria: 'The agent should provide a comprehensive risk assessment based on the analysis',
          expectedValue: 'Risk assessment was provided',
        },
      },
    ],
    expectedOutcomes: [
      {
        actorId: uuidv4() as any,
        outcome: 'Completed comprehensive blockchain analysis',
        verification: {
          id: 'outcome-1',
          type: 'llm',
          description: 'Full blockchain analytics workflow',
          config: {
            criteria: 'The agent successfully analyzed the wallet, researched DeFi protocols, tracked cross-chain activity, stored findings, and provided a risk assessment',
          },
        },
      },
    ],
  },
};

export default blockchainAnalyticsScenario;
