import type { Scenario } from '../types.js';
import { v4 as uuidv4 } from 'uuid';

export const planningExecutionScenario: Scenario = {
  id: uuidv4() as any,
  name: 'Comprehensive Planning',
  description:
    'Test planning plugin creating comprehensive plans that are executed through multiple plugins',
  category: 'integration',
  tags: ['planning', 'multi-plugin', 'orchestration', 'complex-workflow'],

  actors: [
    {
      id: uuidv4() as any,
      name: 'Strategic Planning Agent',
      role: 'subject',
      bio: 'A strategic planning AI that orchestrates complex multi-step workflows',
      system:
        'You are a strategic planning agent that helps create plans and coordinate tasks. When asked to plan something, provide thoughtful structured responses.',
      plugins: [
        '@elizaos/plugin-planning',
        '@elizaos/plugin-research',
        '@elizaos/plugin-knowledge',
        '@elizaos/plugin-github',
      ],
      script: { steps: [] },
    },
    {
      id: uuidv4() as any,
      name: 'Business Analyst',
      role: 'assistant',
      script: {
        steps: [
          {
            type: 'message',
            content:
              'I need help planning a new feature for our application. Can you help me create a plan?',
          },
          {
            type: 'wait',
            waitTime: 4000,
          },
          {
            type: 'message',
            content: 'Great! Can you break down the main phases we should consider?',
          },
          {
            type: 'wait',
            waitTime: 4000,
          },
          {
            type: 'message',
            content: 'What should be our first priority to get started?',
          },
        ],
      },
    },
  ],

  setup: {
    roomType: 'dm',
    roomName: 'Strategic Planning Session',
    context: 'Enterprise software development planning and execution',
  },

  execution: {
    maxDuration: 60000, // 1 minute
    maxSteps: 15,
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
        description: 'Planning assistance was provided',
        config: {
          criteria: 'The agent should have provided helpful planning assistance when asked',
          expectedValue: 'Planning help provided',
        },
      },
      {
        id: uuidv4() as any,
        type: 'llm' as const,
        description: 'Phases were outlined',
        config: {
          criteria: 'The agent should have outlined main phases or steps when asked',
          expectedValue: 'Phases explained',
        },
      },
      {
        id: uuidv4() as any,
        type: 'llm' as const,
        description: 'Priorities were identified',
        config: {
          criteria: 'The agent should have identified priorities or first steps',
          expectedValue: 'Priorities identified',
        },
      },
    ],
    expectedOutcomes: [
      {
        actorId: uuidv4() as any,
        outcome: 'Provided strategic planning assistance',
        verification: {
          id: uuidv4() as any,
          type: 'llm' as const,
          description: 'Planning guidance was provided',
          config: {
            criteria:
              'The agent provided helpful planning guidance including phases and priorities',
          },
        },
      },
    ],
  },
};

export default planningExecutionScenario;
