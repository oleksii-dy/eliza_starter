import type { PromptChunk, ImportMapping, ModelTypeMapping, ArchitectureIssue, TestingPattern } from './types.js';

/**
 * Critical import mappings from the mega prompt and plugin-news analysis
 */
export const IMPORT_MAPPINGS: ImportMapping[] = [
  {
    oldImport: 'ModelClass',
    newImport: 'ModelType',
    description: 'ModelClass is renamed to ModelType in V2',
  },
  {
    oldImport: 'elizaLogger',
    newImport: 'logger',
    description: 'elizaLogger is renamed to logger in V2',
  },
  {
    oldImport: /user:\s*["']{{user\d+}}["']/g,
    newImport: 'name: "{{user1}}"',
    description: 'ActionExample field "user" renamed to "name"',
  },
  // Type-only import patterns
  {
    oldImport: /import\s+{\s*type\s+(\w+)\s*}/g,
    newImport: 'import type { $1 }',
    description: 'Convert to type-only imports for better V2 compatibility',
  },
  {
    oldImport: /import\s+{\s*([^,]+),\s*type\s+([^}]+)\s*}/g,
    newImport: 'import { $1 } from "@elizaos/core";\nimport type { $2 } from "@elizaos/core"',
    description: 'Separate type imports from value imports',
  },
  // Specific type imports that must be separated
  {
    oldImport: '{ Service, type IAgentRuntime }',
    newImport: '{ Service } from "@elizaos/core";\nimport type { IAgentRuntime }',
    description: 'Separate Service import from type imports',
  },
  {
    oldImport: '{ Memory, type IAgentRuntime }',
    newImport: '{ Memory } from "@elizaos/core";\nimport type { IAgentRuntime }',
    description: 'Separate Memory import from type imports',
  },
  // Additional specific import patterns from plugin-news
  {
    oldImport: '{ TestSuite }',
    newImport: 'type { TestSuite }',
    description: 'TestSuite is type-only export in V2',
  },
  {
    oldImport: '{ AgentTest }',
    newImport: '',
    description: 'AgentTest does not exist in V2 - remove',
  },
  {
    oldImport: '{ ActionExample, Content }',
    newImport: 'type { ActionExample, Content }',
    description: 'Both are type-only exports in V2',
  },
  {
    oldImport: '{ State, Memory }',
    newImport: '{ Memory } from "@elizaos/core";\nimport type { State }',
    description: 'Memory is value, State is type-only',
  },
  {
    oldImport: '{ HandlerCallback, IAgentRuntime }',
    newImport: 'type { HandlerCallback, IAgentRuntime }',
    description: 'Both are type-only exports',
  },
  {
    oldImport: '{ Service, type IAgentRuntime, type ServiceType }',
    newImport: '{ Service } from "@elizaos/core";\nimport type { IAgentRuntime, ServiceType }',
    description: 'Service is value, others are types',
  },
];

/**
 * Model type mappings from the mega prompt and plugin-news analysis
 */
