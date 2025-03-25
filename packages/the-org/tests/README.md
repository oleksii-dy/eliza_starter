# The Org - Test Suite

This directory contains comprehensive test suites for all characters in The Org package. Each character has its own dedicated test file that verifies its behavior, communication style, and domain-specific functionality.

## Test Files

- `investment-manager.test.ts`: Tests for Spartan (Investment Manager)

  - Trading pool management
  - Token price information
  - Liquidity pool operations
  - Copy trading functionality
  - Risk management practices

- `community-manager.test.ts`: Tests for Eliza (Community Manager)

  - Community question handling
  - Moderation capabilities
  - Event announcements
  - Feedback processing
  - Community guideline enforcement

- `dev-rel.test.ts`: Tests for Eddy (Developer Relations)

  - Technical documentation
  - Bug report handling
  - Feature request processing
  - Code example provision
  - Developer support

- `ruby.test.ts`: Tests for Ruby (Community Liaison)

  - Cross-platform communication
  - Platform recommendations
  - Community feedback tracking
  - Event coordination
  - Discussion monitoring

- `social-media-manager.test.ts`: Tests for Jimmy (Social Media Manager)

  - Content creation
  - Engagement analysis
  - Community feedback
  - Content strategy
  - Crisis communication

- `project-manager.test.ts`: Tests for Project Manager
  - Project status tracking
  - Task assignment
  - Deadline management
  - Resource allocation
  - Risk assessment

## Running Tests

You can run tests using the following npm scripts:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run tests with UI
npm run test:ui

# Run tests for specific characters
npm run test:investment
npm run test:community
npm run test:devrel
npm run test:ruby
npm run test:social
npm run test:project
```

## Test Structure

Each test file follows a consistent structure:

1. **Character Initialization**

   - Correct name and plugins
   - Required settings
   - Configuration validation

2. **Message Handling**

   - Domain-specific queries
   - Task processing
   - Information requests
   - Action handling

3. **Style Guidelines**

   - Communication tone
   - Response format
   - Language usage
   - Brand consistency

4. **Domain-Specific Tests**
   - Character-specific functionality
   - Special features
   - Core responsibilities
   - Integration capabilities

## Test Utilities

Common test utilities are available in `setup.ts`:

- `createTestMessage`: Creates a test message with the specified content
- `createTestRuntime`: Sets up a test runtime environment for the character
- `clearAllMocks`: Resets all mocks between tests

## Coverage Requirements

All test suites should maintain:

- Minimum 80% line coverage
- Minimum 80% branch coverage
- Minimum 80% function coverage
- Minimum 80% statement coverage

## Contributing

When adding new tests:

1. Follow the existing test structure
2. Include both positive and negative test cases
3. Test edge cases and error conditions
4. Maintain consistent naming conventions
5. Add appropriate documentation

## Best Practices

- Keep tests focused and atomic
- Use descriptive test names
- Mock external dependencies
- Clean up test data
- Avoid test interdependencies
- Use appropriate assertions
- Include error cases

# Agent Scenario Tests

This directory contains scenario-based integration tests for the agents in the Eliza's "the-org" package. These tests validate agent behaviors through simulated interactions using test scenarios.

## Testing Approach

The tests use a scenario-based approach that simulates real-world interactions with agents. There are two primary patterns used:

1. **ScenarioService-based Tests**: Uses a mocked or actual implementation of the `ScenarioService` that allows direct interaction with the agent.

2. **TestScenario Class-based Tests**: Uses a custom `TestScenario` class to create isolated test environments with mocked dependencies.

## Test Organization

Tests are organized by agent with one test file per agent:

- `community-manager.test.ts` - Tests for the Eliza community manager agent
- `dev-rel.test.ts` - Tests for the Developer Relations agent
- `investment-manager.test.ts` - Tests for the Investment Manager agent
- `project-manager.test.ts` - Tests for the Project Manager agent
- `social-media-manager.test.ts` - Tests for the Social Media Manager agent
- `liaison.test.ts` - Tests for the Liaison agent

## Test Setup

All tests leverage the following setup:

1. Agent initialization with a mocked database adapter
2. Creation of a test world and room
3. Registration of a test user
4. Message exchange in a controlled environment
5. Validation of agent responses

## Running Tests

To run the tests:

```bash
# Run all tests
cd eliza/packages/the-org
bun test

# Run tests for a specific agent
bun test -- -t 'Community Manager'
```

## Test Design Patterns

### 1. Setting Up Test Environment

Each test file initializes the agent runtime and creates a test scenario:

```typescript
beforeEach(async () => {
  clearAllMocks();

  // Initialize runtime with character
  runtime = createTestRuntime(character);
  await runtime.initialize();

  // Setup test scenario
  scenarioService = new ScenarioService(runtime);
  runtime.registerService('scenario', scenarioService);

  // Create test environment
  worldId = await scenarioService.createWorld('Test Environment', 'Test Owner');
  roomId = await scenarioService.createRoom(worldId, 'test-room');
  testUserId = uuidv4() as UUID;

  // Add participants
  await scenarioService.addParticipant(worldId, roomId, runtime.agentId);
  await scenarioService.addParticipant(worldId, roomId, testUserId);
});
```

### 2. Creating Test Scenarios

Tests simulate specific interaction scenarios with the agent:

```typescript
it('should handle a specific scenario', async () => {
  // Create a runtime for the test user
  const testUser = {
    agentId: testUserId,
    character: { name: 'Test User' },
  } as IAgentRuntime;

  // Send test message
  await scenarioService.sendMessage(testUser, worldId, roomId, 'Message to test agent behavior');

  // Wait for processing
  const completed = await scenarioService.waitForCompletion(5000);
  expect(completed).toBe(true);

  // Validate response
  const memories = await runtime.adapter.getMemories(runtime.agentId, roomId);
  const latestMessage = memories[memories.length - 1];
  expect(latestMessage.content.text).toBeDefined();
  expect(latestMessage.content.text).toMatch(/expected|response|pattern/);
});
```

### 3. Using TestScenario Class

For environments where the `ScenarioService` can't be easily imported, a custom `TestScenario` class provides the same functionality:

```typescript
class TestScenario {
  // Implementation that creates a mock scenario service

  async runScenario(userName: string, message: string): Promise<string | undefined> {
    // Send message and get response
  }
}
```

## Adding New Tests

When adding tests for new agents or scenarios:

1. Create a new test file if testing a new agent
2. Add tests for key agent behaviors
3. Use realistic conversation scenarios
4. Validate both the functional and stylistic aspects of responses
5. Run the tests to ensure they pass

## Best Practices

1. **Test Isolation**: Each test should be independent and not rely on state from other tests
2. **Realistic Scenarios**: Test scenarios should reflect real-world usage patterns
3. **Comprehensive Validation**: Check both the presence and absence of expected content
4. **Performance**: Keep test timeouts reasonable
5. **Test Names**: Use descriptive names that explain the scenario being tested
