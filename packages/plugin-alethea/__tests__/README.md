# Alethea Plugin Test Suite

This directory contains comprehensive tests for the `@elizaos/plugin-alethea` package, following ElizaOS testing conventions and best practices.

## Test Files Overview

### 📄 `plugin.test.ts`
**Primary test file for the main plugin functionality**

**Coverage:**
- Plugin structure validation (name, description, config, services, actions, providers)
- Configuration schema validation using Zod
- Environment variable handling
- Service lifecycle management (start/stop)
- Error handling for various configuration scenarios

**Key Test Cases:**
- ✅ Valid configuration acceptance
- ❌ Invalid URL format rejection
- ❌ Empty/missing required field validation
- ✅ Environment variable setting on successful validation
- ✅ Zod error handling
- ✅ Service start/stop lifecycle
- ❌ Service not found error handling

### 📄 `config.test.ts`
**Focused configuration schema testing**

**Coverage:**
- Comprehensive configuration validation
- URL format validation with multiple test cases
- Error message validation
- Additional properties handling

**Key Test Cases:**
- ✅ Valid HTTPS/HTTP URLs
- ❌ Invalid URL formats (non-URL strings, unsupported protocols)
- ❌ Empty configuration fields
- ✅ Configuration with extra properties (ignored gracefully)
- ❌ Multiple validation errors handling

### 📄 `actions.test.ts`
**Action array structure and placeholder validation**

**Coverage:**
- Action array exports verification
- Type safety validation
- Future extensibility testing

**Key Test Cases:**
- ✅ All action arrays exported correctly
- ✅ Arrays are proper JavaScript arrays
- ✅ Empty arrays initially (placeholder state)
- ✅ Type compatibility with Action interface
- ✅ Future action category readiness

### 📄 `index.test.ts`
**Export validation and character configuration testing**

**Coverage:**
- Plugin export validation
- Character configuration structure
- Project agent setup
- Environment-based plugin loading

**Key Test Cases:**
- ✅ Plugin default export
- ✅ Named exports (actions, service, character)
- ✅ Character configuration completeness
- ✅ Plugin conditional loading based on environment variables
- ✅ Project agent structure validation

### 📄 `env.test.ts`
**Environment and file structure validation**

**Coverage:**
- Required configuration files existence
- Package.json validation
- TypeScript configuration validation
- Build tool configuration validation

**Key Test Cases:**
- ✅ Configuration files present (package.json, tsconfig.json, etc.)
- ✅ Src directory structure
- ✅ Package.json dependencies and scripts
- ✅ TypeScript compiler options
- ✅ Build and testing tool configurations

## Test Infrastructure

### 🔧 Configuration Files

#### `vitest.config.ts`
```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: [],
    testTimeout: 10000,
    hookTimeout: 10000,
    teardownTimeout: 10000,
    isolate: false,
  },
  resolve: {
    alias: {
      '@elizaos/core': new URL('../core/src', import.meta.url).pathname,
    },
  },
});
```

#### Updated `package.json` (Dev Dependencies)
```json
{
  "devDependencies": {
    "vitest": "2.1.5",
    "@vitest/coverage-v8": "2.1.5",
    "@types/node": "^22.0.0",
    "@typescript-eslint/eslint-plugin": "^8.0.0",
    "@typescript-eslint/parser": "^8.0.0",
    "eslint": "^9.0.0"
  }
}
```

## Test Patterns and Conventions

### 🧪 Mock Runtime Pattern
```typescript
const createMockRuntime = () => ({
  character: {
    name: 'Test Character',
    system: 'Test system prompt',
  },
  getSetting: vi.fn().mockReturnValue(null),
  getService: vi.fn().mockReturnValue(null),
  processActions: vi.fn().mockResolvedValue(undefined),
  actions: [],
  providers: [],
});
```

### 🔄 Environment Variable Testing
```typescript
describe('Configuration Schema', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });
});
```

### ✅ Configuration Validation Testing
```typescript
it('should accept valid configuration', async () => {
  const validConfig = {
    ALETHEA_RPC_URL: 'https://api.alethea.ai',
    PRIVATE_KEY: '0x1234567890abcdef1234567890abcdef12345678',
    ALETHEA_API_KEY: 'valid-api-key',
  };

  await expect(plugin.init!(validConfig, createMockRuntime())).resolves.not.toThrow();
});
```

## Running Tests

### Local Development
```bash
# Install dependencies (from monorepo root)
bun install

# Run component tests
cd packages/plugin-alethea
bun run test:component

# Run with coverage
bun run test:coverage

# Run in watch mode
bun run test:watch

# Run all tests (component + e2e)
bun run test
```

### ElizaOS CLI Testing
```bash
# Run e2e tests using ElizaOS test command
elizaos test

# Run specific test file
elizaos test --filter="plugin"
```

## Test Coverage Areas

### ✅ Currently Covered
- **Configuration Schema**: Complete validation logic
- **Service Lifecycle**: Start/stop operations
- **Plugin Structure**: All required plugin properties
- **Environment Handling**: Variable reading and setting
- **Error Scenarios**: Invalid configurations, missing services
- **Export Validation**: All plugin exports are accessible
- **Character Configuration**: Complete character setup
- **File Structure**: All required configuration files

### 🔄 Future Additions
As the plugin develops and actual actions are implemented:

- **AliAgent Actions**: Create, update, query operations
- **INFT Operations**: Mint, edit, query intelligent NFTs
- **Hive Functionality**: Creation, membership, messaging
- **Token Operations**: Transfer, balance checking
- **Governance**: Proposals, voting mechanisms
- **Market Data**: Price feeds, analytics

## Best Practices Demonstrated

1. **Comprehensive Mocking**: Proper mocking of ElizaOS core components
2. **Environment Isolation**: Clean environment setup/teardown
3. **Error Testing**: Both positive and negative test cases
4. **Type Safety**: Ensuring proper TypeScript integration
5. **Modular Structure**: Separated concerns across multiple test files
6. **Documentation**: Clear test descriptions and purposes
7. **ElizaOS Patterns**: Following established testing conventions

## Dependencies

The test suite relies on:
- **Vitest**: Modern test runner with TypeScript support
- **@elizaos/core**: Core ElizaOS types and interfaces
- **Zod**: Schema validation (tested component)
- **@types/node**: Node.js type definitions

## Notes

- Tests are designed to work with the current "scaffold" state of the plugin
- All placeholder action arrays are tested to ensure they're ready for future implementations
- Configuration validation is thoroughly tested to prevent runtime errors
- Service lifecycle testing ensures proper integration with ElizaOS runtime
- Character configuration tests ensure proper plugin integration patterns

This test suite provides a solid foundation for the Alethea plugin development and follows ElizaOS testing best practices.