export const MODEL_TYPE_MAPPINGS: ModelTypeMapping[] = [
  { v1: 'ModelClass.SMALL', v2: 'ModelType.TEXT_SMALL', description: 'Small text model' },
  { v1: 'ModelClass.LARGE', v2: 'ModelType.TEXT_LARGE', description: 'Large text model' },
  { v1: 'ModelClass', v2: 'ModelType', description: 'Class renamed to Type' },
  { v1: 'stop', v2: 'stopSequences', description: 'Parameter name change' },
  { v1: 'max_tokens', v2: 'maxTokens', description: 'Parameter name change' },
  { v1: 'frequency_penalty', v2: 'frequencyPenalty', description: 'Parameter name change' },
  { v1: 'context', v2: 'prompt', description: 'Context parameter renamed to prompt in useModel' },
  { v1: 'model:', v2: '', description: 'Model type passed as first argument, not in options' },
  // Method changes
  { v1: 'runtime.language.generateText', v2: 'runtime.useModel', description: 'API method change' },
  { v1: 'runtime.messageManager.createMemory', v2: 'runtime.createMemory', description: 'Memory API change' },
  { v1: 'runtime.memory.create', v2: 'runtime.createMemory', description: 'Memory API change' },
  // Additional mappings from plugin-news
  { v1: 'presence_penalty', v2: 'presencePenalty', description: 'Parameter name change' },
  { v1: 'top_p', v2: 'topP', description: 'Parameter name change' },
  { v1: 'response_format', v2: 'responseFormat', description: 'Parameter name change' },
  { v1: 'seed', v2: 'seed', description: 'Parameter remains the same' },
  { v1: 'user', v2: 'name', description: 'ActionExample field name change' },
  { v1: 'role', v2: 'name', description: 'Message role field renamed' },
  { v1: 'Account', v2: 'Entity', description: 'Type renamed' },
  { v1: 'userId', v2: 'entityId', description: 'Field renamed' },
  { v1: 'accountId', v2: 'entityId', description: 'Field renamed' },
];

/**
 * Critical architecture issues from the mega prompt and plugin-news analysis
 */
