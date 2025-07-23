# Docker Testing Framework

A comprehensive Docker testing framework for ElizaOS that validates Docker configurations, container health, and agent functionality with proper environment variable handling.

## Quick Start

```bash
# Run all Docker tests
bun test eliza/docker/tests/

# Run specific test suite
bun test eliza/docker/tests/health-checks.test.ts

# Run tests with verbose output
TEST_VERBOSE=true bun test eliza/docker/tests/

# Run tests with coverage
bun test --coverage eliza/docker/tests/
```

## Environment Configuration

The framework follows ElizaOS environment patterns for testing:

### Test Environment Files (Priority Order)

1. **`.env.test`** - Test-specific environment (highest priority)
2. **`.env.docker.test`** - Docker test-specific
3. **`.env`** - Development fallback
4. **`docker/.env.local`** - Docker development
5. **`.env.example`** - Template fallback

### Creating Test Environment

```bash
# Let framework create test environment
bun run eliza/docker/tests/run-docker-tests.ts --create-env

# Or manually create .env.test
cat > .env.test << EOF
# Test Environment for Docker Testing
NODE_ENV=test
LOG_LEVEL=error

# LLM Providers (add your keys for full testing)
OPENAI_API_KEY=your-key-here
ANTHROPIC_API_KEY=your-key-here
OLLAMA_API_ENDPOINT=http://localhost:11434/api

# Docker Configuration
DOCKER_BUILDKIT=1
COMPOSE_PROJECT_NAME=eliza-test
ELIZA_TEST_MODE=true
EOF
```

## Test Structure

### Core Test Suites

- **`health-checks.test.ts`** - Docker infrastructure validation
- **`cli-integration.test.ts`** - CLI --docker flag testing
- **`agent-functionality.test.ts`** - Agent LLM testing with environment handling
- **`utils/docker-test-utils.ts`** - Docker operations utilities
- **`utils/test-env-utils.ts`** - Environment variable management

### Test Categories

#### 🏗️ **Infrastructure Tests**
- Docker availability detection
- Docker Compose validation
- Target configuration checking
- Container health monitoring

#### 🔧 **CLI Integration Tests**
- `--docker` flag validation
- Command execution testing
- Error handling verification
- Help output validation

#### 🤖 **Agent Functionality Tests**
- LLM provider detection
- Mock runtime creation
- Response generation testing
- Environment-based test skipping

## Environment Variable Patterns

### LLM Provider Testing

The framework gracefully handles missing API keys:

```typescript
// Test automatically detects available providers
it('should handle OpenAI when available', () => {
  if (!isProviderAvailable('openai')) {
    console.log('⏭️ OpenAI not configured - add OPENAI_API_KEY to test OpenAI functionality');
    expect(true).toBe(true); // Pass test but note limitation
    return;
  }
  
  // Run actual OpenAI tests when key is available
  expect(isProviderAvailable('openai')).toBe(true);
});
```

### Environment Isolation

Tests save and restore environment variables:

```typescript
beforeAll(async () => {
  // Save original environment and load test configuration
  testEnv = await setupTestEnvironment();
});

afterAll(async () => {
  // Restore original environment
  restoreTestEnvironment(testEnv);
});
```

## Running Tests

### Basic Testing (No API Keys Required)

```bash
# Run infrastructure tests only
bun test eliza/docker/tests/health-checks.test.ts

# Run CLI integration tests
bun test eliza/docker/tests/cli-integration.test.ts
```

### Full Testing (API Keys Required)

```bash
# Add your API keys to .env.test first
echo "OPENAI_API_KEY=sk-your-key" >> .env.test
echo "ANTHROPIC_API_KEY=sk-ant-your-key" >> .env.test

# Run all tests including LLM functionality
bun test eliza/docker/tests/

# Or use custom test runner
bun run eliza/docker/tests/run-docker-tests.ts --verbose
```

### Test Runner Options

