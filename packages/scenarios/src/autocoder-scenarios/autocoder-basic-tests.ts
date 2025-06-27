import type { Scenario, ScenarioSuite } from '../types.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Basic AutoCoder functionality tests
 * Tests core capabilities of the elizaos code command
 */

export const autocoderBasicCodeGeneration: Scenario = {
  id: 'autocoder-basic-code-generation',
  name: 'AutoCoder Basic Code Generation',
  description: 'Test AutoCoder ability to generate simple TypeScript functions with proper testing',
  category: 'autocoder',
  tags: ['autocoder', 'code-generation', 'typescript', 'basic'],
  
  actors: [
    {
      id: uuidv4(),
      name: 'AutoCoder',
      role: 'subject',
      plugins: ['@elizaos/plugin-sql', '@elizaos/plugin-planning'],
      personality: {
        traits: ['analytical', 'detail-oriented', 'methodical'],
        systemPrompt: 'You are an expert AutoCoder agent. Generate high-quality, production-ready code with comprehensive tests.',
      },
    },
    {
      id: uuidv4(),
      name: 'Developer',
      role: 'observer',
    },
  ],

  setup: {
    roomType: 'dm',
    context: 'AutoCoder is helping generate a utility function for data processing',
    initialMessages: [
      {
        id: uuidv4(),
        content: 'Create a TypeScript function that validates email addresses using regex and returns boolean. Include comprehensive unit tests.',
        sender: 'Developer',
        timestamp: Date.now(),
      },
    ],
  },

  execution: {
    maxDuration: 60000, // 1 minute
    maxSteps: 10,
    timeout: 30000,
    realApiCallsExpected: true,
  },

  verification: {
    rules: [
      {
        id: 'code-generated',
        type: 'llm-evaluation',
        description: 'Verify TypeScript function was generated',
        config: {
          successCriteria: [
            'Generated a TypeScript function for email validation',
            'Function uses proper regex pattern',
            'Function returns boolean type',
            'Code is syntactically correct',
          ],
          requiredKeywords: ['function', 'email', 'boolean', 'regex'],
          llmEnhancement: true,
        },
      },
      {
        id: 'tests-included',
        type: 'llm-evaluation',
        description: 'Verify unit tests were provided',
        config: {
          successCriteria: [
            'Unit tests are comprehensive',
            'Tests cover valid email cases',
            'Tests cover invalid email cases',
            'Tests use proper testing framework syntax',
          ],
          requiredKeywords: ['test', 'expect', 'describe', 'it'],
          llmEnhancement: true,
        },
      },
      {
        id: 'artifact-stored',
        type: 'storage-verification',
        description: 'Verify code was stored as artifact',
        config: {
          expectedValue: 'code artifact created',
          category: 'artifact-storage',
        },
      },
    ],
  },

  benchmarks: {
    maxDuration: 60000,
    maxSteps: 10,
    targetAccuracy: 0.9,
    customMetrics: [
      {
        name: 'code_quality_score',
        threshold: 8.0,
        target: 'high-quality TypeScript code',
      },
      {
        name: 'test_coverage_completeness',
        threshold: 0.8,
        target: 'comprehensive test cases',
      },
    ],
  },
};

