import type { Scenario } from '../../src/scenario-runner/types.js';
import { asUUID } from '@elizaos/core';
import { v4 as uuidv4 } from 'uuid';

export const githubTodoWorkflowScenario: Scenario = {
  id: '02-github-todo-workflow',
  name: 'GitHub Todo Workflow Integration',
  description: 'Test GitHub plugin integration with Todo management for project tracking',
  category: 'integration',
  tags: ['github', 'todo', 'project-management', 'workflow'],

  actors: [
    {
      id: asUUID(uuidv4()),
      name: 'Project Manager Agent',
      role: 'subject',
      // This agent will handle GitHub and Todo tasks
    },
    {
      id: asUUID(uuidv4()),
      name: 'Developer User',
      role: 'assistant',
      script: {
        steps: [
          {
            type: 'message',
            content: 'Can you check our GitHub issues and create some todo tasks for the high priority ones?',
          },
          {
            type: 'wait',
            waitTime: 5000,
          },
          {
            type: 'message',
            content: 'Great! Can you show me the current todo list?',
          },
          {
            type: 'wait',
            waitTime: 3000,
          },
          {
            type: 'message',
            content: 'Perfect! Can you mark one of the todos as completed?',
          },
        ],
        personality: 'developer, task-oriented, detail-focused',
        goals: ['manage project tasks', 'track progress', 'integrate tools'],
      },
    },
  ],

  setup: {
    roomType: 'dm',
    roomName: 'Project Management Session',
    context: 'You are helping manage a software project by integrating GitHub issues with todo task management.',
    environment: {
      githubRepo: 'test-repo',
      projectType: 'software',
    },
  },

  execution: {
    maxDuration: 120000, // 2 minutes
    maxSteps: 15,
    stopConditions: [
      {
        type: 'keyword',
        value: 'workflow complete',
        description: 'Stop when workflow is marked as complete',
      },
    ],
  },

  verification: {
    rules: [
      {
        id: 'github-integration',
        type: 'llm',
        description: 'Agent successfully used GitHub integration',
        config: {
          criteria: 'The agent demonstrated ability to interact with GitHub (listing issues, creating PRs, etc.)',
        },
        weight: 3,
      },
      {
        id: 'todo-management',
        type: 'llm',
        description: 'Agent successfully managed todo tasks',
        config: {
          criteria: 'The agent created, listed, and updated todo tasks effectively',
        },
        weight: 3,
      },
      {
        id: 'workflow-integration',
        type: 'llm',
        description: 'Agent integrated GitHub and Todo workflows',
        config: {
          criteria: 'The agent showed integration between GitHub issues and todo task management',
        },
        weight: 2,
      },
      {
        id: 'user-interaction',
        type: 'llm',
        description: 'Agent provided helpful user interaction',
        config: {
          criteria: 'The agent responded helpfully and provided clear updates on task progress',
        },
        weight: 1,
      },
    ],
    groundTruth: {
      expectedBehavior: 'Agent should integrate GitHub and Todo management effectively',
      successCriteria: [
        'Interact with GitHub API',
        'Create and manage todo tasks',
        'Show integration between systems',
        'Provide helpful user feedback',
      ],
    },
  },

  benchmarks: {
    maxDuration: 120000,
    maxSteps: 15,
    maxTokens: 5000,
    targetAccuracy: 0.7,
    customMetrics: [
      { name: 'github_api_calls' },
      { name: 'todo_operations' },
      { name: 'integration_score' },
    ],
  },
};

export default githubTodoWorkflowScenario;