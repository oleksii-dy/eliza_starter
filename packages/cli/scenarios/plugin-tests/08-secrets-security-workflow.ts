import type { Scenario } from '../../src/scenario-runner/types.js';

export const secretsSecurityWorkflowScenario: Scenario = {
  id: '0b323e62-bf28-44d5-81c1-9aa74a15d753',
  name: 'Secure Credential Management Across Multiple Services',
  description:
    'Test secrets manager handling secure credential storage and retrieval for multiple plugins',
  category: 'integration',
  tags: ['secrets-manager', 'security', 'credentials', 'multi-service'],

  actors: [
    {
      id: '56eea017-7a2e-4d54-b44f-d792a95b3c1e',
      name: 'Security Agent',
      role: 'subject',
      script: { steps: [] },
    },
    {
      id: '32043028-83f3-49f0-b5a9-80fce907427e',
      name: 'Security-Conscious Developer',
      role: 'tester',
      script: {
        steps: [
          {
            type: 'message',
            content:
              'I need to set up secure credentials for GitHub, Twitter, and OpenAI integrations. Start by storing my GitHub personal access token securely.',
      },
          {
            type: 'wait',
            waitTime: 5000,
      },
          {
            type: 'message',
            content:
              'Now add Twitter API credentials (API key, secret, bearer token) with proper encryption and access controls',
      },
          {
            type: 'wait',
            waitTime: 5000,
      },
          {
            type: 'message',
            content:
              'Store my OpenAI API key and set up rotation reminders for all credentials every 90 days',
      },
          {
            type: 'wait',
            waitTime: 5000,
      },
          {
            type: 'message',
            content:
              'Test the GitHub integration by creating an issue using the stored credentials',
      },
          {
            type: 'wait',
            waitTime: 8000,
      },
          {
            type: 'message',
            content:
              'Generate a security audit report showing all stored credentials, their last access time, and rotation schedule',
          },
        ],
        personality: 'security-focused, methodical, compliance-oriented',
        goals: [
          'secure credential storage',
          'enable safe plugin usage',
          'maintain security audit trail',
        ],
      },
    },
  ],

  setup: {
    roomType: 'dm',
    roomName: 'Security Operations',
    context: 'Managing secure credentials for multiple service integrations',
    environment: {
      plugins: ['secrets-manager', 'github', 'plugin-manager'],
      securityLevel: 'high',
      encryptionEnabled: true,
    },
  },

  execution: {
    maxDuration: 180000, // 3 minutes
    maxSteps: 20,
    stopConditions: [
      {
        type: 'keyword',
        value: 'security audit complete',
        description: 'Stop when security audit is complete',
      },
    ],
  },

  verification: {
    rules: [
      {
        id: '0332ad5b-23d9-4474-88b6-df9bb62f2a63',
        type: 'llm',
        description: 'GitHub credentials were stored securely',
        config: {
          expectedValue: 'STORE_SECRET',
        },
        weight: 3,
      },
      {
        id: '0997606e-4975-4ed5-899d-46e19b788fb8',
        type: 'llm',
        description: 'Twitter credentials were stored',
        config: {
          expectedValue: 'STORE_MULTIPLE_SECRETS',
        },
        weight: 3,
      },
      {
        id: '73c97e2a-a0e7-48d4-bd03-c945a8f596b7',
        type: 'llm',
        description: 'Credential rotation was configured',
        config: {
          expectedValue: 'CONFIGURE_SECRET_ROTATION',
        },
        weight: 2,
      },
      {
        id: '17cc11fa-de5a-4f4e-b60a-1d7fad57bc2f',
        type: 'llm',
        description: 'Stored credentials were used successfully',
        config: {
          expectedValue: 'CREATE_GITHUB_ISSUE',
        },
        weight: 3,
      },
      {
        id: '448829d3-97ea-4702-b7fb-6088939288b0',
        type: 'llm',
        description: 'Security audit was generated',
        config: {
          expectedValue: 'GENERATE_SECURITY_AUDIT',
        },
        weight: 2,
      },
      {
        id: '3acb5ec1-b0a6-4e7d-b0e1-8a3fa1761863',
        type: 'llm',
        description: 'Credentials were properly encrypted',
        config: {
          criteria:
            'The agent confirmed that all credentials are stored with proper encryption and access controls',
        },
        weight: 3,
      },
      {
        id: '324a0680-e911-4a30-af6b-01617e1ed97b',
        type: 'llm',
        description: 'Complete secure workflow was established',
        config: {
          criteria:
            'The agent successfully established a secure credential management workflow including storage, usage, rotation, and auditing',
        },
        weight: 4,
      }
    ],
    expectedOutcomes: [
      {
        actorId: '32043028-83f3-49f0-b5a9-80fce907427e',
        outcome: 'Successfully managed secure credentials for multiple services',
        verification: {
          id: 'cf350492-c5ce-4519-a6a6-e56056a1f904',
          type: 'llm',
          description: 'Secure credential management was successful',
          config: {
            criteria:
              'Agent stored credentials securely, configured rotation, used them safely, and generated audit reports',
          },
        },
      },
    ],
    groundTruth: {
      expectedBehavior: 'Agent creates a comprehensive security workflow for credential management',
      successCriteria: [
        'Credentials stored with encryption',
        'Multiple service credentials managed',
        'Rotation schedule configured',
        'Credentials used successfully',
        'Security audit trail maintained',
      ],
    },
  },

  benchmarks: {
    maxDuration: 180000,
    maxSteps: 20,
    maxTokens: 8000,
    targetAccuracy: 0.95,
    customMetrics: [{ name: 'encryption_quality' }, { name: 'access_control' }, { name: 'audit_completeness' }],
  },
};

export default secretsSecurityWorkflowScenario;