export const autocoderApiIntegration: Scenario = {
  id: 'autocoder-api-integration',
  name: 'AutoCoder API Integration',
  description: 'Test AutoCoder ability to create API integration code with error handling',
  category: 'autocoder',
  tags: ['autocoder', 'api', 'integration', 'error-handling'],
  
  actors: [
    {
      id: uuidv4(),
      name: 'AutoCoder',
      role: 'subject',
      plugins: ['@elizaos/plugin-sql', '@elizaos/plugin-planning'],
    },
    {
      id: uuidv4(),
      name: 'DevOps Engineer',
      role: 'observer',
    },
  ],

  setup: {
    roomType: 'dm',
    context: 'AutoCoder is creating an API client for external service integration',
    initialMessages: [
      {
        id: uuidv4(),
        content: 'Create a TypeScript class for a REST API client that fetches user data from /api/users/{id}. Include retry logic, error handling, and TypeScript interfaces for the response.',
        sender: 'DevOps Engineer',
        timestamp: Date.now(),
      },
    ],
  },

  execution: {
    maxDuration: 120000, // 2 minutes
    maxSteps: 15,
    timeout: 45000,
    realApiCallsExpected: true,
  },

  verification: {
    rules: [
      {
        id: 'api-client-class',
        type: 'llm-evaluation',
        description: 'Verify API client class was created',
        config: {
          successCriteria: [
            'Created TypeScript class for API client',
            'Includes method for fetching user by ID',
            'Uses proper HTTP methods',
            'Includes TypeScript interfaces',
          ],
          requiredKeywords: ['class', 'async', 'fetch', 'interface'],
          llmEnhancement: true,
        },
      },
      {
        id: 'error-handling',
        type: 'llm-evaluation',
        description: 'Verify proper error handling implementation',
        config: {
          successCriteria: [
            'Includes try-catch blocks',
            'Handles network errors',
            'Handles HTTP error responses',
            'Provides meaningful error messages',
          ],
          requiredKeywords: ['try', 'catch', 'error', 'throw'],
          llmEnhancement: true,
        },
      },
      {
        id: 'retry-logic',
        type: 'llm-evaluation',
        description: 'Verify retry logic implementation',
        config: {
          successCriteria: [
            'Implements retry mechanism',
            'Has configurable retry attempts',
            'Includes exponential backoff or delay',
            'Properly handles final failure',
          ],
          requiredKeywords: ['retry', 'attempt', 'delay', 'backoff'],
          llmEnhancement: true,
        },
      },
    ],
  },

  benchmarks: {
    maxDuration: 120000,
    maxSteps: 15,
    targetAccuracy: 0.85,
    customMetrics: [
      {
        name: 'code_completeness',
        threshold: 0.9,
        target: 'complete API client implementation',
      },
      {
        name: 'error_handling_robustness',
        threshold: 0.8,
        target: 'comprehensive error handling',
      },
    ],
  },
};

export const autocoderFileOrganization: Scenario = {
  id: 'autocoder-file-organization',
  name: 'AutoCoder File Organization',
  description: 'Test AutoCoder ability to organize code into proper file structure',
  category: 'autocoder',
  tags: ['autocoder', 'file-structure', 'organization', 'best-practices'],
  
  actors: [
    {
      id: uuidv4(),
      name: 'AutoCoder',
      role: 'subject',
      plugins: ['@elizaos/plugin-sql', '@elizaos/plugin-planning'],
    },
    {
      id: uuidv4(),
      name: 'Tech Lead',
      role: 'observer',
    },
  ],

  setup: {
    roomType: 'dm',
    context: 'AutoCoder is creating a modular user management system',
    initialMessages: [
      {
        id: uuidv4(),
        content: 'Create a user management system with the following components: User model, UserService class, UserController, and UserRepository. Organize these into a proper file structure with index.ts exports.',
        sender: 'Tech Lead',
        timestamp: Date.now(),
      },
    ],
  },

  execution: {
    maxDuration: 180000, // 3 minutes
    maxSteps: 20,
    timeout: 60000,
    realApiCallsExpected: true,
  },

  verification: {
    rules: [
      {
        id: 'proper-file-structure',
        type: 'llm-evaluation',
        description: 'Verify proper file organization',
        config: {
          successCriteria: [
            'Created separate files for each component',
            'Files are organized in logical directories',
            'Includes proper index.ts exports',
            'Follows naming conventions',
          ],
          requiredKeywords: ['models/', 'services/', 'controllers/', 'repositories/', 'index.ts'],
          llmEnhancement: true,
        },
      },
      {
        id: 'component-separation',
        type: 'llm-evaluation',
        description: 'Verify proper separation of concerns',
        config: {
          successCriteria: [
            'User model contains only data structure',
            'UserService contains business logic',
            'UserController handles HTTP requests',
            'UserRepository handles data access',
          ],
          requiredKeywords: ['interface', 'class', 'export', 'import'],
          llmEnhancement: true,
        },
      },
      {
        id: 'multiple-artifacts',
        type: 'storage-verification',
        description: 'Verify multiple code artifacts were created',
        config: {
          expectedValue: 'multiple code artifacts stored',
          category: 'artifact-storage',
          minMessages: 4, // At least 4 files should be created
        },
      },
    ],
  },

  benchmarks: {
    maxDuration: 180000,
    maxSteps: 20,
    targetAccuracy: 0.8,
    customMetrics: [
      {
        name: 'architecture_quality',
        threshold: 0.85,
        target: 'well-organized modular architecture',
      },
      {
        name: 'file_organization_score',
        threshold: 0.9,
        target: 'proper file structure and naming',
      },
    ],
  },
};

export const autocoderBasicTestSuite: ScenarioSuite = {
  name: 'AutoCoder Basic Test Suite',
  description: 'Comprehensive basic tests for AutoCoder functionality',
  scenarios: [
    autocoderBasicCodeGeneration,
    autocoderApiIntegration,
    autocoderFileOrganization,
  ],
};