export const ARCHITECTURE_ISSUES: ArchitectureIssue[] = [
  {
    type: 'missing-service',
    severity: 'critical',
    pattern: 'Missing Service Layer',
    solution: 'Create Service class extending base Service with lifecycle methods',
    codeExample: {
      wrong: `export const myPlugin: Plugin = {
    name: "plugin-name",
    actions: actions,
    evaluators: [] // Outdated pattern
};`,
      correct: `export class MyService extends Service {
    static serviceType: string = 'my-service';
    
    constructor(runtime: IAgentRuntime) {
        super(runtime);
    }
    
    static async start(runtime: IAgentRuntime) {
        const service = new MyService(runtime);
        return service;
    }
    
    async stop(): Promise<void> {
        // Cleanup resources
    }
    
    get capabilityDescription(): string {
        return 'Service capability description';
    }
}

const myPlugin: Plugin = {
    name: 'my-plugin',
    description: 'Plugin description',
    services: [MyService],
    actions: [...],
    providers: [...],
    tests: [...],
    init: async (config, runtime) => {
        // Initialization logic
    }
};`,
    },
  },
  {
    type: 'import-incompatibility',
    severity: 'critical',
    pattern: "Wrong import names that don't exist in V2",
    solution: 'Update imports to V2 names and add type prefix for interfaces',
    codeExample: {
      wrong: `import {
    ActionExample,
    ModelClass,
    Content,
} from "@elizaos/core";`,
      correct: `import {
    type ActionExample,
    ModelType,
    type Content,
} from "@elizaos/core";`,
    },
  },
  {
    type: 'broken-handler',
    severity: 'critical',
    pattern: 'Wrong handler signature',
    solution: 'Update handler to correct V2 signature without Promise<boolean> return',
    codeExample: {
      wrong: `handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State | undefined,
    options: { [key: string]: unknown; } = {},
    callback?: HandlerCallback
): Promise<boolean> => { ... }`,
      correct: `handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State,
    _options: { [key: string]: unknown },
    callback: HandlerCallback
) => {
    // Handler logic
    const content: Content = {
        text: "Response text",
        source: 'my-plugin'
    };
    callback(content);
}`,
    },
  },
  {
    type: 'memory-pattern',
    severity: 'critical',
    pattern: 'Wrong memory creation pattern',
    solution: 'Use runtime.createMemory with proper structure',
    codeExample: {
      wrong: `await runtime.messageManager.createMemory(memory);
// or
await _runtime.memory.create({
    tableName: 'messages',
    data: { ... }
});`,
      correct: `await runtime.createMemory({
    id: createUniqueUuid(runtime, \`my-action-\${Date.now()}\`),
    entityId: message.entityId,
    agentId: runtime.agentId,
    roomId: message.roomId,
    content: {
        text: responseText,
        source: 'my-plugin',
    },
    metadata: {
        type: 'action_response',
        actionName: "MY_ACTION"
    },
    createdAt: Date.now()
}, 'messages');`,
    },
  },
  {
    type: 'provider-interface',
    severity: 'high',
    pattern: 'Custom provider interface',
    solution: 'Use standard Provider interface',
    codeExample: {
      wrong: `export interface CustomProvider {
    type: string;
    initialize: (runtime: IAgentRuntime) => Promise<void>;
    get: (runtime: IAgentRuntime, message?: Memory) => Promise<CustomState>;
    validate: (runtime: IAgentRuntime, message?: Memory) => Promise<boolean>;
}`,
      correct: `export const myStateProvider: Provider = {
    name: 'myState',
    get: async (runtime: IAgentRuntime, message: Memory, state: State) => {
        const myService = runtime.getService('my-service') as MyService;
        
        return {
            data: {
                isInitialized: myService.isInitialized(),
                status: myService.getStatus()
            },
            values: {
                serviceStatus: myService.getStatus() || 'Not initialized'
            },
            text: \`Service status: \${myService.getStatus() || 'Not initialized'}\`
        };
    }
};`,
    },
  },
  {
    type: 'config-validation',
    severity: 'high',
    pattern: 'Zod validation errors for numeric environment variables',
    solution: 'Use z.coerce.number() for numeric fields that come from environment variables',
    codeExample: {
      wrong: `export const ConfigSchema = z.object({
    MAX_FILE_SIZE: z.number(), // Will fail with NaN from env vars
    TIMEOUT: z.number().optional(),
    MAX_RESULTS: z.number().default(10), // Will fail
});`,
      correct: `export const ConfigSchema = z.object({
    MAX_FILE_SIZE: z.coerce.number().default(10485760), // 10MB default
    TIMEOUT: z.coerce.number().optional(),
    MAX_RESULTS: z.coerce.number().default(10), // Coerce string to number
    // For required numbers without defaults:
    REQUIRED_NUMBER: z.coerce.number().min(1),
});`,
    },
  },
  // Test-specific issues from plugin-news analysis
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
    type: 'service-registration',
    severity: 'medium',
    pattern: 'Manual service registration in init',
    solution: 'Services are automatically registered from services array in V2',
    codeExample: {
      wrong: `init: async (_config: Record<string, string>, runtime: IAgentRuntime) => {
    runtime.registerService(NewsService);
},`,
      correct: `init: async (_config: Record<string, string>, _runtime: IAgentRuntime) => {
    // Services are automatically registered from the services array
},`,
    },
  },
  // Additional test-specific patterns from plugin-news migration
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
    type: 'action-example-role',
    severity: 'high',
    pattern: 'Using role instead of name in ActionExample',
    solution: 'ActionExample must use name field not role',
    codeExample: {
      wrong: `examples: [
    [
        {
            role: "user",
            content: { text: "example" }
        }
    ]
]`,
      correct: `examples: [
    [
        {
            name: "user",
            content: { text: "example" }
        }
    ]
]`,
    },
  },
  {
    type: 'config-field-visibility',
    severity: 'medium',
    pattern: 'Private config field in service',
    solution: 'Make config field public for test access',
    codeExample: {
      wrong: `export class MyService extends Service {
    private config: MyConfig;
}`,
      correct: `export class MyService extends Service {
    public config: MyConfig;
}`,
    },
  },
  {
    type: 'handler-options-type',
    severity: 'high',
    pattern: 'Wrong options parameter type in handler',
    solution: 'Use proper TypeScript type for options parameter',
    codeExample: {
      wrong: `handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State,
    _options: any, // Wrong
    callback: HandlerCallback
)`,
      correct: `handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State,
    _options: { [key: string]: unknown }, // Correct
    callback: HandlerCallback
)`,
    },
  },
];

