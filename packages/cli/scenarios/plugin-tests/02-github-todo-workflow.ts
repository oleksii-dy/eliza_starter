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
        id: 'fetch-issues',
        type: 'llm' as const,
        description: 'Verify GitHub issues were fetched',
        config: {
          successCriteria: `
Verify that the agent successfully executed the LIST_GITHUB_ISSUES action to fetch issues from the GitHub repository.

Expected behavior:
- User asks to check open issues in elizaOS/eliza repository
- Agent acknowledges the request
- Agent executes LIST_GITHUB_ISSUES action
- Agent reports back with found issues
          `.trim(),
          priority: 'high',
          category: 'action_execution',
          context: {
            expectedAction: 'LIST_GITHUB_ISSUES',
          },
        },
        weight: 3,
      },
      {
        id: 'create-todos',
        type: 'llm' as const,
        description: 'Verify todos were created from issues',
        config: {
          successCriteria: `
Verify that the agent executed the CREATE_TODO action to create todo items based on GitHub issues.

Expected behavior:
- After fetching GitHub issues, agent creates todos for high priority ones
- Agent executes CREATE_TODO action one or more times
- Each todo corresponds to a GitHub issue
          `.trim(),
          priority: 'high',
          category: 'action_execution',
          context: {
            expectedAction: 'CREATE_TODO',
          },
        },
        weight: 3,
      },
      {
        id: 'update-todo-status',
        type: 'llm' as const,
        description: 'Verify todo status was updated',
        config: {
          successCriteria: `
Verify that the agent executed the UPDATE_TODO action to update the status of a todo item.

Expected behavior:
- User asks to update authentication bug todo status to "in progress"
- Agent acknowledges the request
- Agent executes UPDATE_TODO action
- Agent confirms the status update
          `.trim(),
          priority: 'medium',
          category: 'action_execution',
          context: {
            expectedAction: 'UPDATE_TODO',
          },
        },
        weight: 2,
      },
      {
        id: 'create-pr',
        type: 'llm' as const,
        description: 'Verify pull request was created',
        config: {
          successCriteria: `
Verify that the agent executed the CREATE_GITHUB_PR action to create a pull request.

Expected behavior:
- User asks to create a pull request for issue #42
- Agent acknowledges the request
- Agent executes CREATE_GITHUB_PR action
- Agent confirms PR creation
          `.trim(),
          priority: 'medium',
          category: 'action_execution',
          context: {
            expectedAction: 'CREATE_GITHUB_PR',
          },
        },
        weight: 2,
      },
      {
        id: 'complete-todo',
        type: 'llm' as const,
        description: 'Verify todo was marked as completed',
        config: {
          successCriteria: `
Verify that the agent executed the COMPLETE_TODO action to mark a todo item as completed.

Expected behavior:
- After creating PR, agent marks corresponding todo as completed
- Agent executes COMPLETE_TODO action
- Agent confirms todo completion
          `.trim(),
          priority: 'medium',
          category: 'action_execution',
          context: {
            expectedAction: 'COMPLETE_TODO',
          },
        },
        weight: 2,
      },
      {
        id: 'list-todos',
        type: 'llm' as const,
        description: 'Verify todos were listed with status',
        config: {
          successCriteria: `
Verify that the agent executed the LIST_TODOS action to show all todos and their status.

Expected behavior:
- User asks to list all todos related to GitHub issues
- Agent executes LIST_TODOS action
- Agent provides a summary of todos and their current status
          `.trim(),
          priority: 'medium',
          category: 'action_execution',
          context: {
            expectedAction: 'LIST_TODOS',
          },
        },
        weight: 2,
      },
      {
        id: 'integration-flow',
        type: 'llm' as const,
        description: 'GitHub and Todo plugins work together seamlessly',
        config: {
          successCriteria: `
Verify that the agent successfully integrated GitHub issue management with todo tracking throughout the workflow.

Expected integration points:
- Issues fetched from GitHub → Todos created
- Todo status updates track issue progress  
- PR creation linked to todo completion
- Final listing shows synchronized state
          `.trim(),
          priority: 'high',
          category: 'integration',
        },
        weight: 4,
      },
    ],
    expectedOutcomes: [
      {
        actorId: 'de52b6f0-d31b-48a4-bce9-712bf17b2ac2',
        outcome: 'Successfully managed GitHub issues through todo tasks',
        verification: {
          id: 'workflow-complete',
          type: 'llm' as const,
          description: 'Complete workflow was executed',
          config: {
            successCriteria:
              'Agent fetched issues, created todos, updated statuses, created PR, and maintained synchronization between GitHub and todo systems',
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
    customMetrics: [
      { name: 'issue_tracking_accuracy' },
      { name: 'workflow_completion_rate' },
      { name: 'synchronization_quality' },
    ],
  },
};

export default githubTodoWorkflowScenario;
