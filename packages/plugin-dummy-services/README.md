# ElizaOS Dummy Services Plugin

A comprehensive plugin that provides dummy implementations of standard ElizaOS service interfaces and extensive testing capabilities for service interface compliance and integration.

## Overview

This plugin serves dual purposes:

1. **Dummy Service Provider**: Provides mock implementations of all standard ElizaOS service interfaces for development and testing
2. **Interface Testing Framework**: Comprehensive test suites for validating service interface compliance and integration

## Features

### Dummy Services

All dummy services implement their respective standard interfaces and provide realistic mock data:

- **DummyWalletService** - Implements `IWalletService`
- **DummyTokenDataService** - Implements `ITokenDataService`
- **DummyLpService** - Implements `ILpService`
- **DummySwapService** - Implements swap service interface
- **DummyTokenCreationService** - Implements token creation interface
- **DummyMessageService** - Implements messaging service interface
- **DummyPostService** - Implements social posting interface
- **MockDatabaseAdapter** - Complete database adapter for isolated testing

### Test Suites

The plugin includes comprehensive test suites that work with any service implementations:

#### 1. Service Interface Compliance Tests

Tests that validate services implement their interfaces correctly:

- Method existence validation
- Return type validation
- Interface contract compliance
- Error handling verification

#### 2. Service Discovery Tests

Generic tests that work with any service implementation:

- Service discovery by type
- Cross-service integration testing
- Service lifecycle compliance
- Dynamic service testing (no vendor lock-in)

#### 3. End-to-End Scenario Tests

Real-world usage scenarios using dummy services:

- Multi-service workflows
- Complex interaction patterns
- State management validation
- Integration testing

## Usage

### As a Testing Plugin

Add to your ElizaOS project for comprehensive service testing:

```typescript
import { dummyServicesPlugin } from '@elizaos/plugin-dummy-services';

export const character = {
  // ... character config
  plugins: [
    dummyServicesPlugin,
    // ... other plugins
  ],
};
```

### Running Tests

```bash
# Run all tests including service interface compliance
elizaos test

# The plugin will automatically:
# 1. Provide dummy services for testing
# 2. Test all available services generically by type
# 3. Validate interface compliance
# 4. Run integration scenarios
```

### For Development

Use dummy services in development environments:

```typescript
import { DummyWalletService, DummyTokenDataService } from '@elizaos/plugin-dummy-services';

// Services are automatically registered when plugin is loaded
// Access via runtime.getService() as normal
```

## Service Interface Testing

The plugin tests services **generically by type**, not by vendor implementation. This means:

- ✅ Tests any wallet service implementing `IWalletService`
- ✅ Tests any token data service implementing `ITokenDataService`
- ✅ Tests any LP service implementing `ILpService`
- ❌ **Does NOT** test vendor-specific implementations (Discord, Twitter, etc.)

### Benefits

1. **No API Keys Required**: Test service interfaces without external dependencies
2. **Fast Execution**: All tests run locally with mock data
3. **Interface Validation**: Ensures services implement contracts correctly
4. **Cross-Service Testing**: Validates services work together
5. **Development Friendly**: Provides realistic data for development

## Architecture

### Service Registration

Services are registered with their standard service types:

```typescript
ServiceType.WALLET; // -> DummyWalletService
ServiceType.TOKEN_DATA; // -> DummyTokenDataService
ILpService.serviceType; // -> DummyLpService
('swap'); // -> DummySwapService
('token-creation'); // -> DummyTokenCreationService
('message'); // -> DummyMessageService
('post'); // -> DummyPostService
```

### Data Generation

All dummy services generate realistic mock data:

- Random but bounded price data
- Consistent token information
- Realistic portfolio balances
- Proper transaction structures
- Valid address formats

### Test Philosophy

Tests focus on **interface compliance** rather than vendor specifics:

```typescript
// ✅ Good: Tests any wallet service
const walletService = runtime.getService(ServiceType.WALLET);
const portfolio = await walletService.getPortfolio();

// ❌ Avoid: Tests specific vendor implementation
const discordService = runtime.getService('discord');
```

## Example Test Output

```
Service Discovery and Generic Interface Tests
  ✓ Discover All Available Services
    ✓ Found service: WALLET
    ✓ Found service: TOKEN_DATA
    ✓ Found service: lp

  ✓ Test Wallet Service Interface (Any Implementation)
    Testing wallet service implementation: DummyWalletService
    ✓ Portfolio retrieved: $10000 total value
    ✓ Assets count: 1

  ✓ Test Token Data Service Interface (Any Implementation)
    Testing token data service implementation: DummyTokenDataService
    ✓ Token details: 1111 - Dummy Token 1111
    ✓ Trending tokens: 3 returned

  ✓ Service Integration and Cross-Communication Test
    Available services for integration test: wallet, tokenData, lp, swap
    ✓ Integration test: 1111 balance = 0
```

## Migration from plugin-lowlevel-testing

This plugin **replaces** `plugin-lowlevel-testing` with a better approach:

### Before (lowlevel-testing)

- Tested vendor-specific implementations
- Required real API keys
- Slow execution due to network calls
- Brittle tests dependent on external services

### After (dummy-services)

- Tests service interfaces generically
- No external dependencies
- Fast local execution
- Reliable and consistent results

## Configuration

No configuration required. The plugin works out of the box and automatically:

1. Registers all dummy services
2. Provides mock data
3. Runs comprehensive tests
4. Validates interface compliance

## Contributing

When adding new service interfaces to ElizaOS:

1. Add dummy implementation in appropriate directory
2. Register service in plugin exports
3. Add interface compliance tests
4. Update service discovery tests
5. Add integration scenarios

## See Also

- [ElizaOS Service Architecture](../docs/services.md)
- [Testing Guide](../docs/testing.md)
- [Plugin Development](../docs/plugins.md)