/**
 * Break down the mega prompt into executable chunks
 */
export function parseIntoChunks(): PromptChunk[] {
  return [
    {
      id: 'phase1-file-structure',
      title: 'Phase 1: Outside Structure & Build System Migration',
      phase: 'file-structure-migration',
      content: `Update package.json to V2 structure with proper exports, repository info, and scripts.
Remove V1 configuration files (biome.json, vitest.config.ts, jest.config.js).
Update tsconfig.json and create tsconfig.build.json.
Update tsup.config.ts for proper ESM build.
Create CI/CD pipeline (.github/workflows/npm-deploy.yml).
Create images structure with README.md.
Update .gitignore and create .npmignore.`,
      criticalPoints: [
        'Package must be type: "module"',
        'Use ESM exports in package.json',
        'Remove all V1 test configs',
        'Create build-specific tsconfig',
        'Package name must follow @elizaos/plugin-{name} pattern',
      ],
    },
    {
      id: 'phase2-service-layer',
      title: 'Phase 2: Service Layer Creation',
      phase: 'core-structure-migration',
      content: `Create Service class extending base Service.
Implement static serviceType property.
Implement static start() method.
Implement stop() method for cleanup.
Implement capabilityDescription getter.
Add proper constructor with runtime parameter.`,
      criticalPoints: [
        'Only if plugin requires service',
        'Must extend base Service class',
        'Proper lifecycle methods required',
        'Service registration in plugin definition',
        'Remove explicit ServiceType annotation',
      ],
    },
    {
      id: 'phase3-configuration',
      title: 'Phase 3: Configuration Migration',
      phase: 'configuration-migration',
      content: `Create config.ts with Zod validation.
Replace environment.ts usage.
Use runtime.getSetting() for configuration.
Add validation at plugin init.
Use z.coerce.number() for numeric environment variables.`,
      criticalPoints: [
        'Use Zod for schema validation',
        'runtime.getSetting() instead of process.env',
        'Validate config in service constructor',
        'Use z.coerce.number() for ALL numeric fields from env',
      ],
    },
    {
      id: 'phase4-file-migration',
      title: 'Phase 4: File-by-File Code Migration',
      phase: 'actions-migration',
      content: `Process each file completely before moving to the next.
Migrate service files if they exist.
Migrate all action files with V2 patterns.
Migrate provider files to standard interface.
Update all imports and fix all V1 patterns.
Fix all type imports to use type-only syntax.
Update all model API calls.
Fix all parameter names.`,
      criticalPoints: [
        'Process files one by one',
        'Fix all issues in each file completely',
        'Don\'t edit service if not needed',
        'Clean up unnecessary files after migration',
        'Separate type imports from value imports',
        'Use runtime.useModel not language.generateText',
        'Update all ActionExample role to name',
      ],
    },
    {
      id: 'phase5-testing',
      title: 'Phase 5: Test Infrastructure Creation',
      phase: 'testing-infrastructure',
      content: `Delete V1 __tests__ directory completely.
Delete all V1 test configurations.
Create V2 test structure (src/test/).
Copy utils.ts from plugin-coinmarketcap.
Create comprehensive test suite.
Register test suite in plugin definition.
Fix all test type imports.
Update mock runtime for V2.`,
      criticalPoints: [
        'V1 __tests__/ → V2 src/test/',
        'Follow plugin-coinmarketcap structure EXACTLY',
        'Use createMemory not memory.create in mocks',
        'No stubs - full implementation',
        'TestSuite is type-only import',
        'Add useModel to mock runtime',
        'Create proper State objects',
      ],
    },
    {
      id: 'phase6-documentation',
      title: 'Phase 6: Documentation Structure',
      phase: 'documentation-assets',
      content: `Create comprehensive README.md.
Add images/ directory with required assets.
Document configuration requirements.
Document usage examples.
Add development instructions.
Update package name in all documentation.`,
      criticalPoints: [
        'Include installation instructions',
        'Document all environment variables',
        'Add usage examples',
        'Include development commands',
        'Use correct @elizaos/plugin-{name} pattern',
      ],
    },
  ];
}

