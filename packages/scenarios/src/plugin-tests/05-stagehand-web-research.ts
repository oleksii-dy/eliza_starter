import type { Scenario } from '../types.js';
import { v4 as uuidv4 } from 'uuid';

export const stagehandWebResearchScenario: Scenario = {
  id: uuidv4() as any,
  name: 'Automated Web Research',
  description:
    'Test Stagehand browser plugin conducting automated web research and information extraction',
  category: 'integration',
  tags: ['stagehand', 'browser', 'web-research', 'automation'],

  actors: [
    {
      id: uuidv4() as any,
      name: 'Web Research Agent',
      role: 'subject',
      bio: 'An AI agent specialized in automated web research and data extraction',
      system:
        'You are a web research agent that can help gather information about topics. When asked to research something, provide helpful information based on your knowledge.',
      plugins: ['@elizaos/plugin-stagehand', '@elizaos/plugin-knowledge'],
      script: { steps: [] },
    },
    {
      id: uuidv4() as any,
      name: 'Market Researcher',
      role: 'assistant',
      script: {
        steps: [
          {
            type: 'message',
            content:
              'Can you help me research information about AI companies? I need to understand the current landscape.',
          },
          {
            type: 'wait',
            waitTime: 4000,
          },
          {
            type: 'message',
            content: 'What are some key factors I should consider when comparing AI companies?',
          },
          {
            type: 'wait',
            waitTime: 4000,
          },
          {
            type: 'message',
            content: 'Thank you! Can you summarize the main points for my report?',
          },
        ],
      },
    },
  ],

  setup: {
    roomType: 'dm',
    roomName: 'Market Research',
    context: 'Automated web research for competitive analysis',
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
        description: 'Research assistance was provided',
        config: {
          criteria: 'The agent should have provided helpful information about AI companies',
          expectedValue: 'AI company research information',
        },
      },
      {
        id: uuidv4() as any,
        type: 'llm' as const,
        description: 'Comparison factors were explained',
        config: {
          criteria: 'The agent should have explained key factors for comparing AI companies',
          expectedValue: 'Comparison factors explained',
        },
      },
      {
        id: uuidv4() as any,
        type: 'llm' as const,
        description: 'Summary was provided',
        config: {
          criteria: 'The agent should have provided a summary of main points',
          expectedValue: 'Summary of research findings',
        },
      },
    ],
    expectedOutcomes: [
      {
        actorId: uuidv4() as any,
        outcome: 'Provided web research assistance',
        verification: {
          id: uuidv4() as any,
          type: 'llm' as const,
          description: 'Research assistance was completed',
          config: {
            criteria: 'The agent provided helpful research information and summarized findings',
          },
        },
      },
    ],
  },
};

export default stagehandWebResearchScenario;
