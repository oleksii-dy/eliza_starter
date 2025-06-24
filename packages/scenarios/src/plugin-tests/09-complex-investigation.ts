import type { Scenario } from '../types.js';
import { v4 as uuidv4 } from 'uuid';

export const complexInvestigationScenario: Scenario = {
  id: uuidv4() as any,
  name: 'Multi-Plugin OSINT Investigation',
  description:
    'Test multiple plugins working together for a complex open-source intelligence investigation',
  category: 'integration',
  tags: ['osint', 'investigation', 'multi-plugin', 'complex-workflow'],

  actors: [
    {
      id: uuidv4() as any,
      name: 'Investigation Agent',
      role: 'subject',
      bio: 'An OSINT specialist that conducts comprehensive investigations using multiple data sources',
      system:
        'You are an investigation agent that helps with research and analysis. When asked to investigate something, provide helpful insights and guidance on how to approach the investigation.',
      plugins: [
        '@elizaos/plugin-stagehand',
        '@elizaos/plugin-research',
        '@elizaos/plugin-rolodex',
        '@elizaos/plugin-knowledge',
      ],
      script: { steps: [] },
    },
    {
      id: uuidv4() as any,
      name: 'Intelligence Analyst',
      role: 'assistant',
      script: {
        steps: [
          {
            type: 'message',
            content:
              'I need help investigating a startup company. What are the key things I should look for?',
          },
          {
            type: 'wait',
            waitTime: 4000,
          },
          {
            type: 'message',
            content: 'How can I verify the claims they make about their technology and team?',
          },
          {
            type: 'wait',
            waitTime: 4000,
          },
          {
            type: 'message',
            content: 'What would be the best way to organize and present my findings?',
          },
        ],
      },
    },
  ],

  setup: {
    roomType: 'dm',
    roomName: 'Investigation Room',
    context: 'Conducting OSINT investigation on a technology startup',
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
        description: 'Investigation guidance was provided',
        config: {
          criteria:
            'The agent should have provided guidance on what to look for when investigating a startup',
          expectedValue: 'Investigation guidance provided',
        },
      },
      {
        id: uuidv4() as any,
        type: 'llm' as const,
        description: 'Verification methods were explained',
        config: {
          criteria:
            'The agent should have explained how to verify technology claims and team credentials',
          expectedValue: 'Verification methods explained',
        },
      },
      {
        id: uuidv4() as any,
        type: 'llm' as const,
        description: 'Organization advice was given',
        config: {
          criteria:
            'The agent should have provided advice on organizing and presenting investigation findings',
          expectedValue: 'Organization advice provided',
        },
      },
    ],
    expectedOutcomes: [
      {
        actorId: uuidv4() as any,
        outcome: 'Provided investigation guidance and methodology',
        verification: {
          id: uuidv4() as any,
          type: 'llm' as const,
          description: 'Investigation assistance was provided',
          config: {
            criteria:
              'The agent provided helpful guidance on conducting investigations, verifying claims, and organizing findings',
          },
        },
      },
    ],
  },
};

export default complexInvestigationScenario;
