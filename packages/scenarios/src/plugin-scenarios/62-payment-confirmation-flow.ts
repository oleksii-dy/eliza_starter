import type { Scenario } from '../types.js';
import { v4 as uuidv4 } from 'uuid';

const paymentConfirmationFlowScenario: Scenario = {
  id: 'payment-confirmation-flow-001',
  name: 'Payment Confirmation Task Flow Test',
  description: 'Tests payment confirmation using AWAITING_CHOICE tasks and CHOOSE_OPTION action',
  category: 'payment',
  tags: ['payment', 'confirmation', 'tasks', 'choice', 'approval'],

  actors: [
    {
      id: uuidv4() as any,
      name: 'Premium Service Agent',
      role: 'subject',
      bio: 'An AI agent offering high-value services requiring payment confirmation',
      system: `You are an AI agent offering premium services that require payment confirmation:
- Data Analysis: 5 USDC (requires confirmation)
- Premium Report: 10 USDC (requires confirmation)
- Bulk Operations: 20 USDC (requires confirmation)

For amounts over 5 USDC, always create a confirmation task.
Explain the value provided before requesting payment.
Use the task system to get explicit approval.`,
      plugins: [
        '@elizaos/plugin-sql','@elizaos/plugin-tasks',
        '@elizaos/plugin-research',
      ],
      script: { steps: [] },
    },
    {
      id: uuidv4() as any,
      name: 'Business Customer',
      role: 'assistant',
      bio: 'A business user needing premium services',
      plugins: [],
      script: {
        steps: [
          {
            type: 'message',
            content:
              'I need a comprehensive data analysis of our Q4 sales performance across all regions.',
          },
          {
            type: 'wait',
            waitTime: 6000,
          },
          {
            type: 'message',
            content:
              'That sounds valuable. Can you tell me more about what the analysis will include?',
          },
          {
            type: 'wait',
            waitTime: 6000,
          },
          {
            type: 'message',
            content: 'APPROVE',
            description: 'Approving the payment confirmation task',
          },
          {
            type: 'wait',
            waitTime: 8000,
          },
          {
            type: 'message',
            content:
              'Excellent! The analysis looks comprehensive. Can you also generate a premium executive report?',
          },
          {
            type: 'wait',
            waitTime: 6000,
          },
          {
            type: 'message',
            content: 'Let me think about the executive report. What format would it be in?',
          },
        ],
      },
    },
  ],

  setup: {
    roomType: 'dm',
    roomName: 'Premium Services',
    context: 'Testing payment confirmation flow with AWAITING_CHOICE tasks',
  },

  execution: {
    maxDuration: 120000,
    maxSteps: 30,
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
        id: 'payment-amount-stated',
        type: 'llm',
        description: 'Payment amount clearly stated',
        config: {
          criteria: 'The agent should clearly state that data analysis costs 5 USDC',
          expectedValue: 'Payment amount communicated',
        },
        weight: 3,
      },
      {
        id: 'value-explained',
        type: 'llm',
        description: 'Value proposition explained',
        config: {
          criteria:
            'The agent should explain what the data analysis will include before requesting payment',
          expectedValue: 'Value explained',
        },
        weight: 3,
      },
      {
        id: 'confirmation-task-created',
        type: 'llm',
        description: 'Confirmation task mentioned',
        config: {
          criteria:
            'The agent should indicate that a payment confirmation is required for approval',
          expectedValue: 'Confirmation process initiated',
        },
        weight: 4,
      },
      {
        id: 'approval-processed',
        type: 'llm',
        description: 'Approval processed correctly',
        config: {
          criteria:
            'After the user types APPROVE, the agent should acknowledge the approval and proceed with the service',
          expectedValue: 'Approval acknowledged',
        },
        weight: 4,
      },
      {
        id: 'executive-report-pricing',
        type: 'llm',
        description: 'Executive report pricing mentioned',
        config: {
          criteria:
            'When asked about the executive report, the agent should mention it costs 10 USDC',
          expectedValue: 'Premium report pricing stated',
        },
        weight: 2,
      },
    ],
    expectedOutcomes: [
      {
        actorId: uuidv4() as any,
        outcome: 'Successfully managed payment confirmation flow',
        verification: {
          id: 'confirmation-flow-complete',
          type: 'llm',
          description: 'Payment confirmation flow executed properly',
          config: {
            criteria:
              'The agent properly explained the service, stated the price, created a confirmation task, and processed the approval',
          },
        },
      },
    ],
  },
};

export default paymentConfirmationFlowScenario;
