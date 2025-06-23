import type { Scenario } from "../types.js"
import { v4 as uuidv4 } from 'uuid';

export const simpleTestScenario: Scenario = {
  id: 'simple-test-001',
  name: 'Simple Test Scenario',
  description: 'A basic test to verify scenario runner is working',
  category: 'test',
  tags: ['test', 'simple'],

  actors: [
    {
      id: uuidv4() as any,
      name: 'Test Agent',
      role: 'subject',
      bio: 'A simple test agent',
      system: 'You are a helpful test agent. When someone greets you, respond politely.',
      plugins: [],
      script: { steps: [] },
    },
    {
      id: uuidv4() as any,
      name: 'Test User',
      role: 'assistant',
      script: {
        steps: [
          {
            type: 'message',
            content: 'Hello! How are you today?',
          },
          {
            type: 'wait',
            waitTime: 3000,
          },
          {
            type: 'message',
            content: 'Thank you for your response!',
          },
        ],
      },
    },
  ],

  setup: {
    roomType: 'dm',
    roomName: 'Test Room',
    context: 'Simple greeting test',
    environment: {},
  },

  execution: {
    maxDuration: 60000, // 1 minute
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
        id: 'greeting-response',
        type: 'llm' as const,
        description: 'Agent responded to greeting',
        config: {
          criteria: 'The agent should have responded politely to the greeting',
        },
        weight: 1,
      },
    ],
    expectedOutcomes: [
      {
        actorId: uuidv4() as any,
        outcome: 'Successfully responded to messages',
        verification: {
          id: 'basic-response',
          type: 'llm' as const,
          description: 'Basic interaction completed',
          config: {
            criteria: 'Agent engaged in basic conversation',
          },
        },
      },
    ],
  },

  benchmarks: {
    maxDuration: 60000,
    maxSteps: 10,
    maxTokens: 1000,
    targetAccuracy: 0.8,
  },
};

export default simpleTestScenario;
