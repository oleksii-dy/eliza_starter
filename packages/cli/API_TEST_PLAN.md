# ElizaOS Server API Test Plan

## Overview

This plan outlines comprehensive API testing for the ElizaOS server, following logical server lifecycle order and integrating with existing CLI test patterns. The tests will verify all API endpoints in realistic scenarios while maintaining compatibility with the existing test structure.

## Existing Test Infrastructure Analysis

### Current Test Structure
- **Test Framework**: Vitest with Node.js environment
- **CLI Testing Pattern**: Uses `test-utils.ts` with standardized helpers
- **Test Setup**: Temporary directories, CLI command execution via `execSync`
- **Test Location**: Split between `/test/` and `/tests/` directories
- **Character Files**: Test agents available in `tests/test-characters/`

### Key Test Utilities
- `setupTestEnvironment()` - Creates temp directories and CLI commands
- `cleanupTestEnvironment()` - Cleanup after tests
- `createTestProject()` - Creates test projects
- `runCliCommand()` / `runCliCommandSilently()` - Execute CLI commands

## API Domains to Test

Based on the server structure analysis, the following API domains need comprehensive testing:

### 1. Core Infrastructure
- **Health/Runtime**: `/server/health`, `/server/ping`, `/server/status`
- **System**: `/system/environment`

### 2. Agent Management
- **CRUD**: `/agents` (GET, POST, PUT, DELETE)
- **Lifecycle**: `/agents/{id}/start`, `/agents/{id}/stop`
- **Configuration**: Agent setup and configuration endpoints

### 3. Messaging System
- **Channels**: `/messaging/channels`
- **Core**: `/messaging/core`
- **Servers**: `/messaging/servers`

### 4. Memory Management
- **Agent Memory**: `/memory/agents`
- **Groups**: `/memory/groups` 
- **Rooms**: `/memory/rooms`

### 5. Media Handling
- **Agents**: `/media/agents`
- **Channels**: `/media/channels`
- **Uploads**: File upload handling

### 6. Audio Processing
- **Conversation**: `/audio/conversation`
- **Processing**: `/audio/processing`
- **Synthesis**: `/audio/synthesis`

### 7. TEE (Trusted Execution Environment)
- **TEE Operations**: `/tee/` endpoints

## Test Flow Design

### Logical Server Lifecycle Order

```
1. Server Startup & Health Checks
2. Agent Creation & Configuration
3. Agent Startup & Lifecycle
4. Memory Initialization
5. Communication Channel Setup
6. Message Processing
7. Media/Audio Processing (if applicable)
8. Agent Interactions & Memory Operations
9. System Monitoring & Logs
10. Agent Shutdown & Cleanup
11. Server Shutdown
```

### Integration Strategy

**Option A: Extend Existing CLI Tests** (Recommended)
- Add API testing to existing commands (e.g., `tests/commands/start.test.ts`)
- Use CLI to start server, then test APIs
- Leverage existing test infrastructure

**Option B: Separate API Test Suite**
- Create dedicated `tests/api/` directory
- Independent server lifecycle management
- More isolated but requires additional setup

## Implementation Plan

### Phase 1: Foundation
1. **Test Configuration** - API test-specific Vitest config
2. **Test Utilities** - API-specific helpers (HTTP client, server management)
3. **Test Data** - Standardized test agents, characters, and fixtures

### Phase 2: Core API Tests
1. **Health & System Tests** - Basic connectivity and status
2. **Agent Lifecycle Tests** - Complete CRUD and lifecycle operations
3. **Memory Operations** - Memory creation, retrieval, and management

### Phase 3: Advanced Features
1. **Messaging System** - Channel operations and message handling
2. **Media Processing** - File uploads and media handling
3. **Audio Processing** - Audio conversation and synthesis

### Phase 4: Integration & Performance
1. **End-to-End Workflows** - Complete user scenarios
2. **Socket.IO Testing** - Real-time communication
3. **Performance & Load Testing** - API response times and limits

## Specific Test Scenarios

### 1. Server Lifecycle Test
```typescript
describe('Server Lifecycle', () => {
  it('should start server successfully', async () => {
    // Use CLI to start server
    // Verify health endpoints respond
    // Check agent count is 0 initially
  })
  
  it('should handle graceful shutdown', async () => {
    // Call /server/stop endpoint
    // Verify server stops cleanly
  })
})
```

