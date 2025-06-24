# 🧠 ELIZAOS TEST GENERATION MASTER PROMPT

## 🚫 CRITICAL ANTI-VITEST RULES - NEVER VIOLATE

- ❌ **NEVER use vitest, jest, mocha, or any external test framework**
- ❌ **NEVER import from 'vitest', 'jest', '@testing-library', 'mocha'**
- ❌ **NEVER use describe(), it(), expect(), beforeEach(), afterEach(), test()**
- ❌ **NEVER use vi.fn(), jest.fn(), sinon.spy(), or external mocking libraries**
- ✅ **ONLY use ElizaOS native TestSuite interface from @elizaos/core**
- ✅ **ONLY use console.log() for output and throw Error() for failures**
- ✅ **ONLY use createMockRuntime() for mocking**

## 📚 ELIZAOS TEST ARCHITECTURE FOUNDATION

### Core Import Structure (EXACT PATTERN)

```typescript
import type {
  Content,
  IAgentRuntime,
  Memory,
  Plugin,
  Provider,
  Service,
  State,
  TestSuite,
  UUID,
} from '@elizaos/core';
import { MemoryType, ModelType } from '@elizaos/core';
import { v4 as uuidv4 } from 'uuid';
// Import plugin components
import pluginInstance from './index.js';
import { createMockRuntime } from './utils.js';
```

### Mock Logger Pattern (EXACT IMPLEMENTATION)

```typescript
interface MockLogFunction extends Function {
  (...args: any[]): void;
  calls: any[][];
}

const mockLogger: {
  info: MockLogFunction;
  warn: MockLogFunction;
  error: MockLogFunction;
  debug: MockLogFunction;
  success: MockLogFunction;
  clearCalls: () => void;
} = {
  info: (() => {
    const fn: any = (...args: any[]) => {
      fn.calls.push(args);
    };
    fn.calls = [];
    return fn as MockLogFunction;
  })(),
  warn: (() => {
    const fn: any = (...args: any[]) => {
      fn.calls.push(args);
    };
    fn.calls = [];
    return fn as MockLogFunction;
  })(),
  error: (() => {
    const fn: any = (...args: any[]) => {
      fn.calls.push(args);
    };
    fn.calls = [];
    return fn as MockLogFunction;
  })(),
  debug: (() => {
    const fn: any = (...args: any[]) => {
      fn.calls.push(args);
    };
    fn.calls = [];
    return fn as MockLogFunction;
  })(),
  success: (() => {
    const fn: any = (...args: any[]) => {
      fn.calls.push(args);
    };
    fn.calls = [];
    return fn as MockLogFunction;
  })(),
  clearCalls: () => {
    mockLogger.info.calls = [];
    mockLogger.warn.calls = [];
    mockLogger.error.calls = [];
    mockLogger.debug.calls = [];
    mockLogger.success.calls = [];
  },
};

// Replace global logger with mock for tests
(global as any).logger = mockLogger;
```

### createMockRuntime Pattern (COMPREHENSIVE IMPLEMENTATION)

