import type { Scenario } from '../types.js';
import { v4 as uuidv4 } from 'uuid';

export const automatedDeploymentScenario: Scenario = {
  id: uuidv4() as any,
  name: 'Automated CI/CD Deployment Pipeline',
  description: 'Test automated deployment workflow using GitHub, planning, and deployment plugins',
  category: 'integration',
  tags: ['deployment', 'cicd', 'automation', 'devops'],

  actors: [
    {
      id: uuidv4() as any,
      name: 'DevOps Agent',
      role: 'subject',
      bio: 'A DevOps automation agent that manages CI/CD pipelines and deployments',
      system:
        'You are a DevOps agent that helps with deployment planning and CI/CD best practices. When asked about deployments, provide helpful guidance on the deployment process.',
      plugins: ['@elizaos/plugin-github', '@elizaos/plugin-planning', '@elizaos/plugin-todo'],
      script: { steps: [] },
    },
    {
      id: uuidv4() as any,
      name: 'Release Manager',
      role: 'assistant',
      script: {
        steps: [
          {
            type: 'message',
            content:
              'Hi! I need help planning a deployment for our application. What should I consider?',
          },
          {
            type: 'wait',
            waitTime: 4000,
          },
          {
            type: 'message',
            content: 'What are the key steps in a deployment checklist?',
          },
          {
            type: 'wait',
            waitTime: 4000,
          },
          {
            type: 'message',
            content: 'How should I handle rollback procedures if something goes wrong?',
          },
        ],
      },
    },
  ],

  setup: {
    roomType: 'dm',
    roomName: 'Release Management',
    context: 'Managing automated deployment pipeline for production release',
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
        description: 'Deployment planning guidance was provided',
        config: {
          criteria:
            'The agent should have provided guidance on what to consider when planning a deployment',
          expectedValue: 'Deployment planning guidance',
        },
      },
      {
        id: uuidv4() as any,
        type: 'llm' as const,
        description: 'Deployment checklist was explained',
        config: {
          criteria: 'The agent should have explained key steps in a deployment checklist',
          expectedValue: 'Deployment checklist explained',
        },
      },
      {
        id: uuidv4() as any,
        type: 'llm' as const,
        description: 'Rollback procedures were covered',
        config: {
          criteria: 'The agent should have explained how to handle rollback procedures',
          expectedValue: 'Rollback procedures explained',
        },
      },
    ],
    expectedOutcomes: [
      {
        actorId: uuidv4() as any,
        outcome: 'Provided deployment guidance and best practices',
        verification: {
          id: uuidv4() as any,
          type: 'llm' as const,
          description: 'Deployment assistance was provided',
          config: {
            criteria:
              'The agent provided helpful guidance on deployment planning, checklists, and rollback procedures',
          },
        },
      },
    ],
  },
};

export default automatedDeploymentScenario;
