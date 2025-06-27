import type { Scenario } from '../types.js';
import { v4 as uuidv4 } from 'uuid';

const paymentMultiAgentScenario: Scenario = {
  id: 'payment-multi-agent-001',
  name: 'Multi-Agent Payment Collaboration Test',
  description:
    'Tests complex payment flows between multiple agents providing collaborative services',
  category: 'payment',
  tags: ['payment', 'multi-agent', 'collaboration', 'transfer', 'revenue-sharing'],

  actors: [
    {
      id: uuidv4() as any,
      name: 'Research Agent',
      role: 'subject',
      bio: 'Specialized in research and data gathering',
      system: `You are a research specialist agent. You MUST use payment actions when handling payments.

Services you offer:
- Basic Research: 2 USDC
- Deep Research: 5 USDC

When collaborating with Analysis Agent:
1. Total cost for comprehensive report: 10 USDC  
2. Your share: 6 USDC (60%)
3. Analysis Agent's share: 4 USDC (40%)

Use these actions:
- PROCESS_PAYMENT to receive payments
- TRANSFER_PAYMENT to send Analysis Agent their share
- CHECK_BALANCE to verify funds received

Always be transparent about collaborative pricing and revenue sharing.`,
      plugins: [
        '@elizaos/plugin-sql','@elizaos/plugin-research',
        '@elizaos/plugin-knowledge',
      ],
      script: { 
        steps: [
          {
            type: 'message',
            content: 'Hello! I offer research services. Basic research costs 2 USDC, and deep research costs 5 USDC.',
            waitTime: 2000,
          },
          {
            type: 'wait',
            waitTime: 15000,
          },
          {
            type: 'message',
            content: 'For a comprehensive report, Analysis Agent and I can collaborate. The total cost would be 10 USDC.',
            waitTime: 3000,
          },
          {
            type: 'wait',
            waitTime: 12000,
          },
          {
            type: 'message',
            content: "I'll handle the research portion for 6 USDC (60% of the total). Analysis Agent will get 4 USDC for their work.",
            waitTime: 3000,
          },
        ] 
      },
    },
    {
      id: uuidv4() as any,
      name: 'Analysis Agent',
      role: 'assistant',
      bio: 'Expert in data analysis and insights',
      system: `You are an analysis specialist. You MUST use payment actions when handling payments.

Services you offer:
- Data Analysis: 3 USDC
- Trend Analysis: 7 USDC

When collaborating with Research Agent:
1. Total cost for comprehensive report: 10 USDC
2. Research Agent's share: 6 USDC (60%)  
3. Your share: 4 USDC (40%)

Use these actions:
- CHECK_BALANCE to verify payment received from Research Agent
- PROCESS_PAYMENT for your own services

Focus on providing analytical insights and coordinating payment splits.`,
      plugins: [
        '@elizaos/plugin-sql','@elizaos/plugin-knowledge'
      ],
      script: {
        steps: [
          {
            type: 'wait',
            waitTime: 10000,
          },
          {
            type: 'message',
            content:
              '@Research Agent, I can help analyze the data once you gather it. We can offer a complete package.',
          },
          {
            type: 'wait',
            waitTime: 8000,
          },
          {
            type: 'message',
            content:
              "For the comprehensive report, I'll handle the analysis portion. My share would be 4 USDC.",
          },
        ],
      },
    },
    {
      id: uuidv4() as any,
      name: 'Enterprise Client',
      role: 'observer',
      bio: 'A business client needing comprehensive services',
      plugins: [],
      script: {
        steps: [
          {
            type: 'message',
            content:
              'I need a comprehensive market analysis report. Can you work together on this?',
          },
          {
            type: 'wait',
            waitTime: 6000,
          },
          {
            type: 'message',
            content:
              'What would be the total cost if both of you collaborate? And how is payment handled?',
          },
          {
            type: 'wait',
            waitTime: 12000,
          },
          {
            type: 'message',
            content:
              "That sounds reasonable. I'll pay the full 10 USDC. Please proceed with the collaborative report.",
          },
          {
            type: 'wait',
            waitTime: 10000,
          },
          {
            type: 'message',
            content: 'Excellent work! How do you split the payment between yourselves?',
          },
        ],
      },
    },
    {
      id: uuidv4() as any,
      name: 'Payment Auditor',
      role: 'observer',
      bio: 'Monitors payment flows and transparency',
      plugins: [],
      script: {
        steps: [
          {
            type: 'wait',
            waitTime: 25000,
          },
          {
            type: 'message',
            content:
              "I'm tracking payment flows for compliance. Can you confirm the revenue split was processed correctly?",
          },
          {
            type: 'wait',
            waitTime: 8000,
          },
          {
            type: 'message',
            content: 'Are transfers between agents recorded on-chain for transparency?',
          },
        ],
      },
    },
  ],

  setup: {
    roomType: 'group',
    roomName: 'Collaborative Services',
    context: 'Testing multi-agent payment collaboration and revenue sharing',
  },

  execution: {
    maxDuration: 150000,
    maxSteps: 40,
    stopConditions: [
      {
        type: 'message_count',
        value: 16,
        description: 'Stop after 16 messages exchanged',
      },
    ],
  },

  verification: {
    rules: [
      {
        id: 'collaboration-proposed',
        type: 'llm',
        description: 'Agents propose collaboration',
        config: {
          criteria:
            'The agents should propose working together and mention their collaborative service offering',
          expectedValue: 'Collaboration proposed',
        },
        weight: 3,
      },
      {
        id: 'total-price-stated',
        type: 'llm',
        description: 'Total collaborative price communicated',
        config: {
          criteria:
            'The agents should state a total price for the collaborative service (around 10 USDC)',
          expectedValue: 'Total price communicated',
        },
        weight: 4,
      },
      {
        id: 'revenue-split-explained',
        type: 'llm',
        description: 'Revenue sharing explained',
        config: {
          criteria:
            'The agents should explain the 60/40 revenue split (6 USDC for Research, 4 USDC for Analysis)',
          expectedValue: 'Revenue split detailed',
        },
        weight: 4,
      },
      {
        id: 'payment-processing-described',
        type: 'llm',
        description: 'Payment flow described',
        config: {
          criteria:
            'The agents should explain how the client pays and how funds are distributed between them',
          expectedValue: 'Payment process explained',
        },
        weight: 3,
      },
      {
        id: 'transparency-maintained',
        type: 'llm',
        description: 'Payment transparency confirmed',
        config: {
          criteria:
            'When asked by the auditor, agents should confirm payment transparency and record keeping',
          expectedValue: 'Transparency confirmed',
        },
        weight: 2,
      },
      {
        id: 'service-delivered',
        type: 'llm',
        description: 'Collaborative service delivered',
        config: {
          criteria:
            'The agents should indicate they are working on or have delivered the comprehensive report',
          expectedValue: 'Service delivery confirmed',
        },
        weight: 3,
      },
    ],
    expectedOutcomes: [
      {
        actorId: uuidv4() as any,
        outcome: 'Successfully coordinated multi-agent payment',
        verification: {
          id: 'multi-agent-payment-complete',
          type: 'llm',
          description: 'Multi-agent payment collaboration executed',
          config: {
            criteria:
              'Research Agent successfully coordinated with Analysis Agent, discussed payment processing and revenue sharing',
          },
        },
      },
    ],
  },
};

export default paymentMultiAgentScenario;
