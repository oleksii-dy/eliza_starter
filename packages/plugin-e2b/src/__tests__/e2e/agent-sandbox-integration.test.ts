import type { TestSuite, IAgentRuntime, Memory, State } from '@elizaos/core';
import { createUniqueUuid, elizaLogger } from '@elizaos/core';
import { E2BService } from '../../services/E2BService.js';
import { executeCodeAction } from '../../actions/executeCode.js';

/**
 * End-to-end tests verifying that agents operate 100% within E2B sandboxes
 * for all computational tasks, ensuring complete isolation and security
 */
export class AgentSandboxIntegrationE2ETestSuite implements TestSuite {
  name = 'plugin-e2b-agent-sandbox-integration';
  description =
    'E2E tests for agent-sandbox integration ensuring all computations run in isolated environments';

  tests = [
    {
      name: 'Should execute basic arithmetic in sandbox',
      fn: async (runtime: IAgentRuntime) => {
        elizaLogger.info('Testing basic arithmetic execution in sandbox...');

        const roomId = createUniqueUuid(runtime, 'math-room');
        const message: Memory = {
          id: createUniqueUuid(runtime, 'math-msg'),
          entityId: runtime.agentId,
          content: {
            text: '```python\nresult = 147 * 29 + 156\nprint(f"147 * 29 + 156 = {result}")\n```',
          },
          agentId: runtime.agentId,
          roomId,
          createdAt: Date.now(),
        };

        let callbackCalled = false;
        let response: any = null;

        const state: State = { values: {}, data: {}, text: '' };
        await executeCodeAction.handler(runtime, message, state, {}, async (res) => {
          callbackCalled = true;
          response = res;
          return [];
        });

        if (!callbackCalled) {
          throw new Error('Callback was not called');
        }

        if (!response.values.success) {
          throw new Error(`Arithmetic execution failed: ${response.text}`);
        }

        // Verify the result
        const expectedResult = 147 * 29 + 156; // 4419
        if (!response.text.includes('4419')) {
          throw new Error(`Expected result 4419, got: ${response.text}`);
        }

        elizaLogger.info('✓ Basic arithmetic executed successfully in sandbox');
      },
    },

    {
      name: 'Should perform complex mathematical operations',
      fn: async (runtime: IAgentRuntime) => {
        elizaLogger.info('Testing compound interest calculation...');

        const roomId = createUniqueUuid(runtime, 'compound-room');
        const code =
          'principal = 5000\nrate = 0.06  # 6% annual\ntime = 4     # years\nn = 4        # quarterly compounding\n\n# Compound interest formula: A = P(1 + r/n)^(nt)\namount = principal * (1 + rate/n) ** (n * time)\ninterest = amount - principal\n\nprint(f"Principal: ${principal}")\nprint(f"Rate: {rate * 100}% annually")\nprint(f"Time: {time} years")\nprint(f"Compounded: Quarterly")\nprint(f"Final Amount: ${amount:.2f}")\nprint(f"Interest Earned: ${interest:.2f}")';

        const message: Memory = {
          id: createUniqueUuid(runtime, 'compound-msg'),
          entityId: runtime.agentId,
          content: { text: `\`\`\`python\n${code}\`\`\`` },
          agentId: runtime.agentId,
          roomId,
          createdAt: Date.now(),
        };

        let response: any = null;
        const state: State = { values: {}, data: {}, text: '' };
        await executeCodeAction.handler(runtime, message, state, {}, async (res) => {
          response = res;
          return [];
        });

        if (!response?.values.success) {
          throw new Error(
            `Compound interest calculation failed: ${response?.text || 'No response'}`
          );
        }

        // Expected result is approximately $6349.37
        if (!response.text.includes('6349')) {
          throw new Error(`Unexpected compound interest result: ${response.text}`);
        }

        elizaLogger.info('✓ Complex mathematical operations completed successfully');
      },
    },

    {
      name: 'Should handle statistical calculations',
      fn: async (runtime: IAgentRuntime) => {
        elizaLogger.info('Testing statistical calculations...');

        const roomId = createUniqueUuid(runtime, 'stats-room');
        const code =
          'import statistics\n\ndata = [12, 15, 18, 21, 24, 27, 30, 33, 36, 39]\n\nmean = statistics.mean(data)\nmedian = statistics.median(data)\nstdev = statistics.stdev(data)\n\nprint(f"Dataset: {data}")\nprint(f"Mean: {mean}")\nprint(f"Median: {median}")\nprint(f"Standard Deviation: {stdev:.2f}")';

        const message: Memory = {
          id: createUniqueUuid(runtime, 'stats-msg'),
          entityId: runtime.agentId,
          content: { text: `\`\`\`python\n${code}\`\`\`` },
          agentId: runtime.agentId,
          roomId,
          createdAt: Date.now(),
        };

        let response: any = null;
        const state: State = { values: {}, data: {}, text: '' };
        await executeCodeAction.handler(runtime, message, state, {}, async (res) => {
          response = res;
          return [];
        });

        if (!response?.values.success) {
          throw new Error(`Statistical calculation failed: ${response?.text || 'No response'}`);
        }

        // Expected: mean=25.5, median=25.5
        if (!response.text.includes('25.5')) {
          throw new Error(`Unexpected statistical results: ${response.text}`);
        }

        elizaLogger.info('✓ Statistical calculations completed successfully');
      },
    },

    {
      name: 'Should process and analyze data arrays',
      fn: async (runtime: IAgentRuntime) => {
        elizaLogger.info('Testing data array analysis...');

        const roomId = createUniqueUuid(runtime, 'data-room');
        const code =
          'sales_data = [150, 230, 180, 310, 275, 190, 245]\n\ntotal_sales = sum(sales_data)\naverage_sales = total_sales / len(sales_data)\nbest_period = max(sales_data)\nworst_period = min(sales_data)\nbest_index = sales_data.index(best_period) + 1\nworst_index = sales_data.index(worst_period) + 1\n\nprint(f"Sales Data: {sales_data}")\nprint(f"Total Sales: ${total_sales}")\nprint(f"Average Sales: ${average_sales:.2f}")\nprint(f"Best Performing Period: Period {best_index} with ${best_period}")\nprint(f"Worst Performing Period: Period {worst_index} with ${worst_period}")';

        const message: Memory = {
          id: createUniqueUuid(runtime, 'data-msg'),
          entityId: runtime.agentId,
          content: { text: `\`\`\`python\n${code}\`\`\`` },
          agentId: runtime.agentId,
          roomId,
          createdAt: Date.now(),
        };

        let response: any = null;
        const state: State = { values: {}, data: {}, text: '' };
        await executeCodeAction.handler(runtime, message, state, {}, async (res) => {
          response = res;
          return [];
        });

        if (!response?.values.success) {
          throw new Error(`Data analysis failed: ${response?.text || 'No response'}`);
        }

        // Expected: total=1580, average=225.71, best=310, worst=150
        if (!response.text.includes('1580') || !response.text.includes('225.71')) {
          throw new Error(`Unexpected data analysis results: ${response.text}`);
        }

        elizaLogger.info('✓ Data array analysis completed successfully');
      },
    },

    {
      name: 'Should handle text processing and analysis',
      fn: async (runtime: IAgentRuntime) => {
        elizaLogger.info('Testing text processing...');

        const roomId = createUniqueUuid(runtime, 'text-room');
        const code =
          'from collections import Counter\n\ntext = "The quick brown fox jumps over the lazy dog. The dog was very lazy."\nwords = text.lower().replace(\'.\', \'\').split()\n\nword_freq = Counter(words)\n\nprint("Text Analysis Results:")\nprint(f"Total words: {len(words)}")\nprint(f"Unique words: {len(word_freq)}")\nprint("\\nWord Frequencies:")\nfor word, count in word_freq.most_common():\n    if count > 1:\n        print(f"  \'{word}\': {count} times")';

        const message: Memory = {
          id: createUniqueUuid(runtime, 'text-msg'),
          entityId: runtime.agentId,
          content: { text: `\`\`\`python\n${code}\`\`\`` },
          agentId: runtime.agentId,
          roomId,
          createdAt: Date.now(),
        };

        let response: any = null;
        const state: State = { values: {}, data: {}, text: '' };
        await executeCodeAction.handler(runtime, message, state, {}, async (res) => {
          response = res;
          return [];
        });

        if (!response?.values.success) {
          throw new Error(`Text processing failed: ${response?.text || 'No response'}`);
        }

        // Verify word frequencies
        if (!response.text.includes("'the': 2") || !response.text.includes("'lazy': 2")) {
          throw new Error(`Unexpected text analysis results: ${response.text}`);
        }

        elizaLogger.info('✓ Text processing completed successfully');
      },
    },

    {
      name: 'Should create and manipulate files in sandbox',
      fn: async (runtime: IAgentRuntime) => {
        elizaLogger.info('Testing file operations in sandbox...');

        const roomId = createUniqueUuid(runtime, 'file-room');
        const code =
          "import csv\n\n# Create CSV data\nproducts = [\n    ['Name', 'Price', 'Quantity'],\n    ['Widget', 10.99, 50],\n    ['Gadget', 25.50, 30],\n    ['Tool', 15.75, 25]\n]\n\n# Write to CSV file\nfilename = 'products.csv'\nwith open(filename, 'w', newline='') as file:\n    writer = csv.writer(file)\n    writer.writerows(products)\n\nprint(f\"Created {filename}\")\n\n# Read back and calculate inventory value\ntotal_value = 0\nwith open(filename, 'r') as file:\n    reader = csv.DictReader(file)\n    print(\"\\nProduct Inventory:\")\n    for row in reader:\n        name = row['Name']\n        price = float(row['Price'])\n        quantity = int(row['Quantity'])\n        value = price * quantity\n        total_value += value\n        print(f\"  {name}: ${price} x {quantity} = ${value:.2f}\")\n\nprint(f\"\\nTotal Inventory Value: ${total_value:.2f}\")";

        const message: Memory = {
          id: createUniqueUuid(runtime, 'file-msg'),
          entityId: runtime.agentId,
          content: { text: `\`\`\`python\n${code}\`\`\`` },
          agentId: runtime.agentId,
          roomId,
          createdAt: Date.now(),
        };

        let response: any = null;
        const state: State = { values: {}, data: {}, text: '' };
        await executeCodeAction.handler(runtime, message, state, {}, async (res) => {
          response = res;
          return [];
        });

        if (!response?.values.success) {
          throw new Error(`File operations failed: ${response?.text || 'No response'}`);
        }

        // Expected total: (10.99*50) + (25.50*30) + (15.75*25) = 1958.75
        if (!response.text.includes('1958.75')) {
          throw new Error(`Unexpected inventory value: ${response.text}`);
        }

        elizaLogger.info('✓ File operations completed successfully');
      },
    },

    {
      name: 'Should handle JSON data processing',
      fn: async (runtime: IAgentRuntime) => {
        elizaLogger.info('Testing JSON data processing...');

        const roomId = createUniqueUuid(runtime, 'json-room');
        const code =
          'import json\n\njson_data = \'\'\'\n{\n  "users": [\n    {"name": "John", "purchases": [10, 25, 15]},\n    {"name": "Jane", "purchases": [30, 20, 35]},\n    {"name": "Bob", "purchases": [5, 10, 8]}\n  ]\n}\n\'\'\'\n\ndata = json.loads(json_data)\n\n# Analyze purchases\nuser_totals = []\nfor user in data[\'users\']:\n    total = sum(user[\'purchases\'])\n    user_totals.append((user[\'name\'], total))\n    print(f"{user[\'name\']}: ${total} (purchases: {user[\'purchases\']})")\n\n# Find who spent the most\nmax_spender = max(user_totals, key=lambda x: x[1])\nprint(f"\\nHighest spender: {max_spender[0]} with ${max_spender[1]}")';

        const message: Memory = {
          id: createUniqueUuid(runtime, 'json-msg'),
          entityId: runtime.agentId,
          content: { text: `\`\`\`python\n${code}\`\`\`` },
          agentId: runtime.agentId,
          roomId,
          createdAt: Date.now(),
        };

        let response: any = null;
        const state: State = { values: {}, data: {}, text: '' };
        await executeCodeAction.handler(runtime, message, state, {}, async (res) => {
          response = res;
          return [];
        });

        if (!response?.values.success) {
          throw new Error(`JSON processing failed: ${response?.text || 'No response'}`);
        }

        // Jane spent the most: 30+20+35=85
        if (!response.text.includes('Jane') || !response.text.includes('85')) {
          throw new Error(`Unexpected JSON analysis results: ${response.text}`);
        }

        elizaLogger.info('✓ JSON data processing completed successfully');
      },
    },

    {
      name: 'Should implement sorting algorithms',
      fn: async (runtime: IAgentRuntime) => {
        elizaLogger.info('Testing sorting algorithm implementation...');

        const roomId = createUniqueUuid(runtime, 'sort-room');
        const code =
          'def bubble_sort(arr):\n    n = len(arr)\n    arr = arr.copy()  # Don\'t modify original\n    \n    print(f"Original array: {arr}")\n    \n    for i in range(n):\n        swapped = False\n        for j in range(0, n-i-1):\n            if arr[j] > arr[j+1]:\n                arr[j], arr[j+1] = arr[j+1], arr[j]\n                swapped = True\n        \n        if not swapped:\n            break\n    \n    return arr\n\n# Test the implementation\ndata = [64, 34, 25, 12, 22, 11, 90]\nsorted_data = bubble_sort(data)\n\nprint(f"Sorted array: {sorted_data}")\nprint(f"Verification - is sorted: {sorted_data == sorted(data)}")';

        const message: Memory = {
          id: createUniqueUuid(runtime, 'sort-msg'),
          entityId: runtime.agentId,
          content: { text: `\`\`\`python\n${code}\`\`\`` },
          agentId: runtime.agentId,
          roomId,
          createdAt: Date.now(),
        };

        let response: any = null;
        const state: State = { values: {}, data: {}, text: '' };
        await executeCodeAction.handler(runtime, message, state, {}, async (res) => {
          response = res;
          return [];
        });

        if (!response?.values.success) {
          throw new Error(`Sorting algorithm failed: ${response?.text || 'No response'}`);
        }

        // Verify sorted order
        if (!response.text.includes('[11, 12, 22, 25, 34, 64, 90]')) {
          throw new Error(`Unexpected sorting results: ${response.text}`);
        }

        elizaLogger.info('✓ Sorting algorithm implemented successfully');
      },
    },

    {
      name: 'Should maintain variables across multiple executions',
      fn: async (runtime: IAgentRuntime) => {
        elizaLogger.info('Testing session continuity...');

        const roomId = createUniqueUuid(runtime, 'session-room');
        const state: State = { values: {}, data: {}, text: '' };

        // First execution: Set up variables
        const setupCode =
          'base_price = 100\ntax_rate = 0.08\ndiscount = 0.15\n\nprint("Variables initialized:")\nprint(f"  base_price = ${base_price}")\nprint(f"  tax_rate = {tax_rate * 100}%")\nprint(f"  discount = {discount * 100}%")';

        const setupMessage: Memory = {
          id: createUniqueUuid(runtime, 'setup-msg'),
          entityId: runtime.agentId,
          content: { text: `\`\`\`python\n${setupCode}\`\`\`` },
          agentId: runtime.agentId,
          roomId,
          createdAt: Date.now(),
        };

        let setupResponse: any = null;
        await executeCodeAction.handler(runtime, setupMessage, state, {}, async (res) => {
          setupResponse = res;
          return [];
        });

        if (!setupResponse?.values.success) {
          throw new Error(`Setup failed: ${setupResponse?.text || 'No response'}`);
        }

        // Second execution: Use the variables
        const calcCode =
          '# Calculate final price: apply discount first, then add tax\ndiscounted_price = base_price * (1 - discount)\nfinal_price = discounted_price * (1 + tax_rate)\n\nprint("\\nPrice Calculation:")\nprint(f"  Original price: ${base_price}")\nprint(f"  After discount: ${discounted_price:.2f}")\nprint(f"  Final price (with tax): ${final_price:.2f}")';

        const calcMessage: Memory = {
          id: createUniqueUuid(runtime, 'calc-msg'),
          entityId: runtime.agentId,
          content: { text: `\`\`\`python\n${calcCode}\`\`\`` },
          agentId: runtime.agentId,
          roomId,
          createdAt: Date.now() + 1000,
        };

        let calcResponse: any = null;
        await executeCodeAction.handler(runtime, calcMessage, state, {}, async (res) => {
          calcResponse = res;
          return [];
        });

        if (!calcResponse?.values.success) {
          throw new Error(`Calculation failed: ${calcResponse?.text || 'No response'}`);
        }

        // Expected: (100 * 0.85) * 1.08 = 91.80
        if (!calcResponse.text.includes('91.80')) {
          throw new Error(`Unexpected final price: ${calcResponse.text}`);
        }

        elizaLogger.info('✓ Session continuity works correctly');
      },
    },

    {
      name: 'Should handle errors gracefully',
      fn: async (runtime: IAgentRuntime) => {
        elizaLogger.info('Testing error handling...');

        const roomId = createUniqueUuid(runtime, 'error-room');
        const code =
          '# Test division by zero\ntry:\n    result = 10 / 0\nexcept ZeroDivisionError as e:\n    print(f"Error caught: {e}")\n    print("Division by zero is undefined")\n\n# Test index out of range\nmy_list = [1, 2, 3, 4, 5]\ntry:\n    value = my_list[10]\nexcept IndexError as e:\n    print(f"\\nError caught: {e}")\n    print(f"List has {len(my_list)} elements, cannot access index 10")';

        const message: Memory = {
          id: createUniqueUuid(runtime, 'error-msg'),
          entityId: runtime.agentId,
          content: { text: `\`\`\`python\n${code}\`\`\`` },
          agentId: runtime.agentId,
          roomId,
          createdAt: Date.now(),
        };

        let response: any = null;
        const state: State = { values: {}, data: {}, text: '' };
        await executeCodeAction.handler(runtime, message, state, {}, async (res) => {
          response = res;
          return [];
        });

        if (!response?.values.success) {
          throw new Error(`Error handling test failed: ${response?.text || 'No response'}`);
        }

        // Verify error messages
        if (
          !response.text.includes('division by zero') ||
          !response.text.includes('list index out of range')
        ) {
          throw new Error(`Expected error messages not found: ${response.text}`);
        }

        elizaLogger.info('✓ Error handling works correctly');
      },
    },
  ];
}

export default new AgentSandboxIntegrationE2ETestSuite();
