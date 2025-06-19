import type { Scenario } from '../../src/scenario-runner/types.js';

export const githubTodoWorkflowScenario: Scenario = {
  id: '6617ea8c-5156-4cd7-96bf-9017d20727c0',
  name: 'GitHub Issue to Todo Task Management',
  description:
    'Test GitHub plugin fetching issues and creating corresponding todos with proper tracking and completion',
  category: 'integration',
  tags: ['github', 'todo', 'project-management', 'action-chaining'],

  actors: [
    {
      id: '4880ef5d-03c8-4952-98fd-f3409df64b1a',
      name: 'Project Manager Agent',
      role: 'subject',
      script: { steps: [] },
    },
    {
      id: 'de52b6f0-d31b-48a4-bce9-712bf17b2ac2',
      name: 'Software Developer',
      role: 'tester',
      script: {
        steps: [
          {
            type: 'message',
            content:
              'Please check the open issues in elizaOS/eliza repository and create todo tasks for the high priority ones',
      },
          {
            type: 'wait',
            waitTime: 8000,
      },
          {
            type: 'message',
            content:
              'Can you update the status of the authentication bug todo and mark it as in progress?',
      },
          {
            type: 'wait',
            waitTime: 5000,
      },
          {
            type: 'message',
            content:
              'Great! Now create a pull request for issue #42 and update the corresponding todo as completed',
      },
          {
            type: 'wait',
            waitTime: 10000,
      },
          {
            type: 'message',
            content: 'Please list all the todos related to GitHub issues and their current status',
          },
        ],
        personality: 'organized, efficient, detail-oriented developer',
        goals: [
          'manage GitHub issues effectively',
          'track progress with todos',
          'maintain project organization',
        ],
      },
    },
  ],

  setup: {
    roomType: 'dm',
    roomName: 'Project Management',
    context: 'Software development project management using GitHub issues and todo tracking',
    environment: {
      plugins: ['github', 'todo', 'message-handling'],
      githubRepo: 'elizaOS/eliza',
      todoTracking: true,
    },
  },

  execution: {
    maxDuration: 180000, // 3 minutes
    maxSteps: 20,
    stopConditions: [
      {
        type: 'keyword',
        value: 'workflow complete',
        description: 'Stop when workflow is marked complete',
      },
    ],
  },

  verification: {
    rules: [
      {
        id: '0e3312c9-8ada-4bf5-8042-a68303f7fe2b',
        type: 'action_taken',
        description: 'GitHub issues were fetched',
        config: {
          expectedValue: 'LIST_GITHUB_ISSUES',
        },
        weight: 3,
      },
      {
        id: '7887e390-ac45-4659-a2d2-255687062ebb',
        type: 'action_taken',
        description: 'Todos were created from issues',
        config: {
          expectedValue: 'CREATE_TODO',
        },
        weight: 3,
      },
      {
        id: '0d79e653-6010-4d1b-bfc1-3f2a2a334b42',
        type: 'action_taken',
        description: 'Todo status was updated',
        config: {
          expectedValue: 'UPDATE_TODO',
        },
        weight: 2,
      },
      {
        id: '3df50e38-2a10-4198-97aa-8436fe263b6f',
        type: 'action_taken',
        description: 'Pull request was created',
        config: {
          expectedValue: 'CREATE_GITHUB_PR',
        },
        weight: 2,
      },
      {
        id: '9ab09466-a083-4530-b72a-e8b3706343ea',
        type: 'action_taken',
        description: 'Todo was marked as completed',
        config: {
          expectedValue: 'COMPLETE_TODO',
        },
        weight: 2,
      },
      {
        id: '59724558-862b-47d7-96c8-5c51f4db4a8a',
        type: 'llm',
        description: 'Issues and todos are properly linked',
        config: {
          criteria:
            'The agent created todos that correspond to GitHub issues and maintained proper tracking between them',
        },
        weight: 3,
      },
      {
        id: '8526e7f7-4fb8-4d4d-8ab0-c60e32e14316',
        type: 'llm',
        description: 'GitHub and Todo plugins work together seamlessly',
        config: {
          criteria:
            'The agent successfully integrated GitHub issue management with todo tracking, updating both systems appropriately',
        },
        weight: 4,
      },
    ],
    expectedOutcomes: [
      {
        actorId: 'de52b6f0-d31b-48a4-bce9-712bf17b2ac2',
        outcome: 'Successfully managed GitHub issues through todo tasks',
        verification: {
          id: '8dc5f6d1-df2f-4d63-b618-33ba61a25458',
          type: 'llm',
          description: 'Complete workflow was executed',
          config: {
            criteria:
              'Agent fetched issues, created todos, updated statuses, and maintained synchronization',
          },
        },
      },
    ],
    groundTruth: {
      expectedBehavior:
        'Agent creates a seamless workflow between GitHub issues and todo management',
      successCriteria: [
        'GitHub issues fetched successfully',
        'Todos created from high-priority issues',
        'Todo statuses updated appropriately',
        'Pull request created and linked',
        'Final status report provided',
      ],
    },
  },

  benchmarks: {
    maxDuration: 180000,
    maxSteps: 20,
    maxTokens: 8000,
    targetAccuracy: 0.85,
    customMetrics: [{ name: 'issue_tracking_accuracy' }, { name: 'workflow_completion_rate' }, { name: 'synchronization_quality' }],
  },
};

export default githubTodoWorkflowScenario;
