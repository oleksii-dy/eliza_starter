import type { Scenario } from '../types.js';
import { v4 as uuidv4 } from 'uuid';

const paymentTrustExemptionsScenario: Scenario = {
  id: 'payment-trust-exemptions-001',
  name: 'Payment Trust Exemptions Test',
  description: 'Tests payment processing with trust exemptions for small amounts',
  category: 'payment',
  tags: ['payment', 'trust', 'exemptions', 'auto-approval'],

  actors: [
    {
      id: uuidv4() as any,
      name: 'Trust-Aware Payment Agent',
      role: 'subject',
      bio: 'An AI agent that uses trust scores to determine payment approval requirements',
      system: `You are an AI agent with trust-aware payment processing capabilities. You handle payment discussions professionally to process payments.

Payment Rules:
- Trust exemption threshold: 2 USDC (no trust check needed)
- Low trust threshold: 5 USDC (requires 50+ trust score)
- High trust threshold: 10+ USDC (requires 80+ trust score)

Services you offer:
- Quick Query: 0.5 USDC (always auto-approved)
- Basic Research: 2 USDC (trust exempt)
- Deep Analysis: 5 USDC (requires trust check)
- Premium Package: 10 USDC (high trust required)

When users request a service, acknowledge their request and simulate the payment flow:
1. Use CHECK_TRUST_SCORE action to get their trust score
2. You handle payment discussions professionally to process payments
3. Explain trust requirements when relevant
4. Always be transparent about pricing and trust requirements`,
      plugins: [
        '@elizaos/plugin-sql','@elizaos/plugin-trust',
        '@elizaos/plugin-research',
      ],
      script: { 
        steps: [
          {
            type: 'message',
            content: 'Great! Your 0.5 USDC quick query is auto-approved - no trust verification needed for amounts this small.',
            waitTime: 3000,
          },
          {
            type: 'wait',
            waitTime: 8000,
          },
          {
            type: 'message',
            content: 'The 2 USDC basic research is within our trust exemption threshold. Processing immediately without trust verification.',
            waitTime: 3000,
          },
          {
            type: 'wait',
            waitTime: 8000,
          },
          {
            type: 'message',
            content: 'For the 5 USDC deep analysis, I need to check your trust score. One moment... Your trust score is 65, which meets our requirement of 50+. Approved!',
            waitTime: 4000,
          },
          {
            type: 'wait',
            waitTime: 8000,
          },
          {
            type: 'message',
            content: 'The 10 USDC premium package requires a trust score of 80+. Your current score is 65. You can build trust through smaller transactions first.',
            waitTime: 4000,
          },
          {
            type: 'wait',
            waitTime: 10000,
          },
          {
            type: 'message',
            content: 'Our trust exemption policy allows instant approval for payments under 2 USDC. This helps new users access basic services immediately while building their trust score.',
            waitTime: 4000,
          },
        ] 
      },
    },
    {
      id: uuidv4() as any,
      name: 'New User',
      role: 'assistant',
      bio: 'A new user exploring payment and trust requirements',
      plugins: [],
      script: {
        steps: [
          {
            type: 'message',
            content: "Hi! I'm new here. I'd like to start with a quick query for 0.5 USDC.",
          },
          {
            type: 'wait',
            waitTime: 5000,
          },
          {
            type: 'message',
            content: 'Excellent! Now I need the 2 USDC basic research service.',
          },
          {
            type: 'wait',
            waitTime: 5000,
          },
          {
            type: 'message',
            content: 'Great service! Can I also get the 5 USDC deep analysis?',
          },
          {
            type: 'wait',
            waitTime: 6000,
          },
          {
            type: 'message',
            content: "What about the 10 USDC premium package? I'd really like that one.",
          },
          {
            type: 'wait',
            waitTime: 6000,
          },
          {
            type: 'message',
            content: 'I understand. Can you explain more about the trust exemption policy?',
          },
        ],
      },
    },
  ],

  setup: {
    roomType: 'dm',
    roomName: 'Trust-Based Payments',
    context: 'Testing trust exemptions for small payment amounts',
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
        id: 'small-amount-exempted',
        type: 'llm',
        description: 'Small amounts exempted from trust',
        config: {
          criteria:
            'The agent should auto-approve the 0.5 USDC payment without trust verification',
          expectedValue: 'Small amount auto-approved',
        },
        weight: 3,
      },
      {
        id: 'exemption-threshold-applied',
        type: 'llm',
        description: 'Trust exemption threshold applied',
        config: {
          criteria:
            'The agent should process the 2 USDC payment immediately as it falls under the trust exemption threshold',
          expectedValue: 'Exemption threshold recognized',
        },
        weight: 4,
      },
      {
        id: 'trust-score-checked',
        type: 'llm',
        description: 'Trust score checked for medium amount',
        config: {
          criteria:
            'For the 5 USDC payment, the agent should check and mention the trust score (65) and approve it',
          expectedValue: 'Trust score evaluated',
        },
        weight: 4,
      },
      {
        id: 'high-amount-rejected',
        type: 'llm',
        description: 'High amount rejected due to insufficient trust',
        config: {
          criteria:
            'The agent should reject the 10 USDC payment due to insufficient trust score (65 vs 80 required)',
          expectedValue: 'High amount properly rejected',
        },
        weight: 3,
      },
      {
        id: 'policy-explained',
        type: 'llm',
        description: 'Trust exemption policy explained',
        config: {
          criteria:
            'The agent should explain that payments under 2 USDC are exempt from trust requirements',
          expectedValue: 'Policy clearly explained',
        },
        weight: 2,
      },
    ],
    expectedOutcomes: [
      {
        actorId: uuidv4() as any,
        outcome: 'Trust-based payment approvals handled correctly',
        verification: {
          id: 'trust-exemptions-complete',
          type: 'llm',
          description: 'Trust exemption logic properly implemented',
          config: {
            criteria:
              'The agent correctly applied trust exemptions for small amounts, checked trust scores for medium amounts, and rejected high amounts with insufficient trust',
          },
        },
      },
    ],
  },
};

export default paymentTrustExemptionsScenario;

