import type { Scenario } from "../types.js"
import { v4 as uuidv4 } from 'uuid';

export const secretsSecurityWorkflowScenario: Scenario = {
  id: uuidv4() as any,
  name: 'Secure Secrets Management Workflow',
  description:
    'Test secrets manager plugin handling secure credential storage, rotation, and access control',
  category: 'integration',
  tags: ['secrets-manager', 'security', 'credentials', 'encryption'],

  actors: [
    {
      id: uuidv4() as any,
      name: 'Security Agent',
      role: 'subject',
      bio: 'A security-focused agent that manages secrets and credentials securely',
      system:
        'You are a security agent that helps with best practices for managing secrets and credentials. When asked about security, provide helpful guidance on secure credential management.',
      plugins: ['@elizaos/plugin-secrets-manager'],
      script: { steps: [] },
    },
    {
      id: uuidv4() as any,
      name: 'Security Engineer',
      role: 'assistant',
      script: {
        steps: [
          {
            type: 'message',
            content:
              'Hi! I need help understanding best practices for storing API keys and credentials securely.',
          },
          {
            type: 'wait',
            waitTime: 3000,
          },
          {
            type: 'message',
            content: 'What are the key principles for credential rotation and access control?',
          },
          {
            type: 'wait',
            waitTime: 3000,
          },
          {
            type: 'message',
            content: 'How should I approach auditing and monitoring secret access?',
          },
        ],
      },
    },
  ],

  setup: {
    roomType: 'dm',
    roomName: 'Security Operations',
    context: 'Managing sensitive credentials and security policies',
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
        description: 'Security best practices were explained',
        config: {
          criteria:
            'The agent should have explained best practices for storing API keys and credentials securely',
          expectedValue: 'Security best practices explained',
        },
      },
      {
        id: uuidv4() as any,
        type: 'llm' as const,
        description: 'Rotation and access control were covered',
        config: {
          criteria:
            'The agent should have explained principles for credential rotation and access control',
          expectedValue: 'Rotation and access control explained',
        },
      },
      {
        id: uuidv4() as any,
        type: 'llm' as const,
        description: 'Auditing guidance was provided',
        config: {
          criteria:
            'The agent should have provided guidance on auditing and monitoring secret access',
          expectedValue: 'Auditing guidance provided',
        },
      },
    ],
    expectedOutcomes: [
      {
        actorId: uuidv4() as any,
        outcome: 'Provided security best practices guidance',
        verification: {
          id: uuidv4() as any,
          type: 'llm' as const,
          description: 'Security guidance was provided',
          config: {
            criteria:
              'The agent provided comprehensive guidance on secure credential management, rotation, and auditing',
          },
        },
      },
    ],
  },
};

export default secretsSecurityWorkflowScenario;
