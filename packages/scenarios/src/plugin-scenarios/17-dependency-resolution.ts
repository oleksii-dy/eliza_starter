import type { Scenario } from '../types.js';
import { v4 as uuidv4 } from 'uuid';

export const dependencyResolutionScenario: Scenario = {
  id: uuidv4() as any,
  name: 'Plugin Dependency Resolution',
  description: 'Test complex plugin dependency resolution and installation workflow',
  category: 'integration',
  tags: ['dependencies', 'plugin-manager', 'installation', 'compatibility'],

  actors: [
    {
      id: uuidv4() as any,
      name: 'Dependency Manager',
      role: 'subject',
      bio: 'A plugin dependency resolution specialist',
      system:
        'You are a dependency management expert. When managing plugin dependencies, use these tools: 1) CHECK_DEPENDENCIES to analyze plugin requirements, 2) SEARCH_PLUGINS to find compatible plugins, 3) INSTALL_PLUGIN_FROM_REGISTRY to install plugins in correct order, 4) CHECK_PLUGIN_HEALTH to verify installations. Always resolve dependencies in the correct order and handle version conflicts.',
      plugins: ['@elizaos/plugin-plugin-manager'],
      script: { steps: [] },
    },
    {
      id: uuidv4() as any,
      name: 'Developer',
      role: 'assistant',
      script: {
        steps: [
          {
            type: 'message',
            content: 'I need to install an analytics plugin that requires database, authentication, and messaging plugins. Can you check what dependencies are needed?',
          },
          {
            type: 'wait',
            waitTime: 6000,
          },
          {
            type: 'message',
            content: 'Search for compatible versions of all required plugins. Make sure they work together without conflicts.',
          },
          {
            type: 'wait',
            waitTime: 8000,
          },
          {
            type: 'message',
            content: 'Please install all the dependencies in the correct order. Start with the base plugins first.',
          },
          {
            type: 'wait',
            waitTime: 10000,
          },
          {
            type: 'message',
            content: 'Now install the analytics plugin and verify that all integrations are working correctly.',
          },
          {
            type: 'wait',
            waitTime: 8000,
          },
          {
            type: 'message',
            content: 'Run a health check on all installed plugins. Are there any issues or warnings?',
          },
        ],
      },
    },
  ],

  setup: {
    roomType: 'dm',
    roomName: 'Dependency Resolution Lab',
    context: 'Plugin dependency management',
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
        description: 'Agent must check dependencies',
        config: {
          criteria: 'Check if the agent used CHECK_DEPENDENCIES to analyze plugin requirements',
          expectedValue: 'Dependencies were analyzed',
        },
      },
      {
        id: 'rule-2',
        type: 'llm',
        description: 'Agent must search for compatible plugins',
        config: {
          criteria: 'Verify that the agent searched for compatible plugin versions',
          expectedValue: 'Compatible plugins were found',
        },
      },
      {
        id: 'rule-3',
        type: 'llm',
        description: 'Agent must install dependencies in order',
        config: {
          criteria: 'Confirm that the agent installed base plugins before dependent plugins',
          expectedValue: 'Dependencies installed in correct order',
        },
      },
      {
        id: 'rule-4',
        type: 'llm',
        description: 'Agent must install analytics plugin',
        config: {
          criteria: 'The agent should have installed the analytics plugin after dependencies',
          expectedValue: 'Analytics plugin was installed',
        },
      },
      {
        id: 'rule-5',
        type: 'llm',
        description: 'Agent must verify plugin health',
        config: {
          criteria: 'The agent should run health checks on all installed plugins',
          expectedValue: 'Health checks were performed',
        },
      },
    ],
    expectedOutcomes: [
      {
        actorId: uuidv4() as any,
        outcome: 'Successfully resolved and installed all dependencies',
        verification: {
          id: 'outcome-1',
          type: 'llm',
          description: 'Complete dependency resolution workflow',
          config: {
            criteria: 'The agent successfully analyzed dependencies, found compatible versions, installed plugins in correct order, and verified their health',
          },
        },
      },
    ],
  },
};

export default dependencyResolutionScenario;