```bash
# Custom test runner with options
bun run eliza/docker/tests/run-docker-tests.ts [options]

Options:
  --verbose, -v     Enable verbose output
  --target=<name>   Run tests for specific target (dev, prod, docs)
  --coverage        Run tests with coverage report
  --no-cleanup      Skip cleanup after tests
  --create-env      Create test environment file
  --help, -h        Show help message
```

## Environment Detection

The framework provides intelligent environment detection:

### Available Providers Detection

```bash
# Framework automatically detects:
✅ OPENAI_API_KEY: sk-12**4567
✅ ANTHROPIC_API_KEY: sk-ant-**9876
⚪ OLLAMA_API_ENDPOINT: not set
⚪ GOOGLE_GENERATIVE_AI_API_KEY: not set

🎯 Available Providers: openai, anthropic
```

### Test Type Validation

- **Basic Tests**: Always run (Docker infrastructure)
- **LLM Tests**: Require at least one LLM provider
- **Integration Tests**: Full agent testing with real containers

## Best Practices

### 1. Environment Configuration

- **Never commit `.env.test`** with real API keys
- **Use `.env.test.example`** to document required variables
- **Add your keys to local `.env.test`** for development
- **Use mock runtime** for tests without API keys

### 2. Test Design

- **Graceful degradation**: Tests pass with helpful messages when requirements missing
- **Environment isolation**: Save/restore environment variables
- **Clear documentation**: Tests explain what's needed and why
- **Mock when needed**: Use mock runtime for testing without external services

### 3. CI/CD Integration

- **GitHub Secrets**: Store API keys in repository secrets
- **Dynamic env creation**: Create test environment files in CI
- **Matrix testing**: Test with different provider combinations

## Adding New Tests

### 1. Basic Docker Test

```typescript
import { describe, it, expect } from 'bun:test';
import { isDockerAvailable } from './utils/docker-test-utils';

describe('My Docker Test', () => {
  it('should test Docker functionality', async () => {
    const available = await isDockerAvailable();
    if (!available) {
      console.log('⏭️ Docker not available - skipping test');
      expect(true).toBe(true);
      return;
    }
    
    // Your Docker test logic here
  });
});
```

### 2. LLM Integration Test

```typescript
import { setupTestEnvironment, isProviderAvailable } from './utils/test-env-utils';

describe('Agent LLM Test', () => {
  let testEnv: TestEnvironment;
  
  beforeAll(async () => {
    testEnv = await setupTestEnvironment();
  });
  
  it('should test LLM functionality when available', () => {
    if (!isProviderAvailable('openai')) {
      console.log('⏭️ Add OPENAI_API_KEY to test LLM functionality');
      expect(true).toBe(true);
      return;
    }
    
    // Your LLM test logic here
  });
});
```

## Troubleshooting

### Common Issues

**"No LLM providers configured"**
- Add API keys to `.env.test` or `.env`
- Check environment variable names match exactly
- Verify API keys are valid and active

**"Docker not available"**
- Install Docker and Docker Compose
- Ensure Docker daemon is running
- Check Docker permissions

**"Tests skipped"**
- This is expected behavior when requirements aren't met
- Add missing environment variables for full testing
- Use verbose mode to see detailed environment status

### Debug Mode

```bash
# Enable verbose output for debugging
TEST_VERBOSE=true bun test eliza/docker/tests/

# Check environment status
bun run eliza/docker/tests/run-docker-tests.ts --verbose --no-cleanup
```

## Framework Architecture

The framework is designed for **incremental expansion**:

- ✅ **Basic Infrastructure** - Docker availability and configuration
- ✅ **Environment Handling** - ElizaOS-compatible env var patterns  
- ✅ **CLI Integration** - `--docker` flag testing
- ✅ **Agent Mocking** - Test patterns without API requirements
- 🔮 **Container Lifecycle** - Future: Full container testing
- 🔮 **Multi-Agent Testing** - Future: Agent communication testing
- 🔮 **Performance Testing** - Future: Load and stress testing

The minimal approach allows the framework to grow based on actual needs while maintaining a solid foundation. 