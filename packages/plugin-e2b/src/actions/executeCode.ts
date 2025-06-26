import type { Action, ActionResult, HandlerCallback, IAgentRuntime, Memory, State } from '@elizaos/core';
import { elizaLogger } from '@elizaos/core';
import type { E2BService } from '../services/E2BService.js';

// Helper function to extract code blocks from text
function extractCodeBlocks(text: string): Array<{ language: string; content: string }> {
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  const blocks: Array<{ language: string; content: string }> = [];
  let match;

  while ((match = codeBlockRegex.exec(text)) !== null) {
    const language = match[1] || 'python';
    const content = match[2].trim();
    if (content) {
      blocks.push({ language, content });
    }
  }

  // If no code blocks found, check for inline code
  if (blocks.length === 0) {
    const inlineCodeRegex = /`([^`]+)`/g;
    while ((match = inlineCodeRegex.exec(text)) !== null) {
      const content = match[1].trim();
      if (content && content.length > 10) { // Only consider longer inline code
        blocks.push({ language: 'python', content });
      }
    }
  }

  return blocks;
}

// Helper function to format execution results
function formatExecutionResults(results: any[]): string {
  if (results.length === 0) {
    return 'Code executed successfully (no output)';
  }

  return results.map((result, index) => {
    let output = `**Execution ${index + 1}:**\n`;

    if (result.error) {
      output += `❌ **Error:** ${result.error.name}\n`;
      output += `${result.error.value}\n`;
      if (result.error.traceback) {
        output += `\`\`\`\n${result.error.traceback}\n\`\`\`\n`;
      }
    } else {
      if (result.text) {
        output += `✅ **Result:** \`${result.text}\`\n`;
      }

      if (result.logs.stdout.length > 0) {
        output += `**Output:**\n\`\`\`\n${result.logs.stdout.join('\n')}\n\`\`\`\n`;
      }

      if (result.logs.stderr.length > 0) {
        output += `**Errors/Warnings:**\n\`\`\`\n${result.logs.stderr.join('\n')}\n\`\`\`\n`;
      }
    }

    return output;
  }).join('\n');
}

