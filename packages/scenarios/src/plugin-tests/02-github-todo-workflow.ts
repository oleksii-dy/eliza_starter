import type { Scenario } from "../types.js"
import { v4 as uuidv4 } from 'uuid';

export const githubTodoWorkflowScenario: Scenario = {
  id: uuidv4() as any,
  name: 'GitHub Issue to Todo Task Management',
  description:
    'Test GitHub plugin fetching issues and creating corresponding todos with proper tracking and completion',
  category: 'integration',
  tags: ['github', 'todo', 'project-management', 'action-chaining'],

  actors: [
    {
      id: uuidv4() as any,
      name: 'Project Manager Agent',
      role: 'subject',
      bio: 'An efficient project management assistant',
      system:
        'You are a project manager who helps developers track GitHub issues and manage tasks efficiently. When asked about issues or tasks, provide helpful responses and use available tools when appropriate.',
      plugins: ['@elizaos/plugin-github', '@elizaos/plugin-todo'],
      script: { steps: [] },
    },
    {
      id: uuidv4() as any,
      name: 'Software Developer',
      role: 'assistant',
      script: {
        steps: [
          {
            type: 'message',
            content: 'Hi! Can you help me track some tasks for our project?',
          },
          {
            type: 'wait',
            waitTime: 3000,
          },
          {
            type: 'message',
            content: 'Can you create a todo for fixing the authentication bug we discussed?',
          },
          {
            type: 'wait',
            waitTime: 3000,
          },
          {
            type: 'message',
            content: 'Please list all current todos so I can see what we have',
          },
        ],
      },
    },
  ],

  setup: {
    roomType: 'dm',
    roomName: 'Project Management',
    context: 'Software development project tracking and task management',
  },

  execution: {
    maxDuration: 60000, // 1 minute
    maxSteps: 15,
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
        id: uuidv4() as any,
        type: 'llm' as const,
        description: 'Agent responded to project help request',
        config: {
          criteria:
            'The agent should have responded helpfully to the request for project task tracking',
          expectedValue: 'Helpful response about project management',
        },
      },
      {
        id: uuidv4() as any,
        type: 'llm' as const,
        description: 'Todo creation was handled',
        config: {
          criteria:
            'The agent should have acknowledged the todo creation request and either created a todo or explained the process',
          expectedValue: 'Todo creation response',
        },
      },
      {
        id: uuidv4() as any,
        type: 'llm' as const,
        description: 'Todo listing was provided',
        config: {
          criteria:
            'The agent should have provided information about current todos or explained how to view them',
          expectedValue: 'Todo list information',
        },
      },
    ],
    expectedOutcomes: [
      {
        actorId: uuidv4() as any,
        outcome: 'Assisted with project task management',
        verification: {
          id: uuidv4() as any,
          type: 'llm' as const,
          description: 'Project management assistance was provided',
          config: {
            criteria:
              'The agent provided helpful responses about task tracking and todo management',
          },
        },
      },
    ],
  },
};

export default githubTodoWorkflowScenario;
