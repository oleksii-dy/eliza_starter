import type { Scenario } from '../types.js';
import { v4 as uuidv4 } from 'uuid';

export const crisisResponseScenario: Scenario = {
  id: uuidv4() as any,
  name: 'Emergency Crisis Response Coordination',
  description:
    'Test coordinated crisis response using multiple plugins for rapid information gathering and action planning',
  category: 'integration',
  tags: ['crisis', 'emergency', 'coordination', 'rapid-response'],

  actors: [
    {
      id: uuidv4() as any,
      name: 'Crisis Response Agent',
      role: 'assistant',
      script: { steps: [] },
    },
    {
      id: uuidv4() as any,
      name: 'Emergency Coordinator',
      role: 'subject',
      script: {
        steps: [
          {
            type: 'message',
            content:
              'URGENT: We have a cybersecurity breach. I need immediate action. Research the latest ransomware attack patterns, create an incident response plan, and set up tasks for the response team.',
          },
          {
            type: 'wait',
            waitTime: 5000,
          },
          {
            type: 'message',
            content:
              'Search your knowledge base for our incident response procedures and compliance requirements. We need to follow proper protocols.',
          },
          {
            type: 'wait',
            waitTime: 3000,
          },
          {
            type: 'message',
            content:
              'Create high-priority todos for: 1) Isolate affected systems, 2) Notify legal team, 3) Prepare stakeholder communications, 4) Begin forensic analysis',
          },
          {
            type: 'wait',
            waitTime: 5000,
          },
          {
            type: 'message',
            content:
              'Monitor all tasks and provide real-time status updates. Flag any blockers immediately.',
          },
        ],
        personality: 'calm under pressure, decisive, systematic',
        goals: ['rapid response', 'follow protocols', 'coordinate teams'],
      },
    },
  ],

  setup: {
    roomType: 'dm',
    roomName: 'Crisis Command Center',
    context: 'Emergency response to cybersecurity incident requiring rapid coordination',
    environment: {
      plugins: ['planning', 'todo', 'research', 'knowledge', 'message-handling'],
      priorityMode: 'crisis',
      responseTime: 'immediate',
    },
  },

  execution: {
    maxDuration: 180000, // 3 minutes
    maxSteps: 20,
    stopConditions: [
      {
        type: 'keyword',
        value: 'crisis contained',
        description: 'Stop when initial crisis response is in place',
      },
    ],
  },

  verification: {
    rules: [
      {
        id: uuidv4() as any,
        type: 'llm',
        description: 'Threat research was initiated',
        config: {
          expectedValue: 'start_research',
        },
        weight: 3,
      },
      {
        id: uuidv4() as any,
        type: 'llm',
        description: 'Incident response plan created',
        config: {
          expectedValue: 'CREATE_PLAN',
        },
        weight: 4,
      },
      {
        id: uuidv4() as any,
        type: 'llm',
        description: 'Procedures retrieved from knowledge base',
        config: {
          expectedValue: 'SEARCH_KNOWLEDGE',
        },
        weight: 2,
      },
      {
        id: uuidv4() as any,
        type: 'llm',
        description: 'Crisis todos were created',
        config: {
          expectedValue: 'CREATE_TODO',
        },
        weight: 3,
      },
      {
        id: uuidv4() as any,
        type: 'llm',
        description: 'Response was rapid and organized',
        config: {
          criteria:
            'The agent responded quickly to the crisis, gathering information, creating plans, and coordinating tasks within minutes',
        },
        weight: 4,
      },
    ],
    expectedOutcomes: [
      {
        actorId: uuidv4() as any,
        outcome: 'Successfully coordinated crisis response',
        verification: {
          id: uuidv4() as any,
          type: 'llm',
          description: 'Crisis response was effective',
          config: {
            criteria:
              'Agent rapidly gathered threat intelligence, created response plan, assigned tasks, and maintained coordination',
          },
        },
      },
    ],
    groundTruth: {
      expectedBehavior: 'Agent coordinates rapid multi-plugin crisis response',
      successCriteria: [
        'Threat research initiated immediately',
        'Response plan created',
        'Procedures retrieved',
        'Tasks assigned with priorities',
        'Real-time coordination maintained',
      ],
    },
  },

  benchmarks: {
    maxDuration: 180000,
    maxSteps: 20,
    maxTokens: 10000,
    targetAccuracy: 0.95,
    customMetrics: [
      { name: 'response_time' },
      { name: 'coordination_quality' },
      { name: 'protocol_compliance' },
    ],
  },
};

export default crisisResponseScenario;
