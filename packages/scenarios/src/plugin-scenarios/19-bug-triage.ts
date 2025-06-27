import type { Scenario } from '../types.js';
import { v4 as uuidv4 } from 'uuid';

export const bugTriageScenario: Scenario = {
  id: uuidv4() as any,
  name: 'Automated Bug Triage System',
  description: 'Test automated bug triage using GitHub issues, research, and task management',
  category: 'integration',
  tags: ['bug-triage', 'github', 'research', 'todo', 'automation'],

  actors: [
    {
      id: uuidv4() as any,
      name: 'Bug Triage Agent',
      role: 'subject',
      bio: 'An automated bug triage specialist',
      system:
        'You are a bug triage specialist. When triaging bugs, use these tools: 1) LIST_ISSUES to get open GitHub issues, 2) ANALYZE_ISSUE to examine bug reports, 3) RESEARCH to find similar issues and solutions, 4) CREATE_TASK with priority levels for development team, 5) UPDATE_ISSUE to add labels and assignees. Always categorize by severity and provide reproduction steps.',
      plugins: ['@elizaos/plugin-github', '@elizaos/plugin-research', '@elizaos/plugin-todo', '@elizaos/plugin-planning'],
      script: { steps: [] },
    },
    {
      id: uuidv4() as any,
      name: 'Engineering Manager',
      role: 'assistant',
      script: {
        steps: [
          {
            type: 'message',
            content: 'Please review all open issues in our repository and categorize them by type (bug, feature, documentation) and severity (critical, high, medium, low).',
          },
          {
            type: 'wait',
            waitTime: 8000,
          },
          {
            type: 'message',
            content: 'For the critical and high severity bugs, research if there are similar issues in other projects and potential solutions.',
          },
          {
            type: 'wait',
            waitTime: 10000,
          },
          {
            type: 'message',
            content: 'Create prioritized tasks for the development team. Critical bugs should be marked as urgent with clear reproduction steps.',
          },
          {
            type: 'wait',
            waitTime: 8000,
          },
          {
            type: 'message',
            content: 'Update the GitHub issues with appropriate labels, priority tags, and suggested assignees based on code ownership.',
          },
          {
            type: 'wait',
            waitTime: 6000,
          },
          {
            type: 'message',
            content: 'Generate a bug triage report summarizing the current state of issues and recommended action plan.',
          },
        ],
      },
    },
  ],

  setup: {
    roomType: 'dm',
    roomName: 'Bug Triage Center',
    context: 'Software bug triage and prioritization',
  },

  execution: {
    maxDuration: 150000,
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
        description: 'Agent must review GitHub issues',
        config: {
          criteria: 'Check if the agent listed and analyzed GitHub issues',
          expectedValue: 'Issues were reviewed',
        },
      },
      {
        id: 'rule-2',
        type: 'llm',
        description: 'Agent must research similar issues',
        config: {
          criteria: 'Verify that the agent researched similar issues and solutions',
          expectedValue: 'Research was conducted',
        },
      },
      {
        id: 'rule-3',
        type: 'llm',
        description: 'Agent must create prioritized tasks',
        config: {
          criteria: 'Confirm that the agent created tasks with appropriate priorities',
          expectedValue: 'Prioritized tasks were created',
        },
      },
      {
        id: 'rule-4',
        type: 'llm',
        description: 'Agent must update GitHub issues',
        config: {
          criteria: 'The agent should have updated issues with labels and assignees',
          expectedValue: 'Issues were updated',
        },
      },
      {
        id: 'rule-5',
        type: 'llm',
        description: 'Agent must provide triage report',
        config: {
          criteria: 'The agent should provide a comprehensive bug triage report',
          expectedValue: 'Triage report was generated',
        },
      },
    ],
    expectedOutcomes: [
      {
        actorId: uuidv4() as any,
        outcome: 'Completed comprehensive bug triage',
        verification: {
          id: 'outcome-1',
          type: 'llm',
          description: 'Complete bug triage workflow',
          config: {
            criteria: 'The agent successfully reviewed issues, researched solutions, created prioritized tasks, updated GitHub issues, and generated a triage report',
          },
        },
      },
    ],
  },
};

export default bugTriageScenario;