export const executeCodeAction: Action = {
  name: 'EXECUTE_CODE',
  description: 'Execute code in a secure E2B sandbox environment. Supports Python and other languages.',

  validate: async (runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    try {
      // Check if E2B service is available
      const e2bService = runtime.getService<E2BService>('e2b');
      if (!e2bService) {
        return false;
      }

      // Check if message contains code blocks or code-like content
      const text = message.content.text || '';
      const codeBlocks = extractCodeBlocks(text);

      // Also check for keywords that suggest code execution
      const codeKeywords = ['execute', 'run', 'code', 'python', 'calculate', 'import', 'def ', 'for ', 'if ', 'print('];
      const hasCodeKeywords = codeKeywords.some(keyword => text.toLowerCase().includes(keyword));

      return codeBlocks.length > 0 || hasCodeKeywords;
    } catch (error) {
      elizaLogger.error('Error validating execute code action', { error: error.message });
      return false;
    }
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State,
    options: any,
    callback?: HandlerCallback
  ): Promise<ActionResult> => {
    try {
      elizaLogger.info('Executing code action', { messageId: message.id });

      const e2bService = runtime.getService<E2BService>('e2b');
      if (!e2bService) {
        throw new Error('E2B service not available');
      }

      const text = message.content.text || '';
      let codeBlocks = extractCodeBlocks(text);

      // If no code blocks found, treat the entire message as Python code
      if (codeBlocks.length === 0) {
        // Check if the text looks like code
        const codeIndicators = ['print(', 'import ', 'def ', 'for ', 'if ', '=', '==', '!='];
        const looksLikeCode = codeIndicators.some(indicator => text.includes(indicator));

        if (looksLikeCode) {
          codeBlocks = [{ language: 'python', content: text }];
        } else {
          return {
            text: 'No executable code found in the message. Please provide code blocks using ```language or include recognizable code patterns.',
            values: { success: false, reason: 'no_code_found' },
            data: { codeBlocks: [] }
          };
        }
      }

      elizaLogger.debug('Extracted code blocks', { count: codeBlocks.length });

      const executionResults = [];
      let totalSuccess = 0;
      let totalErrors = 0;

      // Execute each code block
      for (const [index, block] of codeBlocks.entries()) {
        try {
          elizaLogger.debug(`Executing code block ${index + 1}`, {
            language: block.language,
            codeLength: block.content.length
          });

          const result = await e2bService.executeCode(block.content, block.language);

          if (result.error) {
            totalErrors++;
          } else {
            totalSuccess++;
          }

          executionResults.push({
            index: index + 1,
            language: block.language,
            code: block.content,
            ...result
          });

        } catch (error) {
          elizaLogger.error(`Failed to execute code block ${index + 1}`, { error: error.message });
          totalErrors++;

          executionResults.push({
            index: index + 1,
            language: block.language,
            code: block.content,
            error: {
              name: 'ExecutionError',
              value: error.message,
              traceback: ''
            },
            text: undefined,
            results: [],
            logs: { stdout: [], stderr: [] }
          });
        }
      }

      // Format the response
      const responseText = formatExecutionResults(executionResults);

      // Determine overall success
      const overallSuccess = totalErrors === 0;

      const actionResult: ActionResult = {
        text: responseText,
        values: {
          success: overallSuccess,
          totalBlocks: codeBlocks.length,
          successfulBlocks: totalSuccess,
          failedBlocks: totalErrors,
          executionResults: executionResults.map(r => ({
            success: !r.error,
            language: r.language,
            hasOutput: !!(r.text || r.logs.stdout.length > 0)
          }))
        },
        data: {
          executionResults,
          codeBlocks,
          sandboxInfo: e2bService.listSandboxes()
        }
      };

      elizaLogger.info('Code execution completed', {
        totalBlocks: codeBlocks.length,
        successful: totalSuccess,
        failed: totalErrors
      });

      // Call callback if provided
      if (callback) {
        const content = {
          text: actionResult.text,
          ...(actionResult.values && Object.keys(actionResult.values).length > 0 && actionResult.values)
        };
        await callback(content);
      }

      return actionResult;

    } catch (error) {
      elizaLogger.error('Execute code action failed', { error: error.message });

      const errorResult: ActionResult = {
        text: `Failed to execute code: ${error.message}`,
        values: { success: false, error: error.message },
        data: { error: error.message }
      };

      if (callback) {
        const content = {
          text: errorResult.text,
          ...(errorResult.values && Object.keys(errorResult.values).length > 0 && errorResult.values)
        };
        await callback(content);
      }

      return errorResult;
    }
  },

  examples: [
    [
      {
        name: '{{user1}}',
        content: { text: 'Can you calculate 2 + 2 for me?' }
      },
      {
        name: '{{agentName}}',
        content: { text: 'I will calculate that for you using Python:\n\n```python\nresult = 2 + 2\nprint(f"2 + 2 = {result}")\n```' }
      },
      {
        name: '{{agentName}}',
        content: { text: '✅ **Result:** `4`\n**Output:**\n```\n2 + 2 = 4\n```' }
      }
    ],
    [
      {
        name: '{{user1}}',
        content: { text: 'Write a function to check if a number is prime' }
      },
      {
        name: '{{agentName}}',
        content: { text: 'I will create a prime number checker function:\n\n```python\ndef is_prime(n):\n    if n < 2:\n        return False\n    for i in range(2, int(n ** 0.5) + 1):\n        if n % i == 0:\n            return False\n    return True\n\n# Test the function\ntest_numbers = [2, 3, 4, 17, 25, 29]\nfor num in test_numbers:\n    print(f"{num} is prime: {is_prime(num)}")\n```' }
      }
    ],
    [
      {
        name: '{{user1}}',
        content: { text: 'import numpy as np\narray = np.array([1, 2, 3, 4, 5])\nprint("Array:", array)\nprint("Mean:", np.mean(array))' }
      },
      {
        name: '{{agentName}}',
        content: { text: 'I will execute that NumPy code for you!' }
      }
    ]
  ]
};
