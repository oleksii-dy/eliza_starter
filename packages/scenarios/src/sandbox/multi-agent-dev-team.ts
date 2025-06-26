import type { Scenario } from '../types.js';
import { asUUID } from '@elizaos/core';
import { v4 } from 'uuid';

/**
 * Multi-Agent Development Team Scenario
 * Tests the sandbox development team functionality by creating a todo app
 * with specialized backend, frontend, and devops agents working together
 */
export const multiAgentDevTeamScenario: Scenario = {
  id: 'multi-agent-dev-team',
  name: 'Multi-Agent Development Team',
  description: 'Spawns a development team in E2B sandbox to build a todo list application collaboratively',
  category: 'sandbox',
  tags: ['multi-agent', 'development', 'collaboration', 'sandbox', 'e2b'],

  actors: [
    {
      id: asUUID(v4()),
      name: 'ProductManager',
      role: 'adversary', // This actor initiates the project
      script: {
        steps: [
          {
            type: 'message',
            content: 'Create a todo list app with React, Express, and SQLite. I want users to be able to add, edit, delete, and mark todos as complete. Make it responsive and modern looking.',
            description: 'Request todo app development',
          },
          {
            type: 'wait',
            waitTime: 5000,
            description: 'Wait for team creation',
          },
          {
            type: 'message', 
            content: 'Assign specific tasks to each team member. DevOps should set up the project structure, Backend should create the API, and Frontend should build the UI components.',
            description: 'Delegate tasks to team members',
          },
          {
            type: 'wait',
            waitTime: 10000,
            description: 'Wait for task delegation and development',
          },
          {
            type: 'message',
            content: 'Show me the current status of the project and what each team member has accomplished.',
            description: 'Request project status update',
          },
        ],
      },
    },
    {
      id: asUUID(v4()),
      name: 'MainAgent',
      role: 'subject', // This is the orchestrator agent being tested
      bio: 'A main agent that can spawn and coordinate development teams in sandboxes',
      system: 'You are a project orchestrator that can spawn specialized development teams in E2B sandboxes. When asked to create applications, use the SPAWN_DEV_TEAM action to create a team with backend, frontend, and devops specialists. Coordinate their work and provide updates on progress.',
      plugins: ['elizaos-services'], // This should include the sandbox plugin
    },
  ],

  setup: {
    roomType: 'group',
    roomName: 'Development Project Room',
    context: 'A project management environment where development teams are assembled and coordinated',
    environment: {
      E2B_API_KEY: 'test-key-for-scenario', // Mock key for testing
      HOST_URL: 'http://localhost:3000',
      SANDBOX_TEMPLATE: 'eliza-dev-team',
    },
  },

  execution: {
    maxDuration: 120000, // 2 minutes - enough time for sandbox creation and team coordination
    maxSteps: 50,
    timeout: 30000,
  },

  verification: {
    rules: [
      {
        id: 'spawn-dev-team-action',
        type: 'llm',
        description: 'Main agent should use SPAWN_DEV_TEAM action when requested to create an app',
        weight: 3,
        config: {
          successCriteria: 'Agent responds with sandbox creation and team assembly, mentioning backend, frontend, and devops specialists',
          requiredKeywords: ['sandbox', 'team', 'backend', 'frontend', 'devops'],
          forbiddenKeywords: ['error', 'failed', 'cannot'],
        },
      },
      {
        id: 'task-delegation-response',
        type: 'llm',
        description: 'Agent should properly delegate tasks to team members',
        weight: 2,
        config: {
          successCriteria: 'Agent assigns specific tasks to backend, frontend, and devops team members with clear responsibilities',
          requiredKeywords: ['assign', 'task', 'backend', 'frontend', 'devops'],
        },
      },
      {
        id: 'project-coordination',
        type: 'llm',
        description: 'Agent should provide meaningful project status updates',
        weight: 2,
        config: {
          successCriteria: 'Agent provides status updates showing progress from different team members and overall project state',
          requiredKeywords: ['status', 'progress', 'team'],
        },
      },
      {
        id: 'sandbox-integration',
        type: 'llm',
        description: 'Agent should mention sandbox environment and team room creation',
        weight: 1,
        config: {
          successCriteria: 'Agent mentions creating sandbox environment and team collaboration room',
          requiredKeywords: ['sandbox', 'room'],
        },
      },
      {
        id: 'technical-accuracy',
        type: 'llm',
        description: 'Agent should demonstrate understanding of the requested tech stack',
        weight: 1,
        config: {
          successCriteria: 'Agent correctly identifies React for frontend, Express for backend, and SQLite for database',
          requiredKeywords: ['React', 'Express', 'SQLite'],
        },
      },
    ],
  },

  benchmarks: {
    maxDuration: 60000, // Target: Complete in under 1 minute
    targetAccuracy: 0.8, // 80% of verification rules should pass
    customMetrics: [
      { name: 'team_creation_time', threshold: 15000 }, // Should create team within 15 seconds
      { name: 'task_delegation_time', threshold: 10000 }, // Should delegate tasks within 10 seconds
      { name: 'response_coherence', threshold: 0.9 }, // Responses should be coherent and relevant
    ],
  },
};

export default multiAgentDevTeamScenario;