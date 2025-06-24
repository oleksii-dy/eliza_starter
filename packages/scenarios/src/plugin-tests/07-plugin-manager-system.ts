import type { Scenario } from '../types.js';
import { v4 as uuidv4 } from 'uuid';

export const pluginManagerSystemScenario: Scenario = {
  id: uuidv4() as any,
  name: 'Dynamic Plugin Management System',
  description:
    'Test plugin manager discovering, installing, updating, and managing plugins dynamically',
  category: 'integration',
  tags: ['plugin-manager', 'system', 'dynamic-loading', 'lifecycle'],

  actors: [
    {
      id: uuidv4() as any,
      name: 'System Administrator Agent',
      role: 'subject',
      bio: 'A system administration agent that manages plugins and system configuration',
      system:
        'You are a system administrator agent that helps with plugin management questions. When asked about plugins, provide helpful information about managing and configuring them.',
      plugins: ['@elizaos/plugin-plugin-manager'],
      script: { steps: [] },
    },
    {
      id: uuidv4() as any,
      name: 'DevOps Engineer',
      role: 'assistant',
      script: {
        steps: [
          {
            type: 'message',
            content: 'Hi! I need help understanding how to manage plugins in the system.',
          },
          {
            type: 'wait',
            waitTime: 3000,
          },
          {
            type: 'message',
            content: 'What are the best practices for installing and updating plugins?',
          },
          {
            type: 'wait',
            waitTime: 3000,
          },
          {
            type: 'message',
            content: 'How can I check for plugin compatibility and dependencies?',
          },
        ],
      },
    },
  ],

  setup: {
    roomType: 'dm',
    roomName: 'System Administration',
    context: 'Managing plugin lifecycle and system configuration',
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
        description: 'Plugin management help was provided',
        config: {
          criteria: 'The agent should have provided helpful information about managing plugins',
          expectedValue: 'Plugin management guidance',
        },
      },
      {
        id: uuidv4() as any,
        type: 'llm' as const,
        description: 'Best practices were explained',
        config: {
          criteria:
            'The agent should have explained best practices for installing and updating plugins',
          expectedValue: 'Best practices explained',
        },
      },
      {
        id: uuidv4() as any,
        type: 'llm' as const,
        description: 'Compatibility guidance was provided',
        config: {
          criteria:
            'The agent should have explained how to check plugin compatibility and dependencies',
          expectedValue: 'Compatibility guidance provided',
        },
      },
    ],
    expectedOutcomes: [
      {
        actorId: uuidv4() as any,
        outcome: 'Provided plugin management guidance',
        verification: {
          id: uuidv4() as any,
          type: 'llm' as const,
          description: 'Plugin management assistance was provided',
          config: {
            criteria:
              'The agent provided helpful information about plugin management, best practices, and compatibility',
          },
        },
      },
    ],
  },
};

export default pluginManagerSystemScenario;
