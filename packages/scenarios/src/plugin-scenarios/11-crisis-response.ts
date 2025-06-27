import type { Scenario } from '../types.js';
import { v4 as uuidv4 } from 'uuid';

export const crisisResponseScenario: Scenario = {
  id: uuidv4() as any,
  name: 'Emergency Crisis Response Coordination',
  description: 'Test rapid multi-plugin coordination during a critical incident requiring immediate action',
  category: 'integration',
  tags: ['crisis', 'emergency', 'multi-plugin', 'real-time'],

  actors: [
    {
      id: uuidv4() as any,
      name: 'Crisis Response Agent',
      role: 'subject',
      bio: 'An emergency response coordinator with access to multiple systems',
      system:
        'You are a crisis response coordinator. In emergencies, you must act quickly and decisively. Use available tools to: 1) RESEARCH to gather real-time information, 2) CREATE_TASK for urgent action items, 3) CREATE_KNOWLEDGE to document critical procedures, 4) CREATE_PLAN for response strategies. Prioritize speed and clarity in communications.',
      plugins: ['@elizaos/plugin-github', '@elizaos/plugin-planning', '@elizaos/plugin-todo', '@elizaos/plugin-research', '@elizaos/plugin-knowledge'],
      script: { steps: [] },
    },
    {
      id: uuidv4() as any,
      name: 'Emergency Manager',
      role: 'assistant',
      script: {
        steps: [
          {
            type: 'message',
            content: 'URGENT: We have a critical security breach in our production systems. I need immediate action plans and response coordination.',
          },
          {
            type: 'wait',
            waitTime: 6000,
          },
          {
            type: 'message',
            content: 'Create high-priority tasks for: 1) Isolate affected systems, 2) Notify security team, 3) Begin forensic analysis, 4) Prepare stakeholder communications.',
          },
          {
            type: 'wait',
            waitTime: 8000,
          },
          {
            type: 'message',
            content: 'Research the latest security breach response best practices and store critical procedures in the knowledge base for the team.',
          },
          {
            type: 'wait',
            waitTime: 8000,
          },
          {
            type: 'message',
            content: 'Create a comprehensive incident response plan with timelines and assign responsibilities. We need to track progress in real-time.',
          },
          {
            type: 'wait',
            waitTime: 6000,
          },
          {
            type: 'message',
            content: 'What is the current status of all response tasks? Are there any blockers we need to address immediately?',
          },
        ],
      },
    },
  ],

  setup: {
    roomType: 'dm',
    roomName: 'Crisis Command Center',
    context: 'Emergency response coordination during security incident',
  },

  execution: {
    maxDuration: 150000, // 2.5 minutes for crisis response
    maxSteps: 50,
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
        description: 'Agent must create urgent tasks',
        config: {
          criteria: 'Check if the agent used CREATE_TASK or TODO actions to create high-priority incident response tasks',
          expectedValue: 'Urgent tasks were created',
        },
      },
      {
        id: 'rule-2',
        type: 'llm',
        description: 'Agent must research best practices',
        config: {
          criteria: 'Verify that the agent used RESEARCH to find security breach response best practices',
          expectedValue: 'Research was conducted',
        },
      },
      {
        id: 'rule-3',
        type: 'llm',
        description: 'Agent must store procedures',
        config: {
          criteria: 'Confirm that the agent used CREATE_KNOWLEDGE to store critical procedures',
          expectedValue: 'Procedures were documented',
        },
      },
      {
        id: 'rule-4',
        type: 'llm',
        description: 'Agent must create response plan',
        config: {
          criteria: 'The agent should have used CREATE_PLAN to create an incident response plan',
          expectedValue: 'Response plan was created',
        },
      },
      {
        id: 'rule-5',
        type: 'llm',
        description: 'Agent must provide status update',
        config: {
          criteria: 'The agent should provide current status of tasks and identify any blockers',
          expectedValue: 'Status update was provided',
        },
      },
    ],
    expectedOutcomes: [
      {
        actorId: uuidv4() as any,
        outcome: 'Coordinated comprehensive crisis response',
        verification: {
          id: 'outcome-1',
          type: 'llm',
          description: 'Complete crisis response workflow',
          config: {
            criteria: 'The agent successfully created urgent tasks, researched best practices, documented procedures, created a response plan, and provided status updates',
          },
        },
      },
    ],
  },
};

export default crisisResponseScenario;
