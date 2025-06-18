# Alethea Plugin Tests

This directory contains comprehensive tests for the `@elizaos/plugin-alethea` package.

## Test Structure

```
__tests__/
├── README.md          # This file - test documentation
├── test-utils.ts      # Mock utilities and helper functions
└── plugin.test.ts     # Main plugin tests
```

## Test Coverage

### Configuration Tests (`plugin.test.ts`)

- **Valid Configuration**: Tests successful initialization with valid config
- **Invalid URL**: Tests validation errors for malformed `ALETHEA_RPC_URL`
- **Empty Fields**: Tests validation errors for empty required fields
- **Missing Configuration**: Tests behavior with missing config values
- **Error Handling**: Tests graceful handling of non-validation errors

### Service Tests (`plugin.test.ts`)

- **Service Creation**: Tests `AletheaService` instantiation and properties
- **Service Lifecycle**: Tests start/stop methods
- **Service Registration**: Tests service registration with runtime
- **Error Scenarios**: Tests error handling for missing services

### Plugin Structure Tests (`plugin.test.ts`)

- **Plugin Properties**: Validates plugin name, description, config structure
- **Service Integration**: Tests service array contains `AletheaService`
- **Action Arrays**: Validates placeholder action arrays are empty initially
- **Environment Variables**: Tests reading config from process.env

### Integration Tests (`plugin.test.ts`)

- **Runtime Registration**: Tests plugin component registration with mock runtime
- **Graceful Failures**: Tests handling of registration failures

## Test Utilities (`test-utils.ts`)

### Mock Functions

- `createMockRuntime()`: Creates a mock `IAgentRuntime` with essential methods
- `createMockMemory()`: Creates mock `Memory` objects for testing
- `createMockState()`: Creates mock `State` objects for testing

### Mock Types

- `MockRuntime`: TypeScript interface for the mocked runtime

## Running Tests

```bash
# Run all tests
npm test

# Run only component tests (unit tests)
npm run test:component

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run end-to-end tests
npm run test:e2e
```

## Test Configuration

Tests use **Vitest** as the test runner with the following configuration:

- Environment: Node.js
- Coverage reporters: text, json, html
- Mocking: vi.mock() for external dependencies

## Environment Variables in Tests

The tests manage environment variables carefully:

- Each test suite clears environment variables in `beforeEach()`
- Tests that modify env vars clean up in their individual scope
- Mock implementations avoid side effects on the global environment

## Future Test Considerations

As the plugin evolves and action arrays are populated, tests should be added for:

- Individual action validation and execution
- Provider functionality
- Integration with actual Alethea AI services
- End-to-end workflows
- Error handling in live scenarios

## Mock Strategy

The test suite uses a simplified mocking strategy:

- Only mocks essential methods needed for current functionality
- Provides reasonable defaults that can be overridden per test
- Focuses on testing the plugin's own logic rather than dependencies
- Maintains compatibility with ElizaOS testing patterns
