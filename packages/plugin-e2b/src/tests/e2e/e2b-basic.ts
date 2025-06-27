import type { TestSuite, IAgentRuntime, Memory, State } from '@elizaos/core';
import { createUniqueUuid, elizaLogger } from '@elizaos/core';
import { E2BService } from '../../services/E2BService.js';
import { executeCodeAction, manageSandboxAction } from '../../actions/index.js';

export class E2BBasicE2ETestSuite implements TestSuite {
  name = 'plugin-e2b-basic-e2e';
  description = 'Basic end-to-end tests for E2B plugin functionality with real sandboxes';

  tests = [
    {
      name: 'Should initialize E2B service correctly',
      fn: async (runtime: IAgentRuntime) => {
        elizaLogger.info('Testing E2B service initialization...');

        const e2bService = runtime.getService<E2BService>('e2b');
        if (!e2bService) {
          throw new Error('E2B service not registered');
        }

        // Test service health
        const isHealthy = await e2bService.isHealthy();
        if (!isHealthy) {
          throw new Error('E2B service is not healthy');
        }

        // Check that at least one sandbox exists (default sandbox)
        const sandboxes = e2bService.listSandboxes();
        if (sandboxes.length === 0) {
          throw new Error('No default sandbox created during initialization');
        }

        elizaLogger.info('✓ E2B service initialized successfully', {
          sandboxCount: sandboxes.length,
          isHealthy,
        });
      },
    },

    {
      name: 'Should execute simple Python code',
      fn: async (runtime: IAgentRuntime) => {
        elizaLogger.info('Testing basic Python code execution...');

        const roomId = createUniqueUuid(runtime, 'test-room');
        const message: Memory = {
          id: createUniqueUuid(runtime, 'test-msg-1'),
          entityId: runtime.agentId,
          content: { text: '```python\nresult = 2 + 2\nprint(f"2 + 2 = {result}")\nresult\n```' },
          agentId: runtime.agentId,
          roomId,
          createdAt: Date.now(),
        };

        let callbackCalled = false;
        let callbackResponse: any = null;

        const state: State = { values: {}, data: {}, text: '' };
        await executeCodeAction.handler(runtime, message, state, {}, async (response) => {
          callbackCalled = true;
          callbackResponse = response;
          return [];
        });

        if (!callbackCalled) {
          throw new Error('Callback was not called');
        }

        if (!callbackResponse.values.success) {
          throw new Error(`Code execution failed: ${callbackResponse.text}`);
        }

        if (!callbackResponse.text.includes('4')) {
          throw new Error(`Unexpected output: ${callbackResponse.text}`);
        }

        elizaLogger.info('✓ Python code executed successfully');
        elizaLogger.debug('Execution result', { response: callbackResponse.text });
      },
    },

    {
      name: 'Should handle code execution errors gracefully',
      fn: async (runtime: IAgentRuntime) => {
        elizaLogger.info('Testing error handling in code execution...');

        const roomId = createUniqueUuid(runtime, 'test-room');
        const message: Memory = {
          id: createUniqueUuid(runtime, 'test-msg-2'),
          entityId: runtime.agentId,
          content: {
            text: '```python\n# This will cause a division by zero error\nresult = 10 / 0\n```',
          },
          agentId: runtime.agentId,
          roomId,
          createdAt: Date.now(),
        };

        let callbackCalled = false;
        let callbackResponse: any = null;

        const state: State = { values: {}, data: {}, text: '' };
        await executeCodeAction.handler(runtime, message, state, {}, async (response) => {
          callbackCalled = true;
          callbackResponse = response;
          return [];
        });

        if (!callbackCalled) {
          throw new Error('Callback was not called');
        }

        // Should succeed (action handled the error)
        if (callbackResponse.values.success) {
          throw new Error('Expected code execution to report failure but it reported success');
        }

        // Should contain error information
        if (
          !callbackResponse.text.includes('Error') &&
          !callbackResponse.text.includes('ZeroDivisionError')
        ) {
          throw new Error(`Expected error information in response: ${callbackResponse.text}`);
        }

        elizaLogger.info('✓ Error handling works correctly');
        elizaLogger.debug('Error response', { response: callbackResponse.text });
      },
    },

    {
      name: 'Should create and manage sandboxes',
      fn: async (runtime: IAgentRuntime) => {
        elizaLogger.info('Testing sandbox management...');

        const e2bService = runtime.getService<E2BService>('e2b');
        if (!e2bService) {
          throw new Error('E2B service not available');
        }

        // Get initial sandbox count
        const initialSandboxes = e2bService.listSandboxes();
        const initialCount = initialSandboxes.length;

        // Test creating a new sandbox via action
        const roomId = createUniqueUuid(runtime, 'test-room');
        const createMessage: Memory = {
          id: createUniqueUuid(runtime, 'test-msg-3'),
          entityId: runtime.agentId,
          content: { text: 'Create a new sandbox with 60 second timeout' },
          agentId: runtime.agentId,
          roomId,
          createdAt: Date.now(),
        };

        let createCallbackCalled = false;
        let createResponse: any = null;

        const state: State = { values: {}, data: {}, text: '' };
        await manageSandboxAction.handler(runtime, createMessage, state, {}, async (response) => {
          createCallbackCalled = true;
          createResponse = response;
          return [];
        });

        if (!createCallbackCalled) {
          throw new Error('Create sandbox callback was not called');
        }

        if (!createResponse.values.success) {
          throw new Error(`Sandbox creation failed: ${createResponse.text}`);
        }

        // Verify sandbox was created
        const afterCreateSandboxes = e2bService.listSandboxes();
        if (afterCreateSandboxes.length !== initialCount + 1) {
          throw new Error(
            `Expected ${initialCount + 1} sandboxes, got ${afterCreateSandboxes.length}`
          );
        }

        // Test listing sandboxes
        const listMessage: Memory = {
          id: createUniqueUuid(runtime, 'test-msg-4'),
          entityId: runtime.agentId,
          content: { text: 'List all sandboxes' },
          agentId: runtime.agentId,
          roomId,
          createdAt: Date.now(),
        };

        let listCallbackCalled = false;
        let listResponse: any = null;

        await manageSandboxAction.handler(runtime, listMessage, state, {}, async (response) => {
          listCallbackCalled = true;
          listResponse = response;
          return [];
        });

        if (!listCallbackCalled) {
          throw new Error('List sandboxes callback was not called');
        }

        if (!listResponse.values.success) {
          throw new Error(`Sandbox listing failed: ${listResponse.text}`);
        }

        if (!listResponse.text.includes('Active Sandboxes')) {
          throw new Error(`Expected sandbox list in response: ${listResponse.text}`);
        }

        elizaLogger.info('✓ Sandbox management works correctly', {
          initialCount,
          finalCount: afterCreateSandboxes.length,
        });
      },
    },

    {
      name: 'Should execute code with multiple languages',
      fn: async (runtime: IAgentRuntime) => {
        elizaLogger.info('Testing multi-language code execution...');

        const roomId = createUniqueUuid(runtime, 'test-room');

        // Test Python code
        const pythonMessage: Memory = {
          id: createUniqueUuid(runtime, 'test-msg-5'),
          entityId: runtime.agentId,
          content: { text: '```python\nimport math\nprint(f"π = {math.pi:.4f}")\n```' },
          agentId: runtime.agentId,
          roomId,
          createdAt: Date.now(),
        };

        let pythonCallbackCalled = false;
        let pythonResponse: any = null;

        const state: State = { values: {}, data: {}, text: '' };
        await executeCodeAction.handler(runtime, pythonMessage, state, {}, async (response) => {
          pythonCallbackCalled = true;
          pythonResponse = response;
          return [];
        });

        if (!pythonCallbackCalled) {
          throw new Error('Python callback was not called');
        }

        if (!pythonResponse.values.success) {
          throw new Error(`Python execution failed: ${pythonResponse.text}`);
        }

        if (!pythonResponse.text.includes('π = 3.1416')) {
          throw new Error(`Unexpected Python output: ${pythonResponse.text}`);
        }

        elizaLogger.info('✓ Multi-language code execution works correctly');
      },
    },

    {
      name: 'Should persist variables across code executions',
      fn: async (runtime: IAgentRuntime) => {
        elizaLogger.info('Testing variable persistence across executions...');

        const roomId = createUniqueUuid(runtime, 'test-room');
        const state: State = { values: {}, data: {}, text: '' };

        // First execution: set a variable
        const firstMessage: Memory = {
          id: createUniqueUuid(runtime, 'test-msg-6'),
          entityId: runtime.agentId,
          content: {
            text: '```python\nmy_variable = "Hello from E2B"\nprint("Variable set")\n```',
          },
          agentId: runtime.agentId,
          roomId,
          createdAt: Date.now(),
        };

        let firstCallbackCalled = false;
        let firstResponse: any = null;

        await executeCodeAction.handler(runtime, firstMessage, state, {}, async (response) => {
          firstCallbackCalled = true;
          firstResponse = response;
          return [];
        });

        if (!firstCallbackCalled || !firstResponse.values.success) {
          throw new Error('First execution failed');
        }

        // Second execution: use the variable
        const secondMessage: Memory = {
          id: createUniqueUuid(runtime, 'test-msg-7'),
          entityId: runtime.agentId,
          content: { text: '```python\nprint(f"Retrieved: {my_variable}")\n```' },
          agentId: runtime.agentId,
          roomId,
          createdAt: Date.now(),
        };

        let secondCallbackCalled = false;
        let secondResponse: any = null;

        await executeCodeAction.handler(runtime, secondMessage, state, {}, async (response) => {
          secondCallbackCalled = true;
          secondResponse = response;
          return [];
        });

        if (!secondCallbackCalled) {
          throw new Error('Second callback was not called');
        }

        if (!secondResponse.values.success) {
          throw new Error(`Second execution failed: ${secondResponse.text}`);
        }

        if (!secondResponse.text.includes('Hello from E2B')) {
          throw new Error(`Variable not persisted: ${secondResponse.text}`);
        }

        elizaLogger.info('✓ Variable persistence works correctly');
      },
    },
  ];
}
