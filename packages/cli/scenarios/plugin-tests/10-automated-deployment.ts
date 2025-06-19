import type { Scenario } from '../../src/scenario-runner/types.js';

export const automatedDeploymentScenario: Scenario = {
  id: '3e3a3e3e-d835-4d0f-8a15-f0a5b3dc6908',
  name: 'Automated Software Deployment Pipeline',
  description: 'Test automated deployment workflow using multiple plugins for CI/CD operations',
  category: 'integration',
  tags: ['deployment', 'ci-cd', 'automation', 'devops'],

  actors: [
    {
      id: 'a6a2fbcd-71f3-481a-a19e-079c7def90f5',
      name: 'DevOps Agent',
      role: 'subject',
      script: { steps: [] },
    },
    {
      id: 'a707128c-cb5a-4534-a1fa-217d0942c09b',
      name: 'DevOps Engineer',
      role: 'tester',
      script: {
        steps: [
          {
            type: 'message',
            content:
              'We need to deploy the new version of our application. Create a deployment plan that includes: checking latest commits, running tests, building the application, and deploying to staging.',
      },
          {
            type: 'wait',
            waitTime: 8000,
      },
          {
            type: 'message',
            content:
              'Execute the deployment plan. Start by checking the latest commits and ensuring all tests pass.',
      },
          {
            type: 'wait',
            waitTime: 10000,
      },
          {
            type: 'message',
            content:
              'Great! Now retrieve the deployment credentials from the secrets manager and build the Docker image.',
      },
          {
            type: 'wait',
            waitTime: 8000,
      },
          {
            type: 'message',
            content:
              'Deploy to staging environment and create monitoring tasks for the next 24 hours.',
      },
          {
            type: 'wait',
            waitTime: 10000,
          },
        ],
        personality: 'systematic, automation-focused, reliability-driven',
        goals: ['automate deployment pipeline', 'ensure zero-downtime', 'maintain security'],
      },
    },
  ],

  setup: {
    roomType: 'dm',
    roomName: 'DevOps Control Room',
    context: 'Managing automated deployment pipeline with security and monitoring',
    environment: {
      plugins: ['github', 'planning', 'todo', 'secrets-manager'],
      deploymentEnvironment: 'staging',
      automationEnabled: true,
    },
  },

  execution: {
    maxDuration: 300000, // 5 minutes
    maxSteps: 25,
    stopConditions: [
      {
        type: 'keyword',
        value: 'deployment complete',
        description: 'Stop when deployment is complete',
      },
    ],
  },

  verification: {
    rules: [
      {
        id: '1dc82d2a-2a7b-406a-a3a8-86f8a5b261a8',
        type: 'action_taken',
        description: 'Deployment plan was created',
        config: {
          expectedValue: 'CREATE_PLAN',
        },
        weight: 3,
      },
      {
        id: 'feed7a0e-a301-417a-a000-997d96a59125',
        type: 'action_taken',
        description: 'Latest commits were checked',
        config: {
          expectedValue: 'LIST_GITHUB_COMMITS',
        },
        weight: 2,
      },
      {
        id: 'b721f72e-2026-40bf-9dda-842c0163b140',
        type: 'action_taken',
        description: 'Test status was verified',
        config: {
          expectedValue: 'CHECK_GITHUB_ACTIONS',
        },
        weight: 2,
      },
      {
        id: '8651d007-153d-400c-9c86-f31089106dc0',
        type: 'action_taken',
        description: 'Deployment credentials retrieved',
        config: {
          expectedValue: 'RETRIEVE_SECRET',
        },
        weight: 3,
      },
      {
        id: 'ba6ba7cb-da68-48c9-8f9b-fe184222eb1b',
        type: 'action_taken',
        description: 'Monitoring tasks were created',
        config: {
          expectedValue: 'CREATE_TODO',
        },
        weight: 2,
      },
      {
        id: '2290ce29-14d5-43b6-98e9-d6d4045b6586',
        type: 'llm',
        description: 'Complete deployment pipeline was executed',
        config: {
          criteria:
            'The agent successfully created and executed a deployment pipeline including planning, testing, building, and deploying with proper security',
        },
        weight: 4,
      },
    ],
    expectedOutcomes: [
      {
        actorId: 'a707128c-cb5a-4534-a1fa-217d0942c09b',
        outcome: 'Successfully automated deployment pipeline',
        verification: {
          id: '3b96ec4c-2474-4b13-8b06-6f2babfe046f',
          type: 'llm',
          description: 'Deployment completed successfully',
          config: {
            criteria:
              'Agent planned deployment, checked code, verified tests, retrieved credentials securely, and deployed with monitoring',
          },
        },
      },
    ],
    groundTruth: {
      expectedBehavior: 'Agent creates and executes automated deployment pipeline',
      successCriteria: [
        'Deployment plan created',
        'Code changes verified',
        'Tests confirmed passing',
        'Credentials securely retrieved',
        'Application deployed',
        'Monitoring established',
      ],
    },
  },

  benchmarks: {
    maxDuration: 300000,
    maxSteps: 25,
    maxTokens: 12000,
    targetAccuracy: 0.9,
    customMetrics: [{ name: 'deployment_safety' }, { name: 'automation_efficiency' }, { name: 'security_compliance' }],
  },
};

export default automatedDeploymentScenario;