```typescript
function createMockRuntime(overrides?: Partial<IAgentRuntime>): IAgentRuntime {
  const memories: Map<UUID, Memory> = new Map();
  const services: Map<string, Service> = new Map();

  return {
    agentId: uuidv4() as UUID,
    character: {
      name: 'Test Agent',
      bio: ['Test bio'],
      knowledge: [],
    },
    providers: [],
    actions: [],
    evaluators: [],
    plugins: [],
    services,
    events: new Map(),

    // Database methods
    async init() {},
    async close() {},
    async getConnection() {
      return null as any;
    },

    // Agent management
    async getAgent(agentId: UUID) {
      return null;
    },
    async getAgents() {
      return [];
    },
    async createAgent(agent: any) {
      return true;
    },
    async updateAgent(agentId: UUID, agent: any) {
      return true;
    },
    async deleteAgent(agentId: UUID) {
      return true;
    },
    async ensureAgentExists(agent: any) {
      return agent as any;
    },
    async ensureEmbeddingDimension(dimension: number) {},

    // Entity management
    async getEntityById(entityId: UUID) {
      return null;
    },
    async getEntitiesForRoom(roomId: UUID) {
      return [];
    },
    async createEntity(entity: any) {
      return true;
    },
    async updateEntity(entity: any) {},

    // Component management
    async getComponent(entityId: UUID, type: string) {
      return null;
    },
    async getComponents(entityId: UUID) {
      return [];
    },
    async createComponent(component: any) {
      return true;
    },
    async updateComponent(component: any) {},
    async deleteComponent(componentId: UUID) {},

    // Memory methods with sophisticated implementation
    async getMemoryById(id: UUID) {
      return memories.get(id) || null;
    },

    async getMemories(params: any) {
      const results = Array.from(memories.values()).filter((m) => {
        if (params.roomId && m.roomId !== params.roomId) return false;
        if (params.entityId && m.entityId !== params.entityId) return false;
        if (params.tableName === 'knowledge' && m.metadata?.type !== MemoryType.FRAGMENT)
          return false;
        if (params.tableName === 'documents' && m.metadata?.type !== MemoryType.DOCUMENT)
          return false;
        return true;
      });
      return params.count ? results.slice(0, params.count) : results;
    },

    async createMemory(memory: Memory, tableName: string) {
      const id = memory.id || (uuidv4() as UUID);
      const memoryWithId = { ...memory, id };
      memories.set(id, memoryWithId);
      return id;
    },

    async updateMemory(memory: any) {
      if (memory.id && memories.has(memory.id)) {
        memories.set(memory.id, { ...memories.get(memory.id)!, ...memory });
        return true;
      }
      return false;
    },

    async deleteMemory(memoryId: UUID) {
      memories.delete(memoryId);
    },

    // Service management
    getService<T extends Service>(name: string): T | null {
      return (services.get(name) as T) || null;
    },

    getAllServices() {
      return services;
    },

    async registerService(ServiceClass: typeof Service) {
      const service = await ServiceClass.start(this);
      services.set(ServiceClass.serviceType, service);
    },

    // Model methods with mocks
    async useModel(modelType: any, params: any) {
      if (modelType === ModelType.TEXT_EMBEDDING) {
        return new Array(1536).fill(0).map(() => Math.random()) as any;
      }
      if (modelType === ModelType.TEXT_LARGE || modelType === ModelType.TEXT_SMALL) {
        return `Mock response for: ${params.prompt}` as any;
      }
      return null as any;
    },

    // Plugin/provider registration
    registerProvider(provider: Provider) {
      this.providers.push(provider);
    },

    registerAction(action: any) {},
    registerEvaluator(evaluator: any) {},

    // State composition
    async composeState(message: Memory) {
      return {
        values: {},
        data: {},
        text: '',
      };
    },

    // Settings management
    setSetting(key: string, value: any) {},
    getSetting(key: string) {
      return null;
    },

    // [Include all other IAgentRuntime methods with appropriate mocks]
    ...overrides,
  } as IAgentRuntime;
}
```

## 🎯 ELIZAOS TEST CATEGORIES FRAMEWORK

### 1. Configuration & Initialization Tests

**Purpose**: Verify plugin setup, configuration loading, environment handling

```typescript
{
  name: "Should handle default configuration",
  fn: async (runtime: IAgentRuntime) => {
    // Test default config loading
    // Test environment variable handling
    // Test missing configuration scenarios
    // Verify no errors during initialization
  },
},
{
  name: "Should validate required environment variables",
  fn: async (runtime: IAgentRuntime) => {
    // Test missing API keys
    // Test invalid configuration values
    // Test configuration validation
  },
}
```

### 2. Service Lifecycle Tests

**Purpose**: Test service initialization, registration, and lifecycle management

```typescript
{
  name: "Should initialize [ServiceName] correctly",
  fn: async (runtime: IAgentRuntime) => {
    const service = await [ServiceClass].start(runtime);

    if (!service) {
      throw new Error("Service initialization failed");
    }

    if (service.capabilityDescription !== "[expected description]") {
      throw new Error("Incorrect service capability description");
    }

    // Verify service registration
    runtime.services.set([ServiceClass].serviceType as any, service);
    const retrievedService = runtime.getService([ServiceClass].serviceType);

    if (retrievedService !== service) {
      throw new Error("Service not properly registered with runtime");
    }

    await service.stop();
  },
}
```

### 3. Action Functionality Tests

**Purpose**: Test action handlers, validation, and execution

```typescript
{
  name: "Should execute [ActionName] successfully with valid parameters",
  fn: async (runtime: IAgentRuntime) => {
    // Create test message with valid parameters
    const message: Memory = {
      id: uuidv4() as UUID,
      entityId: runtime.agentId,
      agentId: runtime.agentId,
      roomId: runtime.agentId,
      content: {
        text: "[test input]",
      },
    };

    // Test action execution
    // Verify expected output
    // Validate side effects
  },
},
{
  name: "Should handle [ActionName] validation errors",
  fn: async (runtime: IAgentRuntime) => {
    // Test invalid parameters
    // Test missing required fields
    // Verify appropriate error handling
  },
}
```

### 4. Provider Integration Tests

**Purpose**: Test data providers, formatting, and state integration

