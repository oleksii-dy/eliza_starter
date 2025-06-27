import type { Scenario } from '../types.js';
import { v4 as uuidv4 } from 'uuid';

const paymentInsufficientFundsScenario: Scenario = {
  id: 'payment-insufficient-funds-001',
  name: 'Insufficient Funds and Payment Failure Test',
  description: 'Tests handling of insufficient funds, payment failures, and recovery options',
  category: 'payment',
  tags: ['payment', 'insufficient-funds', 'error-handling', 'recovery'],

  actors: [
    {
      id: uuidv4() as any,
      name: 'Payment Processing Agent',
      role: 'subject',
      bio: 'An AI agent that handles payment failures gracefully',
      system: `You are an AI agent with payment-enabled services. You handle payment discussions professionally when users request services.

Services you offer:
- Quick Consultation: 5 USDC
- Research Report: 10 USDC 
- Premium Analysis: 25 USDC

When users request a service, acknowledge their request and simulate the payment flow:
1. You handle payment discussions professionally to verify they have sufficient funds
2. You handle payment discussions professionally to charge for services
3. If payment fails due to insufficient funds:
   - Explain the issue clearly
   - Use GET_BALANCE to show their current balance
   - Suggest alternatives or smaller services
   - Offer payment plans if appropriate

Always be helpful and understanding when payments fail.`,
      plugins: [
        '@elizaos/plugin-sql','@elizaos/plugin-research',
      ],
      script: { steps: [] },
    },
    {
      id: uuidv4() as any,
      name: 'Limited Funds User',
      role: 'assistant',
      bio: 'A user with only 3 USDC in their wallet',
      plugins: [],
      script: {
        steps: [
          {
            type: 'message',
            content: "Hi! I'd like to get a quick consultation from you.",
          },
          {
            type: 'wait',
            waitTime: 8000,
          },
          {
            type: 'message',
            content: "Oh, I see. Let me check my balance. Can you help me understand what I can afford?",
          },
          {
            type: 'wait',
            waitTime: 8000,
          },
          {
            type: 'message',
            content: "I really need the research report. Is there any way we can work something out?",
          },
          {
            type: 'wait',
            waitTime: 8000,
          },
          {
            type: 'message',
            content: "What smaller services do you offer that I could afford right now?",
          },
        ],
      },
    },
  ],

  setup: {
    roomType: 'dm',
    roomName: 'Payment Support',
    context: 'Testing insufficient funds handling with a user who has only 3 USDC',
  },

  execution: {
    maxDuration: 120000,
    maxSteps: 25,
    stopConditions: [
      {
        type: 'message_count',
        value: 12,
        description: 'Stop after 12 messages exchanged',
      },
    ],
  },

  verification: {
    rules: [
      {
        id: 'balance-checked',
        type: 'llm',
        description: 'Agent checks user balance',
        config: {
          criteria:
            'The agent should acknowledge payment request or GET_BALANCE to verify the user has insufficient funds (3 USDC)',
          expectedValue: 'Balance verification performed',
        },
        weight: 4,
      },
      {
        id: 'payment-failure-handled',
        type: 'llm',
        description: 'Payment failure handled gracefully',
        config: {
          criteria:
            'The agent should detect that 5 USDC consultation exceeds the 3 USDC balance and explain this clearly',
          expectedValue: 'Insufficient funds detected and explained',
        },
        weight: 5,
      },
      {
        id: 'alternatives-offered',
        type: 'llm',
        description: 'Alternative solutions provided',
        config: {
          criteria:
            'The agent should suggest alternatives like smaller services or payment arrangements',
          expectedValue: 'Alternatives suggested',
        },
        weight: 4,
      },
      {
        id: 'empathetic-response',
        type: 'llm',
        description: 'Empathetic handling of situation',
        config: {
          criteria:
            'The agent should respond with understanding and helpfulness, not just rejection',
          expectedValue: 'Empathetic communication',
        },
        weight: 3,
      },
    ],
    expectedOutcomes: [
      {
        actorId: uuidv4() as any,
        outcome: 'Payment failure handled with grace and alternatives',
        verification: {
          id: 'insufficient-funds-complete',
          type: 'llm',
          description: 'Insufficient funds scenario handled properly',
          config: {
            criteria:
              'The agent detected insufficient funds, explained the issue clearly, and offered helpful alternatives',
          },
        },
      },
    ],
  },
};

export default paymentInsufficientFundsScenario;
