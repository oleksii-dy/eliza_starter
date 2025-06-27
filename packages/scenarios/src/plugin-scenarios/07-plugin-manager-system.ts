import type { Scenario } from '../types.js';
import { v4 as uuidv4 } from 'uuid';

export const pluginManagerSystemScenario: Scenario = {
  id: uuidv4() as any,
  name: 'Dynamic Plugin Management System',
  description: 'Test plugin manager system for loading, configuring, and managing plugins at runtime',
  category: 'integration',
  tags: ['plugin-manager', 'dynamic-loading', 'configuration'],

  actors: [
    {
      id: uuidv4() as any,
      name: 'Plugin Manager Agent',
      role: 'subject',
      bio: 'A system administrator specialized in plugin management',
      system:
        'You are a plugin management specialist. When asked about plugins, use SEARCH_PLUGINS to find available plugins. When asked to install plugins, use INSTALL_PLUGIN_FROM_REGISTRY. For checking plugin status, use CHECK_PLUGIN_HEALTH or GET_PLUGIN_STATE. Always provide clear information about plugin compatibility and dependencies.',
      plugins: ['@elizaos/plugin-plugin-manager'],
      script: { steps: [] },
    },
    {
      id: uuidv4() as any,
      name: 'System Admin',
      role: 'assistant',
      script: {
        steps: [
          {
            type: 'message',
            content: 'I need to find plugins for data analysis and visualization. Can you search for available plugins?',
          },
          {
            type: 'wait',
            waitTime: 6000,
          },
          {
            type: 'message',
            content: 'Please install a data visualization plugin from the registry. Make sure to check for any dependencies.',
          },
          {
            type: 'wait',
            waitTime: 8000,
          },
          {
            type: 'message',
            content: 'Can you check the health status of all installed plugins and show me which ones are active?',
          },
          {
            type: 'wait',
            waitTime: 5000,
          },
          {
            type: 'message',
            content: 'What are the best practices for managing plugin updates and ensuring compatibility?',
          },
        ],
      },
    },
  ],

  setup: {
    roomType: 'dm',
    roomName: 'System Admin Console',
    context: 'Plugin management and system administration',
  },

  execution: {
    maxDuration: 90000,
    maxSteps: 30,
    stopConditions: [
      {
        type: 'message_count',
        value: 8,
        description: 'Stop after 8 messages exchanged',
      },
    ],
  },

  verification: {
    rules: [
      {
        id: 'rule-1',
        type: 'llm',
        description: 'Agent must search for plugins',
        config: {
          criteria: 'Check if the agent used SEARCH_PLUGINS to find data analysis/visualization plugins',
          expectedValue: 'SEARCH_PLUGINS action was used',
        },
      },
      {
        id: 'rule-2',
        type: 'llm',
        description: 'Agent must install plugin',
        config: {
          criteria: 'Verify that the agent used INSTALL_PLUGIN_FROM_REGISTRY to install a plugin',
          expectedValue: 'Plugin installation was attempted',
        },
      },
      {
        id: 'rule-3',
        type: 'llm',
        description: 'Agent must check plugin health',
        config: {
          criteria: 'Confirm that the agent used CHECK_PLUGIN_HEALTH or similar to check plugin status',
          expectedValue: 'Plugin health was checked',
        },
      },
      {
        id: 'rule-4',
        type: 'llm',
        description: 'Agent must provide best practices',
        config: {
          criteria: 'The agent should provide guidance on plugin management best practices',
          expectedValue: 'Best practices were shared',
        },
      },
    ],
    expectedOutcomes: [
      {
        actorId: uuidv4() as any,
        outcome: 'Successfully managed plugins lifecycle',
        verification: {
          id: 'outcome-1',
          type: 'llm',
          description: 'Complete plugin management workflow',
          config: {
            criteria: 'The agent successfully searched for plugins, installed one, checked health status, and provided management guidance',
          },
        },
      },
    ],
  },
};

export default pluginManagerSystemScenario;
