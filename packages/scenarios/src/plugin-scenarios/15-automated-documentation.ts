import type { Scenario } from '../types.js';
import { v4 as uuidv4 } from 'uuid';

export const automatedDocumentationScenario: Scenario = {
  id: uuidv4() as any,
  name: 'Automated Documentation Generation',
  description: 'Test automated documentation generation including API docs, code examples, and knowledge base integration',
  category: 'integration',
  tags: ['documentation', 'github', 'knowledge', 'automation'],

  actors: [
    {
      id: uuidv4() as any,
      name: 'Documentation Agent',
      role: 'subject',
      bio: 'An automated documentation specialist',
      system:
        'You are a documentation specialist. When asked to create documentation, use these tools: 1) ANALYZE_REPOSITORY to scan codebases for APIs and functions, 2) CREATE_DOCUMENTATION to generate comprehensive docs, 3) CREATE_KNOWLEDGE to store documentation in the knowledge base, 4) CREATE_TASK for manual documentation tasks that need human input. Always generate clear, comprehensive documentation with examples.',
      plugins: ['@elizaos/plugin-github', '@elizaos/plugin-knowledge', '@elizaos/plugin-planning', '@elizaos/plugin-todo'],
      script: { steps: [] },
    },
    {
      id: uuidv4() as any,
      name: 'Tech Lead',
      role: 'assistant',
      script: {
        steps: [
          {
            type: 'message',
            content: 'Please analyze our main repository and identify all public APIs that need documentation. Focus on undocumented functions and classes.',
          },
          {
            type: 'wait',
            waitTime: 8000,
          },
          {
            type: 'message',
            content: 'Create comprehensive documentation for the identified APIs. Include function signatures, parameters, return values, and usage examples.',
          },
          {
            type: 'wait',
            waitTime: 10000,
          },
          {
            type: 'message',
            content: 'Store the generated documentation in the knowledge base. Organize it by module and include a table of contents.',
          },
          {
            type: 'wait',
            waitTime: 6000,
          },
          {
            type: 'message',
            content: 'Create tasks for any documentation that requires manual review or additional context from developers.',
          },
          {
            type: 'wait',
            waitTime: 5000,
          },
          {
            type: 'message',
            content: 'Generate a documentation coverage report. What percentage of our APIs are now documented?',
          },
        ],
      },
    },
  ],

  setup: {
    roomType: 'dm',
    roomName: 'Documentation Workshop',
    context: 'Technical documentation generation',
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
        description: 'Agent must analyze repository',
        config: {
          criteria: 'Check if the agent analyzed the repository to identify undocumented APIs',
          expectedValue: 'Repository analysis was performed',
        },
      },
      {
        id: 'rule-2',
        type: 'llm',
        description: 'Agent must create documentation',
        config: {
          criteria: 'Verify that the agent created comprehensive API documentation with examples',
          expectedValue: 'Documentation was generated',
        },
      },
      {
        id: 'rule-3',
        type: 'llm',
        description: 'Agent must store in knowledge base',
        config: {
          criteria: 'Confirm that the agent stored documentation in the knowledge base',
          expectedValue: 'Documentation was stored',
        },
      },
      {
        id: 'rule-4',
        type: 'llm',
        description: 'Agent must create review tasks',
        config: {
          criteria: 'The agent should have created tasks for manual documentation review',
          expectedValue: 'Review tasks were created',
        },
      },
      {
        id: 'rule-5',
        type: 'llm',
        description: 'Agent must provide coverage report',
        config: {
          criteria: 'The agent should provide a documentation coverage report',
          expectedValue: 'Coverage report was generated',
        },
      },
    ],
    expectedOutcomes: [
      {
        actorId: uuidv4() as any,
        outcome: 'Generated comprehensive documentation',
        verification: {
          id: 'outcome-1',
          type: 'llm',
          description: 'Complete documentation workflow',
          config: {
            criteria: 'The agent successfully analyzed the codebase, generated documentation, stored it in knowledge base, created review tasks, and provided coverage metrics',
          },
        },
      },
    ],
  },
};

export default automatedDocumentationScenario;
