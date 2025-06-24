/**
 * TESTING PATTERNS MODULE
 *
 * Responsibilities:
 * - Test-specific migration patterns
 * - Test structure validation
 * - Mock runtime patterns
 * - Test command and execution patterns
 * - Test suite configuration
 * - Provider-specific testing patterns
 *
 * NOTE: This file now focuses on PROBLEM DETECTION only.
 * Test GENERATION is handled by AI-contextual test generator.
 */

import type { ArchitectureIssue } from '../types.js';

/**
 * Test-specific patterns and issues from plugin-news analysis
 * Used for detecting V1→V2 migration problems in existing code
 */
export const TESTING_PATTERNS: ArchitectureIssue[] = [
  {
    type: 'test-import-issue',
    severity: 'critical',
    pattern: 'TestSuite import as value instead of type',
    solution: 'Import TestSuite as type-only import',
    codeExample: {
      wrong: `import { TestSuite } from "@elizaos/core";`,
      correct: `import type { TestSuite } from "@elizaos/core";`,
    },
  },
  {
    type: 'test-runtime-mock',
    severity: 'critical',
    pattern: 'Mock runtime missing V2 methods',
    solution: 'Add useModel and createMemory to mock runtime',
    codeExample: {
      wrong: `const runtime: IAgentRuntime = {
    // ... other properties
    language: {
        generateText: async () => "test",
    },
    ...overrides,
};`,
      correct: `const runtime = {
    // ... other properties
    useModel: async () => "test response",
    createMemory: async (memory: Memory, tableName: string) => {
        const id = memory.id || (uuidv4() as UUID);
        memories.set(id, { ...memory, id });
        return id;
    },
    language: {
        generateText: async () => "test",
    },
    ...overrides,
} as IAgentRuntime;`,
    },
  },
  {
    type: 'test-state-object',
    severity: 'high',
    pattern: 'Empty objects passed as State parameter',
    solution: 'Create proper State objects with required fields',
    codeExample: {
      wrong: 'await action.handler(runtime, message, {}, options, callback);',
      correct: `await action.handler(runtime, message, {
    values: {},
    data: {},
    text: ""
}, options, callback);`,
    },
  },
  {
    type: 'test-command-issue',
    severity: 'critical',
    pattern: 'Using bun test instead of bun run test',
    solution: 'Use bun run test to invoke package.json script, not bun test',
    codeExample: {
      wrong: 'bun test',
      correct: 'bun run test # Runs "elizaos test" from package.json',
    },
  },
  {
    type: 'test-export-name',
    severity: 'high',
    pattern: 'Test suite export name mismatch',
    solution: 'Export test suite with consistent naming',
    codeExample: {
      wrong: `export const testSuite: TestSuite = { ... };
// or
export default testSuite;`,
      correct: `export const test: TestSuite = { ... };
export default test;`,
    },
  },
  {
    type: 'test-file-location',
    severity: 'high',
    pattern: 'Wrong test file location or naming',
    solution: 'Test files must be in src/test/ directory with proper naming',
    codeExample: {
      wrong: `__tests__/plugin.test.ts
src/test.test.ts
test/unit.test.ts`,
      correct: `src/test/test.ts
src/test/utils.ts`,
    },
  },
  {
    type: 'test-directory-structure',
    severity: 'high',
    pattern: 'V1 test directory structure',
    solution: 'Migrate from __tests__ to src/test/ structure',
    codeExample: {
      wrong: `__tests__/
  actions/
    action.test.ts
  services/
    service.test.ts
  setup.ts`,
      correct: `src/test/
  test.ts
  utils.ts`,
    },
  },
  {
    type: 'test-vitest-config',
    severity: 'critical',
    pattern: 'Vitest configuration present',
    solution: 'Remove all vitest configurations - use ElizaOS test framework only',
    codeExample: {
      wrong: `vitest.config.ts
jest.config.js
"test": "vitest"`,
      correct: `# No vitest config files
"test": "elizaos test"`,
    },
  },
  {
    type: 'test-mock-memory-creation',
    severity: 'high',
    pattern: 'Mock using old memory creation API',
    solution: 'Update mock to use V2 memory creation API',
    codeExample: {
      wrong: `createMemory: async (memory: Memory) => {
    return runtime.messageManager.createMemory(memory);
}`,
      correct: `createMemory: async (memory: Memory, tableName: string) => {
    const id = memory.id || (uuidv4() as UUID);
    memories.set(id, { ...memory, id });
    return id;
}`,
    },
  },
  {
    type: 'test-mock-use-model',
    severity: 'high',
    pattern: 'Mock missing useModel method',
    solution: 'Add useModel method to mock runtime',
    codeExample: {
      wrong: `const runtime = {
    language: { generateText: async () => "test" },
    // missing useModel
} as IAgentRuntime;`,
      correct: `const runtime = {
    useModel: async (modelType: ModelType, prompt: string) => "test response",
    language: { generateText: async () => "test" },
} as IAgentRuntime;`,
    },
  },
  {
    type: 'test-registration-in-plugin',
    severity: 'high',
    pattern: 'Missing test suite registration in plugin',
    solution: 'Add test suite to plugin definition',
    codeExample: {
      wrong: `const myPlugin: Plugin = {
    name: 'my-plugin',
    actions: [...],
    providers: [...],
    // missing tests
};`,
      correct: `import testSuite from "./test/test.js";

const myPlugin: Plugin = {
    name: 'my-plugin',
    actions: [...],
    providers: [...],
    tests: [testSuite],
};`,
    },
  },
  {
    type: 'test-import-extension',
    severity: 'high',
    pattern: 'Wrong import extension for test files',
    solution: 'Use .js extension when importing test files',
    codeExample: {
      wrong: `import testSuite from "./test/test.ts";
import { createMockRuntime } from "./test/utils.ts";`,
      correct: `import testSuite from "./test/test.js";
import { createMockRuntime } from "./test/utils.js";`,
    },
  },
  {
    type: 'test-suite-class-vs-object',
    severity: 'medium',
    pattern: 'Using class instead of object for test suite',
    solution: 'Use object literal for test suite, not class',
    codeExample: {
      wrong: `export class MyTestSuite implements TestSuite {
    name = 'my-test';
    tests = [...];
}`,
      correct: `export const test: TestSuite = {
    name: 'my-test',
    description: 'Test description',
    tests: [...],
};`,
    },
  },
  {
    type: 'test-memory-interface',
    severity: 'high',
    pattern: 'Incomplete Memory objects in tests',
    solution: 'Use complete Memory interface with all required fields',
    codeExample: {
      wrong: `const testMessage = {
    content: { text: "test" },
    id: "test-id"
};`,
      correct: `const testMessage: Memory = {
    id: "test-id" as UUID,
    entityId: runtime.agentId,
    agentId: runtime.agentId,
    roomId: "test-room" as UUID,
    content: { text: "test", source: "test" },
    createdAt: Date.now()
};`,
    },
  },
  {
    type: 'test-callback-missing',
    severity: 'high',
    pattern: 'Missing callback parameter in test handlers',
    solution: 'Include callback parameter in all handler tests',
    codeExample: {
      wrong: 'await action.handler(runtime, message, state);',
      correct:
        "let callbackCalled = false;\nconst callback = () => { callbackCalled = true; };\nawait action.handler(runtime, message, state, {}, callback);\nif (!callbackCalled) throw new Error('Callback not called');",
    },
  },
  {
    type: 'test-async-without-await',
    severity: 'medium',
    pattern: 'Async test functions not awaited',
    solution: 'Ensure all async operations in tests are properly awaited',
    codeExample: {
      wrong: `fn: async (runtime: IAgentRuntime) => {
    action.validate(runtime, message, state); // Missing await
}`,
      correct: `fn: async (runtime: IAgentRuntime) => {
    await action.validate(runtime, message, state);
}`,
    },
  },
  {
    type: 'test-handler-signature',
    severity: 'critical',
    pattern: 'Test handler signature does not match V2 requirements',
    solution: 'Update test handler calls to match V2 signature with all required parameters',
    codeExample: {
      wrong: 'await action.handler(runtime, message, state);',
      correct:
        "let callbackCalled = false;\nconst callback = () => { callbackCalled = true; };\nawait action.handler(runtime, message, state, {}, callback);\nif (!callbackCalled) throw new Error('Callback not called');",
    },
  },
  {
    type: 'test-mock-compose-state',
    severity: 'high',
    pattern: 'Mock runtime missing composeState method with V2 signature',
    solution: 'Add composeState method to mock runtime with enhanced signature',
    codeExample: {
      wrong: `const runtime = {
    composeState: async (message: Memory) => ({ values: {}, data: {}, text: "" }),
} as IAgentRuntime;`,
      correct: `const runtime = {
    composeState: async (message: Memory, providers?: string[], allowEmpty?: boolean) => ({ 
        values: {}, 
        data: {}, 
        text: "" 
    }),
} as IAgentRuntime;`,
    },
  },
  {
    type: 'test-model-type-usage',
    severity: 'critical',
    pattern: 'Test using ModelClass instead of ModelType',
    solution: 'Update test mocks to use ModelType instead of ModelClass',
    codeExample: {
      wrong: `useModel: async (modelClass: ModelClass, options: any) => "test"`,
      correct: `useModel: async (modelType: ModelType, options: { prompt: string }) => "test response"`,
    },
  },
];

