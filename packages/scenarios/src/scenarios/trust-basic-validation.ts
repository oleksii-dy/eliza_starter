import { type Scenario } from '../types.js';
import { asUUID } from '@elizaos/core';
import { v4 } from 'uuid';

/**
 * Basic trust functionality validation without database dependencies
 * Tests core trust system components directly
 */
export const trustBasicValidationScenario: Scenario = {
  id: 'trust-basic-validation',
  name: 'Trust Basic Validation',
  description: 'Test basic trust system functionality without complex dependencies',
  tags: ['trust', 'basic', 'validation'],

  setup: {
    roomType: 'dm',
    roomName: 'Trust Basic Validation',
    context: 'Testing basic trust system functionality without complex dependencies',
  },

  actors: [
    {
      id: asUUID(v4()),
      name: 'Test User',
      role: 'assistant',
      bio: 'A test user with medium trust level',
      script: {
        steps: [
          {
            type: 'message',
            content: 'Hello, can you help me?',
          },
          {
            type: 'wait',
            waitTime: 2000,
          },
          {
            type: 'message',
            content: 'I need assistance with a task',
          },
        ],
      },
    },
    {
      id: asUUID(v4()),
      name: 'Agent',
      role: 'subject',
    },
  ],

  execution: {
    maxDuration: 30000, // 30 seconds
    maxSteps: 10,
  },

  verification: {
    rules: [
      {
        id: 'trust-plugin-loaded',
        type: 'llm',
        description: 'Trust plugin should be loaded successfully',
        config: {
          successCriteria: 'The agent should respond without trust-related errors',
        },
      },
      {
        id: 'basic-interaction-working',
        type: 'llm',
        description: 'Basic interactions should work without database errors',
        config: {
          successCriteria: 'The agent should respond helpfully to basic requests',
        },
      },
    ],
  },

  benchmarks: {
    maxDuration: 30000,
    targetAccuracy: 0.8,
  },
};

export default trustBasicValidationScenario;
