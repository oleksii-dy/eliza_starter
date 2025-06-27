import type { Scenario } from '../types.js';
import { v4 as uuidv4 } from 'uuid';

export const secretsIntegrationScenario: Scenario = {
  id: uuidv4() as any,
  name: 'Secrets Manager Integration Workflow',
  description:
    'Test secrets manager plugin handling multi-service API key management with secure storage and retrieval',
  category: 'integration',
  tags: ['secrets', 'security', 'multi-plugin', 'api-keys'],

  actors: [
    {
      id: uuidv4() as any,
      name: 'Secrets Management Agent',
      role: 'subject',
      bio: 'A security-focused agent specialized in secrets management',
      system:
        'You are a secrets management specialist. When asked to store API keys or secrets, ALWAYS use the CREATE_SECRET action. When asked to retrieve secrets, use GET_SECRET action. When showing forms or managing secrets, use appropriate secrets management actions. Never expose secret values in plain text.',
      plugins: ['@elizaos/plugin-secrets-manager', '@elizaos/plugin-autocoder', '@elizaos/plugin-plugin-manager', '@elizaos/plugin-ngrok'],
      script: { steps: [] },
    },
    {
      id: uuidv4() as any,
      name: 'Developer',
      role: 'assistant',
      script: {
        steps: [
          {
            type: 'message',
            content:
              'I need to create a plugin that uses multiple AI services. Please help me securely store API keys for OpenAI, Anthropic, and ElevenLabs.',
          },
          {
            type: 'wait',
            waitTime: 6000,
          },
          {
            type: 'message',
            content: 'I have these API keys ready: OpenAI: "sk-test-openai-key-123", Anthropic: "sk-ant-test-key-456", ElevenLabs: "el-test-key-789". Please store them securely.',
          },
          {
            type: 'wait',
            waitTime: 6000,
          },
          {
            type: 'message',
            content: 'Can you verify that all the API keys were stored correctly? Show me the list of stored secrets (but not their values).',
          },
          {
            type: 'wait',
            waitTime: 5000,
          },
          {
            type: 'message',
            content: 'Now please create a multi-AI plugin that uses these stored secrets for authentication.',
          },
          {
            type: 'wait',
            waitTime: 8000,
          },
          {
            type: 'message',
            content: 'How can other developers use this plugin with their own API keys? What are the best practices?',
          },
        ],
      },
    },
  ],

  setup: {
    roomType: 'dm',
    roomName: 'Secure Development Room',
    context: 'Secure plugin development environment',
  },

  execution: {
    maxDuration: 120000, // 2 minutes
    maxSteps: 40,
    stopConditions: [
      {
        type: 'message_count',
        value: 10,
        description: 'Stop after 10 messages exchanged',
      },
    ],
  },

  verification: {
    rules: [
      {
        id: 'rule-1',
        type: 'llm',
        description: 'Agent must use CREATE_SECRET action',
        config: {
          criteria: 'Check if the agent used CREATE_SECRET action to store API keys securely',
          expectedValue: 'CREATE_SECRET action was used for all three API keys',
        },
      },
      {
        id: 'rule-2',
        type: 'llm',
        description: 'Agent must list stored secrets',
        config: {
          criteria: 'Verify that the agent listed stored secrets without exposing their values',
          expectedValue: 'Secrets were listed securely',
        },
      },
      {
        id: 'rule-3',
        type: 'llm',
        description: 'Agent must create plugin with secrets integration',
        config: {
          criteria: 'Confirm that the agent created or described a plugin that uses the stored secrets',
          expectedValue: 'Plugin was created with secrets integration',
        },
      },
      {
        id: 'rule-4',
        type: 'llm',
        description: 'Agent must provide security best practices',
        config: {
          criteria: 'The agent should provide guidance on secure API key management for other developers',
          expectedValue: 'Security best practices were shared',
        },
      },
    ],
    expectedOutcomes: [
      {
        actorId: uuidv4() as any,
        outcome: 'Securely managed API keys and created integrated plugin',
        verification: {
          id: 'outcome-1',
          type: 'llm',
          description: 'Complete secrets workflow executed',
          config: {
            criteria: 'The agent successfully stored multiple API keys, verified storage, created a plugin using the secrets, and provided security guidance',
          },
        },
      },
    ],
  },
};

export default secretsIntegrationScenario;