### 2. Agent Management Test
```typescript
describe('Agent Management', () => {
  it('should create agent from character file', async () => {
    // POST /agents with character data
    // Verify agent creation response
    // GET /agents to confirm agent exists
  })
  
  it('should start and stop agents', async () => {
    // POST /agents/{id}/start
    // Verify agent is running
    // POST /agents/{id}/stop
    // Verify agent is stopped
  })
})
```

### 3. Memory Operations Test
```typescript
describe('Memory Operations', () => {
  it('should create and retrieve memories', async () => {
    // Create agent
    // POST memory to agent
    // GET memories for agent
    // Verify memory persistence
  })
})
```

### 4. Messaging System Test
```typescript
describe('Messaging System', () => {
  it('should handle channel operations', async () => {
    // Create channels
    // Send messages
    // Verify message routing
  })
  
  it('should support real-time communication', async () => {
    // Connect via Socket.IO
    // Send/receive messages
    // Verify real-time updates
  })
})
```

### 5. Plugin Route Testing
```typescript
describe('Plugin Routes', () => {
  it('should handle agent-specific plugin routes', async () => {
    // Create agent with plugin routes
    // Test plugin route handling
    // Verify proper routing by agent ID
  })
})
```

## Test Data & Fixtures

### Standard Test Characters
- Use existing characters from `tests/test-characters/`
- Create additional specialized test characters for specific scenarios

### Test Agents Configuration
```json
{
  "name": "TestAgent",
  "system": "Test agent for API testing",
  "bio": ["API testing agent"],
  "messageExamples": [
    [{"user": "user", "content": {"text": "Hello"}}],
    [{"user": "assistant", "content": {"text": "Hi there!"}}]
  ],
  "style": {
    "all": ["helpful", "concise"]
  }
}
```

### Test Environment Setup
```typescript
interface APITestContext extends TestContext {
  serverUrl: string;
  httpClient: AxiosInstance;
  agentId?: UUID;
  socketClient?: Socket;
}
```

## Integration with Existing Tests

### Extend CLI Command Tests
1. **start.test.ts** - Add API connectivity tests after server start
2. **agent.test.ts** - Add API-based agent operations alongside CLI commands
3. **create.test.ts** - Verify created projects have working APIs

### Shared Test Configuration
```typescript
// tests/api/api-test-utils.ts
export interface APITestConfig {
  baseUrl: string;
  timeout: number;
  retryAttempts: number;
}

export async function setupAPITestEnvironment(): Promise<APITestContext> {
  const cliContext = await setupTestEnvironment();
  // Start server via CLI
  // Wait for server to be ready
  // Return enhanced context with API capabilities
}
```

## Test Implementation Structure

```
tests/
├── api/
│   ├── api-test-utils.ts           # API-specific test utilities
│   ├── fixtures/                   # Test data and characters
│   │   ├── test-agents.json
│   │   └── test-messages.json
│   ├── integration/                # End-to-end API tests
│   │   ├── server-lifecycle.test.ts
│   │   ├── agent-management.test.ts
│   │   ├── messaging-system.test.ts
│   │   └── memory-operations.test.ts
│   ├── unit/                      # Individual endpoint tests
│   │   ├── health.test.ts
│   │   ├── agents-crud.test.ts
│   │   ├── memory-api.test.ts
│   │   └── media-api.test.ts
│   └── performance/               # Load and performance tests
│       ├── api-performance.test.ts
│       └── concurrent-agents.test.ts
└── commands/                      # Enhanced existing CLI tests
    ├── start.test.ts             # Add API testing after server start
    ├── agent.test.ts             # Add API operations
    └── ...
```

## Success Criteria

1. **Complete API Coverage** - All documented endpoints tested
2. **Realistic Scenarios** - Tests follow actual user workflows
3. **Integration** - Seamless integration with existing CLI tests
4. **Reliability** - Tests are stable and reproducible
5. **Performance** - API response time validation
6. **Error Handling** - Comprehensive error scenario testing
7. **Documentation** - Clear test documentation and examples

## Test Data Management

### Character Management
- Reuse existing test characters where possible
- Create specialized characters for specific API features
- Ensure character files are properly formatted and valid

### Memory & Message Fixtures
- Standardized test messages for different scenarios
- Memory test data for various types (conversation, knowledge, etc.)
- File upload test fixtures for media endpoints

### Environment Configuration
- Test-specific environment variables
- Database configuration for isolated testing
- Network configuration for API testing

This comprehensive plan ensures thorough testing of all ElizaOS server APIs while maintaining integration with the existing CLI test infrastructure and following logical server lifecycle patterns.