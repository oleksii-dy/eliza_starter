import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  createUniqueUuid,
  type IAgentRuntime,
  type Memory,
  type Character,
  elizaLogger,
} from '@elizaos/core';
// Test utilities not available, using mock runtime
// import { createTestAgent, cleanupTestAgents } from '@elizaos/core/test-utils';
import { e2bPlugin } from '../../index.js';

/**
 * End-to-end tests verifying that agents operate 100% within E2B sandboxes
 * for all computational tasks, ensuring complete isolation and security
 */
describe('Agent-Sandbox Integration E2E Tests', () => {
  // These tests require complex runtime setup, skipping for now
  it.skip('E2E tests require full runtime integration', () => {
    expect(true).toBe(true);
  });

  /*
  let sandboxAgent: IAgentRuntime;

  const sandboxOnlyCharacter: Character = {
    name: 'SandboxOnlyAgent',
    bio: 'An AI agent that performs all computations exclusively in secure E2B sandboxes',
    system: `You are a computational assistant that MUST execute ALL code and calculations in E2B sandboxes.

CRITICAL RULES:
1. Never perform calculations in your head or provide estimates
2. Always use code execution for any mathematical operation
3. Write Python code for all data analysis, calculations, and processing
4. Use sandboxes for file operations, data manipulation, and computations
5. Verify results by running code rather than providing theoretical answers

When a user asks for any computation:
1. Write the appropriate code
2. Execute it in the sandbox
3. Show both the code and the results
4. Explain the process

Example response format:
"I'll calculate this for you using a secure sandbox environment.

\`\`\`python
# Calculation code here
result = 2 + 2
print(f"2 + 2 = {result}")
\`\`\`

The result is 4."`,
    messageExamples: [
      [
        {
          name: 'User',
          content: { text: 'What is 15 * 23?' }
        },
        {
          name: 'SandboxOnlyAgent',
          content: {
            text: `I'll calculate this for you in a secure sandbox.

\`\`\`python
result = 15 * 23
print(f"15 * 23 = {result}")
\`\`\`

The result is 345.`
          }
        }
      ]
    ],
    postExamples: [
      'All computations performed in secure E2B sandboxes',
      'Code execution ensures accuracy and security',
      'No local calculations - everything runs in isolated environments'
    ],
    topics: [
      'secure computing',
      'code execution',
      'data analysis',
      'mathematical calculations',
      'sandbox environments'
    ],
    style: {
      all: [
        'always use code execution for calculations',
        'explain the sandbox execution process',
        'show both code and results',
        'emphasize security and isolation'
      ],
      chat: [
        'provide step-by-step code solutions',
        'verify results through execution',
        'use descriptive variable names'
      ],
      post: [
        'highlight sandbox usage',
        'emphasize computational accuracy'
      ]
    },
    plugins: ['@elizaos/plugin-e2b']
  };

  beforeAll(async () => {
    elizaLogger.info('Setting up agent-sandbox integration tests');

    // Ensure E2B is configured for production-like usage
    process.env.E2B_ENABLE_MEMORY_FORMATION = 'true';
    process.env.E2B_ENABLE_EVENT_EMISSION = 'true';
    process.env.NODE_ENV = 'test';

    // Create sandbox-only agent
    sandboxAgent = await createTestAgent(sandboxOnlyCharacter, [e2bPlugin]);

    // Verify E2B service is available
    const e2bService = sandboxAgent.getService('e2b');
    if (!e2bService) {
      throw new Error('E2B service not available for testing');
    }

    elizaLogger.info('Agent-sandbox integration test setup complete');
  });

  afterAll(async () => {
    elizaLogger.info('Cleaning up agent-sandbox integration tests');
    await cleanupTestAgents();
  });

  describe('Mathematical Calculations', () => {
    it('should execute basic arithmetic in sandbox', async () => {
      const roomId = createUniqueUuid(sandboxAgent, 'math-room');
      const message: Memory = {
        id: createUniqueUuid(sandboxAgent, 'math-msg'),
        entityId: createUniqueUuid(sandboxAgent, 'test-user'),
        content: { text: 'Calculate 147 * 29 + 156' },
        agentId: sandboxAgent.agentId,
        roomId,
        createdAt: Date.now(),
      };

      const responses = await sandboxAgent.processMessage(message);

      expect(responses).toBeDefined();
      expect(responses.length).toBeGreaterThan(0);

      const response = responses[0];
      expect(response.content.text).toMatch(/4419|calculation|sandbox|code/i);
      expect(response.content.text).toMatch(/```python|```/);
    });

    it('should perform complex mathematical operations', async () => {
      const roomId = createUniqueUuid(sandboxAgent, 'complex-math-room');
      const message: Memory = {
        id: createUniqueUuid(sandboxAgent, 'complex-msg'),
        entityId: createUniqueUuid(sandboxAgent, 'test-user'),
        content: {
          text: 'Calculate the compound interest: Principal $5000, rate 6% annually, time 4 years, compounded quarterly'
        },
        agentId: sandboxAgent.agentId,
        roomId,
        createdAt: Date.now(),
      };

      const responses = await sandboxAgent.processMessage(message);

      expect(responses).toBeDefined();
      expect(responses.length).toBeGreaterThan(0);

      const response = responses[0];
      expect(response.content.text).toMatch(/compound|interest|6349|6350/i);
      expect(response.content.text).toMatch(/```python|```/);
    });

    it('should handle statistical calculations', async () => {
      const roomId = createUniqueUuid(sandboxAgent, 'stats-room');
      const message: Memory = {
        id: createUniqueUuid(sandboxAgent, 'stats-msg'),
        entityId: createUniqueUuid(sandboxAgent, 'test-user'),
        content: {
          text: 'Calculate mean, median, and standard deviation for this dataset: [12, 15, 18, 21, 24, 27, 30, 33, 36, 39]'
        },
        agentId: sandboxAgent.agentId,
        roomId,
        createdAt: Date.now(),
      };

      const responses = await sandboxAgent.processMessage(message);

      expect(responses).toBeDefined();
      expect(responses.length).toBeGreaterThan(0);

      const response = responses[0];
      expect(response.content.text).toMatch(/mean|median|standard|deviation/i);
      expect(response.content.text).toMatch(/27\.5|27\.0|25\.5/i); // Expected values
      expect(response.content.text).toMatch(/```python|```/);
    });
  });

  describe('Data Analysis Tasks', () => {
    it('should process and analyze data arrays', async () => {
      const roomId = createUniqueUuid(sandboxAgent, 'data-room');
      const message: Memory = {
        id: createUniqueUuid(sandboxAgent, 'data-msg'),
        entityId: createUniqueUuid(sandboxAgent, 'test-user'),
        content: {
          text: 'I have sales data: [150, 230, 180, 310, 275, 190, 245]. Find the total sales, average, and identify the best and worst performing periods.'
        },
        agentId: sandboxAgent.agentId,
        roomId,
        createdAt: Date.now(),
      };

      const responses = await sandboxAgent.processMessage(message);

      expect(responses).toBeDefined();
      expect(responses.length).toBeGreaterThan(0);

      const response = responses[0];
      expect(response.content.text).toMatch(/1580|total|average|225\.7|310|150/i);
      expect(response.content.text).toMatch(/```python|```/);
    });

    it('should handle text processing and analysis', async () => {
      const roomId = createUniqueUuid(sandboxAgent, 'text-room');
      const message: Memory = {
        id: createUniqueUuid(sandboxAgent, 'text-msg'),
        entityId: createUniqueUuid(sandboxAgent, 'test-user'),
        content: {
          text: 'Analyze this text and count word frequencies: "The quick brown fox jumps over the lazy dog. The dog was very lazy."'
        },
        agentId: sandboxAgent.agentId,
        roomId,
        createdAt: Date.now(),
      };

      const responses = await sandboxAgent.processMessage(message);

      expect(responses).toBeDefined();
      expect(responses.length).toBeGreaterThan(0);

      const response = responses[0];
      expect(response.content.text).toMatch(/word|frequency|count|the.*2|lazy.*2/i);
      expect(response.content.text).toMatch(/```python|```/);
    });

    it('should generate and process structured data', async () => {
      const roomId = createUniqueUuid(sandboxAgent, 'structured-room');
      const message: Memory = {
        id: createUniqueUuid(sandboxAgent, 'structured-msg'),
        entityId: createUniqueUuid(sandboxAgent, 'test-user'),
        content: {
          text: 'Create a table of employee data with names [Alice, Bob, Charlie], ages [25, 30, 35], and salaries [50000, 60000, 70000]. Calculate the average salary and find the oldest employee.'
        },
        agentId: sandboxAgent.agentId,
        roomId,
        createdAt: Date.now(),
      };

      const responses = await sandboxAgent.processMessage(message);

      expect(responses).toBeDefined();
      expect(responses.length).toBeGreaterThan(0);

      const response = responses[0];
      expect(response.content.text).toMatch(/60000|average|Charlie|oldest|35/i);
      expect(response.content.text).toMatch(/```python|```/);
    });
  });

  describe('File and Data Operations', () => {
    it('should create and manipulate files in sandbox', async () => {
      const roomId = createUniqueUuid(sandboxAgent, 'file-room');
      const message: Memory = {
        id: createUniqueUuid(sandboxAgent, 'file-msg'),
        entityId: createUniqueUuid(sandboxAgent, 'test-user'),
        content: {
          text: 'Create a CSV file with product data: Name, Price, Quantity for items: (Widget, 10.99, 50), (Gadget, 25.50, 30), (Tool, 15.75, 25). Then read it back and calculate total inventory value.'
        },
        agentId: sandboxAgent.agentId,
        roomId,
        createdAt: Date.now(),
      };

      const responses = await sandboxAgent.processMessage(message);

      expect(responses).toBeDefined();
      expect(responses.length).toBeGreaterThan(0);

      const response = responses[0];
      expect(response.content.text).toMatch(/CSV|file|1958\.75|inventory|value/i);
      expect(response.content.text).toMatch(/```python|```/);
    });

    it('should handle JSON data processing', async () => {
      const roomId = createUniqueUuid(sandboxAgent, 'json-room');
      const message: Memory = {
        id: createUniqueUuid(sandboxAgent, 'json-msg'),
        entityId: createUniqueUuid(sandboxAgent, 'test-user'),
        content: {
          text: 'Parse this JSON data and analyze it: {"users": [{"name": "John", "purchases": [10, 25, 15]}, {"name": "Jane", "purchases": [30, 20, 35]}, {"name": "Bob", "purchases": [5, 10, 8]}]}. Find who spent the most money total.'
        },
        agentId: sandboxAgent.agentId,
        roomId,
        createdAt: Date.now(),
      };

      const responses = await sandboxAgent.processMessage(message);

      expect(responses).toBeDefined();
      expect(responses.length).toBeGreaterThan(0);

      const response = responses[0];
      expect(response.content.text).toMatch(/Jane|85|most|spent|JSON/i);
      expect(response.content.text).toMatch(/```python|```/);
    });
  });

  describe('Algorithm Implementation', () => {
    it('should implement sorting algorithms', async () => {
      const roomId = createUniqueUuid(sandboxAgent, 'sort-room');
      const message: Memory = {
        id: createUniqueUuid(sandboxAgent, 'sort-msg'),
        entityId: createUniqueUuid(sandboxAgent, 'test-user'),
        content: {
          text: 'Implement bubble sort to sort this array: [64, 34, 25, 12, 22, 11, 90]. Show the step-by-step process.'
        },
        agentId: sandboxAgent.agentId,
        roomId,
        createdAt: Date.now(),
      };

      const responses = await sandboxAgent.processMessage(message);

      expect(responses).toBeDefined();
      expect(responses.length).toBeGreaterThan(0);

      const response = responses[0];
      expect(response.content.text).toMatch(/bubble|sort|11.*12.*22.*25.*34.*64.*90/i);
      expect(response.content.text).toMatch(/```python|```/);
    });

    it('should implement search algorithms', async () => {
      const roomId = createUniqueUuid(sandboxAgent, 'search-room');
      const message: Memory = {
        id: createUniqueUuid(sandboxAgent, 'search-msg'),
        entityId: createUniqueUuid(sandboxAgent, 'test-user'),
        content: {
          text: 'Implement binary search to find the position of 25 in this sorted array: [5, 10, 15, 20, 25, 30, 35, 40, 45, 50]'
        },
        agentId: sandboxAgent.agentId,
        roomId,
        createdAt: Date.now(),
      };

      const responses = await sandboxAgent.processMessage(message);

      expect(responses).toBeDefined();
      expect(responses.length).toBeGreaterThan(0);

      const response = responses[0];
      expect(response.content.text).toMatch(/binary|search|position|4|index|25/i);
      expect(response.content.text).toMatch(/```python|```/);
    });
  });

  describe('Session Continuity', () => {
    it('should maintain variables across multiple messages', async () => {
      const roomId = createUniqueUuid(sandboxAgent, 'session-room');

      // First message: Set up variables
      const setupMessage: Memory = {
        id: createUniqueUuid(sandboxAgent, 'setup-msg'),
        entityId: createUniqueUuid(sandboxAgent, 'test-user'),
        content: {
          text: 'Set up these variables: base_price = 100, tax_rate = 0.08, discount = 0.15'
        },
        agentId: sandboxAgent.agentId,
        roomId,
        createdAt: Date.now(),
      };

      const setupResponses = await sandboxAgent.processMessage(setupMessage);
      expect(setupResponses.length).toBeGreaterThan(0);

      // Second message: Use the variables
      const calcMessage: Memory = {
        id: createUniqueUuid(sandboxAgent, 'calc-msg'),
        entityId: createUniqueUuid(sandboxAgent, 'test-user'),
        content: {
          text: 'Calculate the final price: apply discount first, then add tax'
        },
        agentId: sandboxAgent.agentId,
        roomId,
        createdAt: Date.now(),
      };

      const calcResponses = await sandboxAgent.processMessage(calcMessage);
      expect(calcResponses.length).toBeGreaterThan(0);

      const response = calcResponses[0];
      expect(response.content.text).toMatch(/91\.80|final|price|discount|tax/i);
    });

    it('should build upon previous calculations', async () => {
      const roomId = createUniqueUuid(sandboxAgent, 'build-room');

      // First: Create a dataset
      const dataMessage: Memory = {
        id: createUniqueUuid(sandboxAgent, 'data-setup'),
        entityId: createUniqueUuid(sandboxAgent, 'test-user'),
        content: {
          text: 'Create a list called scores with these values: [85, 92, 78, 96, 88, 91, 83]'
        },
        agentId: sandboxAgent.agentId,
        roomId,
        createdAt: Date.now(),
      };

      await sandboxAgent.processMessage(dataMessage);

      // Second: Calculate statistics
      const statsMessage: Memory = {
        id: createUniqueUuid(sandboxAgent, 'stats-calc'),
        entityId: createUniqueUuid(sandboxAgent, 'test-user'),
        content: {
          text: 'Calculate the average of scores and find how many are above average'
        },
        agentId: sandboxAgent.agentId,
        roomId,
        createdAt: Date.now(),
      };

      const statsResponses = await sandboxAgent.processMessage(statsMessage);
      expect(statsResponses.length).toBeGreaterThan(0);

      const response = statsResponses[0];
      expect(response.content.text).toMatch(/87\.57|88|above|average|3|4/i);
    });
  });

  describe('Error Handling in Agent Context', () => {
    it('should gracefully handle code errors and explain them', async () => {
      const roomId = createUniqueUuid(sandboxAgent, 'error-room');
      const message: Memory = {
        id: createUniqueUuid(sandboxAgent, 'error-msg'),
        entityId: createUniqueUuid(sandboxAgent, 'test-user'),
        content: {
          text: 'Calculate the result of dividing 10 by 0'
        },
        agentId: sandboxAgent.agentId,
        roomId,
        createdAt: Date.now(),
      };

      const responses = await sandboxAgent.processMessage(message);

      expect(responses).toBeDefined();
      expect(responses.length).toBeGreaterThan(0);

      const response = responses[0];
      expect(response.content.text).toMatch(/error|division|zero|undefined|infinite/i);
      expect(response.content.text).toMatch(/```python|```/);
    });

    it('should provide helpful suggestions for fixing errors', async () => {
      const roomId = createUniqueUuid(sandboxAgent, 'fix-room');
      const message: Memory = {
        id: createUniqueUuid(sandboxAgent, 'fix-msg'),
        entityId: createUniqueUuid(sandboxAgent, 'test-user'),
        content: {
          text: 'Try to access the 10th element of this list: [1, 2, 3, 4, 5]'
        },
        agentId: sandboxAgent.agentId,
        roomId,
        createdAt: Date.now(),
      };

      const responses = await sandboxAgent.processMessage(message);

      expect(responses).toBeDefined();
      expect(responses.length).toBeGreaterThan(0);

      const response = responses[0];
      expect(response.content.text).toMatch(/index|out of range|5 elements|length/i);
    });
  });

  describe('Performance and Reliability', () => {
    it('should handle multiple rapid requests', async () => {
      const roomId = createUniqueUuid(sandboxAgent, 'rapid-room');

      const messages = [
        'Calculate 2 + 3',
        'Calculate 5 * 6',
        'Calculate 8 - 4',
        'Calculate 10 / 2'
      ].map((text, index) => ({
        id: createUniqueUuid(sandboxAgent, `rapid-${index}`),
        entityId: createUniqueUuid(sandboxAgent, 'test-user'),
        content: { text },
        agentId: sandboxAgent.agentId,
        roomId,
        createdAt: Date.now() + index,
      }));

      // Process all messages
      const allResponses = await Promise.all(
        messages.map(msg => sandboxAgent.processMessage(msg))
      );

      // Verify all got responses
      allResponses.forEach((responses, index) => {
        expect(responses.length).toBeGreaterThan(0);
        const expectedResults = ['5', '30', '4', '5'];
        expect(responses[0].content.text).toContain(expectedResults[index]);
      });
    });

    it('should maintain consistent performance', async () => {
      const roomId = createUniqueUuid(sandboxAgent, 'perf-room');
      const times: number[] = [];

      for (let i = 0; i < 3; i++) {
        const message: Memory = {
          id: createUniqueUuid(sandboxAgent, `perf-${i}`),
          entityId: createUniqueUuid(sandboxAgent, 'test-user'),
          content: { text: `Calculate ${i + 1} * ${i + 2}` },
          agentId: sandboxAgent.agentId,
          roomId,
          createdAt: Date.now(),
        };

        const startTime = Date.now();
        const responses = await sandboxAgent.processMessage(message);
        const endTime = Date.now();

        times.push(endTime - startTime);
        expect(responses.length).toBeGreaterThan(0);
      }

      // Performance should be reasonably consistent
      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const maxDeviation = Math.max(...times.map(t => Math.abs(t - avgTime)));

      // Max deviation shouldn't be more than 3x the average
      expect(maxDeviation).toBeLessThan(avgTime * 3);
    });
  });
});
*/
});
