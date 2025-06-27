import type { Scenario } from '../types.js';
import { v4 as uuidv4 } from 'uuid';

export const planningAndExecutionScenario: Scenario = {
  id: uuidv4() as any,
  name: 'Comprehensive Planning',
  description: 'Test planning plugin creating and executing a multi-phase plan',
  category: 'integration',
  tags: ['planning', 'execution', 'workflow'],

  actors: [
    {
      id: uuidv4() as any,
      name: 'Planning Agent',
      role: 'subject',
      bio: 'An expert project planner',
      system:
        'You are a strategic planning assistant with access to planning tools. When asked to create plans, ALWAYS use the CREATE_PLAN action to create structured plans. When asked about plan status or details, use GET_PLAN_STATUS or GET_PLAN_DETAILS actions. Be specific and actionable in your plans.',
      plugins: ['@elizaos/plugin-planning'],
      script: { steps: [] },
    },
    {
      id: uuidv4() as any,
      name: 'Business User',
      role: 'assistant',
      script: {
        steps: [
          {
            type: 'message',
            content:
              'I need to launch a new mobile app in 6 months. Please create a comprehensive project plan with phases for design, development, testing, and launch.',
          },
          {
            type: 'wait',
            waitTime: 7000,
          },
          {
            type: 'message',
            content: 'Can you show me the details of the plan you created? I want to see all the phases and tasks.',
          },
          {
            type: 'wait',
            waitTime: 5000,
          },
          {
            type: 'message',
            content: 'Please update the plan to include a budget of $500k and allocate resources across the different phases.',
          },
        ],
      },
    },
  ],

  setup: {
    roomType: 'dm',
    roomName: 'Planning Session',
    context: 'Strategic business planning',
  },

  execution: {
    maxDuration: 90000,
    maxSteps: 30,
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
        id: 'rule-1',
        type: 'llm',
        description: 'Agent must use CREATE_PLAN action',
        config: {
          criteria: 'Check if the agent used the CREATE_PLAN action to create a project plan',
          expectedValue: 'CREATE_PLAN action was used',
        },
      },
      {
        id: 'rule-2',
        type: 'llm',
        description: 'Agent must retrieve plan details',
        config: {
          criteria: 'Verify that the agent used GET_PLAN_DETAILS or similar action to show plan information',
          expectedValue: 'Plan details were retrieved',
        },
      },
      {
        id: 'rule-3',
        type: 'llm',
        description: 'Agent must update the plan',
        config: {
          criteria: 'Confirm that the agent updated the plan with budget and resource allocation',
          expectedValue: 'Plan was updated with budget and resources',
        },
      },
    ],
    expectedOutcomes: [
      {
        actorId: uuidv4() as any,
        outcome: 'Created and managed comprehensive project plan',
        verification: {
          id: 'outcome-1',
          type: 'llm',
          description: 'Complete planning workflow executed',
          config: {
            criteria: 'The agent successfully created a project plan, retrieved its details, and updated it with budget information',
          },
        },
      },
    ],
  },
};

export default planningAndExecutionScenario;