```typescript
{
  name: "Should format [ProviderName] data correctly",
  fn: async (runtime: IAgentRuntime) => {
    const message: Memory = {
      id: uuidv4() as UUID,
      entityId: runtime.agentId,
      agentId: runtime.agentId,
      roomId: runtime.agentId,
      content: {
        text: "[test query]",
      },
    };

    const state: State = {
      values: {},
      data: {},
      text: "",
    };

    const result = await [providerInstance].get(runtime, message, state);

    if (!result.text) {
      throw new Error("Provider returned no text");
    }

    if (!result.text.includes("[expected content]")) {
      throw new Error("Provider output missing expected content");
    }
  },
}
```

### 5. Integration & Workflow Tests

**Purpose**: Test end-to-end workflows, component interaction

```typescript
{
  name: "End-to-end [PluginName] workflow test",
  fn: async (runtime: IAgentRuntime) => {
    // Initialize plugin
    await [pluginInstance].init!({
      [CONFIG_KEY]: "test-value",
    }, runtime);

    // Start services
    const service = await [ServiceClass].start(runtime);
    runtime.services.set([ServiceClass].serviceType as any, service);

    // Register providers
    runtime.registerProvider([providerInstance]);

    // Test complete workflow
    // 1. Data input
    // 2. Processing
    // 3. Output verification
    // 4. State management

    // Verify the complete flow
    // Check data persistence
    // Validate output format

    await service.stop();
  },
}
```

### 6. Error Handling & Edge Cases

**Purpose**: Test error scenarios, validation, recovery

```typescript
{
  name: "Should handle API failures gracefully",
  fn: async (runtime: IAgentRuntime) => {
    // Mock API failure conditions
    // Test error propagation
    // Verify graceful degradation
    // Check error logging
  },
},
{
  name: "Should validate input parameters correctly",
  fn: async (runtime: IAgentRuntime) => {
    // Test with null/undefined inputs
    // Test with invalid types
    // Test with malformed data
    // Verify appropriate error messages
  },
}
```

### 7. Performance & Resource Tests

**Purpose**: Test performance characteristics, resource usage

```typescript
{
  name: "Should handle large data sets efficiently",
  fn: async (runtime: IAgentRuntime) => {
    // Test with large input data
    // Measure processing time
    // Verify memory usage
    // Check for resource leaks
  },
},
{
  name: "Should manage concurrent requests",
  fn: async (runtime: IAgentRuntime) => {
    // Test multiple simultaneous operations
    // Verify thread safety
    // Check resource contention
  },
}
```

## 🏗️ TEST SUITE STRUCTURE TEMPLATE

```typescript
/**
 * [PluginName] Plugin Test Suite
 */
export class [PluginName]TestSuite implements TestSuite {
  name = "[plugin-name-lowercase]";
  description = "Comprehensive tests for [PluginName] plugin - [brief description]";

  tests = [
    // Configuration Tests (2-3 tests)
    {
      name: "Should handle default configuration",
      fn: async (runtime: IAgentRuntime) => {
        // Implementation
      },
    },

    // Service Lifecycle Tests (1-2 tests per service)
    {
      name: "Should initialize [ServiceName] correctly",
      fn: async (runtime: IAgentRuntime) => {
        // Implementation
      },
    },

    // Action Tests (2-3 tests per action)
    {
      name: "Should execute [ActionName] successfully",
      fn: async (runtime: IAgentRuntime) => {
        // Implementation
      },
    },

    // Provider Tests (1-2 tests per provider)
    {
      name: "Should format [ProviderName] data correctly",
      fn: async (runtime: IAgentRuntime) => {
        // Implementation
      },
    },

    // Integration Tests (1-2 comprehensive tests)
    {
      name: "End-to-end [PluginName] workflow test",
      fn: async (runtime: IAgentRuntime) => {
        // Implementation
      },
    },

    // Error Handling Tests (2-4 tests)
    {
      name: "Should handle [specific error scenario]",
      fn: async (runtime: IAgentRuntime) => {
        // Implementation
      },
    },

    // Performance Tests (1-2 tests if applicable)
    {
      name: "Should handle [performance scenario]",
      fn: async (runtime: IAgentRuntime) => {
        // Implementation
      },
    },
  ];
}

// Export patterns
export default new [PluginName]TestSuite();
```

## 🧪 TESTING PATTERNS & BEST PRACTICES

### Memory Management Testing

```typescript
// Test memory creation
const memory = await runtime.createMemory(
  {
    id: uuidv4() as UUID,
    content: { text: 'test content' },
    entityId: runtime.agentId,
    roomId: runtime.agentId,
  },
  'test_table'
);

// Verify memory persistence
const retrieved = await runtime.getMemoryById(memory);
if (!retrieved) {
  throw new Error('Memory not persisted correctly');
}
```

