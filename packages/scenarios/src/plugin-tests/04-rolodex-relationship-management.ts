import type { Scenario } from "../types.js"
import { v4 as uuidv4 } from 'uuid';

export const rolodexRelationshipScenario: Scenario = {
  id: uuidv4() as any,
  name: 'Complex Entity and Relationship Management',
  description:
    'Test Rolodex plugin tracking entities, relationships, and interactions across multiple contexts',
  category: 'integration',
  tags: ['rolodex', 'entities', 'relationships', 'social-graph'],

  actors: [
    {
      id: uuidv4() as any,
      name: 'Relationship Manager Agent',
      role: 'subject',
      bio: 'A specialized agent for tracking professional relationships and organizational networks',
      system:
        'You are a relationship management agent that helps track people and their connections. When someone tells you about meeting people or relationships, acknowledge the information and offer to help track these connections.',
      plugins: ['@elizaos/plugin-rolodex'],
      script: { steps: [] },
    },
    {
      id: uuidv4() as any,
      name: 'Business Networker',
      role: 'assistant',
      script: {
        steps: [
          {
            type: 'message',
            content:
              'I just met Alice Chen at the AI conference. She is the CTO of TechCorp and is interested in quantum computing.',
          },
          {
            type: 'wait',
            waitTime: 3000,
          },
          {
            type: 'message',
            content:
              'Alice works with Bob Martinez who leads their research team. They collaborate on quantum projects.',
          },
          {
            type: 'wait',
            waitTime: 3000,
          },
          {
            type: 'message',
            content: 'Can you help me keep track of these professional connections?',
          },
        ],
      },
    },
  ],

  setup: {
    roomType: 'dm',
    roomName: 'Professional Networking',
    context: 'Managing professional relationships and organizational connections',
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
        description: 'Agent acknowledged entity information',
        config: {
          criteria:
            'The agent should have acknowledged the information about Alice Chen and Bob Martinez',
          expectedValue: 'Entity information acknowledged',
        },
      },
      {
        id: uuidv4() as any,
        type: 'llm' as const,
        description: 'Relationship tracking was offered',
        config: {
          criteria: 'The agent should have offered to help track the professional connections',
          expectedValue: 'Relationship tracking assistance offered',
        },
      },
      {
        id: uuidv4() as any,
        type: 'llm' as const,
        description: 'Professional details were recognized',
        config: {
          criteria:
            'The agent should have recognized professional details like roles (CTO, Research Lead) and interests (quantum computing)',
          expectedValue: 'Professional details recognized',
        },
      },
    ],
    expectedOutcomes: [
      {
        actorId: uuidv4() as any,
        outcome: 'Provided relationship management assistance',
        verification: {
          id: uuidv4() as any,
          type: 'llm' as const,
          description: 'Relationship tracking assistance was provided',
          config: {
            criteria:
              'The agent acknowledged the entity information and offered to help track professional connections',
          },
        },
      },
    ],
  },
};

export default rolodexRelationshipScenario;
