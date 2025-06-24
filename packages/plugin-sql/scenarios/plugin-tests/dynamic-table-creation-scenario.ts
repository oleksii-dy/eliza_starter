import type { Scenario } from '../../src/scenario-runner/types.js';

export const dynamicTableCreationScenario: Scenario = {
  id: 'dyn-table-create-001',
  name: 'Dynamic Table Creation Test',
  description: 'Tests dynamic table creation with plugin-sql and hello world plugin',
  category: 'integration',
  tags: ['plugin-sql', 'dynamic-tables', 'plugin-order'],

  setup: {
    environment: {
      PGLITE_PATH: './.eliza/.elizadb-test-dynamic',
    }
  },

  actors: [
    {
      id: 'test-agent',
      name: 'Dynamic Table Test Agent',
      role: 'subject',
      bio: 'I am a test agent for verifying dynamic table creation',
      system: 'You are a helpful test agent that tests database operations',
      plugins: ['@elizaos/plugin-sql', '@elizaos/plugin-test-hello-world'],
      script: {
        steps: [
          {
            type: 'message',
            content: 'Create a hello world message saying "Dynamic tables work!"',
            description: 'Request to create hello world entry'
          },
          {
            type: 'wait',
            waitTime: 2000,
            description: 'Wait for table creation and data insertion'
          },
          {
            type: 'message',
            content: 'List all hello world messages',
            description: 'Request to retrieve all entries'
          },
          {
            type: 'wait',
            waitTime: 1000,
            description: 'Wait for retrieval'
          },
          {
            type: 'message',
            content: 'Create a greeting in Spanish saying "Hola Mundo"',
            description: 'Test second table creation'
          },
          {
            type: 'wait',
            waitTime: 1000,
            description: 'Wait for second table operation'
          },
          {
            type: 'assert',
            assertion: {
              type: 'custom',
              value: 'Database operations successful',
              description: 'Verify tables were created and data persisted'
            }
          }
        ]
      }
    }
  ],

  execution: {
    maxDuration: 30000,
    maxSteps: 20
  },

  verification: {
    rules: [
      {
        id: 'plugin-order-check',
        type: 'llm',
        description: 'Verify SQL plugin loaded before hello world plugin',
        config: {
          successCriteria: 'The SQL plugin must initialize first (priority 0) before the hello world plugin (priority 100). Check the initialization logs for correct order.',
          priority: 'critical',
          category: 'functionality'
        },
        weight: 2.0
      },
      {
        id: 'table-creation-check',
        type: 'llm',
        description: 'Verify dynamic table creation worked',
        config: {
          successCriteria: 'Tables hello_world and greetings should be created dynamically when first accessed. No migration errors should occur. Tables should be created on-demand.',
          priority: 'high',
          category: 'functionality'
        },
        weight: 1.5
      },
      {
        id: 'data-persistence-check',
        type: 'llm',
        description: 'Verify data was stored and retrieved correctly',
        config: {
          successCriteria: 'Hello world messages and greetings should be stored in the database and retrievable. The agent should confirm successful creation and retrieval of entries.',
          priority: 'high',
          category: 'persistence'
        },
        weight: 1.5
      },
      {
        id: 'error-handling-check',
        type: 'llm',
        description: 'Verify no errors during dynamic operations',
        config: {
          successCriteria: 'No database errors, migration failures, or table creation errors should occur. All operations should complete successfully.',
          priority: 'medium',
          category: 'stability'
        }
      }
    ]
  }
};

// Plugin order verification scenario
export const pluginOrderScenario: Scenario = {
  id: 'plugin-order-001',
  name: 'Plugin Loading Order Test',
  description: 'Tests that SQL plugin always loads first due to priority 0',
  category: 'unit',
  tags: ['plugin-sql', 'plugin-order', 'priority'],

  actors: [
    {
      id: 'order-test-agent',
      name: 'Plugin Order Test Agent',
      role: 'subject',
      bio: 'I test plugin loading order',
      system: 'You verify plugin initialization order',
      plugins: [
        '@elizaos/plugin-test-hello-world',  // priority 100
        '@elizaos/plugin-sql',                // priority 0
        '@elizaos/plugin-test-sql-tracker'    // priority 1
      ],
      script: {
        steps: [
          {
            type: 'message',
            content: 'What order did the plugins load in?',
            description: 'Ask about plugin order'
          },
          {
            type: 'wait',
            waitTime: 1000,
            description: 'Wait for response'
          }
        ]
      }
    }
  ],

  verification: {
    rules: [
      {
        id: 'correct-order',
        type: 'llm',
        description: 'Verify plugins loaded in priority order',
        config: {
          successCriteria: 'Plugins must load in order of priority: @elizaos/plugin-sql (0) first, then @elizaos/plugin-test-sql-tracker (1), then @elizaos/plugin-test-hello-world (100). The initialization logs should show this order.',
          priority: 'critical',
          category: 'functionality'
        },
        weight: 2.0
      }
    ]
  }
};

// Concurrent operations scenario
export const concurrentOperationsScenario: Scenario = {
  id: 'concurrent-ops-001',
  name: 'Concurrent Database Operations',
  description: 'Tests concurrent table creation and data operations',
  category: 'stress',
  tags: ['plugin-sql', 'concurrency', 'performance'],

  actors: [
    {
      id: 'concurrent-agent-1',
      name: 'Concurrent Test Agent 1',
      role: 'subject',
      plugins: ['@elizaos/plugin-sql', '@elizaos/plugin-test-hello-world'],
      script: {
        steps: [
          {
            type: 'message',
            content: 'Create 5 hello world messages quickly',
            description: 'Trigger concurrent writes'
          }
        ]
      }
    },
    {
      id: 'concurrent-agent-2',
      name: 'Concurrent Test Agent 2',
      role: 'assistant',
      plugins: ['@elizaos/plugin-sql', '@elizaos/plugin-test-hello-world'],
      script: {
        steps: [
          {
            type: 'message',
            content: 'Also create 5 greetings in different languages',
            description: 'Concurrent writes to different table'
          }
        ]
      }
    }
  ],

  execution: {
    maxDuration: 15000,
    parallel: true
  },

  verification: {
    rules: [
      {
        id: 'concurrent-success',
        type: 'llm',
        description: 'Verify concurrent operations succeeded',
        config: {
          successCriteria: 'Both agents should successfully create their entries without conflicts or errors. All 10 total entries should be created.',
          priority: 'high',
          category: 'performance'
        }
      },
      {
        id: 'data-integrity',
        type: 'llm',
        description: 'Verify data integrity under concurrent load',
        config: {
          successCriteria: 'All created entries should have unique IDs and correct data. No data corruption or duplicate IDs should occur.',
          priority: 'critical',
          category: 'persistence'
        }
      }
    ]
  }
};
