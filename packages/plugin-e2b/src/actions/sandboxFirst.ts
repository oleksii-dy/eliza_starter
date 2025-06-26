import type { Action, ActionExample, Handler, Memory, Validator } from '@elizaos/core';
import { elizaLogger } from '@elizaos/core';
import { executeCodeAction } from './executeCode.js';

/**
 * Sandbox-First Action: Intercepts computational requests and routes them to E2B sandboxes
 * This action ensures that all computational tasks are performed in secure isolated environments
 */

const sandboxFirstExamples: ActionExample[][] = [
  [
    {
      name: 'User',
      content: { text: 'What is 15 * 23?' }
    },
    {
      name: 'Agent',
      content: {
        text: "I'll calculate this for you in a secure sandbox environment.",
        actions: ['SANDBOX_FIRST']
      }
    }
  ],
  [
    {
      name: 'User',
      content: { text: 'Calculate the average of these numbers: 12, 18, 24, 30' }
    },
    {
      name: 'Agent',
      content: {
        text: "I'll process these numbers in a sandbox to calculate the average.",
        actions: ['SANDBOX_FIRST']
      }
    }
  ],
  [
    {
      name: 'User',
      content: { text: 'Sort this list: [5, 2, 8, 1, 9, 3]' }
    },
    {
      name: 'Agent',
      content: {
        text: "I'll sort this list for you using code execution in a secure environment.",
        actions: ['SANDBOX_FIRST']
      }
    }
  ]
];

const sandboxFirstHandler: Handler = async (
  runtime,
  message,
  state,
  _options,
  callback
) => {
  elizaLogger.info('Sandbox-first action triggered', {
    messageId: message.id,
    content: message.content.text
  });

  try {
    // Check if this is a computational request that should use E2B
    const content = message.content.text?.toLowerCase() || '';

    const computationalKeywords = [
      'calculate', 'compute', 'find', 'what is', 'what\'s',
      'solve', 'determine', 'sum', 'average', 'mean', 'median',
      'sort', 'search', 'analyze', 'process', 'generate',
      'fibonacci', 'prime', 'factorial', 'square root',
      'interest', 'percentage', 'ratio', 'statistics',
      'data', 'numbers', 'list', 'array', 'table'
    ];

    const shouldUseSandbox = computationalKeywords.some(keyword =>
      content.includes(keyword)
    );

    if (shouldUseSandbox) {
      elizaLogger.info('Routing computational request to E2B sandbox', {
        messageId: message.id,
        detectedKeywords: computationalKeywords.filter(k => content.includes(k))
      });

      // Generate appropriate code based on the request
      const codePrompt = await generateCodeForRequest(message.content.text || '');

      // Create a new message with the generated code
      const codeMessage: Memory = {
        ...message,
        content: {
          ...message.content,
          text: codePrompt
        }
      };

      // Delegate to the execute code action
      return await executeCodeAction.handler(
        runtime,
        codeMessage,
        state,
        _options,
        callback
      );
    } else {
      // Not a computational request, let it pass through normally
      elizaLogger.debug('Request does not require sandbox execution', {
        messageId: message.id
      });

      if (callback) {
        return await callback({
          values: {
            success: false,
            reason: 'not_computational'
          },
          text: 'This request doesn\'t require computational processing in a sandbox.'
        });
      }
    }

  } catch (error) {
    elizaLogger.error('Sandbox-first action failed', {
      messageId: message.id,
      error: error.message
    });

    if (callback) {
      return await callback({
        values: {
          success: false,
          error: error.message
        },
        text: `Error in sandbox-first processing: ${error.message}`
      });
    }
  }

  return [];
};

/**
 * Generate appropriate code based on the user's request
 */
async function generateCodeForRequest(request: string): Promise<string> {
  const lowerRequest = request.toLowerCase();

  // Math operations
  if (lowerRequest.match(/(\d+)\s*[\+\-\*\/\^]\s*(\d+)/)) {
    const expression = request.match(/[\d\+\-\*\/\^\.\s\(\)]+/)?.[0];
    if (expression) {
      return `\`\`\`python
# Calculate: ${request}
result = ${expression.replace(/\^/g, '**')}
print(f"${request} = {result}")
result
\`\`\``;
    }
  }

  // Fibonacci sequence
  if (lowerRequest.includes('fibonacci')) {
    const match = request.match(/(\d+)/);
    const limit = match ? parseInt(match[0], 10) : 10;
    return `\`\`\`python
# Generate Fibonacci sequence up to ${limit}
def fibonacci(n):
    fib_sequence = []
    a, b = 0, 1
    while a <= n:
        fib_sequence.append(a)
        a, b = b, a + b
    return fib_sequence

result = fibonacci(${limit})
print(f"Fibonacci sequence up to ${limit}: {result}")
result
\`\`\``;
  }

  // Statistical operations
  if (lowerRequest.includes('average') || lowerRequest.includes('mean')) {
    const numbers = request.match(/[\d\.\,\s\[\]]+/)?.[0];
    if (numbers) {
      const cleanNumbers = numbers.replace(/[\[\],]/g, ' ').split(/\s+/).filter(n => n && !isNaN(parseFloat(n)));
      return `\`\`\`python
# Calculate average of: ${request}
numbers = [${cleanNumbers.join(', ')}]
average = sum(numbers) / len(numbers)
print(f"Numbers: {numbers}")
print(f"Average: {average:.2f}")
average
\`\`\``;
    }
  }

  // Sorting
  if (lowerRequest.includes('sort')) {
    const numbers = request.match(/[\d\.\,\s\[\]]+/)?.[0];
    if (numbers) {
      const cleanNumbers = numbers.replace(/[\[\],]/g, ' ').split(/\s+/).filter(n => n && !isNaN(parseFloat(n)));
      return `\`\`\`python
# Sort numbers: ${request}
numbers = [${cleanNumbers.join(', ')}]
sorted_numbers = sorted(numbers)
print(f"Original: {numbers}")
print(f"Sorted: {sorted_numbers}")
sorted_numbers
\`\`\``;
    }
  }

  // Generic computational request
  return `\`\`\`python
# Processing request: ${request}
print("Executing computation in secure sandbox...")
print("Request: ${request}")

# Add specific calculation logic here based on the request
result = "Processing complete"
print(f"Result: {result}")
result
\`\`\``;
}

const sandboxFirstValidator: Validator = async (runtime, message) => {
  const content = message.content.text?.toLowerCase() || '';

  const computationalPatterns = [
    /calculate|compute|find|solve/i,
    /what\s+is|what's/i,
    /\d+\s*[\+\-\*\/\^]\s*\d+/,
    /average|mean|median|sum/i,
    /sort|search|analyze/i,
    /fibonacci|prime|factorial/i,
    /percent|percentage|%/,
    /interest|compound/i,
    /statistics|data/i
  ];

  const isComputational = computationalPatterns.some(pattern =>
    pattern.test(content)
  );

  return isComputational;
};

export const sandboxFirstAction: Action = {
  name: 'SANDBOX_FIRST',
  similes: [
    'COMPUTE_IN_SANDBOX',
    'SECURE_CALCULATION',
    'ISOLATED_EXECUTION',
    'SANDBOX_CALCULATION'
  ],
  description: 'Automatically routes computational requests to E2B sandboxes for secure execution',
  examples: sandboxFirstExamples,
  validate: sandboxFirstValidator,
  handler: sandboxFirstHandler,
  effects: {
    provides: ['computational_result', 'sandbox_execution', 'secure_calculation'],
    requires: ['e2b_service'],
    modifies: ['message_response', 'execution_context']
  }
};
