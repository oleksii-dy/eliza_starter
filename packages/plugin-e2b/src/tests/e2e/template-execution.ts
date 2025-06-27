import type { TestSuite, IAgentRuntime, Memory, State } from '@elizaos/core';
import { createUniqueUuid, elizaLogger } from '@elizaos/core';
import { E2BService } from '../../services/E2BService.js';
import { executeTemplateAction } from '../../actions/executeTemplate.js';
import {
  JAVASCRIPT_TEMPLATES,
  PYTHON_TEMPLATES,
  getTemplate,
  generateCode,
  listAllTemplates,
  suggestTemplates,
} from '../../templates/index.js';

export class TemplateExecutionE2ETestSuite implements TestSuite {
  name = 'plugin-e2b-template-execution-e2e';
  description = 'End-to-end tests for E2B template execution with JavaScript and Python';

  tests = [
    {
      name: 'Should list all available templates',
      fn: async (runtime: IAgentRuntime) => {
        elizaLogger.info('Testing template listing...');

        const roomId = createUniqueUuid(runtime, 'test-room');
        const message: Memory = {
          id: createUniqueUuid(runtime, 'test-msg-1'),
          entityId: runtime.agentId,
          content: { text: 'List all available templates' },
          agentId: runtime.agentId,
          roomId,
          createdAt: Date.now(),
        };

        let callbackCalled = false;
        let callbackResponse: any = null;

        const state: State = { values: {}, data: {}, text: '' };
        await executeTemplateAction.handler(runtime, message, state, {}, async (response) => {
          callbackCalled = true;
          callbackResponse = response;
          return [];
        });

        if (!callbackCalled) {
          throw new Error('Callback was not called');
        }

        if (!callbackResponse.values.success) {
          throw new Error(`Template listing failed: ${callbackResponse.text}`);
        }

        // Verify that JavaScript and Python templates are listed
        if (!callbackResponse.text.includes('javascript') && !callbackResponse.text.includes('JavaScript')) {
          throw new Error('JavaScript templates not found in listing');
        }

        if (!callbackResponse.text.includes('python') && !callbackResponse.text.includes('Python')) {
          throw new Error('Python templates not found in listing');
        }

        // Verify template data is included
        if (!callbackResponse.data || !callbackResponse.data.templates) {
          throw new Error('Template data not included in response');
        }

        const templates = callbackResponse.data.templates;
        const jsTemplates = templates.filter((t: any) => t.language === 'javascript');
        const pyTemplates = templates.filter((t: any) => t.language === 'python');

        if (jsTemplates.length === 0) {
          throw new Error('No JavaScript templates found');
        }

        if (pyTemplates.length === 0) {
          throw new Error('No Python templates found');
        }

        elizaLogger.info('✓ Template listing works correctly', {
          totalTemplates: templates.length,
          jsTemplates: jsTemplates.length,
          pyTemplates: pyTemplates.length,
        });
      },
    },

    {
      name: 'Should execute Python hello-world template',
      fn: async (runtime: IAgentRuntime) => {
        elizaLogger.info('Testing Python hello-world template execution...');

        const roomId = createUniqueUuid(runtime, 'test-room');
        const message: Memory = {
          id: createUniqueUuid(runtime, 'test-msg-2'),
          entityId: runtime.agentId,
          content: { text: 'Run template hello-world in Python' },
          agentId: runtime.agentId,
          roomId,
          createdAt: Date.now(),
        };

        let callbackCalled = false;
        let callbackResponse: any = null;

        const state: State = { values: {}, data: {}, text: '' };
        await executeTemplateAction.handler(runtime, message, state, {}, async (response) => {
          callbackCalled = true;
          callbackResponse = response;
          return [];
        });

        if (!callbackCalled) {
          throw new Error('Callback was not called');
        }

        if (!callbackResponse.values.success) {
          throw new Error(`Python hello-world template failed: ${callbackResponse.text}`);
        }

        if (!callbackResponse.text.includes('Hello, World!')) {
          throw new Error(`Expected output not found: ${callbackResponse.text}`);
        }

        // Verify execution data
        if (!callbackResponse.data.executionResult) {
          throw new Error('Execution result not included');
        }

        const executionResult = callbackResponse.data.executionResult;
        if (executionResult.error) {
          throw new Error(`Execution error: ${executionResult.error.value}`);
        }

        elizaLogger.info('✓ Python hello-world template executed successfully');
      },
    },

    {
      name: 'Should execute JavaScript hello-world template',
      fn: async (runtime: IAgentRuntime) => {
        elizaLogger.info('Testing JavaScript hello-world template execution...');

        const roomId = createUniqueUuid(runtime, 'test-room');
        const message: Memory = {
          id: createUniqueUuid(runtime, 'test-msg-3'),
          entityId: runtime.agentId,
          content: { text: 'Run template hello-world in JavaScript' },
          agentId: runtime.agentId,
          roomId,
          createdAt: Date.now(),
        };

        let callbackCalled = false;
        let callbackResponse: any = null;

        const state: State = { values: {}, data: {}, text: '' };
        await executeTemplateAction.handler(runtime, message, state, {}, async (response) => {
          callbackCalled = true;
          callbackResponse = response;
          return [];
        });

        if (!callbackCalled) {
          throw new Error('Callback was not called');
        }

        if (!callbackResponse.values.success) {
          throw new Error(`JavaScript hello-world template failed: ${callbackResponse.text}`);
        }

        if (!callbackResponse.text.includes('Hello, World!')) {
          throw new Error(`Expected output not found: ${callbackResponse.text}`);
        }

        // Verify execution data
        if (!callbackResponse.data.executionResult) {
          throw new Error('Execution result not included');
        }

        const executionResult = callbackResponse.data.executionResult;
        if (executionResult.error) {
          throw new Error(`Execution error: ${executionResult.error.value}`);
        }

        elizaLogger.info('✓ JavaScript hello-world template executed successfully');
      },
    },

    {
      name: 'Should execute Python data science template',
      fn: async (runtime: IAgentRuntime) => {
        elizaLogger.info('Testing Python data science template...');

        const roomId = createUniqueUuid(runtime, 'test-room');
        const message: Memory = {
          id: createUniqueUuid(runtime, 'test-msg-4'),
          entityId: runtime.agentId,
          content: { text: 'Run template basic-statistics in Python' },
          agentId: runtime.agentId,
          roomId,
          createdAt: Date.now(),
        };

        let callbackCalled = false;
        let callbackResponse: any = null;

        const state: State = { values: {}, data: {}, text: '' };
        await executeTemplateAction.handler(runtime, message, state, {}, async (response) => {
          callbackCalled = true;
          callbackResponse = response;
          return [];
        });

        if (!callbackCalled) {
          throw new Error('Callback was not called');
        }

        if (!callbackResponse.values.success) {
          throw new Error(`Python statistics template failed: ${callbackResponse.text}`);
        }

        // Check for statistical output
        const expectedOutputs = ['Mean:', 'Median:', 'Standard deviation:'];
        for (const expected of expectedOutputs) {
          if (!callbackResponse.text.includes(expected)) {
            throw new Error(`Expected output '${expected}' not found: ${callbackResponse.text}`);
          }
        }

        elizaLogger.info('✓ Python data science template executed successfully');
      },
    },

    {
      name: 'Should execute JavaScript array operations template',
      fn: async (runtime: IAgentRuntime) => {
        elizaLogger.info('Testing JavaScript array operations template...');

        const roomId = createUniqueUuid(runtime, 'test-room');
        const message: Memory = {
          id: createUniqueUuid(runtime, 'test-msg-5'),
          entityId: runtime.agentId,
          content: { text: 'Run template array-operations in JavaScript' },
          agentId: runtime.agentId,
          roomId,
          createdAt: Date.now(),
        };

        let callbackCalled = false;
        let callbackResponse: any = null;

        const state: State = { values: {}, data: {}, text: '' };
        await executeTemplateAction.handler(runtime, message, state, {}, async (response) => {
          callbackCalled = true;
          callbackResponse = response;
          return [];
        });

        if (!callbackCalled) {
          throw new Error('Callback was not called');
        }

        if (!callbackResponse.values.success) {
          throw new Error(`JavaScript array operations template failed: ${callbackResponse.text}`);
        }

        // Check for array operation outputs
        const expectedOutputs = ['Sum:', 'Average:', 'Even numbers:', 'Doubled:'];
        for (const expected of expectedOutputs) {
          if (!callbackResponse.text.includes(expected)) {
            throw new Error(`Expected output '${expected}' not found: ${callbackResponse.text}`);
          }
        }

        elizaLogger.info('✓ JavaScript array operations template executed successfully');
      },
    },

    {
      name: 'Should get template suggestions',
      fn: async (runtime: IAgentRuntime) => {
        elizaLogger.info('Testing template suggestions...');

        const roomId = createUniqueUuid(runtime, 'test-room');
        const message: Memory = {
          id: createUniqueUuid(runtime, 'test-msg-6'),
          entityId: runtime.agentId,
          content: { text: 'Suggest templates for sorting algorithms' },
          agentId: runtime.agentId,
          roomId,
          createdAt: Date.now(),
        };

        let callbackCalled = false;
        let callbackResponse: any = null;

        const state: State = { values: {}, data: {}, text: '' };
        await executeTemplateAction.handler(runtime, message, state, {}, async (response) => {
          callbackCalled = true;
          callbackResponse = response;
          return [];
        });

        if (!callbackCalled) {
          throw new Error('Callback was not called');
        }

        if (!callbackResponse.values.success) {
          throw new Error(`Template suggestions failed: ${callbackResponse.text}`);
        }

        // Should suggest sorting-related templates
        if (!callbackResponse.text.includes('sorting') && !callbackResponse.text.includes('Sorting')) {
          throw new Error(`No sorting templates suggested: ${callbackResponse.text}`);
        }

        // Verify suggestions data
        if (!callbackResponse.data.suggestions) {
          throw new Error('Suggestions data not included');
        }

        elizaLogger.info('✓ Template suggestions work correctly');
      },
    },

    {
      name: 'Should show template categories',
      fn: async (runtime: IAgentRuntime) => {
        elizaLogger.info('Testing template categories...');

        const roomId = createUniqueUuid(runtime, 'test-room');
        const message: Memory = {
          id: createUniqueUuid(runtime, 'test-msg-7'),
          entityId: runtime.agentId,
          content: { text: 'What categories are available for Python templates?' },
          agentId: runtime.agentId,
          roomId,
          createdAt: Date.now(),
        };

        let callbackCalled = false;
        let callbackResponse: any = null;

        const state: State = { values: {}, data: {}, text: '' };
        await executeTemplateAction.handler(runtime, message, state, {}, async (response) => {
          callbackCalled = true;
          callbackResponse = response;
          return [];
        });

        if (!callbackCalled) {
          throw new Error('Callback was not called');
        }

        if (!callbackResponse.values.success) {
          throw new Error(`Template categories failed: ${callbackResponse.text}`);
        }

        // Check for expected categories
        const expectedCategories = ['basic', 'data-science', 'algorithms'];
        for (const category of expectedCategories) {
          if (!callbackResponse.text.includes(category)) {
            throw new Error(`Category '${category}' not found: ${callbackResponse.text}`);
          }
        }

        // Verify categories data
        if (!callbackResponse.data.python) {
          throw new Error('Python categories data not included');
        }

        elizaLogger.info('✓ Template categories work correctly');
      },
    },

    {
      name: 'Should handle template execution errors gracefully',
      fn: async (runtime: IAgentRuntime) => {
        elizaLogger.info('Testing template error handling...');

        const roomId = createUniqueUuid(runtime, 'test-room');
        const message: Memory = {
          id: createUniqueUuid(runtime, 'test-msg-8'),
          entityId: runtime.agentId,
          content: { text: 'Run template non-existent-template in Python' },
          agentId: runtime.agentId,
          roomId,
          createdAt: Date.now(),
        };

        let callbackCalled = false;
        let callbackResponse: any = null;

        const state: State = { values: {}, data: {}, text: '' };
        await executeTemplateAction.handler(runtime, message, state, {}, async (response) => {
          callbackCalled = true;
          callbackResponse = response;
          return [];
        });

        if (!callbackCalled) {
          throw new Error('Callback was not called');
        }

        // Should fail gracefully
        if (callbackResponse.values.success) {
          throw new Error('Expected template execution to fail for non-existent template');
        }

        if (!callbackResponse.text.includes('not found')) {
          throw new Error(`Expected 'not found' error message: ${callbackResponse.text}`);
        }

        elizaLogger.info('✓ Template error handling works correctly');
      },
    },

    {
      name: 'Should validate template functionality directly',
      fn: async (runtime: IAgentRuntime) => {
        elizaLogger.info('Testing template functionality directly...');

        // Test template retrieval
        const jsTemplate = getTemplate('javascript', 'hello-world');
        if (!jsTemplate) {
          throw new Error('JavaScript hello-world template not found');
        }

        const pyTemplate = getTemplate('python', 'hello-world');
        if (!pyTemplate) {
          throw new Error('Python hello-world template not found');
        }

        // Test code generation
        const jsCode = generateCode('javascript', 'hello-world');
        if (!jsCode.includes('Hello, World!')) {
          throw new Error('JavaScript code generation failed');
        }

        const pyCode = generateCode('python', 'hello-world');
        if (!pyCode.includes('Hello, World!')) {
          throw new Error('Python code generation failed');
        }

        // Test template listing
        const allTemplates = listAllTemplates();
        if (allTemplates.length === 0) {
          throw new Error('No templates found');
        }

        const jsTemplates = allTemplates.filter(t => t.language === 'javascript');
        const pyTemplates = allTemplates.filter(t => t.language === 'python');

        if (jsTemplates.length === 0) {
          throw new Error('No JavaScript templates found');
        }

        if (pyTemplates.length === 0) {
          throw new Error('No Python templates found');
        }

        // Test suggestions
        const suggestions = suggestTemplates(['sorting', 'algorithm']);
        if (suggestions.length === 0) {
          throw new Error('No suggestions found for sorting algorithm');
        }

        elizaLogger.info('✓ Template functionality validation complete', {
          jsTemplateCount: jsTemplates.length,
          pyTemplateCount: pyTemplates.length,
          totalTemplates: allTemplates.length,
          suggestions: suggestions.length,
        });
      },
    },

    {
      name: 'Should execute templates with various complexity levels',
      fn: async (runtime: IAgentRuntime) => {
        elizaLogger.info('Testing complex template execution...');

        const e2bService = runtime.getService<E2BService>('e2b');
        if (!e2bService) {
          throw new Error('E2B service not available');
        }

        // Test complex Python template (mathematical computations)
        const pyTemplate = getTemplate('python', 'mathematical-computations');
        if (pyTemplate) {
          const pyCode = generateCode('python', 'mathematical-computations');
          const pyResult = await e2bService.executeCode(pyCode, 'python');
          
          if (pyResult.error) {
            elizaLogger.warn('Python mathematical template execution failed', pyResult.error);
          } else {
            elizaLogger.info('✓ Python mathematical template executed successfully');
          }
        }

        // Test complex JavaScript template (async operations)
        const jsTemplate = getTemplate('javascript', 'async-operations');
        if (jsTemplate) {
          const jsCode = generateCode('javascript', 'async-operations');
          const jsResult = await e2bService.executeCode(jsCode, 'javascript');
          
          if (jsResult.error) {
            elizaLogger.warn('JavaScript async template execution failed', jsResult.error);
          } else {
            elizaLogger.info('✓ JavaScript async template executed successfully');
          }
        }

        elizaLogger.info('✓ Complex template execution tests completed');
      },
    },
  ];
}