# ElizaOS API Integration Tests

This directory contains comprehensive API integration tests for the ElizaOS server. The tests follow logical server lifecycle patterns and validate all major API endpoints.

## Structure

```
tests/api/
├── README.md                     # This file
├── api-test-utils.ts            # Core testing utilities
├── fixtures/                    # Test data and configurations
│   ├── test-characters.json     # Character configurations for testing
│   └── test-messages.json       # Message test scenarios
└── integration/                 # Integration test suites
    ├── server-lifecycle.test.ts # Server startup, health, shutdown
    ├── agent-management.test.ts # Agent CRUD and lifecycle
    ├── messaging-system.test.ts # Messaging and communication
    └── memory-operations.test.ts # Memory management and persistence
```

## Running Tests

### API Tests Only
```bash
npm run test:api
```

### API Tests with Coverage
```bash
npm run test:api:coverage
```

### CLI Tests (existing)
```bash
npm run test:cli
```

### All Tests
```bash
npm run test
```

## Test Configuration

- **Test Framework**: Vitest
- **Environment**: Node.js with test-specific configurations
- **Server Management**: Automatic server startup/shutdown per test suite
- **Timeout**: 2 minutes for server startup, 30 seconds for cleanup
- **Isolation**: Sequential execution to avoid port conflicts

## Test Utilities

### Core Functions

- `setupAPITestEnvironment()` - Creates test environment with running server
- `cleanupAPITestEnvironment()` - Stops server and cleans up resources
- `createTestAgent()` - Creates test agents via API
- `startTestAgent()` / `stopTestAgent()` - Agent lifecycle management
- `sendMessageToAgent()` - Send test messages
- `getAgentMemories()` - Retrieve agent memories
- `waitForCondition()` - Polling utility for async operations

### Assertions

- `apiAssertions.hasStatus()` - Validate HTTP status codes
- `apiAssertions.hasDataStructure()` - Validate response structure
- `apiAssertions.isSuccessful()` - Check for successful responses
- `apiAssertions.hasError()` - Validate error responses
- `apiAssertions.agentListContains()` - Check agent presence in lists

## Test Scenarios

### 1. Server Lifecycle Tests
- Server startup and health checks
- Basic connectivity and status endpoints
- Error handling and CORS validation
- Rate limiting and security headers
- Performance benchmarks

### 2. Agent Management Tests
- Agent CRUD operations (Create, Read, Update, Delete)
- Agent lifecycle (Start, Stop, Restart)
- Multiple agent management
- Character configuration
- Error scenarios

### 3. Messaging System Tests
- Channel creation and management
- Message sending and receiving
- Multi-agent communication
- Message history and persistence
- Real-time communication
- Error handling

### 4. Memory Operations Tests
- Memory creation through interactions
- Direct memory management
- Memory retrieval and filtering
- Memory types and categories
- Persistence across restarts
- Concurrent operations

## Test Data

### Character Fixtures
The `fixtures/test-characters.json` file contains predefined character configurations:

- **basicTestAgent** - Simple, predictable responses
- **conversationalAgent** - Natural dialogue patterns
- **memoryTestAgent** - Enhanced memory operations
- **multimediaAgent** - Media processing capabilities
- **errorTestAgent** - Error scenario testing

### Message Fixtures
The `fixtures/test-messages.json` file contains test message scenarios:

- **basic** - Simple greetings and identity queries
- **memory** - Memory creation and retrieval tests
- **conversation** - Topic-based dialogue
- **multimedia** - Media attachment handling
- **error_scenarios** - Edge cases and error conditions
- **performance** - Response time validation
- **context** - Multi-turn conversations
- **agent_interaction** - Multi-agent scenarios

## Environment Configuration

### Required Environment Variables
```bash
NODE_ENV=test
PORT=3000
LOG_LEVEL=error
DISABLE_TELEMETRY=true
DISABLE_ANALYTICS=true
```

### Test-Specific Settings
- Database: SQLite in-memory for isolation
- Logging: Error level only to reduce noise
- Timeouts: Extended for server operations
- Rate Limiting: Disabled or relaxed for testing

## Best Practices

### Test Organization
1. **Setup**: Create clean test environment per suite
2. **Execution**: Follow logical server lifecycle order
3. **Cleanup**: Always clean up resources after tests
4. **Isolation**: Each test should be independent

### Error Handling
1. **Graceful Failures**: Tests handle server startup failures
2. **Cleanup on Error**: Resources cleaned up even on test failures
3. **Informative Messages**: Clear error messages for debugging
4. **Retry Logic**: Network-related operations have retry capability

### Performance
1. **Sequential Execution**: Prevents port conflicts
2. **Resource Management**: Proper cleanup prevents memory leaks
3. **Timeout Management**: Appropriate timeouts for different operations
4. **Concurrent Operations**: Where safe, operations run in parallel

## Debugging

### Enable Debug Output
```bash
DEBUG_API_TESTS=true npm run test:api
```

### Common Issues

1. **Port Conflicts**: Ensure no other servers on port 3000
2. **Timeouts**: Server startup can take time on slower systems
3. **Dependencies**: Ensure all required packages are installed
4. **Permissions**: Check file system permissions for temp directories

### Log Analysis
- Server logs available when `DEBUG_API_TESTS=true`
- Test logs show detailed request/response information
- Coverage reports highlight untested code paths

## Integration with CI/CD

The API tests are designed to run in CI environments:

- **Docker Compatible**: Can run in containerized environments
- **Headless Operation**: No interactive prompts
- **Exit Codes**: Proper exit codes for CI integration
- **Artifacts**: Coverage reports and test results
- **Parallel Safe**: When run with proper port allocation

## Extending Tests

### Adding New Test Suites
1. Create test file in `integration/` directory
2. Follow existing patterns for setup/cleanup
3. Use provided utilities for common operations
4. Add appropriate character/message fixtures

### Adding New Assertions
1. Extend `apiAssertions` object in `api-test-utils.ts`
2. Follow existing naming conventions
3. Provide clear error messages
4. Add JSDoc documentation

### Adding New Fixtures
1. Add to appropriate fixture file
2. Follow existing JSON structure
3. Include expected response patterns
4. Document special requirements

## Contributing

When contributing API tests:

1. **Follow Patterns**: Use existing utilities and patterns
2. **Document Changes**: Update this README for new features
3. **Test Thoroughly**: Ensure tests pass in different environments
4. **Performance**: Consider test execution time
5. **Coverage**: Aim for comprehensive API coverage