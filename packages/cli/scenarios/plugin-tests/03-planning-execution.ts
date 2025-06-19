import type { Scenario } from '../../src/scenario-runner/types.js';

export const planningExecutionScenario: Scenario = {
  id: '4f1bf06f-331e-4d5b-83b9-32761ae7be23',
  name: 'Complex Project Planning and Multi-Plugin Execution',
  description:
    'Test planning plugin creating a comprehensive plan that requires execution through multiple plugins',
  category: 'integration',
  tags: ['planning', 'multi-plugin', 'execution', 'complex-workflow'],

  actors: [
    {
      id: '28e71827-7957-4433-81cb-60b8ddaafaa6',
      name: 'Planning Agent',
      role: 'subject',
      script: { steps: [] },
    },
    {
      id: '3de7ab4b-702a-4847-a2f2-9fa70743661d',
      name: 'Project Manager',
      role: 'tester',
      script: {
        steps: [
          {
            type: 'message',
            content:
              'I need to launch a new open-source project. Please create a comprehensive plan that includes: 1) Setting up a GitHub repository with proper documentation, 2) Researching best practices for open-source projects, 3) Creating a knowledge base for contributors, 4) Setting up todo tasks for the initial milestones',
      },
          {
            type: 'wait',
            waitTime: 10000,
      },
          {
            type: 'message',
            content:
              'Excellent plan! Please start executing the first phase - setting up the GitHub repository',
      },
          {
            type: 'wait',
            waitTime: 8000,
      },
          {
            type: 'message',
            content:
              'Now research best practices for open-source project governance and store the findings',
      },
          {
            type: 'wait',
            waitTime: 15000,
      },
          {
            type: 'message',
            content: 'Create the initial todo tasks based on the plan milestones',
      },
          {
            type: 'wait',
            waitTime: 5000,
      },
          {
            type: 'message',
            content: 'Please provide a status update on the overall plan execution',
          },
        ],
        personality: 'strategic, organized, goal-oriented',
        goals: [
          'create comprehensive project plan',
          'execute through multiple plugins',
          'track progress',
        ],
      },
    },
  ],

  setup: {
    roomType: 'dm',
    roomName: 'Strategic Planning',
    context: 'Complex project planning requiring coordination across multiple systems',
    environment: {
      plugins: ['planning', 'github', 'research', 'knowledge', 'todo'],
      planningDepth: 'comprehensive',
      executionTracking: true,
    },
  },

  execution: {
    maxDuration: 300000, // 5 minutes
    maxSteps: 30,
    stopConditions: [
      {
        type: 'keyword',
        value: 'plan execution complete',
        description: 'Stop when plan execution is complete',
      },
    ],
  },

  verification: {
    rules: [
      {
        id: '1dc82d2a-2a7b-406a-a3a8-86f8a5b261a8',
        type: 'llm',
        description: 'Comprehensive plan was created',
        config: {
          expectedValue: 'CREATE_PLAN',
        },
        weight: 3,
      },
      {
        id: '74b7ba1b-c14a-4704-8491-a542724599a3',
        type: 'llm',
        description: 'GitHub repository was created',
        config: {
          expectedValue: 'CREATE_GITHUB_REPO',
        },
        weight: 2,
      },
      {
        id: '63f824c2-2f4e-43b9-8376-a5dddf1b59a0',
        type: 'llm',
        description: 'Research was conducted',
        config: {
          expectedValue: 'start_research',
        },
        weight: 2,
      },
      {
        id: '3f773c12-a35e-4f57-9519-7d3feb7ef424',
        type: 'llm',
        description: 'Knowledge was stored',
        config: {
          expectedValue: 'PROCESS_KNOWLEDGE',
        },
        weight: 2,
      },
      {
        id: '7887e390-ac45-4659-a2d2-255687062ebb',
        type: 'llm',
        description: 'Todo tasks were created',
        config: {
          expectedValue: 'CREATE_TODO',
        },
        weight: 2,
      },
      {
        id: 'f1228662-d065-4dab-9e6c-9ae0e6b8ef6f',
        type: 'llm',
        description: 'Plan covers all requested aspects',
        config: {
          criteria:
            'The plan includes all four requested components: GitHub setup, research, knowledge base, and todo tasks with proper sequencing and dependencies',
        },
        weight: 3,
      },
      {
        id: '044fff57-9caf-49c8-8fd7-fd82b5bfaaa1',
        type: 'llm',
        description: 'Multiple plugins worked together to execute the plan',
        config: {
          criteria:
            'The agent successfully coordinated execution across planning, GitHub, research, knowledge, and todo plugins to achieve the project goals',
        },
        weight: 4,
      },
      {
        id: '591957ab-af7f-4cb4-a23a-205bd48152aa',
        type: 'llm',
        description: 'Plan execution was properly tracked',
        config: {
          criteria:
            'The agent tracked the execution progress and provided meaningful status updates throughout the process',
        },
        weight: 2,
      }
    ],
    expectedOutcomes: [
      {
        actorId: '3de7ab4b-702a-4847-a2f2-9fa70743661d',
        outcome: 'Created and executed a comprehensive multi-plugin plan',
        verification: {
          id: '003bbe44-7fb0-4a23-95de-96899ac10029',
          type: 'llm',
          description: 'Planning and execution were successful',
          config: {
            criteria:
              'Agent created a detailed plan and successfully executed it using multiple plugins in coordination',
          },
        },
      },
    ],
    groundTruth: {
      expectedBehavior:
        'Agent creates a strategic plan and orchestrates its execution across multiple plugins',
      successCriteria: [
        'Comprehensive plan created with all components',
        'GitHub repository successfully set up',
        'Research conducted and findings stored',
        'Knowledge base populated',
        'Todo tasks created from milestones',
        'Progress tracked and reported',
      ],
    },
  },

  benchmarks: {
    maxDuration: 300000,
    maxSteps: 30,
    maxTokens: 12000,
    targetAccuracy: 0.8,
    customMetrics: [{ name: 'plan_quality' }, { name: 'execution_efficiency' }, { name: 'multi_plugin_coordination' }],
  },
};

export default planningExecutionScenario;
