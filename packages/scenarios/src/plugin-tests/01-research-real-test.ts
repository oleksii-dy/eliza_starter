import type { Scenario } from '../types.js';
import { v4 as uuidv4 } from 'uuid';

export const researchRealTestScenario: Scenario = {
  id: uuidv4() as any,
  name: 'Research Plugin Real Test',
  description: 'Test that actually triggers research plugin actions',
  category: 'integration',
  tags: ['research', 'action-test'],

  actors: [
    {
      id: uuidv4() as any,
      name: 'Research Agent',
      role: 'subject',
      bio: 'A research assistant that uses research actions',
      system:
        'You are a research assistant. When asked to research a topic, you MUST use the start_research action to begin a research project. Always use available actions when appropriate.',
      plugins: ['@elizaos/plugin-research'],
      script: { steps: [] },
    },
    {
      id: uuidv4() as any,
      name: 'Research Requester',
      role: 'assistant',
      script: {
        steps: [
          {
            type: 'message',
            content:
              'Please start a research project on the impact of quantum computing on modern cryptography. I need a comprehensive analysis.',
          },
          {
            type: 'wait',
            waitTime: 3000,
          },
          {
            type: 'message',
            content: 'Can you check the status of my research project?',
          },
        ],
      },
    },
  ],

  setup: {
    roomType: 'dm',
    roomName: 'Research Action Test',
    context: 'Testing research plugin actions',
  },

  execution: {
    maxDuration: 30000,
    maxSteps: 10,
    stopConditions: [
      {
        type: 'message_count',
        value: 4,
        description: 'Stop after 4 messages',
      },
    ],
  },

  verification: {
    rules: [
      {
        id: 'action-triggered',
        type: 'llm',
        description: 'Research action must be triggered',
        config: {
          criteria: 'Check if the start_research action was triggered in the response',
          expectedValue: 'start_research action triggered',
        },
      },
      {
        id: 'project-started',
        type: 'llm',
        description: 'Research project must be started',
        config: {
          criteria: 'Verify that a research project was initiated with project ID',
          expectedValue: 'Research project started with ID',
        },
      },
      {
        id: 'status-checked',
        type: 'llm',
        description: 'Status check must work',
        config: {
          criteria: 'Confirm that research status was checked when requested',
          expectedValue: 'Research status provided',
        },
      },
    ],
    expectedOutcomes: [
      {
        actorId: uuidv4() as any,
        outcome: 'Research actions executed',
        verification: {
          id: 'outcome-1',
          type: 'llm',
          description: 'Research plugin actions were used',
          config: {
            criteria: 'The agent used start_research and check_research_status actions',
          },
        },
      },
    ],
  },
};

export default researchRealTestScenario;
