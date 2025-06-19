import type { Scenario } from '../../src/scenario-runner/types.js';

export const pluginManagerSystemScenario: Scenario = {
  id: '9533c33a-5aea-42b3-aa56-e198cf133417',
  name: 'Plugin Ecosystem Management and Registry Operations',
  description:
    'Test plugin manager handling plugin discovery, installation, updates, and dependency management',
  category: 'integration',
  tags: ['plugin-manager', 'system-admin', 'plugin-registry', 'dependencies'],

  actors: [
    {
      id: '30ca4994-b756-4701-baf9-790d0e0215b1',
      name: 'System Admin Agent',
      role: 'subject',
      script: { steps: [] },
    },
    {
      id: 'f28d942b-73bf-4ce6-8f13-5db9f79a27c7',
      name: 'System Administrator',
      role: 'tester',
      script: {
        steps: [
          {
            type: 'message',
            content:
              'Show me all available plugins in the registry that are compatible with my current system',
      },
          {
            type: 'wait',
            waitTime: 5000,
      },
          {
            type: 'message',
            content:
              'I need a plugin for handling Twitter integration. Search the registry and show me the options with their ratings and dependencies',
      },
          {
            type: 'wait',
            waitTime: 5000,
      },
          {
            type: 'message',
            content:
              'Install the twitter-v2 plugin along with all its dependencies. Make sure to check for any conflicts first',
      },
          {
            type: 'wait',
            waitTime: 8000,
      },
          {
            type: 'message',
            content:
              'Check for updates to all installed plugins and create a report of what needs updating',
      },
          {
            type: 'wait',
            waitTime: 5000,
      },
          {
            type: 'message',
            content:
              'Update the research plugin to the latest version and verify all dependent plugins still work',
          },
        ],
        personality: 'systematic, cautious, detail-oriented administrator',
        goals: [
          'maintain plugin ecosystem health',
          'ensure compatibility',
          'minimize system disruption',
        ],
      },
    },
  ],

  setup: {
    roomType: 'dm',
    roomName: 'System Administration',
    context: 'Managing the plugin ecosystem and ensuring system stability',
    environment: {
      plugins: ['plugin-manager', 'secrets-manager', 'todo'],
      registryAccess: true,
      adminPrivileges: true,
    },
  },

  execution: {
    maxDuration: 180000, // 3 minutes
    maxSteps: 20,
    stopConditions: [
      {
        type: 'keyword',
        value: 'management complete',
        description: 'Stop when plugin management tasks are complete',
      },
    ],
  },

  verification: {
    rules: [
      {
        id: '66eb9be2-96d7-4f61-9a80-61289ae2ac69',
        type: 'llm',
        description: 'Plugin registry was queried',
        config: {
          expectedValue: 'QUERY_PLUGIN_REGISTRY',
        },
        weight: 2,
      },
      {
        id: '050e9812-79ee-4263-b2e6-a2ed6426d539',
        type: 'llm',
        description: 'Plugin search was performed',
        config: {
          expectedValue: 'SEARCH_PLUGINS',
        },
        weight: 2,
      },
      {
        id: 'f364f90b-aeab-45a3-a5db-3edb99d9a152',
        type: 'llm',
        description: 'Dependencies were checked',
        config: {
          expectedValue: 'CHECK_DEPENDENCIES',
        },
        weight: 3,
      },
      {
        id: '0c281a5d-d60c-411d-a6c5-85625b8d6567',
        type: 'llm',
        description: 'Plugin was installed',
        config: {
          expectedValue: 'INSTALL_PLUGIN',
        },
        weight: 3,
      },
      {
        id: '91c1bdf3-8b52-462b-a2dc-7e34d1d922fa',
        type: 'llm',
        description: 'Plugin updates were checked',
        config: {
          expectedValue: 'CHECK_PLUGIN_UPDATES',
        },
        weight: 2,
      },
      {
        id: 'fd0f5365-382c-4a40-bbab-249d5dbcb69f',
        type: 'llm',
        description: 'Plugin was updated',
        config: {
          expectedValue: 'UPDATE_PLUGIN',
        },
        weight: 3,
      },
      {
        id: '1914289d-fd89-4410-87db-fa6ce5a6cc23',
        type: 'llm',
        description: 'Plugin compatibility was properly verified',
        config: {
          criteria:
            'The agent checked system compatibility before installation and verified dependencies would not conflict',
        },
        weight: 3,
      },
      {
        id: 'f7724b39-644e-430d-8d31-7d6d3fb36ad9',
        type: 'llm',
        description: 'Plugin ecosystem was properly managed',
        config: {
          criteria:
            'The agent successfully managed the plugin ecosystem including discovery, installation, updates, and dependency management',
        },
        weight: 4,
      }
    ],
    expectedOutcomes: [
      {
        actorId: 'f28d942b-73bf-4ce6-8f13-5db9f79a27c7',
        outcome: 'Successfully managed plugin ecosystem',
        verification: {
          id: '04f6f22e-e552-477c-8686-6ca8be98604d',
          type: 'llm',
          description: 'Plugin management tasks completed successfully',
          config: {
            criteria:
              'Agent queried registry, installed plugins with dependencies, checked updates, and maintained system stability',
          },
        },
      },
    ],
    groundTruth: {
      expectedBehavior: 'Agent manages plugin lifecycle from discovery through updates',
      successCriteria: [
        'Registry successfully queried',
        'Plugins searched by criteria',
        'Dependencies properly resolved',
        'Plugins installed without conflicts',
        'Updates identified and applied',
        'System stability maintained',
      ],
    },
  },

  benchmarks: {
    maxDuration: 180000,
    maxSteps: 20,
    maxTokens: 8000,
    targetAccuracy: 0.9,
    customMetrics: [{ name: 'dependency_resolution' }, { name: 'compatibility_checks' }, { name: 'update_safety' }],
  },
};

export default pluginManagerSystemScenario;
