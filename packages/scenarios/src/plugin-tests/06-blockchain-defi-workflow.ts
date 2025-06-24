import type { Scenario } from '../types.js';
import { v4 as uuidv4 } from 'uuid';

export const blockchainDefiWorkflowScenario: Scenario = {
  id: uuidv4() as any,
  name: 'Cross-Chain DeFi Operations',
  description: 'Test Solana and EVM plugins performing DeFi operations across multiple blockchains',
  category: 'integration',
  tags: ['blockchain', 'defi', 'solana', 'evm', 'cross-chain'],

  actors: [
    {
      id: uuidv4() as any,
      name: 'DeFi Agent',
      role: 'subject',
      bio: 'A blockchain agent specialized in DeFi operations across multiple chains',
      system:
        'You are a DeFi agent that helps with cryptocurrency and blockchain questions. When asked about DeFi operations, provide helpful information about how these systems work.',
      plugins: ['@elizaos/plugin-solana', '@elizaos/plugin-evm'],
      script: { steps: [] },
    },
    {
      id: uuidv4() as any,
      name: 'Crypto Trader',
      role: 'assistant',
      script: {
        steps: [
          {
            type: 'message',
            content:
              'Can you explain how DeFi works on different blockchains like Solana and Ethereum?',
          },
          {
            type: 'wait',
            waitTime: 4000,
          },
          {
            type: 'message',
            content: 'What are the main differences between trading on Solana vs Ethereum?',
          },
          {
            type: 'wait',
            waitTime: 4000,
          },
          {
            type: 'message',
            content: 'How do cross-chain bridges work for moving assets between chains?',
          },
        ],
      },
    },
  ],

  setup: {
    roomType: 'dm',
    roomName: 'DeFi Trading',
    context: 'Cross-chain DeFi operations and asset management',
  },

  execution: {
    maxDuration: 60000, // 1 minute
    maxSteps: 10,
    stopConditions: [
      {
        type: 'message_count',
        value: 6,
        description: 'Stop after 6 messages exchanged',
      },
    ],
  },

  verification: {
    rules: [
      {
        id: uuidv4() as any,
        type: 'llm' as const,
        description: 'DeFi explanation was provided',
        config: {
          criteria: 'The agent should have explained how DeFi works on different blockchains',
          expectedValue: 'DeFi explanation provided',
        },
      },
      {
        id: uuidv4() as any,
        type: 'llm' as const,
        description: 'Chain differences were explained',
        config: {
          criteria: 'The agent should have explained differences between Solana and Ethereum',
          expectedValue: 'Chain differences explained',
        },
      },
      {
        id: uuidv4() as any,
        type: 'llm' as const,
        description: 'Bridge functionality was explained',
        config: {
          criteria: 'The agent should have explained how cross-chain bridges work',
          expectedValue: 'Bridge explanation provided',
        },
      },
    ],
    expectedOutcomes: [
      {
        actorId: uuidv4() as any,
        outcome: 'Provided DeFi education and guidance',
        verification: {
          id: uuidv4() as any,
          type: 'llm' as const,
          description: 'DeFi education was provided',
          config: {
            criteria:
              'The agent provided helpful explanations about DeFi, blockchain differences, and cross-chain operations',
          },
        },
      },
    ],
  },
};

export default blockchainDefiWorkflowScenario;
