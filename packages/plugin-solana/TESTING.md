# Testing Guide for Solana Plugin

This plugin includes comprehensive testing coverage with unit tests, E2E tests, and Cypress component tests.

## Test Structure

```
src/
├── __tests__/
│   ├── unit/                    # Unit tests
│   │   └── WalletBalanceService.test.ts
│   └── cypress/
│       ├── component/           # Cypress component tests
│       │   └── WalletBalance.cy.tsx
│       └── support/             # Cypress support files
├── e2e/                         # E2E tests
│   ├── wallet-balance-tests.ts
│   ├── real-token-tests.ts
│   └── scenarios.ts
```

## Running Tests

### All Tests
```bash
npm run test:all
```

### Unit Tests
```bash
# Run once
npm run test:unit

# Watch mode
npm run test:unit:watch

# With coverage
npm run test:unit:coverage
```

### E2E Tests
```bash
# Run on default network (mainnet-beta)
npm run test:e2e

# Run on mainnet
npm run test:e2e:mainnet

# Run on testnet
npm run test:e2e:testnet
```

### Cypress Component Tests
```bash
# Run in headless mode
npm run test:cypress

# Open Cypress UI
npm run test:cypress:open
```

### Linting
```bash
# Check linting
npm run lint

# Fix linting issues
npm run lint:fix
```

### Formatting
```bash
# Format code
npm run format

# Check formatting
npm run format:check
```

## Network-Specific Testing

The plugin supports testing on different Solana networks:

### Mainnet Testing
```bash
SOLANA_NETWORK=mainnet-beta npm run test:e2e
```

### Testnet Testing
```bash
SOLANA_NETWORK=testnet npm run test:e2e
```

### Devnet Testing
```bash
SOLANA_NETWORK=devnet npm run test:e2e
```

## Test Coverage

### Unit Tests
- **WalletBalanceService**: 100% coverage
  - Network initialization (mainnet, testnet, devnet)
  - Wallet balance fetching
  - Token balance fetching
  - Batch balance fetching
  - Error handling
  - Service lifecycle

### E2E Tests
- **Wallet Balance Tests**:
  - Service initialization on different networks
  - Fetching balance for known addresses
  - Agent wallet balance
  - Public key validation
  - Token balance queries
  - Batch wallet queries

### Component Tests
- **WalletBalanceDisplay**:
  - Loading states
  - Error states
  - Balance display
  - Token list rendering
  - Refresh functionality
  - Auto-refresh behavior
  - Network display
  - Empty states

## Environment Setup

### Required Environment Variables

Create a `.env` file with:

```env
# Network configuration
SOLANA_NETWORK=mainnet-beta
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com

# Required addresses
SOL_ADDRESS=So11111111111111111111111111111111111111112

# Wallet configuration (one of these pairs)
WALLET_SECRET_KEY=your-base58-private-key
WALLET_PUBLIC_KEY=your-base58-public-key

# Trading configuration
SLIPPAGE=100

# API keys
HELIUS_API_KEY=your-helius-key
BIRDEYE_API_KEY=your-birdeye-key
```

### Test Wallets

For testing, you can use these known addresses:

**Mainnet:**
- Solana Foundation: `GDDMwNyyx8uB6zrqwBFHjLLG3TBYk2F8Az4yrQC5RzMp`
- Circle (USDC): `2kYPLmGo6JYvRPQTmJzHnLFZqC7GbmTdnvELBGTr2Dae`

**Testnet:**
- Faucet: `4ETf86tK7b4W72f27kNLJLgRWi9UfJjgH4koHGUXMFtn`

**Devnet:**
- Faucet: `9B5XszUGdMaxCZ7uSQhPzdks5ZQSmWxrmzCSvtJ6Ns6g`

## Writing New Tests

### Unit Test Example
```typescript
describe('MyService', () => {
  it('should do something', () => {
    const service = new MyService(mockRuntime);
    const result = service.doSomething();
    expect(result).toBe(expected);
  });
});
```

### E2E Test Example
```typescript
{
  name: 'my_test',
  fn: async (runtime: IAgentRuntime) => {
    const service = runtime.getService<MyService>('my-service');
    const result = await service.doSomething();
    if (!result) {
      throw new Error('Test failed');
    }
  },
}
```

### Cypress Component Test Example
```typescript
it('should render component', () => {
  cy.mount(<MyComponent prop="value" />);
  cy.contains('Expected text').should('be.visible');
});
```

## CI/CD Integration

The test suite is designed to run in CI/CD pipelines:

```yaml
# Example GitHub Actions
- name: Install dependencies
  run: npm ci

- name: Run linting
  run: npm run lint

- name: Run unit tests with coverage
  run: npm run test:unit:coverage

- name: Run E2E tests on testnet
  run: npm run test:e2e:testnet
  env:
    SOLANA_NETWORK: testnet

- name: Run Cypress tests
  run: npm run test:cypress
```

## Debugging Tests

### Unit Tests
```bash
# Run specific test file
npx vitest src/__tests__/unit/WalletBalanceService.test.ts

# Run with debugging
node --inspect-brk ./node_modules/.bin/vitest
```

### E2E Tests
```bash
# Run with verbose logging
DEBUG=* npm run test:e2e
```

### Cypress Tests
```bash
# Open Cypress UI for debugging
npm run test:cypress:open
```

## Best Practices

1. **Network Independence**: Tests should work on all networks
2. **Mock External Services**: Unit tests should mock all external dependencies
3. **Real Integration**: E2E tests should use real network connections
4. **Error Scenarios**: Test both success and failure paths
5. **Performance**: Monitor test execution time
6. **Cleanup**: Ensure tests clean up after themselves

## Troubleshooting

### Common Issues

1. **RPC Rate Limits**: Use batch operations and rate limiting
2. **Network Timeouts**: Increase timeout values for slow networks
3. **Flaky Tests**: Add retries for network-dependent tests
4. **Missing Dependencies**: Run `npm install` to ensure all deps are installed

### Getting Help

- Check test output for detailed error messages
- Enable debug logging with `DEBUG=*`
- Review the test implementation for examples
- Check environment variables are correctly set 