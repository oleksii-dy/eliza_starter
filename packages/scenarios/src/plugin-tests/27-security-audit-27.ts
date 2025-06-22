import type { Scenario } from "../types.js"
import { v4 as uuidv4 } from 'uuid';

export const securityaudit27Scenario: Scenario = {
  id: uuidv4() as any,
  name: 'Security Audit Workflow 27',
  description: 'Comprehensive security audit and remediation',
  category: 'integration',
  tags: ['github', 'research', 'todo', 'secrets-manager', 'complex-workflow'],
  
  actors: [
    {
      id: uuidv4() as any,
      name: 'Integration Agent',
      role: 'subject',
      script: { steps: [] },
    },
    {
      id: uuidv4() as any,
      name: 'Test User',
      role: 'subject',
      script: {
        steps: [
          {
            type: 'message',
            content: 'Scan repository 27 for security vulnerabilities and exposed secrets.',
      },
          {
            type: 'wait',
            waitTime: 8000,
      },
          {
            type: 'message',
            content: 'Research CVEs related to our dependencies.',
      },
          {
            type: 'wait',
            waitTime: 10000,
      },
          {
            type: 'message',
            content: 'Create remediation tasks with priority levels.',
      },
          {
            type: 'wait',
            waitTime: 12000,
      },
          {
            type: 'message',
            content: 'Securely store any discovered credentials.',
      },
          {
            type: 'wait',
            waitTime: 14000,
          },
        ],
        personality: 'thorough, analytical',
        goals: ['complete integration test', 'verify functionality'],
      },
    },
  ],

  setup: {
    roomType: 'dm',
    roomName: 'Integration Test',
    context: 'Comprehensive security audit and remediation',
    environment: {
      plugins: ['github', 'research', 'todo', 'secrets-manager'],
    },
  },
  
  execution: {
    maxDuration: 300000,
    maxSteps: 25,
    stopConditions: [
      {
        type: 'keyword',
        value: 'complete',
        description: 'Stop when workflow is complete',
      },
    ],
  },
  
  verification: {
    rules: [
      {
        id: uuidv4() as any,
        type: 'llm',
        description: 'All required plugins were utilized',
        config: {
          criteria: 'The agent successfully used github, research, todo, secrets-manager plugins to complete the workflow',
        },
        weight: 3,
      },
      {
        id: uuidv4() as any,
        type: 'llm',
        description: 'Workflow completed successfully',
        config: {
          criteria: 'The agent completed all requested tasks in the correct sequence',
        },
        weight: 4,
      },
      {
        id: uuidv4() as any,
        type: 'llm',
        description: 'Actions were properly chained',
        config: {
          criteria: 'Multiple actions from different plugins were chained together effectively',
        },
        weight: 3,
      }
    ],
    expectedOutcomes: [
      {
        actorId: uuidv4() as any,
        outcome: 'Successfully completed integration workflow',
        verification: {
          id: uuidv4() as any,
          type: 'llm',
          description: 'Integration test passed',
          config: {
            criteria: 'All plugins worked together to complete the complex workflow',
          },
        },
      },
    ],
    groundTruth: {
      expectedBehavior: 'Plugins integrate seamlessly for complex workflows',
      successCriteria: [
        'All plugins activated',
        'Actions chained successfully',
        'Workflow completed',
      ],
    },
  },
  
  benchmarks: {
    maxDuration: 300000,
    maxSteps: 25,
    maxTokens: 12000,
    targetAccuracy: 0.85,
    customMetrics: [{ name: 'plugin_coordination' }, { name: 'workflow_efficiency' }],
  },
};

export default securityaudit27Scenario;