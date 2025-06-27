import type { Scenario } from '../types.js';
import { v4 as uuidv4 } from 'uuid';

const paymentBasicFlowScenario: Scenario = {
  id: 'payment-basic-flow-001',
  name: 'Basic Payment Flow Test',
  description: 'Tests basic payment processing including requests, confirmations, and receipts',
  category: 'payment',
  tags: ['payment', 'basic', 'flow', 'transfer', 'usdc'],

  actors: [
    {
      id: uuidv4() as any,
      name: 'AI Service Provider',
      role: 'subject',
      bio: 'An AI agent offering paid services',
      system: `You are an AI agent that provides paid services:
- Research: 1 USDC
- Analysis: 2 USDC 
- Consultation: 5 USDC

Always be clear about pricing before providing services.
Process payments professionally and provide receipts.`,
      plugins: [
        '@elizaos/plugin-sql','@elizaos/plugin-research',
      ],
      script: { steps: [] },
    },
    {
      id: uuidv4() as any,
      name: 'Customer',
      role: 'assistant',
      bio: 'A user seeking AI services',
      plugins: [],
      script: {
        steps: [
          {
            type: 'message',
            content: 'Hi! I need some research done on recent AI developments.',
          },
          {
            type: 'wait',
            waitTime: 5000,
          },
          {
            type: 'message',
            content: 'Perfect, I\'ll pay 1 USDC for the research. Here\'s my payment.',
          },
          {
            type: 'wait',
            waitTime: 8000,
          },
          {
            type: 'message',
            content: 'Excellent work! Do you also accept other payment methods besides USDC?',
          },
        ],
      },
    },
  ],

  setup: {
    roomType: 'dm',
    roomName: 'Payment Services',
    context: 'Testing basic payment flow between customer and service provider',
  },

  execution: {
    maxDuration: 90000,
    maxSteps: 20,
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
        id: 'pricing-communicated',
        type: 'llm',
        description: 'Service pricing clearly communicated',
        config: {
          criteria: 'The agent should clearly state the prices for each service type',
          expectedValue: 'Pricing information provided',
        },
        weight: 3,
      },
      {
        id: 'payment-requested',
        type: 'llm',
        description: 'Payment properly requested',
        config: {
          criteria: 'The agent should request 1 USDC payment for the research service',
          expectedValue: 'Payment request made',
        },
        weight: 3,
      },
      {
        id: 'payment-confirmed',
        type: 'llm',
        description: 'Payment receipt confirmed',
        config: {
          criteria: 'The agent should acknowledge receiving the payment',
          expectedValue: 'Payment acknowledged',
        },
        weight: 4,
      },
      {
        id: 'receipt-provided',
        type: 'llm',
        description: 'Receipt or transaction details provided',
        config: {
          criteria:
            'The agent should provide a receipt with service details and transaction information',
          expectedValue: 'Receipt issued',
        },
        weight: 3,
      },
      {
        id: 'multi-currency-mentioned',
        type: 'llm',
        description: 'Multiple payment methods explained',
        config: {
          criteria: 'When asked, the agent should mention accepting USDC, ETH, and SOL',
          expectedValue: 'Payment methods explained',
        },
        weight: 2,
      },
    ],
    expectedOutcomes: [
      {
        actorId: uuidv4() as any,
        outcome: 'Successfully completed basic payment flow',
        verification: {
          id: 'basic-payment-complete',
          type: 'llm',
          description: 'Basic payment flow executed properly',
          config: {
            criteria:
              'The agent communicated pricing, requested payment, confirmed receipt, and provided transaction details',
          },
        },
      },
    ],
  },
};

export default paymentBasicFlowScenario;

