# @elizaos/plugin-dummy-services

A testing plugin that provides mock implementations of common ElizaOS services for development and testing environments.

## Purpose

This plugin offers dummy/mock services that simulate real external service functionality without requiring actual API connections or external dependencies. It's designed for:

- **Unit Testing**: Isolated testing of components without external dependencies
- **Development**: Local development without needing real API keys or services
- **CI/CD**: Automated testing in continuous integration environments
- **Plugin Development**: Testing plugin interactions without complex service setup

## Features

- **Mock Database Adapter**: In-memory database simulation
- **Dummy Token Data Service**: Simulated cryptocurrency/token data
- **Dummy LP Service**: Mock liquidity pool operations
- **Dummy Wallet Service**: Simulated wallet functionality
- **Dummy Message Service**: Mock messaging operations
- **Dummy Post Service**: Simulated social media posting
- **Dummy Swap Service**: Mock token swap operations
- **Dummy Token Creation Service**: Simulated token creation
- **E2E Test Scenarios**: Built-in test scenarios for validation

## Installation

```bash
bun add @elizaos/plugin-dummy-services
```

## Configuration

This plugin requires no environment variables or external configuration as it provides mock implementations.

## Usage

### Basic Usage

Add to your character's plugins array:

```json
{
    "name": "Test Agent",
    "plugins": ["@elizaos/plugin-dummy-services"]
}
```

### In Code

```typescript
import { dummyServicesPlugin } from '@elizaos/plugin-dummy-services';

// Use in agent runtime
const runtime = new AgentRuntime({
    plugins: [dummyServicesPlugin]
});
```

### Individual Service Usage

```typescript
import { 
    DummyTokenDataService,
    DummyWalletService,
    MockDatabaseAdapter 
} from '@elizaos/plugin-dummy-services';

// Use services directly in tests
const tokenDataService = new DummyTokenDataService();
const walletService = new DummyWalletService();
```

## Available Services

### DummyTokenDataService
- **Type**: `token_data`
- **Purpose**: Provides mock cryptocurrency token data and prices
- **Methods**: Simulates token price feeds, market data, and token information

### DummyLpService
- **Type**: `lp_pool`
- **Purpose**: Simulates liquidity pool operations
- **Methods**: Mock LP token staking, rewards, and pool management

### DummyWalletService
- **Type**: `wallet`
- **Purpose**: Provides mock wallet functionality
- **Methods**: Simulated balance checking, transaction sending, and wallet management

### DummyMessageService
- **Type**: `messaging`
- **Purpose**: Mock message sending and receiving
- **Methods**: Simulates message delivery without actual platform integration

### DummyPostService
- **Type**: `posting`
- **Purpose**: Mock social media posting functionality
- **Methods**: Simulates content posting without real social platform connections

### DummySwapService
- **Type**: `swap`
- **Purpose**: Simulates token swap operations
- **Methods**: Mock DEX interactions and token exchanges

### DummyTokenCreationService
- **Type**: `token_creation`
- **Purpose**: Simulates token/NFT creation processes
- **Methods**: Mock token deployment and creation workflows

### MockDatabaseAdapter
- **Purpose**: In-memory database for testing
- **Features**: Full database interface implementation without persistence

## Testing

All services include comprehensive unit tests:

```bash
bun test
```

### E2E Scenarios

The plugin includes built-in E2E test scenarios that validate service interactions:

```typescript
import { dummyServicesScenariosSuite } from '@elizaos/plugin-dummy-services';

// Scenarios automatically run with elizaos test
```

## Development

### Service Interface

Each dummy service implements the standard ElizaOS service pattern:

```typescript
import { Service, ServiceType } from '@elizaos/core';

export class DummyExampleService extends Service {
    static serviceName = 'example';
    static serviceType = ServiceType.EXAMPLE;
    
    capabilityDescription = 'Mock example functionality';
    
    static async start(runtime: IAgentRuntime): Promise<DummyExampleService> {
        return new DummyExampleService(runtime);
    }
    
    async stop(): Promise<void> {
        // Cleanup if needed
    }
}
```

### Adding New Mock Services

1. Create service in appropriate directory
2. Implement Service interface with mock functionality
3. Add unit tests
4. Export from main index.ts
5. Add to plugin services array

## When to Use

**✅ Use this plugin when:**
- Writing unit tests that need service dependencies
- Developing locally without external service access
- Running CI/CD pipelines
- Testing plugin interactions
- Prototyping features that depend on external services

**❌ Don't use this plugin when:**
- Running in production environments
- Need real external service functionality
- Testing actual API integrations
- Requiring persistent data storage

## Integration with Other Plugins

This plugin works well alongside:
- `@elizaos/plugin-testing`: Enhanced testing utilities
- Development and testing versions of other plugins
- Any plugin that depends on common service types

## Contributing

When adding new mock services:
1. Follow the existing service patterns
2. Include comprehensive unit tests
3. Add E2E scenarios if applicable
4. Document the service interface
5. Ensure no external dependencies

## License

MIT - Part of the ElizaOS ecosystem.