/**
 * Get critical patterns to avoid
 */
export function getCriticalPatternsToAvoid(): string[] {
  return [
    'Do NOT store complex objects in Memory',
    'Do NOT use custom error classes',
    'Do NOT perform direct file operations',
    'Do NOT skip entity/room management',
    'Do NOT add non-standard fields to Content interface',
    'Do NOT use vitest - only elizaos test',
    'Do NOT create temporary files for iteration',
    'Do NOT mix type and value imports',
    'Do NOT use empty objects as State',
    'Do NOT forget to add source field to Content',
    'Do NOT use role in ActionExample - use name',
  ];
}

/**
 * Get V2 code quality standards
 */
export function getCodeQualityStandards(): string[] {
  return [
    'Use double quotes consistently',
    'Proper parameter formatting with line breaks',
    'Consistent trailing commas',
    'Group type imports together',
    'Run npm run format after changes',
    'Separate type imports from value imports',
    'Use proper State objects instead of empty objects',
    'Add null safety with optional chaining',
  ];
}

/**
 * Get success metrics checklist
 */
export function getSuccessMetrics(): string[] {
  return [
    'Clean build with no TypeScript errors',
    'All imports and exports type correctly',
    'Service registers and starts correctly',
    'Actions validate and execute properly',
    'Tests pass with elizaos test',
    'Memory operations use V2 patterns',
    'No custom Content fields',
    'All type imports use type-only syntax',
    'No mixed value/type imports',
    'Zod schemas use coerce for numeric env vars',
  ];
}

/**
 * Get testing patterns from the mega prompt
 */
export function getTestingPatterns(): TestingPattern[] {
  return [
    {
      name: 'ElizaOS Test Framework',
      template: 'elizaos test',
      requiredImports: [
        '@elizaos/core',
        './utils',
        '../index'
      ],
    },
    {
      name: 'Test File Templates',
      template: 'Use exact utils.ts and dynamic test.ts templates',
      requiredImports: [
        '@elizaos/core',
        './utils',
        '../index',
        'uuid'
      ],
    },
    {
      name: 'V2 Test Structure',
      template: 'src/test/ directory with utils.ts and test.ts',
      requiredImports: [
        'import type { TestSuite } from "@elizaos/core"',
        'import type { IAgentRuntime } from "@elizaos/core"',
      ],
    },
  ];
}

/**
 * Get file cleanup patterns
 */
export function getFileCleanupPatterns(): string[] {
  return [
    '__tests__/',
    'test/',
    'src/tests/',
    'vitest.config.ts',
    'vitest.config.mjs',
    'jest.config.js',
    'jest.config.ts',
    'biome.json',
    '.eslintrc.js',
    '.eslintrc.json',
    '.eslintignore',
    '.prettierrc',
    '.prettierrc.js',
    '.prettierrc.json',
    '.prettierignore',
    'environment.ts',
    'src/environment.ts',
    'environment.d.ts',
    '.env.example',
    '.env.template',
    'CHANGELOG.md',
    'CONTRIBUTING.md',
    '*.bak',
    '*.orig',
    // Additional patterns from plugin-news
    'lib/',
    'vendor/',
    'yarn.lock',
    'package-lock.json',
    'pnpm-lock.yaml',
    '.turbo/',
    'dist/',
    'build/',
    '*.tsbuildinfo',
    '.turbo-tsconfig.json',
    'coverage/',
    '*.lcov',
    '*.eliza',
    '*.elizadb',
    // V1 nested action directories
    'src/actions/*/',
    // Old test patterns
    '**/*.test.ts',
    '**/*.spec.ts',
    '**/*.test.js',
    '**/*.spec.js',
  ];
}
