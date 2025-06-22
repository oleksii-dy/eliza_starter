import type { Scenario } from '../types.js';
import { v4 as uuidv4 } from 'uuid';

const paymentBasicFlowScenario: Scenario = {
  id: 'payment-basic-flow-001',
  name: 'Basic Payment Flow Test',
  description:
    'Tests fundamental payment functionality including balance checking, payment processing, and action execution',
  category: 'payment',
  tags: ['payment', 'basic-flow', 'research', 'usdc'],

  actors: [
    {
      id: uuidv4() as any,
      name: 'Payment Agent',
      role: 'subject',
      bio: 'An AI agent with payment capabilities for premium services',
      system: `You are an AI agent with payment integration. You offer premium services that require payment:
- Research services cost 1 USDC
- Data analysis costs 5 USDC
- Premium content generation costs 2 USDC

When users request these services, inform them of the cost and process payments appropriately.
Always be transparent about pricing and provide value for paid services.`,
      plugins: ['@elizaos/plugin-payment', '@elizaos/plugin-research', '@elizaos/plugin-knowledge'],
      script: { steps: [] },
    },
    {
      id: uuidv4() as any,
      name: 'Customer',
      role: 'assistant',
      script: {
        steps: [
          {
            type: 'message',
            content: 'Hi! I need help researching the latest developments in quantum computing.',
          },
          {
            type: 'wait',
            waitTime: 5000,
          },
          {
            type: 'message',
            content: 'Yes, I understand it costs 1 USDC. Please proceed with the research.',
          },
          {
            type: 'wait',
            waitTime: 8000,
          },
          {
            type: 'message',
            content:
              'Thank you! The research was very helpful. Can you also analyze the data for trends?',
          },
          {
            type: 'wait',
            waitTime: 5000,
          },
          {
            type: 'message',
            content: 'I see that data analysis costs 5 USDC. Let me check my balance first.',
          },
        ],
      },
    },
  ],

  setup: {
    roomType: 'dm',
    roomName: 'Payment Services',
    context: 'Testing basic payment flow for premium services',
  },

  execution: {
    maxDuration: 60000,
    maxSteps: 20,
    stopConditions: [
      {
        type: 'message_count',
        value: 8,
        description: 'Stop after 8 messages exchanged',
      },
    ],
  },

  verification: {
    rules: [
      {
        id: 'payment-mentioned',
        type: 'llm',
        description: 'Agent mentions payment requirement',
        config: {
          criteria:
            'The agent should clearly mention the payment requirement (1 USDC) for the research service',
          expectedValue: 'Payment requirement mentioned',
        },
        weight: 3,
      },
      {
        id: 'research-provided',
        type: 'llm',
        description: 'Research service provided after payment',
        config: {
          criteria:
            'The agent should provide comprehensive research about quantum computing after payment confirmation',
          expectedValue: 'Research delivered',
        },
        weight: 3,
      },
      {
        id: 'data-analysis-pricing',
        type: 'llm',
        description: 'Data analysis pricing communicated',
        config: {
          criteria: 'The agent should clearly state that data analysis costs 5 USDC when requested',
          expectedValue: 'Pricing communicated',
        },
        weight: 2,
      },
      {
        id: 'payment-transparency',
        type: 'llm',
        description: 'Transparent about all costs',
        config: {
          criteria:
            'The agent should be transparent about all costs and not proceed without payment confirmation',
          expectedValue: 'Cost transparency maintained',
        },
        weight: 2,
      },
    ],
    expectedOutcomes: [
      {
        actorId: uuidv4() as any,
        outcome: 'Successfully processed payment and delivered research',
        verification: {
          id: 'payment-flow-complete',
          type: 'llm',
          description: 'Complete payment flow executed',
          config: {
            criteria:
              'The agent successfully communicated pricing, processed payment, and delivered the requested research service',
          },
        },
      },
    ],
  },
};

export default paymentBasicFlowScenario;