/**
 * Get all testing patterns
 */
export function getTestingPatterns(): ArchitectureIssue[] {
  return TESTING_PATTERNS;
}

/**
 * Find testing pattern by type
 */
export function findTestingPattern(type: string): ArchitectureIssue | undefined {
  return TESTING_PATTERNS.find((pattern) => pattern.type === type);
}

/**
 * Get patterns by severity
 */
export function getTestingPatternsBySeverity(
  severity: 'critical' | 'high' | 'medium'
): ArchitectureIssue[] {
  return TESTING_PATTERNS.filter((pattern) => pattern.severity === severity);
}

/**
 * Get patterns by category
 */
export function getTestingPatternsByCategory() {
  return {
    imports: TESTING_PATTERNS.filter((p) => p.type.includes('import')),
    structure: TESTING_PATTERNS.filter(
      (p) => p.type.includes('structure') || p.type.includes('directory')
    ),
    mocking: TESTING_PATTERNS.filter((p) => p.type.includes('mock')),
    execution: TESTING_PATTERNS.filter(
      (p) => p.type.includes('command') || p.type.includes('export')
    ),
    objects: TESTING_PATTERNS.filter((p) => p.type.includes('memory') || p.type.includes('state')),
    registration: TESTING_PATTERNS.filter((p) => p.type.includes('registration')),
  };
}

/**
 * Check if code needs testing pattern fixes
 */
export function checkForTestingIssues(code: string): ArchitectureIssue[] {
  return TESTING_PATTERNS.filter((pattern) => {
    if (pattern.codeExample?.wrong) {
      // Check if code contains patterns that match the wrong examples
      const wrongPattern = pattern.codeExample.wrong.replace(/\s+/g, ' ').trim();
      const codeNormalized = code.replace(/\s+/g, ' ').trim();
      return codeNormalized.includes(wrongPattern.slice(0, 30)); // Check first 30 chars
    }
    return false;
  });
}

/**
 * Get critical testing issues that must be fixed
 */
export function getCriticalTestingIssues(): ArchitectureIssue[] {
  return TESTING_PATTERNS.filter((pattern) => pattern.severity === 'critical');
}