### Service Registration Testing

```typescript
// Register service
await runtime.registerService(ServiceClass);

// Verify registration
const service = runtime.getService(ServiceClass.serviceType);
if (!service) {
  throw new Error('Service not registered');
}

// Test service capabilities
if (typeof service.capabilityDescription !== 'string') {
  throw new Error('Service missing capability description');
}
```

### Provider State Testing

```typescript
// Test provider state integration
const state: State = {
  values: { [key]: [value] },
  data: { [key]: [data] },
  text: '[initial text]',
};

const result = await provider.get(runtime, message, state);

// Verify state modification
if (!result.values || !result.data) {
  throw new Error('Provider did not properly modify state');
}
```

### Error Scenario Testing

```typescript
// Test error conditions
try {
  await [operation with invalid input];
  throw new Error("Should have thrown error for invalid input");
} catch (error: any) {
  if (!error.message.includes("[expected error pattern]")) {
    throw new Error(`Unexpected error: ${error.message}`);
  }
}
```

### Async Operation Testing

```typescript
// Test async operations with timeouts
const startTime = Date.now();
const result = await [async operation];
const duration = Date.now() - startTime;

if (duration > 5000) {
  throw new Error("Operation took too long");
}

if (!result) {
  throw new Error("Async operation returned no result");
}
```

## 🎯 COMPONENT-SPECIFIC TEST GENERATION RULES

### Actions Testing

- **Validation Tests**: Test parameter validation, required fields
- **Execution Tests**: Test happy path with valid inputs
- **Error Tests**: Test invalid inputs, missing parameters, API failures
- **Integration Tests**: Test with real runtime and state
- **State Tests**: Verify proper state modification

### Providers Testing

- **Data Format Tests**: Verify output structure and formatting
- **State Integration Tests**: Test values/data/text modification
- **Query Tests**: Test different query types and parameters
- **Error Tests**: Test API failures, invalid queries
- **Performance Tests**: Test response time and data size

### Services Testing

- **Lifecycle Tests**: Test start(), stop(), initialization
- **Registration Tests**: Test serviceType and runtime registration
- **Capability Tests**: Test capabilityDescription and interface
- **Configuration Tests**: Test required configuration and settings
- **Integration Tests**: Test service interaction with other components

## 📋 DYNAMIC PROMPT VARIABLES

When generating tests for a specific plugin, replace these variables:

- `[PluginName]` - Proper case plugin name (e.g., "Knowledge", "Weather")
- `[plugin-name-lowercase]` - Lowercase plugin name (e.g., "knowledge", "weather")
- `[ServiceName]` - Service class name (e.g., "KnowledgeService")
- `[ServiceClass]` - Service class reference (e.g., "KnowledgeService")
- `[ActionName]` - Action name (e.g., "addKnowledge", "getWeather")
- `[ProviderName]` - Provider name (e.g., "knowledgeProvider")
- `[providerInstance]` - Provider instance reference
- `[pluginInstance]` - Plugin instance reference
- `[CONFIG_KEY]` - Configuration keys (e.g., "API_KEY", "BASE_URL")
- `[expected content]` - Expected output patterns
- `[test input]` - Appropriate test inputs
- `[specific error scenario]` - Specific error conditions to test
- `[performance scenario]` - Performance test scenarios

## 🚀 GENERATION INSTRUCTIONS

1. **Analyze Plugin Structure**: Identify all actions, providers, services
2. **Extract Component Details**: Get descriptions, parameters, functionality
3. **Apply Test Categories**: Generate appropriate tests for each category
4. **Customize Test Content**: Use actual component names and functionality
5. **Verify ElizaOS Patterns**: Ensure all tests follow ElizaOS native patterns
6. **Add Integration Tests**: Create comprehensive end-to-end workflows
7. **Include Error Scenarios**: Test realistic failure conditions
8. **Validate Test Structure**: Follow TestSuite interface exactly

## ✅ FINAL VALIDATION CHECKLIST

- [ ] Uses TestSuite interface from @elizaos/core
- [ ] No vitest/jest/external framework imports
- [ ] Uses createMockRuntime() for all mocking
- [ ] Includes mockLogger implementation
- [ ] Tests all plugin components (actions, providers, services)
- [ ] Includes configuration and lifecycle tests
- [ ] Has comprehensive error handling tests
- [ ] Includes end-to-end integration tests
- [ ] Uses proper ElizaOS patterns (Memory, State, IAgentRuntime)
- [ ] Follows exact export pattern
- [ ] Has appropriate test descriptions and names
- [ ] Uses realistic test data and scenarios
